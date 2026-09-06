import type { Product } from "../types"

export const MAX_QUANTITY = 1_000_000

export function getQuantityStep(product: Pick<Product, "quantityStep">): number {
  return product.quantityStep ?? 1
}

export function getQuantityMax(product: Pick<Product, "stock" | "active" | "saleBlocked">): number {
  if (product.active === false || product.saleBlocked || !Number.isFinite(product.stock)) return 0
  return Math.max(0, Math.min(MAX_QUANTITY, product.stock))
}

export function normalizeQuantity(value: number): number {
  return Number(value.toPrecision(15))
}

export function parseQuantity(text: string, step = 1): number {
  const pattern = step < 1 ? /^\d+(?:[.,]\d+)?$/ : /^\d+$/
  const trimmed = text.trim()
  return pattern.test(trimmed) ? Number(trimmed.replace(",", ".")) : NaN
}

export function validateQuantity(
  value: number,
  { min = 1, max = MAX_QUANTITY, step = 1 }: { min?: number; max?: number; step?: number } = {},
): string | null {
  if (!Number.isFinite(step) || step <= 0 || step > MAX_QUANTITY) return "Incremento de quantidade invalido."
  if (!Number.isFinite(value)) return "Digite uma quantidade valida, sem separador de milhares."
  if (value <= 0 || value < min) return `Quantidade minima: ${min}. Use o botao de remover para excluir.`
  if (!Number.isFinite(max) || value > Math.min(max, MAX_QUANTITY)) return `Quantidade maxima: ${Math.min(max, MAX_QUANTITY)}.`
  const units = value / step
  const tolerance = Math.min(1e-6, Math.max(1e-8, Math.abs(units) * Number.EPSILON * 8))
  if (!Number.isFinite(units) || Math.abs(units - Math.round(units)) > tolerance) {
    return `Use multiplos de ${String(step).replace(".", ",")}.`
  }
  return null
}
