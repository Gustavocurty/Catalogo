import { withBasePath } from "./basePath"

export const BRAND = {
  name: "Catálogo Attivus",
  logoLight: withBasePath("/attivus-light.svg"),
  logoDark: withBasePath("/attivus-dark.svg"),
  wallpaper: withBasePath("/main-wallpaper.png"),
  colors: {
    purple: "#6B3FA0",
    blue: "#4A6FC8",
    action: "#7C4DBC",
    cardSurface: "#F8F7FF",
    lightText: "#FFFFFF",
    gradient: "linear-gradient(135deg, #6B3FA0 0%, #3B82C8 100%)",
  },
} as const

export const CATEGORIES = [
  "Cimentos e Argamassas",
  "Tintas e Revestimentos",
  "Ferragens e Fixadores",
  "Hidráulica e Elétrica",
  "Pisos e Revestimentos Cerâmicos",
  "Ferramentas",
  "Madeiras e Perfis",
] as const

export type Category = (typeof CATEGORIES)[number]

// Cor de badge por categoria (classes Tailwind seguras/estáticas)
export const CATEGORY_BADGE: Record<string, string> = {
  "Cimentos e Argamassas": "bg-[#6B3FA0] text-white",
  "Tintas e Revestimentos": "bg-[#4A6FC8] text-white",
  "Ferragens e Fixadores": "bg-[#7C4DBC] text-white",
  "Hidráulica e Elétrica": "bg-[#3B82C8] text-white",
  "Pisos e Revestimentos Cerâmicos": "bg-[#9B5DB8] text-white",
  Ferramentas: "bg-[#5A4A9E] text-white",
  "Madeiras e Perfis": "bg-[#7A5CA8] text-white",
}
