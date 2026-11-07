import { Router } from "express";
import { pool } from "../db";
import { exigirAutenticacao, exigirTipo } from "../middleware/autenticacao";
import { buscarMotoristaId } from "../perfis";
import { validarChavePix } from "../validacao";

export const rotasMotoristas = Router();

// Chave Pix do motorista logado: é para onde o frete será repassado na entrega.
// Os dados são do próprio motorista; ninguém além dele (e o repasse) lê esta chave.
rotasMotoristas.get("/chave-pix", exigirAutenticacao, exigirTipo("motorista"), async (req, res) => {
  const { rows } = await pool.query(
    "SELECT tipo_chave_pix, chave_pix FROM motoristas WHERE usuario_id = $1",
    [req.usuario!.id],
  );
  if (rows.length === 0) {
    res.status(404).json({ erro: "perfil de motorista não encontrado" });
    return;
  }
  // Sem chave cadastrada, os dois campos vêm null (e o front mostra o formulário vazio).
  res.json({ chave_pix: rows[0].chave_pix ?? null, tipo_chave_pix: rows[0].tipo_chave_pix ?? null });
});

// Cadastra ou troca a chave. Trocar é permitido: o motorista pode mudar de banco.
rotasMotoristas.put("/chave-pix", exigirAutenticacao, exigirTipo("motorista"), async (req, res) => {
  const validacao = validarChavePix(req.body);
  if (!validacao.ok) {
    res.status(400).json({ erros: validacao.erros });
    return;
  }

  const motoristaId = await buscarMotoristaId(req.usuario!.id);
  if (!motoristaId) {
    res.status(404).json({ erro: "perfil de motorista não encontrado" });
    return;
  }

  const { chave_pix, tipo_chave_pix } = validacao.dados;
  await pool.query(
    "UPDATE motoristas SET chave_pix = $2, tipo_chave_pix = $3::tipo_chave_pix WHERE id = $1",
    [motoristaId, chave_pix, tipo_chave_pix],
  );
  res.json({ chave_pix, tipo_chave_pix });
});
