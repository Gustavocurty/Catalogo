import assert from "node:assert/strict"
import test from "node:test"
import { decimal, lineCents, MAX_TOTAL_CENTS, scaled, totals, validateQuantity } from "../lib/server/money"

test("decimal amounts are parsed without floating-point multiplication", () => {
  assert.equal(scaled(19.99, 2, 100, "price"), BigInt(1999))
  assert.equal(scaled(1.005, 3, 100, "quantity"), BigInt(1005))
  assert.equal(decimal(BigInt(5), 2), "0.05")
  assert.equal(decimal(BigInt(-1), 3), "-0.001")
  assert.equal(decimal(BigInt(0), 2), "0.00")
})

test("line totals and discount use half-up rounding, subtotal sums rounded lines", () => {
  const lines = [lineCents(BigInt(1), BigInt(500)), lineCents(BigInt(1), BigInt(500))]
  assert.deepEqual(lines, [BigInt(1), BigInt(1)])
  assert.deepEqual(totals(lines, BigInt(2500)), { subtotal: BigInt(2), discountValue: BigInt(1), total: BigInt(1) })
  assert.equal(lineCents(BigInt(1999), BigInt(1500)), BigInt(2999))
  assert.deepEqual(totals([BigInt(12345)], BigInt(10000)), { subtotal: BigInt(12345), discountValue: BigInt(12345), total: BigInt(0) })
})

test("precise decimal quantity step, quantity and currency bounds", () => {
  assert.equal(validateQuantity(0.3, 0.1), BigInt(300))
  assert.equal(validateQuantity(0.001, 0.001), BigInt(1))
  assert.equal(validateQuantity(1000000, 0.001), BigInt(1000000000))
  for (const quantity of [0, -1, 0.0001, 1000000.001, NaN, Infinity]) assert.throws(() => validateQuantity(quantity, 0.001))
  assert.throws(() => validateQuantity(0.3, 0.2))
  assert.throws(() => validateQuantity(1, 0))
  assert.throws(() => scaled("1", 2, 100, "price"))
  assert.throws(() => scaled(1.001, 2, 100, "price"))
  assert.throws(() => scaled(100.01, 2, 100, "price"))
  assert.throws(() => totals([MAX_TOTAL_CENTS, BigInt(1)], BigInt(0)))
  assert.throws(() => lineCents(BigInt(999999999), BigInt(1000000000)))
  assert.throws(() => totals([BigInt(1)], BigInt(10001)))
})
