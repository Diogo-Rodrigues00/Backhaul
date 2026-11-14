import { Router } from "express";
import { pool } from "../db";
import { exigirAutenticacao, exigirTipo } from "../middleware/autenticacao";
import { validarId } from "../validacao";

export const rotasAdmin = Router();

// Tudo aqui é só LEITURA e só para o admin. Os números saem direto do banco, sem
// tabela nova: o admin acompanha a plataforma com o que as outras rotas já gravam.
rotasAdmin.use(exigirAutenticacao, exigirTipo("admin"));

// Visão geral. Cada contagem é uma subconsulta; valores em dinheiro voltam como número
// (::float8) e somados pelo banco, que usa NUMERIC (sem erro de arredondamento na soma).
// "comissao_total" soma só transações já LIBERADAS (frete entregue): é o que a plataforma
// de fato ganhou; "comissao_retida" é a que depende de uma entrega futura.
rotasAdmin.get("/resumo", async (_req, res) => {
  const { rows: [r] } = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM usuarios WHERE tipo = 'motorista') AS motoristas,
       (SELECT count(*)::int FROM usuarios WHERE tipo = 'empresa')   AS empresas,
       (SELECT count(*)::int FROM chamados_carga WHERE status = 'aberto' AND expira_em > now()) AS cargas_abertas,
       (SELECT count(*)::int FROM propostas WHERE status = 'pendente') AS propostas_pendentes,
       (SELECT count(*)::int FROM fretes WHERE status_entrega = 'aceito')      AS fretes_aceitos,
       (SELECT count(*)::int FROM fretes WHERE status_entrega = 'em_transito') AS fretes_em_transito,
       (SELECT count(*)::int FROM fretes WHERE status_entrega = 'entregue')    AS fretes_entregues,
       (SELECT count(*)::int FROM motorista_certificacoes WHERE validado_por_admin = FALSE) AS certificacoes_pendentes,
       (SELECT coalesce(sum(valor_frete), 0)::float8 FROM transacoes WHERE status_pagamento = 'liberado')    AS volume_liberado,
       (SELECT coalesce(sum(valor_comissao), 0)::float8 FROM transacoes WHERE status_pagamento = 'liberado') AS comissao_total,
       (SELECT coalesce(sum(valor_comissao), 0)::float8 FROM transacoes WHERE status_pagamento = 'retido')   AS comissao_retida`,
  );
  res.json({ resumo: r });
});

// Todos os fretes, dos mais recentes aos mais antigos, com as duas pontas e o pagamento.
// Limite fixo de 100: a tela do admin é um painel, não um relatório completo.
rotasAdmin.get("/fretes", async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT f.id, c.tipo_carga, f.valor_final::float8 AS valor_final, f.status_entrega,
            f.coleta_em, f.entrega_em, f.criado_em,
            e.razao_social AS empresa, m.nome_completo AS motorista, m.veiculo_placa,
            t.status_pagamento, t.valor_comissao::float8 AS valor_comissao
       FROM fretes f
       JOIN propostas p                ON p.id = f.proposta_id
       JOIN chamados_carga c           ON c.id = p.chamado_carga_id
       JOIN empresas e                 ON e.id = c.empresa_id
       JOIN chamados_disponibilidade d ON d.id = p.chamado_disp_id
       JOIN motoristas m               ON m.id = d.motorista_id
       LEFT JOIN transacoes t          ON t.frete_id = f.id
      ORDER BY f.criado_em DESC
      LIMIT 100`,
  );
  res.json({ fretes: rows });
});

// Lista de usuários para acompanhamento. NUNCA devolve senha_hash. CPF/CNPJ ficam de fora
// de propósito: o admin precisa saber quem é, não precisa de todos os documentos na tela.
rotasAdmin.get("/usuarios", async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.tipo, u.ativo, u.criado_em,
            coalesce(m.nome_completo, e.razao_social) AS nome
       FROM usuarios u
       LEFT JOIN motoristas m ON m.usuario_id = u.id
       LEFT JOIN empresas e   ON e.usuario_id = u.id
      ORDER BY u.criado_em DESC
      LIMIT 200`,
  );
  res.json({ usuarios: rows });
});

// Desativar (ou reativar) um usuário. Não apagamos a conta: fretes e transações têm
// ON DELETE RESTRICT de propósito, porque o histórico do dinheiro precisa ficar guardado.
// "ativo = false" faz o login e o middleware recusarem a conta na hora.
// Ao desativar, as cargas/disponibilidades ABERTAS dela são canceladas (e as propostas
// pendentes recusadas), para ninguém negociar com uma conta bloqueada. Fretes em andamento
// não são mexidos: têm dinheiro retido e o admin resolve caso a caso.
rotasAdmin.patch("/usuarios/:id/ativo", async (req, res) => {
  const id = validarId(req.params.id, "id");
  const ativo = (req.body ?? {}).ativo;
  if (!id.ok || typeof ativo !== "boolean") {
    res.status(400).json({ erros: [...(id.ok ? [] : id.erros), ...(typeof ativo === "boolean" ? [] : ["ativo deve ser true ou false"])] });
    return;
  }
  if (id.dados === req.usuario!.id) {
    res.status(409).json({ erro: "o admin não pode desativar a própria conta" });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: [u] } = await client.query(
      "UPDATE usuarios SET ativo = $2 WHERE id = $1 RETURNING id, email, tipo, ativo",
      [id.dados, ativo],
    );
    if (!u) {
      await client.query("ROLLBACK");
      res.status(404).json({ erro: "usuário não encontrado" });
      return;
    }

    if (!ativo) {
      await client.query(
        `UPDATE propostas SET status = 'recusada'
          WHERE status = 'pendente' AND (
                chamado_carga_id IN (SELECT c.id FROM chamados_carga c JOIN empresas e ON e.id = c.empresa_id
                                      WHERE e.usuario_id = $1 AND c.status = 'aberto')
             OR chamado_disp_id  IN (SELECT d.id FROM chamados_disponibilidade d JOIN motoristas m ON m.id = d.motorista_id
                                      WHERE m.usuario_id = $1 AND d.status = 'aberto'))`,
        [u.id],
      );
      await client.query(
        `UPDATE chamados_carga SET status = 'cancelado'
          WHERE status = 'aberto' AND empresa_id IN (SELECT id FROM empresas WHERE usuario_id = $1)`,
        [u.id],
      );
      await client.query(
        `UPDATE chamados_disponibilidade SET status = 'cancelado'
          WHERE status = 'aberto' AND motorista_id IN (SELECT id FROM motoristas WHERE usuario_id = $1)`,
        [u.id],
      );
    }

    await client.query(
      "INSERT INTO logs_auditoria (usuario_id, acao, detalhes) VALUES ($1, $2, $3::jsonb)",
      [req.usuario!.id, ativo ? "usuario_reativado" : "usuario_desativado", JSON.stringify({ alvo: u.id })],
    );
    await client.query("COMMIT");
    res.json({ usuario: u });
  } catch (erro) {
    await client.query("ROLLBACK").catch(() => {});
    throw erro;
  } finally {
    client.release();
  }
});
