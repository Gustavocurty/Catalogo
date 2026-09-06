"use client"

import Image from "next/image"
import { useState } from "react"
import { Package, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CATEGORY_BADGE } from "@/lib/config/brand"
import { formatCurrency } from "@/lib/utils/format"
import type { Product } from "@/lib/types"
import { getQuantityMax, getQuantityStep, validateQuantity } from "@/lib/utils/quantity"
import { QuantityControl } from "./QuantityControl"

interface ProductCardProps {
  product: Product
  quantity: number
  onAdd: (product: Product) => void
  onRemove: (productId: string) => void
  onQuantityChange: (productId: string, quantity: number) => void
  disabled?: boolean
}

export function ProductCard({ product, quantity, onAdd, onRemove, onQuantityChange, disabled = false }: ProductCardProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const inOrder = quantity > 0
  const step = getQuantityStep(product)
  const available = getQuantityMax(product)
  const blocked = product.active === false || product.saleBlocked
  const soldOut = !Number.isFinite(product.stock) || product.stock < step
  const canAdd = !disabled && !validateQuantity(quantity + step, { min: step, max: available, step })

  return (
    <div
      className={cn(
        "group hover-lift flex flex-col overflow-hidden rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm",
        inOrder ? "border-2 border-accent" : "border-border/80",
      )}
    >
      {/* Área visual / imagem do produto */}
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-secondary">
        {product.imageUrl && failedImage !== product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="hover-zoom object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            onError={() => setFailedImage(product.imageUrl)}
          />
        ) : (
          <Package className="size-10 text-primary/40" aria-hidden="true" />
        )}
        <Badge
          className={cn("absolute left-2 top-2 max-w-[85%] truncate", CATEGORY_BADGE[product.category])}
        >
          {product.category}
        </Badge>
        <div className="absolute inset-x-2 bottom-2 flex flex-wrap items-center justify-end gap-1">
          {(blocked || soldOut) && (
            <Badge className="mr-auto bg-background text-foreground">
              {blocked ? "Bloqueado" : "Esgotado"}
            </Badge>
          )}
          {inOrder && (
            <span className="flex min-h-7 max-w-full items-center justify-center rounded-full bg-accent px-2 text-xs font-semibold tabular-nums text-accent-foreground shadow">
              {String(quantity).replace(".", ",")}
            </span>
          )}
        </div>
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
          <QuantityControl
            value={quantity}
            min={step}
            max={Math.max(quantity, disabled ? 0 : available)}
            step={step}
            label={`Quantidade de ${product.name}`}
            onChange={(value) => onQuantityChange(product.id, value)}
            onIncrement={() => onAdd(product)}
            onDecrement={() => onRemove(product.id)}
          />
        ) : (
          <Button variant="action" size="sm" onClick={() => onAdd(product)} disabled={!canAdd} className="w-full">
            <Plus />
            Adicionar
          </Button>
        )}
      </div>
    </div>
  )
}
