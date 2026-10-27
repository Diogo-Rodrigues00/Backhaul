import { useRouter } from 'expo-router';
import { useEffect, useMemo, type ReactNode } from 'react';

import { rotaDeEntrada, rotaInicial, rotuloDoPerfil, type TipoPerfil } from '@/lib/areas';
import { useSessao } from '@/state/sessao/useSessao';

import { Cabecalho } from './Cabecalho';
import { itensDaArea } from './itensDaArea';
import { CascaContext, type Casca } from './useCasca';

export interface PropsAreaProtegida {
  /** Perfil dono da área (`empresa/`, `motorista/`, `admin/`). */
  area: TipoPerfil;
  children: ReactNode;
}

/**
 * Guarda de uma área (ADR 0002 e 0006). Entra no `_layout.tsx` da pasta e entrega às telas o
 * cabeçalho completo, as abas e `habilitado` (`useCasca`).
 *
 * A guarda é só no cliente e só em efeito, depois de restaurar a sessão: o layout nunca redireciona
 * durante a renderização estática, então o HTML de toda rota protegida tem cabeçalho e `h1`.
 * - `anonimo` abre `/entrar` (com o aviso, se a sessão acabou sem o usuário pedir);
 * - perfil errado vai para a área do próprio perfil.
 * Autenticado em outra área, as telas desta nem aparecem enquanto o redirecionamento acontece.
 */
export function AreaProtegida({ area, children }: PropsAreaProtegida) {
  const { estado, usuario, aviso, sair } = useSessao();
  const router = useRouter();
  const perfilCerto = estado === 'autenticado' && usuario?.tipo === area;
  const perfilErrado = estado === 'autenticado' && usuario !== null && usuario.tipo !== area;
  const tipoDoUsuario = usuario?.tipo ?? null;

  useEffect(() => {
    if (estado === 'anonimo') {
      router.replace(rotaDeEntrada(aviso));
    } else if (tipoDoUsuario !== null && tipoDoUsuario !== area && estado === 'autenticado') {
      router.replace(rotaInicial(tipoDoUsuario));
    }
  }, [estado, aviso, tipoDoUsuario, area, router]);

  const casca = useMemo<Casca>(() => {
    const itens = itensDaArea(area);
    return {
      cabecalho: (
        <Cabecalho
          variante="completo"
          itens={itens}
          usuario={{ nome: usuario?.nome ?? '', perfil: rotuloDoPerfil(usuario?.tipo ?? area) }}
          aoSair={() => {
            void sair();
          }}
        />
      ),
      abas: itens.length > 0 ? itens : undefined,
      habilitado: perfilCerto,
    };
  }, [area, usuario, perfilCerto, sair]);

  return (
    <CascaContext.Provider value={casca}>{perfilErrado ? null : children}</CascaContext.Provider>
  );
}
