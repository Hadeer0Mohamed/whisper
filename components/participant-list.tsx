"use client";

import { Crown, Ear, EarOff, Loader2, Mic, MicOff } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { RoomMember } from "@/lib/whisper/use-whisper-room";

function initials(name: string) {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

type WhisperButtonState = "idle" | "active" | "pending" | "busy";

export function ParticipantList({
    members,
    localIdentity,
    pendingTarget,
    onWhisperClick,
}: {
    members: RoomMember[];
    localIdentity: string | null;
    pendingTarget: string | null;
    onWhisperClick: (identity: string) => void;
}) {
    const { t } = useI18n();

    const nameOf = (identity: string | null) =>
        members.find((member) => member.identity === identity)?.name ?? "";

    return (
        <ul className="flex flex-col gap-1">
            {members.map((member) => {
                const isPartnerOfMine =
                    member.whisperPartner !== null &&
                    member.whisperPartner === localIdentity;

                let buttonState: WhisperButtonState = "idle";
                if (isPartnerOfMine) buttonState = "active";
                else if (pendingTarget === member.identity)
                    buttonState = "pending";
                else if (member.whisperPartner !== null) buttonState = "busy";

                const label =
                    buttonState === "active"
                        ? t.room.stopWhisper(member.name)
                        : buttonState === "pending"
                          ? t.room.whisperInvitePending(member.name)
                          : buttonState === "busy"
                            ? t.room.whisperBusy(member.name)
                            : t.room.whisperTo(member.name);

                const status = member.whisperPartner
                    ? isPartnerOfMine
                        ? t.room.whisperingWith(member.name)
                        : t.room.whisperingWithOther(
                              member.name,
                              nameOf(member.whisperPartner),
                          )
                    : null;

                return (
                    <li
                        key={member.identity}
                        className={cn(
                            "flex items-center gap-3 rounded-lg border px-2 py-2 transition-colors",
                            // Speaking is shown as a border so it reads at a glance without
                            // shifting layout.
                            member.isSpeaking
                                ? "border-transparent"
                                : "border-transparent",
                            isPartnerOfMine &&
                                !member.isSpeaking &&
                                "border-primary/30 bg-primary/5",
                        )}
                    >
                        <Avatar
                            className={cn(
                                "size-9 ring-2 transition-shadow",
                                member.isSpeaking
                                    ? "ring-primary"
                                    : "ring-transparent",
                            )}
                        >
                            <AvatarFallback className="text-xs font-medium">
                                {initials(member.name)}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex items-center gap-1.5">
                                <span className="truncate text-sm font-medium">
                                    {member.name}
                                </span>
                                {member.isLocal ? (
                                    <span className="text-xs text-muted-foreground">
                                        ({t.room.you})
                                    </span>
                                ) : null}
                                {member.isCreator ? (
                                    <Badge
                                        variant="secondary"
                                        className="gap-1 px-1.5 py-0 text-[0.7rem]"
                                    >
                                        <Crown className="size-3" />
                                        {t.room.creator}
                                    </Badge>
                                ) : null}
                            </div>
                            {status ? (
                                <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                    <Ear className="size-3 shrink-0" />
                                    {status}
                                </span>
                            ) : null}
                        </div>

                        {/* Mic state is shown for everyone, not just yourself, so you can
                tell a muted person from a silent one. */}
                        <Tooltip>
                            <TooltipTrigger
                                render={
                                    <span
                                        className={cn(
                                            "flex size-7 items-center justify-center rounded-md",
                                            member.isMuted
                                                ? "text-destructive"
                                                : "text-muted-foreground/60",
                                        )}
                                    >
                                        {member.isMuted ? (
                                            <MicOff className="size-4" />
                                        ) : (
                                            <Mic className="size-4" />
                                        )}
                                    </span>
                                }
                            />
                            <TooltipContent>
                                {member.isMuted
                                    ? t.room.muted
                                    : t.room.unmutedLabel}
                            </TooltipContent>
                        </Tooltip>

                        {member.isLocal ? null : (
                            <Tooltip>
                                <TooltipTrigger
                                    render={
                                        <Button
                                            variant={
                                                buttonState === "active"
                                                    ? "default"
                                                    : "ghost"
                                            }
                                            size="icon-sm"
                                            aria-label={label}
                                            aria-pressed={
                                                buttonState === "active"
                                            }
                                            disabled={buttonState === "busy"}
                                            onClick={() =>
                                                onWhisperClick(member.identity)
                                            }
                                        >
                                            {buttonState === "pending" ? (
                                                <Loader2 className="animate-spin" />
                                            ) : buttonState === "active" ? (
                                                <EarOff />
                                            ) : (
                                                <Ear />
                                            )}
                                        </Button>
                                    }
                                />
                                <TooltipContent>{label}</TooltipContent>
                            </Tooltip>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
