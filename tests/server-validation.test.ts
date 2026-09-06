import assert from "node:assert/strict"
import test from "node:test"
import { ORDER_TRANSITIONS } from "../lib/config/orders"
import { bool, day, flag, normalizedDocument, object, queryParams, status, text, uuid, validateTransition, version } from "../lib/server/validation"
import { imageUrl } from "../lib/server/storage"
import { productInput } from "../lib/server/catalog"
import { customerInput } from "../lib/server/customers"

test("all status transitions follow the shared contract; terminal states cannot move", () => {
  for (const from of Object.keys(ORDER_TRANSITIONS) as (keyof typeof ORDER_TRANSITIONS)[]) {
    for (const to of Object.keys(ORDER_TRANSITIONS) as (keyof typeof ORDER_TRANSITIONS)[]) {
      if (ORDER_TRANSITIONS[from].includes(to)) assert.doesNotThrow(() => validateTransition(from, to, "Motivo"))
      else assert.throws(() => validateTransition(from, to, "Motivo"), { status: 409 })
    }
  }
  assert.throws(() => validateTransition("READY", "CANCELLED", "  "), { status: 400 })
  assert.throws(() => status("toString"))
  assert.throws(() => status("__proto__"))
})

test("strict primitives, document normalization and optimistic version", () => {
  assert.equal(normalizedDocument("12.345.678/0001-90"), "12345678000190")
  assert.equal(normalizedDocument(""), "")
  assert.throws(() => normalizedDocument("abc123"))
  assert.throws(() => normalizedDocument("..."))
  assert.equal(text(" ACME ", "name", 10, 1), "ACME")
  assert.throws(() => text(" ", "name", 10, 1))
  assert.throws(() => text("a\u0000b", "name", 10))
  assert.throws(() => object({ stock: 1 }, ["price"]))
  assert.throws(() => object([], []))
  for (const input of [undefined, null, "1", 0, -1, 1.5, 2147483647]) assert.throws(() => version(input))
  assert.equal(version(1), 1)
  assert.throws(() => bool("true", "active"))
  assert.equal(uuid("550E8400-E29B-41D4-A716-446655440000"), "550e8400-e29b-41d4-a716-446655440000")
  assert.throws(() => uuid("p001"))
})

test("dates and query parameters reject ambiguity", () => {
  assert.equal(day("2024-02-29"), "2024-02-29")
  for (const value of ["2023-02-29", "2024-04-31", "2024-13-01", "2024-2-01", "2024-01-01T00:00:00Z"]) assert.throws(() => day(value))
  assert.throws(() => queryParams(new Request("https://app.test/api?status=A&status=B"), ["status"]))
  assert.throws(() => queryParams(new Request("https://app.test/api?extra=1"), []))
  assert.equal(flag(new URLSearchParams("manage=1"), "manage"), true)
  assert.throws(() => flag(new URLSearchParams("manage=true"), "manage"))
})

test("image URL allowlist preserves local mocks and configured storage only", () => {
  const oldUrl = process.env.SUPABASE_URL
  const oldBucket = process.env.SUPABASE_STORAGE_BUCKET
  process.env.SUPABASE_URL = "https://example.supabase.co"
  process.env.SUPABASE_STORAGE_BUCKET = "catalog"
  try {
    const local = "/images/produtos/cimentos-e-argamassas/cim-cp2-50_cimento-cp-ii-50kg.jpg"
    const remote = "https://example.supabase.co/storage/v1/object/public/catalog/products/test.webp"
    assert.equal(imageUrl(local), local)
    assert.equal(imageUrl(remote), remote)
    assert.equal(imageUrl(null), null)
    for (const value of ["//evil.test/x.jpg", "/images/produtos/../x.jpg", "/images/produtos/%2e%2e/x.jpg", "/images/produtos/a.svg", `${remote}?x=1`, remote.replace("catalog/", "other/"), remote.replace("example.supabase.co", "evil.test"), "data:image/png;base64,AA", "javascript:alert(1)"]) assert.throws(() => imageUrl(value))
  } finally {
    if (oldUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = oldUrl
    if (oldBucket === undefined) delete process.env.SUPABASE_STORAGE_BUCKET; else process.env.SUPABASE_STORAGE_BUCKET = oldBucket
  }
})

test("product writes reject direct stock changes, null coercion and empty patches", () => {
  const product = { sku: "TEST-1", name: "Test", category: "Test", unit: "un", price: 19.99 }
  const parsed = productInput(product)
  assert.equal(parsed.initialStock, 0)
  assert.equal(parsed.quantityStep, 1)
  assert.equal(parsed.imageUrl, null)
  for (const field of ["stock", "physicalStock", "reservedStock"]) assert.throws(() => productInput({ ...product, [field]: 100 }))
  for (const field of ["description", "price", "active", "saleBlocked", "minimumStock", "quantityStep", "initialStock"]) assert.throws(() => productInput({ ...product, [field]: null }))
  assert.throws(() => productInput({ version: 1 }, true))
  assert.throws(() => productInput({ name: "Updated" }, true))
  assert.throws(() => productInput({ version: 1, initialStock: 1 }, true))
  assert.deepEqual(productInput({ version: 1, imageUrl: null, active: false }, true), { imageUrl: null, active: false })
})

test("customer writes normalize optional document and enforce field limits", () => {
  assert.equal(customerInput({ companyName: "ACME" }).document, "")
  assert.equal(customerInput({ companyName: "ACME", document: "123.456.789-01" }).document, "12345678901")
  for (const field of ["companyName", "document", "address", "phone", "contactName", "active"]) assert.throws(() => customerInput({ companyName: "ACME", [field]: null }))
  assert.throws(() => customerInput({ companyName: "x".repeat(201) }))
  assert.throws(() => customerInput({ version: 1 }, true))
  assert.deepEqual(customerInput({ version: 1, active: false }, true), { active: false })
})
