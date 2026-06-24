import jsPDF from "jspdf"
import type { Order } from "@/lib/types"
import { formatCurrency, formatDate } from "./format"

const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 10
const CONTENT_W = PAGE_W - MARGIN * 2
const MAX_Y = PAGE_H - MARGIN

const COLS = [
  { label: "SKU", x: MARGIN, w: 26, align: "left" as const },
  { label: "Descrição", x: MARGIN + 26, w: 66, align: "left" as const },
  { label: "Un.", x: MARGIN + 92, w: 14, align: "center" as const },
  { label: "Qtd", x: MARGIN + 106, w: 16, align: "center" as const },
  { label: "Preço Unit.", x: MARGIN + 122, w: 32, align: "right" as const },
  { label: "Subtotal", x: MARGIN + 154, w: 36, align: "right" as const },
]

function checkPage(pdf: jsPDF, y: number, needed: number): number {
  if (y + needed > MAX_Y) {
    pdf.addPage()
    return MARGIN
  }
  return y
}

function drawTableHeader(pdf: jsPDF, y: number): number {
  pdf.setFillColor(107, 63, 160)
  pdf.rect(MARGIN, y, CONTENT_W, 7, "F")
  pdf.setTextColor(255, 255, 255)
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(7)
  for (const col of COLS) {
    pdf.text(col.label, col.x + 1, y + 5, { align: col.align })
  }
  return y + 7
}

function drawTableRow(pdf: jsPDF, y: number, order: Order, idx: number): number {
  const item = order.items[idx]
  if (idx % 2 === 1) {
    pdf.setFillColor(248, 247, 255)
    pdf.rect(MARGIN, y, CONTENT_W, 6, "F")
  }
  pdf.setTextColor(31, 24, 48)
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(7)

  const values = [
    item.product.sku,
    item.product.name,
    item.product.unit,
    String(item.quantity),
    formatCurrency(item.product.price),
    formatCurrency(item.product.price * item.quantity),
  ]

  for (let i = 0; i < COLS.length; i++) {
    const col = COLS[i]
    const text = values[i]
    const maxWidth = col.w - 2
    pdf.text(text, col.x + 1, y + 4, { align: col.align, maxWidth })
  }

  return y + 6
}

async function loadImage(src: string): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = new Image()
  img.src = src
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
  })
  const canvas = document.createElement("canvas")
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Failed to get canvas context")
  ctx.drawImage(img, 0, 0)
  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
  }
}

function createGradientDataUrl(wMm: number, hMm: number, color1: string, color2: string, dpr = 4): string {
  const w = Math.round(wMm * dpr)
  const h = Math.round(hMm * dpr)
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")!
  const gradient = ctx.createLinearGradient(0, 0, w, h)
  gradient.addColorStop(0, color1)
  gradient.addColorStop(1, color2)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)
  return canvas.toDataURL("image/png")
}

export async function generateOrderPdf(order: Order): Promise<jsPDF> {
  const pdf = new jsPDF("p", "mm", "a4")
  let y = MARGIN

  // --- Header ---
  try {
    const gradient = createGradientDataUrl(PAGE_W, 28, "#6B3FA0", "#3B82C8")
    pdf.addImage(gradient, "PNG", 0, 0, PAGE_W, 28)
  } catch {
    pdf.setFillColor(107, 63, 160)
    pdf.rect(0, 0, PAGE_W, 28, "F")
  }

  let logoRight = MARGIN + 2
  try {
    const logo = await loadImage("/attivus-light.svg")
    const logoW = 38
    const logoH = (logoW * logo.height) / logo.width
    const logoY = (28 - logoH) / 2
    pdf.addImage(logo.dataUrl, "PNG", MARGIN + 2, logoY, logoW, logoH)
    logoRight = MARGIN + 2 + logoW
  } catch {}

  const headerTextY = 16

  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(8)
  pdf.setTextColor(255, 255, 255)
  const dateStr = formatDate(order.createdAt)
  const dateWidth = pdf.getTextWidth(dateStr)
  const dateRight = PAGE_W - MARGIN
  const dateLeft = dateRight - dateWidth

  const orderIdCenter = (logoRight + dateLeft) / 2
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(13)
  pdf.text(order.id, orderIdCenter, headerTextY, { align: "center" })

  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(8)
  pdf.text(dateStr, dateRight, headerTextY, { align: "right" })

  // --- Title ---
  y = 38
  pdf.setTextColor(107, 63, 160)
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(16)
  pdf.text("Nota do Pedido", MARGIN, y)
  y += 10

  // --- Seller & Customer ---
  const customerFields: string[] = []
  if (order.customer.document) customerFields.push(`Doc.: ${order.customer.document}`)
  if (order.customer.contactName) customerFields.push(`Resp.: ${order.customer.contactName}`)
  if (order.customer.phone) customerFields.push(`Tel.: ${order.customer.phone}`)
  if (order.customer.address) customerFields.push(order.customer.address)

  const cardH = Math.max(28, 27 + (customerFields.length - 1) * 5)

  y = checkPage(pdf, y, cardH + 6)

  const cardGap = 6
  const boxW = (CONTENT_W - cardGap) / 2

  // Seller box
  pdf.setFillColor(248, 247, 255)
  pdf.roundedRect(MARGIN, y, boxW, cardH, 2, 2, "F")
  pdf.setTextColor(124, 77, 188)
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(7)
  pdf.text("VENDEDOR", MARGIN + 4, y + 5)
  pdf.setTextColor(31, 24, 48)
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(9)
  pdf.text(order.seller.name, MARGIN + 4, y + 14)
  pdf.setFontSize(7)
  pdf.setTextColor(107, 100, 128)
  pdf.text(`Código: ${order.seller.code}`, MARGIN + 4, y + 22)

  // Customer box
  const cx = MARGIN + boxW + cardGap
  pdf.setFillColor(248, 247, 255)
  pdf.roundedRect(cx, y, boxW, cardH, 2, 2, "F")
  pdf.setTextColor(124, 77, 188)
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(7)
  pdf.text("CLIENTE", cx + 4, y + 5)
  pdf.setTextColor(31, 24, 48)
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(9)
  pdf.text(order.customer.companyName || "—", cx + 4, y + 14)

  pdf.setFontSize(7)
  pdf.setTextColor(107, 100, 128)
  let cy = y + 22
  for (const field of customerFields) {
    pdf.text(field, cx + 4, cy)
    cy += 5
  }

  y += cardH + 6

  // --- Table ---
  y = checkPage(pdf, y, 10 + order.items.length * 6)

  y = drawTableHeader(pdf, y)

  for (let i = 0; i < order.items.length; i++) {
    y = checkPage(pdf, y, 7)
    if (y <= MARGIN + 1) {
      y = drawTableHeader(pdf, y)
    }
    y = drawTableRow(pdf, y, order, i)
  }

  // --- Totals ---
  y += 6
  y = checkPage(pdf, y, 32)

  const totalBoxW = 72
  const totalX = PAGE_W - MARGIN - totalBoxW

  pdf.setFillColor(248, 247, 255)
  pdf.roundedRect(totalX, y, totalBoxW, 28, 2, 2, "F")

  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(8)
  pdf.setTextColor(107, 100, 128)
  pdf.text("Subtotal", totalX + 5, y + 4)
  pdf.setTextColor(31, 24, 48)
  pdf.text(formatCurrency(order.subtotal), totalX + totalBoxW - 5, y + 4, { align: "right" })

  pdf.setTextColor(107, 100, 128)
  pdf.text(`Desconto (${order.discountPercent}%)`, totalX + 5, y + 10)
  pdf.setTextColor(179, 38, 30)
  pdf.text(`- ${formatCurrency(order.discountValue)}`, totalX + totalBoxW - 5, y + 10, { align: "right" })

  pdf.setFillColor(107, 63, 160)
  pdf.roundedRect(totalX + 3, y + 15, totalBoxW - 6, 10, 2, 2, "F")
  pdf.setTextColor(255, 255, 255)
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(9)
  pdf.text("Total", totalX + 6, y + 22)
  pdf.text(formatCurrency(order.total), totalX + totalBoxW - 6, y + 22, { align: "right" })

  y += 30

  // --- Notes ---
  if (order.notes) {
    y += 4
    y = checkPage(pdf, y, 20)
    pdf.setTextColor(124, 77, 188)
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(7)
    pdf.text("OBSERVAÇÕES", MARGIN, y)
    pdf.setTextColor(31, 24, 48)
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(8)

    const lines = pdf.splitTextToSize(order.notes, CONTENT_W)
    for (const line of lines) {
      y = checkPage(pdf, y, 5)
      pdf.text(line, MARGIN, y)
      y += 4
    }
    y += 2
  }

  // --- Signature ---
  y += 8
  y = checkPage(pdf, y, 16)
  pdf.setDrawColor(31, 24, 48)
  pdf.line(PAGE_W / 2 - 50, y, PAGE_W / 2 + 50, y)
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(7)
  pdf.setTextColor(107, 100, 128)
  pdf.text("Assinatura do responsável pelo recebimento", PAGE_W / 2, y + 4, { align: "center" })

  return pdf
}
