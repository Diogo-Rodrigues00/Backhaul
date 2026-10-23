// Estado das propostas do motorista em "Cargas próximas" (card 025, MVP-13, D-PO-05): quais cargas
// já têm proposta pendente ou contraproposta, o pedido em andamento e o desfecho do envio. Vive na
// tela (não em componente) porque fala com a API (ADR 0003). Carregado junto do corpo da tela.
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { View } from 'react-native';

import { useFazerProposta } from '@/api/propostas';
import type { RespostaMinhasPropostas } from '@/api/tipos';
import type { AvisoDaProposta } from '@/components/organisms/AcoesProposta';
import type { PedidoProposta } from '@/components/organisms/FormularioProposta';
import { anunciar } from '@/lib/a11y';
import { lerErroDaProposta, type DesfechoErroProposta } from '@/lib/fazerProposta';
import {
  lerPropostasEnviadas,
  registrarPropostaEnviada,
  type PropostaEnviada,
} from '@/lib/propostasEnviadas';

const SEM_CARGAS: ReadonlySet<string> = new Set();
const adicionar = (conjunto: ReadonlySet<string>, id: string): ReadonlySet<string> =>
  new Set(conjunto).add(id);

export interface EntradaPropostas {
  /** `GET /propostas/minhas` (proposta 4a); `undefined` enquanto não chegou ou se a rota falhou. */
  daApi: RespostaMinhasPropostas | undefined;
  /** `chamado_disp_id`: a disponibilidade ativa. */
  disponibilidadeId: string | undefined;
  /** Recarrega a lista de cargas e a de propostas (carga que saiu do ar). */
  recarregarListas: () => unknown;
}

export interface DialogoDaProposta {
  pedido: PedidoProposta | null;
  aberto: boolean;
  /** Montar o diálogo só depois do primeiro pedido (ele é baixado sob demanda). */
  montado: boolean;
  enviando: boolean;
  /** Falha que se resolve tentando de novo (400, 5xx, rede): fica dentro do diálogo. */
  erro: string | undefined;
  aoEnviar: (valor?: number) => Promise<void>;
  aoFechar: () => void;
  refRetorno: RefObject<unknown>;
}

/**
 * - `pendentes`: cargas que mostram "Proposta enviada" (sem botões).
 * - `comContraproposta`: cargas sem a opção de contraproposta (qualquer status, D-PO-05).
 * A lista da API prevalece; sem ela, vale o que este aparelho guardou. O que acabou de ser enviado
 * (ou descoberto pelo 409) vale já, sem esperar a próxima leitura.
 */
export function usePropostasDoMotorista({
  daApi,
  disponibilidadeId,
  recarregarListas,
}: EntradaPropostas) {
  const criar = useFazerProposta();

  const [guardadas, setGuardadas] = useState<readonly PropostaEnviada[]>([]);
  // Só depois da primeira leitura do aparelho dá para saber se a carga já recebeu proposta: antes
  // disso, sem a rota 4a, um cartão já proposto mostraria os botões por alguns milissegundos.
  const [guardadasLidas, setGuardadasLidas] = useState(false);
  const lerGuardadas = useCallback(async () => {
    setGuardadas(await lerPropostasEnviadas());
    setGuardadasLidas(true);
  }, []);
  useEffect(() => {
    let cancelado = false;
    void lerPropostasEnviadas().then((lista) => {
      if (cancelado) return;
      setGuardadas(lista);
      setGuardadasLidas(true);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  const [enviadasAgora, setEnviadasAgora] = useState<ReadonlySet<string>>(SEM_CARGAS);
  const [contrapropostasAgora, setContrapropostasAgora] = useState<ReadonlySet<string>>(SEM_CARGAS);

  const pendentes = useMemo(() => {
    const base = daApi
      ? daApi.propostas.filter((p) => p.status === 'pendente').map((p) => p.carga.id)
      : guardadas.map((p) => p.cargaId);
    return new Set([...base, ...enviadasAgora]);
  }, [daApi, guardadas, enviadasAgora]);

  // D-PO-05: contraproposta em qualquer status (pendente, aceita, recusada) esgota a única.
  const comContraproposta = useMemo(() => {
    const base = daApi
      ? daApi.propostas.filter((p) => p.tipo === 'contraproposta').map((p) => p.carga.id)
      : guardadas.filter((p) => p.tipo === 'contraproposta').map((p) => p.cargaId);
    return new Set([...base, ...contrapropostasAgora]);
  }, [daApi, guardadas, contrapropostasAgora]);

  const [pedido, setPedido] = useState<PedidoProposta | null>(null);
  const [aberto, setAberto] = useState(false);
  const [jaPediu, setJaPediu] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const [avisos, setAvisos] = useState<Readonly<Record<string, AvisoDaProposta>>>({});
  const [avisoDaCarga, setAvisoDaCarga] = useState<string | undefined>();

  // Para onde o foco volta ao fechar o diálogo: o botão que abriu, o "Proposta enviada" do cartão ou
  // o aviso da lista. É resolvido só ao fechar, porque o marcador e o aviso ainda não existem ao enviar.
  const alvoDoRetorno = useRef<() => unknown>(() => null);
  const refRetorno = useMemo<RefObject<unknown>>(
    () => ({
      get current() {
        return alvoDoRetorno.current();
      },
    }),
    [],
  );
  const marcadores = useRef(new Map<string, View>());
  const refAvisoDaCarga = useRef<View>(null);

  /** `ref` do marcador "Proposta enviada" do cartão da carga. */
  const registrarMarcador = useCallback((cargaId: string, no: View | null) => {
    if (no) marcadores.current.set(cargaId, no);
    else marcadores.current.delete(cargaId);
  }, []);

  const abrir = (novo: PedidoProposta, origem: View | null) => {
    alvoDoRetorno.current = () => origem;
    setErro(undefined);
    // Uma nova tentativa limpa o aviso anterior, menos o que explica a contraproposta que já sumiu.
    setAvisos((atuais) => {
      if (atuais[novo.cargaId] === undefined || comContraproposta.has(novo.cargaId)) return atuais;
      const { [novo.cargaId]: _antigo, ...resto } = atuais;
      return resto;
    });
    setPedido(novo);
    setJaPediu(true);
    setAberto(true);
  };

  const enviada = async (feito: PedidoProposta) => {
    const { cargaId, tipo } = feito;
    setEnviadasAgora((atuais) => adicionar(atuais, cargaId));
    if (tipo === 'contraproposta') setContrapropostasAgora((atuais) => adicionar(atuais, cargaId));
    alvoDoRetorno.current = () => marcadores.current.get(cargaId) ?? null;
    anunciar('Proposta enviada');
    // Guarda no aparelho (plano B de D-PO-05) antes de fechar; falha de armazenamento nunca desfaz o envio.
    try {
      await registrarPropostaEnviada(cargaId, tipo);
      await lerGuardadas();
    } catch {
      // A proposta já foi aceita pela API; só o lembrete local falhou.
    }
  };

  const falhou = (
    feito: PedidoProposta,
    desfecho: Exclude<DesfechoErroProposta, 'outro'>,
    mensagem: string,
  ) => {
    anunciar(mensagem);
    if (desfecho === 'carga-indisponivel') {
      // A carga saiu do ar (fechada, cancelada, vencida): avisa e recarrega a lista.
      alvoDoRetorno.current = () => refAvisoDaCarga.current;
      setAvisoDaCarga(mensagem);
      void Promise.all([recarregarListas(), lerGuardadas()]);
      return;
    }
    if (desfecho === 'contraproposta-repetida') {
      setContrapropostasAgora((atuais) => adicionar(atuais, feito.cargaId));
    }
    setAvisos((atuais) => ({
      ...atuais,
      [feito.cargaId]: { mensagem, linkDisponibilidades: desfecho === 'disponibilidade' },
    }));
  };

  const aoEnviar = async (valor?: number) => {
    if (pedido === null || disponibilidadeId === undefined) return;
    setErro(undefined);
    try {
      await criar.mutateAsync({
        chamado_carga_id: pedido.cargaId,
        chamado_disp_id: disponibilidadeId,
        tipo: pedido.tipo,
        ...(valor === undefined ? null : { valor_proposto: valor }),
      });
    } catch (falha) {
      const lido = lerErroDaProposta(falha);
      if (lido.desfecho === 'outro') {
        setErro(lido.mensagem);
        return;
      }
      falhou(pedido, lido.desfecho, lido.mensagem);
      setAberto(false);
      return;
    }
    await enviada(pedido);
    setAberto(false);
  };

  const dialogo: DialogoDaProposta = {
    pedido,
    aberto,
    montado: jaPediu,
    enviando: criar.isPending,
    erro,
    aoEnviar,
    aoFechar: () => setAberto(false),
    refRetorno,
  };

  return {
    pendentes,
    comContraproposta,
    avisos,
    avisoDaCarga,
    refAvisoDaCarga,
    registrarMarcador,
    abrir,
    dialogo,
    lerGuardadas,
    guardadasLidas,
  };
}
