import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { buscarEu, entrarNaApi } from '@/api/sessao';
import { configurarCliente } from '@/api/cliente';
import type { Usuario } from '@/api/tipos';
import { rotaDeEntrada, rotaInicial, type AvisoSessao } from '@/lib/areas';
import { apagar, CHAVES, gravar, ler } from '@/lib/armazenamento';
import { ErroApi } from '@/lib/erros';

import { SessaoContext, type EstadoSessao, type ValorSessao } from './SessaoContext';

/**
 * Sessão do app (ADR 0006). Vai dentro do `QueryClientProvider` (ela limpa o cache ao sair).
 *
 * O primeiro render é sempre `restaurando`, igual ao HTML estático: nenhum `localStorage` é lido
 * durante a renderização. Em efeito ela lê o token e chama `GET /eu`:
 * - 200: `autenticado`; sem token: `anonimo`;
 * - 401: o cliente HTTP avisa (`aoSessaoExpirada`) e a sessão acaba com `sessao-expirada`;
 * - 404 (usuário apagado): `conta-nao-encontrada`;
 * - rede ou 5xx: `anonimo` com o aviso `sem-conexao` e o token guardado, para a próxima abertura
 *   tentar de novo.
 *
 * `servidorPronto` (portão do servidor, card 014): a restauração só começa quando `GET /saude`
 * respondeu, para o Render ainda acordando não mandar o usuário logado ao login. Fica `restaurando`
 * até lá. Sem o portão (testes), o padrão é `true`.
 */
export function SessaoProvider({
  children,
  servidorPronto = true,
}: {
  children: ReactNode;
  servidorPronto?: boolean;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoSessao>('restaurando');
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [aviso, setAviso] = useState<AvisoSessao | null>(null);
  // O cliente HTTP lê o token por aqui: precisa ser síncrono e não pode esperar um re-render.
  const tokenRef = useRef<string | null>(null);
  // Cada entrar/sair abre uma "época": a restauração que ainda estava no ar é ignorada.
  const epocaRef = useRef(0);

  const sair = useCallback(
    async (motivo?: AvisoSessao) => {
      epocaRef.current += 1;
      tokenRef.current = null;
      await Promise.all([apagar(CHAVES.token), apagar(CHAVES.disponibilidadeAtiva)]);
      queryClient.clear();
      setUsuario(null);
      setAviso(motivo ?? null);
      setEstado('anonimo');
      router.replace(rotaDeEntrada(motivo));
    },
    [queryClient, router],
  );

  // Os efeitos abaixo rodam uma vez e chamam sempre o `sair` mais recente.
  const sairRef = useRef(sair);
  useEffect(() => {
    sairRef.current = sair;
  }, [sair]);

  const entrar = useCallback(
    async (email: string, senha: string) => {
      const { token } = await entrarNaApi(email, senha);
      epocaRef.current += 1;
      tokenRef.current = token;
      let dados: Usuario;
      try {
        dados = (await buscarEu()).usuario;
      } catch (erro) {
        tokenRef.current = null;
        throw erro;
      }
      await gravar(CHAVES.token, token);
      // Nada da conta anterior (ou de uma tentativa sem sair) pode aparecer na nova.
      queryClient.clear();
      setUsuario(dados);
      setAviso(null);
      setEstado('autenticado');
      router.replace(rotaInicial(dados.tipo));
    },
    [queryClient, router],
  );

  // Registra a sessão no cliente HTTP (evita import circular entre api e state, ADR 0005).
  useEffect(() => {
    configurarCliente({
      obterToken: () => tokenRef.current,
      aoSessaoExpirada: () => {
        void sairRef.current('sessao-expirada');
      },
    });
  }, []);

  // Restaura a sessão ao abrir o app (depois que o servidor respondeu).
  useEffect(() => {
    if (!servidorPronto) return;
    const epoca = epocaRef.current;
    let cancelado = false;
    const obsoleto = () => cancelado || epoca !== epocaRef.current;

    async function restaurar() {
      const token = await ler(CHAVES.token);
      if (obsoleto()) return;
      if (token === null) {
        setEstado('anonimo');
        return;
      }
      tokenRef.current = token;
      try {
        const { usuario: dados } = await buscarEu();
        if (obsoleto()) return;
        setUsuario(dados);
        setEstado('autenticado');
      } catch (erro) {
        // 401: o cliente HTTP já chamou `sair` e a época mudou (obsoleto). Falta 404 e falha.
        if (obsoleto()) return;
        if (erro instanceof ErroApi && erro.status === 404) {
          await sairRef.current('conta-nao-encontrada');
          return;
        }
        // Rede ou 5xx: o token continua guardado (a próxima abertura tenta de novo), mas o
        // usuário precisa saber por que foi ao login.
        tokenRef.current = null;
        setAviso('sem-conexao');
        setEstado('anonimo');
      }
    }

    void restaurar();
    return () => {
      cancelado = true;
    };
  }, [servidorPronto]);

  const valor = useMemo<ValorSessao>(
    () => ({ estado, usuario, aviso, entrar, sair }),
    [estado, usuario, aviso, entrar, sair],
  );

  return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>;
}
