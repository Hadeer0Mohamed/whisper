"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Languages } from "lucide-react"

import { setLocale } from "@/app/actions"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { locales, type Locale } from "@/lib/i18n/config"
import { useI18n } from "@/lib/i18n/provider"
import { STORAGE_KEYS } from "@/lib/preferences"

const labels: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
}

export function LanguageToggle() {
  const { locale, t } = useI18n()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function pick(next: Locale) {
    if (next === locale) return
    // The cookie is what the server renders from; this mirror just keeps the
    // choice alongside the other preferences on the device.
    localStorage.setItem(STORAGE_KEYS.locale, next)
    startTransition(async () => {
      await setLocale(next)
      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={t.language} disabled={pending}>
            <Languages />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-36">
        {locales.map((value) => (
          <DropdownMenuItem key={value} onClick={() => pick(value)}>
            <span className="flex-1">{labels[value]}</span>
            {locale === value ? <Check className="size-3.5 opacity-60" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
