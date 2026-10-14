import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db";
import { exigirAutenticacao, gerarToken } from "../middleware/autenticacao";
import { validarLogin } from "../validacao";

export const rotasLogin = Router();

// Mesma mensagem para "e-mail não existe" e "senha errada": assim quem está
// testando e-mails não descobre quais estão cadastrados na plataforma.
const LOGIN_INVALIDO = "email ou senha inválidos";

// Hash de uma senha qualquer, usado quando o e-mail não existe. Comparar contra ele
// faz a resposta demorar o mesmo tanto nos dois casos, então nem pelo tempo
// de resposta dá para saber se o e-mail existe.
const HASH_FALSO = bcrypt.hashSync("senha-que-ninguem-usa", 10);

rotasLogin.post("/login", async (req, res) => {
  const validacao = validarLogin(req.body);
  if (!validacao.ok) {
    res.status(400).json({ erros: validacao.erros });
    return;
  }
  const { email, senha } = validacao.dados;

  const { rows } = await pool.query(
    "SELECT id, senha_hash, tipo, ativo FROM usuarios WHERE email = $1",
    [email],
  );
  const usuario = rows[0];

  // bcrypt.compare gera o hash da senha digitada com o mesmo "sal" e compara.
  // Nunca "descriptografamos" o hash: isso não é possível.
  const senhaConfere = await bcrypt.compare(senha, usuario?.senha_hash ?? HASH_FALSO);

  if (!usuario || !senhaConfere || !usuario.ativo) {
    res.status(401).json({ erro: LOGIN_INVALIDO });
    return;
  }

  const token = gerarToken({ id: usuario.id, tipo: usuario.tipo });
  res.json({ token, tipo: usuario.tipo });
});

// exigirAutenticacao roda antes: se chegamos aqui, req.usuario já está preenchido.
rotasLogin.get("/eu", exigirAutenticacao, async (req, res) => {
  // LEFT JOIN nas duas tabelas de perfil: só uma delas vai ter linha para este
  // usuário, e o COALESCE pega o nome de quem tiver (admin não tem nenhuma).
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.tipo, u.ativo, u.criado_em,
            COALESCE(m.nome_completo, e.razao_social) AS nome
       FROM usuarios u
       LEFT JOIN motoristas m ON m.usuario_id = u.id
       LEFT JOIN empresas   e ON e.usuario_id = u.id
      WHERE u.id = $1`,
    [req.usuario!.id],
  );

  // O token pode ser válido mas o usuário ter sido apagado depois que ele foi gerado.
  if (rows.length === 0) {
    res.status(404).json({ erro: "usuário não encontrado" });
    return;
  }
  res.json({ usuario: rows[0] });
});
