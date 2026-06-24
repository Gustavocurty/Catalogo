import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Seller } from "@/lib/types"

interface SellerState {
  seller: Seller | null
  setSeller: (seller: Seller) => void
  clearSeller: () => void
  isAuthenticated: () => boolean
}

export const useSellerStore = create<SellerState>()(
  persist(
    (set, get) => ({
      seller: null,
      setSeller: (seller) => set({ seller }),
      clearSeller: () => set({ seller: null }),
      isAuthenticated: () => !!get().seller,
    }),
    { name: "attivus-seller" },
  ),
)
