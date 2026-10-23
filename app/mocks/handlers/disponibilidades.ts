// POST /disponibilidades e GET /disponibilidades/minhas (PROPOSTA relatório 4b), só motorista.
import { http, HttpResponse } from 'msw';

import {
  disponibilidadePublicadaMock,
  disponibilidadesDoMotoristaMock,
} from '../fixtures/disponibilidades';
import { respostaErros } from '../respostas';
import { autenticar, eDataFutura, lerCorpo } from './comum';

const URGENCIAS = ['normal', 'urgente', 'critico'];

export function validarDisponibilidade(corpo: Record<string, unknown>): string[] {
  const erros: string[] = [];
  const local = corpo.local as Record<string, unknown> | undefined;
  const lat = local?.lat;
  const lng = local?.lng;
  if (typeof lat !== 'number' || lat < -90 || lat > 90) {
    erros.push('local.lat deve ser um número entre -90 e 90');
  }
  if (typeof lng !== 'number' || lng < -180 || lng > 180) {
    erros.push('local.lng deve ser um número entre -180 e 180');
  }
  const raio = corpo.raio_busca_km;
  if (raio !== undefined && (typeof raio !== 'number' || raio <= 0 || raio > 500)) {
    erros.push('raio_busca_km deve ser um número maior que zero e até 500');
  }
  if (corpo.urgencia !== undefined && !URGENCIAS.includes(String(corpo.urgencia))) {
    erros.push(`urgencia deve ser ${URGENCIAS.join(', ')}`);
  }
  if (!eDataFutura(corpo.expira_em)) erros.push('expira_em deve estar no futuro');
  return erros;
}

export function criarHandlersDisponibilidades(baseUrl: string) {
  return [
    http.post(`${baseUrl}/disponibilidades`, async ({ request }) => {
      const { resposta } = autenticar(request, ['motorista']);
      if (resposta) return resposta;
      const corpo = await lerCorpo(request);
      const erros = validarDisponibilidade(corpo);
      if (erros.length > 0) return respostaErros(400, erros);
      return HttpResponse.json(
        {
          disponibilidade: {
            ...disponibilidadePublicadaMock,
            local: corpo.local,
            raio_busca_km: corpo.raio_busca_km ?? 50,
            urgencia: corpo.urgencia ?? 'normal',
            expira_em: corpo.expira_em,
            criado_em: new Date().toISOString(),
          },
        },
        { status: 201 },
      );
    }),

    // PROPOSTA relatório 4b: rota inexistente no backend.
    http.get(`${baseUrl}/disponibilidades/minhas`, ({ request }) => {
      const { resposta } = autenticar(request, ['motorista']);
      return resposta ?? HttpResponse.json({ disponibilidades: disponibilidadesDoMotoristaMock });
    }),
  ];
}
