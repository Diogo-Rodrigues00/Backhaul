import { Router } from "express";
import { pool } from "../db";
import { exigirAutenticacao } from "../middleware/autenticacao";

export const rotasCertificacoes = Router();

// Catálogo para preencher o campo "certificação exigida" no formulário de carga.
// Qualquer usuário logado pode ver: não tem nada sensível aqui.
rotasCertificacoes.get("/", exigirAutenticacao, async (_req, res) => {
  const { rows } = await pool.query(
    "SELECT id, nome, classificacao_onu FROM certificacoes ORDER BY nome",
  );
  res.json({ certificacoes: rows });
});
