import { Pool, type PoolClient } from "pg"

let pool: Pool | undefined

export function database(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured")
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      statement_timeout: 15000,
      idle_in_transaction_session_timeout: 20000,
    })
    pool.on("error", () => console.error("Database pool connection error"))
  }
  return pool
}

export async function transaction<T>(operation: (client: PoolClient) => Promise<T>, readOnly = false): Promise<T> {
  const client = await database().connect()
  let releaseError: Error | undefined
  try {
    await client.query(readOnly ? "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY" : "BEGIN")
    const result = await operation(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    try { await client.query("ROLLBACK") }
    catch (rollbackError) { releaseError = rollbackError instanceof Error ? rollbackError : new Error("Rollback failed") }
    throw error
  } finally {
    client.release(releaseError)
  }
}

export async function audit(client: PoolClient, actorId: string | null, action: string, entityType: string, entityId: string | null, details: unknown = {}) {
  await client.query(
    "INSERT INTO audit_log (actor_id, action, entity_type, entity_id, details) VALUES ($1,$2,$3,$4,$5::jsonb)",
    [actorId, action, entityType, entityId, JSON.stringify(details)],
  )
}
