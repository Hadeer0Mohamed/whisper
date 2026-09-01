"use client";

/**
 * Everything the app remembers about a person on this device. Volumes, name and
 * language live in localStorage so they survive across visits; the last room
 * lives in sessionStorage because it is only meaningful for this tab's session.
 */

export const STORAGE_KEYS = {
    displayName: "whisper.displayName",
    identity: "whisper.identity",
    locale: "whisper.locale",
    volumeRoom: "whisper.volume.room",
    volumeDucked: "whisper.volume.ducked",
    volumeWhisper: "whisper.volume.whisper",
    volumeHintSeen: "whisper.hint.volume",
    lastRoom: "whisper.lastRoom",
} as const;

/** Which mix a volume slider controls. */
export type VolumeKey = "room" | "ducked" | "whisper";

export type Volumes = Record<VolumeKey, number>;

export const DEFAULT_VOLUMES: Volumes = {
    /** The room, when you are not whispering. */
    room: 1,
    /** The room, while you are whispering - quiet but still followable. */
    ducked: 0.15,
    /** Your whisper partner. */
    whisper: 1,
};

const VOLUME_STORAGE_KEY: Record<VolumeKey, string> = {
    room: STORAGE_KEYS.volumeRoom,
    ducked: STORAGE_KEYS.volumeDucked,
    whisper: STORAGE_KEYS.volumeWhisper,
};

function clampVolume(value: number): number {
    if (!Number.isFinite(value)) return 1;
    return Math.min(1, Math.max(0, value));
}

export function readVolumes(): Volumes {
    if (typeof window === "undefined") return { ...DEFAULT_VOLUMES };

    const entries = Object.entries(VOLUME_STORAGE_KEY) as [VolumeKey, string][];
    return entries.reduce((acc, [key, storageKey]) => {
        const raw = localStorage.getItem(storageKey);
        acc[key] =
            raw === null
                ? DEFAULT_VOLUMES[key]
                : clampVolume(Number.parseFloat(raw));
        return acc;
    }, {} as Volumes);
}

export function writeVolume(key: VolumeKey, value: number) {
    localStorage.setItem(VOLUME_STORAGE_KEY[key], String(clampVolume(value)));
}

export function hasSeenVolumeHint(): boolean {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(STORAGE_KEYS.volumeHintSeen) === "1";
}

export function markVolumeHintSeen() {
    localStorage.setItem(STORAGE_KEYS.volumeHintSeen, "1");
}

export type LastRoom = {
    code: string;
    name: string;
    /** Epoch ms, used to tell the user how stale the room probably is. */
    leftAt: number;
};

export function readLastRoom(): LastRoom | null {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(STORAGE_KEYS.lastRoom);
    if (!raw) return null;
    try {
        const parsed: unknown = JSON.parse(raw);
        if (
            typeof parsed === "object" &&
            parsed !== null &&
            typeof (parsed as LastRoom).code === "string"
        ) {
            return parsed as LastRoom;
        }
    } catch {
        // Corrupt entry - treat as no history.
    }
    return null;
}

export function writeLastRoom(room: LastRoom) {
    sessionStorage.setItem(STORAGE_KEYS.lastRoom, JSON.stringify(room));
}

export function clearLastRoom() {
    sessionStorage.removeItem(STORAGE_KEYS.lastRoom);
}

/**
 * Stable per-tab id. LiveKit requires identities to be unique within a room, and
 * two tabs on one machine are two different participants.
 */
export function getIdentity(): string {
    let stored = sessionStorage.getItem(STORAGE_KEYS.identity);
    if (!stored) {
        stored = crypto.randomUUID().replaceAll("-", "");
        sessionStorage.setItem(STORAGE_KEYS.identity, stored);
    }
    return stored;
}
