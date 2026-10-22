import { useEffect } from 'react';
import type { RefCallBack } from 'react-hook-form';
import { Platform } from 'react-native';

import { SeletorLocal, type Local } from '@/components/organisms/SeletorLocal';

export interface PropsCampoLocal {
  id: string;
  rotulo: string;
  /** O que o `Controller` do react-hook-form entrega (`field`). */
  campo: { ref: RefCallBack; value: Local | null; onChange: (local: Local | null) => void };
  erro?: string;
  /** "Usar minha localização": só o motorista. */
  permitirGps?: boolean;
}

/**
 * `SeletorLocal` ligado ao campo do formulário. O seletor não é um único controle, então o foco do
 * resumo de erros (e do primeiro campo com erro) vai ao campo de busca pelo id, na web.
 */
export function CampoLocal({ id, rotulo, campo, erro, permitirGps }: PropsCampoLocal) {
  const { ref, value, onChange } = campo;
  useEffect(() => {
    ref({
      focus: () => {
        if (Platform.OS === 'web') document.getElementById(id)?.focus();
      },
    });
  }, [ref, id]);
  return (
    <SeletorLocal
      id={id}
      rotulo={rotulo}
      valor={value}
      aoMudar={onChange}
      erro={erro}
      permitirGps={permitirGps}
    />
  );
}
