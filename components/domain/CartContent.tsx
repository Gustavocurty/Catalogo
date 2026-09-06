"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { FileCheck, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input, Label, Textarea } from "@/components/ui/input"
import { useCart } from "@/lib/hooks/useCart"
import { useOrder } from "@/lib/hooks/useOrder"
import { useSeller } from "@/lib/hooks/useSeller"
import { ApiError } from "@/lib/local/errors"
import { orderService } from "@/lib/services/orderService"
import { useToast } from "@/components/ui/toast"
import { formatCurrency } from "@/lib/utils/format"
import { CartItem } from "./CartItem"
import { CustomerSelector } from "./CustomerSelector"

export function CartContent() {
  const router = useRouter()
  const { toast } = useToast()
  const { seller } = useSeller()
  const { items, addItem, removeOne, removeItem, setQuantity, clear, subtotal } = useCart()
  const {
    customer,
    notes,
    discountPercent,
    setNotes,
    setDiscountPercent,
    setLastOrder,
  } = useOrder()

  const [submitting, setSubmitting] = useState(false)
  const idempotencyRef = useRef<string | null>(null)

  const discountValue = subtotal * (discountPercent / 100)
  const total = subtotal - discountValue
  const hasCustomer = !!customer.id && customer.active !== false

  function handleAddOne(productId: string) {
    const item = items.find((i) => i.product.id === productId)
    if (item) {
      addItem(item.product)
      toast(`${item.product.name} adicionado ao pedido`)
    }
  }

  async function handleConfirm() {
    if (items.length === 0) {
      toast("Adicione itens ao pedido antes de confirmar.", "info")
      return
    }
    if (!hasCustomer || !customer.id) {
      toast("Selecione um cliente cadastrado antes de confirmar.", "info")
      document.getElementById("cart-customer")?.focus()
      return
    }
    if (!seller) return

    if (!idempotencyRef.current) {
      idempotencyRef.current = crypto.randomUUID()
    }

    setSubmitting(true)
    try {
      const order = await orderService.create({
        customerId: customer.id,
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          expectedPrice: item.product.price,
        })),
        notes,
        discountPercent,
        idempotencyKey: idempotencyRef.current,
      }, seller)
      setLastOrder(order)
      clear()
      idempotencyRef.current = null
      toast(`Pedido ${order.number} registrado como pendente.`)
      router.push(`/pedidos/?id=${order.id}`)
    } catch (cause) {
      toast(cause instanceof ApiError ? cause.message : "Não foi possível confirmar o pedido.", "info")
    } finally {
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center px-4 py-24 text-center">
        <ShoppingCart className="size-14 text-muted-foreground/40" />
        <p className="mt-4 text-lg font-semibold text-foreground">Seu pedido está vazio</p>
        <p className="mt-1 text-sm text-muted-foreground">Volte ao catálogo para adicionar produtos.</p>
        <Button variant="action" className="mt-6" onClick={() => router.push("/catalogo")}>
          Ir ao catálogo
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-5 px-4 py-5 pb-28 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-5">
        <Card className="space-y-3 p-4">
          <h2 className="text-base font-semibold text-foreground">Cliente do pedido</h2>
          {!hasCustomer ? (
            <p className="text-sm text-muted-foreground">Escolha um cliente para confirmar o pedido. Os itens atuais serão mantidos.</p>
          ) : null}
          <CustomerSelector id="cart-customer" returnTo="/carrinho" keepCart />
        </Card>

        <Card className="p-4">
          <h2 className="mb-1 text-base font-semibold text-foreground">Itens do pedido</h2>
          <div>
            {items.map((item) => (
              <CartItem
                key={item.product.id}
                item={item}
                onAdd={handleAddOne}
                onRemoveOne={removeOne}
                onRemove={removeItem}
                onQuantityChange={setQuantity}
              />
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Condições de pagamento, prazo de entrega, observações gerais..."
          />
        </Card>
      </div>

      <div className="lg:sticky lg:self-start" style={{ top: "calc(var(--header-h, 6rem) + 1rem)" }}>
        <Card className="p-4">
          <h2 className="mb-3 text-base font-semibold text-foreground">Resumo</h2>

          <div className="mb-3">
            <Label htmlFor="discount">Desconto (%)</Label>
            <Input
              id="discount"
              type="number"
              min={0}
              max={100}
              value={discountPercent}
              onChange={(e) => {
                const v = Number(e.target.value)
                setDiscountPercent(Number.isNaN(v) ? 0 : Math.min(100, Math.max(0, v)))
              }}
              placeholder="0"
              inputMode="numeric"
            />
          </div>

          <dl className="flex flex-col gap-2 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-medium text-foreground">{formatCurrency(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Desconto ({discountPercent}%)</dt>
              <dd className="font-medium text-destructive">- {formatCurrency(discountValue)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base">
              <dt className="font-semibold text-foreground">Total</dt>
              <dd className="font-bold text-primary">{formatCurrency(total)}</dd>
            </div>
          </dl>

          <Button variant="action" size="lg" className="mt-4 w-full" onClick={handleConfirm} disabled={submitting || !hasCustomer}>
            <FileCheck />
            {submitting ? "Confirmando..." : "Confirmar pedido"}
          </Button>
        </Card>
      </div>
    </div>
  )
}
