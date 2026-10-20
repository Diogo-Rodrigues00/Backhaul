import { pool } from "./db";

// O token só traz o id do USUÁRIO. Cargas, disponibilidades e certificações
// pertencem ao PERFIL (empresas.id / motoristas.id), que é outra tabela, outro id.
// Os dois helpers devolvem null se o usuário não tiver aquele perfil.

export async function buscarEmpresaId(usuarioId: string): Promise<string | null> {
  const { rows } = await pool.query("SELECT id FROM empresas WHERE usuario_id = $1", [usuarioId]);
  return rows[0]?.id ?? null;
}

export async function buscarMotoristaId(usuarioId: string): Promise<string | null> {
  const { rows } = await pool.query("SELECT id FROM motoristas WHERE usuario_id = $1", [usuarioId]);
  return rows[0]?.id ?? null;
}
