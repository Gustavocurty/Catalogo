import { createHash, randomBytes } from "node:crypto"
import type { Seller } from "../types"
import { audit, database, transaction } from "./db"
import { sellerDto } from "./dto"
import { ApiError } from "./errors"
import { verifyPassword } from "./password"
import { object, text } from "./validation"

export const SESSION_SECONDS = 12 * 60 * 60
export const SESSION_COOKIE = "attivus_session"
const hash = (value: string) => createHash("sha256").update(value).digest("hex")

export function sessionCookie(token: string, clear = false): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear ? 0 : SESSION_SECONDS}${clear ? "; Expires=Thu, 01 Jan 1970 00:00:00 GMT" : ""}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
}

function tokenFrom(request: Request): string | null {
  const matches = (request.headers.get("cookie") ?? "").split(";").map((part) => part.trim()).filter((part) => part.startsWith(`${SESSION_COOKIE}=`))
  if (matches.length !== 1) return null
  const token = matches[0].slice(SESSION_COOKIE.length + 1)
  return /^[a-f0-9]{64}$/.test(token) ? token : null
}

export async function authenticate(request: Request): Promise<Seller> {
  const token = tokenFrom(request)
  if (!token) throw new ApiError(401, "Sessao expirada ou invalida.")
  const result = await database().query(
    "SELECT u.id,u.name,u.code,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true",
    [hash(token)],
  )
  if (!result.rows[0]) throw new ApiError(401, "Sessao expirada ou invalida.")
  return sellerDto(result.rows[0])
}

export function authorize(seller: Seller, roles: Seller["role"][]) {
  if (!roles.includes(seller.role)) throw new ApiError(403, "Sem permissao para esta operacao.")
}

export async function login(request: Request, input: unknown) {
  const data = object(input, ["code", "password"])
  const code = text(data.code, "Codigo", 64, 1).toUpperCase()
  if (typeof data.password !== "string" || !data.password.length || data.password.length > 1024) throw new ApiError(400, "Credenciais invalidas.")
  // Do not trust client-supplied forwarding headers. Account and global buckets
  // persist across workers; the global bucket bounds arbitrary-code attacks.
  const allowed = await transaction(async (client) => {
    const buckets = [
      { key: hash("login:global"), seconds: 60, limit: 300 },
      { key: hash(`login:code:${code}`), seconds: 900, limit: 10 },
    ]
    // Always lock the global bucket first. Once exhausted, avoid creating an
    // unbounded number of account rows for arbitrary attacker-supplied codes.
    for (const bucket of buckets) {
      const result = await client.query(
        `INSERT INTO login_attempts (key,attempts,window_start) VALUES ($1,1,now())
         ON CONFLICT (key) DO UPDATE SET
           attempts=CASE WHEN login_attempts.window_start <= now()-($2::int * interval '1 second') THEN 1 ELSE LEAST(login_attempts.attempts+1,1000000) END,
           window_start=CASE WHEN login_attempts.window_start <= now()-($2::int * interval '1 second') THEN now() ELSE login_attempts.window_start END
         RETURNING attempts`, [bucket.key, bucket.seconds],
      )
      if (result.rows[0].attempts > bucket.limit) return false
    }
    return true
  })
  if (!allowed) throw new ApiError(429, "Muitas tentativas. Tente novamente mais tarde.")
  const result = await database().query("SELECT * FROM users WHERE code=$1", [code])
  const user = result.rows[0]
  const verified = await verifyPassword(data.password, user?.password_hash ?? null)
  if (!verified || !user?.active) throw new ApiError(401, "Codigo ou senha invalidos.")
  const token = randomBytes(32).toString("hex")
  const seller = await transaction(async (client) => {
    const current = (await client.query("SELECT * FROM users WHERE id=$1 FOR SHARE", [user.id])).rows[0]
    if (!current?.active || current.password_hash !== user.password_hash) throw new ApiError(401, "Codigo ou senha invalidos.")
    const previous = tokenFrom(request)
    if (previous) await client.query("DELETE FROM sessions WHERE token_hash=$1", [hash(previous)])
    await client.query("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '12 hours')", [hash(token), user.id])
    await audit(client, user.id, "LOGIN", "user", user.id)
    return sellerDto(current)
  })
  return { seller, cookie: sessionCookie(token) }
}

export async function logout(request: Request) {
  const token = tokenFrom(request)
  if (token) await transaction(async (client) => {
    const deleted = await client.query("DELETE FROM sessions WHERE token_hash=$1 RETURNING user_id", [hash(token)])
    if (deleted.rows[0]) await audit(client, deleted.rows[0].user_id, "LOGOUT", "user", deleted.rows[0].user_id)
  })
  return sessionCookie("", true)
}
