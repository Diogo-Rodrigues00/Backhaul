// GET /saude (docs/api.md): 200 { status: 'ok', banco: 'conectado' }.
import { http, HttpResponse } from 'msw';

export function criarHandlersSaude(baseUrl: string) {
  return [
    http.get(`${baseUrl}/saude`, () => HttpResponse.json({ status: 'ok', banco: 'conectado' })),
  ];
}
