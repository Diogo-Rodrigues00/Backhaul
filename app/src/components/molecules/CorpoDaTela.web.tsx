// Web: a página rola no próprio documento (o CSS global libera o `overflow` do body). Sem
// ScrollView do react-native-web no bundle; a barra de abas é `position: sticky` na base.
import type { PropsCorpoDaTela } from './corpoDaTelaComum';

export type { PropsCorpoDaTela } from './corpoDaTelaComum';

export function CorpoDaTela({ children, barra }: PropsCorpoDaTela) {
  return (
    <>
      {children}
      {barra}
    </>
  );
}
