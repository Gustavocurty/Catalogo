import { run } from "./db-common.mjs"

// Optional scheduled maintenance; never deletes business records or audit history.
await run(async (client) => {
  const sessions = await client.query("DELETE FROM sessions WHERE expires_at < now()")
  const attempts = await client.query("DELETE FROM login_attempts WHERE window_start < now()-interval '1 day'")
  console.log(`${sessions.rowCount} expired sessions and ${attempts.rowCount} old rate-limit buckets removed; committing transaction.`)
})
