// POST /login, GET /eu, POST /cadastro/empresa e POST /cadastro/motorista.
import { http, HttpResponse } from 'msw';

import {
  cpfJaCadastradoMock,
  EMAIL_JA_CADASTRADO_MOCK,
  registrarMotoristaMock,
  TAMANHO_MINIMO_SENHA_MOCK,
  todosUsuariosMock,
} from '../fixtures/usuarios';
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

function digitos(corpo: Record<string, unknown>, campo: string, total: number): string[] {
  const apenas = textoOuVazio(corpo[campo]).replace(/\D/g, '');
  return apenas.length === total ? [] : [`${campo} deve ter ${total} dígitos`];
}

function emailJaCadastrado(email: string): boolean {
  const minusculo = email.toLowerCase();
  return (
    minusculo === EMAIL_JA_CADASTRADO_MOCK || todosUsuariosMock().some((u) => u.email === minusculo)
  );
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
        ...digitos(corpo, 'cnpj', 14),
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
      const erros = [
        ...validarCredenciais(corpo),
        ...exigir(corpo, ['nome_completo', 'cnh', 'veiculo_tipo', 'veiculo_placa']),
        ...digitos(corpo, 'cpf', 11),
      ];
      if (!eNumeroPositivo(corpo.capacidade_kg)) {
        erros.push('capacidade_kg deve ser um número maior que zero');
      }
      if (erros.length > 0) return respostaErros(400, erros);
      const email = textoOuVazio(corpo.email);
      const cpf = textoOuVazio(corpo.cpf).replace(/\D/g, '');
      // Contrato (docs/api.md): 409 com esta mensagem para e-mail ou CPF repetidos.
      if (emailJaCadastrado(email) || cpfJaCadastradoMock(cpf)) {
        return respostaErro(409, 'e-mail ou CPF já cadastrado');
      }
      const criado = registrarMotoristaMock(email, textoOuVazio(corpo.nome_completo), cpf);
      return HttpResponse.json({ usuario: criado.usuario }, { status: 201 });
    }),
  ];
}
