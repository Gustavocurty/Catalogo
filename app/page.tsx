import Image from "next/image"
import { Card } from "@/components/ui/card"
import { SellerForm } from "@/components/domain/SellerForm"

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-brand-gradient p-4">
      {/* Fundo: wallpaper da marca + overlay com gradiente */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/main-wallpaper.png"
          alt=""
          fill
          priority
          aria-hidden="true"
          className="object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-brand-gradient opacity-80" />
      </div>

      <Card className="relative z-10 w-full max-w-md border-white/10 bg-card/95 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-5 flex w-full justify-center rounded-xl bg-brand-gradient px-6 py-5">
              <Image
                src="/attivus-light.svg"
                alt="Catálogo Attivus"
                width={220}
                height={64}
                priority
                className="h-12 w-auto"
              />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Identificação do vendedor</h1>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Informe seus dados para acessar o catálogo e registrar pedidos em campo.
          </p>
        </div>

        <SellerForm />
      </Card>
    </main>
  )
}
