import type { NomeIcone } from '@/components/atoms/icones';

import { BotaoCabecalho } from './BotaoCabecalho';

/** Mesmos valores de `Preferencia` em `state/tema` (molécula não importa `state`). */
export type PreferenciaTema = 'sistema' | 'claro' | 'escuro';

export interface PropsAlternarTema {
  preferencia: PreferenciaTema;
  /** Cicla Sistema, Claro, Escuro e salva (vem de `useTema().alternar`). */
  aoAlternar: () => void;
}

// Textos do protótipo: o nome acessível diz o estado atual; o rótulo visível diz o tema.
const ATUAL: Record<PreferenciaTema, string> = {
  sistema: 'automático (segue o sistema)',
  claro: 'claro',
  escuro: 'escuro',
};
const TEXTO: Record<PreferenciaTema, string> = {
  sistema: 'Tema auto',
  claro: 'Tema claro',
  escuro: 'Tema escuro',
};
const ICONE: Record<PreferenciaTema, NomeIcone> = {
  sistema: 'circle',
  claro: 'sun',
  escuro: 'moon',
};

/**
 * Alternar tema (ThemeToggle do DS): um botão que cicla Sistema → Claro → Escuro. O estado atual
 * está no nome acessível ("Alternar tema. Atual: claro") e em texto visível (some no celular).
 */
export function AlternarTema({ preferencia, aoAlternar }: PropsAlternarTema) {
  return (
    <BotaoCabecalho
      icone={ICONE[preferencia]}
      rotulo={`Alternar tema. Atual: ${ATUAL[preferencia]}`}
      texto={TEXTO[preferencia]}
      aoPressionar={aoAlternar}
    />
  );
}
