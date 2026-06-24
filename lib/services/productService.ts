import type { Product } from "@/lib/types"
import { products } from "@/lib/mocks/products"

// Camada de serviço — preparada para troca futura por chamadas REST.
// Hoje retorna os mocks com um pequeno atraso simulado.

function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export const productService = {
  async getAll(): Promise<Product[]> {
    return delay(products)
  },
  async getById(id: string): Promise<Product | undefined> {
    return delay(products.find((p) => p.id === id))
  },
}
