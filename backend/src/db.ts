import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

// Falha logo na inicialização se o .env estiver faltando, em vez de
// descobrir só quando a primeira requisição tentar usar o banco.
if (!connectionString) {
  throw new Error("DATABASE_URL não definida. Copie .env.example para .env e preencha.");
}

// Pool = um conjunto de conexões reaproveitadas entre as requisições.
export const pool = new Pool({ connectionString });
