// A página inicial (`/`) é HTML estático: quem já tem sessão veria a apresentação por um instante antes
// de o app restaurar a sessão e abrir a sua área. Este script roda antes da primeira pintura e, só em
// `/` e só com token guardado, marca o <html>; o CSS esconde o conteúdo até a sessão ser conferida.
// Sem token (visitante) nada muda: o HTML estático continua sendo o LCP.
// Não importa nada: o `+html.tsx` roda em Node no build e a chave precisa ser a de CHAVES.token
// (`src/lib/armazenamentoComum.ts`; o teste confere).
export const ATRIBUTO_SESSAO_INICIAL = 'data-sessao-inicial';

export const SCRIPT_SESSAO_INICIAL =
  `try{if(location.pathname==='/'&&localStorage.getItem('backhaul.token')!==null)` +
  `document.documentElement.setAttribute('${ATRIBUTO_SESSAO_INICIAL}','')}catch(e){}`;

// `#conteudo` é o <main> de toda tela (ID_CONTEUDO). `visibility` esconde também da leitura de tela.
export const CSS_SESSAO_INICIAL = `html[${ATRIBUTO_SESSAO_INICIAL}] #conteudo{visibility:hidden}`;

/** A sessão foi conferida e não há o que redirecionar: mostra a apresentação. */
export function liberarPaginaInicial(): void {
  if (typeof document === 'undefined') return;
  document.documentElement?.removeAttribute?.(ATRIBUTO_SESSAO_INICIAL);
}
