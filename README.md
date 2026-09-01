# Whisper

A Google-Meet-style audio room with a real private side-channel. Anyone in a room
can pull one other person aside for a **whisper**: the two of them hear each other
at full volume, the main conversation drops to a murmur for them, and nobody else
receives the whisper audio at all.

Built with Next.js 16 (App Router, full stack), shadcn/ui on Base UI, and a
self-hosted LiveKit server. English + Arabic, LTR + RTL, light + dark.

## How whispering actually works

The privacy is enforced by the media server, not by the UI. That distinction is
the whole design:

- Every participant publishes **two** audio tracks from a single microphone
  capture - a `general` track (`Track.Source.Microphone`) and a cloned `whisper`
  track (`Track.Source.Unknown`). The distinct source matters: with two
  `Microphone`-source tracks, `setMicrophoneEnabled` would mute an arbitrary one.
- Each client calls `setTrackSubscriptionPermissions(false, …)`, granting every
  other participant its `general` track and granting the **confirmed partner
  only** its `whisper` track. The LiveKit SFU refuses to forward a track to
  anyone not on that list, so outsiders never receive the bytes. A tampered
  client cannot listen in.
- Muting is _not_ used as a privacy control (a muted track still sends silence);
  it is only a bandwidth and echo optimisation on top of the permission gate.
- A whisper is **mutual**. Clicking the ear icon sets a `whisperWith` participant
  attribute; the other side auto-accepts by pointing back. Audio routing only
  changes once both sides point at each other.
- While whispering, your `general` track is muted so the room cannot hear you,
  and every remote `general` track is ducked to 15% so you can still follow along.

> ⚠️ Never issue a token with the `recorder` grant. Recorder participants are
> explicitly exempt from track subscription permissions in the SFU, which would
> put whisper audio into the recording.

## What you need on the LiveKit side

You said you already self-host LiveKit. Here is the checklist that matters for
this app specifically.

### Version

- **LiveKit server ≥ 1.7.1.** Participant attributes (which carry whisper state)
  landed in 1.7.0 and a broadcast bug was fixed in 1.7.1. Current 1.13.x is fine.
- Track subscription permissions work on any 1.x.
- If you upgrade across 1.12 → 1.13, note that 1.13.0 removed backwards
  compatibility for TURN auth without TTL.

### Credentials

Create `.env.local` (a placeholder file was generated - **replace the values**):

```dotenv
LIVEKIT_URL=wss://livekit.your-domain.com
LIVEKIT_API_KEY=APIxxxxxxxxxxx
LIVEKIT_API_SECRET=your-secret
```

`LIVEKIT_URL` is the signalling WebSocket URL; the server derives the HTTPS API
URL from it. The key/secret pair comes from the `keys:` block of `livekit.yaml`
and is only ever read server-side.

### Ports and firewall for LiveKit

| Purpose                    | Port              | `livekit.yaml` key              | Required                                  |
| -------------------------- | ----------------- | ------------------------------- | ----------------------------------------- |
| API + signalling WebSocket | 7880/TCP          | `port`                          | Yes (put TLS in front)                    |
| ICE/TCP fallback           | 7881/TCP          | `rtc.tcp_port`                  | Yes, must be exposed on the node directly |
| ICE/UDP range              | 50000–60000/UDP   | `rtc.port_range_start` / `_end` | Yes, unless using UDP mux                 |
| ICE/UDP mux                | 7882/UDP          | `rtc.udp_port`                  | Alternative to the range                  |
| TURN/UDP                   | 3478/UDP          | `turn.udp_port`                 | Recommended                               |
| TURN/TLS                   | 5349/TCP (or 443) | `turn.tls_port`                 | Recommended                               |

```yaml
port: 7880
keys:
    APIxxxxxxxxxxx: your-secret
rtc:
    port_range_start: 50000
    port_range_end: 60000
    tcp_port: 7881
    use_external_ip: true # easy to miss on cloud VMs behind 1:1 NAT
turn:
    enabled: true
    domain: turn.your-domain.com # must match the TLS certificate
    udp_port: 3478
    tls_port: 5349
```

Notes that bite people:

- **TLS is mandatory.** Browsers refuse `ws://` from an `https://` page, and
  `getUserMedia` requires a secure context. The certificate must be from a real
  CA - self-signed will not work. LiveKit does not terminate TLS itself, so put
  a reverse proxy or load balancer in front of 7880.
- `rtc.port_range_start`/`_end` and `rtc.udp_port` are **mutually exclusive**.
- **TURN is worth enabling.** Corporate firewalls that block UDP _and_ plain TCP
  are common; TURN/TLS on 443 is often the only path that connects.
- `use_external_ip: true` is the single most common cause of "connects but no
  audio" on cloud VMs.

### Do you need anything besides Next.js?

No. Next.js route handlers mint the tokens and call the LiveKit room API, and the
browser talks to the SFU directly.

- **No separate backend.** `livekit-server-sdk` runs in the route handler.
- **No database.** Rooms are ephemeral. Room ownership lives in LiveKit's own
  room metadata: `CreateRoom` is idempotent, so whoever creates the room first is
  recorded as the host and everyone reads it back from the room metadata. Rooms
  disappear 5 minutes after the last person leaves. You would only need Postgres
  or Redis if you later want rooms, ownership, or history to survive that.
- **No `@livekit/components-react`.** It is aimed at prebuilt video layouts, and
  none of the whisper mechanics (dual publish, subscription permissions,
  per-track volume) have an abstraction there. Raw `livekit-client` is used.
- Optional later: a webhook route for `room_finished` events, and Redis if you
  run multiple LiveKit nodes.

## Running it

```bash
npm install
cp .env.example .env.local   # then fill in your LiveKit values
npm run dev
```

Open two different browsers (or a normal and a private window) so you get two
participants, join the same room code, and click the ear icon on the other
person. Two tabs in the same browser profile work too - identity is per-tab.

## Project layout

| Path                              | Purpose                                               |
| --------------------------------- | ----------------------------------------------------- |
| `app/page.tsx`                    | Landing: create or join a room                        |
| `app/room/[code]/page.tsx`        | Room route, validates and canonicalises the code      |
| `app/api/token/route.ts`          | Mints access tokens, records the room host            |
| `lib/whisper/use-whisper-room.ts` | The engine: connection, pairing, permissions, ducking |
| `lib/livekit-server.ts`           | Server-side LiveKit config and room metadata          |
| `lib/i18n/`                       | Dictionaries, locale cookie, provider                 |
| `components/room-screen.tsx`      | Prejoin and in-room UI                                |
| `components/participant-list.tsx` | Participant rows, host tag, whisper buttons           |

## What the app remembers

| Where | What |
| --- | --- |
| localStorage | Display name, the three audio levels, whether the volume hint was shown, theme, and a mirror of the language |
| sessionStorage | Per-tab participant identity, and the last room joined (used for the rejoin card) |
| Cookie | Language — it has to be a cookie so the server can render `lang`/`dir` correctly on the first paint |

Audio levels are three separate values, so the slider you see always maps to
exactly one of them: **Room** (when you are not whispering), **Others** (the
room while you _are_ whispering, defaulting to 15%) and **Whisper**. Ending a
whisper therefore restores your normal room level automatically.

> **iOS needs Web Audio for any of this to work.** Safari on iOS treats
> `HTMLMediaElement.volume` as read-only — assignments are silently ignored so
> the hardware buttons stay in charge. LiveKit's default playback path sets
> `element.volume`, so on iPhone both the sliders and whisper ducking would do
> nothing at all. The room is therefore created with `webAudioMix`, which routes
> every remote track through a `GainNode` that iOS does honour. Because iOS also
> only unlocks an `AudioContext` inside a real user gesture — and a gesture does
> not survive an `await` — the context is a module-level singleton unlocked
> synchronously from the join tap, before the token request.

## Language and theme

Locale is stored in a `whisper.locale` cookie and applied on the server, so
`<html lang dir>` is correct on first paint with no flash. Base UI's
`DirectionProvider` is wired to the same value so popovers and menus flip
correctly in RTL. Arabic text uses Noto Sans Arabic. Theme is `next-themes` with
the `.dark` class strategy already present in `app/globals.css`.

> Locale-dependent classes belong on `<body>`, never on `<html>`. next-themes
> owns the `class` attribute on `<html>`; if a locale switch changes the
> `className` React renders there, React rewrites the attribute and silently
> drops the `dark` class — the theme appears to reset to light.
