// Apoio aos testes de "Minhas cargas" (card 020): abre a tela real dentro da área protegida da
// empresa, com a sessão restaurada, e oferece consultas pelo que a pessoa vê. Não entra no app.
// Os arquivos de teste que usam isto mockam `@/lib/armazenamento` por conta própria (jest.mock).
import { QueryClientProvider } from '@tanstack/react-query';
import { Slot, usePathname } from 'expo-router';
import { renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';
import { Text } from 'react-native';

import { SessaoProvider } from '@/state/sessao/SessaoProvider';
import { useSessao } from '@/state/sessao/useSessao';
import { TemaContext } from '@/state/tema/TemaProvider';
import { valorDoTema } from '@/test-utils/renderComTema';

import { servidor, urlMock } from '../../mocks/node';
import { cargasDaEmpresaMock } from '../../mocks/fixtures/cargas';
import { criarClienteDeTeste } from '../../mocks/utils-teste';
import LayoutEmpresa from '../app/empresa/_layout';
import MinhasCargas from '../app/empresa/cargas/index';

/** Mostra o caminho e o estado da sessão para o teste conferir. */
function Sonda() {
  const { estado } = useSessao();
  const pathname = usePathname();
  return <Text testID="rota">{`${pathname}|${estado}`}</Text>;
}

/** Abre `/empresa/cargas` com a sessão restaurada pelo token gravado antes. */
export async function abrirMinhasCargas() {
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
      'empresa/cargas/index': MinhasCargas,
    },
    { initialUrl: '/empresa/cargas' },
  );
}

export const rota = () => screen.getByTestId('rota').props.children as string;
export const caminho = () => rota().split('|')[0];

/** Espera a sessão restaurada (a área só mostra a lista depois disso). */
export async function aguardarSessao() {
  await waitFor(() => expect(rota().split('|')[1]).toBe('autenticado'));
}

/**
 * A lista é um View com `role="list"` (não acessível por padrão, então `getByRole` não a acha):
 * confere-se pelo `role` e pelo rótulo do próprio elemento.
 */
export const listaDeCargas = () =>
  screen.container.queryAll(
    (el) => el.props.role === 'list' && el.props['aria-label'] === 'Cargas publicadas',
  );

export async function aguardarLista() {
  await waitFor(() => expect(listaDeCargas().length).toBeGreaterThan(0));
}

/**
 * Primeiro link com o nome dado. O expo-router entrega o mesmo elemento em mais de um nível do
 * host, então `getByRole` acusa "multiple elements"; o primeiro é o próprio link.
 */
export function linkPorNome(nome: string) {
  const [link] = screen.getAllByRole('link', { name: nome });
  if (!link) throw new Error(`link "${nome}" não encontrado`);
  return link;
}

/** Conta as chamadas a `GET /cargas/minhas` e responde a lista padrão do mock. */
export function contarLeituras() {
  const contador = { chamadas: 0 };
  servidor.use(
    http.get(urlMock('/cargas/minhas'), () => {
      contador.chamadas += 1;
      return HttpResponse.json({ cargas: cargasDaEmpresaMock });
    }),
  );
  return contador;
}
