// Parte comum da a11y (ADR 0009). Vive fora de `a11y.ts` pelo mesmo motivo de `armazenamentoComum.ts`:
// os arquivos `.web.ts` e `.native.ts` não podem importar o arquivo base.

// O emissor de anúncios mora em `anuncios.ts`; é reexportado aqui para quem já importa de a11yComum.
export { emitirAnuncio, ouvirAnuncios, type OuvinteAnuncio } from './anuncios';

// Qualquer coisa com `focus` (no web, o nó do DOM; no nativo, o alvo que aceita foco).
export type AlvoFoco = { focus?: () => void };

export type EntradaCampo = { id: string; rotulo: string; erro?: string | null };

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
};

// Associa rótulo, campo e erro (ADR 0009): o leitor de tela lê o nome e, com erro, a mensagem.
export function propsDeCampo({ id, rotulo, erro }: EntradaCampo): PropsCampo {
  const idRotulo = `${id}-rotulo`;
  const idErro = `${id}-erro`;
  const mensagemErro = erro ?? '';
  const temErro = mensagemErro.length > 0;

  return {
    rotulo: { nativeID: idRotulo },
    campo: {
      nativeID: id,
      accessibilityLabel: rotulo,
      accessibilityHint: temErro ? mensagemErro : undefined,
      'aria-labelledby': idRotulo,
      'aria-describedby': temErro ? idErro : undefined,
      'aria-invalid': temErro,
    },
    erro: temErro ? { nativeID: idErro } : null,
  };
}
