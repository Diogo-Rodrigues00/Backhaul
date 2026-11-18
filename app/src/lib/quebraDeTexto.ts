import { Platform, type TextStyle } from 'react-native';

/**
 * Texto sem espaços (nome, e-mail ou placa digitados sem pausa) não pode estourar o cartão nem a
 * tela de 320 px (WCAG 1.4.10): na web `overflow-wrap: anywhere` também reduz a largura mínima do
 * conteúdo, coisa que o `word-wrap: break-word` do react-native-web não faz. No iPhone o texto já
 * quebra sozinho. Mesmo recurso do chat (`ConversaDaProposta`).
 */
export const QUEBRA_ONDE_PRECISAR: TextStyle | undefined = Platform.select({
  web: { overflowWrap: 'anywhere', wordWrap: 'anywhere' } as unknown as TextStyle,
});
