"use client"

import Link from "next/link"
import { AudioLines } from "lucide-react"

import { LanguageToggle } from "@/components/language-toggle"
import { ThemeToggle } from "@/components/theme-toggle"
import { useI18n } from "@/lib/i18n/provider"

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  const { t } = useI18n()

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
      <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <AudioLines className="size-4" />
        </span>
        {t.appName}
      </Link>
      <div className="flex-1">{children}</div>
      <LanguageToggle />
      <ThemeToggle />
    </header>
  )
}
