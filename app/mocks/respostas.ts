// Respostas de erro nos formatos reais da API, para os handlers e para `server.use(...)` nos testes:
//   server.use(http.post(urlMock('/login'), () => respostaErros(400, ['email inválido'])))
import { HttpResponse } from 'msw';

/** Erro de validação: `{ erros: [...] }` (400). */
export function respostaErros(status: number, erros: string[]) {
  return HttpResponse.json({ erros }, { status });
}

/** Erro simples: `{ erro: "..." }` (401, 403, 404, 409, 500). */
export function respostaErro(status: number, erro: string) {
  return HttpResponse.json({ erro }, { status });
}

/** Página HTML do Express (`Cannot GET /x`, ou o 413 que vira 500): corpo que não é JSON. */
export function respostaHtml(status: number) {
  return new HttpResponse(
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Error</title></head>' +
      '<body><pre>Internal Server Error<br> &nbsp; &nbsp;at handler (/app/server.js:10:5)</pre></body></html>',
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

/** Corpo vazio (proxy, 502/504 do Render acordando). */
export function respostaVazia(status: number) {
  return new HttpResponse(null, { status });
}

/** Resposta que nunca chega: serve para testar timeout (use com timers falsos ou timeoutMs curto). */
export function respostaQueNaoChega(): Promise<never> {
  return new Promise<never>(() => undefined);
}
