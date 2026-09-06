"use client"

import { CartContent } from "@/components/domain/CartContent"
import { RoleGuard } from "@/components/domain/RoleGuard"

export default function CartPage() {
  return (
    <RoleGuard roles={["ADMIN", "SELLER"]}>
      <CartContent />
    </RoleGuard>
  )
}
