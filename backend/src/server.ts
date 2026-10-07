// Tem que ser o primeiro import: db.ts lê process.env assim que é carregado.
import "./env";
import express from "express";
import { pool } from "./db";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.get("/saude", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", banco: "conectado" });
  } catch (erro) {
    // TODO(human): o banco não respondeu. Decida o que a rota devolve.
  }
});

app.listen(PORT, () => {
  console.log(`Backhaul API rodando em http://localhost:${PORT}`);
});
