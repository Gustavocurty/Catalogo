import { ORDER_STATUS_LABELS } from "@/lib/config/orders"
import type { Order } from "@/lib/types"
import { formatCurrency, formatDate } from "./format"

export function orderShareText(order: Order) {
  const items = order.items
    .map((item) => `• ${item.product.name} (${item.quantity} ${item.product.unit}) — ${formatCurrency(item.product.price * item.quantity)}`)
    .join("\n")

  return [
    `Pedido ${order.number} — Catálogo Attivus`,
    `Cliente: ${order.customer.companyName}`,
    order.customer.document ? `Documento: ${order.customer.document}` : "",
    `Situação: ${ORDER_STATUS_LABELS[order.status]}`,
    `Data: ${formatDate(order.createdAt)}`,
    `Vendedor: ${order.seller.name} (${order.seller.code})`,
    "",
    "Itens:",
    items,
    "",
    order.discountPercent ? `Desconto: ${order.discountPercent}%` : "",
    `Total: ${formatCurrency(order.total)}`,
    order.notes ? `\nObservações: ${order.notes}` : "",
  ].filter((line) => line !== "").join("\n")
}

export function orderShareSubject(order: Order) {
  return `Pedido ${order.number} — ${order.customer.companyName}`
}

export function mailtoOrderUrl(order: Order) {
  const params = new URLSearchParams({
    subject: orderShareSubject(order),
    body: orderShareText(order),
  })
  return `mailto:?${params.toString()}`
}

export function canUseNativeShare() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function"
}

export function canShareFiles(files: File[]) {
  return canUseNativeShare() && typeof navigator.canShare === "function" && navigator.canShare({ files })
}

export async function shareOrderNative(order: Order, file?: File) {
  const payload: ShareData = {
    title: orderShareSubject(order),
  }
  if (file && canShareFiles([file])) {
    payload.files = [file]
  } else {
    payload.text = orderShareText(order)
  }
  await navigator.share(payload)
}
