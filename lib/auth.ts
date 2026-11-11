// Single-user login: the session cookie holds HMAC(ADMIN_PASSWORD), so changing the password logs everyone out.
export const SESSION = "echord_session";

export async function sessionToken() {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error("ADMIN_PASSWORD belum di-set (lihat .env.example)");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("echord-session-v1"));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isValidSession(value: string | undefined) {
  return !!value && !!process.env.ADMIN_PASSWORD && value === (await sessionToken());
}
