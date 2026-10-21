// iPhone: só o conteúdo rola (telas altas e Dynamic Type); a barra de abas fica fixa embaixo.
import { ScrollView, StyleSheet } from 'react-native';

import type { PropsCorpoDaTela } from './corpoDaTelaComum';

export type { PropsCorpoDaTela } from './corpoDaTelaComum';

const estilos = StyleSheet.create({ conteudo: { flexGrow: 1 } });

export function CorpoDaTela({ children, barra }: PropsCorpoDaTela) {
  return (
    <>
      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {barra}
    </>
  );
}
