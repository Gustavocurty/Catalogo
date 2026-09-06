import assert from "node:assert/strict"
import { beforeEach, test } from "node:test"
import type { Product } from "../lib/types"
import { useCartStore } from "../lib/store/cartStore"
import { MAX_QUANTITY, getQuantityMax, getQuantityStep, normalizeQuantity, parseQuantity, validateQuantity } from "../lib/utils/quantity"

const product: Product = {
  id: "quantity-test", sku: "Q1", name: "Produto", description: "", category: "Teste",
  unit: "un", price: 12.5, stock: MAX_QUANTITY, imageUrl: null,
}

beforeEach(() => useCartStore.getState().clear())

test("accepts large quantities without thousands formatting", () => {
  for (const value of [1000, 10000, MAX_QUANTITY]) {
    assert.equal(parseQuantity(String(value)), value)
    assert.equal(validateQuantity(value), null)
  }
  assert.ok(validateQuantity(MAX_QUANTITY + 1))
})

test("rejects empty, non-finite, negative, grouped and malformed input", () => {
  for (const text of ["", " ", "NaN", "Infinity", "1e3", "-1", "1 000", "1.000", "1,000", "1.000,50", "1,2,3", "+2", "abc"]) {
    assert.ok(Number.isNaN(parseQuantity(text)), text)
  }
  for (const value of [NaN, Infinity, -Infinity, -1, 0]) assert.ok(validateQuantity(value))
})

test("accepts decimal comma or dot only for fractional steps, with step tolerance", () => {
  assert.equal(parseQuantity(" 10000,5 ", 0.5), 10000.5)
  assert.equal(parseQuantity("0.3", 0.1), 0.3)
  assert.equal(validateQuantity(0.1 + 0.2, { min: 0.1, step: 0.1 }), null)
  assert.equal(validateQuantity(999999.9, { min: 0.1, step: 0.1 }), null)
  assert.ok(validateQuantity(0.31, { min: 0.1, step: 0.1 }))
  assert.ok(validateQuantity(999999.91, { min: 0.1, step: 0.1 }))
  assert.equal(normalizeQuantity(0.1 + 0.2), 0.3)
})

test("defaults optional product flags and step, but never invents stock", () => {
  assert.equal(getQuantityStep(product), 1)
  assert.equal(getQuantityMax(product), MAX_QUANTITY)
  for (const stock of [NaN, Infinity, -1, 0]) assert.equal(getQuantityMax({ ...product, stock }), 0)
  assert.equal(getQuantityMax({ ...product, stock: MAX_QUANTITY + 1 }), MAX_QUANTITY)
  assert.equal(getQuantityMax({ ...product, active: false }), 0)
  assert.equal(getQuantityMax({ ...product, saleBlocked: true }), 0)
})

test("store accepts 1000, 10000 and the hard cap, rejecting invalid updates", () => {
  const cart = useCartStore.getState()
  cart.addItem(product)
  assert.equal(cart.getQuantity(product.id), 1)
  for (const quantity of [1000, 10000, MAX_QUANTITY]) {
    cart.setQuantity(product.id, quantity)
    assert.equal(cart.getQuantity(product.id), quantity)
  }
  for (const quantity of [NaN, Infinity, -Infinity, -1, 0.5, MAX_QUANTITY + 1]) {
    cart.setQuantity(product.id, quantity)
    assert.equal(cart.getQuantity(product.id), MAX_QUANTITY)
  }
  cart.addItem(product)
  assert.equal(cart.getQuantity(product.id), MAX_QUANTITY)
})

test("setQuantity only updates existing lines and removes explicitly at zero", () => {
  const cart = useCartStore.getState()
  cart.setQuantity(product.id, 1000)
  assert.deepEqual(useCartStore.getState().items, [])
  cart.addItem(product)
  cart.setQuantity(product.id, 0)
  assert.deepEqual(useCartStore.getState().items, [])
})

test("stock is available stock, not physical stock, for both add and set", () => {
  const cart = useCartStore.getState()
  const limited = { ...product, stock: 2, physicalStock: 100, reservedStock: 98 }
  cart.addItem(limited)
  cart.setQuantity(product.id, 3)
  assert.equal(cart.getQuantity(product.id), 1)
  cart.addItem(limited)
  cart.addItem(limited)
  assert.equal(cart.getQuantity(product.id), 2)
  cart.addItem({ ...limited, stock: 1 })
  assert.equal(cart.getQuantity(product.id), 2)
})

test("unavailable products and invalid steps cannot be added", () => {
  const cart = useCartStore.getState()
  for (const overrides of [
    { stock: 0 }, { stock: -1 }, { stock: NaN }, { stock: Infinity },
    { active: false }, { saleBlocked: true }, { quantityStep: 0 },
    { quantityStep: -1 }, { quantityStep: NaN }, { quantityStep: Infinity },
    { quantityStep: MAX_QUANTITY + 1 }, { quantityStep: 2, stock: 1 },
  ]) cart.addItem({ ...product, ...overrides })
  assert.deepEqual(useCartStore.getState().items, [])
})

test("fractional increments and decrements do not accumulate floating point residue", () => {
  const cart = useCartStore.getState()
  const fractional = { ...product, quantityStep: 0.1, stock: 0.3 }
  for (let i = 0; i < 4; i++) cart.addItem(fractional)
  assert.equal(cart.getQuantity(product.id), 0.3)
  cart.setQuantity(product.id, 0.15)
  assert.equal(cart.getQuantity(product.id), 0.3)
  assert.equal(cart.totalItems(), 0.3)
  assert.equal(cart.subtotal(), 3.75)
  cart.removeOne(product.id)
  assert.equal(cart.getQuantity(product.id), 0.2)
  cart.removeOne(product.id)
  assert.equal(cart.getQuantity(product.id), 0.1)
  cart.removeOne(product.id)
  assert.equal(cart.getQuantity(product.id), 0)
})

test("whole pack steps start at a valid multiple and reject partial packs", () => {
  const cart = useCartStore.getState()
  const pack = { ...product, quantityStep: 5, stock: 12 }
  cart.addItem(pack)
  assert.equal(cart.getQuantity(product.id), 5)
  cart.setQuantity(product.id, 6)
  assert.equal(cart.getQuantity(product.id), 5)
  cart.addItem(pack)
  cart.addItem(pack)
  assert.equal(cart.getQuantity(product.id), 10)
})

test("increment refreshes availability but retains the selected price and version", () => {
  const cart = useCartStore.getState()
  cart.addItem({ ...product, stock: 2, version: 1 })
  cart.addItem({ ...product, stock: 3, price: 99, version: 2 })
  const line = useCartStore.getState().items[0]
  assert.equal(line.product.stock, 3)
  assert.equal(line.product.price, product.price)
  assert.equal(line.product.version, 1)
  assert.equal(cart.subtotal(), 25)
  cart.setQuantity(product.id, 4)
  assert.equal(cart.getQuantity(product.id), 2)
})

test("blocked or overstock lines can still be reduced or removed, never increased", () => {
  const cart = useCartStore.getState()
  for (const overrides of [{ saleBlocked: true }, { active: false }, { stock: 0 }]) {
    useCartStore.setState({ items: [{ product: { ...product, ...overrides }, quantity: 10 }] })
    cart.addItem({ ...product, ...overrides })
    cart.setQuantity(product.id, 11)
    assert.equal(cart.getQuantity(product.id), 10)
    cart.setQuantity(product.id, 5)
    assert.equal(cart.getQuantity(product.id), 5)
    cart.removeOne(product.id)
    assert.equal(cart.getQuantity(product.id), 4)
    cart.removeItem(product.id)
    assert.equal(cart.getQuantity(product.id), 0)
  }
})

test("clear resets totals", () => {
  const cart = useCartStore.getState()
  cart.addItem(product)
  cart.clear()
  assert.equal(cart.totalItems(), 0)
  assert.equal(cart.subtotal(), 0)
})
