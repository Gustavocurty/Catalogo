import type { Customer } from "@/lib/types"

export const customers: Customer[] = [
  {
    id: "c001",
    companyName: "Construtora Horizonte Ltda.",
    document: "12.345.678/0001-90",
    address: "Av. Brasil, 1000 - Centro, São Paulo - SP",
    phone: "(11) 98888-0001",
    contactName: "Maria Souza",
    active: true,
    version: 1,
  },
  {
    id: "c002",
    companyName: "Reformas Atlas ME",
    document: "123.456.789-00",
    address: "Rua das Palmeiras, 210 - Campinas - SP",
    phone: "(19) 97777-0002",
    contactName: "João Alves",
    active: true,
    version: 1,
  },
]
