"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Building2, CalendarDays, FilePlus2, Package, UserRound } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label, Textarea } from "@/components/ui/input"
import { OrderNote } from "@/components/domain/OrderNote"
import { OrderTimeline } from "@/components/domain/OrderTimeline"
import { ORDER_STATUS_BADGE, ORDER_STATUS_LABELS, ORDER_TRANSITIONS, nextPipelineStatus } from "@/lib/config/orders"
import { useCart } from "@/lib/hooks/useCart"
import { useOrder } from "@/lib/hooks/useOrder"
import { useSeller } from "@/lib/hooks/useSeller"
import { ApiError } from "@/lib/local/errors"
import { orderService } from "@/lib/services/orderService"
import { useToast } from "@/components/ui/toast"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import type { Order, OrderStatus } from "@/lib/types"
import { OrderShare } from "./OrderShare"

export function OrderDetail({ orderId }: { orderId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const { seller } = useSeller()
  const { resetOrderForm } = useOrder()
  const { clear } = useCart()
  const canOperate = seller?.role === "ADMIN"
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState("")
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!seller) return
    let cancelled = false
    orderService
      .get(orderId, seller)
      .then((data) => {
        if (!cancelled) setOrder(data)
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof ApiError ? cause.message : "Pedido não encontrado.")
      })
    return () => {
      cancelled = true
    }
  }, [orderId, seller])

  async function changeStatus(status: OrderStatus) {
    if (!order) return
    if (status === "CANCELLED" && !reason.trim()) {
      toast("Informe o motivo do cancelamento.", "info")
      return
    }
    setBusy(true)
    try {
      const updated = await orderService.updateStatus(order.id, {
        status,
        version: order.version,
        reason: reason.trim() || undefined,
      }, seller!)
      setOrder(updated)
      setReason("")
      toast(`Pedido atualizado para ${ORDER_STATUS_LABELS[updated.status]}.`)
    } catch (cause) {
      toast(cause instanceof ApiError ? cause.message : "Não foi possível atualizar o pedido.", "info")
    } finally {
      setBusy(false)
    }
  }

  function handleNewOrder() {
    clear()
    resetOrderForm()
    toast("Pronto para um novo pedido!")
    router.push("/catalogo")
  }

  if (error) {
    return <p role="alert" className="mx-auto max-w-5xl px-4 py-8 text-sm text-destructive">{error}</p>
  }

  if (!order) {
    return <p role="status" className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted-foreground">Carregando pedido...</p>
  }

  const nextStatuses = ORDER_TRANSITIONS[order.status]
  const nextStep = nextPipelineStatus(order.status)
  const canStartOrder = seller?.role !== "OPERATIONS"

  return (
    <div className="mx-auto max-w-5xl space-y-3 px-3 py-4 pb-20 sm:space-y-4 sm:px-4 sm:py-5">
      <Card className="overflow-hidden p-0">
        <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pedido</p>
            <h2 className="truncate text-xl font-semibold text-foreground">{order.number}</h2>
          </div>
          <Badge className={`${ORDER_STATUS_BADGE[order.status]} shrink-0`}>{ORDER_STATUS_LABELS[order.status]}</Badge>
        </div>

        <dl className="grid gap-3 px-4 py-4 sm:grid-cols-2 sm:px-5">
          <InfoBlock icon={Building2} label="Cliente">
            <p className="font-medium text-foreground">{order.customer.companyName}</p>
            {order.customer.contactName ? <p>{order.customer.contactName}</p> : null}
            {order.customer.phone ? <p>{order.customer.phone}</p> : null}
            {order.customer.document ? <p>Doc.: {order.customer.document}</p> : null}
          </InfoBlock>
          <InfoBlock icon={UserRound} label="Vendedor">
            <p className="font-medium text-foreground">{order.seller.name}</p>
            <p>Cód. {order.seller.code}</p>
          </InfoBlock>
          <InfoBlock icon={CalendarDays} label="Registrado em">
            <p className="font-medium text-foreground">{formatDate(order.createdAt)}</p>
          </InfoBlock>
          <InfoBlock icon={Package} label="Resumo">
            <p className="font-medium text-foreground">{order.items.length} {order.items.length === 1 ? "item" : "itens"}</p>
            <p className="text-base font-semibold text-primary">{formatCurrency(order.total)}</p>
          </InfoBlock>
        </dl>

        <div className="grid grid-cols-1 gap-2 border-t border-border/70 px-4 py-3 min-[400px]:grid-cols-2 sm:px-5">
          <OrderShare order={order} fullWidth />
          {canStartOrder ? (
            <Button variant="outline" className="w-full" onClick={handleNewOrder}>
              <FilePlus2 />
              Novo pedido
            </Button>
          ) : null}
        </div>
      </Card>

      <Card className="space-y-4 p-4 sm:p-5">
        <div>
          <h2 className="text-base font-semibold">Andamento</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {canOperate ? "Toque na próxima etapa para avançar." : "Acompanhe a montagem, o envio e a entrega."}
          </p>
        </div>
        <OrderTimeline
          status={order.status}
          interactive={canOperate}
          busy={busy}
          onAdvance={(status) => changeStatus(status)}
        />
        {canOperate && nextStep ? (
          <Button variant="action" className="w-full whitespace-normal sm:w-auto" disabled={busy} onClick={() => changeStatus(nextStep)}>
            Avançar para {ORDER_STATUS_LABELS[nextStep]}
          </Button>
        ) : null}
        {canOperate && nextStatuses.includes("CANCELLED") ? (
          <div className="space-y-2 border-t border-border pt-3">
            <Label htmlFor="status-reason">Cancelar pedido</Label>
            <Textarea id="status-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Informe o motivo do cancelamento" />
            <Button variant="destructive" className="w-full sm:w-auto" disabled={busy} onClick={() => changeStatus("CANCELLED")}>
              Cancelar pedido
            </Button>
          </div>
        ) : null}
      </Card>

      <Card className="p-4 sm:p-5">
        <h2 className="text-base font-semibold">Histórico</h2>
        <p className="mt-1 text-sm text-muted-foreground">{order.events.length} alteração(ões) registrada(s).</p>
        <ol className="mt-3 space-y-3">
          {order.events.map((event) => (
            <li key={event.id} className="border-l-2 border-accent pl-3">
              <p className="text-sm font-medium">
                {event.fromStatus ? `${ORDER_STATUS_LABELS[event.fromStatus]} → ` : ""}
                {ORDER_STATUS_LABELS[event.toStatus]}
              </p>
              <p className="text-xs text-muted-foreground">
                {event.actorName} · {formatDate(event.createdAt)}
              </p>
              {event.reason ? <p className="text-xs text-muted-foreground">{event.reason}</p> : null}
            </li>
          ))}
        </ol>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border/70 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold">Nota do pedido</h2>
          <p className="mt-1 text-sm text-muted-foreground">Itens, totais e dados para conferência.</p>
        </div>
        <div className="overflow-x-auto">
          <OrderNote order={order} />
        </div>
      </Card>
    </div>
  )
}

function InfoBlock({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Building2
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex gap-3 rounded-xl bg-muted/50 px-3 py-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 space-y-0.5 text-sm text-muted-foreground [&_p]:break-words">{children}</dd>
      </div>
    </div>
  )
}
