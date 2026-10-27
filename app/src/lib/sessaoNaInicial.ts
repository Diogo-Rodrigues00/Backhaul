// A página inicial (`/`) é HTML estático: quem já tem sessão veria a apresentação por um instante antes
// de o app restaurar a sessão e abrir a sua área. Este script roda antes da primeira pintura e, só em
// `/` e só com token guardado, marca o <html>; o CSS esconde o conteúdo até a sessão ser conferida
// (`liberarPaginaInicial`, em `paginaInicial.ts`, tira a marca se a sessão não vingar).
// Sem token (visitante) nada muda: o HTML estático continua sendo o LCP.
// A chave é a de CHAVES.token (`src/lib/armazenamentoComum.ts`; o teste confere). Só o `+html.tsx`
// importa este arquivo: nada daqui vai para o JS das rotas.
import { ATRIBUTO_SESSAO_INICIAL } from './paginaInicial';

export const SCRIPT_SESSAO_INICIAL =
  `try{if(location.pathname==='/'&&localStorage.getItem('backhaul.token')!==null)` +
  `document.documentElement.setAttribute('${ATRIBUTO_SESSAO_INICIAL}','')}catch(e){}`;

// `#conteudo` é o <main> de toda tela (ID_CONTEUDO); `:has([data-inicio])` limita a regra ao <main> da
// home (os botões levam `data-inicio`), então o portão do servidor e as áreas logadas nunca somem.
// `visibility` esconde também da leitura de tela.
// Rede de segurança só em CSS: se o JS não rodar (offline sem cache, chunk 404, erro de script) ninguém
// tira a marca; depois de 7 s a animação (duração mínima, só o atraso conta) devolve `visibility:visible`. Com o JS
// funcionando a marca sai antes, assim que a sessão é conferida. `prefers-reduced-motion` só encurta a
// duração (css.ts), nunca o atraso.
export const ATRASO_LIBERAR_SEGUNDOS = 7;
export const CSS_SESSAO_INICIAL =
  `html[${ATRIBUTO_SESSAO_INICIAL}] #conteudo:has([data-inicio])` +
  `{visibility:hidden;animation:backhaul-liberar-inicio .01s ${ATRASO_LIBERAR_SEGUNDOS}s forwards}` +
  `@keyframes backhaul-liberar-inicio{to{visibility:visible}}`;
