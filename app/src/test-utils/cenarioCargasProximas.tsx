// Apoio aos testes de "Cargas próximas" (card 024): abre a tela real dentro da área protegida do
// motorista, com a sessão restaurada, e oferece consultas pelo que a pessoa vê. Não entra no app.
// Os arquivos de teste que usam isto mockam `@/lib/armazenamento` e
// `@/telas/CorpoCargasProximas.carregar` (jest.mock), porque o Jest não executa `import()`.
import { QueryClientProvider } from '@tanstack/react-query';
import { Slot, usePathname } from 'expo-router';
import { renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { SessaoProvider } from '@/state/sessao/SessaoProvider';
import { useSessao } from '@/state/sessao/useSessao';
import { TemaContext } from '@/state/tema/TemaProvider';
import { valorDoTema } from '@/test-utils/renderComTema';

import { criarClienteDeTeste } from '../../mocks/utils-teste';
import LayoutMotorista from '../app/motorista/_layout';
import CargasProximas from '../app/motorista/cargas';

/** Mostra o caminho e o estado da sessão para o teste conferir. */
function Sonda() {
  const { estado } = useSessao();
  const pathname = usePathname();
  return <Text testID="rota">{`${pathname}|${estado}`}</Text>;
}

/** Abre `/motorista/cargas` com a sessão restaurada pelo token gravado antes. */
export async function abrirCargasProximas() {
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
      'motorista/_layout': LayoutMotorista,
      'motorista/cargas': CargasProximas,
      'motorista/disponibilidades/index': () => <Text>Minhas disponibilidades</Text>,
    },
    { initialUrl: '/motorista/cargas' },
  );
}

export const rota = () => screen.getByTestId('rota').props.children as string;
export const caminho = () => rota().split('|')[0];

/** Espera a sessão restaurada (a área só consulta a API depois disso). */
export async function aguardarSessao() {
  await waitFor(() => expect(rota().split('|')[1]).toBe('autenticado'));
}

/** A lista é um View com `role="list"`: confere-se pelo `role` e pelo rótulo do próprio elemento. */
export const listaDeCargas = () =>
  screen.container.queryAll(
    (el) => el.props.role === 'list' && el.props['aria-label'] === 'Cargas próximas',
  );

export async function aguardarLista() {
  await waitFor(() => expect(listaDeCargas().length).toBeGreaterThan(0));
}

/** Os `article` de cada carga, na ordem da tela. */
export const cartoes = () => screen.container.queryAll((el) => el.props.role === 'article');

/** Os títulos (h2) de cada carga, na ordem da tela. */
export const titulosDosCartoes = () =>
  screen
    .getAllByRole('heading')
    .filter((h) => h.props['aria-level'] === 2)
    .map((h) => h.props.children);

/** Primeiro link com o nome dado (o expo-router repete o elemento em mais de um nível do host). */
export function linkPorNome(nome: string) {
  const [link] = screen.getAllByRole('link', { name: nome });
  if (!link) throw new Error(`link "${nome}" não encontrado`);
  return link;
}
