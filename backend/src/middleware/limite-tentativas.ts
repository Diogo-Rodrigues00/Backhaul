import type { NextFunction, Request, Response } from "express";

// Limitador de tentativas: barra quem chama a mesma rota vezes demais num intervalo.
//
// Por que existe: sem isso, um robô pode testar milhares de senhas por minuto em
// POST /login (força bruta) ou criar contas em massa. O bcrypt já deixa cada
// tentativa lenta, mas "lenta" não é "bloqueada".
//
// Como funciona (janela fixa): para cada chave (aqui, o IP) contamos as requisições
// dentro de uma janela de tempo. Passou do máximo, responde 429 até a janela acabar.
//
// Limite conhecido: o contador fica na MEMÓRIA do processo. Com uma única instância
// (nosso caso no Render) funciona; com várias instâncias, cada uma contaria separado e
// o certo seria um armazenamento compartilhado (Redis). Um restart também zera a conta.

type Janela = { contagem: number; expiraEm: number };

export type OpcoesLimitador = {
  janelaMs: number; // duração da janela, em milissegundos
  maximo: number; // quantas requisições a mesma chave pode fazer na janela
  agora?: () => number; // relógio injetável: os testes controlam o tempo sem esperar
};

export type Veredito = { permitido: true } | { permitido: false; esperarSegundos: number };

// Parte pura (sem Express): recebe a chave e decide. É a que os testes exercitam.
export function criarContador({ janelaMs, maximo, agora = Date.now }: OpcoesLimitador) {
  const janelas = new Map<string, Janela>();

  return function registrar(chave: string): Veredito {
    const t = agora();

    // Faxina: sem isso o Map cresceria para sempre com IPs que nunca mais voltam.
    if (janelas.size > 10_000) {
      for (const [k, j] of janelas) if (j.expiraEm <= t) janelas.delete(k);
    }

    let janela = janelas.get(chave);
    if (!janela || janela.expiraEm <= t) {
      janela = { contagem: 0, expiraEm: t + janelaMs };
      janelas.set(chave, janela);
    }

    janela.contagem += 1;
    if (janela.contagem > maximo) {
      return { permitido: false, esperarSegundos: Math.ceil((janela.expiraEm - t) / 1000) };
    }
    return { permitido: true };
  };
}

// Cola a parte pura no Express. 429 = "Too Many Requests".
export function limitarTentativas(opcoes: OpcoesLimitador) {
  const registrar = criarContador(opcoes);

  return (req: Request, res: Response, next: NextFunction) => {
    // req.ip só é o IP do cliente de verdade porque o server.ts liga "trust proxy";
    // sem isso, atrás do Render, todo mundo teria o IP do proxy e dividiria o mesmo limite.
    const veredito = registrar(req.ip ?? "desconhecido");
    if (veredito.permitido) {
      next();
      return;
    }
    res.setHeader("Retry-After", String(veredito.esperarSegundos));
    res.status(429).json({ erro: "muitas tentativas, tente novamente em instantes" });
  };
}
