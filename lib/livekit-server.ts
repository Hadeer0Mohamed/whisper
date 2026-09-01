import "server-only"

import { RoomServiceClient } from "livekit-server-sdk"

export type LiveKitConfig = {
  /** wss:// URL the browser connects to. */
  wsUrl: string
  /** https:// URL the server-side API calls go to. */
  apiUrl: string
  apiKey: string
  apiSecret: string
}

export function getLiveKitConfig(): LiveKitConfig | null {
  const wsUrl = process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!wsUrl || !apiKey || !apiSecret) return null

  return {
    wsUrl,
    apiUrl: wsUrl.replace(/^ws/, "http"),
    apiKey,
    apiSecret,
  }
}

export function getRoomService(config: LiveKitConfig): RoomServiceClient {
  return new RoomServiceClient(config.apiUrl, config.apiKey, config.apiSecret)
}

export type RoomMetadata = {
  creator: string
  createdAt: number
}

export function parseRoomMetadata(raw: string | undefined): RoomMetadata | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as RoomMetadata).creator === "string"
    ) {
      return parsed as RoomMetadata
    }
  } catch {
    // A room created outside this app may hold arbitrary metadata; treat as ownerless.
  }
  return null
}

/** LiveKit prefixes are namespaced so this app cannot collide with other rooms on the server. */
export function roomNameFor(code: string): string {
  return `whisper.${code}`
}
