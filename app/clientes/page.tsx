"use client"

import { Suspense } from "react"
import { CustomerManagement } from "@/components/domain/CustomerManagement"

export default function CustomersPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted-foreground" role="status">Carregando clientes...</div>}>
      <CustomerManagement />
    </Suspense>
  )
}
