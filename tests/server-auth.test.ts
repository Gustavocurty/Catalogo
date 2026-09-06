import assert from "node:assert/strict"
import test from "node:test"
import { hashPassword, verifyPassword } from "../lib/server/password"
import { assertOrigin, jsonBody, readBody, route } from "../lib/server/http"
import { authorize, SESSION_SECONDS, sessionCookie } from "../lib/server/auth"

test("scrypt passwords are salted, verified and never stored plaintext", async () => {
  const password = "test-only-password-123"
  const first = await hashPassword(password)
  const second = await hashPassword(password)
  assert.notEqual(first, second)
  assert.equal(first.includes(password), false)
  assert.equal(await verifyPassword(password, first), true)
  assert.equal(await verifyPassword("wrong", first), false)
  assert.equal(await verifyPassword(password, null), false)
  assert.equal(await verifyPassword(password, "invalid"), false)
  await assert.rejects(hashPassword("short"))
})

test("CSRF checks exact configured origin including port and requires Origin", () => {
  const previous = process.env.APP_URL
  process.env.APP_URL = "https://app.example.test/catalog"
  try {
    assert.doesNotThrow(() => assertOrigin(new Request("https://internal.test/api", { headers: { origin: "https://app.example.test" } })))
    for (const origin of ["https://evil.test", "https://app.example.test.evil.test", "http://app.example.test", "https://app.example.test:444", "null"]) assert.throws(() => assertOrigin(new Request("https://internal.test/api", { headers: { origin } })), { status: 403 })
    assert.throws(() => assertOrigin(new Request("https://internal.test/api")), { status: 403 })
  } finally {
    if (previous === undefined) delete process.env.APP_URL; else process.env.APP_URL = previous
  }
})

test("session cookie attributes and roles", () => {
  assert.equal(SESSION_SECONDS, 43200)
  assert.match(sessionCookie("token"), /HttpOnly; SameSite=Lax; Max-Age=43200/)
  assert.match(sessionCookie("", true), /Max-Age=0; Expires=/)
  if (process.env.NODE_ENV === "production") assert.match(sessionCookie("token"), /; Secure$/)
  const seller = { id: "id", name: "Name", code: "CODE", role: "SELLER" as const }
  assert.doesNotThrow(() => authorize(seller, ["SELLER", "ADMIN"]))
  assert.throws(() => authorize(seller, ["ADMIN"]), { status: 403 })
})

test("request parser bounds chunked bodies and rejects invalid JSON/content types", async () => {
  const request = (body: string, type = "application/json") => new Request("https://app.test", { method: "POST", headers: { "content-type": type }, body })
  assert.deepEqual(await jsonBody(request('{"ok":true}')), { ok: true })
  await assert.rejects(jsonBody(request("{")), { status: 400 })
  await assert.rejects(jsonBody(request("{}", "text/plain")), { status: 415 })
  await assert.rejects(readBody(request("123456"), 5), { status: 413 })
  await assert.rejects(readBody(new Request("https://app.test", { method: "POST", headers: { "content-length": "100" }, body: "a" }), 5), { status: 413 })
})

test("route wrapper produces safe no-store errors without touching a database", async () => {
  const handler = route(async () => { throw new Error("secret-value") }, { public: true })
  const response = await handler(new Request("https://app.test"), { params: Promise.resolve({}) })
  assert.equal(response.status, 500)
  assert.equal(response.headers.get("cache-control"), "no-store")
  assert.equal(JSON.stringify(await response.json()).includes("secret-value"), false)
  const protectedHandler = route(async () => { assert.fail("Anonymous request cannot reach handler") })
  const unauthorized = await protectedHandler(new Request("https://app.test"), { params: Promise.resolve({}) })
  assert.equal(unauthorized.status, 401)
  assert.equal(typeof (await unauthorized.json()).error, "string")
})
