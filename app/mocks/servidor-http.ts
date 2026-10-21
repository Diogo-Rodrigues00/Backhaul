// Servidor HTTP do mock da API (porta 4010), usado só no CI (Playwright e Lighthouse CI).
// O app nunca usa MSW em produção (ADR 0005/0011). Roda direto no Node (type stripping),
// por isso os imports internos levam a extensão `.ts`.
import { createServer } from '@mswjs/http-middleware';
import { http, HttpResponse, type RequestHandler } from 'msw';
import { createServer as criarServidorHttp } from 'node:http';
import { criarHandlers, type DescricaoHandler } from './handlers/index.ts';

const PORTA = Number(process.env.MOCK_PORT ?? 4010);
const BASE_URL = `http://localhost:${PORTA}`;

const porMetodo = {
  GET: http.get,
  POST: http.post,
  PATCH: http.patch,
} as const;

// Enquanto `criarHandlers` devolve descrições (card 001), converte para handlers do MSW.
// URLs relativas: o middleware as resolve contra o host da requisição.
// Quando o card 004 passar a devolver `http.get(...)` prontos, eles entram direto.
function paraMsw(item: DescricaoHandler | RequestHandler): RequestHandler {
  if ('metodo' in item) {
    return porMetodo[item.metodo](item.url, () =>
      HttpResponse.json(item.corpo as Record<string, unknown>, { status: item.status }),
    );
  }
  return item;
}

const handlers = (criarHandlers('') as Array<DescricaoHandler | RequestHandler>).map(paraMsw);
const app = createServer(...handlers);

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
  console.log(`mock da API em ${BASE_URL}`);
});

for (const sinal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sinal, () => servidor.close(() => process.exit(0)));
}
