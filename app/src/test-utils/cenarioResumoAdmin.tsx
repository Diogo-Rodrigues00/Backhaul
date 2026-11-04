// Apoio aos testes do resumo do admin (card 040): abre a tela real dentro da área protegida do
// administrador, com a sessão restaurada. Não entra no app. Os arquivos de teste que usam isto
// mockam `@/lib/armazenamento` por conta própria (jest.mock).
import { QueryClientProvider } from '@tanstack/react-query';
import { Slot, usePathname } from 'expo-router';
import { renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';
import { Text } from 'react-native';

import type { ResumoAdmin } from '@/api/tipos';
import { SessaoProvider } from '@/state/sessao/SessaoProvider';
import { useSessao } from '@/state/sessao/useSessao';
import { TemaContext } from '@/state/tema/TemaProvider';
import { valorDoTema } from '@/test-utils/renderComTema';

import { resumoAdminMock } from '../../mocks/fixtures/admin';
import { servidor, urlMock } from '../../mocks/node';
import { criarClienteDeTeste } from '../../mocks/utils-teste';
import LayoutAdmin from '../app/admin/_layout';
import Administrador from '../app/admin/index';

function Sonda() {
  const { estado } = useSessao();
  const pathname = usePathname();
  return <Text testID="rota">{`${pathname}|${estado}`}</Text>;
}

/** Abre `/admin` com a sessão restaurada pelo token gravado antes. */
export async function abrirResumoAdmin() {
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
      'admin/_layout': LayoutAdmin,
      'admin/index': Administrador,
    },
    { initialUrl: '/admin' },
  );
}

export const rota = () => screen.getByTestId('rota').props.children as string;
export const caminho = () => rota().split('|')[0];

/** Espera a sessão restaurada (a área só consulta a API depois disso). */
export async function aguardarSessao() {
  await waitFor(() => expect(rota().split('|')[1]).toBe('autenticado'));
}

/** Espera os grupos do resumo (o h2 "Pessoas" só existe com os dados prontos). */
export async function aguardarResumo() {
  await screen.findByRole('heading', { name: 'Pessoas' });
}

/** Responde `GET /admin/resumo` com os valores dados e conta as chamadas. */
export function responderResumo(resumo: ResumoAdmin = resumoAdminMock) {
  const contador = { chamadas: 0 };
  servidor.use(
    http.get(urlMock('/admin/resumo'), () => {
      contador.chamadas += 1;
      return HttpResponse.json({ resumo });
    }),
  );
  return contador;
}
