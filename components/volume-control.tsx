"use client"

import { Ear, Users, Volume1, Volume2, VolumeX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { useI18n } from "@/lib/i18n/provider"
import type { VolumeKey, Volumes } from "@/lib/preferences"
import { cn } from "@/lib/utils"

function VolumeRow({
  icon: Icon,
  label,
  value,
  onChange,
}: {
  icon: typeof Volume1
  label: string
  value: number
  onChange: (value: number) => void
}) {
  // Volumes are stored as 0–1 but the slider works in whole percent, so scale on
  // the way in as well as out — otherwise the thumb sits at ~0 while the readout
  // claims 82%.
  const percent = Math.round(value * 100)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium">
          <Icon className="size-3.5 text-muted-foreground" />
          {label}
        </span>
        <span className="font-mono text-muted-foreground" dir="ltr">
          {percent}%
        </span>
      </div>
      <Slider
        // This Slider renders one thumb per array entry, so the value must be an array.
        value={[percent]}
        min={0}
        max={100}
        step={1}
        aria-label={label}
        onValueChange={(next) => {
          const raw = Array.isArray(next) ? next[0] : next
          onChange(raw / 100)
        }}
      />
    </div>
  )
}

export function VolumeControl({
  volumes,
  whispering,
  highlighted,
  hint,
  onVolumeChange,
}: {
  volumes: Volumes
  whispering: boolean
  highlighted: boolean
  hint: string | null
  onVolumeChange: (key: VolumeKey, value: number) => void
}) {
  const { t } = useI18n()

  const activeLevel = whispering ? volumes.ducked : volumes.room
  const Icon = activeLevel === 0 ? VolumeX : activeLevel < 0.5 ? Volume1 : Volume2

  return (
    <div className="relative">
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t.room.volume.label}
              className={cn(
                highlighted && "border-primary ring-3 ring-primary/40 transition-shadow"
              )}
            >
              <Icon />
            </Button>
          }
        />
        <PopoverContent align="end" className="w-64">
          <div className="flex flex-col gap-4">
            {whispering ? (
              <>
                <VolumeRow
                  icon={Users}
                  label={t.room.volume.others}
                  value={volumes.ducked}
                  onChange={(value) => onVolumeChange("ducked", value)}
                />
                <VolumeRow
                  icon={Ear}
                  label={t.room.volume.whisper}
                  value={volumes.whisper}
                  onChange={(value) => onVolumeChange("whisper", value)}
                />
              </>
            ) : (
              <VolumeRow
                icon={Users}
                label={t.room.volume.room}
                value={volumes.room}
                onChange={(value) => onVolumeChange("room", value)}
              />
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* A plain tooltip would need hover; this is a one-shot coach mark that
          appears on the first whisper and disappears on its own. It sits below
          the button because the surrounding card clips overflow upward. */}
      {hint ? (
        <div
          role="status"
          className="absolute top-full end-0 z-50 mt-2 w-56 rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground shadow-md"
        >
          {hint}
        </div>
      ) : null}
    </div>
  )
}
