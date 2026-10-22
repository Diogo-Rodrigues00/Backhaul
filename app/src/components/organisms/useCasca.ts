import { createContext, useContext, type ReactNode } from 'react';

import type { ItemNavegacao } from '@/components/molecules/AbaNavegacao';

/** O que o layout da área entrega às telas dela (ver `AreaProtegida`). */
export interface Casca {
  /** `<Cabecalho variante="completo">` da área, para o `cabecalho` do `TemplateTela`. */
  cabecalho: ReactNode;
  /** Itens da barra inferior, para as `abas` do `TemplateTela`. Vazio na área do administrador. */
  abas: readonly ItemNavegacao[] | undefined;
  /**
   * Verdadeiro só com a sessão autenticada no perfil da área. Toda consulta da área usa isto em
   * `habilitado` (ADR 0004): enquanto a sessão é restaurada, ou se o perfil está errado, nada é pedido.
   */
  habilitado: boolean;
}

export const CascaContext = createContext<Casca | null>(null);

/**
 * Cabeçalho, abas e `habilitado` da área em que a tela está. Só dentro de `empresa/`, `motorista/`
 * e `admin/` (os layouts montam o `AreaProtegida`):
 *
 *     const { cabecalho, abas, habilitado } = useCasca();
 *     <TemplateTela titulo="..." descricao="..." cabecalho={cabecalho} abas={abas} />
 *
 * `abas` é obrigatório junto do cabeçalho completo: abaixo de 960 px a navegação só existe na
 * barra inferior.
 */
export function useCasca(): Casca {
  const casca = useContext(CascaContext);
  if (casca === null) {
    throw new Error('useCasca só funciona dentro de uma área protegida (AreaProtegida).');
  }
  return casca;
}
