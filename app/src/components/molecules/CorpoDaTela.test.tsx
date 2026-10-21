import { screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { CorpoDaTela as CorpoNativo } from './CorpoDaTela.native';
import { CorpoDaTela as CorpoWeb } from './CorpoDaTela.web';

// Nome do componente nativo do ScrollView no renderer de teste.
const rolagens = () => screen.container.queryAll((el) => el.type === 'RCTScrollView');

describe('CorpoDaTela', () => {
  it('web: não usa ScrollView; conteúdo e barra seguem o fluxo da página', async () => {
    await renderizar(
      <CorpoWeb barra={<Text>barra</Text>}>
        <Text>conteúdo</Text>
      </CorpoWeb>,
    );
    expect(screen.getByText('conteúdo')).toBeOnTheScreen();
    expect(screen.getByText('barra')).toBeOnTheScreen();
    expect(rolagens()).toHaveLength(0);
  });

  it('iPhone: só o conteúdo rola; a barra fica fora do ScrollView', async () => {
    await renderizar(
      <CorpoNativo barra={<Text>barra</Text>}>
        <Text>conteúdo</Text>
      </CorpoNativo>,
    );
    expect(rolagens()).toHaveLength(1);
    expect(screen.getByText('barra')).toBeOnTheScreen();
    expect(screen.getByText('conteúdo')).toBeOnTheScreen();
  });
});
