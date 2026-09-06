import assert from "node:assert/strict"
import test from "node:test"
import { orderFingerprint, orderInput } from "../lib/server/orders"

const input = {
  customerId: "550e8400-e29b-41d4-a716-446655440000",
  items: [{ productId: "550e8400-e29b-41d4-a716-446655440001", quantity: 0.3, expectedPrice: 19.99 }],
  notes: "", discountPercent: 5.25, idempotencyKey: "test-key-123456",
}

test("order payload is strict and idempotency fingerprints bind business content", () => {
  const canonical = orderInput(input)
  assert.equal(orderFingerprint(canonical), orderFingerprint(orderInput({ ...input })))
  assert.notEqual(orderFingerprint(canonical), orderFingerprint(orderInput({ ...input, notes: "Changed" })))
  assert.notEqual(orderFingerprint(canonical), orderFingerprint(orderInput({ ...input, discountPercent: 6 })))
  assert.throws(() => orderInput({ ...input, sellerId: input.customerId }))
  assert.throws(() => orderInput({ ...input, items: [...input.items, ...input.items] }))
  assert.throws(() => orderInput({ ...input, items: [] }))
  assert.throws(() => orderInput({ ...input, discountPercent: 100.01 }))
  assert.throws(() => orderInput({ ...input, notes: null }))
  assert.throws(() => orderInput({ ...input, items: [{ ...input.items[0], quantity: 0.0001 }] }))
  assert.throws(() => orderInput({ ...input, items: [{ ...input.items[0], expectedPrice: 19.999 }] }))
})

test("reordering unique products preserves canonical identity and lock order", () => {
  const second = { productId: "550e8400-e29b-41d4-a716-446655440002", quantity: 1, expectedPrice: 3 }
  const a = orderInput({ ...input, items: [second, ...input.items] })
  const b = orderInput({ ...input, items: [...input.items, second] })
  assert.deepEqual(a.items, b.items)
  assert.equal(orderFingerprint(a), orderFingerprint(b))
})
