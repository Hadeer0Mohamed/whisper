import { notFound, redirect } from "next/navigation"

import { RoomScreen } from "@/components/room-screen"
import { normalizeRoomCode } from "@/lib/room-code"

export default async function RoomPage({ params }: PageProps<"/room/[code]">) {
  const { code } = await params
  const normalized = normalizeRoomCode(code)
  if (!normalized) notFound()
  if (normalized !== code) redirect(`/room/${normalized}`)

  return <RoomScreen code={normalized} />
}
