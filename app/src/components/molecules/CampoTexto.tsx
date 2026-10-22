import type { Ref } from 'react';
import type { TextInput, TextInputProps } from 'react-native';

import { CampoRotulado, EntradaTexto, type PropsCampoBase } from './campoComum';

export interface PropsCampoTexto
  extends
    PropsCampoBase,
    Omit<
      TextInputProps,
      | 'style'
      | 'editable'
      | 'placeholderTextColor'
      | 'nativeID'
      | 'accessibilityLabel'
      | 'accessibilityHint'
    > {
  /** Aponta para o `TextInput` (o react-hook-form usa para focar o campo com erro). */
  ref?: Ref<TextInput>;
}

/**
 * Campo de texto (FormField + TextInput, DS 5.1 e 5.2): rótulo visível acima, ajuda, erro com ícone
 * e borda de 3 px, altura de 48 px. Na web, `id` + `aria-labelledby` + `aria-describedby` +
 * `aria-invalid`; no iPhone, `accessibilityLabel` (rótulo) e `accessibilityHint` (erro).
 * Repassa `autoComplete`, `inputMode`, `textContentType`, `secureTextEntry`, `onSubmitEditing`
 * e o resto das props do `TextInput`. Use com `Controller` do react-hook-form:
 *
 * `<CampoTexto rotulo="E-mail" autoComplete="email" inputMode="email" value={field.value}
 *   onChangeText={field.onChange} onBlur={field.onBlur} ref={field.ref} erro={fieldState.error?.message} />`
 */
export function CampoTexto({
  rotulo,
  opcional,
  ajuda,
  erro,
  id,
  desabilitado,
  ref,
  ...resto
}: PropsCampoTexto) {
  return (
    <CampoRotulado rotulo={rotulo} opcional={opcional} ajuda={ajuda} erro={erro} id={id}>
      {(a11y) => <EntradaTexto {...resto} a11y={a11y} desabilitado={desabilitado} ref={ref} />}
    </CampoRotulado>
  );
}
