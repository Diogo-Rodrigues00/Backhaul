// Props que só o react-native-web entende (viram atributos HTML) e o tipo do React Native não prevê.
// No iPhone são ignoradas sem prejuízo. Usadas pelos atoms (ADR 0008 e 0009).
import 'react-native';

declare module 'react-native' {
  interface ViewProps {
    /** Vira `data-*` no HTML (ex.: `{ bp: 'so-celular' }` → `data-bp`). */
    dataSet?: Readonly<Record<string, string>>;
    /** Destino do `<a>` quando a View é um link (o expo-router preenche). */
    href?: string;
  }

  interface TextProps {
    dataSet?: Readonly<Record<string, string>>;
    /** `-1` permite receber foco por código (`ref.focus()`) sem entrar na ordem do Tab. */
    tabIndex?: 0 | -1;
  }

  interface PressableStateCallbackType {
    /** Só na web (ponteiro). No iPhone não existe. */
    readonly hovered?: boolean;
    /** Só na web. */
    readonly focused?: boolean;
  }
}
