import { Router, type Response } from "express";
import bcrypt from "bcryptjs";
import { emTransacao } from "../db";
import { validarCadastroEmpresa, validarCadastroMotorista } from "../validacao";

// Custo do bcrypt: cada +1 dobra o tempo para gerar (e para quebrar) o hash.
// 10 leva ~100ms, o bastante para atrapalhar ataque de força bruta sem deixar a API lenta.
const CUSTO_BCRYPT = 10;

export const rotasCadastro = Router();

// Código que o Postgres usa para "valor repetido em coluna UNIQUE" (unique_violation).
const PG_UNIQUE_VIOLATION = "23505";

// Constraint (nome gerado pelo Postgres: tabela_coluna_key) -> campo que o cliente enxerga.
// O nome da constraint fica só aqui dentro; o cliente recebe apenas o nome do campo.
const CAMPO_POR_CONSTRAINT: Record<string, string> = {
  usuarios_email_key: "email",
  motoristas_cpf_key: "cpf",
  empresas_cnpj_key: "cnpj",
};

// Traduz o erro do Postgres de "valor repetido em coluna UNIQUE" numa mensagem
// para o cliente. Devolve null se o erro for de outro tipo (aí vira 500).
function mensagemDuplicado(erro: unknown): string | null {
  if (typeof erro !== "object" || erro === null) return null;
  const { code, constraint } = erro as { code?: unknown; constraint?: unknown };
  if (code !== PG_UNIQUE_VIOLATION || typeof constraint !== "string") return null;

  // Duplicidade numa constraint que não está no mapa (ex.: usuario_id) não é culpa
  // do cliente: é bug nosso, então continua sendo 500.
  const campo = CAMPO_POR_CONSTRAINT[constraint];
  return campo ? `${campo} já cadastrado` : null;
}

// Se for duplicidade, responde 409; senão, relança para o tratador de erros do server.ts.
function responderDuplicadoOuRelancar(erro: unknown, res: Response) {
  const mensagem = mensagemDuplicado(erro);
  if (!mensagem) throw erro;
  res.status(409).json({ erro: mensagem });
}

rotasCadastro.post("/motorista", async (req, res) => {
  const validacao = validarCadastroMotorista(req.body);
  if (!validacao.ok) {
    res.status(400).json({ erros: validacao.erros });
    return;
  }
  const d = validacao.dados;
  const senhaHash = await bcrypt.hash(d.senha, CUSTO_BCRYPT);

  try {
    const usuario = await emTransacao(async (client) => {
      // RETURNING devolve as colunas da linha recém-criada (inclusive o id gerado),
      // sem precisar de um SELECT extra. Repare que senha_hash NÃO está na lista.
      const { rows } = await client.query(
        `INSERT INTO usuarios (email, senha_hash, tipo)
         VALUES ($1, $2, 'motorista')
         RETURNING id, email, tipo, criado_em`,
        [d.email, senhaHash],
      );
      const novo = rows[0];

      await client.query(
        `INSERT INTO motoristas
           (usuario_id, nome_completo, cpf, cnh, veiculo_tipo, veiculo_placa, capacidade_kg)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [novo.id, d.nome_completo, d.cpf, d.cnh, d.veiculo_tipo, d.veiculo_placa, d.capacidade_kg],
      );
      return novo;
    });

    res.status(201).json({ usuario });
  } catch (erro) {
    responderDuplicadoOuRelancar(erro, res);
  }
});

rotasCadastro.post("/empresa", async (req, res) => {
  const validacao = validarCadastroEmpresa(req.body);
  if (!validacao.ok) {
    res.status(400).json({ erros: validacao.erros });
    return;
  }
  const d = validacao.dados;
  const senhaHash = await bcrypt.hash(d.senha, CUSTO_BCRYPT);

  try {
    const usuario = await emTransacao(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO usuarios (email, senha_hash, tipo)
         VALUES ($1, $2, 'empresa')
         RETURNING id, email, tipo, criado_em`,
        [d.email, senhaHash],
      );
      const novo = rows[0];

      await client.query(
        `INSERT INTO empresas (usuario_id, razao_social, cnpj) VALUES ($1, $2, $3)`,
        [novo.id, d.razao_social, d.cnpj],
      );
      return novo;
    });

    res.status(201).json({ usuario });
  } catch (erro) {
    responderDuplicadoOuRelancar(erro, res);
  }
});
