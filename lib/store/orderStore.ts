import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Customer, Order } from "@/lib/types"

const emptyCustomer: Customer = {
  companyName: "",
  document: "",
  address: "",
  phone: "",
  contactName: "",
}

interface OrderState {
  customer: Customer
  notes: string
  discountPercent: number
  lastOrder: Order | null
  setCustomer: (customer: Partial<Customer>) => void
  setNotes: (notes: string) => void
  setDiscountPercent: (value: number) => void
  setLastOrder: (order: Order) => void
  resetOrderForm: () => void
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      customer: emptyCustomer,
      notes: "",
      discountPercent: 0,
      lastOrder: null,
      setCustomer: (customer) => set((state) => ({ customer: { ...state.customer, ...customer } })),
      setNotes: (notes) => set({ notes }),
      setDiscountPercent: (value) => set({ discountPercent: value }),
      setLastOrder: (order) => set({ lastOrder: order }),
      resetOrderForm: () => set({ customer: emptyCustomer, notes: "", discountPercent: 0 }),
    }),
    { name: "attivus-order" },
  ),
)
