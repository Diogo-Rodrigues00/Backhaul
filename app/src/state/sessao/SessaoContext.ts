import { createContext } from 'react';

import type { Usuario } from '@/api/tipos';
import type { AvisoSessao } from '@/lib/areas';

/** `restaurando` é o estado do HTML estático e do primeiro render: ainda não se sabe quem é. */
export type EstadoSessao = 'restaurando' | 'anonimo' | 'autenticado';

export interface ValorSessao {
  estado: EstadoSessao;
  /** Dados de `GET /eu`; só existe com `estado === 'autenticado'`. */
  usuario: Usuario | null;
  /** Por que a sessão terminou sem o usuário pedir; a tela de login mostra o texto. */
  aviso: AvisoSessao | null;
  /**
   * `POST /login` + `GET /eu`, grava o token e abre a área do perfil. Rejeita com `ErroApi` (o
   * 401 do login é erro do formulário, D-PO-11): nada muda no estado nem no armazenamento.
   */
  entrar: (email: string, senha: string) => Promise<void>;
  /** Apaga token e disponibilidade ativa, limpa o cache e abre `/entrar` (com o aviso, se houver). */
  sair: (aviso?: AvisoSessao) => Promise<void>;
}

export const SessaoContext = createContext<ValorSessao | null>(null);
