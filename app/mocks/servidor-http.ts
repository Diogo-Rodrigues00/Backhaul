// Servidor HTTP do mock da API (porta 4010), usado só no CI (Playwright e Lighthouse CI).
// O app nunca usa MSW em produção (ADR 0005/0011). Roda com `tsx` (imports sem extensão).
import { createServer } from '@mswjs/http-middleware';
import { createServer as criarServidorHttp } from 'node:http';

import { criarHandlers } from './handlers';
import { criarHandlersComEstado } from './handlers/comEstado';

const PORTA = Number(process.env.MOCK_PORT ?? 4010);

// URL base vazia: as rotas viram caminhos relativos, que o middleware resolve contra o host
// da requisição (serve tanto `localhost` quanto `127.0.0.1`).
// Os handlers com estado (card 030) vêm primeiro e só atendem quem é "do fluxo" (token `fluxo-*` ou
// e-mail `@fluxo.test`); para todos os outros devolvem `undefined` e valem os handlers de sempre.
const app = createServer(...criarHandlersComEstado(''), ...criarHandlers(''));

// O site (4173) e o mock (4010) são origens diferentes: libera CORS para qualquer origem.
const servidor = criarServidorHttp((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    req.headers['access-control-request-headers'] ?? 'Content-Type,Authorization',
  );
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  app(req, res);
});

servidor.listen(PORTA, () => {
  console.log(`mock da API na porta ${PORTA}`);
});

for (const sinal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sinal, () => servidor.close(() => process.exit(0)));
}
