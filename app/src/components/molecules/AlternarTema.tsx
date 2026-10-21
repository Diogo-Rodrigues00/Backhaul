import type { NomeIcone } from '@/components/atoms/icones';

import { BotaoCabecalho } from './BotaoCabecalho';

/** Mesmos valores de `Preferencia` em `state/tema` (molécula não importa `state`). */
export type PreferenciaTema = 'sistema' | 'claro' | 'escuro';

export interface PropsAlternarTema {
  preferencia: PreferenciaTema;
  /** Cicla Sistema, Claro, Escuro e salva (vem de `useTema().alternar`). */
  aoAlternar: () => void;
}

// O nome acessível diz o estado atual (protótipo); o rótulo visível é uma palavra só.
const ATUAL: Record<PreferenciaTema, string> = {
  sistema: 'auto (segue o sistema)',
  claro: 'claro',
  escuro: 'escuro',
};
// O texto visível precisa estar dentro do nome acessível (WCAG 2.5.3, regra label-content-name-mismatch
// do axe, que compara palavras inteiras): "Auto", "Claro" e "Escuro" aparecem no nome como palavras.
const TEXTO: Record<PreferenciaTema, string> = {
  sistema: 'Auto',
  claro: 'Claro',
  escuro: 'Escuro',
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
