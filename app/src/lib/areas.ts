// Áreas do app por perfil e destinos da sessão (ADR 0006). Funções puras, sem estado.
import type { Href } from 'expo-router';

/** Mesmos valores de `TipoUsuario` do contrato (`src/api/tipos.ts`); lib não importa api. */
export type TipoPerfil = 'empresa' | 'motorista' | 'admin';

/** Motivo do login ter sido pedido de novo; o texto é exibido pela tela de login (card 015). */
export type AvisoSessao = 'sessao-expirada' | 'conta-nao-encontrada';

// Rotas ainda sem arquivo (login: card 015) não existem na lista tipada do expo-router.
const ROTA_ENTRAR = '/entrar';

/** Primeira tela de cada perfil (ADR 0006). */
export function rotaInicial(tipo: TipoPerfil): Href {
  switch (tipo) {
    case 'empresa':
      return '/empresa/cargas';
    case 'motorista':
      return '/motorista/cargas';
    case 'admin':
      return '/admin';
  }
}

/** Tela de login, com o aviso quando a sessão terminou sem o usuário pedir. */
export function rotaDeEntrada(aviso?: AvisoSessao | null): Href {
  return (aviso ? `${ROTA_ENTRAR}?aviso=${aviso}` : ROTA_ENTRAR) as Href;
}

/** Perfil em texto de tela (cabeçalho). */
export function rotuloDoPerfil(tipo: TipoPerfil): string {
  switch (tipo) {
    case 'empresa':
      return 'Empresa';
    case 'motorista':
      return 'Motorista';
    case 'admin':
      return 'Administrador';
  }
}
