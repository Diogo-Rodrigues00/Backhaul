import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

// Tudo que envolve JWT fica neste arquivo: gerar o token (usado no login)
// e conferir o token (usado nas rotas protegidas).

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET não definida. Copie .env.example para .env e preencha.");
}

const VALIDADE = "7d";

export type TipoUsuario = "motorista" | "empresa" | "admin";

// O que guardamos dentro do token. Só o necessário: quem é e qual o tipo.
// Nada sensível, porque qualquer pessoa consegue LER um JWT (ele só é assinado,
// não criptografado). A assinatura impede é que alguém o ALTERE.
export type UsuarioToken = { id: string; tipo: TipoUsuario };

// Ensina ao TypeScript que, depois do middleware, req.usuario existe.
declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioToken;
    }
  }
}

export function gerarToken(usuario: UsuarioToken): string {
  // "sub" (subject) é o nome padrão no JWT para "de quem é este token".
  return jwt.sign({ tipo: usuario.tipo }, JWT_SECRET!, {
    subject: usuario.id,
    expiresIn: VALIDADE,
  });
}

// Middleware: roda ANTES da rota. Se o token for válido, preenche req.usuario
// e chama next() para seguir; senão, já responde 401 e a rota nem executa.
export function exigirAutenticacao(req: Request, res: Response, next: NextFunction) {
  const cabecalho = req.headers.authorization ?? "";
  const [esquema, token] = cabecalho.split(" ");

  if (esquema !== "Bearer" || !token) {
    res.status(401).json({ erro: "token ausente" });
    return;
  }

  try {
    // verify confere a assinatura E a validade (exp). Se algo falhar, lança erro.
    const payload = jwt.verify(token, JWT_SECRET!) as jwt.JwtPayload;
    req.usuario = { id: payload.sub as string, tipo: payload.tipo as TipoUsuario };
    next();
  } catch {
    res.status(401).json({ erro: "token inválido ou expirado" });
  }
}

// Fábrica de middleware: exigirTipo("empresa") DEVOLVE uma função de middleware
// que já "lembra" quais tipos podem passar. Deve vir DEPOIS de exigirAutenticacao,
// porque depende de req.usuario já estar preenchido.
// 401 = "não sei quem você é"; 403 = "sei quem você é, mas você não pode isso".
export function exigirTipo(...tipos: TipoUsuario[]) {
  return (req: Request, res: Response, next: NextFunction) => {
       if (!req.usuario || !tipos.includes(req.usuario.tipo)) {
      res.status(403).json({ erro: "acesso negado para este tipo de usuário" });
      return;
    }
    next();
  };
}
