// Copia um texto para a área de transferência (código Pix "copia e cola", card 048).
// Web: `navigator.clipboard.writeText` e, onde ele não existe ou é negado (HTTP simples, WebView),
// `document.execCommand('copy')` num campo temporário. iPhone: o projeto não tem `expo-clipboard`, então
// não há como copiar por código; a tela mostra o texto selecionável (toque e segure) e não oferece botão.
import { Platform } from 'react-native';

/** Há como copiar por código nesta plataforma? Sem isto a tela não mostra o botão "Copiar". */
export const COPIA_POR_CODIGO = Platform.OS === 'web';

function copiarPorCampoTemporario(texto: string): boolean {
  if (typeof document === 'undefined') return false;
  const campo = document.createElement('textarea');
  campo.value = texto;
  campo.setAttribute('readonly', '');
  campo.setAttribute('aria-hidden', 'true');
  campo.style.position = 'fixed';
  campo.style.opacity = '0';
  campo.style.pointerEvents = 'none';
  const anterior = document.activeElement as HTMLElement | null;
  document.body.appendChild(campo);
  try {
    campo.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(campo);
    // Nada de roubar o foco: devolve ao elemento que o tinha.
    anterior?.focus?.();
  }
}

/** Devolve `true` se copiou. Nunca lança nem registra o texto (é dado de cobrança). */
export async function copiarTexto(texto: string): Promise<boolean> {
  if (!COPIA_POR_CODIGO) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // Permissão negada: tenta o plano B abaixo.
  }
  return copiarPorCampoTemporario(texto);
}
