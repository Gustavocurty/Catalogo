"use client"

import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/lib/hooks/useTheme"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  className?: string
  onBrand?: boolean
}

export function ThemeToggle({ className, onBrand = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === "dark"

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggleTheme}
      aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
      className={cn(
        onBrand && "text-white hover:bg-white/15 hover:text-white",
        className,
      )}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  )
}
