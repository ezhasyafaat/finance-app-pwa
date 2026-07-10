import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/db";
import { passwordResetTokens, sessions } from "@/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";

/**
 * Auth = PBKDF2 password hashing (Web Crypto, portable across Bun/Node/Edge)
 * + a signed JWT session stored in an httpOnly cookie.
 *
 * This is intentionally lightweight — the app is single/low-user and self-hosted.
 * Swap in a heavier stack (Sanctum-style server sessions) later if needed.
 */

const COOKIE = "pf_session";
const ITER = 120_000;
const SESSION_DAYS = 30;
// Cap password length: PBKDF2 over an unbounded input is a CPU-DoS vector.
export const MAX_PASSWORD = 200;
const RESET_TTL_MS = 30 * 60 * 1000; // reset link valid 30 minutes

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET is missing or too short (set it in .env)");
  }
  return new TextEncoder().encode(s);
}

const b64 = (buf: ArrayBuffer) => Buffer.from(new Uint8Array(buf)).toString("base64");

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password) as BufferSource,
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return b64(bits);
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length > MAX_PASSWORD) throw new Error("Password too long");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, ITER);
  return `pbkdf2$${ITER}$${Buffer.from(salt).toString("base64")}$${hash}`;
}

const sha256Hex = async (s: string) =>
  Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))).toString("hex");

/**
 * Create a single-use password-reset token. Stores only the SHA-256 hash;
 * returns the raw token to be delivered to the user (email / logged link).
 */
export async function createResetToken(userId: string): Promise<string> {
  const raw = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
  const tokenHash = await sha256Hex(raw);
  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  });
  return raw;
}

/**
 * Validate a raw reset token: unexpired, unused. Marks it used and returns the
 * userId, or null if invalid. Single-use (marking used is best-effort atomic).
 */
export async function consumeResetToken(raw: string): Promise<string | null> {
  if (!raw || raw.length < 20) return null;
  const tokenHash = await sha256Hex(raw);
  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    );
  if (!row) return null;
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, row.id));
  return row.userId;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterStr, saltB64, hash] = stored.split("$");
  if (scheme !== "pbkdf2") return false;
  const salt = new Uint8Array(Buffer.from(saltB64, "base64"));
  const check = await pbkdf2(password, salt, Number(iterStr));
  // constant-time-ish compare
  if (check.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < check.length; i++) diff |= check.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}

/**
 * Create a server-tracked session. The JWT carries a session id (`sid`) that is
 * validated against the `sessions` table on every request, so logout / password
 * reset can revoke a token even though the JWT itself is stateless. This closes
 * the "stolen cookie still works after logout" account-takeover hole.
 */
export async function createSession(userId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  let userAgent: string | null = null;
  try {
    userAgent = (await headers()).get("user-agent")?.slice(0, 255) ?? null;
  } catch {
    /* headers() unavailable in some contexts — non-fatal */
  }
  const [sess] = await db.insert(sessions).values({ userId, expiresAt, userAgent }).returning();

  const token = await new SignJWT({ sub: userId, sid: sess.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  });
}

/** Revoke the current session (logout) and clear the cookie. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret());
      const sid = payload.sid as string | undefined;
      if (sid) await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, sid));
    } catch {
      /* invalid token — just clear the cookie */
    }
  }
  store.delete(COOKIE);
}

/** Revoke every active session for a user (e.g. after a password reset). */
export async function revokeAllSessions(userId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}

/** Returns the logged-in userId, or null. Verifies the session is still live. */
export async function getUserId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const sub = payload.sub as string | undefined;
    const sid = payload.sid as string | undefined;
    if (!sub || !sid) return null;

    const [sess] = await db
      .select({ userId: sessions.userId })
      .from(sessions)
      .where(
        and(
          eq(sessions.id, sid),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
        ),
      );
    if (!sess || sess.userId !== sub) return null;
    return sub;
  } catch {
    return null;
  }
}

/** For API routes: returns userId or throws a 401-style error. */
export async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new UnauthorizedError();
  return id;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}
