import assert from "node:assert/strict"
import test from "node:test"
import type { Pool, PoolClient } from "pg"
import { database, transaction } from "../lib/server/db"

test("transaction commits, rolls back, uses read snapshots and discards broken clients (mock driver)", async (t) => {
  const previous = process.env.DATABASE_URL
  // The connect method is replaced before any operation. No network is used.
  process.env.DATABASE_URL = "postgresql://unused.invalid/not-a-real-database"
  const pool = database()
  if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous
  const statements: string[] = []
  const releases: (Error | undefined)[] = []
  let failRollback = false
  const rollbackError = new Error("mock disconnected client")
  const client = {
    query: async (sql: string) => {
      statements.push(sql)
      if (sql === "ROLLBACK" && failRollback) throw rollbackError
      return { rows: [], rowCount: 0 }
    },
    release: (error?: Error) => { releases.push(error) },
  } as unknown as PoolClient
  t.mock.method(pool, "connect", (async () => client) as Pool["connect"])
  try {
    assert.equal(await transaction(async () => "result"), "result")
    assert.deepEqual(statements.splice(0), ["BEGIN", "COMMIT"])
    assert.deepEqual(releases.splice(0), [undefined])
    await transaction(async () => undefined, true)
    assert.deepEqual(statements.splice(0), ["BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY", "COMMIT"])
    const original = new Error("mock business failure")
    await assert.rejects(transaction(async () => { throw original }), (error) => error === original)
    assert.deepEqual(statements.splice(0), ["BEGIN", "ROLLBACK"])
    failRollback = true
    await assert.rejects(transaction(async () => { throw original }), (error) => error === original)
    assert.deepEqual(statements.splice(0), ["BEGIN", "ROLLBACK"])
    assert.equal(releases.at(-1), rollbackError)
  } finally { await pool.end() }
})
