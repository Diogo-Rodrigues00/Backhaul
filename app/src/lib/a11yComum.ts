// Parte comum da a11y (ADR 0009). Vive fora de `a11y.ts` pelo mesmo motivo de `armazenamentoComum.ts`:
// os arquivos `.web.ts` e `.native.ts` não podem importar o arquivo base.

// O emissor de anúncios mora em `anuncios.ts`; é reexportado aqui para quem já importa de a11yComum.
export { emitirAnuncio, ouvirAnuncios, type OuvinteAnuncio } from './anuncios';

// Qualquer coisa com `focus` (no web, o nó do DOM; no nativo, o alvo que aceita foco).
export type AlvoFoco = { focus?: () => void };

// `propsDeCampo` (rótulo, ajuda e erro dos campos) mora em `a11yCampo.ts`: só os formulários usam, e este
// arquivo vai no JS inicial de toda rota.
