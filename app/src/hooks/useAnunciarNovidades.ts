import { useEffect, useRef } from 'react';

import { anunciar } from '@/lib/a11y';

// Anuncia novidades sem mover o foco (ADR 0010, CT-09).
// A primeira carga não anuncia. Em cada mudança de `dados`, `descrever` devolve o texto a falar
// (ou null para não falar nada).
export function useAnunciarNovidades<T>(
  dados: T,
  descrever: (anterior: T, atual: T) => string | null,
): void {
  const anterior = useRef<{ valor: T } | null>(null);
  const descreverAtual = useRef(descrever);

  useEffect(() => {
    descreverAtual.current = descrever;
  });

  useEffect(() => {
    const ultimo = anterior.current;
    anterior.current = { valor: dados };
    if (ultimo === null || Object.is(ultimo.valor, dados)) return;

    const texto = descreverAtual.current(ultimo.valor, dados);
    if (texto) anunciar(texto);
  }, [dados]);
}
