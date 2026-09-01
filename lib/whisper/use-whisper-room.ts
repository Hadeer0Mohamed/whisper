"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ConnectionState,
    LocalAudioTrack,
    RemoteAudioTrack,
    Room,
    RoomEvent,
    Track,
    type Participant,
    type ParticipantTrackPermission,
} from "livekit-client";

import {
    readVolumes,
    writeVolume,
    type VolumeKey,
    type Volumes,
} from "@/lib/preferences";

import {
    GENERAL_TRACK_NAME,
    MIC_MUTED_ATTRIBUTE,
    WHISPER_ATTRIBUTE,
    WHISPER_TRACK_NAME,
} from "./constants";

export type RoomMember = {
    identity: string;
    name: string;
    isLocal: boolean;
    isCreator: boolean;
    isSpeaking: boolean;
    isMuted: boolean;
    /** Who this person has declared they want to whisper with, if anyone. */
    whisperTarget: string | null;
    /** Set when the declaration is mutual, i.e. the whisper is actually live. */
    whisperPartner: string | null;
};

export type WhisperStatus =
    | "idle"
    | "connecting"
    | "connected"
    | "reconnecting"
    | "error";

export type WhisperError = "mic_denied" | "connect_failed";

export type WhisperRoomState = {
    status: WhisperStatus;
    error: WhisperError | null;
    members: RoomMember[];
    localIdentity: string | null;
    /** Confirmed, mutual whisper partner. */
    partner: RoomMember | null;
    /** Declared but not yet reciprocated. */
    pendingTarget: string | null;
    micEnabled: boolean;
    audioBlocked: boolean;
};

export type ConnectOptions = {
    code: string;
    displayName: string;
    identity: string;
};

type Snapshot = Omit<WhisperRoomState, "error">;

const EMPTY_SNAPSHOT: Snapshot = {
    status: "idle",
    members: [],
    localIdentity: null,
    partner: null,
    pendingTarget: null,
    micEnabled: true,
    audioBlocked: false,
};

function attributeTarget(participant: Participant): string | null {
    const value = participant.attributes?.[WHISPER_ATTRIBUTE];
    return value ? value : null;
}

function isRemoteAudio(track: Track | undefined): track is RemoteAudioTrack {
    return track instanceof RemoteAudioTrack;
}

/** Publications are re-created with new SIDs on reconnect, so never cache them. */
function publicationsOf(room: Room) {
    return {
        general:
            room.localParticipant.getTrackPublicationByName(GENERAL_TRACK_NAME),
        whisper:
            room.localParticipant.getTrackPublicationByName(WHISPER_TRACK_NAME),
    };
}

/**
 * The actual privacy boundary. The SFU refuses to forward a track to anyone not
 * listed here, so the whisper track is only ever routed to the partner.
 *
 * Subscription permissions start out fully permissive, so this has to be called
 * once before publishing anything; from then on it must be re-issued after every
 * publish and whenever the participant set changes, because in restricted mode a
 * newly published track grants permission to nobody.
 */
function syncPermissions(
    room: Room,
    partnerIdentity: string | null,
    generalSid: string | undefined,
    whisperSid: string | undefined,
) {
    const permissions: ParticipantTrackPermission[] = [];

    for (const participant of room.remoteParticipants.values()) {
        const allowed: string[] = [];
        if (generalSid) allowed.push(generalSid);
        if (whisperSid && participant.identity === partnerIdentity)
            allowed.push(whisperSid);

        permissions.push({
            participantIdentity: participant.identity,
            allowAll: false,
            // An explicit list is mandatory. An empty array denies everything, which
            // is the correct fail-closed default before our tracks exist.
            allowedTrackSids: allowed,
        });
    }

    room.localParticipant.setTrackSubscriptionPermissions(false, permissions);
}

/**
 * Applies the listener's own mix. The room plays at its ducked level only while
 * a whisper is live, so ending one restores the normal level automatically.
 */
function applyVolumes(
    room: Room,
    partnerIdentity: string | null,
    volumes: Volumes,
) {
    for (const participant of room.remoteParticipants.values()) {
        for (const publication of participant.trackPublications.values()) {
            const track = publication.track;
            if (!isRemoteAudio(track)) continue;
            const isWhisperTrack = publication.trackName === WHISPER_TRACK_NAME;
            track.setVolume(
                isWhisperTrack
                    ? volumes.whisper
                    : partnerIdentity
                      ? volumes.ducked
                      : volumes.room,
            );
        }
    }
}

function releaseMicrophone(tracks: { current: MediaStreamTrack[] }) {
    tracks.current.forEach((track) => track.stop());
    tracks.current = [];
}

type Ref<T> = { current: T };

type ReconcileContext = {
    room: Room;
    members: RoomMember[];
    /** Re-reads members after an await, since the room may have moved on. */
    rebuild: () => RoomMember[];
    reconciling: Ref<boolean>;
    dirty: Ref<boolean>;
    confirmedWith: Ref<string | null>;
    declined: Ref<Set<string>>;
};

/**
 * Turns a one-sided whisper request into a mutual one, and tears down whispers
 * whose other half has left, moved on, or walked away.
 */
async function reconcileWhisper(ctx: ReconcileContext): Promise<void> {
    const { room, members, reconciling, dirty, confirmedWith, declined } = ctx;

    // Mid-reconnect LiveKit reports every remote participant as gone, which would
    // look exactly like a partner leaving. Only act on a settled room.
    if (room.state !== ConnectionState.Connected) return;

    const local = members.find((member) => member.isLocal);
    if (!local) return;

    if (reconciling.current) {
        dirty.current = true;
        return;
    }

    const setTarget = async (value: string) => {
        reconciling.current = true;
        try {
            await room.localParticipant.setAttributes({
                [WHISPER_ATTRIBUTE]: value,
            });
            if (!value) confirmedWith.current = null;
        } catch (cause) {
            // A dropped signal connection rejects this; leave the attribute alone and
            // let the next room event retry.
            console.error(
                "[whisper] could not update whisper attribute",
                cause,
            );
        } finally {
            reconciling.current = false;
        }

        if (dirty.current) {
            dirty.current = false;
            await reconcileWhisper({ ...ctx, members: ctx.rebuild() });
        }
    };

    const byIdentity = new Map(
        members.map((member) => [member.identity, member]),
    );

    // Forget declines once that person has stopped pointing at us, so a fresh
    // invite from them is accepted normally.
    for (const identity of declined.current) {
        if (byIdentity.get(identity)?.whisperTarget !== local.identity) {
            declined.current.delete(identity);
        }
    }

    if (local.whisperTarget) {
        const target = byIdentity.get(local.whisperTarget);
        const theirTarget = target?.whisperTarget ?? null;
        const theyLeft = !target;
        const theyPairedElsewhere =
            theirTarget !== null && theirTarget !== local.identity;
        // They were our partner and have now stood down: mirror it, otherwise
        // whichever side clicked stop would just get re-accepted.
        const theyWalkedAway =
            confirmedWith.current === local.whisperTarget &&
            theirTarget !== local.identity;

        if (theyLeft || theyPairedElsewhere || theyWalkedAway)
            await setTarget("");
        return;
    }

    const suitor = members.find(
        (member) =>
            !member.isLocal &&
            member.whisperTarget === local.identity &&
            !declined.current.has(member.identity),
    );
    if (suitor) await setTarget(suitor.identity);
}

export function useWhisperRoom() {
    const roomRef = useRef<Room | null>(null);
    const audioContainerRef = useRef<HTMLDivElement | null>(null);
    /**
     * Tracks handed to publishTrack as raw MediaStreamTracks count as "user
     * provided". A clean disconnect stops them, but the failure paths do not, so
     * we keep our own handles and stop them explicitly.
     */
    const mediaTracksRef = useRef<MediaStreamTrack[]>([]);
    const micEnabledRef = useRef(true);
    const creatorRef = useRef<string | null>(null);
    /** Guards against a second connect starting during the token fetch or mic prompt. */
    const connectingRef = useRef(false);
    /** Set on unmount so an in-flight connect can abandon itself. */
    const cancelledRef = useRef(false);

    /** Serialises audio policy passes; a newer pass supersedes an in-flight one. */
    const policyChainRef = useRef<Promise<void>>(Promise.resolve());
    const policySeqRef = useRef(0);

    const reconcilingRef = useRef(false);
    /** Set when a reconcile was skipped mid-flight so it can be retried. */
    const reconcileDirtyRef = useRef(false);
    /** The partner we last confirmed with, so we can detect them walking away. */
    const confirmedWithRef = useRef<string | null>(null);
    /**
     * People who just ended a whisper with us. Without this, clearing our own
     * attribute immediately re-accepts their still-stale pointer and the whisper
     * can never be ended.
     */
    const declinedRef = useRef<Set<string>>(new Set());

    const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY_SNAPSHOT);
    const [error, setError] = useState<WhisperError | null>(null);
    const [volumes, setVolumesState] = useState<Volumes>(readVolumes);
    const volumesRef = useRef<Volumes>(volumes);

    const buildMembers = useCallback((room: Room): RoomMember[] => {
        const all: Participant[] = [
            room.localParticipant,
            ...room.remoteParticipants.values(),
        ];
        const targets = new Map(
            all.map((p) => [p.identity, attributeTarget(p)]),
        );

        return all.map((participant) => {
            const target = targets.get(participant.identity) ?? null;
            const mutual =
                target && targets.get(target) === participant.identity
                    ? target
                    : null;

            return {
                identity: participant.identity,
                name: participant.name || participant.identity,
                isLocal: participant === room.localParticipant,
                isCreator: creatorRef.current === participant.identity,
                isSpeaking: participant.isSpeaking,
                // Read the explicit attribute, not the general track: whispering mutes
                // that track for reasons unrelated to the mic button.
                isMuted: participant.attributes?.[MIC_MUTED_ATTRIBUTE] === "1",
                whisperTarget: target,
                whisperPartner: mutual,
            };
        });
    }, []);

    /**
     * Re-applies every audio decision that depends on who is whispering with whom:
     * who may subscribe to our tracks, how loud each remote track plays, and which
     * of our own tracks are live.
     */
    const runAudioPolicy = useCallback(
        async (room: Room, partnerIdentity: string | null) => {
            const { general, whisper } = publicationsOf(room);

            // Permissions and volumes first - they are what privacy depends on, and
            // gating them behind a mute round trip opens a window where the whisper
            // track is subscribable or a remote track plays un-ducked.
            syncPermissions(
                room,
                partnerIdentity,
                general?.trackSid,
                whisper?.trackSid,
            );
            applyVolumes(room, partnerIdentity, volumesRef.current);

            const micOn = micEnabledRef.current;
            const setSending = async (
                track: Track | undefined,
                shouldSend: boolean,
            ) => {
                if (!(track instanceof LocalAudioTrack)) return;
                if (shouldSend && track.isMuted) await track.unmute();
                else if (!shouldSend && !track.isMuted) await track.mute();
            };

            // While whispering, the general track goes silent so the room cannot hear us.
            await setSending(general?.track, micOn && !partnerIdentity);
            await setSending(whisper?.track, micOn && Boolean(partnerIdentity));
        },
        [],
    );

    /**
     * Policy passes overlap because muting a track emits an event that schedules
     * another pass. Running them concurrently lets an older pass apply a stale
     * decision, so they are queued and superseded instead.
     */
    const scheduleAudioPolicy = useCallback(
        (room: Room, partnerIdentity: string | null) => {
            const seq = ++policySeqRef.current;
            policyChainRef.current = policyChainRef.current
                .then(async () => {
                    if (seq !== policySeqRef.current) return;
                    if (roomRef.current !== room) return;
                    await runAudioPolicy(room, partnerIdentity);
                })
                .catch((cause) => {
                    console.error("[whisper] audio policy failed", cause);
                });
        },
        [runAudioPolicy],
    );

    const runReconcile = useCallback(
        (room: Room, members: RoomMember[]) =>
            reconcileWhisper({
                room,
                members,
                rebuild: () => buildMembers(room),
                reconciling: reconcilingRef,
                dirty: reconcileDirtyRef,
                confirmedWith: confirmedWithRef,
                declined: declinedRef,
            }),
        [buildMembers],
    );

    const refresh = useCallback(
        (room: Room) => {
            const members = buildMembers(room);
            const local = members.find((member) => member.isLocal) ?? null;
            const partner = local?.whisperPartner
                ? (members.find(
                      (member) => member.identity === local.whisperPartner,
                  ) ?? null)
                : null;

            if (partner) confirmedWithRef.current = partner.identity;

            setSnapshot({
                status:
                    room.state === ConnectionState.Reconnecting ||
                    room.state === ConnectionState.SignalReconnecting
                        ? "reconnecting"
                        : room.state === ConnectionState.Connected
                          ? "connected"
                          : "connecting",
                members,
                localIdentity: room.localParticipant.identity,
                partner,
                pendingTarget:
                    local?.whisperTarget && !partner
                        ? local.whisperTarget
                        : null,
                micEnabled: micEnabledRef.current,
                audioBlocked: !room.canPlaybackAudio,
            });

            void runReconcile(room, members);
            scheduleAudioPolicy(room, partner?.identity ?? null);
        },
        [buildMembers, runReconcile, scheduleAudioPolicy],
    );

    const attachAudio = useCallback((track: Track) => {
        if (track.kind !== Track.Kind.Audio) return;
        audioContainerRef.current?.appendChild(track.attach());
    }, []);

    const teardown = useCallback((room: Room | null) => {
        if (roomRef.current === room) roomRef.current = null;
        micEnabledRef.current = true;
        confirmedWithRef.current = null;
        declinedRef.current.clear();
        releaseMicrophone(mediaTracksRef);
    }, []);

    const connect = useCallback(
        async ({ code, displayName, identity }: ConnectOptions) => {
            if (connectingRef.current || roomRef.current) return;
            connectingRef.current = true;
            cancelledRef.current = false;
            setError(null);
            setSnapshot((prev) => ({ ...prev, status: "connecting" }));

            const fail = (reason: WhisperError) => {
                setError(reason);
                setSnapshot((prev) => ({ ...prev, status: "error" }));
                connectingRef.current = false;
            };

            let payload: { token: string; url: string; creator: string };
            try {
                const response = await fetch("/api/token", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ code, name: displayName, identity }),
                });
                if (!response.ok)
                    throw new Error(`token request failed: ${response.status}`);
                payload = await response.json();
            } catch (cause) {
                console.error("[whisper] token request failed", cause);
                fail("connect_failed");
                return;
            }

            if (cancelledRef.current) {
                connectingRef.current = false;
                return;
            }
            creatorRef.current = payload.creator;

            // Capture once and clone, so both tracks ride the same mic and the same
            // echo-cancellation context.
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                });
                const base = stream.getAudioTracks()[0];
                mediaTracksRef.current = [base, base.clone()];
            } catch (cause) {
                console.error("[whisper] microphone unavailable", cause);
                fail("mic_denied");
                return;
            }

            const [generalMedia, whisperMedia] = mediaTracksRef.current;
            const room = new Room({ adaptiveStream: false, dynacast: false });
            roomRef.current = room;

            const onChange = () => refresh(room);
            room.on(RoomEvent.ParticipantConnected, onChange)
                .on(RoomEvent.ParticipantDisconnected, onChange)
                .on(RoomEvent.ParticipantAttributesChanged, onChange)
                .on(RoomEvent.TrackMuted, onChange)
                .on(RoomEvent.TrackUnmuted, onChange)
                .on(RoomEvent.ConnectionStateChanged, onChange)
                .on(RoomEvent.RoomMetadataChanged, onChange)
                .on(RoomEvent.AudioPlaybackStatusChanged, onChange)
                // Republished after a reconnect with fresh SIDs; permissions must follow.
                .on(RoomEvent.LocalTrackPublished, onChange)
                .on(RoomEvent.ActiveSpeakersChanged, () => {
                    // Speaking state only affects the snapshot; re-running the whole audio
                    // policy on every speaker change would spam the SFU.
                    setSnapshot((prev) => ({
                        ...prev,
                        members: buildMembers(room),
                    }));
                })
                .on(RoomEvent.TrackSubscribed, (track) => {
                    attachAudio(track);
                    onChange();
                })
                .on(RoomEvent.TrackUnsubscribed, (track) => {
                    track.detach().forEach((element) => element.remove());
                    // When the SFU revokes a subscription the SDK detaches the element
                    // itself, so detach() above returns nothing and the now-empty node
                    // would accumulate in the container on every whisper.
                    audioContainerRef.current
                        ?.querySelectorAll("audio")
                        .forEach((element) => {
                            if (!element.srcObject) element.remove();
                        });
                    onChange();
                })
                .on(RoomEvent.Disconnected, () => {
                    teardown(room);
                    setSnapshot(EMPTY_SNAPSHOT);
                });

            try {
                await room.connect(payload.url, payload.token);

                // Subscription permissions are permissive by default, so lock down
                // before anything is published rather than after.
                room.localParticipant.setTrackSubscriptionPermissions(
                    false,
                    [],
                );

                await room.localParticipant.publishTrack(generalMedia, {
                    name: GENERAL_TRACK_NAME,
                    source: Track.Source.Microphone,
                    dtx: true,
                    red: true,
                });
                // A distinct source keeps setMicrophoneEnabled/isMicrophoneEnabled bound
                // to the general track only - with two Microphone-source tracks the SDK
                // would pick an arbitrary one.
                await room.localParticipant.publishTrack(whisperMedia, {
                    name: WHISPER_TRACK_NAME,
                    source: Track.Source.Unknown,
                    stream: WHISPER_TRACK_NAME,
                });

                connectingRef.current = false;

                if (cancelledRef.current) {
                    await room.disconnect();
                    teardown(room);
                    return;
                }

                await runAudioPolicy(room, null);
                refresh(room);
            } catch (cause) {
                console.error("[whisper] connect failed", cause);
                await room.disconnect();
                teardown(room);
                fail("connect_failed");
            }
        },
        [attachAudio, buildMembers, refresh, runAudioPolicy, teardown],
    );

    const disconnect = useCallback(async () => {
        const room = roomRef.current;
        roomRef.current = null;
        if (room) await room.disconnect();
        teardown(room);
        setSnapshot(EMPTY_SNAPSHOT);
    }, [teardown]);

    const toggleWhisper = useCallback(
        async (identity: string) => {
            const room = roomRef.current;
            if (!room) return;
            const current = attributeTarget(room.localParticipant);
            const stopping = current === identity;

            if (stopping) {
                // Remember the decline before clearing, so our own refresh does not
                // instantly re-accept their still-pending pointer.
                declinedRef.current.add(identity);
                confirmedWithRef.current = null;
            } else {
                declinedRef.current.delete(identity);
            }

            try {
                await room.localParticipant.setAttributes({
                    [WHISPER_ATTRIBUTE]: stopping ? "" : identity,
                });
            } catch (cause) {
                console.error(
                    "[whisper] could not update whisper attribute",
                    cause,
                );
            }
            refresh(room);
        },
        [refresh],
    );

    const toggleMic = useCallback(async () => {
        const room = roomRef.current;
        if (!room) return;
        micEnabledRef.current = !micEnabledRef.current;

        try {
            await room.localParticipant.setAttributes({
                [MIC_MUTED_ATTRIBUTE]: micEnabledRef.current ? "" : "1",
            });
        } catch (cause) {
            console.error("[whisper] could not publish mute state", cause);
        }
        refresh(room);
    }, [refresh]);

    const setVolume = useCallback((key: VolumeKey, value: number) => {
        const next = { ...volumesRef.current, [key]: value };
        volumesRef.current = next;
        setVolumesState(next);
        writeVolume(key, value);

        // Apply straight away so dragging the slider is audible, without waiting on
        // the queued policy pass.
        const room = roomRef.current;
        if (room) {
            const target =
                room.localParticipant.attributes?.[WHISPER_ATTRIBUTE] || null;
            const partner =
                target &&
                room.remoteParticipants.get(target)?.attributes?.[
                    WHISPER_ATTRIBUTE
                ] === room.localParticipant.identity
                    ? target
                    : null;
            applyVolumes(room, partner, next);
        }
    }, []);

    const enableAudio = useCallback(async () => {
        const room = roomRef.current;
        if (!room) return;
        await room.startAudio();
        refresh(room);
    }, [refresh]);

    useEffect(() => {
        cancelledRef.current = false;
        return () => {
            cancelledRef.current = true;
            const room = roomRef.current;
            roomRef.current = null;
            void room?.disconnect();
            teardown(room);
        };
    }, [teardown]);

    const state: WhisperRoomState = useMemo(
        () => ({ ...snapshot, error }),
        [snapshot, error],
    );

    return {
        state,
        volumes,
        audioContainerRef,
        connect,
        disconnect,
        toggleWhisper,
        toggleMic,
        setVolume,
        enableAudio,
    };
}
