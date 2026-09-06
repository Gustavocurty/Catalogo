import { ORDER_STATUS_LABELS } from "@/lib/config/orders"
import type { Order, OrderStatus } from "@/lib/types"

const STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]

export function summarizeOrders(orders: Order[]) {
  const active = orders.filter((order) => order.status !== "CANCELLED")
  const cancelled = orders.filter((order) => order.status === "CANCELLED")
  const sold = active.reduce((sum, order) => sum + order.total, 0)
  const delivered = orders.filter((order) => order.status === "DELIVERED")
  const pending = orders.filter((order) => order.status === "PENDING")
  const customers = new Set(
    active.map((order) => order.customer.id || order.customer.companyName),
  )

  const byStatus = STATUSES.map((status) => {
    const items = orders.filter((order) => order.status === status)
    return {
      status,
      label: ORDER_STATUS_LABELS[status],
      count: items.length,
      total: items.reduce((sum, order) => sum + order.total, 0),
    }
  })

  return {
    count: orders.length,
    activeCount: active.length,
    cancelledCount: cancelled.length,
    pendingCount: pending.length,
    deliveredCount: delivered.length,
    sold,
    deliveredTotal: delivered.reduce((sum, order) => sum + order.total, 0),
    ticket: active.length ? sold / active.length : 0,
    customers: customers.size,
    byStatus,
    recent: orders.slice(0, 3),
  }
}
