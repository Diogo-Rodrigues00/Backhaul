// Apoio aos testes de "Minhas disponibilidades" (card 022): abre a tela real dentro da área
// protegida do motorista, com a sessão restaurada, e oferece consultas pelo que a pessoa vê. Não
// entra no app. Os arquivos de teste que usam isto mockam `@/lib/armazenamento` (jest.mock).
import { QueryClientProvider } from '@tanstack/react-query';
import { Slot, usePathname } from 'expo-router';
import { renderRouter, screen, waitFor } from 'expo-router/testing-library';
import type { ReactElement } from 'react';
import { Text } from 'react-native';

import { SessaoProvider } from '@/state/sessao/SessaoProvider';
import { useSessao } from '@/state/sessao/useSessao';
import { useDisponibilidadeAtiva } from '@/state/disponibilidade-ativa/useDisponibilidadeAtiva';
import { TemaContext } from '@/state/tema/TemaProvider';
import { valorDoTema } from '@/test-utils/renderComTema';

import { criarClienteDeTeste } from '../../mocks/utils-teste';
import LayoutMotorista from '../app/motorista/_layout';
import MinhasDisponibilidades from '../app/motorista/disponibilidades/index';

/** Mostra o caminho e o estado da sessão para o teste conferir. */
function Sonda() {
  const { estado } = useSessao();
  const pathname = usePathname();
  return <Text testID="rota">{`${pathname}|${estado}`}</Text>;
}

/**
 * Faz o papel das telas que consomem a ativa (cargas próximas e proposta): mostra o que
 * `useDisponibilidadeAtiva()` entrega, em texto, no `testID="ativa"`.
 */
export function SondaDaAtiva() {
  const { ativa, carregando } = useDisponibilidadeAtiva();
  const texto = carregando
    ? 'carregando'
    : ativa === null
      ? 'nenhuma'
      : [ativa.id, ativa.local.lat, ativa.local.lng, ativa.raio_busca_km, ativa.urgencia].join('|');
  return <Text testID="ativa">{texto}</Text>;
}

/** Abre `/motorista/disponibilidades` com a sessão restaurada pelo token gravado antes. */
export async function abrirMinhasDisponibilidades(Tela: () => ReactElement = Completa) {
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
      'motorista/disponibilidades/index': Tela,
    },
    { initialUrl: '/motorista/disponibilidades' },
  );
}

/** A tela real mais a sonda da ativa. */
function Completa() {
  return (
    <>
      <SondaDaAtiva />
      <MinhasDisponibilidades />
    </>
  );
}

export const rota = () => screen.getByTestId('rota').props.children as string;
export const caminho = () => rota().split('|')[0];
export const textoDaAtiva = () => screen.getByTestId('ativa').props.children as string;

/** Espera a sessão restaurada (a área só mostra a lista depois disso). */
export async function aguardarSessao() {
  await waitFor(() => expect(rota().split('|')[1]).toBe('autenticado'));
}

/** A lista é um View com `role="list"`: confere-se pelo `role` e pelo rótulo do próprio elemento. */
export const listaDeDisponibilidades = () =>
  screen.container.queryAll(
    (el) => el.props.role === 'list' && el.props['aria-label'] === 'Disponibilidades publicadas',
  );

export async function aguardarLista() {
  await waitFor(() => expect(listaDeDisponibilidades().length).toBeGreaterThan(0));
}

/** Os `article` de cada disponibilidade, na ordem da tela. */
export const cartoes = () => screen.container.queryAll((el) => el.props.role === 'article');

/** Os títulos (h2) de cada disponibilidade, na ordem da tela. */
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
