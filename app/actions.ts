"use server"

import { cookies } from "next/headers"

import { LOCALE_COOKIE, resolveLocale } from "@/lib/i18n/config"

export async function setLocale(next: string) {
  const locale = resolveLocale(next)
  const cookieStore = await cookies()
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  })
}
