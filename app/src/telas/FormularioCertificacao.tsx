// Formulário de certificação do motorista (card 031, MVP-19): cadastra e reenvia pelo mesmo POST
// /certificacoes/minhas (react-hook-form, ADR 0007). Carregado dentro do corpo da tela, por
// React.lazy a partir de `app/motorista/certificacoes.tsx` (ADR 0011).
import { useEffect, useMemo, type RefObject } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { FieldPath, UseFormSetError } from 'react-hook-form';
import { View, type Text as TextoRN, type ViewStyle } from 'react-native';

import { useEnviarCertificacao } from '@/api/certificacoes.hooks';
import type { Certificacao, MinhaCertificacao } from '@/api/tipos';
import { Botao } from '@/components/atoms/Botao';
import { Titulo } from '@/components/atoms/Titulo';
import { Banner } from '@/components/molecules/Banner';
import { CampoDataPartes, type ValorDataPartes } from '@/components/molecules/CampoDataPartes';
import { CampoSelecao, type OpcaoSelecao } from '@/components/molecules/CampoSelecao';
import { CampoTexto } from '@/components/molecules/CampoTexto';
import { aplicarErroApi, useEnvioUnico, useResumoErros } from '@/components/molecules/formulario';
import { ResumoErros } from '@/components/molecules/ResumoErros';
import { CartaoFormulario, CelulaFormulario } from '@/components/organisms/CartaoFormulario';
import { moverFoco } from '@/lib/a11y';
import { dataNoPassado, montarData } from '@/lib/datas';
import { ErroApi } from '@/lib/erros';
import { maximo, obrigatorio } from '@/lib/validacao';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

import { encadear } from './camposComuns';

/** Pedido de reenvio vindo da lista: a certificação e o número já preenchidos. `tentativa` muda a cada clique. */
export interface PedidoDeReenvio {
  certificacaoId: string;
  numero: string;
  tentativa: number;
}

export interface PropsFormularioCertificacao {
  /** Catálogo (GET /certificacoes), em ordem alfabética. */
  catalogo: readonly Certificacao[];
  /** As do motorista (GET /certificacoes/minhas): dizem quais já estão aprovadas e quais são reenvio. */
  minhas: readonly MinhaCertificacao[];
  reenvio: PedidoDeReenvio | null;
  /** O POST deu 201. A tela anuncia, destaca e recarrega a lista. */
  aoEnviar: (certificacaoId: string) => void;
  /** O POST deu 409 (já aprovada e vigente): a lista está desatualizada e precisa ser buscada de novo. */
  aoConflito: () => void;
  /** "Cancelar reenvio": volta ao cadastro novo. */
  aoCancelarReenvio: () => void;
  /** Título do formulário: recebe o foco ao pedir um reenvio (e o "Enviar certificação" do estado vazio). */
  refTitulo: RefObject<TextoRN | null>;
}

interface Valores {
  certificacaoId: string;
  numero: string;
  validade: ValorDataPartes;
}

export const MAXIMO_NUMERO = 60;
export const AVISO_REENVIO = 'Ao reenviar, a certificação volta para Aguardando aprovação.';
export const MENSAGEM_DATA_INVALIDA = 'Informe uma data válida. Exemplo: dia 31, mês 12, ano 2027.';
export const MENSAGEM_DATA_NO_PASSADO =
  'A validade não pode estar no passado. Informe hoje ou uma data futura.';
/**
 * O backend compara a validade com a data em UTC. Entre 21h e 24h em Brasília já é "amanhã" em UTC, e
 * "hoje" para a pessoa é "ontem" para o servidor. A API é a autoridade (card 031): o app não tenta
 * corrigir, só explica o 400 (a data estava certa no relógio do aparelho).
 */
export const MENSAGEM_DATA_RECUSADA_PELO_SERVIDOR =
  'O servidor recusou esta data como passada: ele usa o horário UTC, que à noite já é o dia seguinte. Informe a partir de amanhã.';
const MENSAGEM_ESCOLHER = 'Escolha a certificação.';
const MENSAGEM_JA_APROVADA = 'Esta certificação já está aprovada e dentro da validade.';
const MENSAGEM_NUMERO = 'Informe o número do certificado.';

// Campo da API → campo do formulário (ADR 0007, CT-03).
const CAMPOS_DA_API = {
  certificacao_id: 'certificacaoId',
  numero_certificado: 'numero',
  validade: 'validade',
} as const;

const ROTULOS = {
  certificacaoId: 'Certificação',
  numero: 'Número do certificado',
  validade: 'Validade',
} as const;

const VALIDADE_VAZIA: ValorDataPartes = { dia: '', mes: '', ano: '' };

const validarNumero = encadear(
  (valor) => (typeof valor === 'string' && valor.trim() !== '') || MENSAGEM_NUMERO,
  maximo(MAXIMO_NUMERO),
);

/** A validade digitada: data que existe e que não é anterior a hoje no relógio local. */
export function validarValidade(valor: ValorDataPartes): true | string {
  const data = montarData(valor.dia, valor.mes, valor.ano);
  if (data === null) return MENSAGEM_DATA_INVALIDA;
  return !dataNoPassado(data) || MENSAGEM_DATA_NO_PASSADO;
}

/**
 * O 400 "validade não pode estar no passado" para uma data que o app aceitou (hoje ou depois) só
 * acontece na borda do fuso (ver `MENSAGEM_DATA_RECUSADA_PELO_SERVIDOR`). As demais mensagens da API
 * seguem como vieram.
 */
export function explicarMensagemDaValidade(mensagem: string): string {
  return /passado/.test(mensagem) ? MENSAGEM_DATA_RECUSADA_PELO_SERVIDOR : mensagem;
}

function traduzirErro(erro: unknown): ErroApi {
  return erro instanceof ErroApi ? erro : ErroApi.falha();
}

function valoresIniciais(reenvio: PedidoDeReenvio | null): Valores {
  return {
    certificacaoId: reenvio?.certificacaoId ?? '',
    numero: reenvio?.numero ?? '',
    validade: VALIDADE_VAZIA,
  };
}

function criarEstilos({ space }: TemaVisual) {
  return {
    raiz: { gap: space[4] } satisfies ViewStyle,
  } as const;
}

export default function FormularioCertificacao({
  catalogo,
  minhas,
  reenvio,
  aoEnviar,
  aoConflito,
  aoCancelarReenvio,
  refTitulo,
}: PropsFormularioCertificacao) {
  const estilos = useEstilos(criarEstilos);
  const enviarCertificacao = useEnviarCertificacao();

  const { control, handleSubmit, setError, setFocus, reset, formState } = useForm<Valores>({
    defaultValues: valoresIniciais(reenvio),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    // O foco vai ao resumo de erros (CT-03), não ao primeiro campo.
    shouldFocusError: false,
  });
  const { isSubmitting } = formState;
  const escolhida = useWatch({ control, name: 'certificacaoId' });

  const resumo = useResumoErros<Valores>({
    setFocus,
    aoTentarDeNovo: (): Promise<void> => enviarUnico(),
    tentando: isSubmitting,
    rotulos: ROTULOS,
  });

  // "Reenviar" na lista: o formulário vem com a certificação e o número, e o foco vai ao título dele.
  const tentativa = reenvio?.tentativa;
  useEffect(() => {
    if (reenvio === null) return;
    reset(valoresIniciais(reenvio));
    resumo.limpar();
    moverFoco(refTitulo);
    // `resumo.limpar` é estável; só um novo pedido de reenvio reinicia o formulário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tentativa]);

  const aprovadas = useMemo(
    () => new Set(minhas.filter((m) => m.situacao === 'aprovada').map((m) => m.certificacao_id)),
    [minhas],
  );
  const opcoes = useMemo<OpcaoSelecao[]>(
    () =>
      catalogo.map((certificacao) => {
        const aprovada = aprovadas.has(certificacao.id);
        return {
          valor: certificacao.id,
          rotulo: aprovada ? `${certificacao.nome} (já aprovada)` : certificacao.nome,
          desabilitada: aprovada,
        };
      }),
    [catalogo, aprovadas],
  );
  // Escolher uma que já está na lista (pendente ou vencida) também é reenvio.
  const ehReenvio = escolhida !== '' && minhas.some((m) => m.certificacao_id === escolhida);

  const validarCertificacao = (valor: string): true | string => {
    if (valor === '') return MENSAGEM_ESCOLHER;
    return !aprovadas.has(valor) || MENSAGEM_JA_APROVADA;
  };

  const enviar = handleSubmit(
    async (valores): Promise<void> => {
      resumo.limpar();
      const { dia, mes, ano } = valores.validade;
      const validade = montarData(dia, mes, ano);
      // A validação já garantiu a data; a checagem satisfaz o TypeScript sem `!`.
      if (validade === null) return;
      let enviada;
      try {
        enviada = await enviarCertificacao.mutateAsync({
          certificacao_id: valores.certificacaoId,
          numero_certificado: valores.numero.trim(),
          validade,
        });
      } catch (erro) {
        const falha = traduzirErro(erro);
        // A mensagem da validade é explicada na hora de ir ao campo (borda do fuso, UTC).
        const setErroTraduzido: UseFormSetError<Valores> = (campo, erroDoCampo, opcoesDoErro) =>
          setError(
            campo,
            campo === 'validade' && erroDoCampo.message !== undefined
              ? { ...erroDoCampo, message: explicarMensagemDaValidade(erroDoCampo.message) }
              : erroDoCampo,
            opcoesDoErro,
          );
        aplicarErroApi<Valores, keyof typeof CAMPOS_DA_API>(falha, {
          setError: setErroTraduzido,
          campos: CAMPOS_DA_API as Readonly<Record<keyof typeof CAMPOS_DA_API, FieldPath<Valores>>>,
          definirResumo: resumo.definirResumo,
          focarResumo: resumo.focarResumo,
        });
        // 409: já está aprovada e vigente; a lista que a pessoa vê estava desatualizada.
        if (falha.status === 409) aoConflito();
        return;
      }
      reset(valoresIniciais(null));
      aoEnviar(enviada.certificacao.certificacao_id);
    },
    (erros) => resumo.aoInvalidar(erros),
  );
  // Clique duplo, Enter + clique e "Tentar de novo" = uma requisição por vez (CT-01).
  const enviarUnico = useEnvioUnico((): Promise<void> => enviar());

  const emReenvio = reenvio !== null;
  const tituloDoFormulario = emReenvio ? 'Reenviar certificação' : 'Enviar certificação';

  return (
    <View style={estilos.raiz}>
      <Titulo nivel={2} ref={refTitulo} tabIndex={-1}>
        {tituloDoFormulario}
      </Titulo>
      {emReenvio || ehReenvio ? (
        <Banner variante="info" titulo="Reenviar volta para “Aguardando aprovação”">
          {AVISO_REENVIO}
        </Banner>
      ) : null}
      <CartaoFormulario
        nome={tituloDoFormulario}
        resumo={<ResumoErros {...resumo.props} />}
        aoEnviar={enviarUnico}
        acoes={
          <>
            {emReenvio ? (
              <Botao
                tamanho="lg"
                variante="secundario"
                desabilitado={isSubmitting}
                aoPressionar={() => {
                  reset(valoresIniciais(null));
                  resumo.limpar();
                  aoCancelarReenvio();
                }}
              >
                Cancelar reenvio
              </Botao>
            ) : null}
            <Botao
              tamanho="lg"
              icone="send"
              carregando={isSubmitting}
              rotuloCarregando="Enviando…"
              aoPressionar={enviarUnico}
            >
              {emReenvio ? 'Reenviar para aprovação' : 'Enviar para aprovação'}
            </Botao>
          </>
        }
      >
        <CelulaFormulario cheia>
          <Controller
            control={control}
            name="certificacaoId"
            rules={{ validate: validarCertificacao }}
            render={({ field, fieldState }) => (
              <CampoSelecao
                id="certificacao-campo"
                rotulo={ROTULOS.certificacaoId}
                ajuda="Certificações já aprovadas e dentro da validade ficam desabilitadas."
                textoVazio="Escolha a certificação"
                opcoes={opcoes}
                valor={field.value}
                aoMudar={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                erro={fieldState.error?.message}
              />
            )}
          />
        </CelulaFormulario>
        <CelulaFormulario cheia>
          <Controller
            control={control}
            name="numero"
            rules={{ validate: validarNumero }}
            render={({ field, fieldState }) => (
              <CampoTexto
                id="certificacao-numero"
                rotulo={ROTULOS.numero}
                ajuda="Copie como está no documento. Até 60 caracteres."
                autoComplete="off"
                autoCorrect={false}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                erro={fieldState.error?.message}
              />
            )}
          />
        </CelulaFormulario>
        <CelulaFormulario cheia>
          <Controller
            control={control}
            name="validade"
            rules={{ validate: validarValidade }}
            render={({ field, fieldState }) => (
              <CampoDataPartes
                id="certificacao-validade"
                rotulo={ROTULOS.validade}
                ajuda="Data de vencimento do documento. Exemplo: dia 31, mês 12, ano 2027. Pode ser hoje ou depois."
                valor={field.value}
                aoMudar={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                erro={fieldState.error?.message}
              />
            )}
          />
        </CelulaFormulario>
      </CartaoFormulario>
    </View>
  );
}
