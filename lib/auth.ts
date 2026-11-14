// Session cookie: "<userId>.<expiresAt>.<hmac>", signed with SESSION_SECRET (or ADMIN_PASSWORD if not set).
// Web Crypto only, so proxy.ts can check it without a database round trip; actions and APIs also check the
// user still exists (lib/users.ts). Changing the secret logs everyone out.
export const SESSION = "echord_session";
export const SESSION_DAYS = 30;

const secret = () => {
  const s = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!s) throw new Error("SESSION_SECRET / ADMIN_PASSWORD belum di-set (lihat .env.example)");
  return s;
};

async function sign(payload: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("echord-session-v2:" + payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sessionToken(userId: number, now = Date.now()) {
  const payload = `${userId}.${now + SESSION_DAYS * 864e5}`;
  return `${payload}.${await sign(payload)}`;
}

/** The user id in a valid, unexpired session cookie; null otherwise. */
export async function sessionUser(value: string | undefined, now = Date.now()): Promise<number | null> {
  const m = value?.match(/^(\d+)\.(\d+)\.([0-9a-f]{64})$/);
  if (!m || Number(m[2]) < now) return null;
  const expected = await sign(`${m[1]}.${m[2]}`);
  // constant-time compare
  let diff = 0;
  for (let i = 0; i < 64; i++) diff |= expected.charCodeAt(i) ^ m[3].charCodeAt(i);
  return diff === 0 ? Number(m[1]) : null;
}

export const isValidSession = async (value: string | undefined) => (await sessionUser(value)) !== null;
