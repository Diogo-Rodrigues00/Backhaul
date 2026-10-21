// POST /cargas e GET /cargas/minhas (empresa); GET /cargas/proximas (motorista).
import { http, HttpResponse } from 'msw';

import { cargaPublicadaMock, cargasDaEmpresaMock, cargasProximasMock } from '../fixtures/cargas';
import { certificacoesMock } from '../fixtures/certificacoes';
import { respostaErros } from '../respostas';
import { autenticar, eDataFutura, eNumeroPositivo, lerCorpo, textoOuVazio } from './comum';

const URGENCIAS = ['normal', 'urgente', 'critico'];

function eCoordenada(valor: unknown): boolean {
  if (typeof valor !== 'object' || valor === null) return false;
  const { lat, lng } = valor as Record<string, unknown>;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function validarCarga(corpo: Record<string, unknown>): string[] {
  const erros: string[] = [];
  if (textoOuVazio(corpo.tipo_carga) === '') erros.push('tipo_carga é obrigatório');
  if (!eCoordenada(corpo.origem)) erros.push('origem deve ter lat e lng válidos');
  if (!eCoordenada(corpo.destino)) erros.push('destino deve ter lat e lng válidos');
  if (!eNumeroPositivo(corpo.peso_kg)) erros.push('peso_kg deve ser um número maior que zero');
  if (!eNumeroPositivo(corpo.valor_oferecido)) {
    erros.push('valor_oferecido deve ser um número maior que zero');
  }
  if (corpo.urgencia !== undefined && !URGENCIAS.includes(String(corpo.urgencia))) {
    erros.push(`urgencia deve ser ${URGENCIAS.join(', ')}`);
  }
  const certificacao = corpo.certificacao_requerida_id;
  if (
    certificacao !== undefined &&
    certificacao !== null &&
    !certificacoesMock.some((c) => c.id === certificacao)
  ) {
    erros.push('certificacao_requerida_id não corresponde a nenhuma certificação');
  }
  if (!eDataFutura(corpo.expira_em)) erros.push('expira_em deve estar no futuro');
  return erros;
}

function lerNumero(valor: string | null): number | null {
  if (valor === null || valor.trim() === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

export function criarHandlersCargas(baseUrl: string) {
  return [
    http.post(`${baseUrl}/cargas`, async ({ request }) => {
      const { resposta } = autenticar(request, ['empresa']);
      if (resposta) return resposta;
      const corpo = await lerCorpo(request);
      const erros = validarCarga(corpo);
      if (erros.length > 0) return respostaErros(400, erros);
      return HttpResponse.json(
        {
          carga: {
            ...cargaPublicadaMock,
            tipo_carga: textoOuVazio(corpo.tipo_carga),
            origem: corpo.origem,
            destino: corpo.destino,
            peso_kg: corpo.peso_kg,
            valor_oferecido: corpo.valor_oferecido,
            urgencia: corpo.urgencia ?? 'normal',
            certificacao_requerida_id: corpo.certificacao_requerida_id ?? null,
            expira_em: corpo.expira_em,
            criado_em: new Date().toISOString(),
          },
        },
        { status: 201 },
      );
    }),

    http.get(`${baseUrl}/cargas/minhas`, ({ request }) => {
      const { resposta } = autenticar(request, ['empresa']);
      return resposta ?? HttpResponse.json({ cargas: cargasDaEmpresaMock });
    }),

    http.get(`${baseUrl}/cargas/proximas`, ({ request }) => {
      const { resposta } = autenticar(request, ['motorista']);
      if (resposta) return resposta;
      const url = new URL(request.url);
      const lat = lerNumero(url.searchParams.get('lat'));
      const lng = lerNumero(url.searchParams.get('lng'));
      const raio = lerNumero(url.searchParams.get('raio_km'));
      const erros: string[] = [];
      if (lat === null || lat < -90 || lat > 90)
        erros.push('lat deve ser um número entre -90 e 90');
      if (lng === null || lng < -180 || lng > 180) {
        erros.push('lng deve ser um número entre -180 e 180');
      }
      if (raio === null || raio <= 0 || raio > 500) {
        erros.push('raio_km deve ser um número maior que zero e até 500');
      }
      if (erros.length > 0) return respostaErros(400, erros);
      return HttpResponse.json({ cargas: cargasProximasMock });
    }),
  ];
}
