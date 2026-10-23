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

// `#conteudo` é o <main> de toda tela (ID_CONTEUDO). `visibility` esconde também da leitura de tela.
export const CSS_SESSAO_INICIAL = `html[${ATRIBUTO_SESSAO_INICIAL}] #conteudo{visibility:hidden}`;
