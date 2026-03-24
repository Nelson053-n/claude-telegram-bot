import { Pool, PoolClient } from "pg";
import { config_api } from "../config";

const pool = new Pool({
  host: config_api.db.host,
  port: config_api.db.port,
  database: config_api.db.database,
  user: config_api.db.user,
  password: config_api.db.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

export async function query(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

export async function closePool() {
  await pool.end();
}

// Initialize database tables if they don't exist
export async function initializeDb() {
  try {
    const schemaSQL = await fetch(new URL("./schema.sql", import.meta.url)).then(r => r.text());
    const statements = schemaSQL.split(";").filter(s => s.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        await query(statement);
      }
    }

    console.log("Database initialized successfully");
  } catch (err) {
    console.error("Failed to initialize database:", err);
    throw err;
  }
}
