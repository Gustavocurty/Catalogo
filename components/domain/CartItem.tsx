"use client"

import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils/format"
import type { CartItem as CartItemType } from "@/lib/types"
import { getQuantityMax, getQuantityStep } from "@/lib/utils/quantity"
import { QuantityControl } from "./QuantityControl"

interface CartItemProps {
  item: CartItemType
  onAdd: (productId: string) => void
  onRemoveOne: (productId: string) => void
  onRemove: (productId: string) => void
  onQuantityChange: (productId: string, quantity: number) => void
  disabled?: boolean
}

export function CartItem({ item, onAdd, onRemoveOne, onRemove, onQuantityChange, disabled = false }: CartItemProps) {
  const { product, quantity } = item
  const subtotal = product.price * quantity
  const step = getQuantityStep(product)

  return (
    <div className="flex flex-wrap gap-3 border-b border-border py-4 last:border-0">
      <div className="min-w-36 flex-1">
        <h3 className="text-sm font-semibold leading-snug text-foreground text-pretty">{product.name}</h3>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">SKU {product.sku}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatCurrency(product.price)} / {product.unit}
        </p>

        <div className="mt-2 min-w-36 max-w-64">
          <QuantityControl
            value={quantity}
            min={step}
            max={Math.max(quantity, disabled ? 0 : getQuantityMax(product))}
            step={step}
            label={`Quantidade de ${product.name}`}
            onChange={(value) => onQuantityChange(product.id, value)}
            onIncrement={() => onAdd(product.id)}
            onDecrement={() => onRemoveOne(product.id)}
          />
        </div>
      </div>

      <div className="ml-auto flex min-w-0 max-w-full flex-col items-end justify-between">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Remover ${product.name} do pedido`}
          onClick={() => onRemove(product.id)}
          className="text-destructive hover:bg-destructive/10"
        >
          <Trash2 />
        </Button>
        <p className="break-all text-right text-base font-bold text-foreground">{formatCurrency(subtotal)}</p>
      </div>
    </div>
  )
}
