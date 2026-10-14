// Tem que ser o primeiro import: db.ts lê process.env assim que é carregado.
import "./env";
import express, { type NextFunction, type Request, type Response } from "express";
import { pool } from "./db";
import { rotasCadastro } from "./rotas/cadastro";
import { rotasCargas } from "./rotas/cargas";
import { rotasCertificacoes } from "./rotas/certificacoes";
import { rotasLogin } from "./rotas/login";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Transforma o corpo JSON da requisição em objeto JavaScript (req.body).
app.use(express.json());

app.use("/cadastro", rotasCadastro);
app.use(rotasLogin);
app.use("/certificacoes", rotasCertificacoes);
app.use("/cargas", rotasCargas);

app.get("/saude", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", banco: "conectado" });
  } catch (erro) {
    // 503 = "serviço indisponível": a API está de pé, mas depende do banco, que não respondeu.
    // A mensagem do Postgres (host, porta, usuário...) vai só para o log, nunca para o cliente.
    console.error("GET /saude: banco indisponível", erro);
    res.status(503).json({ status: "erro", banco: "indisponivel" });
  }
});

// Tratador de erros: o Express 5 manda para cá qualquer erro lançado numa rota
// (inclusive em funções async). Tem que ter 4 parâmetros para o Express reconhecê-lo.
app.use((erro: any, _req: Request, res: Response, _next: NextFunction) => {
  // JSON malformado no corpo: o express.json() já marca esse erro com status 400.
  if (erro?.type === "entity.parse.failed") {
    res.status(400).json({ erro: "JSON inválido no corpo da requisição" });
    return;
  }
  // Qualquer outra coisa é falha nossa. O detalhe vai pro log, não pro cliente.
  console.error(erro);
  res.status(500).json({ erro: "erro interno" });
});

app.listen(PORT, () => {
  console.log(`Backhaul API rodando em http://localhost:${PORT}`);
});
