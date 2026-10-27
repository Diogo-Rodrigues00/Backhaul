// Apoio aos testes de "Meus fretes" da empresa (card 028): abre a tela real dentro da área protegida
// da empresa, com a sessão restaurada. Não entra no app. Os arquivos de teste que usam isto mockam
// `@/lib/armazenamento` por conta própria (jest.mock).
import { QueryClientProvider } from '@tanstack/react-query';
import { Slot, usePathname } from 'expo-router';
import { renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { SessaoProvider } from '@/state/sessao/SessaoProvider';
import { useSessao } from '@/state/sessao/useSessao';
import { TemaContext } from '@/state/tema/TemaProvider';
import { valorDoTema } from '@/test-utils/renderComTema';

import { criarClienteDeTeste } from '../../mocks/utils-teste';
import LayoutEmpresa from '../app/empresa/_layout';
import FretesDaEmpresa from '../app/empresa/fretes';

function Sonda() {
  const { estado } = useSessao();
  const pathname = usePathname();
  return <Text testID="rota">{`${pathname}|${estado}`}</Text>;
}

/** Abre `/empresa/fretes` com a sessão restaurada pelo token gravado antes. */
export async function abrirFretesDaEmpresa() {
  const cliente = criarClienteDeTeste();
  function LayoutRaiz() {
    return (
      <TemaContext.Provider value={valorDoTema('light')}>
        <QueryClientProvider client={cliente}>
          <SessaoProvider>
            <Sonda />
            <Slot />
          </SessaoProvider>
        </QueryClientProvider>
      </TemaContext.Provider>
    );
  }
  await renderRouter(
    {
      _layout: LayoutRaiz,
      index: () => <Text>Início</Text>,
      entrar: () => <Text>Tela de entrada</Text>,
      'empresa/_layout': LayoutEmpresa,
      'empresa/fretes': FretesDaEmpresa,
      'empresa/cargas/index': () => <Text>Minhas cargas (tela)</Text>,
    },
    { initialUrl: '/empresa/fretes' },
  );
}

export const rota = () => screen.getByTestId('rota').props.children as string;
export const caminho = () => rota().split('|')[0];

export async function aguardarSessao() {
  await waitFor(() => expect(rota().split('|')[1]).toBe('autenticado'));
}

/** A lista é um View com `role="list"`: confere-se pelo `role` e pelo rótulo do próprio elemento. */
export const listaDeFretes = () =>
  screen.container.queryAll(
    (el) => el.props.role === 'list' && el.props['aria-label'] === 'Fretes da empresa',
  );

export async function aguardarLista() {
  await waitFor(() => expect(listaDeFretes().length).toBeGreaterThan(0));
}
