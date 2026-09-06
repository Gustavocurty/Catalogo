import pg from "pg"

export function databaseClient() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required")
  return new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000, statement_timeout: 120000 })
}

export async function run(operation) {
  let client
  try {
    client = databaseClient()
    await client.connect()
    await client.query("BEGIN")
    await operation(client)
    await client.query("COMMIT")
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {})
    // Database/provider errors may contain credentials or personal data.
    console.error("Database operation failed; transaction rolled back.", error?.code ? `Code: ${error.code}` : "Check environment, inputs, dependencies and database availability.")
    process.exitCode = 1
  } finally {
    if (client) await client.end().catch(() => {})
  }
}
