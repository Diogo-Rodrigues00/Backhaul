// Um mapa aberto por tela (card 035): guarda qual está aberto ("geral" ou o id de uma carga). Abrir
// outro fecha o anterior; clicar de novo no mesmo fecha.
import { useCallback, useState } from 'react';

export function useMapaUnico() {
  const [aberto, setAberto] = useState<string | null>(null);
  const alternar = useCallback(
    (chave: string) => setAberto((atual) => (atual === chave ? null : chave)),
    [],
  );
  const fechar = useCallback(() => setAberto(null), []);
  return { aberto, alternar, fechar };
}
