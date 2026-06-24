"use client"

import { Minus, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils/format"
import type { CartItem as CartItemType } from "@/lib/types"

interface CartItemProps {
  item: CartItemType
  onAdd: (productId: string) => void
  onRemoveOne: (productId: string) => void
  onRemove: (productId: string) => void
}

export function CartItem({ item, onAdd, onRemoveOne, onRemove }: CartItemProps) {
  const { product, quantity } = item
  const subtotal = product.price * quantity

  return (
    <div className="flex gap-3 border-b border-border py-4 last:border-0">
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold leading-snug text-foreground text-pretty">{product.name}</h3>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">SKU {product.sku}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatCurrency(product.price)} / {product.unit}
        </p>

        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-secondary p-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Remover uma unidade de ${product.name}`}
            onClick={() => onRemoveOne(product.id)}
            className="text-primary hover:bg-background"
          >
            <Minus />
          </Button>
          <span className="min-w-8 text-center text-sm font-semibold text-foreground">{quantity}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Adicionar uma unidade de ${product.name}`}
            onClick={() => onAdd(product.id)}
            className="text-primary hover:bg-background"
          >
            <Plus />
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-end justify-between">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Remover ${product.name} do pedido`}
          onClick={() => onRemove(product.id)}
          className="text-destructive hover:bg-destructive/10"
        >
          <Trash2 />
        </Button>
        <p className="text-base font-bold text-foreground">{formatCurrency(subtotal)}</p>
      </div>
    </div>
  )
}
