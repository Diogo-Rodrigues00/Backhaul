// Tem que ser o primeiro import: db.ts lê process.env assim que é carregado.
import "./env";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { pool } from "./db";
import { limitarTentativas } from "./middleware/limite-tentativas";
import { rotasAdmin } from "./rotas/admin";
import { rotasCadastro } from "./rotas/cadastro";
import { rotasCargas } from "./rotas/cargas";
import { rotasCertificacoes } from "./rotas/certificacoes";
import { rotasDisponibilidades } from "./rotas/disponibilidades";
import { rotasLogin } from "./rotas/login";
import { rotasMotoristas } from "./rotas/motoristas";
import { rotasFretes } from "./rotas/fretes";
import { rotasPropostas } from "./rotas/propostas";
import { rotasWebhooks } from "./rotas/webhooks";

const app = express();
// Em produção a hospedagem (Render, Railway...) escolhe a porta e avisa por PORT.
const PORT = Number(process.env.PORT) || 3000;

// A API roda atrás do proxy do Render. Sem isto, req.ip seria sempre o IP do proxy
// (todos os clientes pareceriam um só e dividiriam o mesmo limite de tentativas).
// "1" = confie em UM salto de proxy; um número maior permitiria forjar o IP pelo header
// X-Forwarded-For. Em dev local não há proxy e o valor não atrapalha.
app.set("trust proxy", 1);
// Não anuncia "X-Powered-By: Express": é informação grátis para quem procura falhas conhecidas.
app.disable("x-powered-by");

// CORS: o NAVEGADOR só deixa um site ler respostas de outro domínio se a API
// disser que aquela origem é permitida. (App nativo não passa por essa regra.)
// Vem antes das rotas para responder também o "preflight" (requisição OPTIONS).

const origens = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter((o) => o.length > 0);

// Se nenhuma origem foi configurada, o que fazer?
// true  = libera qualquer site (cômodo, mas inseguro em produção)
// false = não libera nenhum (seguro, mas o navegador bloqueia o app)
app.use(cors({ origin: origens.length > 0 ? origens : false }));

// Transforma o corpo JSON da requisição em objeto JavaScript (req.body).
app.use(express.json());

// Limites por IP. Login é o mais apertado (alvo de força bruta); cadastro é mais folgado
// porque uma pessoa real pode errar o formulário algumas vezes.
// Só POST: GET /eu (checar a sessão) não pode gastar a cota de tentativas de senha.
const limiteLogin = limitarTentativas({ janelaMs: 15 * 60 * 1000, maximo: 20 });
const limiteCadastro = limitarTentativas({ janelaMs: 60 * 60 * 1000, maximo: 30 });
app.post("/login", limiteLogin);
app.post("/cadastro/{*resto}", limiteCadastro);

app.use("/cadastro", rotasCadastro);
app.use(rotasLogin);
app.use("/certificacoes", rotasCertificacoes);
app.use("/cargas", rotasCargas);
app.use("/disponibilidades", rotasDisponibilidades);
app.use("/propostas", rotasPropostas);
app.use("/fretes", rotasFretes);
app.use("/admin", rotasAdmin);
app.use("/motorista", rotasMotoristas);
app.use("/webhooks", rotasWebhooks);

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

// Rota que não existe: sem isto o Express responderia com uma página HTML, e o app,
// que sempre espera JSON, não conseguiria mostrar uma mensagem decente.
// Fica DEPOIS de todas as rotas: só chega aqui quem não casou com nenhuma.
app.use((_req, res) => {
  res.status(404).json({ erro: "rota não encontrada" });
});

// Tratador de erros: o Express 5 manda para cá qualquer erro lançado numa rota
// (inclusive em funções async). Tem que ter 4 parâmetros para o Express reconhecê-lo.
app.use((erro: any, _req: Request, res: Response, _next: NextFunction) => {
  // JSON malformado no corpo: o express.json() já marca esse erro com status 400.
  if (erro?.type === "entity.parse.failed") {
    res.status(400).json({ erro: "JSON inválido no corpo da requisição" });
    return;
  }
  // Corpo maior que o limite do express.json() (100 kb por padrão): 413 = "conteúdo grande demais".
  if (erro?.type === "entity.too.large") {
    res.status(413).json({ erro: "corpo da requisição muito grande" });
    return;
  }
  // Qualquer outra coisa é falha nossa. O detalhe vai pro log, não pro cliente.
  console.error(erro);
  res.status(500).json({ erro: "erro interno" });
});

app.listen(PORT, () => {
  console.log(`Backhaul API rodando em http://localhost:${PORT}`);
});
