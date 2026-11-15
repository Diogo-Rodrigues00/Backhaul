// Apoio aos testes de "cancelar disponibilidade" (card 034): textos de cada cartão, a lista como a API
// a devolveria depois de cancelar e as consultas do diálogo. Cada arquivo que aperta "Cancelar" tem
// de ser próprio (o estado do render fica para o próximo teste), como em cenarioMinhasDisponibilidades.
import { screen } from 'expo-router/testing-library';

import {
  DISPONIBILIDADE_ABERTA_ANTIGA_ID,
  DISPONIBILIDADE_ABERTA_ID,
  disponibilidadesDoMotoristaMock,
} from '../../mocks/fixtures/disponibilidades';

export const ROTA_MINHAS = '/disponibilidades/minhas';
export const ROTA_CANCELAR = '/disponibilidades/:id/cancelar';

export const TEXTO_ATIVA_UBERLANDIA = `${DISPONIBILIDADE_ABERTA_ID}|-18.9186|-48.2772|80|urgente`;
export const TEXTO_ATIVA_ARAGUARI = `${DISPONIBILIDADE_ABERTA_ANTIGA_ID}|-18.6456|-48.1934|120|normal`;

// Nome acessível de cada botão: local + horário do prazo (o prazo de Uberlândia é relativo ao relógio).
export const BOTAO_CANCELAR_UBERLANDIA =
  /^Cancelar disponibilidade perto de Uberlândia - MG, expira em /;
export const BOTAO_CANCELAR_ARAGUARI =
  /^Cancelar disponibilidade perto de Araguari - MG, expira em /;

/** A lista como a API a devolveria com `id` cancelada (o mock dos handlers não guarda estado). */
export function listaCom(id: string, status: 'cancelado' | 'aberto' = 'cancelado') {
  return disponibilidadesDoMotoristaMock.map((item) =>
    item.id === id ? { ...item, status } : item,
  );
}

export const dialogos = () => screen.container.queryAll((el) => el.props.role === 'alertdialog');
export const alertas = () => screen.container.queryAll((el) => el.props.role === 'alert');
