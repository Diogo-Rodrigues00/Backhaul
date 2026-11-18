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
    http.patch(`${baseUrl}/admin/usuarios/:id/ativo`, async ({ request, params }) => {
      const { resposta } = autenticar(request, ['admin']);
      if (resposta) return resposta;
      const corpo = (await request.json().catch(() => ({}))) as { ativo?: unknown };
      const usuario = usuariosAdminMock.find((u) => u.id === params.id);
      if (!usuario) return HttpResponse.json({ erro: 'usuário não encontrado' }, { status: 404 });
      if (typeof corpo.ativo !== 'boolean') {
        return HttpResponse.json({ erros: ['ativo deve ser true ou false'] }, { status: 400 });
      }
      return HttpResponse.json({
        usuario: { id: usuario.id, email: usuario.email, tipo: usuario.tipo, ativo: corpo.ativo },
      });
    }),
  ];
}
