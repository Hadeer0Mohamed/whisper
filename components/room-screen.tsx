"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Copy, Ear, Loader2, Mic, MicOff, PhoneOff, Users, Volume2 } from "lucide-react"
import { toast } from "sonner"

import { ParticipantList } from "@/components/participant-list"
import { SiteHeader } from "@/components/site-header"
import { VolumeControl } from "@/components/volume-control"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useI18n } from "@/lib/i18n/provider"
import {
  getIdentity,
  hasSeenVolumeHint,
  markVolumeHintSeen,
  STORAGE_KEYS,
  writeLastRoom,
} from "@/lib/preferences"
import { useStoredValue } from "@/lib/use-client-value"
import { useWhisperRoom } from "@/lib/whisper/use-whisper-room"

const HINT_DURATION_MS = 3000

export function RoomScreen({ code }: { code: string }) {
  const { t } = useI18n()
  const router = useRouter()
  const {
    state,
    volumes,
    audioContainerRef,
    connect,
    disconnect,
    toggleWhisper,
    toggleMic,
    setVolume,
    enableAudio,
  } = useWhisperRoom()

  const storedName = useStoredValue(STORAGE_KEYS.displayName)
  const [typedName, setTypedName] = useState<string | null>(null)
  const displayName = typedName ?? storedName
  const [nameError, setNameError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [switchTarget, setSwitchTarget] = useState<string | null>(null)
  const [showVolumeHint, setShowVolumeHint] = useState(false)
  const previousPartnerRef = useRef<string | null>(null)

  const connected = state.status === "connected" || state.status === "reconnecting"
  const partner = state.partner

  // Announce whisper transitions.
  useEffect(() => {
    const current = partner?.identity ?? null
    const previous = previousPartnerRef.current
    previousPartnerRef.current = current

    if (current && current !== previous) toast.success(t.room.whisperStarted(partner!.name))
    else if (!current && previous) toast(t.room.whisperEnded)
  }, [partner, t])

  useEffect(() => {
    if (!showVolumeHint) return
    const timer = setTimeout(() => setShowVolumeHint(false), HINT_DURATION_MS)
    return () => clearTimeout(timer)
  }, [showVolumeHint])

  // Remember the room so it can be offered for a quick rejoin.
  useEffect(() => {
    if (!connected) return
    writeLastRoom({ code, name: displayName, leftAt: Date.now() })
  }, [connected, code, displayName])

  async function join(event: React.FormEvent) {
    event.preventDefault()
    const name = displayName.trim()
    if (!name) {
      setNameError(t.prejoin.nameRequired)
      return
    }
    localStorage.setItem(STORAGE_KEYS.displayName, name)
    await connect({ code, displayName: name, identity: getIdentity() })
  }

  async function leave() {
    setLeaveOpen(false)
    await disconnect()
    router.push("/")
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    toast.success(t.room.copied)
    setTimeout(() => setCopied(false), 2000)
  }

  /**
   * Starting a whisper with someone new silently ends the current one, so make
   * that consequence explicit before it happens.
   */
  /** Point out the volume control the first time someone starts a whisper. */
  const maybeShowVolumeHint = useCallback(() => {
    if (hasSeenVolumeHint()) return
    markVolumeHintSeen()
    setShowVolumeHint(true)
  }, [])

  const handleWhisperClick = useCallback(
    (identity: string) => {
      const stopping = partner?.identity === identity
      if (partner !== null && !stopping) {
        setSwitchTarget(identity)
        return
      }
      if (!stopping) maybeShowVolumeHint()
      void toggleWhisper(identity)
    },
    [maybeShowVolumeHint, partner, toggleWhisper]
  )

  const confirmSwitch = useCallback(() => {
    const target = switchTarget
    setSwitchTarget(null)
    if (!target) return
    maybeShowVolumeHint()
    void toggleWhisper(target)
  }, [maybeShowVolumeHint, switchTarget, toggleWhisper])

  const body = !connected ? (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>{t.prejoin.heading}</CardTitle>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              {t.prejoin.room}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs" dir="ltr">
                {code}
              </code>
            </p>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={join} noValidate>
              <div className="flex flex-col gap-2">
                <Label htmlFor="display-name">{t.prejoin.nameLabel}</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(event) => {
                    setTypedName(event.target.value)
                    setNameError(null)
                  }}
                  placeholder={t.prejoin.namePlaceholder}
                  maxLength={40}
                  autoComplete="nickname"
                  aria-invalid={nameError ? true : undefined}
                />
                {nameError ? <p className="text-sm text-destructive">{nameError}</p> : null}
              </div>

              {state.error ? (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {state.error === "mic_denied" ? t.room.micDenied : t.room.connectFailed}
                </p>
              ) : null}

              <Button type="submit" size="lg" disabled={state.status === "connecting"}>
                {state.status === "connecting" ? (
                  <>
                    <Loader2 className="animate-spin" data-icon="inline-start" />
                    {t.prejoin.joining}
                  </>
                ) : (
                  t.prejoin.join
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {t.prejoin.permissionHint}
              </p>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  ) : (
    <>
      <SiteHeader>
        <div className="flex items-center gap-2">
          <code
            className="rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground"
            dir="ltr"
          >
            {code}
          </code>
          <Button variant="ghost" size="icon-sm" aria-label={t.room.copyLink} onClick={copyInvite}>
            {copied ? <Check /> : <Copy />}
          </Button>
        </div>
      </SiteHeader>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
        {state.status === "reconnecting" ? (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
            {t.room.reconnecting}
          </p>
        ) : null}

        {state.audioBlocked ? (
          <Button variant="secondary" onClick={enableAudio}>
            <Volume2 data-icon="inline-start" />
            {t.room.audioBlocked}
          </Button>
        ) : null}

        {partner ? (
          <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <Ear className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{t.room.whisperBannerTitle}</span>
              <span className="text-sm text-muted-foreground">
                {t.room.whisperBannerBody(partner.name)}
              </span>
            </div>
          </div>
        ) : null}

        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4" />
              {t.room.participants}
              <span className="font-normal text-muted-foreground">
                · {t.room.participantCount(state.members.length)}
              </span>
            </CardTitle>
            {/* CardAction switches the header to a [1fr_auto] grid, so the
                title and the volume control sit on one row, pushed apart. */}
            <CardAction>
              <VolumeControl
                volumes={volumes}
                whispering={partner !== null}
                highlighted={showVolumeHint}
                hint={showVolumeHint ? t.room.volume.hint : null}
                onVolumeChange={setVolume}
              />
            </CardAction>
          </CardHeader>
          <CardContent>
            <ParticipantList
              members={state.members}
              localIdentity={state.localIdentity}
              pendingTarget={state.pendingTarget}
              onWhisperClick={handleWhisperClick}
            />
            {state.members.length === 1 ? (
              <>
                <Separator className="my-4" />
                <p className="text-sm text-muted-foreground">{t.room.emptyState}</p>
              </>
            ) : null}
          </CardContent>
        </Card>
      </main>

      <footer className="sticky bottom-0 flex items-center justify-center gap-2 border-t bg-background/80 px-4 py-3 backdrop-blur">
        <Button
          variant={state.micEnabled ? "outline" : "destructive"}
          size="lg"
          aria-pressed={!state.micEnabled}
          aria-label={state.micEnabled ? t.room.muteMic : t.room.unmuteMic}
          onClick={() => void toggleMic()}
        >
          {state.micEnabled ? <Mic data-icon="inline-start" /> : <MicOff data-icon="inline-start" />}
          {state.micEnabled ? t.room.muteMic : t.room.unmuteMic}
        </Button>

        <Button variant="destructive" size="lg" onClick={() => setLeaveOpen(true)}>
          <PhoneOff data-icon="inline-start" />
          {t.room.leave}
        </Button>
      </footer>
    </>
  )

  return (
    <>
      {body}

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.room.leaveTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.room.leaveBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.room.cancel}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void leave()}>
              {t.room.leaveConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={switchTarget !== null}
        onOpenChange={(open) => {
          if (!open) setSwitchTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.room.switchTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.room.switchBody(
                partner?.name ?? "",
                state.members.find((member) => member.identity === switchTarget)?.name ?? ""
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.room.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitch}>{t.room.switchConfirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remote audio elements are appended here imperatively, so this node
          must stay mounted across the prejoin → connected transition. */}
      <div ref={audioContainerRef} className="hidden" aria-hidden />
    </>
  )
}
