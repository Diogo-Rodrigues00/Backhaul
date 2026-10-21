// GET /fretes/meus (motorista ou empresa), PATCH /fretes/:id/status (motorista) e
// POST /fretes/:id/pagamento (empresa).
import { http, HttpResponse } from 'msw';

import {
  FRETE_EM_TRANSITO_ID,
  FRETE_ENTREGUE_ID,
  fretesDaEmpresaMock,
  fretesDoMotoristaMock,
  respostaPagamentoMock,
  respostaStatusFreteMock,
} from '../fixtures/fretes';
import { respostaErro, respostaErros } from '../respostas';
import { autenticar, ID_INEXISTENTE_MOCK, lerCorpo } from './comum';

const STATUS_ENTREGA = ['aceito', 'em_transito', 'entregue', 'cancelado'];

export function criarHandlersFretes(baseUrl: string) {
  return [
    http.get(`${baseUrl}/fretes/meus`, ({ request }) => {
      const { usuario, resposta } = autenticar(request, ['motorista', 'empresa']);
      if (resposta) return resposta;
      return HttpResponse.json({
        fretes: usuario.tipo === 'motorista' ? fretesDoMotoristaMock : fretesDaEmpresaMock,
      });
    }),

    http.patch(`${baseUrl}/fretes/:id/status`, async ({ request, params }) => {
      const { resposta } = autenticar(request, ['motorista']);
      if (resposta) return resposta;
      const corpo = await lerCorpo(request);
      const destino = String(corpo.status_entrega);
      if (!STATUS_ENTREGA.includes(destino)) {
        return respostaErros(400, [`status_entrega deve ser ${STATUS_ENTREGA.join(', ')}`]);
      }
      const id = String(params.id);
      if (id === ID_INEXISTENTE_MOCK) return respostaErro(404, 'frete não encontrado');
      // Única ordem: aceito → em_transito → entregue. O frete de exemplo "entregue" já terminou
      // e "cancelado" nunca é alcançável (igual ao backend).
      if (destino === 'em_transito' && id !== FRETE_ENTREGUE_ID && id !== FRETE_EM_TRANSITO_ID) {
        return HttpResponse.json(respostaStatusFreteMock(id, 'em_transito'));
      }
      if (destino === 'entregue' && id === FRETE_EM_TRANSITO_ID) {
        return HttpResponse.json(respostaStatusFreteMock(id, 'entregue'));
      }
      const atual =
        id === FRETE_ENTREGUE_ID
          ? 'entregue'
          : id === FRETE_EM_TRANSITO_ID
            ? 'em_transito'
            : 'aceito';
      return respostaErro(409, `não é possível mudar o frete de ${atual} para ${destino}`);
    }),

    http.post(`${baseUrl}/fretes/:id/pagamento`, ({ request, params }) => {
      const { resposta } = autenticar(request, ['empresa']);
      if (resposta) return resposta;
      const id = String(params.id);
      if (id === ID_INEXISTENTE_MOCK) return respostaErro(404, 'frete não encontrado');
      if (id === FRETE_EM_TRANSITO_ID || id === FRETE_ENTREGUE_ID) {
        return respostaErro(409, 'frete já foi pago');
      }
      return HttpResponse.json(respostaPagamentoMock(id), { status: 201 });
    }),
  ];
}
