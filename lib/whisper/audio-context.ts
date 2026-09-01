"use client"

/**
 * A single AudioContext shared by every room connection.
 *
 * iOS only lets an AudioContext start running if it is created or resumed
 * inside a real user gesture, and a gesture does not survive an `await`. Since
 * connecting involves a token request and a getUserMedia prompt before the room
 * exists, the context has to be unlocked up front from the tap that starts the
 * join — hence a module-level singleton rather than one per room.
 *
 * It is deliberately never closed: a closed context cannot be reopened, which
 * would break every join after the first.
 */
let context: AudioContext | null = null

type AudioContextCtor = typeof AudioContext

function getConstructor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext ??
    null
  )
}

export function getSharedAudioContext(): AudioContext | undefined {
  if (context) return context
  const Ctor = getConstructor()
  if (!Ctor) return undefined
  context = new Ctor()
  return context
}

/**
 * Call synchronously from a click/submit handler, before any `await`, so iOS
 * accepts the resume. Safe to call repeatedly.
 */
export function unlockAudioContext() {
  const ctx = getSharedAudioContext()
  if (ctx && ctx.state !== "running") {
    void ctx.resume().catch(() => {
      // Still locked; the in-room "enable audio" button retries via startAudio().
    })
  }
}
