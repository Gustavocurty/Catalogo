export interface Product {
  id: string
  sku: string
  name: string
  description: string
  category: string
  unit: string // "sc", "m²", "kg", "un", "pç", "rolo", "m", "cj"
  price: number
  stock: number // available = physicalStock - reservedStock
  imageUrl: string | null
  physicalStock?: number
  reservedStock?: number
  minimumStock?: number
  active?: boolean
  saleBlocked?: boolean
  quantityStep?: number
  version?: number
}

export interface CartItem {
  product: Product
  quantity: number
  lineTotal?: number
}

export interface Seller {
  id: string
  name: string
  code: string
  role: "ADMIN" | "SELLER" | "OPERATIONS"
}

export interface Customer {
  id?: string
  companyName: string
  document: string // CNPJ / CPF
  address: string
  phone: string
  contactName: string
  active?: boolean
  version?: number
}

export type OrderStatus = "PENDING" | "PREPARING" | "READY" | "SHIPPED" | "DELIVERED" | "CANCELLED"

export interface OrderEvent {
  id: string
  fromStatus: OrderStatus | null
  toStatus: OrderStatus
  actorName: string
  createdAt: string
  reason: string
}

export interface Order {
  id: string
  number: string
  status: OrderStatus
  version: number
  events: OrderEvent[]
  createdAt: string // ISO
  seller: Seller
  customer: Customer
  items: CartItem[]
  notes: string
  discountPercent: number
  subtotal: number
  discountValue: number
  total: number
}

export interface OrderPage {
  orders: Order[]
  total: number
  page: number
  pageSize: number
}

export interface StockMovement {
  id: string
  quantity: number
  kind: string
  reason: string
  actorName: string
  createdAt: string
}
