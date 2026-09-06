import type { Seller } from "@/lib/types"

export const ROLE_LABEL = {
  ADMIN: "Administrador",
  SELLER: "Vendedor",
  OPERATIONS: "Operação",
} as const

export function normalizePath(pathname: string) {
  return pathname.replace(/\/$/, "") || "/"
}

export function pathMatches(pathname: string, href: string) {
  const current = normalizePath(pathname)
  const target = normalizePath(href)
  return current === target || current.startsWith(`${target}/`)
}

export function canSell(seller: Seller | null | undefined) {
  return seller?.role === "ADMIN" || seller?.role === "SELLER"
}

export type PrimaryTab = "perfil" | "catalogo" | "carrinho" | "pedidos" | "more"

export function navVisibility(seller: Seller | null | undefined) {
  const sell = canSell(seller)
  return {
    perfil: true,
    catalogo: true,
    carrinho: sell,
    pedidos: true,
    clientes: sell,
    produtos: seller?.role === "ADMIN",
  }
}

export function activePrimaryTab(pathname: string): PrimaryTab | null {
  const path = normalizePath(pathname)
  if (path === "/perfil") return "perfil"
  if (path === "/catalogo") return "catalogo"
  if (path === "/carrinho") return "carrinho"
  if (path === "/pedidos" || path === "/nota") return "pedidos"
  if (path === "/clientes" || path === "/produtos") return "more"
  return null
}
