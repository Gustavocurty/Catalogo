"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ClipboardList, FilePlus2, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input, Label } from "@/components/ui/input"
import { OrderTimeline } from "@/components/domain/OrderTimeline"
import { ORDER_PIPELINE, ORDER_STATUS_BADGE, ORDER_STATUS_LABELS, nextPipelineStatus } from "@/lib/config/orders"
import { useCart } from "@/lib/hooks/useCart"
import { useOrder } from "@/lib/hooks/useOrder"
import { useSeller } from "@/lib/hooks/useSeller"
import { ApiError } from "@/lib/local/errors"
import { orderService } from "@/lib/services/orderService"
import { useToast } from "@/components/ui/toast"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { cn } from "@/lib/utils"
import type { Order, OrderStatus } from "@/lib/types"
import { OrderShare } from "./OrderShare"

export function OrderList() {
  const router = useRouter()
  const { toast } = useToast()
  const { seller } = useSeller()
  const { resetOrderForm } = useOrder()
  const { clear } = useCart()
  const isAdmin = seller?.role === "ADMIN"
  const canStartOrder = seller?.role !== "OPERATIONS"
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [sellerQuery, setSellerQuery] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!seller) return
    let active = true
    setLoading(true)
    setError("")
    orderService.listAll(seller).then((data) => {
      if (active) setOrders(data)
    }).catch((cause) => {
      if (active) setError(cause instanceof ApiError ? cause.message : "Não foi possível carregar os pedidos.")
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => {
      active = false
    }
  }, [seller])

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR")
    const sellerTerm = sellerQuery.trim().toLocaleLowerCase("pt-BR")
    return (orders ?? []).filter((order) => {
      const matchStatus = !status || order.status === status
      const matchTerm = !term || [
        order.number,
        order.customer.companyName,
        order.seller.name,
        order.seller.code,
      ].some((value) => value.toLocaleLowerCase("pt-BR").includes(term))
      const matchSeller = !sellerTerm || [order.seller.name, order.seller.code].some((value) => value.toLocaleLowerCase("pt-BR").includes(sellerTerm))
      return matchStatus && matchTerm && matchSeller
    })
  }, [orders, search, sellerQuery, status])

  async function advance(order: Order, next: OrderStatus) {
    if (!isAdmin || !seller) return
    if (!window.confirm(`Avançar o pedido ${order.number} para "${ORDER_STATUS_LABELS[next]}"?`)) return
    setBusyId(order.id)
    try {
      const updated = await orderService.updateStatus(order.id, { status: next, version: order.version }, seller)
      setOrders((current) => (current ?? []).map((item) => item.id === updated.id ? updated : item))
      toast(`Pedido ${updated.number} atualizado para ${ORDER_STATUS_LABELS[updated.status]}.`)
    } catch (cause) {
      toast(cause instanceof ApiError ? cause.message : "Não foi possível atualizar o pedido.", "info")
    } finally {
      setBusyId(null)
    }
  }

  function handleNewOrder() {
    clear()
    resetOrderForm()
    toast("Pronto para um novo pedido!")
    router.push("/catalogo")
  }

  return (
    <main className="mx-auto max-w-5xl space-y-3 px-3 py-4 pb-20 sm:space-y-4 sm:px-4 sm:py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">{isAdmin ? "Pedidos de todos os vendedores" : "Seus pedidos feitos"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin
              ? "Acompanhe a linha do tempo e avance a montagem, o envio e a entrega."
              : "Acompanhe a situação dos pedidos que você registrou."}
          </p>
        </div>
        {canStartOrder ? (
          <Button variant="outline" className="w-full shrink-0 sm:w-auto" onClick={handleNewOrder}>
            <FilePlus2 />
            Novo pedido
          </Button>
        ) : null}
      </div>

      <form
        className={cn(
          "grid gap-3 rounded-xl border border-border/80 bg-card/80 p-4",
          isAdmin ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2",
        )}
        onSubmit={(event) => event.preventDefault()}
      >
        <div className={isAdmin ? "sm:col-span-2 lg:col-span-1" : undefined}>
          <Label htmlFor="order-search">Buscar</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 size-5 text-muted-foreground" />
            <Input id="order-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Número, cliente ou vendedor" className="pl-10" />
          </div>
        </div>
        <div>
          <Label htmlFor="order-status">Etapa</Label>
          <select
            id="order-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base sm:text-sm"
          >
            <option value="">Todas</option>
            {([...ORDER_PIPELINE, "CANCELLED"] as OrderStatus[]).map((value) => (
              <option key={value} value={value}>
                {ORDER_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        {isAdmin ? (
          <div>
            <Label htmlFor="order-seller">Vendedor</Label>
            <Input id="order-seller" value={sellerQuery} onChange={(event) => setSellerQuery(event.target.value)} placeholder="Nome ou código" />
          </div>
        ) : null}
      </form>

      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">Carregando pedidos...</p>
      ) : error ? (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <ClipboardList className="size-12 text-muted-foreground/50" />
          <p className="mt-3 font-medium">Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{filtered.length} pedido(s)</p>
          {filtered.map((order) => {
            const next = nextPipelineStatus(order.status)
            return (
              <Card key={order.id} className="overflow-hidden p-0">
                <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
                  <div className="min-w-0">
                    <Link href={`/pedidos/?id=${order.id}`} className="text-base font-semibold text-primary underline-offset-4 hover:underline sm:text-lg">
                      Pedido {order.number}
                    </Link>
                    <p className="mt-1 truncate text-sm font-medium text-foreground">{order.customer.companyName}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge className={ORDER_STATUS_BADGE[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
                    <p className="mt-1 text-sm font-semibold tabular-nums">{formatCurrency(order.total)}</p>
                  </div>
                </div>

                <div className="space-y-3 px-4 py-3">
                  <dl className={cn("grid gap-2 text-xs", isAdmin ? "grid-cols-2" : "grid-cols-1")}>
                    {isAdmin ? (
                      <div className="rounded-lg bg-muted/50 px-3 py-2">
                        <dt className="font-medium uppercase tracking-wide text-muted-foreground">Vendedor</dt>
                        <dd className="mt-0.5 text-sm text-foreground">{order.seller.name} · {order.seller.code}</dd>
                      </div>
                    ) : null}
                    <div className="rounded-lg bg-muted/50 px-3 py-2">
                      <dt className="font-medium uppercase tracking-wide text-muted-foreground">Registrado em</dt>
                      <dd className="mt-0.5 text-sm text-foreground">{formatDate(order.createdAt)}</dd>
                    </div>
                  </dl>

                  <div className="rounded-xl bg-muted/40 px-2 py-3 sm:px-3">
                    <OrderTimeline
                      status={order.status}
                      compact
                      interactive={isAdmin && !!next}
                      busy={busyId === order.id}
                      onAdvance={(step) => advance(order, step)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
                    <OrderShare order={order} compact fullWidth />
                    <Link
                      href={`/pedidos/?id=${order.id}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
                    >
                      Ver detalhes
                    </Link>
                  </div>
                  {isAdmin && next ? (
                    <Button
                      size="sm"
                      variant="action"
                      className="w-full whitespace-normal"
                      disabled={busyId === order.id}
                      onClick={() => advance(order, next)}
                    >
                      Avançar para {ORDER_STATUS_LABELS[next]}
                    </Button>
                  ) : null}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </main>
  )
}
