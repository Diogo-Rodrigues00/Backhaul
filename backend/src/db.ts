import { Pool, PoolClient } from "pg";

const connectionString = process.env.DATABASE_URL;

// Falha logo na inicialização se o .env estiver faltando, em vez de
// descobrir só quando a primeira requisição tentar usar o banco.
if (!connectionString) {
  throw new Error("DATABASE_URL não definida. Copie .env.example para .env e preencha.");
}

// Pool = um conjunto de conexões reaproveitadas entre as requisições.
//
// SSL: provedores como o Neon só aceitam conexão criptografada. A URL deles já traz
// "?sslmode=require", e o pg entende isso sozinho. DATABASE_SSL=true força o SSL quando
// a URL não traz (ex.: URL copiada sem a query string). Local (Postgres sem SSL): não defina.
const forcarSsl = process.env.DATABASE_SSL === "true";
export const pool = new Pool({
  connectionString,
  ...(forcarSsl ? { ssl: true } : {}),
  // Plano grátis do Neon pausa o banco: a 1ª conexão após a pausa pode demorar alguns
  // segundos. Sem timeout, uma conexão travada deixaria a requisição pendurada para sempre.
  connectionTimeoutMillis: 30_000,
});

// Roda `trabalho` dentro de uma transação: ou TODAS as queries dão certo
// (COMMIT), ou nenhuma fica gravada (ROLLBACK).
// Importante: a transação precisa usar sempre a MESMA conexão (client),
// por isso pegamos uma do pool em vez de usar pool.query direto.
export async function emTransacao<T>(trabalho: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  // Se o próprio ROLLBACK falhar, a conexão está num estado desconhecido:
  // release(erro) descarta ela em vez de devolvê-la "suja" ao pool.
  let erroNaConexao: Error | undefined;
  try {
    await client.query("BEGIN");
    const resultado = await trabalho(client);
    await client.query("COMMIT");
    return resultado;
  } catch (erro) {
    try {
      await client.query("ROLLBACK");
    } catch (erroRollback) {
      erroNaConexao = erroRollback as Error;
    }
    throw erro; // relança o erro ORIGINAL (ex.: 23505), não o do ROLLBACK
  } finally {
    client.release(erroNaConexao); // devolve (ou descarta) a conexão, dando certo ou não
  }
}
