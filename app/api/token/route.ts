import { AccessToken } from "livekit-server-sdk"

import {
  getLiveKitConfig,
  getRoomService,
  parseRoomMetadata,
  roomNameFor,
} from "@/lib/livekit-server"
import { ROOM_CODE_PATTERN } from "@/lib/room-code"

const IDENTITY_PATTERN = /^[A-Za-z0-9_-]{8,64}$/
const MAX_NAME_LENGTH = 40
/** Keep rooms alive briefly so a reconnect or a slow second joiner does not lose the host. */
const EMPTY_TIMEOUT_SECONDS = 300
const MAX_PARTICIPANTS = 50

type TokenRequest = {
  code?: unknown
  name?: unknown
  identity?: unknown
}

export async function POST(request: Request) {
  const config = getLiveKitConfig()
  if (!config) {
    return Response.json({ error: "livekit_not_configured" }, { status: 503 })
  }

  let body: TokenRequest
  try {
    body = (await request.json()) as TokenRequest
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 })
  }

  const code = typeof body.code === "string" ? body.code.trim().toLowerCase() : ""
  const identity = typeof body.identity === "string" ? body.identity.trim() : ""
  const name = typeof body.name === "string" ? body.name.trim().slice(0, MAX_NAME_LENGTH) : ""

  if (!ROOM_CODE_PATTERN.test(code)) {
    return Response.json({ error: "invalid_code" }, { status: 400 })
  }
  if (!IDENTITY_PATTERN.test(identity)) {
    return Response.json({ error: "invalid_identity" }, { status: 400 })
  }
  if (!name) {
    return Response.json({ error: "invalid_name" }, { status: 400 })
  }

  const roomName = roomNameFor(code)
  const service = getRoomService(config)

  // CreateRoom is idempotent: an existing room is returned untouched, so the
  // metadata we read back always names whoever actually got there first.
  let creator = identity
  try {
    const room = await service.createRoom({
      name: roomName,
      emptyTimeout: EMPTY_TIMEOUT_SECONDS,
      maxParticipants: MAX_PARTICIPANTS,
      metadata: JSON.stringify({ creator: identity, createdAt: Date.now() }),
    })
    creator = parseRoomMetadata(room.metadata)?.creator ?? identity
  } catch (error) {
    console.error("[whisper] createRoom failed", error)
    return Response.json({ error: "livekit_unreachable" }, { status: 502 })
  }

  const token = new AccessToken(config.apiKey, config.apiSecret, {
    identity,
    name,
    ttl: "4h",
  })

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    // Required for localParticipant.setAttributes, which carries whisper state.
    canUpdateOwnMetadata: true,
    // Recorders are exempt from track subscription permissions, which would
    // defeat whisper privacy. Never grant it here.
    recorder: false,
  })

  return Response.json({
    token: await token.toJwt(),
    url: config.wsUrl,
    roomName,
    identity,
    creator,
  })
}
