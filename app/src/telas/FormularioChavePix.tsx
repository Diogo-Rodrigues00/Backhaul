// Formulário da chave Pix do motorista (card 047): tipo + chave, enviados por PUT /motorista/chave-pix
// (react-hook-form, ADR 0007). Carregado dentro do corpo da tela, por React.lazy a partir de
// `app/motorista/chave-pix.tsx` (ADR 0011). A validação de verdade é da API; o app só exige os dois
// campos e mostra a mensagem que ela devolver no campo certo. Nada aqui registra a chave em log nem
// a guarda fora do estado do formulário.
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { FieldPath } from 'react-hook-form';
import { View, type Text as TextoRN, type ViewStyle } from 'react-native';
import type { RefObject } from 'react';

import { useSalvarChavePix } from '@/api/chavePix.hooks';
import type { RespostaChavePix, TipoChavePix } from '@/api/tipos';
import { Botao } from '@/components/atoms/Botao';
import { Titulo } from '@/components/atoms/Titulo';
import { CampoSelecao, type OpcaoSelecao } from '@/components/molecules/CampoSelecao';
import { CampoTexto } from '@/components/molecules/CampoTexto';
import { aplicarErroApi, useEnvioUnico, useResumoErros } from '@/components/molecules/formulario';
import { ResumoErros } from '@/components/molecules/ResumoErros';
import { CartaoFormulario, CelulaFormulario } from '@/components/organisms/CartaoFormulario';
import { configuracaoDoCampoPix, rotuloTipoChavePix, TIPOS_CHAVE_PIX } from '@/lib/chavePix';
import { ErroApi } from '@/lib/erros';
import { maximo } from '@/lib/validacao';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

import { encadear } from './camposComuns';

export interface PropsFormularioChavePix {
  /** A chave que já está cadastrada (campos `null` quando não há): vem preenchida no formulário. */
  atual: RespostaChavePix;
  /** O PUT deu 200. Recebe a chave já normalizada pela API. */
  aoSalvar: (salva: RespostaChavePix) => void;
  /** Título do formulário (alvo estável de foco). */
  refTitulo: RefObject<TextoRN | null>;
}

interface Valores {
  tipo: TipoChavePix | '';
  chave: string;
}

// Mesmo limite do e-mail no backend (a maior chave aceita).
export const MAXIMO_CHAVE_PIX = 140;
export const MENSAGEM_ESCOLHER_TIPO = 'Escolha o tipo da chave.';
export const MENSAGEM_INFORMAR_CHAVE = 'Informe a chave Pix.';

// Campo da API → campo do formulário (ADR 0007, CT-03).
const CAMPOS_DA_API = {
  tipo_chave_pix: 'tipo',
  chave_pix: 'chave',
} as const;

const ROTULOS = { tipo: 'Tipo da chave', chave: 'Chave Pix' } as const;

const OPCOES_DE_TIPO: readonly OpcaoSelecao[] = TIPOS_CHAVE_PIX.map((tipo) => ({
  valor: tipo,
  rotulo: rotuloTipoChavePix(tipo),
}));

const validarChave = encadear(
  (valor) => (typeof valor === 'string' && valor.trim() !== '') || MENSAGEM_INFORMAR_CHAVE,
  maximo(MAXIMO_CHAVE_PIX),
);

function valoresDe(atual: RespostaChavePix): Valores {
  return { tipo: atual.tipo_chave_pix ?? '', chave: atual.chave_pix ?? '' };
}

function criarEstilos({ space }: TemaVisual) {
  return {
    raiz: { gap: space[4] } satisfies ViewStyle,
  } as const;
}

export default function FormularioChavePix({
  atual,
  aoSalvar,
  refTitulo,
}: PropsFormularioChavePix) {
  const estilos = useEstilos(criarEstilos);
  const salvarChave = useSalvarChavePix();

  const { control, handleSubmit, setError, clearErrors, setFocus, reset, formState } =
    useForm<Valores>({
      defaultValues: valoresDe(atual),
      mode: 'onSubmit',
      reValidateMode: 'onChange',
      // O foco vai ao resumo de erros (CT-03), não ao primeiro campo.
      shouldFocusError: false,
    });
  const { isSubmitting } = formState;
  const tipo = useWatch({ control, name: 'tipo' });
  const campo = configuracaoDoCampoPix(tipo);

  const resumo = useResumoErros<Valores>({
    setFocus,
    aoTentarDeNovo: (): Promise<void> => enviarUnico(),
    tentando: isSubmitting,
    rotulos: ROTULOS,
  });

  const enviar = handleSubmit(
    async (valores): Promise<void> => {
      resumo.limpar();
      // A validação já garantiu o tipo; a checagem satisfaz o TypeScript sem `!`.
      if (valores.tipo === '') return;
      let salva: RespostaChavePix;
      try {
        salva = await salvarChave.mutateAsync({
          tipo_chave_pix: valores.tipo,
          chave_pix: valores.chave.trim(),
        });
      } catch (erro) {
        aplicarErroApi<Valores, keyof typeof CAMPOS_DA_API>(
          erro instanceof ErroApi ? erro : ErroApi.falha(),
          {
            setError,
            campos: CAMPOS_DA_API as Readonly<
              Record<keyof typeof CAMPOS_DA_API, FieldPath<Valores>>
            >,
            definirResumo: resumo.definirResumo,
            focarResumo: resumo.focarResumo,
          },
        );
        return;
      }
      // O formulário passa a mostrar a chave normalizada que a API gravou.
      reset(valoresDe(salva));
      aoSalvar(salva);
    },
    (erros) => resumo.aoInvalidar(erros),
  );
  // Clique duplo, Enter + clique e "Tentar de novo" = uma requisição por vez (CT-01).
  const enviarUnico = useEnvioUnico((): Promise<void> => enviar());

  const nome = atual.chave_pix === null ? 'Cadastrar chave Pix' : 'Trocar chave Pix';

  return (
    <View style={estilos.raiz}>
      <Titulo nivel={2} ref={refTitulo} tabIndex={-1}>
        {nome}
      </Titulo>
      <CartaoFormulario
        nome={nome}
        resumo={<ResumoErros {...resumo.props} />}
        aoEnviar={enviarUnico}
        acoes={
          <Botao
            tamanho="lg"
            icone="send"
            carregando={isSubmitting}
            rotuloCarregando="Salvando…"
            aoPressionar={enviarUnico}
          >
            Salvar chave Pix
          </Botao>
        }
      >
        <CelulaFormulario cheia>
          <Controller
            control={control}
            name="tipo"
            rules={{ validate: (valor) => valor !== '' || MENSAGEM_ESCOLHER_TIPO }}
            render={({ field, fieldState }) => (
              <CampoSelecao
                id="chave-pix-tipo"
                rotulo={ROTULOS.tipo}
                textoVazio="Escolha o tipo da chave"
                opcoes={OPCOES_DE_TIPO}
                valor={field.value}
                aoMudar={(valor) => {
                  field.onChange(valor);
                  // O erro da chave (ex.: "inválida para o tipo cpf") era do tipo anterior: não vale
                  // mais, nem no campo (aria-invalid) nem no resumo. A API revalida no próximo envio.
                  clearErrors('chave');
                  resumo.limpar();
                }}
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
            name="chave"
            rules={{ validate: validarChave }}
            render={({ field, fieldState }) => (
              <CampoTexto
                id="chave-pix-chave"
                rotulo={ROTULOS.chave}
                ajuda={campo.ajuda}
                inputMode={campo.inputMode}
                autoComplete={campo.autoComplete}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                value={field.value}
                onChangeText={field.onChange}
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
