import type { Seller } from "@/lib/types"

export const adminSeller: Seller = {
  id: "seller-ADMIN",
  name: "Administrador",
  code: "ADMIN",
  role: "ADMIN",
}

export const sellers: Seller[] = [
  adminSeller,
  {
    id: "seller-VEND-042",
    name: "Ana Ribeiro",
    code: "VEND-042",
    role: "SELLER",
  },
]

export const SELLER_CODE_PLACEHOLDER = "Ex.: admin ou VEND-042"

export function sellerFromCode(raw: string): Seller {
  const code = raw.trim()
  if (code.toLowerCase() === "admin") return adminSeller
  const normalized = code.toUpperCase()
  const known = sellers.find((seller) => seller.code.toUpperCase() === normalized)
  if (known) return known
  return {
    id: `seller-${normalized}`,
    name: code,
    code: normalized,
    role: "SELLER",
  }
}
