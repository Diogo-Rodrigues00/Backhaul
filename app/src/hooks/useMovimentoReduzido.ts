import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * `true` quando o usuário pediu menos movimento (prefers-reduced-motion na web,
 * "Reduzir Movimento" no iPhone). Toda animação consulta este hook (ADR 0009).
 * Começa em `false` e corrige após a montagem, o que mantém o HTML estático e a hidratação iguais.
 */
export function useMovimentoReduzido(): boolean {
  const [reduzido, setReduzido] = useState(false);

  useEffect(() => {
    let ativo = true;
    AccessibilityInfo.isReduceMotionEnabled().then((valor) => {
      if (ativo) setReduzido(valor);
    });
    const assinatura = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduzido);
    return () => {
      ativo = false;
      assinatura.remove();
    };
  }, []);

  return reduzido;
}
