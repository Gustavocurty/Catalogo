export interface Product {
  id: string
  sku: string
  name: string
  description: string
  category: string
  unit: string // "sc", "m²", "kg", "un", "pç", "rolo", "m", "cj"
  price: number
  stock: number // informativo apenas
  imageUrl: string | null
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface Seller {
  name: string
  code: string
}

export interface Customer {
  companyName: string
  document: string // CNPJ / CPF
  address: string
  phone: string
  contactName: string
}

export interface Order {
  id: string
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
