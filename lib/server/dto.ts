import type { Customer, Product, Seller, StockMovement } from "../types"

// PostgreSQL numeric/bigint values remain strings until the DTO boundary.
export type Row = Record<string, any>

export function sellerDto(row: Row): Seller {
  return { id: row.id, name: row.name, code: row.code, role: row.role }
}

export function productDto(row: Row): Product {
  return {
    id: row.id, sku: row.sku, name: row.name, description: row.description,
    category: row.category, unit: row.unit, price: Number(row.price), imageUrl: row.image_url,
    stock: Number((Number(row.physical_stock) - Number(row.reserved_stock)).toFixed(3)),
    physicalStock: Number(row.physical_stock), reservedStock: Number(row.reserved_stock),
    minimumStock: Number(row.minimum_stock), quantityStep: Number(row.quantity_step),
    active: row.active, saleBlocked: row.sale_blocked, version: row.version,
  }
}

export function customerDto(row: Row): Customer {
  return { id: row.id, companyName: row.company_name, document: row.document, address: row.address, phone: row.phone, contactName: row.contact_name, active: row.active, version: row.version }
}

export function stockDto(row: Row): StockMovement {
  return { id: row.id, quantity: Number(row.quantity), kind: row.kind, reason: row.reason, actorName: row.actor_name, createdAt: row.created_at.toISOString() }
}
