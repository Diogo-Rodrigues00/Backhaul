// Admin (só leitura): GET /admin/resumo, /admin/fretes e /admin/usuarios. 401 sem token; 403 para quem não é admin.
import { http, HttpResponse } from 'msw';

import { fretesAdminMock, resumoAdminMock, usuariosAdminMock } from '../fixtures/admin';
import { autenticar } from './comum';

export function criarHandlersAdmin(baseUrl: string) {
  return [
    http.get(`${baseUrl}/admin/resumo`, ({ request }) => {
      const { resposta } = autenticar(request, ['admin']);
      return resposta ?? HttpResponse.json({ resumo: resumoAdminMock });
    }),
    http.get(`${baseUrl}/admin/fretes`, ({ request }) => {
      const { resposta } = autenticar(request, ['admin']);
      return resposta ?? HttpResponse.json({ fretes: fretesAdminMock });
    }),
    http.get(`${baseUrl}/admin/usuarios`, ({ request }) => {
      const { resposta } = autenticar(request, ['admin']);
      return resposta ?? HttpResponse.json({ usuarios: usuariosAdminMock });
    }),
  ];
}
