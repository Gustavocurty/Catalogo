import { ApiError } from "./errors"

export const MAX_TOTAL_CENTS = BigInt("99999999999999")

// Parse decimal digits instead of multiplying IEEE-754 values (e.g. 1.005).
export function scaled(value: unknown, places: number, max: number, name: string, min = 0): bigint {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new ApiError(400, `${name} invalido.`)
  }
  const text = String(value)
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text)
  if (!match || (match[3]?.length ?? 0) > places) throw new ApiError(400, `${name}: use ate ${places} casas decimais.`)
  const magnitude = BigInt(match[2] + (match[3] ?? "").padEnd(places, "0"))
  return match[1] ? -magnitude : magnitude
}

export function decimal(value: bigint, places: number): string {
  const negative = value < BigInt(0)
  const digits = (negative ? -value : value).toString().padStart(places + 1, "0")
  return `${negative ? "-" : ""}${digits.slice(0, -places)}.${digits.slice(-places)}`
}

export function lineCents(priceCents: bigint, quantityMillis: bigint): bigint {
  const value = (priceCents * quantityMillis + BigInt(500)) / BigInt(1000)
  if (value < BigInt(0) || value > MAX_TOTAL_CENTS) throw new ApiError(400, "Valor do pedido excede o limite.")
  return value
}

export function totals(lines: bigint[], discountBasisPoints: bigint) {
  const subtotal = lines.reduce((sum, line) => sum + line, BigInt(0))
  if (subtotal > MAX_TOTAL_CENTS || subtotal < BigInt(0) || discountBasisPoints < BigInt(0) || discountBasisPoints > BigInt(10000)) {
    throw new ApiError(400, "Valor ou desconto do pedido invalido.")
  }
  const discountValue = (subtotal * discountBasisPoints + BigInt(5000)) / BigInt(10000)
  return { subtotal, discountValue, total: subtotal - discountValue }
}

export function validateQuantity(quantity: number, step: number): bigint {
  const units = scaled(quantity, 3, 1000000, "Quantidade", 0.001)
  const increment = scaled(step, 3, 1000000, "Incremento", 0.001)
  if (units % increment !== BigInt(0)) throw new ApiError(400, "Quantidade deve ser multipla do incremento do produto.")
  return units
}
