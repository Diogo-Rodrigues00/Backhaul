import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View, type ViewStyle } from 'react-native';

import { useMinhasCargas } from '@/api/cargas';
import { usePropostasDaCarga, useResponderProposta } from '@/api/propostas';
import type { AcaoResposta } from '@/api/tipos';
import { Link } from '@/components/atoms/Link';
import { Titulo } from '@/components/atoms/Titulo';
import { Banner } from '@/components/molecules/Banner';
import { EstadoVazio } from '@/components/molecules/EstadoVazio';
import { ResumoCarga } from '@/components/molecules/ResumoCarga';
import { CartaoProposta } from '@/components/organisms/CartaoProposta';
import { DialogoConfirmacao } from '@/components/organisms/DialogoConfirmacao';
import { useCasca } from '@/components/organisms/useCasca';
import { TemplateLista, type EstadoLista } from '@/components/templates/TemplateLista';
import { useAnunciarNovidades } from '@/hooks/useAnunciarNovidades';
import { anunciar } from '@/lib/a11y';
import { rotuloDoLocal } from '@/lib/cidades';
import { ErroApi, MENSAGEM_FALHA } from '@/lib/erros';
import { formatarMoeda, type NumeroEntrada } from '@/lib/formatacao';
import { descreverNovidades, idsNovos } from '@/lib/novidadesPropostas';
import { statusEfetivo } from '@/lib/vencimento';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

// Título e frase fixos: estão no HTML estático (sem `id` no build) e são o LCP (ADR 0011).
const TITULO = 'Propostas da carga';
const DESCRICAO = 'Veja quem quer levar a sua carga e aceite ou recuse cada proposta.';
const LOCAL_SEM_CIDADE = 'Local informado';

interface Pedido {
  propostaId: string;
  motorista: string;
  valor: NumeroEntrada;
  acao: AcaoResposta;
}

function criarEstilos({ border, radius, space }: TemaVisual) {
  return {
    conteudo: { gap: space[5] } satisfies ViewStyle,
    resumo: {
      padding: space[5],
      borderWidth: border.width,
      borderRadius: radius.lg,
    } satisfies ViewStyle,
    lista: { gap: space[4] } satisfies ViewStyle,
    secao: { gap: space[3] } satisfies ViewStyle,
  } as const;
}

function mensagemDoErro(erro: unknown): string {
  return erro instanceof ErroApi ? erro.mensagens.join(' ') : MENSAGEM_FALHA;
}

function eStatus(erro: unknown, status: number): boolean {
  return erro instanceof ErroApi && erro.status === status;
}

function textoDoDialogo(pedido: Pedido | null) {
  if (pedido === null) {
    return { titulo: '', descricao: '', rotulo: '', carregando: '' };
  }
  if (pedido.acao === 'aceitar') {
    return {
      titulo: `Aceitar a proposta de ${pedido.motorista}?`,
      descricao: `A carga fecha por ${formatarMoeda(pedido.valor)} e as outras propostas pendentes são recusadas. Não dá para desfazer.`,
      rotulo: 'Aceitar proposta',
      carregando: 'Aceitando…',
    };
  }
  return {
    titulo: `Recusar a proposta de ${pedido.motorista}?`,
    descricao: 'O motorista é avisado de que a proposta foi recusada. Não dá para desfazer.',
    rotulo: 'Recusar proposta',
    carregando: 'Recusando…',
  };
}

/**
 * Propostas da carga (MVP-14, card 021): `/empresa/cargas/detalhe?id=<uuid>` (ADR 0002: sem
 * segmento dinâmico). Resumo da carga, propostas recebidas (atualizam sozinhas a cada 10 s com a aba
 * visível, CT-09) e, nas pendentes de carga aberta e não vencida, "Aceitar" e "Recusar" com
 * confirmação (D-PO-08). A API não tem `GET /cargas/:id`: o resumo vem de `GET /cargas/minhas`.
 */
export default function PropostasDaCarga() {
  const { cabecalho, abas, habilitado } = useCasca();
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const parametros = useLocalSearchParams<{ id?: string | string[] }>();
  const cargaId = typeof parametros.id === 'string' && parametros.id !== '' ? parametros.id : null;

  const propostas = usePropostasDaCarga(cargaId ?? '', {
    automatico: true,
    habilitado: habilitado && cargaId !== null,
  });
  const cargas = useMinhasCargas({ habilitado });
  const responder = useResponderProposta(cargaId ?? '');
  const { refetch: recarregarPropostas } = propostas;
  const { refetch: recarregarCargas } = cargas;

  const lista = propostas.data?.propostas;
  const carga = cargas.data?.cargas.find((item) => item.id === cargaId);

  // Novidades do último ciclo: o texto (barra e região viva) e quais cartões ganham "Nova".
  const [novidade, setNovidade] = useState('');
  const [novas, setNovas] = useState<readonly string[]>([]);
  useAnunciarNovidades(lista, (anterior, atual) => {
    const texto = descreverNovidades(anterior, atual);
    setNovidade(texto ?? '');
    setNovas(idsNovos(anterior, atual));
    return texto;
  });

  const [atualizando, setAtualizando] = useState(false);
  const atualizar = useCallback(async () => {
    setAtualizando(true);
    try {
      await Promise.all([recarregarPropostas(), recarregarCargas()]);
    } finally {
      setAtualizando(false);
    }
  }, [recarregarPropostas, recarregarCargas]);

  // Confirmação (D-PO-08). O foco volta a quem abriu o diálogo; se esse botão some (a proposta
  // deixou de ser pendente), vai ao banner de "Frete criado" ou ao cartão da proposta recusada.
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [aberto, setAberto] = useState(false);
  const [erroDoDialogo, setErroDoDialogo] = useState<string | undefined>();
  const [freteCriado, setFreteCriado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const retornoDoFoco = useRef<unknown>(null);
  const refBanner = useRef<View>(null);
  const cartoes = useRef(new Map<string, View>());

  useEffect(() => {
    if (freteCriado) retornoDoFoco.current = refBanner.current;
  }, [freteCriado]);

  const abrirDialogo = (
    proposta: { id: string; valor_proposto: NumeroEntrada; motorista: { nome_completo: string } },
    acao: AcaoResposta,
    origem: View | null,
  ) => {
    retornoDoFoco.current = origem;
    setErroDoDialogo(undefined);
    setAviso(null);
    setPedido({
      propostaId: proposta.id,
      motorista: proposta.motorista.nome_completo,
      valor: proposta.valor_proposto,
      acao,
    });
    setAberto(true);
  };

  const confirmar = async () => {
    if (pedido === null) return;
    try {
      await responder.mutateAsync({ propostaId: pedido.propostaId, acao: pedido.acao });
    } catch (erro) {
      if (eStatus(erro, 409)) {
        // Já respondida ou carga fechada: mostra o motivo da API e recarrega a tela.
        setAviso(mensagemDoErro(erro));
        setAberto(false);
        void atualizar();
      } else {
        setErroDoDialogo(mensagemDoErro(erro));
      }
      return;
    }
    setAberto(false);
    if (pedido.acao === 'aceitar') {
      setFreteCriado(true);
      anunciar('Frete criado');
    } else {
      retornoDoFoco.current = cartoes.current.get(pedido.propostaId) ?? null;
      anunciar(`Proposta de ${pedido.motorista} recusada`);
    }
  };

  const naoEncontrada =
    habilitado &&
    (cargaId === null ||
      eStatus(propostas.error, 404) ||
      (cargas.isSuccess && carga === undefined));

  let estado: EstadoLista;
  if (!habilitado) estado = 'carregando';
  else if (naoEncontrada) estado = 'vazio';
  else if (lista && carga) estado = 'pronto';
  else if (propostas.isError || cargas.isError) estado = 'erro';
  else estado = 'carregando';

  // CT-10: só carga aberta e dentro do prazo aceita resposta.
  const cargaAberta = carga ? statusEfetivo(carga.status, carga.expira_em) === 'aberto' : false;
  const textos = textoDoDialogo(pedido);

  return (
    <>
      <TemplateLista
        titulo={TITULO}
        descricao={DESCRICAO}
        cabecalho={cabecalho}
        abas={abas}
        estado={estado}
        textoCarregando="Carregando propostas…"
        vazio={{
          titulo: 'Carga não encontrada',
          descricao: 'Ela não existe ou não é da sua empresa. Volte para ver as suas cargas.',
          acao: <Link href="/empresa/cargas">Minhas cargas</Link>,
        }}
        erro={{
          mensagem: mensagemDoErro(propostas.error ?? cargas.error),
          aoTentarDeNovo: atualizar,
          tentando: atualizando,
        }}
        aoAtualizar={estado === 'pronto' ? atualizar : undefined}
        atualizando={atualizando}
        novidade={
          estado === 'pronto'
            ? { titulo: novidade, atualizadoEm: propostas.dataUpdatedAt }
            : undefined
        }
      >
        {lista && carga ? (
          <View style={estilos.conteudo}>
            <View
              role="region"
              aria-label="Resumo da carga"
              style={[
                estilos.resumo,
                { backgroundColor: colors.bg.surface, borderColor: colors.border.subtle },
              ]}
            >
              <ResumoCarga
                tipoCarga={carga.tipo_carga}
                origem={rotuloDoLocal(carga.origem) ?? LOCAL_SEM_CIDADE}
                destino={rotuloDoLocal(carga.destino) ?? LOCAL_SEM_CIDADE}
                pesoKg={carga.peso_kg}
                valorOferecido={carga.valor_oferecido}
                urgencia={carga.urgencia}
                certificacao={carga.certificacao_exigida}
                expiraEm={carga.expira_em}
                status={carga.status}
              />
            </View>

            {freteCriado ? (
              <View ref={refBanner} tabIndex={-1}>
                <Banner
                  variante="ok"
                  titulo="Frete criado"
                  acao={<Link href="/empresa/fretes">Ver fretes</Link>}
                >
                  As outras propostas pendentes foram recusadas.
                </Banner>
              </View>
            ) : null}

            {aviso ? <Banner variante="erro">{aviso}</Banner> : null}

            {lista.length === 0 ? (
              <EstadoVazio
                titulo="Nenhuma proposta ainda"
                descricao="Esta tela atualiza sozinha."
                acao={<Link href="/empresa/cargas">Minhas cargas</Link>}
              />
            ) : (
              <View style={estilos.secao}>
                <Titulo nivel={2}>{`Propostas (${lista.length})`}</Titulo>
                <View role="list" style={estilos.lista}>
                  {lista.map((proposta) => (
                    <View key={proposta.id} role="listitem">
                      <CartaoProposta
                        ref={(no) => {
                          if (no) cartoes.current.set(proposta.id, no);
                          else cartoes.current.delete(proposta.id);
                        }}
                        tipo={proposta.tipo}
                        valorProposto={proposta.valor_proposto}
                        valorOferecido={carga.valor_oferecido}
                        status={proposta.status}
                        criadoEm={proposta.criado_em}
                        motorista={{
                          nome: proposta.motorista.nome_completo,
                          veiculo: proposta.motorista.veiculo_tipo,
                          placa: proposta.motorista.veiculo_placa,
                          capacidadeKg: proposta.motorista.capacidade_kg,
                          certificacoes: proposta.motorista.certificacoes.map((c) => ({
                            nome: c.nome,
                            validade: c.validade,
                            aprovada: c.validado_por_admin,
                          })),
                        }}
                        nova={novas.includes(proposta.id)}
                        destacar={novas.includes(proposta.id)}
                        podeResponder={cargaAberta && proposta.status === 'pendente'}
                        aoAceitar={(origem) => abrirDialogo(proposta, 'aceitar', origem)}
                        aoRecusar={(origem) => abrirDialogo(proposta, 'recusar', origem)}
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        ) : null}
      </TemplateLista>

      <DialogoConfirmacao
        aberto={aberto}
        titulo={textos.titulo}
        descricao={textos.descricao}
        rotuloConfirmar={textos.rotulo}
        rotuloCarregando={textos.carregando}
        variante={pedido?.acao === 'recusar' ? 'perigo' : 'padrao'}
        carregando={responder.isPending}
        erro={erroDoDialogo}
        aoConfirmar={confirmar}
        aoFechar={() => setAberto(false)}
        refRetorno={retornoDoFoco}
      />
    </>
  );
}
