import * as demo from "@/lib/local/demoStore"
import type { Customer } from "@/lib/types"

export const customerService = {
  async list(includeInactive = false): Promise<Customer[]> {
    return demo.listCustomers(includeInactive)
  },
  async create(input: Omit<Customer, "id" | "version">): Promise<Customer> {
    return demo.createCustomer(input)
  },
  async update(id: string, input: Partial<Customer> & { version: number }): Promise<Customer> {
    return demo.updateCustomer(id, input)
  },
}
