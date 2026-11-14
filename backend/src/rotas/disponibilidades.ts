import { Router } from "express";
import { pool } from "../db";
import { exigirAutenticacao, exigirTipo } from "../middleware/autenticacao";
import { buscarMotoristaId } from "../perfis";
import { validarDisponibilidade } from "../validacao";

export const rotasDisponibilidades = Router();

// Aqui todas as rotas são do motorista, então os middlewares valem para o router inteiro.
rotasDisponibilidades.use(exigirAutenticacao, exigirTipo("motorista"));

// Motorista avisa "estou livre nesta região até tal hora".
rotasDisponibilidades.post("/", async (req, res) => {
  const validacao = validarDisponibilidade(req.body);
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

  // Na API o campo se chama "local"; no banco, a coluna é regiao_interesse.
  // Mesma regra do POST /cargas: ST_MakePoint recebe (longitude, latitude).
  // Nenhum valor aqui vem de FK digitada pelo cliente, então qualquer erro do banco
  // é falha nossa: o Express 5 leva para o tratador do server.ts, que responde 500.
  const { rows } = await pool.query(
    `INSERT INTO chamados_disponibilidade
       (motorista_id, regiao_interesse, raio_busca_km, urgencia, expira_em)
     VALUES ($1, ST_SetSRID(ST_MakePoint($2::float8, $3::float8), 4326)::geography, $4, $5, $6)
     RETURNING id,
       json_build_object('lat', ST_Y(regiao_interesse::geometry),
                         'lng', ST_X(regiao_interesse::geometry)) AS local,
       raio_busca_km::float8 AS raio_busca_km, urgencia, status, expira_em, criado_em`,
    [motoristaId, d.local.lng, d.local.lat, d.raio_busca_km, d.urgencia, d.expira_em],
  );
  res.status(201).json({ disponibilidade: rows[0] });
});

// Disponibilidades do motorista logado, mais recentes primeiro. Existe para o app
// recuperar a disponibilidade depois de recarregar a página ou trocar de aparelho.
// "expirado" é calculado: o banco só muda o status quando alguém age.
rotasDisponibilidades.get("/minhas", async (req, res) => {
  const motoristaId = await buscarMotoristaId(req.usuario!.id);
  if (!motoristaId) {
    res.status(404).json({ erro: "perfil de motorista não encontrado" });
    return;
  }

  const { rows } = await pool.query(
    `SELECT d.id,
            json_build_object('lat', ST_Y(d.regiao_interesse::geometry),
                              'lng', ST_X(d.regiao_interesse::geometry)) AS local,
            d.raio_busca_km::float8 AS raio_busca_km, d.urgencia,
            CASE WHEN d.status = 'aberto' AND d.expira_em <= now()
                 THEN 'expirado'::status_chamado ELSE d.status END AS status,
            d.expira_em, d.criado_em,
            (SELECT COUNT(*)::int FROM propostas p
              WHERE p.chamado_disp_id = d.id AND p.status = 'pendente') AS propostas_pendentes
       FROM chamados_disponibilidade d
      WHERE d.motorista_id = $1
      ORDER BY d.criado_em DESC`,
    [motoristaId],
  );
  res.json({ disponibilidades: rows });
});
