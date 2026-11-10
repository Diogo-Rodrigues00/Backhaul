// Apoio aos testes das listas do admin (card 041): abre `/admin/fretes` ou `/admin/usuarios` dentro da
// área protegida do administrador, com a sessão restaurada. Não entra no app. Os arquivos de teste que
// usam isto mockam `@/lib/armazenamento` por conta própria (jest.mock).
import { QueryClientProvider } from '@tanstack/react-query';
import { Slot, usePathname } from 'expo-router';
import { renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';
import { Text } from 'react-native';

import type { FreteAdmin, UsuarioAdmin } from '@/api/tipos';
import { SessaoProvider } from '@/state/sessao/SessaoProvider';
import { useSessao } from '@/state/sessao/useSessao';
import { TemaContext } from '@/state/tema/TemaProvider';
import { valorDoTema } from '@/test-utils/renderComTema';

import { fretesAdminMock, usuariosAdminMock } from '../../mocks/fixtures/admin';
import { servidor, urlMock } from '../../mocks/node';
import { criarClienteDeTeste } from '../../mocks/utils-teste';
import LayoutAdmin from '../app/admin/_layout';
import FretesDoAdministrador from '../app/admin/fretes';
import Administrador from '../app/admin/index';
import UsuariosDoAdministrador from '../app/admin/usuarios';

function Sonda() {
  const { estado } = useSessao();
  const pathname = usePathname();
  return <Text testID="rota">{`${pathname}|${estado}`}</Text>;
}

/** Abre a lista pedida com a sessão restaurada pelo token gravado antes. */
export async function abrirListaAdmin(caminhoInicial: '/admin/fretes' | '/admin/usuarios') {
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
      'admin/fretes': FretesDoAdministrador,
      'admin/usuarios': UsuariosDoAdministrador,
    },
    { initialUrl: caminhoInicial },
  );
}

export const rota = () => screen.getByTestId('rota').props.children as string;
export const caminho = () => rota().split('|')[0];

/** Espera a sessão restaurada (a área só consulta a API depois disso). */
export async function aguardarSessao() {
  await waitFor(() => expect(rota().split('|')[1]).toBe('autenticado'));
}

export function responderFretes(fretes: readonly object[] = fretesAdminMock) {
  const contador = { chamadas: 0 };
  servidor.use(
    http.get(urlMock('/admin/fretes'), () => {
      contador.chamadas += 1;
      return HttpResponse.json({ fretes });
    }),
  );
  return contador;
}

export function responderUsuarios(usuarios: readonly object[] = usuariosAdminMock) {
  const contador = { chamadas: 0 };
  servidor.use(
    http.get(urlMock('/admin/usuarios'), () => {
      contador.chamadas += 1;
      return HttpResponse.json({ usuarios });
    }),
  );
  return contador;
}

/** `n` fretes gerados a partir do primeiro da fixture, para o aviso de limite. */
export function gerarFretes(n: number): FreteAdmin[] {
  return Array.from({ length: n }, (_, i) => ({
    ...fretesAdminMock[0]!,
    id: `ffffffff-0000-4000-8000-${String(i).padStart(12, '0')}`,
    tipo_carga: `Carga ${i + 1}`,
  }));
}

/** `n` usuários gerados a partir do segundo da fixture, para o aviso de limite. */
export function gerarUsuarios(n: number): UsuarioAdmin[] {
  return Array.from({ length: n }, (_, i) => ({
    ...usuariosAdminMock[1]!,
    id: `eeeeeeee-0000-4000-8000-${String(i).padStart(12, '0')}`,
    nome: `Usuário ${i + 1}`,
    email: `usuario${i + 1}@mock.test`,
  }));
}
