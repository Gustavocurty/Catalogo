"use client"

import { Suspense } from "react"
import { ProductManagement } from "@/components/domain/ProductManagement"
import { RoleGuard } from "@/components/domain/RoleGuard"

export default function ProductsPage() {
  return (
    <RoleGuard roles={["ADMIN"]}>
      <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted-foreground" role="status">Carregando produtos...</div>}>
        <ProductManagement />
      </Suspense>
    </RoleGuard>
  )
}
