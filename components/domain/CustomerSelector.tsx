"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/input"
import { useCartStore } from "@/lib/store/cartStore"
import { useOrder } from "@/lib/hooks/useOrder"
import { customerService } from "@/lib/services/customerService"
import type { Customer } from "@/lib/types"

const NEW_CUSTOMER = "__new__"

interface CustomerSelectorProps {
  id?: string
  returnTo?: "/catalogo" | "/carrinho"
  keepCart?: boolean
}

export function CustomerSelector({ id = "catalog-customer", returnTo = "/catalogo", keepCart = true }: CustomerSelectorProps) {
  const router = useRouter()
  const { customer, setCustomer, clearCustomer } = useOrder()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const selectedId = customer.id ?? ""
  const [editing, setEditing] = useState(!selectedId)

  useEffect(() => {
    let active = true
    customerService.list(false).then((data) => {
      if (active) setCustomers(data)
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!selectedId) setEditing(true)
  }, [selectedId])

  const options = useMemo(() => {
    if (selectedId && !customers.some((item) => item.id === selectedId)) {
      return [customer, ...customers]
    }
    return customers
  }, [customer, customers, selectedId])

  function handleChange(id: string) {
    if (id === NEW_CUSTOMER) {
      router.push(`/clientes/?new=1&return=${returnTo}`)
      return
    }
    if (!id) {
      clearCustomer()
      setEditing(true)
      return
    }
    const next = options.find((item) => item.id === id)
    if (!next) return
    const hasDraft = useCartStore.getState().items.length > 0
    if (hasDraft && selectedId && selectedId !== id) {
      const message = keepCart
        ? `Trocar o cliente não altera o pedido montado.\n\nTrocar para "${next.companyName}"? Os itens, observações e desconto serão mantidos.`
        : "Trocar o cliente apaga o rascunho atual. Continuar?"
      if (!window.confirm(message)) return
    }
    setCustomer(next)
    setEditing(false)
  }

  if (selectedId && !editing) {
    return (
      <div className="flex flex-col gap-3 min-[480px]:flex-row min-[480px]:items-start min-[480px]:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cliente do pedido</p>
          <p className="text-base font-semibold text-foreground">{customer.companyName}</p>
          <div className="space-y-0.5 text-sm text-muted-foreground">
            {customer.document ? <p>Doc.: {customer.document}</p> : null}
            {customer.contactName ? <p>Resp.: {customer.contactName}</p> : null}
            {customer.phone ? <p>{customer.phone}</p> : null}
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full min-[480px]:w-auto" onClick={() => setEditing(true)}>
          <Pencil />
          Editar
        </Button>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-3">
      {keepCart && selectedId ? (
        <div className="rounded-lg border border-amber-300/70 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-50">
          <p className="font-medium">Trocar o cliente não altera o pedido.</p>
          <p className="mt-1">Os itens, observações e desconto já montados são mantidos.</p>
        </div>
      ) : null}
      <div>
        <Label htmlFor={id}>{selectedId ? "Trocar cliente" : "Cliente do pedido"}</Label>
        <div className="flex flex-col gap-2 min-[480px]:flex-row min-[480px]:items-center">
          <select
            id={id}
            value={selectedId}
            disabled={loading}
            autoFocus={!!selectedId}
            onChange={(event) => handleChange(event.target.value)}
            className="h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-base text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:text-sm"
          >
            <option value="">{loading ? "Carregando clientes..." : "Escolha um cliente"}</option>
            {options.map((item) => (
              <option key={item.id} value={item.id}>
                {item.companyName}{item.document ? ` · ${item.document}` : ""}
              </option>
            ))}
            <option value={NEW_CUSTOMER}>+ Adicionar novo cliente</option>
          </select>
          {selectedId ? (
            <Button variant="outline" size="sm" className="w-full min-[480px]:w-auto" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
