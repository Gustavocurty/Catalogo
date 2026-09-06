import type { StockMovement } from "@/lib/types"
import { products } from "./products"

export const INITIAL_STOCK_REASON = "Saldo inicial da demonstração"
export const INITIAL_STOCK_ACTOR = "Sistema"

export function stockMovements(now = new Date().toISOString()): Record<string, StockMovement[]> {
  const movements: Record<string, StockMovement[]> = {}
  for (const product of products) {
    const quantity = product.physicalStock ?? product.stock
    if (quantity > 0) {
      movements[product.id] = [{
        id: `m-${product.id}`,
        quantity,
        kind: "INITIAL",
        reason: INITIAL_STOCK_REASON,
        actorName: INITIAL_STOCK_ACTOR,
        createdAt: now,
      }]
    }
  }
  return movements
}
