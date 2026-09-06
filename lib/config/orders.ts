import type { OrderStatus } from "@/lib/types"

export const ORDER_PIPELINE: OrderStatus[] = [
  "PENDING",
  "PREPARING",
  "READY",
  "SHIPPED",
  "DELIVERED",
]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pedido feito",
  PREPARING: "Montagem",
  READY: "Preparando envio",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
}

export const ORDER_STATUS_HINTS: Record<OrderStatus, string> = {
  PENDING: "Pedido registrado",
  PREPARING: "Separação dos itens",
  READY: "Embalagem e despacho",
  SHIPPED: "A caminho do cliente",
  DELIVERED: "Recebido pelo cliente",
  CANCELLED: "Pedido encerrado",
}

export const ORDER_STATUS_SHORT: Record<OrderStatus, string> = {
  PENDING: "Feito",
  PREPARING: "Montagem",
  READY: "Envio",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
}

export const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-100",
  PREPARING: "bg-blue-100 text-blue-900 dark:bg-blue-400/20 dark:text-blue-100",
  READY: "bg-violet-100 text-violet-900 dark:bg-violet-400/20 dark:text-violet-100",
  SHIPPED: "bg-sky-100 text-sky-900 dark:bg-sky-400/20 dark:text-sky-100",
  DELIVERED: "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-100",
  CANCELLED: "bg-muted text-muted-foreground",
}

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
}

export function pipelineIndex(status: OrderStatus) {
  const index = ORDER_PIPELINE.indexOf(status)
  return index < 0 ? -1 : index
}

export function nextPipelineStatus(status: OrderStatus): OrderStatus | null {
  return ORDER_TRANSITIONS[status].find((item) => item !== "CANCELLED") ?? null
}
