"use client"

import { useDeferredValue, useEffect, useState } from "react"
import { Search, Package } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { productService } from "@/lib/services/productService"
import { useCart } from "@/lib/hooks/useCart"
import { useOrder } from "@/lib/hooks/useOrder"
import { useSeller } from "@/lib/hooks/useSeller"
import { useToast } from "@/components/ui/toast"
import { getQuantityMax, getQuantityStep, validateQuantity } from "@/lib/utils/quantity"
import type { Product } from "@/lib/types"
import { ProductCard } from "./ProductCard"
import { CartFAB } from "./CartFAB"
import { CustomerSelector } from "./CustomerSelector"

export function CatalogContent() {
  const { toast } = useToast()
  const { customer } = useOrder()
  const { seller } = useSeller()
  const operations = seller?.role === "OPERATIONS"
  const hasCustomer = !!customer.id && customer.active !== false
  const { addItem, removeOne, setQuantity, getQuantity, totalItems, subtotal } = useCart()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    productService.getAll().then((data) => {
      if (active) {
        setProducts(data)
      }
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Nao foi possivel carregar o catalogo.")
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => {
      active = false
    }
  }, [attempt])

  const categories = Array.from(new Set(products.map((product) => product.category).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
  const selectedCategory = activeCategory && categories.includes(activeCategory) ? activeCategory : null
  const term = deferredSearch.trim().toLowerCase()
  const filtered = products.filter((p) => {
    const matchCategory = selectedCategory === null || p.category === selectedCategory
    const matchTerm =
      !term || p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)
    return matchCategory && matchTerm
  })

  const chips = [null, ...categories]

  function requireCustomer() {
    if (!seller || operations) return false
    if (hasCustomer) return true
    toast("Escolha um cliente para adicionar produtos.", "info")
    document.getElementById("catalog-customer")?.focus()
    return false
  }

  function handleAdd(product: Product) {
    if (requireCustomer()) addItem(product)
  }

  function handleQuantityChange(productId: string, quantity: number) {
    const current = getQuantity(productId)
    if (quantity > current && !requireCustomer()) return
    const product = products.find((item) => item.id === productId)
    if (!product) return
    const step = getQuantityStep(product)
    if (validateQuantity(quantity, { min: step, max: Math.max(current, getQuantityMax(product)), step })) return
    setQuantity(productId, quantity)
  }

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
                key={cat === null ? "all" : `category:${cat}`}
                type="button"
                onClick={() => setActiveCategory(cat)}
                aria-pressed={selectedCategory === cat}
                className={cn(
                  "hover-lift shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  selectedCategory === cat
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-accent/40 hover:text-foreground",
                )}
              >
                {cat ?? "Todas"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grade de produtos */}
      <div className="mx-auto max-w-5xl px-4 py-5 pb-24 lg:pb-28">
        <div className="mb-4 rounded-xl border border-border/80 bg-card/80 p-3 text-sm">
          {operations ? (
            <p className="text-muted-foreground">Perfil de operações: consulta do catálogo. Não pode iniciar pedidos ou adicionar produtos.</p>
          ) : (
            <CustomerSelector />
          )}
        </div>
        {loading ? (
          <div role="status" aria-label="Carregando produtos" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl bg-secondary" />
            ))}
          </div>
        ) : error ? (
          <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</Button>
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
                onAdd={handleAdd}
                onRemove={removeOne}
                onQuantityChange={handleQuantityChange}
                disabled={!seller || operations}
              />
            ))}
          </div>
        )}
      </div>

      {!operations && hasCustomer && <CartFAB count={totalItems} subtotal={subtotal} />}
    </>
  )
}
