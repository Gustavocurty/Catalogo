import { ORDER_TRANSITIONS } from "@/lib/config/orders"
import { customers as mockCustomers, NEXT_ORDER_NUMBER, orders as mockOrders, products as mockProducts, stockMovements as mockStockMovements } from "@/lib/mocks"
import type { Customer, Order, OrderStatus, Product, Seller, StockMovement } from "@/lib/types"
import { ApiError } from "./errors"

const STORAGE_KEY = "attivus-demo"

interface DemoState {
  products: Product[]
  customers: Customer[]
  orders: Order[]
  stockMovements: Record<string, StockMovement[]>
  nextOrderNumber: number
  idempotency: Record<string, string>
}

function id() {
  return crypto.randomUUID()
}

function available(product: Product) {
  return Number(((product.physicalStock ?? 0) - (product.reservedStock ?? 0)).toFixed(3))
}

function normalizeProduct(product: Product): Product {
  const physicalStock = product.physicalStock ?? product.stock
  const reservedStock = product.reservedStock ?? 0
  return {
    ...product,
    physicalStock,
    reservedStock,
    stock: Number((physicalStock - reservedStock).toFixed(3)),
    minimumStock: product.minimumStock ?? 0,
    active: product.active ?? true,
    saleBlocked: product.saleBlocked ?? false,
    quantityStep: product.quantityStep ?? 1,
    version: product.version ?? 1,
  }
}

function seed(): DemoState {
  return {
    products: mockProducts.map((product) => normalizeProduct(product)),
    customers: mockCustomers.map((customer) => ({ ...customer })),
    orders: mockOrders.map((order) => ({ ...order })),
    stockMovements: mockStockMovements(),
    nextOrderNumber: NEXT_ORDER_NUMBER,
    idempotency: {},
  }
}

function read(): DemoState {
  if (typeof window === "undefined") return seed()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const initial = seed()
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
      return initial
    }
    const parsed = JSON.parse(raw) as DemoState
    if (!Array.isArray(parsed.products) || !Array.isArray(parsed.customers) || !Array.isArray(parsed.orders)) {
      throw new Error("invalid")
    }
    return {
      ...parsed,
      products: parsed.products.map(normalizeProduct),
      stockMovements: parsed.stockMovements ?? {},
      nextOrderNumber: parsed.nextOrderNumber ?? 1,
      idempotency: parsed.idempotency ?? {},
    }
  } catch {
    const initial = seed()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
    return initial
  }
}

function write(state: DemoState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function mutate<T>(updater: (state: DemoState) => T): T {
  const state = read()
  const result = updater(state)
  write(state)
  return result
}

export function listProducts(manage = false): Product[] {
  return read().products.filter((product) => manage || product.active !== false).map(normalizeProduct)
}

export function getProduct(productId: string): Product | undefined {
  const product = read().products.find((item) => item.id === productId)
  return product ? normalizeProduct(product) : undefined
}

export function createProduct(input: Omit<Product, "id" | "stock" | "version"> & { initialStock?: number }): Product {
  return mutate((state) => {
    if (state.products.some((product) => product.sku.toLowerCase() === input.sku.toLowerCase())) {
      throw new ApiError("Já existe um produto com este SKU.", 409)
    }
    const physicalStock = input.initialStock ?? 0
    const product = normalizeProduct({
      ...input,
      id: id(),
      physicalStock,
      reservedStock: 0,
      stock: physicalStock,
      version: 1,
    })
    state.products.unshift(product)
    if (physicalStock > 0) {
      state.stockMovements[product.id] = [{
        id: id(),
        quantity: physicalStock,
        kind: "INITIAL",
        reason: "Saldo inicial",
        actorName: "Administrador",
        createdAt: new Date().toISOString(),
      }]
    }
    return product
  })
}

export function updateProduct(productId: string, input: Partial<Product> & { version: number }): Product {
  return mutate((state) => {
    const index = state.products.findIndex((product) => product.id === productId)
    if (index < 0) throw new ApiError("Produto não encontrado.", 404)
    const current = state.products[index]
    if (current.version !== input.version) throw new ApiError("Produto alterado por outra sessão.", 409)
    if (input.sku && state.products.some((product) => product.id !== productId && product.sku.toLowerCase() === input.sku!.toLowerCase())) {
      throw new ApiError("Já existe um produto com este SKU.", 409)
    }
    const next = normalizeProduct({
      ...current,
      ...input,
      id: current.id,
      physicalStock: current.physicalStock,
      reservedStock: current.reservedStock,
      version: (current.version ?? 1) + 1,
    })
    state.products[index] = next
    return next
  })
}

export function listStock(productId: string): StockMovement[] {
  return [...(read().stockMovements[productId] ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function adjustStock(productId: string, delta: number, reason: string, version: number, actorName: string): Product {
  return mutate((state) => {
    const index = state.products.findIndex((product) => product.id === productId)
    if (index < 0) throw new ApiError("Produto não encontrado.", 404)
    const current = normalizeProduct(state.products[index])
    if (current.version !== version) throw new ApiError("Produto alterado por outra sessão.", 409)
    const physical = Number(((current.physicalStock ?? 0) + delta).toFixed(3))
    const reserved = current.reservedStock ?? 0
    if (physical < reserved || physical < 0) throw new ApiError("A retirada não pode deixar saldo negativo nem consumir o estoque reservado.", 409)
    const next = normalizeProduct({
      ...current,
      physicalStock: physical,
      reservedStock: reserved,
      version: (current.version ?? 1) + 1,
    })
    state.products[index] = next
    const movements = state.stockMovements[productId] ?? []
    movements.unshift({
      id: id(),
      quantity: delta,
      kind: "ADJUSTMENT",
      reason,
      actorName,
      createdAt: new Date().toISOString(),
    })
    state.stockMovements[productId] = movements
    return next
  })
}

export function listCustomers(includeInactive = false): Customer[] {
  return read().customers.filter((customer) => includeInactive || customer.active !== false)
}

export function createCustomer(input: Omit<Customer, "id" | "version">): Customer {
  return mutate((state) => {
    const document = input.document.replace(/\D/g, "")
    if (document && state.customers.some((customer) => customer.document.replace(/\D/g, "") === document)) {
      throw new ApiError("Já existe um cliente com este documento.", 409)
    }
    const customer: Customer = { ...input, id: id(), version: 1 }
    state.customers.unshift(customer)
    return customer
  })
}

export function updateCustomer(customerId: string, input: Partial<Customer> & { version: number }): Customer {
  return mutate((state) => {
    const index = state.customers.findIndex((customer) => customer.id === customerId)
    if (index < 0) throw new ApiError("Cliente não encontrado.", 404)
    const current = state.customers[index]
    if (current.version !== input.version) throw new ApiError("Cliente alterado por outra sessão.", 409)
    const document = (input.document ?? current.document).replace(/\D/g, "")
    if (document && state.customers.some((customer) => customer.id !== customerId && customer.document.replace(/\D/g, "") === document)) {
      throw new ApiError("Já existe um cliente com este documento.", 409)
    }
    const next = { ...current, ...input, id: current.id, version: (current.version ?? 1) + 1 }
    state.customers[index] = next
    return next
  })
}

export function listOrders(query: {
  page?: number
  status?: string
  number?: string
  from?: string
  to?: string
  sellerId?: string
}): { orders: Order[]; total: number; page: number; pageSize: number } {
  const pageSize = 20
  const page = query.page && query.page > 0 ? query.page : 1
  let orders = [...read().orders]
  if (query.sellerId) orders = orders.filter((order) => order.seller.id === query.sellerId)
  if (query.status) orders = orders.filter((order) => order.status === query.status)
  if (query.number) {
    const number = query.number
    orders = orders.filter((order) => order.number.replace(/^0+/, "") === number.replace(/^0+/, "") || order.number === number)
  }
  if (query.from) orders = orders.filter((order) => order.createdAt.slice(0, 10) >= query.from!)
  if (query.to) orders = orders.filter((order) => order.createdAt.slice(0, 10) <= query.to!)
  orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const total = orders.length
  return { orders: orders.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize }
}

export function listAllOrders(seller?: Seller): Order[] {
  let orders = [...read().orders]
  if (seller?.role === "SELLER") {
    orders = orders.filter((order) => order.seller.id === seller.id)
  }
  orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return orders
}

export function getOrder(orderId: string, seller: Seller): Order {
  const order = read().orders.find((item) => item.id === orderId)
  if (!order) throw new ApiError("Pedido não encontrado.", 404)
  if (seller.role === "SELLER" && order.seller.id !== seller.id) throw new ApiError("Sem permissão para este pedido.", 403)
  return order
}

export function createOrder(input: {
  customerId: string
  items: { productId: string; quantity: number; expectedPrice: number }[]
  notes?: string
  discountPercent?: number
  idempotencyKey: string
}, seller: Seller): Order {
  return mutate((state) => {
    const replayId = state.idempotency[`${seller.id}:${input.idempotencyKey}`]
    if (replayId) {
      const existing = state.orders.find((order) => order.id === replayId)
      if (existing) return existing
    }
    const customer = state.customers.find((item) => item.id === input.customerId)
    if (!customer || customer.active === false) throw new ApiError("Cliente inexistente ou inativo.", 409)
    const lines = input.items.map((item) => {
      const product = state.products.find((entry) => entry.id === item.productId)
      if (!product || product.active === false || product.saleBlocked) throw new ApiError("Produto inativo ou bloqueado para venda.", 409)
      const current = normalizeProduct(product)
      if (Number(current.price.toFixed(2)) !== Number(item.expectedPrice.toFixed(2))) {
        throw new ApiError("Preço alterado. Atualize o catálogo antes de confirmar.", 409)
      }
      if (item.quantity > available(current)) throw new ApiError(`Estoque insuficiente para ${current.sku}.`, 409)
      return { product: current, quantity: item.quantity, lineTotal: Number((current.price * item.quantity).toFixed(2)) }
    })
    const subtotal = Number(lines.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(2))
    const discountPercent = input.discountPercent ?? 0
    const discountValue = Number((subtotal * (discountPercent / 100)).toFixed(2))
    const order: Order = {
      id: id(),
      number: String(state.nextOrderNumber).padStart(8, "0"),
      status: "PENDING",
      version: 1,
      events: [{
        id: id(),
        fromStatus: null,
        toStatus: "PENDING",
        actorName: seller.name,
        createdAt: new Date().toISOString(),
        reason: "",
      }],
      createdAt: new Date().toISOString(),
      seller,
      customer,
      items: lines,
      notes: input.notes ?? "",
      discountPercent,
      subtotal,
      discountValue,
      total: Number((subtotal - discountValue).toFixed(2)),
    }
    for (const line of lines) {
      const index = state.products.findIndex((product) => product.id === line.product.id)
      const current = normalizeProduct(state.products[index])
      const reserved = Number(((current.reservedStock ?? 0) + line.quantity).toFixed(3))
      state.products[index] = normalizeProduct({
        ...current,
        reservedStock: reserved,
        version: (current.version ?? 1) + 1,
      })
    }
    state.orders.unshift(order)
    state.nextOrderNumber += 1
    state.idempotency[`${seller.id}:${input.idempotencyKey}`] = order.id
    return order
  })
}

export function updateOrderStatus(orderId: string, status: OrderStatus, version: number, reason: string, seller: Seller): Order {
  return mutate((state) => {
    const index = state.orders.findIndex((order) => order.id === orderId)
    if (index < 0) throw new ApiError("Pedido não encontrado.", 404)
    const current = state.orders[index]
    if (current.version !== version) throw new ApiError("Pedido alterado por outra sessão.", 409)
    if (!ORDER_TRANSITIONS[current.status].includes(status)) throw new ApiError("Transição de situação inválida.", 409)
    if (status === "CANCELLED" && !reason.trim()) throw new ApiError("Informe o motivo do cancelamento.", 400)
    if (status === "SHIPPED" || status === "CANCELLED") {
      for (const item of current.items) {
        const productIndex = state.products.findIndex((product) => product.id === item.product.id)
        if (productIndex < 0) continue
        const product = normalizeProduct(state.products[productIndex])
        const reserved = Number(((product.reservedStock ?? 0) - item.quantity).toFixed(3))
        const physical = status === "SHIPPED"
          ? Number(((product.physicalStock ?? 0) - item.quantity).toFixed(3))
          : product.physicalStock ?? 0
        state.products[productIndex] = normalizeProduct({
          ...product,
          reservedStock: Math.max(0, reserved),
          physicalStock: Math.max(0, physical),
          version: (product.version ?? 1) + 1,
        })
        if (status === "SHIPPED") {
          const movements = state.stockMovements[product.id] ?? []
          movements.unshift({
            id: id(),
            quantity: -item.quantity,
            kind: "SHIPMENT",
            reason: reason || `Expedição do pedido ${current.number}`,
            actorName: seller.name,
            createdAt: new Date().toISOString(),
          })
          state.stockMovements[product.id] = movements
        }
      }
    }
    const next: Order = {
      ...current,
      status,
      version: current.version + 1,
      events: [
        ...current.events,
        {
          id: id(),
          fromStatus: current.status,
          toStatus: status,
          actorName: seller.name,
          createdAt: new Date().toISOString(),
          reason,
        },
      ],
    }
    state.orders[index] = next
    return next
  })
}
