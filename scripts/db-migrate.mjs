import { createHash } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import { run } from "./db-common.mjs"

const directory = new URL("../db/migrations/", import.meta.url)

await run(async (client) => {
  // One transaction covers the lock, ledger and every pending migration.
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended('attivus:schema-migrations',0))")
  await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, checksum char(64) NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())")
  const names = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort()
  if (names.some((name) => !/^\d{3}_[a-z0-9_]+\.sql$/.test(name)) || new Set(names.map((name) => name.slice(0, 3))).size !== names.length) throw new Error("Invalid or duplicate migration versions")
  const applied = (await client.query("SELECT version,checksum FROM schema_migrations ORDER BY version")).rows
  if (applied.some((row) => !names.includes(row.version))) throw new Error("Applied migration missing from checkout")
  const ledger = new Map(applied.map((row) => [row.version, row.checksum]))
  let count = 0
  for (const name of names) {
    const sql = await readFile(new URL(name, directory), "utf8")
    // Git may check out CRLF on Windows. Checksums should describe SQL, not checkout style.
    const canonical = sql.replace(/\r\n/g, "\n")
    const checksum = createHash("sha256").update(canonical).digest("hex")
    if (ledger.has(name)) {
      if (ledger.get(name) !== checksum) throw new Error(`Applied migration modified: ${name}`)
      continue
    }
    if (applied.some((row) => row.version > name)) throw new Error("Cannot insert migrations before an applied version")
    await client.query(canonical)
    await client.query("INSERT INTO schema_migrations (version,checksum) VALUES ($1,$2)", [name, checksum])
    count++
  }
  console.log(`${count} migration(s) executed; committing transaction.`)
})
