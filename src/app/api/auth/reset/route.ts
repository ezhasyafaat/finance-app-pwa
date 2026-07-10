import { db } from "@/db";
import { users } from "@/db/schema";
import { consumeResetToken, hashPassword, revokeAllSessions, MAX_PASSWORD } from "@/lib/auth";
import { ok, bad, tooMany, handle, readJson } from "@/lib/http";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { eq } from "drizzle-orm";
import { z } from "zod";

const Body = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(6).max(MAX_PASSWORD),
});

export async function POST(req: Request) {
  return handle(async () => {
    const ip = clientIp(req);
    const limited = rateLimit(`reset:ip:${ip}`, { limit: 10, windowMs: 15 * 60_000 });
    if (!limited.ok) return tooMany(limited.retryAfter);

    const parsed = Body.safeParse(await readJson(req));
    if (!parsed.success) return bad("Token atau password tidak valid (min 6 karakter).");
    const { token, password } = parsed.data;

    const userId = await consumeResetToken(token);
    if (!userId) return bad("Link reset tidak valid atau kedaluwarsa.", 400);

    await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, userId));
    // Kill any sessions that may belong to an attacker who knew the old password.
    await revokeAllSessions(userId);
    return ok({ ok: true });
  });
}
