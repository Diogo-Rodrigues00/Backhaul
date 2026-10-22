// Texto do anúncio quando o motorista muda o andamento de um frete (CT-09, ADR 0010).
// Função pura sobre duas leituras de `GET /fretes/meus`; fica em lib (e não em `app/`, onde o
// expo-router a trataria como rota) e não importa `src/api`: recebe só os campos que usa.

export interface FreteObservado {
  id: string;
  tipo_carga: string;
  status_entrega: string;
}

export interface LeituraDeFretes {
  fretes: readonly FreteObservado[];
}

const FRASE_POR_STATUS: Readonly<Record<string, string>> = {
  em_transito: 'Transporte iniciado',
  entregue: 'Entrega confirmada',
};

/**
 * Frases das mudanças de status de entrega entre duas leituras, separadas por ponto
 * ("Transporte iniciado: Grãos. Entrega confirmada: Soja"). `null` quando nada mudou, na primeira
 * leitura e para fretes novos (não há "antes" para comparar).
 */
export function descreverMudancasFretesEmpresa(
  anterior: LeituraDeFretes | undefined,
  atual: LeituraDeFretes | undefined,
): string | null {
  if (!anterior || !atual) return null;
  const antes = new Map(anterior.fretes.map((frete) => [frete.id, frete.status_entrega]));
  const frases: string[] = [];
  for (const frete of atual.fretes) {
    const statusAnterior = antes.get(frete.id);
    if (statusAnterior === undefined || statusAnterior === frete.status_entrega) continue;
    const frase = FRASE_POR_STATUS[frete.status_entrega];
    if (frase) frases.push(`${frase}: ${frete.tipo_carga}`);
  }
  return frases.length > 0 ? frases.join('. ') : null;
}
