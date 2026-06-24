"use client"

import Image from "next/image"
import { Minus, Package, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CATEGORY_BADGE } from "@/lib/config/brand"
import { formatCurrency } from "@/lib/utils/format"
import type { Product } from "@/lib/types"
import { useToast } from "@/components/ui/toast"

interface ProductCardProps {
  product: Product
  quantity: number
  onAdd: (product: Product) => void
  onRemove: (productId: string) => void
}

export function ProductCard({ product, quantity, onAdd, onRemove }: ProductCardProps) {
  const { toast } = useToast()
  const inOrder = quantity > 0

  function handleAdd() {
    onAdd(product)
    if (!inOrder) toast(`${product.name} adicionado ao pedido`)
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-colors",
        inOrder ? "border-2 border-accent" : "border-border",
      )}
    >
      {/* Área visual / imagem do produto */}
      <div className="relative flex aspect-[4/3] items-center justify-center bg-secondary">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <Package className="size-10 text-primary/40" aria-hidden="true" />
        )}
        <Badge
          className={cn("absolute left-2 top-2 max-w-[85%] truncate", CATEGORY_BADGE[product.category])}
        >
          {product.category}
        </Badge>
        {inOrder && (
          <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground shadow">
            {quantity}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold leading-snug text-foreground text-pretty">
            {product.name}
          </h3>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">SKU {product.sku}</p>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-base font-bold text-primary">{formatCurrency(product.price)}</p>
            <p className="text-xs text-muted-foreground">por {product.unit}</p>
          </div>
        </div>

        {/* Controles de quantidade */}
        {inOrder ? (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-secondary p-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remover uma unidade de ${product.name}`}
              onClick={() => onRemove(product.id)}
              className="text-primary hover:bg-background"
            >
              <Minus />
            </Button>
            <span className="min-w-8 text-center text-sm font-semibold text-foreground">{quantity}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Adicionar uma unidade de ${product.name}`}
              onClick={handleAdd}
              className="text-primary hover:bg-background"
            >
              <Plus />
            </Button>
          </div>
        ) : (
          <Button variant="action" size="sm" onClick={handleAdd} className="w-full">
            <Plus />
            Adicionar
          </Button>
        )}
      </div>
    </div>
  )
}
