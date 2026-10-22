import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useMinhasDisponibilidades } from '@/api/disponibilidades';
import type { RespostaMinhasDisponibilidades } from '@/api/tipos';
import { useCasca } from '@/components/organisms/useCasca';
import { CHAVES, gravar, ler } from '@/lib/armazenamento';
import {
  escolherAtiva,
  lerEscolhaSalva,
  serializarEscolha,
  type Disponibilidade,
  type EscolhaSalva,
} from '@/lib/disponibilidadeAtiva';
import { ErroApi } from '@/lib/erros';

import {
  DisponibilidadeAtivaContext,
  type ValorDisponibilidadeAtiva,
} from './DisponibilidadeAtivaContext';

// `setTimeout` guarda o atraso em 32 bits: acima disso dispararia na hora.
const ATRASO_MAXIMO_MS = 2_147_000_000;
// Folga para o relógio já estar além do prazo quando o aviso disparar.
const FOLGA_MS = 50;

const LISTA_VAZIA: readonly Disponibilidade[] = [];

/** O que o provider precisa saber da consulta `GET /disponibilidades/minhas`. */
interface ResultadoConsulta {
  data: RespostaMinhasDisponibilidades | undefined;
  error: unknown;
  isError: boolean;
  isPending: boolean;
  isFetching: boolean;
  refetch: () => Promise<unknown>;
}

// Sem consulta (sessão ainda não autenticada como motorista): nada foi lido.
const SEM_CONSULTA: ResultadoConsulta = {
  data: undefined,
  error: null,
  isError: false,
  isPending: true,
  isFetching: false,
  refetch: () => Promise.resolve(),
};

/** A rota `GET /disponibilidades/minhas` ainda não existe no backend: 404 liga o plano B. */
function rotaInexistente(erro: unknown): boolean {
  return erro instanceof ErroApi && erro.status === 404;
}

/**
 * Faz a consulta e entrega o resultado ao provider. Só existe montado com o motorista autenticado
 * (ADR 0004): fora disso nenhuma consulta é criada, e ao sair o cache limpo continua vazio.
 */
function ConsultaDasDisponibilidades({
  aoMudar,
}: {
  aoMudar: (resultado: ResultadoConsulta) => void;
}) {
  const { data, error, isError, isPending, isFetching, refetch } = useMinhasDisponibilidades();

  useEffect(() => {
    aoMudar({ data, error, isError, isPending, isFetching, refetch });
  }, [aoMudar, data, error, isError, isPending, isFetching, refetch]);

  useEffect(() => () => aoMudar(SEM_CONSULTA), [aoMudar]);

  return null;
}

/**
 * Disponibilidade ativa do motorista (MVP-11, D-PO-03). Vai no layout da área do motorista, dentro
 * do `AreaProtegida`: só consulta a API com a sessão autenticada no perfil certo (ADR 0004).
 *
 * Regra: a ativa é a escolhida (guardada em `backhaul.disponibilidadeAtiva`), se ainda estiver
 * aberta e no prazo; senão a mais recente aberta e no prazo; senão `null`.
 *
 * Plano B (`GET /disponibilidades/minhas` ainda não existe): se a API responder 404, a lista passa
 * a ter uma única entrada, a disponibilidade publicada neste aparelho (gravada por
 * `registrarPublicada`, card 023), sem mostrar erro técnico. Quando a rota existir, a lista real
 * entra sozinha e nada nas telas muda.
 *
 * O aparelho só é lido em efeito (nunca no render, ADR 0006), então o primeiro render é
 * `carregando`, igual ao HTML estático.
 */
export function DisponibilidadeAtivaProvider({ children }: { children: ReactNode }) {
  const { habilitado } = useCasca();
  const [consulta, setConsulta] = useState<ResultadoConsulta>(SEM_CONSULTA);

  const [salva, setSalva] = useState<EscolhaSalva | null>(null);
  const [lida, setLida] = useState(false);
  // O relógio anda quando a ativa vence, para a regra escolher outra (ou nenhuma) sem recarregar.
  const [relogio, setRelogio] = useState(() => Date.now());

  // A escolha lida pode chegar depois de um `definirAtiva` muito rápido: a mais nova vence.
  const versaoRef = useRef(0);

  useEffect(() => {
    let cancelado = false;
    void ler(CHAVES.disponibilidadeAtiva).then((texto) => {
      if (!cancelado && versaoRef.current === 0) setSalva(lerEscolhaSalva(texto));
      if (!cancelado) setLida(true);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  const guardar = useCallback((escolha: EscolhaSalva) => {
    versaoRef.current += 1;
    setSalva(escolha);
    void gravar(CHAVES.disponibilidadeAtiva, serializarEscolha(escolha));
  }, []);

  const definirAtiva = useCallback(
    (id: string) => {
      guardar({
        id,
        // A cópia só vale para a mesma disponibilidade; trocar para outra a descarta.
        ...(salva?.publicada?.id === id ? { publicada: salva.publicada } : null),
      });
    },
    [guardar, salva],
  );

  const registrarPublicada = useCallback(
    (disponibilidade: Disponibilidade) => {
      guardar({ id: disponibilidade.id, publicada: disponibilidade });
    },
    [guardar],
  );

  const modoLocal = consulta.isError && rotaInexistente(consulta.error);
  const erro = consulta.isError && !modoLocal ? consulta.error : null;

  const disponibilidades = useMemo<readonly Disponibilidade[]>(() => {
    if (consulta.data) return consulta.data.disponibilidades;
    return salva?.publicada ? [salva.publicada] : LISTA_VAZIA;
  }, [consulta.data, salva]);

  const carregando = !lida || consulta.isPending;
  const ativa = useMemo(
    () =>
      carregando ? null : escolherAtiva(disponibilidades, salva?.id ?? null, new Date(relogio)),
    [carregando, disponibilidades, salva, relogio],
  );

  const venceEm = ativa?.expira_em;
  useEffect(() => {
    if (venceEm === undefined) return;
    const atraso = Date.parse(venceEm) - Date.now() + FOLGA_MS;
    if (!Number.isFinite(atraso) || atraso <= 0) return;
    const cronometro = setTimeout(() => setRelogio(Date.now()), Math.min(atraso, ATRASO_MAXIMO_MS));
    return () => clearTimeout(cronometro);
  }, [venceEm]);

  const atualizar = consulta.refetch;
  const valor = useMemo<ValorDisponibilidadeAtiva>(
    () => ({
      ativa,
      carregando,
      definirAtiva,
      registrarPublicada,
      disponibilidades,
      origem: consulta.data ? 'api' : 'local',
      erro,
      atualizar,
      atualizando: consulta.isFetching,
    }),
    [
      ativa,
      carregando,
      definirAtiva,
      registrarPublicada,
      disponibilidades,
      consulta.data,
      erro,
      atualizar,
      consulta.isFetching,
    ],
  );

  return (
    <DisponibilidadeAtivaContext.Provider value={valor}>
      {habilitado ? <ConsultaDasDisponibilidades aoMudar={setConsulta} /> : null}
      {children}
    </DisponibilidadeAtivaContext.Provider>
  );
}
