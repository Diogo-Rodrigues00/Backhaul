import { Router, type Response } from "express";
import { pool } from "../db";
import { exigirAutenticacao, exigirTipo } from "../middleware/autenticacao";
import { buscarEmpresaId, buscarMotoristaId } from "../perfis";
import { validarBuscaProximas, validarCarga } from "../validacao";

export const rotasCargas = Router();

// Código que o Postgres usa para "chave estrangeira aponta para algo que não existe"
// (foreign_key_violation).
const PG_FOREIGN_KEY_VIOLATION = "23503";

// Nome gerado pelo Postgres para a FK de certificacao_requerida_id (tabela_coluna_fkey).
const FK_CERTIFICACAO = "chamados_carga_certificacao_requerida_id_fkey";

// Colunas devolvidas ao cliente, usadas tanto no INSERT ... RETURNING quanto no SELECT.
// - origem/destino estão gravados como GEOGRAPHY (binário do PostGIS). Convertemos para
//   geometry e pegamos ST_Y (latitude) e ST_X (longitude) de volta, no formato {lat,lng}.
// - NUMERIC chega no Node como texto ("3500.00") para não perder precisão;
//   ::float8 transforma em número, que é o que o api.md promete.
const COLUNAS_CARGA = `
  c.id, c.tipo_carga,
  json_build_object('lat', ST_Y(c.origem::geometry),  'lng', ST_X(c.origem::geometry))  AS origem,
  json_build_object('lat', ST_Y(c.destino::geometry), 'lng', ST_X(c.destino::geometry)) AS destino,
  c.peso_kg::float8 AS peso_kg, c.valor_oferecido::float8 AS valor_oferecido,
  c.urgencia, c.status, c.certificacao_requerida_id, c.expira_em, c.criado_em`;

function responderSemPerfil(res: Response, perfil: "empresa" | "motorista") {
  res.status(404).json({ erro: `perfil de ${perfil} não encontrado` });
}

// Certificação inexistente vira 400 (o cliente mandou um id que não existe).
// Qualquer outro erro é relançado e vira 500 no tratador do server.ts.
function responderCertificacaoOuRelancar(erro: unknown, res: Response) {
  const { code, constraint } = (erro ?? {}) as { code?: unknown; constraint?: unknown };
  if (code !== PG_FOREIGN_KEY_VIOLATION || constraint !== FK_CERTIFICACAO) throw erro;
  res.status(400).json({ erros: ["certificacao_requerida_id não corresponde a nenhuma certificação"] });
}

// Os middlewares rodam em ordem: primeiro "quem é você?" (401), depois "você pode?" (403).
// Ficam em cada rota, e não num rotasCargas.use(), porque este router mistura
// rotas da empresa (POST /, GET /minhas) e do motorista (GET /proximas).
const soEmpresa = [exigirAutenticacao, exigirTipo("empresa")];
const soMotorista = [exigirAutenticacao, exigirTipo("motorista")];

rotasCargas.post("/", ...soEmpresa, async (req, res) => {
  const validacao = validarCarga(req.body);
  if (!validacao.ok) {
    res.status(400).json({ erros: validacao.erros });
    return;
  }
  const d = validacao.dados;

  const empresaId = await buscarEmpresaId(req.usuario!.id);
  if (!empresaId) {
    responderSemPerfil(res, "empresa");
    return;
  }

  try {
    // ATENÇÃO: ST_MakePoint recebe (x, y) = (longitude, latitude), nessa ordem.
    // SRID 4326 = o sistema de coordenadas do GPS (WGS 84).
    const { rows } = await pool.query(
      `INSERT INTO chamados_carga AS c
         (empresa_id, certificacao_requerida_id, tipo_carga, origem, destino,
          peso_kg, valor_oferecido, urgencia, expira_em)
       VALUES ($1, $2, $3,
               ST_SetSRID(ST_MakePoint($4::float8, $5::float8), 4326)::geography,
               ST_SetSRID(ST_MakePoint($6::float8, $7::float8), 4326)::geography,
               $8, $9, $10, $11)
       RETURNING ${COLUNAS_CARGA}`,
      [
        empresaId, d.certificacao_requerida_id, d.tipo_carga,
        d.origem.lng, d.origem.lat,
        d.destino.lng, d.destino.lat,
        d.peso_kg, d.valor_oferecido, d.urgencia, d.expira_em,
      ],
    );
    res.status(201).json({ carga: rows[0] });
  } catch (erro) {
    responderCertificacaoOuRelancar(erro, res);
  }
});

rotasCargas.get("/minhas", ...soEmpresa, async (req, res) => {
  const empresaId = await buscarEmpresaId(req.usuario!.id);
  if (!empresaId) {
    responderSemPerfil(res, "empresa");
    return;
  }

  // LEFT JOIN em propostas: carga sem nenhuma proposta continua aparecendo.
  // COUNT(p.id), e não COUNT(*): numa carga sem propostas o LEFT JOIN gera uma linha
  // com p.id NULL; COUNT(*) contaria essa linha (daria 1), COUNT(p.id) ignora NULL (dá 0).
  // ::int porque COUNT devolve bigint, que o Node também receberia como texto.
  const { rows } = await pool.query(
    `SELECT ${COLUNAS_CARGA},
            cert.nome AS certificacao_exigida,
            COUNT(p.id)::int AS total_propostas
       FROM chamados_carga c
       LEFT JOIN certificacoes cert ON cert.id = c.certificacao_requerida_id
       LEFT JOIN propostas p        ON p.chamado_carga_id = c.id
      WHERE c.empresa_id = $1
      GROUP BY c.id, cert.id
      ORDER BY c.criado_em DESC`,
    [empresaId],
  );
  res.json({ cargas: rows });
});

// Regra do api.md: primeiro por urgência (critico, urgente, normal), depois pela distância
// (mais perto primeiro). O ENUM nivel_urgencia ordena pela ordem de declaração
// (normal < urgente < critico), por isso a urgência vai em DESC.
// A distância usa o valor exato, não o arredondado de distancia_origem_km, para não haver empate falso.
const ORDEM_PROXIMAS = `
  ORDER BY c.urgencia DESC,
           ST_Distance(c.origem, ponto.geo) ASC
`;

rotasCargas.get("/proximas", ...soMotorista, async (req, res) => {
  const validacao = validarBuscaProximas(req.query);
  if (!validacao.ok) {
    res.status(400).json({ erros: validacao.erros });
    return;
  }
  const { lat, lng, raio_km } = validacao.dados;

  const motoristaId = await buscarMotoristaId(req.usuario!.id);
  if (!motoristaId) {
    responderSemPerfil(res, "motorista");
    return;
  }

  // - "ponto" monta uma vez o local do motorista (lng, lat!) e é reaproveitado
  //   no filtro e no cálculo da distância.
  // - ST_DWithin(a, b, metros): com GEOGRAPHY a unidade é METRO, por isso raio_km * 1000.
  //   Ele usa o índice GiST idx_chamados_carga_origem; ST_Distance < raio não usaria.
  // - ST_Distance também volta em metros: / 1000 para km e ROUND com 1 casa.
  //   ROUND(x, 1) só existe para NUMERIC, daí o ::numeric antes e o ::float8 depois.
  // - Certificação: se a carga exige uma, o motorista precisa tê-la aprovada pelo admin
  //   e dentro da validade (o índice idx_motorista_certificacoes_validade cobre essa busca).
  //   EXISTS só pergunta "existe pelo menos uma linha?" e não duplica a carga como um JOIN faria.
  const { rows } = await pool.query(
    `WITH ponto AS (
       SELECT ST_SetSRID(ST_MakePoint($1::float8, $2::float8), 4326)::geography AS geo
     )
     SELECT c.id, c.tipo_carga, e.razao_social AS empresa,
            c.peso_kg::float8 AS peso_kg, c.valor_oferecido::float8 AS valor_oferecido,
            c.urgencia,
            ROUND((ST_Distance(c.origem, ponto.geo) / 1000)::numeric, 1)::float8 AS distancia_origem_km,
            cert.nome AS certificacao_exigida,
            json_build_object('lat', ST_Y(c.origem::geometry),  'lng', ST_X(c.origem::geometry))  AS origem,
            json_build_object('lat', ST_Y(c.destino::geometry), 'lng', ST_X(c.destino::geometry)) AS destino,
            c.expira_em
       FROM chamados_carga c
       CROSS JOIN ponto
       JOIN empresas e           ON e.id = c.empresa_id
       LEFT JOIN certificacoes cert ON cert.id = c.certificacao_requerida_id
      WHERE c.status = 'aberto'
        AND c.expira_em > now()
        AND ST_DWithin(c.origem, ponto.geo, $3::float8 * 1000)
        AND (c.certificacao_requerida_id IS NULL OR EXISTS (
              SELECT 1 FROM motorista_certificacoes mc
               WHERE mc.motorista_id = $4
                 AND mc.certificacao_id = c.certificacao_requerida_id
                 AND mc.validado_por_admin = TRUE
                 AND mc.validade >= CURRENT_DATE))
      ${ORDEM_PROXIMAS}`,
    [lng, lat, raio_km, motoristaId],
  );
  res.json({ cargas: rows });
});
