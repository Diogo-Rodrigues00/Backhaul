import { Router } from "express";
import { pool } from "../db";
import { exigirAutenticacao, exigirTipo } from "../middleware/autenticacao";
import { buscarMotoristaId } from "../perfis";
import { validarDecisaoCertificacao, validarEnvioCertificacao, validarId } from "../validacao";

export const rotasCertificacoes = Router();

// Catálogo para preencher o campo "certificação exigida" no formulário de carga.
// Qualquer usuário logado pode ver: não tem nada sensível aqui.
rotasCertificacoes.get("/", exigirAutenticacao, async (_req, res) => {
  const { rows } = await pool.query(
    "SELECT id, nome, classificacao_onu FROM certificacoes ORDER BY nome",
  );
  res.json({ certificacoes: rows });
});

// As rotas fixas (/minhas, /pendentes) vêm antes das que têm :id, para o Express
// não tratar a palavra "minhas" como se fosse um id.

// Certificações do motorista logado, com a situação de cada uma.
// situacao: "pendente" (aguardando o admin), "aprovada" ou "vencida" (aprovada, mas fora da validade).
rotasCertificacoes.get("/minhas", exigirAutenticacao, exigirTipo("motorista"), async (req, res) => {
  const motoristaId = await buscarMotoristaId(req.usuario!.id);
  if (!motoristaId) {
    res.status(404).json({ erro: "perfil de motorista não encontrado" });
    return;
  }
  const { rows } = await pool.query(
    `SELECT mc.id, mc.certificacao_id, c.nome, mc.numero_certificado,
            to_char(mc.validade, 'YYYY-MM-DD') AS validade, mc.validado_por_admin, mc.criado_em,
            CASE WHEN NOT mc.validado_por_admin THEN 'pendente'
                 WHEN mc.validade < CURRENT_DATE THEN 'vencida'
                 ELSE 'aprovada' END AS situacao
       FROM motorista_certificacoes mc
       JOIN certificacoes c ON c.id = mc.certificacao_id
      WHERE mc.motorista_id = $1
      ORDER BY c.nome`,
    [motoristaId],
  );
  res.json({ certificacoes: rows });
});

// Motorista envia (ou reenvia) uma certificação para aprovação.
// Reenviar uma que ainda está pendente (ou que venceu) atualiza os dados; uma aprovada e
// válida não pode ser trocada, senão o motorista burlaria a aprovação mudando o número depois.
rotasCertificacoes.post("/minhas", exigirAutenticacao, exigirTipo("motorista"), async (req, res) => {
  const validacao = validarEnvioCertificacao(req.body);
  if (!validacao.ok) {
    res.status(400).json({ erros: validacao.erros });
    return;
  }
  const d = validacao.dados;

  const motoristaId = await buscarMotoristaId(req.usuario!.id);
  if (!motoristaId) {
    res.status(404).json({ erro: "perfil de motorista não encontrado" });
    return;
  }

  const existe = await pool.query("SELECT 1 FROM certificacoes WHERE id = $1", [d.certificacao_id]);
  if (existe.rowCount === 0) {
    res.status(400).json({ erros: ["certificacao_id não corresponde a nenhuma certificação"] });
    return;
  }

  // O WHERE do DO UPDATE decide se o reenvio é permitido; quando não é, nenhuma linha volta.
  const { rows } = await pool.query(
    `INSERT INTO motorista_certificacoes (motorista_id, certificacao_id, numero_certificado, validade)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (motorista_id, certificacao_id) DO UPDATE
        SET numero_certificado = EXCLUDED.numero_certificado,
            validade = EXCLUDED.validade,
            validado_por_admin = FALSE
      WHERE motorista_certificacoes.validado_por_admin = FALSE
         OR motorista_certificacoes.validade < CURRENT_DATE
     RETURNING id, certificacao_id, numero_certificado,
               to_char(validade, 'YYYY-MM-DD') AS validade, validado_por_admin, criado_em`,
    [motoristaId, d.certificacao_id, d.numero_certificado, d.validade],
  );
  if (rows.length === 0) {
    res.status(409).json({ erro: "certificação já aprovada e dentro da validade" });
    return;
  }
  res.status(201).json({ certificacao: rows[0] });
});

// Fila do admin: certificações enviadas que ainda não foram aprovadas, mais antigas primeiro.
rotasCertificacoes.get("/pendentes", exigirAutenticacao, exigirTipo("admin"), async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT mc.id, c.nome AS certificacao, mc.numero_certificado,
            to_char(mc.validade, 'YYYY-MM-DD') AS validade, mc.criado_em,
            json_build_object('id', m.id, 'nome_completo', m.nome_completo, 'cpf', m.cpf,
                              'cnh', m.cnh, 'veiculo_placa', m.veiculo_placa) AS motorista
       FROM motorista_certificacoes mc
       JOIN certificacoes c ON c.id = mc.certificacao_id
       JOIN motoristas m    ON m.id = mc.motorista_id
      WHERE mc.validado_por_admin = FALSE
      ORDER BY mc.criado_em`,
  );
  res.json({ certificacoes: rows });
});

// Admin aprova ou recusa. Recusar APAGA o registro: o motorista pode corrigir e reenviar,
// e a tabela guarda só certificações pendentes ou aprovadas (sem coluna de "recusada").
rotasCertificacoes.post("/pendentes/:id/responder", exigirAutenticacao, exigirTipo("admin"), async (req, res) => {
  const id = validarId(req.params.id, "id");
  const acao = validarDecisaoCertificacao(req.body);
  if (!id.ok || !acao.ok) {
    res.status(400).json({ erros: [...(id.ok ? [] : id.erros), ...(acao.ok ? [] : acao.erros)] });
    return;
  }

  // O "AND validado_por_admin = FALSE" faz a decisão valer só para itens ainda pendentes,
  // e como é um único comando, dois admins decidindo ao mesmo tempo não se atropelam.
  if (acao.dados === "aprovar") {
    const { rows } = await pool.query(
      `UPDATE motorista_certificacoes SET validado_por_admin = TRUE
        WHERE id = $1 AND validado_por_admin = FALSE
        RETURNING id, validado_por_admin`,
      [id.dados],
    );
    if (rows.length === 0) {
      res.status(404).json({ erro: "certificação pendente não encontrada" });
      return;
    }
    res.json({ certificacao: rows[0] });
    return;
  }

  const { rowCount } = await pool.query(
    "DELETE FROM motorista_certificacoes WHERE id = $1 AND validado_por_admin = FALSE",
    [id.dados],
  );
  if (rowCount === 0) {
    res.status(404).json({ erro: "certificação pendente não encontrada" });
    return;
  }
  res.json({ certificacao: { id: id.dados, recusada: true } });
});
