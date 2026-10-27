// Handlers MSW de todas as rotas do MVP (docs/api.md) mais as propostas 4a e 4b do relatório
// (GET /propostas/minhas e GET /disponibilidades/minhas, ainda inexistentes no backend).
// Cada recurso tem o seu arquivo; `baseUrl` é a EXPO_PUBLIC_API_URL do ambiente.
import { criarHandlersCargas } from './cargas';
import { criarHandlersCertificacoes } from './certificacoes';
import { criarHandlersDisponibilidades } from './disponibilidades';
import { criarHandlersFretes } from './fretes';
import { criarHandlersPropostas } from './propostas';
import { criarHandlersSaude } from './saude';
import { criarHandlersSessao } from './sessao';

export function criarHandlers(baseUrl: string) {
  const base = baseUrl.replace(/\/+$/, '');
  return [
    ...criarHandlersSaude(base),
    ...criarHandlersSessao(base),
    ...criarHandlersCertificacoes(base),
    ...criarHandlersCargas(base),
    ...criarHandlersDisponibilidades(base),
    ...criarHandlersPropostas(base),
    ...criarHandlersFretes(base),
  ];
}
