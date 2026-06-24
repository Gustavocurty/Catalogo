"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Package } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { CATEGORIES } from "@/lib/config/brand"
import { productService } from "@/lib/services/productService"
import { useCart } from "@/lib/hooks/useCart"
import type { Product } from "@/lib/types"
import { ProductCard } from "./ProductCard"
import { CartFAB } from "./CartFAB"

export function CatalogContent() {
  const { addItem, removeOne, getQuantity, totalItems, subtotal } = useCart()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("Todas")

  useEffect(() => {
    let active = true
    productService.getAll().then((data) => {
      if (active) {
        setProducts(data)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return products.filter((p) => {
      const matchCategory = activeCategory === "Todas" || p.category === activeCategory
      const matchTerm =
        !term || p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)
      return matchCategory && matchTerm
    })
  }, [products, search, activeCategory])

  const chips = ["Todas", ...CATEGORIES]

  return (
    <>
      {/* Busca e filtros */}
      <div className="sticky z-20 border-b border-border bg-background/95 backdrop-blur" style={{ top: "var(--header-h, 0px)" }}>
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou SKU..."
              className="pl-10"
              aria-label="Buscar produtos"
            />
          </div>

          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {chips.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  activeCategory === cat
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-accent/40 hover:text-foreground",
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grade de produtos */}
      <div className="mx-auto max-w-5xl px-4 py-5 pb-28">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl bg-secondary" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="size-12 text-muted-foreground/50" />
            <p className="mt-3 font-medium text-foreground">Nenhum produto encontrado</p>
            <p className="text-sm text-muted-foreground">Tente outro termo ou categoria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                quantity={getQuantity(product.id)}
                onAdd={addItem}
                onRemove={removeOne}
              />
            ))}
          </div>
        )}
      </div>

      <CartFAB count={totalItems} subtotal={subtotal} />
    </>
  )
}
