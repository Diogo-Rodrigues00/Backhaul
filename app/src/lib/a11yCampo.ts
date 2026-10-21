// Acessibilidade dos campos de formulário (ADR 0009): liga rótulo, ajuda e erro ao controle.
// Fica fora de `a11yComum.ts` porque só os formulários usam, e `a11yComum` vai no JS inicial de toda
// rota (ADR 0011, adendo 2: formulários carregam só no chunk das rotas que os usam).

export type EntradaCampo = {
  id: string;
  rotulo: string;
  erro?: string | null;
  /** Texto de ajuda sob o rótulo; entra no `aria-describedby` (web) e na dica (iPhone). */
  ajuda?: string | null;
};

// Props que o molecule de campo espalha nos elementos. `nativeID` vira `id` no react-native-web.
export type PropsCampo = {
  rotulo: { nativeID: string };
  campo: {
    nativeID: string;
    accessibilityLabel: string;
    accessibilityHint?: string;
    'aria-labelledby': string;
    'aria-describedby'?: string;
    'aria-invalid': boolean;
  };
  erro: { nativeID: string } | null;
  /** Só existe quando há ajuda. */
  ajuda?: { nativeID: string };
};

// Associa rótulo, campo, ajuda e erro (ADR 0009): o leitor de tela lê o nome e, depois, o erro
// (e a ajuda). Na web o erro vem antes da ajuda no `aria-describedby`; no iPhone vira a dica.
export function propsDeCampo({ id, rotulo, erro, ajuda }: EntradaCampo): PropsCampo {
  const idRotulo = `${id}-rotulo`;
  const idErro = `${id}-erro`;
  const idAjuda = `${id}-ajuda`;
  const mensagemErro = erro ?? '';
  const textoAjuda = ajuda ?? '';
  const temErro = mensagemErro.length > 0;
  const temAjuda = textoAjuda.length > 0;
  const descritoPor = [temErro ? idErro : '', temAjuda ? idAjuda : ''].filter(Boolean).join(' ');
  const dica = [mensagemErro, textoAjuda].filter(Boolean).join(' ');

  return {
    rotulo: { nativeID: idRotulo },
    campo: {
      nativeID: id,
      accessibilityLabel: rotulo,
      accessibilityHint: dica === '' ? undefined : dica,
      'aria-labelledby': idRotulo,
      'aria-describedby': descritoPor === '' ? undefined : descritoPor,
      'aria-invalid': temErro,
    },
    erro: temErro ? { nativeID: idErro } : null,
    ...(temAjuda ? { ajuda: { nativeID: idAjuda } } : {}),
  };
}
