"use client"

import { ProductManagement } from "@/components/domain/ProductManagement"
import { RoleGuard } from "@/components/domain/RoleGuard"

export default function ProductsPage() {
  return (
    <RoleGuard roles={["ADMIN"]}>
      <ProductManagement />
    </RoleGuard>
  )
}
