import { require as tsxRequire } from "tsx/cjs/api"
import { run } from "./db-common.mjs"

const { hashPassword } = tsxRequire("../lib/server/password.ts", import.meta.url)

const code = (process.env.ADMIN_CODE ?? "").trim().toUpperCase()
const name = (process.env.ADMIN_NAME ?? "").trim()
const password = process.env.ADMIN_PASSWORD ?? ""
const role = process.env.USER_ROLE ?? "ADMIN"

if (!/^[A-Z0-9._-]{1,64}$/.test(code) || !name || name.length > 160 || /[\u0000-\u001f\u007f]/.test(name) || password.length < 12 || password.length > 1024 || !["ADMIN", "SELLER", "OPERATIONS"].includes(role)) {
  console.error("Set ADMIN_CODE (1-64 letters/digits/._-), ADMIN_NAME (1-160 chars), ADMIN_PASSWORD (12-1024 chars) and optional USER_ROLE (ADMIN, SELLER, OPERATIONS). No defaults for credentials.")
  process.exitCode = 1
} else {
  const passwordHash = await hashPassword(password)
  await run(async (client) => {
    const result = await client.query("INSERT INTO users (code,name,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id", [code, name, passwordHash, role])
    await client.query("INSERT INTO audit_log (action,entity_type,entity_id,details) VALUES ('USER_CREATED','user',$1,$2::jsonb)", [result.rows[0].id, JSON.stringify({ role, source: "create-user" })])
    console.log(`User ${result.rows[0].id} created with role ${role}; committing transaction.`)
  })
}
