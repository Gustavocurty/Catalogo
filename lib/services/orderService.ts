import * as demo from "@/lib/local/demoStore"
import type { Order, OrderPage, OrderStatus, Seller } from "@/lib/types"

export interface CreateOrderInput {
  customerId: string
  items: { productId: string; quantity: number; expectedPrice: number }[]
  notes?: string
  discountPercent?: number
  idempotencyKey: string
}

export const orderService = {
  async listAll(seller?: Seller): Promise<Order[]> {
    return demo.listAllOrders(seller)
  },
  async list(query = "", seller?: Seller): Promise<OrderPage> {
    const params = new URLSearchParams(query)
    return demo.listOrders({
      page: Number(params.get("page") ?? "1"),
      status: params.get("status") ?? undefined,
      number: params.get("number") ?? undefined,
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      sellerId: seller?.role === "SELLER" ? seller.id : params.get("sellerId") ?? undefined,
    })
  },
  async get(id: string, seller: Seller): Promise<Order> {
    return demo.getOrder(id, seller)
  },
  async create(input: CreateOrderInput, seller: Seller): Promise<Order> {
    return demo.createOrder(input, seller)
  },
  async updateStatus(id: string, input: { status: OrderStatus; version: number; reason?: string }, seller: Seller): Promise<Order> {
    return demo.updateOrderStatus(id, input.status, input.version, input.reason ?? "", seller)
  },
}
