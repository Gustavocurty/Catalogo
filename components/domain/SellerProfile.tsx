"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, ClipboardList, Package, ShoppingCart, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ORDER_STATUS_BADGE, ORDER_STATUS_LABELS } from "@/lib/config/orders"
import { useCart } from "@/lib/hooks/useCart"
import { useSeller } from "@/lib/hooks/useSeller"
import { orderService } from "@/lib/services/orderService"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { summarizeOrders } from "@/lib/utils/sellerStats"
import type { Order } from "@/lib/types"

const ROLE_LABEL = {
  ADMIN: "Administrador",
  SELLER: "Vendedor",
  OPERATIONS: "Operação",
} as const

export function SellerProfile() {
  const { seller } = useSeller()
  const { totalItems } = useCart()
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState("")
  const canSell = seller?.role === "ADMIN" || seller?.role === "SELLER"

  useEffect(() => {
    if (!seller) return
    let active = true
    orderService.listAll(seller).then((data) => {
      if (active) setOrders(data)
    }).catch(() => {
      if (active) {
        setOrders([])
        setError("Não foi possível carregar os dados do perfil.")
      }
    })
    return () => {
      active = false
    }
  }, [seller])

  const stats = summarizeOrders(orders ?? [])
  const recent = (orders ?? []).slice(0, 5)
  const maxStatusCount = Math.max(1, ...stats.byStatus.map((item) => item.count))
  const topCustomers = useMemo(() => {
    const map = new Map<string, { name: string; count: number; total: number }>()
    for (const order of (orders ?? []).filter((item) => item.status !== "CANCELLED")) {
      const key = order.customer.id || order.customer.companyName
      const current = map.get(key) ?? { name: order.customer.companyName, count: 0, total: 0 }
      current.count += 1
      current.total += order.total
      map.set(key, current)
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 3)
  }, [orders])

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 pb-16">
      <section className="rounded-2xl bg-brand-gradient p-5 text-white shadow-lg sm:p-6">
        <p className="text-sm text-white/80">Perfil de acesso</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">{seller?.name}</h2>
        <dl className="mt-3 grid gap-2 text-sm text-white/90 sm:grid-cols-3">
          <div>
            <dt className="text-white/70">Função</dt>
            <dd className="font-medium">{seller ? ROLE_LABEL[seller.role] : "—"}</dd>
          </div>
          <div>
            <dt className="text-white/70">Código</dt>
            <dd className="font-medium">{seller?.code ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-white/70">Visão dos pedidos</dt>
            <dd className="font-medium">{seller?.role === "ADMIN" ? "Todos os vendedores" : "Somente os seus"}</dd>
          </div>
        </dl>
      </section>

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

      {canSell && totalItems > 0 ? (
        <Link href="/carrinho" className="hover-lift flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-card/80 p-4">
          <span>
            <span className="block text-sm font-semibold text-foreground">Rascunho em andamento</span>
            <span className="text-sm text-muted-foreground">{String(totalItems).replace(".", ",")} item(ns) no pedido atual</span>
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            Continuar
            <ArrowRight className="size-4" />
          </span>
        </Link>
      ) : null}

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Desempenho</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Pedidos feitos" value={orders ? String(stats.activeCount) : "—"} hint={`${stats.cancelledCount} cancelado(s)`} />
          <Kpi label="Total vendido" value={orders ? formatCurrency(stats.sold) : "—"} hint="Sem cancelados" />
          <Kpi label="Ticket médio" value={orders ? formatCurrency(stats.ticket) : "—"} hint={`${stats.customers} cliente(s)`} />
          <Kpi label="Entregues" value={orders ? String(stats.deliveredCount) : "—"} hint={orders ? formatCurrency(stats.deliveredTotal) : ""} />
        </div>
      </section>

      <section className="rounded-xl border border-border/80 bg-card/80 p-5 shadow-sm backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Situação dos pedidos</h3>
          <Link href="/pedidos" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Abrir pedidos
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.byStatus.filter((item) => item.status !== "CANCELLED" || item.count > 0).map((item) => (
            <Link
              key={item.status}
              href="/pedidos"
              className="hover-lift rounded-xl border border-border/80 bg-background/60 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge className={ORDER_STATUS_BADGE[item.status]}>{item.label}</Badge>
                <span className="text-sm font-semibold tabular-nums">{item.count}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${(item.count / maxStatusCount) * 100}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{formatCurrency(item.total)}</p>
            </Link>
          ))}
        </div>
      </section>

      {topCustomers.length > 0 ? (
        <section className="rounded-xl border border-border/80 bg-card/80 p-5 shadow-sm backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Principais clientes</h3>
            <Link href="/clientes" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              Ver clientes
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {topCustomers.map((customer) => (
              <li key={customer.name} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-xs text-muted-foreground">{customer.count} pedido(s)</p>
                </div>
                <p className="text-sm font-semibold">{formatCurrency(customer.total)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-border/80 bg-card/80 p-5 shadow-sm backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pedidos recentes</h3>
          <Link href="/pedidos" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Ver todos
          </Link>
        </div>
        {!orders ? (
          <p role="status" className="text-sm text-muted-foreground">Carregando pedidos...</p>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <ClipboardList className="size-10 text-muted-foreground/50" />
            <p className="mt-3 font-medium">Nenhum pedido registrado</p>
            <p className="mt-1 text-sm text-muted-foreground">Os pedidos feitos por você aparecem aqui.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((order) => (
              <li key={order.id}>
                <Link href={`/pedidos/?id=${order.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">Pedido {order.number}</p>
                    <p className="truncate text-sm text-muted-foreground">{order.customer.companyName}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <Badge className={ORDER_STATUS_BADGE[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
                    <p className="mt-1 text-sm font-medium">{formatCurrency(order.total)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canSell ? (
        <section className="grid gap-3 sm:grid-cols-3">
          <ActionLink href="/catalogo" icon={Package} title="Catálogo" description="Montar um pedido" />
          <ActionLink href="/clientes" icon={Users} title="Clientes" description="Cadastrar ou editar" />
          <ActionLink href="/carrinho" icon={ShoppingCart} title="Rascunho" description="Revisar o pedido atual" />
        </section>
      ) : null}
    </main>
  )
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/80 p-4 shadow-sm backdrop-blur-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-primary">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function ActionLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string
  icon: typeof Package
  title: string
  description: string
}) {
  return (
    <Link href={href} className="hover-lift flex items-center gap-3 rounded-xl border border-border/80 bg-card/80 p-4">
      <span className="flex size-10 items-center justify-center rounded-xl bg-brand-gradient text-white">
        <Icon className="size-5" />
      </span>
      <span>
        <span className="block font-semibold text-foreground">{title}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </span>
    </Link>
  )
}
