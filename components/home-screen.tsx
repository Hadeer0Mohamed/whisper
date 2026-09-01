"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, EarOff, History, Plus, Volume1, UserRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useI18n } from "@/lib/i18n/provider"
import { clearLastRoom, readLastRoom, type LastRoom } from "@/lib/preferences"
import { generateRoomCode, normalizeRoomCode } from "@/lib/room-code"
import { useIsMounted } from "@/lib/use-client-value"

export function HomeScreen() {
  const { t } = useI18n()
  const router = useRouter()
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  // sessionStorage is client-only, so this stays null until after hydration.
  const mounted = useIsMounted()
  const [dismissedRejoin, setDismissedRejoin] = useState(false)
  const lastRoom: LastRoom | null = mounted && !dismissedRejoin ? readLastRoom() : null

  function create() {
    router.push(`/room/${generateRoomCode()}`)
  }

  function join(event: React.FormEvent) {
    event.preventDefault()
    const normalized = normalizeRoomCode(code)
    if (!normalized) {
      setError(t.home.invalidCode)
      return
    }
    router.push(`/room/${normalized}`)
  }

  const features = [
    { icon: EarOff, title: t.home.featureWhisperTitle, body: t.home.featureWhisperBody },
    { icon: Volume1, title: t.home.featureDuckTitle, body: t.home.featureDuckBody },
    { icon: UserRound, title: t.home.featureNoAccountTitle, body: t.home.featureNoAccountBody },
  ]

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-12 px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-3 text-center sm:text-start">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t.home.heading}
        </h1>
        <p className="max-w-2xl text-pretty text-muted-foreground sm:text-lg">
          {t.home.subheading}
        </p>
      </div>

      {lastRoom ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center gap-3">
            <History className="size-4 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium">
                {t.home.rejoinTitle}
                <code className="ms-2 rounded bg-muted px-1.5 py-0.5 font-mono text-xs" dir="ltr">
                  {lastRoom.code}
                </code>
              </span>
              <span className="text-xs text-muted-foreground">{t.home.rejoinNote}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearLastRoom()
                setDismissedRejoin(true)
              }}
            >
              {t.home.rejoinDismiss}
            </Button>
            <Button size="sm" onClick={() => router.push(`/room/${lastRoom.code}`)}>
              {t.home.rejoinAction}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>{t.home.createTitle}</CardTitle>
            <CardDescription>{t.home.createDescription}</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button size="lg" className="w-full" onClick={create}>
              <Plus data-icon="inline-start" />
              {t.home.createAction}
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>{t.home.joinTitle}</CardTitle>
            <CardDescription>{t.home.joinDescription}</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <form className="flex flex-col gap-2" onSubmit={join} noValidate>
              <Label htmlFor="room-code" className="sr-only">
                {t.home.codeLabel}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="room-code"
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value)
                    setError(null)
                  }}
                  placeholder={t.home.codePlaceholder}
                  autoComplete="off"
                  spellCheck={false}
                  dir="ltr"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "room-code-error" : undefined}
                  className="font-mono"
                />
                <Button type="submit" size="lg" variant="secondary" disabled={!code.trim()}>
                  {t.home.joinAction}
                  <ArrowRight data-icon="inline-end" className="rtl:-scale-x-100" />
                </Button>
              </div>
              {error ? (
                <p id="room-code-error" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </div>

      <ul className="grid gap-6 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex flex-col gap-2">
            <Icon className="size-5 text-muted-foreground" />
            <h2 className="text-sm font-medium">{title}</h2>
            <p className="text-sm text-muted-foreground">{body}</p>
          </li>
        ))}
      </ul>
    </main>
  )
}
