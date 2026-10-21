import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Controller, useForm } from 'react-hook-form';
import type { TextInput } from 'react-native';

import { Botao } from '@/components/atoms/Botao';
import { CartaoFormulario, CelulaFormulario } from '@/components/organisms/CartaoFormulario';
import { moverFoco } from '@/lib/a11y';
import { ErroApi, MENSAGEM_FALHA, MENSAGEM_SESSAO_EXPIRADA } from '@/lib/erros';
import { digitos, email as validarEmail, minimo, obrigatorio } from '@/lib/validacao';
import { renderizar } from '@/test-utils/renderComTema';

import { CampoSenha } from './CampoSenha';
import { CampoTexto } from './CampoTexto';
import { aplicarErroApi, itensDeErros, useEnvioUnico, useResumoErros } from './formulario';
import { ResumoErros } from './ResumoErros';

// moverFoco usa findNodeHandle (sem efeito no renderer de teste): espiado para ver quem recebe o foco.
jest.mock('@/lib/a11y', () => ({ ...jest.requireActual('@/lib/a11y'), moverFoco: jest.fn() }));

const moverFocoMock = jest.mocked(moverFoco);

function erroApi(tipo: ErroApi['tipo'], mensagens: string[], status = 400) {
  return new ErroApi({ tipo, status, mensagens });
}

describe('aplicarErroApi', () => {
  const CAMPOS = { cpf: 'cpf', email: 'email', nome_completo: 'nomeCompleto' } as const;

  function opcoes() {
    return {
      setError: jest.fn(),
      campos: CAMPOS,
      definirResumo: jest.fn(),
      focarResumo: jest.fn(),
    };
  }

  it('validacao: a mensagem que começa com o campo vai ao campo, a outra ao resumo, foco no resumo (CT-03)', () => {
    const o = opcoes();
    const resultado = aplicarErroApi(
      erroApi('validacao', ['cpf deve ter 11 dígitos', 'erro geral']),
      o as never,
    );

    expect(o.setError).toHaveBeenCalledTimes(1);
    expect(o.setError).toHaveBeenCalledWith('cpf', {
      type: 'servidor',
      message: 'cpf deve ter 11 dígitos',
    });
    expect(o.definirResumo).toHaveBeenCalledWith(['erro geral']);
    expect(o.focarResumo).toHaveBeenCalledTimes(1);
    expect(resultado).toEqual({ camposComErro: ['cpf'], mensagensDoResumo: ['erro geral'] });
  });

  it('validacao só de campos: sem resumo; o primeiro campo com erro recebe o foco', () => {
    const o = opcoes();
    aplicarErroApi(
      erroApi('validacao', ['email deve ser válido', 'nome_completo é obrigatório']),
      o as never,
    );

    expect(o.setError).toHaveBeenNthCalledWith(
      1,
      'email',
      { type: 'servidor', message: 'email deve ser válido' },
      { shouldFocus: true },
    );
    // O nome do campo da API vira o do formulário (nome_completo → nomeCompleto) e não foca de novo.
    expect(o.setError).toHaveBeenNthCalledWith(2, 'nomeCompleto', {
      type: 'servidor',
      message: 'nome_completo é obrigatório',
    });
    expect(o.definirResumo).toHaveBeenCalledWith([]);
    expect(o.focarResumo).not.toHaveBeenCalled();
  });

  it('validacao com campo que o formulário não tem: vai ao resumo', () => {
    const o = opcoes();
    aplicarErroApi(erroApi('validacao', ['placa inválida']), o as never);
    expect(o.setError).not.toHaveBeenCalled();
    expect(o.definirResumo).toHaveBeenCalledWith(['placa inválida']);
    expect(o.focarResumo).toHaveBeenCalledTimes(1);
  });

  it('mensagem (409): o texto da API vai ao resumo, com foco', () => {
    const o = opcoes();
    aplicarErroApi(erroApi('mensagem', ['E-mail já cadastrado'], 409), o as never);
    expect(o.setError).not.toHaveBeenCalled();
    expect(o.definirResumo).toHaveBeenCalledWith(['E-mail já cadastrado']);
    expect(o.focarResumo).toHaveBeenCalledTimes(1);
  });

  it('falha (500, rede): "Algo deu errado. Tente de novo." no resumo, com foco', () => {
    const o = opcoes();
    aplicarErroApi(ErroApi.falha(500), o as never);
    expect(o.definirResumo).toHaveBeenCalledWith([MENSAGEM_FALHA]);
    expect(o.focarResumo).toHaveBeenCalledTimes(1);
  });

  it('sessao: o texto de sessão expirada no resumo', () => {
    const o = opcoes();
    aplicarErroApi(erroApi('sessao', [MENSAGEM_SESSAO_EXPIRADA], 401), o as never);
    expect(o.definirResumo).toHaveBeenCalledWith([MENSAGEM_SESSAO_EXPIRADA]);
    expect(o.setError).not.toHaveBeenCalled();
  });

  it('cpf_responsavel não cai em cpf (nome mais longo primeiro)', () => {
    const o = { ...opcoes(), campos: { cpf: 'cpf', cpf_responsavel: 'cpfResponsavel' } as const };
    aplicarErroApi(erroApi('validacao', ['cpf_responsavel deve ter 11 dígitos']), o as never);
    expect(o.setError).toHaveBeenCalledWith(
      'cpfResponsavel',
      { type: 'servidor', message: 'cpf_responsavel deve ter 11 dígitos' },
      { shouldFocus: true },
    );
  });
});

describe('itensDeErros', () => {
  it('converte os erros do react-hook-form em itens, na ordem, ignorando os sem mensagem', () => {
    expect(
      itensDeErros({
        email: { type: 'validate', message: 'Informe um e-mail válido.' },
        cpf: { type: 'validate' },
        senha: { type: 'validate', message: 'Use pelo menos 8 caracteres.' },
      } as never),
    ).toEqual([
      { campo: 'email', mensagem: 'Informe um e-mail válido.' },
      { campo: 'senha', mensagem: 'Use pelo menos 8 caracteres.' },
    ]);
  });
});

type Dados = { email: string; senha: string; cpf: string };
const CAMPOS_API = { email: 'email', senha: 'senha', cpf: 'cpf' } as const;

type Elementos = Partial<Record<keyof Dados, TextInput | null>>;

/** Formulário de referência: o padrão que as telas de login e cadastro seguem (ADR 0007). */
function FormularioDeTeste({
  enviar,
  elementos,
}: {
  enviar: (dados: Dados) => Promise<unknown>;
  elementos: Elementos;
}) {
  const { control, handleSubmit, setError, setFocus, formState } = useForm<Dados>({
    defaultValues: { email: '', senha: '', cpf: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: false,
  });
  const resumo = useResumoErros<Dados>({
    setFocus,
    aoTentarDeNovo: () => submeter(),
    tentando: formState.isSubmitting,
  });

  const submeter = useEnvioUnico(async () => {
    resumo.limpar();
    await handleSubmit(async (dados) => {
      try {
        await enviar(dados);
      } catch (erro) {
        if (!(erro instanceof ErroApi)) throw erro;
        aplicarErroApi(erro, { setError, campos: CAMPOS_API, ...resumo });
      }
    }, resumo.aoInvalidar)();
  });

  return (
    <CartaoFormulario
      nome="Entrar"
      resumo={<ResumoErros {...resumo.props} />}
      aoEnviar={submeter}
      acoes={
        <Botao
          carregando={formState.isSubmitting}
          rotuloCarregando="Entrando…"
          aoPressionar={submeter}
        >
          Entrar
        </Botao>
      }
    >
      <CelulaFormulario cheia>
        <Controller
          control={control}
          name="email"
          rules={{ validate: { obrigatorio, validarEmail } }}
          render={({ field, fieldState }) => (
            <CampoTexto
              rotulo="E-mail"
              autoComplete="email"
              inputMode="email"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              ref={(el) => {
                field.ref(el);
                elementos.email = el;
              }}
              erro={fieldState.error?.message}
            />
          )}
        />
      </CelulaFormulario>
      <CelulaFormulario>
        <Controller
          control={control}
          name="senha"
          rules={{ validate: { obrigatorio, minimo: minimo(8) } }}
          render={({ field, fieldState }) => (
            <CampoSenha
              rotulo="Senha"
              tipo="nova-senha"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              ref={(el) => {
                field.ref(el);
                elementos.senha = el;
              }}
              erro={fieldState.error?.message}
            />
          )}
        />
      </CelulaFormulario>
      <CelulaFormulario>
        <Controller
          control={control}
          name="cpf"
          rules={{ validate: { obrigatorio, digitos: digitos(11) } }}
          render={({ field, fieldState }) => (
            <CampoTexto
              rotulo="CPF"
              inputMode="numeric"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              ref={(el) => {
                field.ref(el);
                elementos.cpf = el;
              }}
              erro={fieldState.error?.message}
            />
          )}
        />
      </CelulaFormulario>
    </CartaoFormulario>
  );
}

function alertas() {
  return screen.container.queryAll((el) => el.props.role === 'alert');
}

async function preencherValido() {
  await fireEvent.changeText(screen.getByLabelText('E-mail'), 'joao@exemplo.com');
  await fireEvent.changeText(screen.getByLabelText('Senha'), 'senhaSegura8');
  await fireEvent.changeText(screen.getByLabelText('CPF'), '123.456.789-01');
}

async function montarFormulario(enviar: (dados: Dados) => Promise<unknown>) {
  const elementos: Elementos = {};
  await renderizar(<FormularioDeTeste enviar={enviar} elementos={elementos} />);
  return elementos;
}

beforeEach(() => moverFocoMock.mockClear());

describe('formulário com react-hook-form', () => {
  it('erro local não chama o envio: mostra o erro em cada campo e o resumo, com foco no resumo', async () => {
    const enviar = jest.fn().mockResolvedValue(undefined);
    await montarFormulario(enviar);

    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(enviar).not.toHaveBeenCalled();
    expect(screen.getByText('Corrija 3 campos para continuar.')).toBeOnTheScreen();
    expect(alertas()).toHaveLength(1);
    // Cada campo com o seu erro, ligado por aria-describedby, e o mesmo texto no link do resumo.
    expect(screen.getByLabelText('E-mail').props['aria-invalid']).toBe(true);
    expect(screen.getByLabelText('Senha').props['aria-invalid']).toBe(true);
    expect(screen.getAllByText('Preencha este campo.')).toHaveLength(6);
    // O foco vai ao resumo (o Banner de erro), não ao primeiro campo.
    await waitFor(() => expect(moverFocoMock).toHaveBeenCalledTimes(1));
    expect(moverFocoMock.mock.calls[0]?.[0].current).not.toBeNull();
  });

  it('valida cada campo com os validadores de src/lib/validacao', async () => {
    const enviar = jest.fn().mockResolvedValue(undefined);
    await montarFormulario(enviar);
    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'sem-arroba');
    await fireEvent.changeText(screen.getByLabelText('Senha'), '1234567');
    await fireEvent.changeText(screen.getByLabelText('CPF'), '123');

    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(enviar).not.toHaveBeenCalled();
    expect(screen.getAllByText('Informe um e-mail válido.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Use pelo menos 8 caracteres.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Informe 11 dígitos.').length).toBeGreaterThan(0);
  });

  it('o link do resumo foca o campo certo', async () => {
    const elementos = await montarFormulario(jest.fn());
    const focarCpf = jest.fn();
    elementos.cpf!.focus = focarCpf;
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    await fireEvent.press(links[2]!);

    // O setFocus do react-hook-form foca num setTimeout.
    await waitFor(() => expect(focarCpf).toHaveBeenCalledTimes(1));
  });

  it('dados válidos: envia uma vez, com os dados digitados', async () => {
    const enviar = jest.fn().mockResolvedValue(undefined);
    await montarFormulario(enviar);
    await preencherValido();

    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(1));
    expect(enviar).toHaveBeenCalledWith({
      email: 'joao@exemplo.com',
      senha: 'senhaSegura8',
      cpf: '123.456.789-01',
    });
    expect(alertas()).toHaveLength(0);
  });

  it('clique duplo = 1 requisição, e o botão mostra "Entrando…" enquanto espera', async () => {
    let concluir: () => void = () => {};
    const enviar = jest.fn(
      () =>
        new Promise<void>((resolver) => {
          concluir = resolver;
        }),
    );
    await montarFormulario(enviar);
    await preencherValido();

    const botao = screen.getByRole('button', { name: 'Entrar' });
    await fireEvent.press(botao);
    await fireEvent.press(botao);
    await fireEvent.press(botao);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Entrando…' })).toBeBusy());
    expect(enviar).toHaveBeenCalledTimes(1);

    await act(async () => concluir());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Entrar' })).toBeOnTheScreen());
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it('400 com campo e erro geral: o campo mostra o erro, o resumo o texto geral, foco no resumo, dados mantidos', async () => {
    const enviar = jest
      .fn()
      .mockRejectedValue(erroApi('validacao', ['cpf deve ter 11 dígitos', 'erro geral']));
    await montarFormulario(enviar);
    await preencherValido();

    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(screen.getByText('cpf deve ter 11 dígitos')).toBeOnTheScreen());
    expect(screen.getByLabelText('CPF').props['aria-invalid']).toBe(true);
    expect(screen.getByLabelText('CPF').props.value).toBe('123.456.789-01');
    expect(screen.getByLabelText('E-mail').props.value).toBe('joao@exemplo.com');
    expect(screen.getByText('erro geral')).toBeOnTheScreen();
    expect(alertas()).toHaveLength(1);
    await waitFor(() => expect(moverFocoMock).toHaveBeenCalledTimes(1));
  });

  it('400 só de campo: sem resumo, o foco vai ao campo', async () => {
    const enviar = jest.fn().mockRejectedValue(erroApi('validacao', ['email já está em uso']));
    const elementos = await montarFormulario(enviar);
    const focar = jest.fn();
    elementos.email!.focus = focar;
    await preencherValido();

    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(screen.getByText('email já está em uso')).toBeOnTheScreen());
    expect(alertas()).toHaveLength(0);
    expect(focar).toHaveBeenCalled();
    expect(moverFocoMock).not.toHaveBeenCalled();
  });

  it('409: o texto da API fica no resumo e os dados continuam', async () => {
    const enviar = jest.fn().mockRejectedValue(erroApi('mensagem', ['E-mail já cadastrado'], 409));
    await montarFormulario(enviar);
    await preencherValido();

    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(screen.getByText('E-mail já cadastrado')).toBeOnTheScreen());
    expect(alertas()).toHaveLength(1);
    expect(screen.queryByText('Tentar de novo')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Senha').props.value).toBe('senhaSegura8');
  });

  it('falha: "Algo deu errado." com "Tentar de novo", que reenvia', async () => {
    const enviar = jest.fn().mockRejectedValueOnce(ErroApi.falha(500)).mockResolvedValue(undefined);
    await montarFormulario(enviar);
    await preencherValido();

    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(screen.getByText(MENSAGEM_FALHA)).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText(MENSAGEM_FALHA)).not.toBeOnTheScreen());
  });

  it('um novo envio limpa o resumo do anterior', async () => {
    const enviar = jest.fn().mockRejectedValueOnce(erroApi('mensagem', ['Conta bloqueada'], 409));
    enviar.mockResolvedValue(undefined);
    await montarFormulario(enviar);
    await preencherValido();

    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(screen.getByText('Conta bloqueada')).toBeOnTheScreen());

    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(screen.queryByText('Conta bloqueada')).not.toBeOnTheScreen());
  });
});
