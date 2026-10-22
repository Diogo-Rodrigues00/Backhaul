import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type ControllerRenderProps,
} from 'react-hook-form';
import { Platform, View, type ViewStyle } from 'react-native';

import { useCertificacoes } from '@/api/certificacoes';
import { usePublicarCarga } from '@/api/cargas';
import type { Certificacao, CorpoPublicarCarga } from '@/api/tipos';
import { Botao } from '@/components/atoms/Botao';
import { Link } from '@/components/atoms/Link';
import { Texto } from '@/components/atoms/Texto';
import { Titulo } from '@/components/atoms/Titulo';
import { CampoNumero } from '@/components/molecules/CampoNumero';
import { CampoSelecao, type OpcaoSelecao } from '@/components/molecules/CampoSelecao';
import { CampoTexto } from '@/components/molecules/CampoTexto';
import { aplicarErroApi, useEnvioUnico, useResumoErros } from '@/components/molecules/formulario';
import { GrupoOpcoes, type OpcaoGrupo } from '@/components/molecules/GrupoOpcoes';
import { ResumoCarga } from '@/components/molecules/ResumoCarga';
import { ResumoErros } from '@/components/molecules/ResumoErros';
import { CartaoFormulario, CelulaFormulario } from '@/components/organisms/CartaoFormulario';
import { SeletorLocal, type Local } from '@/components/organisms/SeletorLocal';
import { useCasca } from '@/components/organisms/useCasca';
import { TemplateFormularioComPrevia } from '@/components/templates/TemplateFormularioComPrevia';
import { anunciar } from '@/lib/a11y';
import { ErroApi } from '@/lib/erros';
import { paraNumero } from '@/lib/numeros';
import { calcularExpiraEm, OPCOES_PRAZO } from '@/lib/prazos';
import { rotuloUrgencia, type Urgencia } from '@/lib/rotulos';
import {
  MAX,
  maximo,
  numeroPositivo,
  numeroSemAmbiguidade,
  obrigatorio,
  type Validador,
} from '@/lib/validacao';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

// Publicar carga (card 019, MVP-08, D-PO-02, D-PO-14). Formulário com prévia "Como o motorista vê".

interface Valores {
  tipoCarga: string;
  origem: Local | null;
  destino: Local | null;
  peso: string;
  valor: string;
  urgencia: Urgencia;
  /** Id da certificação; texto vazio = "Nenhuma". */
  certificacaoId: string;
  /** Horas até `expira_em`, como texto (o `GrupoOpcoes` trabalha com texto). */
  prazo: string;
}

const PRAZO_PADRAO = '24';
const SEM_CERTIFICACAO = '';
const MENSAGEM_ORIGEM_IGUAL_DESTINO = 'Origem e destino precisam ser diferentes';
const MENSAGEM_CERTIFICACOES = 'Não foi possível carregar as certificações.';

// Campo da API → campo do formulário (ADR 0007). O 400 da certificação inexistente vai ao seu campo (CT-03).
const CAMPOS_DA_API = {
  tipo_carga: 'tipoCarga',
  origem: 'origem',
  destino: 'destino',
  peso_kg: 'peso',
  valor_oferecido: 'valor',
  urgencia: 'urgencia',
  certificacao_requerida_id: 'certificacaoId',
  expira_em: 'prazo',
} as const;

const ROTULOS = {
  tipoCarga: 'Tipo de carga',
  origem: 'Origem',
  destino: 'Destino',
  peso: 'Peso (kg)',
  valor: 'Valor oferecido (R$)',
  urgencia: 'Urgência',
  certificacaoId: 'Certificação exigida',
  prazo: 'Prazo',
} as const;

const OPCOES_URGENCIA: readonly OpcaoGrupo<Urgencia>[] = (
  ['normal', 'urgente', 'critico'] as const
).map((urgencia) => ({ valor: urgencia, rotulo: rotuloUrgencia(urgencia), urgencia }));

const OPCOES_DE_PRAZO: readonly OpcaoGrupo[] = OPCOES_PRAZO.map(({ horas, rotulo }) => ({
  valor: String(horas),
  rotulo,
}));

/** A primeira mensagem que falhar (como os demais formulários: um erro por campo). */
function encadear(...validadores: Validador[]): Validador {
  return (valor) => {
    for (const validar of validadores) {
      const resultado = validar(valor);
      if (resultado !== true) return resultado;
    }
    return true;
  };
}

const validarTipoCarga = encadear(obrigatorio, maximo(MAX.tipo_carga));
const validarPeso = encadear(obrigatorio, numeroSemAmbiguidade, numeroPositivo);
const validarValor = encadear(obrigatorio, numeroSemAmbiguidade, numeroPositivo);

function exigirLocal(mensagem: string) {
  return (valor: Local | null): true | string => valor !== null || mensagem;
}

function mesmoLugar(a: Local, b: Local): boolean {
  return a.lat === b.lat && a.lng === b.lng;
}

function traduzirErro(erro: unknown): ErroApi {
  return erro instanceof ErroApi ? erro : ErroApi.falha();
}

function opcoesDeCertificacao(certificacoes: readonly Certificacao[]): OpcaoSelecao[] {
  return [
    { valor: SEM_CERTIFICACAO, rotulo: 'Nenhuma' },
    ...certificacoes.map(({ id, nome }) => ({ valor: id, rotulo: nome })),
  ];
}

function criarEstilos({ border, colors, radius, space }: TemaVisual) {
  return {
    previa: { gap: space[4] } satisfies ViewStyle,
    cartaoPrevia: {
      padding: space[5],
      borderWidth: border.width,
      borderRadius: radius.lg,
      borderColor: colors.border.subtle,
      backgroundColor: colors.bg.surface,
    } satisfies ViewStyle,
    certificacao: { gap: space[3], minWidth: 0 } satisfies ViewStyle,
    tentarDeNovo: { alignSelf: 'flex-start' } satisfies ViewStyle,
  } as const;
}

/**
 * `SeletorLocal` ligado ao campo do formulário. O seletor não é um único controle, então o foco do
 * resumo de erros (e do primeiro campo com erro) vai ao campo de busca pelo id, na web.
 */
function CampoLocal({
  id,
  rotulo,
  campo,
  erro,
}: {
  id: string;
  rotulo: string;
  campo: ControllerRenderProps<Valores, 'origem' | 'destino'>;
  erro?: string;
}) {
  const { ref, value, onChange } = campo;
  useEffect(() => {
    ref({
      focus: () => {
        if (Platform.OS === 'web') document.getElementById(id)?.focus();
      },
    });
  }, [ref, id]);
  return <SeletorLocal id={id} rotulo={rotulo} valor={value} aoMudar={onChange} erro={erro} />;
}

/** "Como o motorista vai ver": o mesmo `ResumoCarga` da lista do motorista, com o que já foi preenchido. */
function PreviaDaCarga({
  control,
  certificacoes,
}: {
  control: Control<Valores>;
  certificacoes: readonly Certificacao[] | undefined;
}) {
  const estilos = useEstilos(criarEstilos);
  const valores = useWatch({ control });
  const horas = Number(valores.prazo ?? PRAZO_PADRAO);
  // O prazo da prévia é recalculado só quando a pessoa troca a opção, não a cada tecla.
  const expiraEm = useMemo(() => calcularExpiraEm(horas), [horas]);
  const certificacao =
    certificacoes?.find((item) => item.id === valores.certificacaoId)?.nome ?? null;

  return (
    <View role="group" aria-label="Prévia da carga" style={estilos.cartaoPrevia}>
      <ResumoCarga
        tipoCarga={valores.tipoCarga?.trim() || 'Tipo de carga'}
        origem={valores.origem?.rotulo ?? 'Origem'}
        destino={valores.destino?.rotulo ?? 'Destino'}
        pesoKg={paraNumero(valores.peso) ?? undefined}
        valorOferecido={paraNumero(valores.valor) ?? 0}
        urgencia={valores.urgencia ?? 'normal'}
        certificacao={certificacao}
        expiraEm={expiraEm}
      />
    </View>
  );
}

export default function PublicarCarga() {
  const estilos = useEstilos(criarEstilos);
  const router = useRouter();
  const { cabecalho, abas, habilitado } = useCasca();
  const publicar = usePublicarCarga();
  const certificacoes = useCertificacoes({ habilitado });

  const { control, handleSubmit, setError, setFocus, formState } = useForm<Valores>({
    defaultValues: {
      tipoCarga: '',
      origem: null,
      destino: null,
      peso: '',
      valor: '',
      urgencia: 'normal',
      certificacaoId: SEM_CERTIFICACAO,
      prazo: PRAZO_PADRAO,
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    // O foco vai ao resumo de erros (CT-03), não ao primeiro campo: sem isto o react-hook-form
    // tira o foco do resumo logo depois de `aoInvalidar`. Os links do resumo focam cada campo.
    shouldFocusError: false,
  });
  const { isSubmitting } = formState;

  const resumo = useResumoErros<Valores>({
    setFocus,
    aoTentarDeNovo: (): Promise<void> => enviarUnico(),
    tentando: isSubmitting,
    rotulos: ROTULOS,
  });

  const enviar = handleSubmit(
    async (valores): Promise<void> => {
      resumo.limpar();
      const { origem, destino } = valores;
      const peso = paraNumero(valores.peso);
      const valor = paraNumero(valores.valor);
      // A validação já garantiu tudo isto; a checagem satisfaz o TypeScript sem `!`.
      if (origem === null || destino === null || peso === null || valor === null) return;
      const corpo: CorpoPublicarCarga = {
        tipo_carga: valores.tipoCarga.trim(),
        origem: { lat: origem.lat, lng: origem.lng },
        destino: { lat: destino.lat, lng: destino.lng },
        peso_kg: peso,
        valor_oferecido: valor,
        urgencia: valores.urgencia,
        certificacao_requerida_id:
          valores.certificacaoId === SEM_CERTIFICACAO ? null : valores.certificacaoId,
        expira_em: calcularExpiraEm(Number(valores.prazo)),
      };
      try {
        await publicar.mutateAsync(corpo);
      } catch (erro) {
        aplicarErroApi(traduzirErro(erro), {
          setError,
          campos: CAMPOS_DA_API,
          definirResumo: resumo.definirResumo,
          focarResumo: resumo.focarResumo,
        });
        return;
      }
      anunciar('Carga publicada');
      router.replace('/empresa/cargas');
    },
    (erros) => resumo.aoInvalidar(erros),
  );
  // Clique duplo, Enter + clique e "Tentar de novo" = uma requisição por vez (CT-01).
  const enviarUnico = useEnvioUnico((): Promise<void> => enviar());

  const erroCertificacoes = certificacoes.isError;
  useEffect(() => {
    if (erroCertificacoes) anunciar(MENSAGEM_CERTIFICACOES);
  }, [erroCertificacoes]);

  const opcoesCertificacao = useMemo(
    () => opcoesDeCertificacao(certificacoes.data?.certificacoes ?? []),
    [certificacoes.data],
  );

  return (
    <TemplateFormularioComPrevia
      titulo="Publicar carga"
      descricao="Quanto mais claro o prazo e a urgência, mais rápido o motorista certo aparece."
      cabecalho={cabecalho}
      abas={abas}
      previa={
        <View style={estilos.previa}>
          <Titulo nivel={2}>Como o motorista vai ver</Titulo>
          <PreviaDaCarga control={control} certificacoes={certificacoes.data?.certificacoes} />
          <Texto nivel="sm" cor="secundario">
            A lista do motorista vem ordenada por urgência e, depois, por distância.
          </Texto>
        </View>
      }
    >
      <CartaoFormulario
        nome="Publicar carga"
        resumo={<ResumoErros {...resumo.props} />}
        aoEnviar={enviarUnico}
        acoes={
          <>
            <Link
              href="/empresa/cargas"
              variante="botao"
              aparencia={{ variante: 'secundario', tamanho: 'lg' }}
            >
              Cancelar
            </Link>
            <Botao
              tamanho="lg"
              icone="plus"
              carregando={isSubmitting}
              rotuloCarregando="Publicando…"
              aoPressionar={enviarUnico}
            >
              Publicar carga
            </Botao>
          </>
        }
      >
        <CelulaFormulario cheia>
          <Controller
            control={control}
            name="tipoCarga"
            rules={{ validate: validarTipoCarga }}
            render={({ field, fieldState }) => (
              <CampoTexto
                rotulo={ROTULOS.tipoCarga}
                ajuda="Por exemplo: grãos, produtos inflamáveis, carga refrigerada."
                autoCapitalize="sentences"
                returnKeyType="next"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                erro={fieldState.error?.message}
              />
            )}
          />
        </CelulaFormulario>
        <CelulaFormulario>
          <Controller
            control={control}
            name="origem"
            rules={{ validate: exigirLocal('Escolha a cidade de origem.') }}
            render={({ field, fieldState }) => (
              <CampoLocal
                id="carga-origem"
                rotulo={ROTULOS.origem}
                campo={field}
                erro={fieldState.error?.message}
              />
            )}
          />
        </CelulaFormulario>
        <CelulaFormulario>
          <Controller
            control={control}
            name="destino"
            rules={{
              validate: {
                escolhido: exigirLocal('Escolha a cidade de destino.'),
                diferente: (destino, { origem }) =>
                  destino === null || origem === null || !mesmoLugar(destino, origem)
                    ? true
                    : MENSAGEM_ORIGEM_IGUAL_DESTINO,
              },
            }}
            render={({ field, fieldState }) => (
              <CampoLocal
                id="carga-destino"
                rotulo={ROTULOS.destino}
                campo={field}
                erro={fieldState.error?.message}
              />
            )}
          />
        </CelulaFormulario>
        <CelulaFormulario>
          <Controller
            control={control}
            name="peso"
            rules={{ validate: validarPeso }}
            render={({ field, fieldState }) => (
              <CampoNumero
                rotulo={ROTULOS.peso}
                sufixo="kg"
                modo="decimal"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                erro={fieldState.error?.message}
              />
            )}
          />
        </CelulaFormulario>
        <CelulaFormulario>
          <Controller
            control={control}
            name="valor"
            rules={{ validate: validarValor }}
            render={({ field, fieldState }) => (
              <CampoNumero
                rotulo={ROTULOS.valor}
                prefixo="R$"
                modo="decimal"
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
            name="urgencia"
            render={({ field, fieldState }) => (
              <GrupoOpcoes
                legenda={ROTULOS.urgencia}
                opcoes={OPCOES_URGENCIA}
                valor={field.value}
                aoMudar={field.onChange}
                erro={fieldState.error?.message}
              />
            )}
          />
        </CelulaFormulario>
        <CelulaFormulario cheia>
          <View style={estilos.certificacao}>
            <Controller
              control={control}
              name="certificacaoId"
              render={({ field, fieldState }) => (
                <CampoSelecao
                  rotulo={ROTULOS.certificacaoId}
                  opcional
                  ajuda={
                    certificacoes.isPending
                      ? 'Carregando certificações…'
                      : 'Só motoristas com a certificação aprovada e dentro da validade veem esta carga.'
                  }
                  opcoes={opcoesCertificacao}
                  valor={field.value}
                  aoMudar={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  desabilitado={certificacoes.isPending}
                  erro={
                    fieldState.error?.message ??
                    (erroCertificacoes ? MENSAGEM_CERTIFICACOES : undefined)
                  }
                />
              )}
            />
            {erroCertificacoes ? (
              <View style={estilos.tentarDeNovo}>
                <Botao
                  variante="secundario"
                  icone="refresh"
                  carregando={certificacoes.isFetching}
                  rotuloCarregando="Tentando…"
                  aoPressionar={() => certificacoes.refetch()}
                >
                  Tentar de novo
                </Botao>
              </View>
            ) : null}
          </View>
        </CelulaFormulario>
        <CelulaFormulario cheia>
          <Controller
            control={control}
            name="prazo"
            render={({ field, fieldState }) => (
              <GrupoOpcoes
                legenda={ROTULOS.prazo}
                ajuda="A carga some da lista dos motoristas depois deste prazo."
                opcoes={OPCOES_DE_PRAZO}
                valor={field.value}
                aoMudar={field.onChange}
                erro={fieldState.error?.message}
              />
            )}
          />
        </CelulaFormulario>
      </CartaoFormulario>
    </TemplateFormularioComPrevia>
  );
}
