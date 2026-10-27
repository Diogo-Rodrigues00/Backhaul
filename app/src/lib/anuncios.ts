// Emissor dos anúncios de acessibilidade (ADR 0009). Fica sozinho neste arquivo para o `_layout`
// (que monta a RegiaoViva) levar só ele no JS inicial, sem o resto de `a11yComum`.
// Quem usa: `anunciar()` (a11y.web / a11y.native) emite; o atom RegiaoViva assina.

export type OuvinteAnuncio = (mensagem: string) => void;

// Quem anuncia não precisa de foco: a região viva (atom RegiaoViva) assina este emissor.
const ouvintes = new Set<OuvinteAnuncio>();

export function ouvirAnuncios(ouvinte: OuvinteAnuncio): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

export function emitirAnuncio(mensagem: string): void {
  const texto = mensagem.trim();
  if (texto === '') return;
  ouvintes.forEach((ouvinte) => ouvinte(texto));
}
