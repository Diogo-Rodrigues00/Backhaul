// Cadastro de motorista (MVP-06, D-PO-01, D-PO-14). Oito campos, sem passos extras: Enter avança
// de campo em campo e, no último, envia. Depois do 201 o app entra sozinho e abre "Cargas próximas".
import { useRouter, type Href } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';

import { useCadastrarMotorista } from '@/api/sessao';
import { Botao } from '@/components/atoms/Botao';
import { CampoNumero } from '@/components/molecules/CampoNumero';
import { CampoSenha } from '@/components/molecules/CampoSenha';
import { CampoTexto } from '@/components/molecules/CampoTexto';
import { aplicarErroApi, useEnvioUnico, useResumoErros } from '@/components/molecules/formulario';
import { ResumoErros } from '@/components/molecules/ResumoErros';
import { CartaoFormulario, CelulaFormulario } from '@/components/organisms/CartaoFormulario';
import { TemplateFormulario } from '@/components/templates/TemplateFormulario';
import {
  CAMPOS_DA_API,
  paraCorpoCadastroMotorista,
  type DadosCadastroMotorista,
} from '@/lib/cadastroMotorista';
import { ErroApi, MENSAGEM_FALHA } from '@/lib/erros';
import {
  digitos,
  email as emailValido,
  maximo,
  MAX,
  minimo,
  numeroPositivo,
  numeroSemAmbiguidade,
  obrigatorio,
} from '@/lib/validacao';
import { useRedirecionarSeAutenticado } from '@/state/sessao/useRedirecionarSeAutenticado';
import { useSessao } from '@/state/sessao/useSessao';

type Campo = keyof DadosCadastroMotorista;

// Ordem visual = ordem do Enter e do Tab. O último campo envia.
const ORDEM: readonly Campo[] = [
  'email',
  'senha',
  'nomeCompleto',
  'cpf',
  'cnh',
  'veiculoTipo',
  'veiculoPlaca',
  'capacidadeKg',
];

// Nome de cada campo no resumo de erros ("E-mail: Preencha este campo.").
const ROTULOS: Record<Campo, string> = {
  email: 'E-mail',
  senha: 'Senha',
  nomeCompleto: 'Nome completo',
  cpf: 'CPF',
  cnh: 'CNH',
  veiculoTipo: 'Tipo de veículo',
  veiculoPlaca: 'Placa',
  capacidadeKg: 'Capacidade em kg',
};

// Regras de D-PO-14 (espelham o backend; os tamanhos máximos vêm de `MAX` em validacao.ts).
const REGRAS = {
  email: { validate: { obrigatorio, email: emailValido, maximo: maximo(MAX.email) } },
  senha: { validate: { obrigatorio, minimo: minimo(8) } },
  nomeCompleto: { validate: { obrigatorio, maximo: maximo(MAX.nome_completo) } },
  cpf: { validate: { obrigatorio, digitos: digitos(11) } },
  cnh: { validate: { obrigatorio, maximo: maximo(MAX.cnh) } },
  veiculoTipo: { validate: { obrigatorio, maximo: maximo(MAX.veiculo_tipo) } },
  veiculoPlaca: { validate: { obrigatorio, maximo: maximo(MAX.veiculo_placa) } },
  capacidadeKg: { validate: { obrigatorio, numeroPositivo, numeroSemAmbiguidade } },
};

const VALORES_INICIAIS: DadosCadastroMotorista = {
  email: '',
  senha: '',
  nomeCompleto: '',
  cpf: '',
  cnh: '',
  veiculoTipo: '',
  veiculoPlaca: '',
  capacidadeKg: '',
};

export default function CadastroMotorista() {
  // Com sessão aberta, esta tela não serve: vai para a área do perfil (ADR 0006).
  useRedirecionarSeAutenticado();
  const router = useRouter();
  const { entrar } = useSessao();
  const cadastrar = useCadastrarMotorista();

  const {
    control,
    handleSubmit,
    setError,
    setFocus,
    setValue,
    formState: { isSubmitting },
  } = useForm<DadosCadastroMotorista>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: VALORES_INICIAIS,
  });

  const resumo = useResumoErros<DadosCadastroMotorista>({
    setFocus,
    rotulos: ROTULOS,
  });

  async function aoValido(dados: DadosCadastroMotorista) {
    resumo.limpar();
    try {
      await cadastrar.mutateAsync(paraCorpoCadastroMotorista(dados));
    } catch (erro) {
      const erroApi =
        erro instanceof ErroApi
          ? erro
          : new ErroApi({ tipo: 'falha', status: null, mensagens: [MENSAGEM_FALHA] });
      aplicarErroApi(erroApi, {
        setError,
        campos: CAMPOS_DA_API,
        definirResumo: resumo.definirResumo,
        focarResumo: resumo.focarResumo,
      });
      // 409: a senha sai do formulário; os demais dados continuam (MVP-06).
      if (erroApi.status === 409) setValue('senha', '');
      return;
    }

    // 201 (D-PO-01): entra com as mesmas credenciais. Se o login falhar, vai ao login com o e-mail.
    try {
      await entrar(dados.email.trim(), dados.senha);
    } catch {
      const email = encodeURIComponent(dados.email.trim());
      router.replace(`/entrar?email=${email}` as Href);
    }
  }

  // Depois de `aoValido`: o envio único que o botão e o "Tentar de novo" usam.
  const enviarUnico = useEnvioUnico(() => handleSubmit(aoValido, resumo.aoInvalidar)());

  // Enter num campo leva o foco ao próximo; no último, envia. O CartaoFormulario não recebe
  // `aoEnviar`: o listener dele enviaria a partir de qualquer campo.
  function aoEnterNoCampo(campo: Campo) {
    const proximo = ORDEM[ORDEM.indexOf(campo) + 1];
    if (proximo === undefined) {
      void enviarUnico();
      return;
    }
    setFocus(proximo);
  }

  return (
    <TemplateFormulario
      titulo="Cadastro de motorista"
      descricao="Seus dados e os do veículo. Leva cerca de um minuto."
    >
      <CartaoFormulario
        nome="Cadastro de motorista"
        resumo={
          <ResumoErros
            {...resumo.props}
            aoTentarDeNovo={
              resumo.props.mensagens?.includes(MENSAGEM_FALHA) ? () => enviarUnico() : undefined
            }
            tentando={isSubmitting}
          />
        }
        acoes={
          <Botao
            tamanho="lg"
            // Sem devolver a Promise: `enviarUnico` já evita envio duplo, e o toque não fica preso a um `act`.
            aoPressionar={() => {
              void enviarUnico();
            }}
            carregando={isSubmitting}
            rotuloCarregando="Criando conta…"
            icone="arrow-right"
          >
            Criar conta
          </Botao>
        }
      >
        <CelulaFormulario cheia>
          <Controller
            control={control}
            name="email"
            rules={REGRAS.email}
            render={({ field, fieldState }) => (
              <CampoTexto
                ref={field.ref}
                rotulo="E-mail"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                erro={fieldState.error?.message}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => aoEnterNoCampo('email')}
              />
            )}
          />
        </CelulaFormulario>

        <CelulaFormulario cheia>
          <Controller
            control={control}
            name="senha"
            rules={REGRAS.senha}
            render={({ field, fieldState }) => (
              <CampoSenha
                ref={field.ref}
                rotulo="Senha"
                tipo="nova-senha"
                ajuda="Mínimo de 8 caracteres."
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                erro={fieldState.error?.message}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => aoEnterNoCampo('senha')}
              />
            )}
          />
        </CelulaFormulario>

        <CelulaFormulario cheia>
          <Controller
            control={control}
            name="nomeCompleto"
            rules={REGRAS.nomeCompleto}
            render={({ field, fieldState }) => (
              <CampoTexto
                ref={field.ref}
                rotulo="Nome completo"
                autoComplete="name"
                textContentType="name"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                erro={fieldState.error?.message}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => aoEnterNoCampo('nomeCompleto')}
              />
            )}
          />
        </CelulaFormulario>

        <CelulaFormulario>
          <Controller
            control={control}
            name="cpf"
            rules={REGRAS.cpf}
            render={({ field, fieldState }) => (
              <CampoTexto
                ref={field.ref}
                rotulo="CPF"
                ajuda="Pode digitar com ou sem pontos e traço."
                inputMode="numeric"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                erro={fieldState.error?.message}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => aoEnterNoCampo('cpf')}
              />
            )}
          />
        </CelulaFormulario>

        <CelulaFormulario>
          <Controller
            control={control}
            name="cnh"
            rules={REGRAS.cnh}
            render={({ field, fieldState }) => (
              <CampoTexto
                ref={field.ref}
                rotulo="CNH"
                inputMode="numeric"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                erro={fieldState.error?.message}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => aoEnterNoCampo('cnh')}
              />
            )}
          />
        </CelulaFormulario>

        <CelulaFormulario>
          <Controller
            control={control}
            name="veiculoTipo"
            rules={REGRAS.veiculoTipo}
            render={({ field, fieldState }) => (
              <CampoTexto
                ref={field.ref}
                rotulo="Tipo de veículo"
                ajuda="Ex.: carreta, truck, toco."
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                erro={fieldState.error?.message}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => aoEnterNoCampo('veiculoTipo')}
              />
            )}
          />
        </CelulaFormulario>

        <CelulaFormulario>
          <Controller
            control={control}
            name="veiculoPlaca"
            rules={REGRAS.veiculoPlaca}
            render={({ field, fieldState }) => (
              <CampoTexto
                ref={field.ref}
                rotulo="Placa"
                autoCapitalize="characters"
                autoCorrect={false}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                erro={fieldState.error?.message}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => aoEnterNoCampo('veiculoPlaca')}
              />
            )}
          />
        </CelulaFormulario>

        <CelulaFormulario cheia>
          <Controller
            control={control}
            name="capacidadeKg"
            rules={REGRAS.capacidadeKg}
            render={({ field, fieldState }) => (
              <CampoNumero
                ref={field.ref}
                rotulo="Capacidade em kg"
                sufixo="kg"
                modo="inteiro"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                erro={fieldState.error?.message}
                returnKeyType="send"
                submitBehavior="submit"
                onSubmitEditing={() => aoEnterNoCampo('capacidadeKg')}
              />
            )}
          />
        </CelulaFormulario>
      </CartaoFormulario>
    </TemplateFormulario>
  );
}
