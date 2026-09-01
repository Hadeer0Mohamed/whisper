"use client"

import { createContext, use } from "react"

import { dirFor, type Locale } from "./config"
import { getDictionary, type Dictionary } from "./dictionaries"

type I18nValue = {
  locale: Locale
  dir: "ltr" | "rtl"
  t: Dictionary
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  const value: I18nValue = { locale, dir: dirFor(locale), t: getDictionary(locale) }
  return <I18nContext value={value}>{children}</I18nContext>
}

export function useI18n(): I18nValue {
  const value = use(I18nContext)
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>")
  return value
}
