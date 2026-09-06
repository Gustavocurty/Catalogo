import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key))
  })
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12 || password.length > 1024) throw new Error("Password must contain 12 to 1024 characters")
  const salt = randomBytes(16)
  const key = await derive(password, salt)
  return `scrypt$16384$8$1$${salt.toString("hex")}$${key.toString("hex")}`
}

// A missing user still incurs exactly one real scrypt operation.
const dummyHash = `scrypt$16384$8$1$${"00".repeat(16)}$${"00".repeat(64)}`

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const valid = stored !== null && /^scrypt\$16384\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(stored)
  const parts = (valid ? stored : dummyHash).split("$")
  const actual = await derive(password, Buffer.from(parts[4], "hex"))
  return timingSafeEqual(actual, Buffer.from(parts[5], "hex")) && valid
}
