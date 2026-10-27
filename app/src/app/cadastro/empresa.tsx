// Cadastro de empresa (MVP-05, card 016). Público. Com 201 entra sozinho com as mesmas credenciais
// e abre "Minhas cargas" (D-PO-01). Se o login falhar, vai ao login com o e-mail preenchido.
import { useRouter, type Href } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';

import { cadastrarEmpresa } from '@/api/sessao';
import type { CorpoCadastroEmpresa } from '@/api/tipos';
import { Botao } from '@/components/atoms/Botao';
import { aplicarErroApi, useEnvioUnico, useResumoErros } from '@/components/molecules/formulario';
import { CampoSenha } from '@/components/molecules/CampoSenha';
import { CampoTexto } from '@/components/molecules/CampoTexto';
import { ResumoErros } from '@/components/molecules/ResumoErros';
import { CartaoFormulario, CelulaFormulario } from '@/components/organisms/CartaoFormulario';
import { TemplateFormulario } from '@/components/templates/TemplateFormulario';
import { ErroApi } from '@/lib/erros';
import { digitos, email as validarEmail, MAX, maximo, minimo, obrigatorio } from '@/lib/validacao';
import { useRedirecionarSeAutenticado } from '@/state/sessao/useRedirecionarSeAutenticado';
import { useSessao } from '@/state/sessao/useSessao';

// D-PO-14: a senha tem no mínimo 8 caracteres; o CNPJ, 14 dígitos (com ou sem pontuação).
const MINIMO_SENHA = 8;
const DIGITOS_CNPJ = 14;

type FormularioEmpresa = {
  email: string;
  senha: string;
  razaoSocial: string;
  cnpj: string;
};

// Campo da API (nome do JSON, usado nas mensagens 400) → campo do formulário.
const CAMPOS_DA_API = {
  email: 'email',
  senha: 'senha',
  razao_social: 'razaoSocial',
  cnpj: 'cnpj',
} as const;

// Rótulo de cada campo no resumo de erros ("E-mail: Preencha este campo.").
const ROTULOS = {
  email: 'E-mail',
  senha: 'Senha',
  razaoSocial: 'Razão social',
  cnpj: 'CNPJ',
} as const;

const REGRAS = {
  email: { validate: { obrigatorio, email: validarEmail, maximo: maximo(MAX.email) } },
  senha: { validate: { obrigatorio, minimo: minimo(MINIMO_SENHA) } },
  razaoSocial: { validate: { obrigatorio, maximo: maximo(MAX.razao_social) } },
  cnpj: { validate: { obrigatorio, digitos: digitos(DIGITOS_CNPJ) } },
};

// Rota pública de login, ainda do card 015: fora do tipo de rota gerado até ele entrar.
const ROTA_ENTRAR = '/entrar';

export default function CadastroEmpresa() {
  // Rota pública: com sessão autenticada, abre a área do perfil (ADR 0006).
  useRedirecionarSeAutenticado();
  const router = useRouter();
  const { entrar } = useSessao();

  const form = useForm<FormularioEmpresa>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { email: '', senha: '', razaoSocial: '', cnpj: '' },
  });

  // `enviar` e o resumo se referenciam; a chamada só acontece depois de a tela montar.
  const resumo = useResumoErros<FormularioEmpresa>({
    setFocus: form.setFocus,
    aoTentarDeNovo: (): Promise<void> => enviar(),
    tentando: form.formState.isSubmitting,
    rotulos: ROTULOS,
  });

  async function aoValido(dados: FormularioEmpresa) {
    resumo.limpar();
    const corpo: CorpoCadastroEmpresa = {
      email: dados.email.trim(),
      senha: dados.senha,
      razao_social: dados.razaoSocial.trim(),
      cnpj: dados.cnpj.trim(),
    };

    try {
      await cadastrarEmpresa(corpo);
    } catch (erro) {
      const erroApi = erro instanceof ErroApi ? erro : ErroApi.falha();
      // 409 (e-mail ou CNPJ já cadastrado): a senha sai do campo; o resto continua preenchido (MVP-05).
      if (erroApi.status === 409) form.setValue('senha', '');
      aplicarErroApi(erroApi, {
        setError: form.setError,
        campos: CAMPOS_DA_API,
        definirResumo: resumo.definirResumo,
        focarResumo: resumo.focarResumo,
      });
      return;
    }

    // 201: entra com as mesmas credenciais. `entrar` abre a área da empresa sozinho.
    try {
      await entrar(corpo.email, corpo.senha);
    } catch {
      router.replace(`${ROTA_ENTRAR}?email=${encodeURIComponent(corpo.email)}` as Href);
    }
  }

  const enviar: () => Promise<void> = form.handleSubmit(aoValido, resumo.aoInvalidar);
  // Um envio de cada vez: clique duplo, toque + Enter ou Enter repetido geram 1 requisição (CT-01).
  const submeter = useEnvioUnico(() => enviar());
  const enviando = form.formState.isSubmitting;

  return (
    <TemplateFormulario
      titulo="Cadastro de empresa"
      descricao="Para publicar cargas e receber propostas."
      voltar={{ href: '/cadastro', rotulo: 'Voltar' }}
    >
      <CartaoFormulario
        nome="Cadastro de empresa"
        resumo={<ResumoErros {...resumo.props} />}
        aoEnviar={submeter}
        acoes={
          <Botao carregando={enviando} rotuloCarregando="Criando conta…" aoPressionar={submeter}>
            Criar conta
          </Botao>
        }
      >
        <CelulaFormulario>
          <Controller
            control={form.control}
            name="email"
            rules={REGRAS.email}
            render={({ field, fieldState }) => (
              <CampoTexto
                rotulo="E-mail"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect={false}
                inputMode="email"
                textContentType="emailAddress"
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
            control={form.control}
            name="senha"
            rules={REGRAS.senha}
            render={({ field, fieldState }) => (
              <CampoSenha
                rotulo="Senha"
                ajuda={`Mínimo de ${MINIMO_SENHA} caracteres.`}
                tipo="nova-senha"
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
            control={form.control}
            name="razaoSocial"
            rules={REGRAS.razaoSocial}
            render={({ field, fieldState }) => (
              <CampoTexto
                rotulo="Razão social"
                autoComplete="off"
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
            control={form.control}
            name="cnpj"
            rules={REGRAS.cnpj}
            render={({ field, fieldState }) => (
              <CampoTexto
                rotulo="CNPJ"
                ajuda="Pode digitar com ou sem pontuação."
                inputMode="numeric"
                autoComplete="off"
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
    </TemplateFormulario>
  );
}
