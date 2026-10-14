import { Router, type Response } from "express";
import { pool } from "../db";
import { exigirAutenticacao, exigirTipo } from "../middleware/autenticacao";
import { validarCarga } from "../validacao";

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

// O token só traz o id do USUÁRIO; a carga pertence à EMPRESA (outra tabela, outro id).
// Devolve null se o usuário não tiver perfil de empresa.
async function buscarEmpresaId(usuarioId: string): Promise<string | null> {
  const { rows } = await pool.query("SELECT id FROM empresas WHERE usuario_id = $1", [usuarioId]);
  return rows[0]?.id ?? null;
}

function responderSemPerfil(res: Response) {
  res.status(404).json({ erro: "perfil de empresa não encontrado" });
}

// Certificação inexistente vira 400 (o cliente mandou um id que não existe).
// Qualquer outro erro é relançado e vira 500 no tratador do server.ts.
function responderCertificacaoOuRelancar(erro: unknown, res: Response) {
  const { code, constraint } = (erro ?? {}) as { code?: unknown; constraint?: unknown };
  if (code !== PG_FOREIGN_KEY_VIOLATION || constraint !== FK_CERTIFICACAO) throw erro;
  res.status(400).json({ erros: ["certificacao_requerida_id não corresponde a nenhuma certificação"] });
}

// Os middlewares rodam em ordem: primeiro "quem é você?" (401), depois "você pode?" (403).
// Ficam em cada rota, e não num rotasCargas.use(), porque /cargas/proximas (planejada)
// vai ser do motorista e mora neste mesmo router.
const soEmpresa = [exigirAutenticacao, exigirTipo("empresa")];

rotasCargas.post("/", ...soEmpresa, async (req, res) => {
  const validacao = validarCarga(req.body);
  if (!validacao.ok) {
    res.status(400).json({ erros: validacao.erros });
    return;
  }
  const d = validacao.dados;

  const empresaId = await buscarEmpresaId(req.usuario!.id);
  if (!empresaId) {
    responderSemPerfil(res);
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
    responderSemPerfil(res);
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
