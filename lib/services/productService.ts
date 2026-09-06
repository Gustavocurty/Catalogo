import * as demo from "@/lib/local/demoStore"
import type { Product, StockMovement } from "@/lib/types"

export const productService = {
  async getAll(manage = false): Promise<Product[]> {
    return demo.listProducts(manage)
  },
  async getById(id: string): Promise<Product | undefined> {
    return demo.getProduct(id)
  },
  async create(input: Omit<Product, "id" | "stock" | "version"> & { initialStock?: number }): Promise<Product> {
    return demo.createProduct(input)
  },
  async update(id: string, input: Partial<Product> & { version: number }): Promise<Product> {
    return demo.updateProduct(id, input)
  },
  async listStock(id: string): Promise<StockMovement[]> {
    return demo.listStock(id)
  },
  async adjustStock(id: string, input: { delta: number; reason: string; version: number }, actorName: string): Promise<Product> {
    return demo.adjustStock(id, input.delta, input.reason, input.version, actorName)
  },
}
