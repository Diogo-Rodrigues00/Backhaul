// GET /certificacoes: qualquer usuário logado.
import { http, HttpResponse } from 'msw';

import { certificacoesMock } from '../fixtures/certificacoes';
import { autenticar } from './comum';

export function criarHandlersCertificacoes(baseUrl: string) {
  return [
    http.get(`${baseUrl}/certificacoes`, ({ request }) => {
      const { resposta } = autenticar(request);
      return resposta ?? HttpResponse.json({ certificacoes: certificacoesMock });
    }),
  ];
}
