"use client"

import { formatCurrency, formatDate } from "@/lib/utils/format"
import type { Order } from "@/lib/types"

interface OrderNoteProps {
  order: Order
}

export function OrderNote({ order }: OrderNoteProps) {
  return (
    <div className="mx-auto w-full max-w-[794px] bg-white text-[#1f1830]"
      style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      {/* Cabeçalho */}
      <div
        className="flex items-center justify-between px-8 py-6"
        style={{ background: "linear-gradient(135deg, #6B3FA0 0%, #3B82C8 100%)", color: "#ffffff" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/attivus-light.svg" alt="Catálogo Attivus" className="h-10 w-auto" />
        <div className="text-right">
          <p className="text-lg font-bold leading-tight">{order.id}</p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
            {formatDate(order.createdAt)}
          </p>
        </div>
      </div>

      <div className="px-8 py-6">
        <h1 className="mb-4 text-xl font-bold" style={{ color: "#6B3FA0" }}>
          Nota do Pedido
        </h1>

        {/* Vendedor e Cliente */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg p-4" style={{ backgroundColor: "#F8F7FF" }}>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: "#7C4DBC" }}>
              Vendedor
            </h2>
            <p className="text-sm font-medium">{order.seller.name}</p>
            <p className="text-sm" style={{ color: "#6b6480" }}>
              Código: {order.seller.code}
            </p>
          </div>
          <div className="rounded-lg p-4" style={{ backgroundColor: "#F8F7FF" }}>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: "#7C4DBC" }}>
              Cliente
            </h2>
            <p className="text-sm font-medium">{order.customer.companyName || "—"}</p>
            {order.customer.document && (
              <p className="text-sm" style={{ color: "#6b6480" }}>
                Doc.: {order.customer.document}
              </p>
            )}
            {order.customer.contactName && (
              <p className="text-sm" style={{ color: "#6b6480" }}>
                Resp.: {order.customer.contactName}
              </p>
            )}
            {order.customer.phone && (
              <p className="text-sm" style={{ color: "#6b6480" }}>
                Tel.: {order.customer.phone}
              </p>
            )}
            {order.customer.address && (
              <p className="text-sm" style={{ color: "#6b6480" }}>
                {order.customer.address}
              </p>
            )}
          </div>
        </div>

        {/* Tabela de itens */}
        <table className="mt-6 w-full border-collapse text-sm" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "14%" }} />
            <col style={{ width: "36%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "16%" }} />
          </colgroup>
          <thead>
            <tr style={{ backgroundColor: "#6B3FA0", color: "#ffffff" }}>
              <th className="px-2 py-2 text-left font-semibold">SKU</th>
              <th className="px-2 py-2 text-left font-semibold">Descrição</th>
              <th className="px-2 py-2 text-center font-semibold">Un.</th>
              <th className="px-2 py-2 text-center font-semibold">Qtd</th>
              <th className="px-2 py-2 text-right font-semibold">Preço Unit.</th>
              <th className="px-2 py-2 text-right font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => (
              <tr
                key={item.product.id}
                style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#F8F7FF" }}
              >
                <td className="truncate px-2 py-2 font-mono text-xs" style={{ borderBottom: "1px solid #e6e1f2" }}>
                  {item.product.sku}
                </td>
                <td className="truncate px-2 py-2" style={{ borderBottom: "1px solid #e6e1f2" }}>
                  {item.product.name}
                </td>
                <td className="px-2 py-2 text-center" style={{ borderBottom: "1px solid #e6e1f2" }}>
                  {item.product.unit}
                </td>
                <td className="px-2 py-2 text-center" style={{ borderBottom: "1px solid #e6e1f2" }}>
                  {item.quantity}
                </td>
                <td className="px-2 py-2 text-right" style={{ borderBottom: "1px solid #e6e1f2" }}>
                  {formatCurrency(item.product.price)}
                </td>
                <td
                  className="px-2 py-2 text-right font-medium"
                  style={{ borderBottom: "1px solid #e6e1f2" }}
                >
                  {formatCurrency(item.product.price * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totais */}
        <div className="mt-4 flex justify-end">
          <div className="w-64">
            <div className="flex justify-between py-1 text-sm">
              <span style={{ color: "#6b6480" }}>Subtotal</span>
              <span className="font-medium">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span style={{ color: "#6b6480" }}>Desconto ({order.discountPercent}%)</span>
              <span className="font-medium" style={{ color: "#b3261e" }}>
                - {formatCurrency(order.discountValue)}
              </span>
            </div>
            <div
              className="mt-1 flex justify-between rounded-lg px-3 py-2 text-base font-bold"
              style={{ backgroundColor: "#6B3FA0", color: "#ffffff" }}
            >
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Observações */}
        {order.notes && (
          <div className="mt-6">
            <h2 className="mb-1 text-xs font-bold uppercase tracking-wide" style={{ color: "#7C4DBC" }}>
              Observações
            </h2>
            <p className="whitespace-pre-wrap text-sm" style={{ color: "#1f1830" }}>
              {order.notes}
            </p>
          </div>
        )}

        {/* Assinatura */}
        <div className="mt-12 flex flex-col items-center">
          <div className="w-72 border-t" style={{ borderColor: "#1f1830" }} />
          <p className="mt-1 text-sm" style={{ color: "#6b6480" }}>
            Assinatura do responsável pelo recebimento
          </p>
        </div>
      </div>
    </div>
  )
}
