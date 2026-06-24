"use client"

import { useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { FileText, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input, Label, Textarea } from "@/components/ui/input"
import { useCart } from "@/lib/hooks/useCart"
import { useOrder } from "@/lib/hooks/useOrder"
import { useSeller } from "@/lib/hooks/useSeller"
import { useToast } from "@/components/ui/toast"
import { formatCurrency, generateOrderId, maskDocument, maskPhone } from "@/lib/utils/format"
import type { Order } from "@/lib/types"
import { CartItem } from "./CartItem"

export function CartContent() {
  const router = useRouter()
  const { toast } = useToast()
  const { seller } = useSeller()
  const { items, addItem, removeOne, removeItem, subtotal } = useCart()
  const {
    customer,
    notes,
    discountPercent,
    setCustomer,
    setNotes,
    setDiscountPercent,
    setLastOrder,
  } = useOrder()

  const docRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)

  const discountValue = subtotal * (discountPercent / 100)
  const total = subtotal - discountValue

  function handleAddOne(productId: string) {
    const item = items.find((i) => i.product.id === productId)
    if (item) {
      addItem(item.product)
      toast(`${item.product.name} adicionado ao pedido`)
    }
  }

  const handleDocChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const cursorPos = e.target.selectionStart ?? 0
      const rawInput = e.target.value
      const rawDigits = rawInput.replace(/\D/g, "")
      const masked = maskDocument(rawDigits)
      setCustomer({ document: masked })
      requestAnimationFrame(() => {
        if (docRef.current) {
          const addedChars = masked.length - rawInput.length
          const newPos = Math.max(0, Math.min(cursorPos + addedChars, masked.length))
          docRef.current.setSelectionRange(newPos, newPos)
        }
      })
    },
    [setCustomer],
  )

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const cursorPos = e.target.selectionStart ?? 0
      const rawInput = e.target.value
      const rawDigits = rawInput.replace(/\D/g, "")
      const masked = maskPhone(rawDigits)
      setCustomer({ phone: masked })
      requestAnimationFrame(() => {
        if (phoneRef.current) {
          const addedChars = masked.length - rawInput.length
          const newPos = Math.max(0, Math.min(cursorPos + addedChars, masked.length))
          phoneRef.current.setSelectionRange(newPos, newPos)
        }
      })
    },
    [setCustomer],
  )

  function handleGenerate() {
    if (items.length === 0) {
      toast("Adicione itens ao pedido antes de gerar a nota.", "info")
      return
    }
    if (!customer.companyName.trim()) {
      toast("Informe a razão social / nome da empresa.", "info")
      return
    }
    const order: Order = {
      id: generateOrderId(),
      createdAt: new Date().toISOString(),
      seller: seller!,
      customer,
      items,
      notes,
      discountPercent,
      subtotal,
      discountValue,
      total,
    }
    setLastOrder(order)
    router.push("/nota")
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
      {/* Coluna principal */}
      <div className="flex flex-col gap-5">
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
              />
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-base font-semibold text-foreground">Dados do cliente</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="companyName">Razão Social / Nome da empresa</Label>
              <Input
                id="companyName"
                value={customer.companyName}
                onChange={(e) => setCustomer({ companyName: e.target.value })}
                placeholder="Ex.: Construtora Horizonte Ltda."
              />
            </div>
            <div>
              <Label htmlFor="document">CNPJ / CPF</Label>
              <Input
                id="document"
                ref={docRef}
                value={customer.document}
                onChange={handleDocChange}
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                ref={phoneRef}
                value={customer.phone}
                onChange={handlePhoneChange}
                placeholder="(00) 00000-0000"
                inputMode="tel"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={customer.address}
                onChange={(e) => setCustomer({ address: e.target.value })}
                placeholder="Rua, número, bairro, cidade - UF"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="contactName">Nome do responsável</Label>
              <Input
                id="contactName"
                value={customer.contactName}
                onChange={(e) => setCustomer({ contactName: e.target.value })}
                placeholder="Ex.: Maria Souza"
              />
            </div>
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

      {/* Resumo */}
      <div className="lg:sticky lg:top-20 lg:self-start">
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

          <Button variant="action" size="lg" className="mt-4 w-full" onClick={handleGenerate}>
            <FileText />
            Gerar Nota do Pedido
          </Button>
        </Card>
      </div>
    </div>
  )
}
