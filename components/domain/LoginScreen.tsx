"use client"

import Image from "next/image"
import { Card } from "@/components/ui/card"
import { SellerForm } from "@/components/domain/SellerForm"
import { ThemeToggle } from "@/components/domain/ThemeToggle"
import { BRAND } from "@/lib/config/brand"
import { useTheme } from "@/lib/hooks/useTheme"

export function LoginScreen() {
  const { theme } = useTheme()
  const logo = theme === "dark" ? BRAND.logoLight : BRAND.logoDark

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-brand-gradient p-4">
      <div className="absolute inset-0 z-0">
        <Image
          src={BRAND.wallpaper}
          alt=""
          fill
          priority
          aria-hidden="true"
          className="object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-brand-gradient opacity-80" />
      </div>

      <ThemeToggle
        onBrand
        className="absolute right-4 top-4 z-20"
      />

      <Card className="relative z-10 w-full max-w-md border-white/10 bg-card/90 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src={logo}
            alt="Catálogo Attivus"
            width={220}
            height={64}
            priority
            className="h-12 w-auto"
          />
          <h1 className="mt-5 text-xl font-semibold text-foreground">Acesso ao catálogo</h1>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Use <span className="font-medium text-foreground">admin</span> para gestão ou outro código para entrar como vendedor.
          </p>
        </div>

        <SellerForm />
      </Card>
    </main>
  )
}
