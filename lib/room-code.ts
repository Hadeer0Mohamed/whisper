// Ambiguous glyphs (l/1, o/0) are excluded so codes survive being read aloud.
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const GROUPS = [3, 4, 3];

export const ROOM_CODE_PATTERN = /^[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}$/;

export function generateRoomCode(): string {
    const total = GROUPS.reduce((a, b) => a + b, 0);
    const bytes = new Uint32Array(total);
    crypto.getRandomValues(bytes);

    let cursor = 0;
    return GROUPS.map((size) =>
        Array.from(
            { length: size },
            () => ALPHABET[bytes[cursor++] % ALPHABET.length],
        ).join(""),
    ).join("-");
}

/**
 * Accepts what a user is likely to paste - spaces, uppercase, missing dashes -
 * and returns the canonical `abc-defg-hij` form, or null if it cannot be one.
 */
export function normalizeRoomCode(input: string): string | null {
    const bare = input.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (bare.length !== GROUPS.reduce((a, b) => a + b, 0)) return null;

    let cursor = 0;
    const code = GROUPS.map((size) =>
        bare.slice(cursor, (cursor += size)),
    ).join("-");
    return ROOM_CODE_PATTERN.test(code) ? code : null;
}
