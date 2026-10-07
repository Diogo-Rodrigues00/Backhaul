import path from "node:path";
import dotenv from "dotenv";

// Carrega backend/.env para dentro de process.env.
// O caminho é relativo a este arquivo, então funciona tanto em src/ (dev)
// quanto em dist/ (build), não importa de qual pasta o comando foi rodado.
dotenv.config({ path: path.resolve(__dirname, "../.env"), quiet: true });
