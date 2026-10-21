// POST /propostas (motorista), GET /cargas/:id/propostas e POST /propostas/:id/responder (empresa),
// GET /propostas/minhas (motorista, PROPOSTA relatório 4a).
import { http, HttpResponse } from 'msw';

import { CARGA_FECHADA_ID, CARGA_NORMAL_ID, CARGA_URGENTE_ID } from '../fixtures/cargas';
import {
  freteCriadoMock,
  minhasPropostasMock,
  PROPOSTA_RECUSADA_ID,
  propostaCriadaMock,
  propostasDaCargaMock,
} from '../fixtures/propostas';
import { respostaErro, respostaErros } from '../respostas';
import { autenticar, eNumeroPositivo, ID_INEXISTENTE_MOCK, lerCorpo } from './comum';

const STATUS_FILTRAVEIS = ['pendente', 'aceita', 'recusada'];

export function criarHandlersPropostas(baseUrl: string) {
  return [
    http.post(`${baseUrl}/propostas`, async ({ request }) => {
      const { resposta } = autenticar(request, ['motorista']);
      if (resposta) return resposta;
      const corpo = await lerCorpo(request);
      const erros: string[] = [];
      if (typeof corpo.chamado_carga_id !== 'string') {
        erros.push('chamado_carga_id deve ser um UUID válido');
      }
      if (typeof corpo.chamado_disp_id !== 'string') {
        erros.push('chamado_disp_id deve ser um UUID válido');
      }
      if (corpo.tipo !== 'aceite' && corpo.tipo !== 'contraproposta') {
        erros.push('tipo deve ser aceite ou contraproposta');
      } else if (corpo.tipo === 'contraproposta' && !eNumeroPositivo(corpo.valor_proposto)) {
        erros.push('valor_proposto deve ser um número maior que zero');
      }
      if (erros.length > 0) return respostaErros(400, erros);
      if (corpo.chamado_carga_id === ID_INEXISTENTE_MOCK) {
        return respostaErro(404, 'carga não encontrada');
      }
      if (corpo.chamado_carga_id === CARGA_FECHADA_ID) {
        return respostaErro(409, 'carga não está mais aberta para propostas');
      }
      return HttpResponse.json(
        {
          proposta: {
            ...propostaCriadaMock,
            chamado_carga_id: corpo.chamado_carga_id,
            chamado_disp_id: corpo.chamado_disp_id,
            tipo: corpo.tipo,
            valor_proposto:
              corpo.tipo === 'contraproposta'
                ? corpo.valor_proposto
                : propostaCriadaMock.valor_proposto,
            criado_em: new Date().toISOString(),
          },
        },
        { status: 201 },
      );
    }),

    http.get(`${baseUrl}/cargas/:id/propostas`, ({ request, params }) => {
      const { resposta } = autenticar(request, ['empresa']);
      if (resposta) return resposta;
      if (params.id === CARGA_URGENTE_ID) {
        return HttpResponse.json({ propostas: propostasDaCargaMock });
      }
      if (params.id === CARGA_NORMAL_ID || params.id === CARGA_FECHADA_ID) {
        return HttpResponse.json({ propostas: [] });
      }
      return respostaErro(404, 'carga não encontrada');
    }),

    http.post(`${baseUrl}/propostas/:id/responder`, async ({ request, params }) => {
      const { resposta } = autenticar(request, ['empresa']);
      if (resposta) return resposta;
      const corpo = await lerCorpo(request);
      if (corpo.acao !== 'aceitar' && corpo.acao !== 'recusar') {
        return respostaErros(400, ['acao deve ser aceitar ou recusar']);
      }
      if (params.id === ID_INEXISTENTE_MOCK) {
        return respostaErro(404, 'proposta não encontrada');
      }
      if (params.id === PROPOSTA_RECUSADA_ID) {
        return respostaErro(409, 'proposta já está recusada');
      }
      if (corpo.acao === 'recusar') {
        return HttpResponse.json({ proposta: { id: params.id, status: 'recusada' } });
      }
      return HttpResponse.json({ frete: { ...freteCriadoMock, proposta_id: params.id } });
    }),

    // PROPOSTA relatório 4a: rota inexistente no backend.
    http.get(`${baseUrl}/propostas/minhas`, ({ request }) => {
      const { resposta } = autenticar(request, ['motorista']);
      if (resposta) return resposta;
      const status = new URL(request.url).searchParams.get('status');
      if (status === null) {
        return HttpResponse.json({ propostas: minhasPropostasMock });
      }
      if (!STATUS_FILTRAVEIS.includes(status)) {
        return respostaErros(400, [`status deve ser ${STATUS_FILTRAVEIS.join(', ')}`]);
      }
      return HttpResponse.json({
        propostas: minhasPropostasMock.filter((proposta) => proposta.status === status),
      });
    }),
  ];
}
