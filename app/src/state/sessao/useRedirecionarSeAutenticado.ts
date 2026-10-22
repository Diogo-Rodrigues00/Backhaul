import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { rotaInicial } from '@/lib/areas';

import { useSessao } from './useSessao';

/**
 * Para as rotas públicas (`/`, `/entrar`, `/cadastro/*`): com sessão `autenticado`, abre a área do
 * perfil. Em efeito, depois de restaurar a sessão: o HTML estático e a hidratação não mudam.
 */
export function useRedirecionarSeAutenticado(): void {
  const { estado, usuario } = useSessao();
  const router = useRouter();

  useEffect(() => {
    if (estado === 'autenticado' && usuario !== null) {
      router.replace(rotaInicial(usuario.tipo));
    }
  }, [estado, usuario, router]);
}
