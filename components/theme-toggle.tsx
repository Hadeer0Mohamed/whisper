"use client"

import { useTheme } from "next-themes"
import { Check, Monitor, Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useI18n } from "@/lib/i18n/provider"
import { useIsMounted } from "@/lib/use-client-value"

export function ThemeToggle() {
  const { t } = useI18n()
  const { theme, setTheme } = useTheme()
  // The active theme is unknown on the server, so the checkmark waits for the client.
  const mounted = useIsMounted()

  const options = [
    { value: "light", label: t.theme.light, icon: Sun },
    { value: "dark", label: t.theme.dark, icon: Moon },
    { value: "system", label: t.theme.system, icon: Monitor },
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={t.theme.label}>
            <Sun className="hidden dark:block" />
            <Moon className="dark:hidden" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-36">
        {options.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem key={value} onClick={() => setTheme(value)}>
            <Icon />
            <span className="flex-1">{label}</span>
            {mounted && theme === value ? <Check className="size-3.5 opacity-60" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
