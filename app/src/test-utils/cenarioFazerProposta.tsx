// Apoio aos testes do card 025 (fazer proposta): abre "Cargas próximas" com a lista pronta, acha os
// botões de proposta de uma carga e registra o que o servidor de mock recebeu no POST /propostas.
// Os arquivos de teste mockam `@/lib/armazenamento` (como os do card 024). Não entra no app.
import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { delay, http, HttpResponse } from 'msw';

import { ouvirAnuncios } from '@/lib/anuncios';
import {
  abrirCargasProximas,
  aguardarLista,
  aguardarSessao,
  cartoes,
} from '@/test-utils/cenarioCargasProximas';

import { servidor, urlMock } from '../../mocks/node';

export const PROPOSTA_TESTE_ID = 'bbbbbbbb-0000-4000-8000-0000000000f1';

/** Abre a tela com a sessão do motorista restaurada e a lista de cargas na tela. */
export async function abrirComLista() {
  await abrirCargasProximas();
  await aguardarSessao();
  await aguardarLista();
}

/** O `article` da carga (o título é o tipo da carga). */
export function cartaoDa(tipoCarga: string) {
  const cartao = cartoes().find(
    (el) => within(el).queryByRole('heading', { name: tipoCarga }) !== null,
  );
  if (!cartao) throw new Error(`cartão de "${tipoCarga}" não encontrado`);
  return within(cartao);
}

/** Botão do cartão pelo começo do nome acessível ("Aceitar R$ 4.200,50", "Contraproposta"). */
export function botaoDoCartao(tipoCarga: string, inicioDoNome: string) {
  return cartaoDa(tipoCarga).getByRole('button', {
    name: new RegExp(`^${inicioDoNome.replace(/[$.]/g, '\\$&')}`),
  });
}

/** Espera os botões de proposta aparecerem (dependem da lista `GET /propostas/minhas`). */
export async function aguardarAcoes(tipoCarga: string) {
  await waitFor(() =>
    expect(cartaoDa(tipoCarga).queryByRole('button', { name: /^Aceitar R\$/ })).toBeOnTheScreen(),
  );
}

export interface CorpoRecebido {
  chamado_carga_id?: string;
  chamado_disp_id?: string;
  tipo?: string;
  valor_proposto?: unknown;
}

/**
 * Troca o handler do POST /propostas por um que guarda cada corpo recebido e responde com `resposta`
 * (padrão: 201 no formato do contrato). `atrasoMs` mantém o envio em voo, para o teste do clique duplo.
 */
export function espiarPropostas(
  resposta?: () => Response | Promise<Response>,
  atrasoMs = 0,
): CorpoRecebido[] {
  const recebidos: CorpoRecebido[] = [];
  servidor.use(
    http.post(urlMock('/propostas'), async ({ request }) => {
      const corpo = (await request.json()) as CorpoRecebido;
      recebidos.push(corpo);
      if (atrasoMs > 0) await delay(atrasoMs);
      if (resposta) return resposta();
      return HttpResponse.json(
        {
          proposta: {
            id: PROPOSTA_TESTE_ID,
            chamado_carga_id: corpo.chamado_carga_id,
            chamado_disp_id: corpo.chamado_disp_id,
            tipo: corpo.tipo,
            valor_proposto: corpo.valor_proposto ?? 4200.5,
            status: 'pendente',
            criado_em: '2026-10-22T12:00:00.000Z',
          },
        },
        { status: 201 },
      );
    }),
  );
  return recebidos;
}

/** Guarda os anúncios da região viva enquanto o teste roda. */
export function ouvirAnunciosDoTeste(): { mensagens: string[]; parar: () => void } {
  const mensagens: string[] = [];
  const parar = ouvirAnuncios((mensagem) => mensagens.push(mensagem));
  return { mensagens, parar };
}

export const dialogos = () => screen.container.queryAll((el) => el.props.role === 'alertdialog');

/** Abre o diálogo de aceite da carga e espera o título. */
export async function abrirAceite(tipoCarga: string, inicioDoNome: string) {
  await aguardarAcoes(tipoCarga);
  await fireEvent.press(botaoDoCartao(tipoCarga, inicioDoNome));
  await screen.findByRole('heading', { name: 'Aceitar o valor oferecido?' });
}

/** Abre o diálogo de contraproposta da carga e espera o título. */
export async function abrirContraproposta(tipoCarga: string) {
  await aguardarAcoes(tipoCarga);
  await fireEvent.press(botaoDoCartao(tipoCarga, 'Contraproposta'));
  await screen.findByRole('heading', { name: 'Enviar contraproposta?' });
}
