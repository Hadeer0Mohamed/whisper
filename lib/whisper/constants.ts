/** Published name of the track everyone in the room can hear. */
export const GENERAL_TRACK_NAME = "general";

/** Published name of the track only a whisper partner is permitted to subscribe to. */
export const WHISPER_TRACK_NAME = "whisper";

/** Participant attribute holding the identity this person is trying to whisper with. */
export const WHISPER_ATTRIBUTE = "whisperWith";

/**
 * Participant attribute mirroring the mic button. The general track's mute state
 * cannot stand in for this, because whispering mutes that track too - without a
 * separate signal your whisper partner cannot tell "muted" from "not talking".
 */
export const MIC_MUTED_ATTRIBUTE = "micMuted";
