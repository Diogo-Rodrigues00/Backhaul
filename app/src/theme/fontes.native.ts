import { Barlow_500Medium } from '@expo-google-fonts/barlow/500Medium';
import { Barlow_700Bold } from '@expo-google-fonts/barlow/700Bold';
import { useFonts } from 'expo-font';

// iPhone: Barlow pelo expo-font. Importar só os dois pesos (e não o índice do pacote) evita
// empacotar as 18 variações. A web usa fontes.web.ts (Barlow hospedada em /fontes/, ADR 0008).
const fontesBarlow = { Barlow_500Medium, Barlow_700Bold };

/** `true` quando a Barlow está pronta (ou falhou: o app abre com a fonte do sistema). */
export function useFontesCarregadas(): boolean {
  const [carregadas, erro] = useFonts(fontesBarlow);
  return carregadas || erro !== null;
}
