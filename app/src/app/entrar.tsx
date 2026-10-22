import { useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Platform, View, type TextInput, type ViewStyle } from 'react-native';

import { Botao } from '@/components/atoms/Botao';
import { DivisorEstrada } from '@/components/atoms/DivisorEstrada';
import { Link } from '@/components/atoms/Link';
import { Texto } from '@/components/atoms/Texto';
import { Banner } from '@/components/molecules/Banner';
import { CampoSenha } from '@/components/molecules/CampoSenha';
import { CampoTexto } from '@/components/molecules/CampoTexto';
import { aplicarErroApi, useEnvioUnico, useResumoErros } from '@/components/molecules/formulario';
import { ResumoErros } from '@/components/molecules/ResumoErros';
import { CartaoFormulario, CelulaFormulario } from '@/components/organisms/CartaoFormulario';
import { TemplateAutenticacao } from '@/components/templates/TemplateAutenticacao';
import { anunciar } from '@/lib/a11y';
import type { AvisoSessao } from '@/lib/areas';
import { ErroApi } from '@/lib/erros';
import { email as validarEmail, obrigatorio } from '@/lib/validacao';
import { useRedirecionarSeAutenticado } from '@/state/sessao/useRedirecionarSeAutenticado';
import { useSessao } from '@/state/sessao/useSessao';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

// Login (MVP-03) e aviso de sessão (MVP-04, CT-04). Esta é a referência de formulário do app (ADR 0007).

interface Valores {
  email: string;
  senha: string;
}

/** D-PO-11: 401 do `POST /login` é erro do formulário, nunca "sessão expirada". */
const MENSAGEM_CREDENCIAIS = 'E-mail ou senha inválidos';

// Campo da API → campo do formulário (ADR 0007).
const CAMPOS_DA_API = { email: 'email', senha: 'senha' } as const;
const ROTULOS = { email: 'E-mail', senha: 'Senha' } as const;

const AVISOS: Record<AvisoSessao, { titulo: string; texto: string }> = {
  'sessao-expirada': { titulo: 'Sua sessão expirou.', texto: 'Entre de novo.' },
  'conta-nao-encontrada': {
    titulo: 'Não encontramos sua conta.',
    texto: 'Ela pode ter sido removida. Entre com outra conta ou crie uma nova.',
  },
  'sem-conexao': {
    titulo: 'Não foi possível confirmar sua sessão.',
    texto: 'Confira sua conexão e entre de novo.',
  },
};

// `false` no HTML estático e na hidratação, `true` depois (sem useEffect + setState).
const semAssinatura = () => () => undefined;

const CRIAR_CONTA = '/cadastro' as Href;

/** Só os avisos conhecidos valem: o texto nunca vem da URL. */
function avisoDaConsulta(valor: string | string[] | undefined): AvisoSessao | null {
  const chave = Array.isArray(valor) ? valor[0] : valor;
  return (Object.keys(AVISOS) as AvisoSessao[]).find((aviso) => aviso === chave) ?? null;
}

function primeiro(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? '';
}

/** Vazio ou formato inválido: a primeira mensagem que falhar (D-PO-14). */
function validarEmailObrigatorio(valor: unknown): true | string {
  const vazio = obrigatorio(valor);
  return vazio === true ? validarEmail(valor) : vazio;
}

function traduzirErro(erro: unknown): ErroApi {
  if (!(erro instanceof ErroApi)) return ErroApi.falha();
  if (erro.tipo === 'mensagem' && erro.status === 401) {
    return new ErroApi({ tipo: 'mensagem', status: 401, mensagens: [MENSAGEM_CREDENCIAIS] });
  }
  return erro;
}

function criarEstilos({ space }: TemaVisual) {
  return {
    criarConta: { gap: space[3] } satisfies ViewStyle,
  } as const;
}

export default function Entrar() {
  const estilos = useEstilos(criarEstilos);
  const { entrar } = useSessao();
  // Quem já tem sessão vai direto à sua área (em efeito, depois de restaurar).
  useRedirecionarSeAutenticado();

  // A query só é lida depois da hidratação: o HTML estático não conhece a URL do usuário, e assim
  // o aviso entra na tela já montada (o leitor de tela o anuncia) sem divergir do HTML.
  const consulta = useLocalSearchParams<{ aviso?: string; email?: string }>();
  const montado = useSyncExternalStore(
    semAssinatura,
    () => true,
    () => false,
  );
  const aviso = montado ? avisoDaConsulta(consulta.aviso) : null;
  const emailDaConsulta = montado ? primeiro(consulta.email) : '';

  const { control, handleSubmit, setError, setFocus, setValue, formState } = useForm<Valores>({
    defaultValues: { email: '', senha: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  const refSenha = useRef<TextInput>(null);

  // D-PO-01: depois de um cadastro cujo login automático falhou, o e-mail vem preenchido.
  useEffect(() => {
    if (emailDaConsulta !== '') setValue('email', emailDaConsulta);
  }, [emailDaConsulta, setValue]);

  // Aviso de sessão: `role="status"` do Banner e também a região viva, para o leitor de tela dizer.
  useEffect(() => {
    if (aviso !== null) anunciar(`${AVISOS[aviso].titulo} ${AVISOS[aviso].texto}`);
  }, [aviso]);

  const resumo = useResumoErros<Valores>({
    setFocus,
    // `enviarUnico` é declarado logo abaixo; o botão "Tentar de novo" só é tocado depois do render.
    aoTentarDeNovo: (): Promise<void> => enviarUnico(),
    tentando: formState.isSubmitting,
    rotulos: ROTULOS,
  });

  const enviar = handleSubmit(
    async ({ email, senha }): Promise<void> => {
      resumo.limpar();
      try {
        await entrar(email.trim(), senha);
      } catch (erro) {
        aplicarErroApi(traduzirErro(erro), {
          setError,
          campos: CAMPOS_DA_API,
          definirResumo: resumo.definirResumo,
          focarResumo: resumo.focarResumo,
        });
      }
    },
    (erros) => resumo.aoInvalidar(erros),
  );
  // Clique duplo, Enter + clique e "Tentar de novo" = uma requisição por vez (CT-01).
  const enviarUnico = useEnvioUnico((): Promise<void> => enviar());

  // No iPhone o botão do teclado avança/envia; na web o Enter já envia pelo formulário.
  const nativo = Platform.OS !== 'web';

  return (
    <TemplateAutenticacao
      titulo="Entrar"
      descricao="Use o e-mail e a senha da sua conta."
      aviso={
        aviso !== null ? (
          <Banner variante="aviso" titulo={AVISOS[aviso].titulo}>
            {AVISOS[aviso].texto}
          </Banner>
        ) : undefined
      }
    >
      <CartaoFormulario
        nome="Entrar"
        resumo={<ResumoErros {...resumo.props} />}
        aoEnviar={enviarUnico}
        acoes={
          <Botao
            tamanho="lg"
            bloco
            icone="arrow-right"
            carregando={formState.isSubmitting}
            rotuloCarregando="Entrando…"
            aoPressionar={enviarUnico}
          >
            Entrar
          </Botao>
        }
      >
        <CelulaFormulario cheia>
          <Controller
            control={control}
            name="email"
            rules={{ validate: validarEmailObrigatorio }}
            render={({ field, fieldState }) => (
              <CampoTexto
                rotulo="E-mail"
                autoComplete="email"
                inputMode="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                returnKeyType="next"
                onSubmitEditing={nativo ? () => refSenha.current?.focus() : undefined}
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
            name="senha"
            rules={{ validate: obrigatorio }}
            render={({ field, fieldState }) => (
              <CampoSenha
                rotulo="Senha"
                tipo="senha-atual"
                returnKeyType="go"
                onSubmitEditing={nativo ? () => void enviarUnico() : undefined}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                ref={(no) => {
                  field.ref(no);
                  refSenha.current = no;
                }}
                erro={fieldState.error?.message}
              />
            )}
          />
        </CelulaFormulario>
      </CartaoFormulario>
      <DivisorEstrada variante="cinza" />
      <View style={estilos.criarConta}>
        <Texto cor="secundario">Ainda não tem conta?</Texto>
        <Link
          href={CRIAR_CONTA}
          variante="botao"
          aparencia={{ variante: 'secundario', bloco: true }}
        >
          Criar conta
        </Link>
      </View>
    </TemplateAutenticacao>
  );
}
