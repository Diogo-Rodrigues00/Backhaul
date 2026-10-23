// Peças que os formulários de Publicar carga (019) e Publicar disponibilidade (023) têm em comum.
import type { OpcaoGrupo } from '@/components/molecules/GrupoOpcoes';
import { OPCOES_PRAZO } from '@/lib/prazos';
import { rotuloUrgencia, type Urgencia } from '@/lib/rotulos';
import type { Validador } from '@/lib/validacao';

export const OPCOES_URGENCIA: readonly OpcaoGrupo<Urgencia>[] = (
  ['normal', 'urgente', 'critico'] as const
).map((urgencia) => ({ valor: urgencia, rotulo: rotuloUrgencia(urgencia), urgencia }));

/** Prazo rápido (D-PO-02): o valor é o número de horas, como texto (o `GrupoOpcoes` usa texto). */
export const OPCOES_DE_PRAZO: readonly OpcaoGrupo[] = OPCOES_PRAZO.map(({ horas, rotulo }) => ({
  valor: String(horas),
  rotulo,
}));

export const PRAZO_PADRAO = '24';

/** A primeira mensagem que falhar (como os demais formulários: um erro por campo). */
export function encadear(...validadores: Validador[]): Validador {
  return (valor) => {
    for (const validar of validadores) {
      const resultado = validar(valor);
      if (resultado !== true) return resultado;
    }
    return true;
  };
}
