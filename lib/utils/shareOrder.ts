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

export function whatsappOrderUrl(order: Order) {
  const params = new URLSearchParams({
    text: `${orderShareSubject(order)}\nSegue o PDF do pedido.`,
  })
  return `https://wa.me/?${params.toString()}`
}

export function downloadShareFile(file: File) {
  const url = URL.createObjectURL(file)
  const link = document.createElement("a")
  link.href = url
  link.download = file.name
  link.rel = "noopener"
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
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
