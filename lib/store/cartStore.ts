import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { CartItem, Product } from "@/lib/types"
import { getQuantityMax, getQuantityStep, normalizeQuantity, validateQuantity } from "../utils/quantity"

interface CartState {
  items: CartItem[]
  addItem: (product: Product) => void
  removeOne: (productId: string) => void
  setQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  clear: () => void
  getQuantity: (productId: string) => number
  totalItems: () => number
  subtotal: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
  items: [],
  addItem: (product) =>
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id)
      const step = getQuantityStep(product)
      const quantity = normalizeQuantity((existing?.quantity ?? 0) + step)
      if (validateQuantity(quantity, { min: step, max: getQuantityMax(product), step })) return state
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id ? {
              ...i,
              quantity,
              // Refresh availability, but retain the selected price/version for server review.
              product: {
                ...i.product,
                stock: product.stock,
                physicalStock: product.physicalStock,
                reservedStock: product.reservedStock,
                active: product.active,
                saleBlocked: product.saleBlocked,
                quantityStep: product.quantityStep,
              },
            } : i,
          ),
        }
      }
      return { items: [...state.items, { product: { ...product }, quantity }] }
    }),
  removeOne: (productId) =>
    set((state) => ({
      items: state.items
        .map((i) => {
          if (i.product.id !== productId) return i
          const step = getQuantityStep(i.product)
          if (!Number.isFinite(step) || step <= 0) return i
          return { ...i, quantity: normalizeQuantity(i.quantity - step) }
        })
        .filter((i) => i.quantity > 0),
    })),
  setQuantity: (productId, quantity) =>
    set((state) => {
      const existing = state.items.find((i) => i.product.id === productId)
      if (!existing) return state
      if (quantity === 0) return { items: state.items.filter((i) => i.product.id !== productId) }
      const step = getQuantityStep(existing.product)
      // Reductions remain possible when an existing line is blocked or exceeds stock.
      const max = Math.max(existing.quantity, getQuantityMax(existing.product))
      if (validateQuantity(quantity, { min: step, max, step })) return state
      return {
        items: state.items.map((i) => i.product.id === productId ? { ...i, quantity: normalizeQuantity(quantity) } : i),
      }
    }),
  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((i) => i.product.id !== productId),
    })),
  clear: () => set({ items: [] }),
  getQuantity: (productId) => get().items.find((i) => i.product.id === productId)?.quantity ?? 0,
  totalItems: () => normalizeQuantity(get().items.reduce((sum, i) => sum + i.quantity, 0)),
  subtotal: () => get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    }),
    { name: "attivus-cart" },
  ),
)
