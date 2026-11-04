// POST /login, GET /eu, POST /cadastro/empresa e POST /cadastro/motorista.
import { http, HttpResponse } from 'msw';

import {
  cpfJaCadastradoMock,
  EMAIL_JA_CADASTRADO_MOCK,
  registrarMotoristaMock,
  TAMANHO_MINIMO_SENHA_MOCK,
  todosUsuariosMock,
} from '../fixtures/usuarios';
import { cnpjValido, cpfValido, placaValida } from '../../src/lib/validacao';
import { respostaErro, respostaErros } from '../respostas';
import { autenticar, eNumeroPositivo, lerCorpo, textoOuVazio } from './comum';

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarCredenciais(corpo: Record<string, unknown>): string[] {
  const erros: string[] = [];
  const email = textoOuVazio(corpo.email);
  const senha = typeof corpo.senha === 'string' ? corpo.senha : '';
  if (!REGEX_EMAIL.test(email)) erros.push('email inválido');
  if (senha.length < TAMANHO_MINIMO_SENHA_MOCK) {
    erros.push(`senha deve ter no mínimo ${TAMANHO_MINIMO_SENHA_MOCK} caracteres`);
  }
  return erros;
}

function exigir(corpo: Record<string, unknown>, campos: string[]): string[] {
  return campos
    .filter((campo) => textoOuVazio(corpo[campo]) === '')
    .map((campo) => `${campo} é obrigatório`);
}

// Mesmas regras e textos de `validarDocumento` e `validarPlaca` em backend/src/validacao.ts.
const REGEX_DOCUMENTO = /^[\d.\-/\s]+$/;

function documento(corpo: Record<string, unknown>, campo: 'cpf' | 'cnpj'): string[] {
  const total = campo === 'cpf' ? 11 : 14;
  const bruto = textoOuVazio(corpo[campo]);
  const limpo = bruto.replace(/\D/g, '');
  if (!REGEX_DOCUMENTO.test(bruto) || limpo.length !== total) {
    return [`${campo} deve ter ${total} dígitos`];
  }
  const valido = campo === 'cpf' ? cpfValido(limpo) : cnpjValido(limpo);
  return valido ? [] : [`${campo} inválido`];
}

function placa(corpo: Record<string, unknown>): string[] {
  return placaValida(textoOuVazio(corpo.veiculo_placa))
    ? []
    : ['veiculo_placa inválida (use ABC1234 ou ABC1D23)'];
}

function emailJaCadastrado(email: string): boolean {
  const minusculo = email.toLowerCase();
  return (
    minusculo === EMAIL_JA_CADASTRADO_MOCK || todosUsuariosMock().some((u) => u.email === minusculo)
  );
}

/** Validação do corpo de POST /cadastro/motorista (compartilhada com o mock com estado do E2E). */
export function validarCadastroMotorista(corpo: Record<string, unknown>): string[] {
  const erros = [
    ...validarCredenciais(corpo),
    ...exigir(corpo, ['nome_completo', 'cnh', 'veiculo_tipo']),
    ...documento(corpo, 'cpf'),
    ...placa(corpo),
  ];
  if (!eNumeroPositivo(corpo.capacidade_kg)) {
    erros.push('capacidade_kg deve ser um número maior que zero');
  }
  return erros;
}

export function criarHandlersSessao(baseUrl: string) {
  return [
    http.post(`${baseUrl}/login`, async ({ request }) => {
      const corpo = await lerCorpo(request);
      const email = textoOuVazio(corpo.email);
      const senha = typeof corpo.senha === 'string' ? corpo.senha : '';
      if (email === '' || senha === '') {
        return respostaErros(400, ['email e senha são obrigatórios']);
      }
      const usuario = todosUsuariosMock().find((u) => u.email === email.toLowerCase());
      if (usuario === undefined || senha.length < TAMANHO_MINIMO_SENHA_MOCK) {
        // Mesma mensagem para e-mail inexistente e senha errada (contrato).
        return respostaErro(401, 'email ou senha inválidos');
      }
      return HttpResponse.json({ token: usuario.token, tipo: usuario.tipo });
    }),

    http.get(`${baseUrl}/eu`, ({ request }) => {
      const { usuario, resposta } = autenticar(request);
      return resposta ?? HttpResponse.json({ usuario: usuario.usuario });
    }),

    http.post(`${baseUrl}/cadastro/empresa`, async ({ request }) => {
      const corpo = await lerCorpo(request);
      const erros = [
        ...validarCredenciais(corpo),
        ...exigir(corpo, ['razao_social']),
        ...documento(corpo, 'cnpj'),
      ];
      if (erros.length > 0) return respostaErros(400, erros);
      const email = textoOuVazio(corpo.email);
      if (emailJaCadastrado(email)) return respostaErro(409, 'email já cadastrado');
      return HttpResponse.json(
        {
          usuario: {
            id: '66666666-6666-4666-8666-666666666666',
            email,
            tipo: 'empresa',
            criado_em: new Date().toISOString(),
          },
        },
        { status: 201 },
      );
    }),

    http.post(`${baseUrl}/cadastro/motorista`, async ({ request }) => {
      const corpo = await lerCorpo(request);
      const erros = validarCadastroMotorista(corpo);
      if (erros.length > 0) return respostaErros(400, erros);
      const email = textoOuVazio(corpo.email);
      const cpf = textoOuVazio(corpo.cpf).replace(/\D/g, '');
      // Textos reais do backend (rotas/cadastro.ts): o contrato em prosa diz "e-mail ou CPF".
      if (emailJaCadastrado(email)) return respostaErro(409, 'email já cadastrado');
      if (cpfJaCadastradoMock(cpf)) return respostaErro(409, 'cpf já cadastrado');
      const criado = registrarMotoristaMock(email, textoOuVazio(corpo.nome_completo), cpf);
      return HttpResponse.json({ usuario: criado.usuario }, { status: 201 });
    }),
  ];
}
