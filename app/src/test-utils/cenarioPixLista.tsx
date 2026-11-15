// Apoio aos testes do Pix que vem da lista de fretes (card 044): helpers e fixtures. Os mocks de módulo
// (a11y, foco, armazenamento) ficam em cada arquivo de teste, porque o Jest os eleva acima dos imports.
import { http, HttpResponse } from 'msw';

import {
  abrirFretesDaEmpresa,
  aguardarLista,
  aguardarSessao,
} from '@/test-utils/cenarioFretesEmpresa';

import { FRETE_ACEITO_ID, fretesDaEmpresaMock } from '../../mocks/fixtures/fretes';
import { servidor, urlMock } from '../../mocks/node';

export const CODIGO = '00020126580014br.gov.bcb.pix0136lista-backhaul5204000053039865802BR6304ABCD';
export const CODIGO_NOVO =
  '00020126580014br.gov.bcb.pix0136qr-backhaul5204000053039865802BR6304WXYZ';
export const PNG_1X1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

export const expiraEm = (minutos: number) => new Date(Date.now() + minutos * 60_000).toISOString();

/** Frete aceito com o Pix pendente vindo da lista: copia e cola e validade, sem QR. */
export const pendenteDaLista = {
  comissao: { percentual_comissao: 5, valor_comissao: 160, status_pagamento: 'pendente' },
  status_pagamento: 'pendente',
  pix_copia_cola: CODIGO,
  pix_expira_em: expiraEm(30),
};

/** Lista da empresa com alterações só no frete aceito (o do Pix desta história). */
export function listaCom(alteracao: Record<string, unknown>) {
  servidor.use(
    http.get(urlMock('/fretes/meus'), () =>
      HttpResponse.json({
        fretes: fretesDaEmpresaMock.map((frete) =>
          frete.id === FRETE_ACEITO_ID ? { ...frete, ...alteracao } : frete,
        ),
      }),
    ),
  );
}

export async function abrir() {
  await abrirFretesDaEmpresa();
  await aguardarSessao();
  await aguardarLista();
}

export { FRETE_ACEITO_ID };
