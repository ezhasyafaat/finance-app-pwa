import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword, createSession, MAX_PASSWORD } from "@/lib/auth";
import { ok, bad, tooMany, handle, readJson } from "@/lib/http";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { eq } from "drizzle-orm";
import { z } from "zod";

const Body = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(MAX_PASSWORD),
});

// A valid-format hash to verify against when the email doesn't exist, so the
// response takes the same time whether or not the account is real (no timing
// oracle for user enumeration).
const DUMMY_HASH =
  "pbkdf2$120000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

export async function POST(req: Request) {
  return handle(async () => {
    const ip = clientIp(req);
    const perIp = rateLimit(`login:ip:${ip}`, { limit: 20, windowMs: 5 * 60_000 });
    if (!perIp.ok) return tooMany(perIp.retryAfter);

    const parsed = Body.safeParse(await readJson(req));
    if (!parsed.success) return bad("Invalid credentials.");
    const { email, password } = parsed.data;

    // Tighter per-identity throttle to blunt brute force on a single account.
    const perId = rateLimit(`login:id:${ip}:${email}`, { limit: 6, windowMs: 15 * 60_000 });
    if (!perId.ok) return tooMany(perId.retryAfter);

    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    const valid = user
      ? await verifyPassword(password, user.passwordHash)
      : (await verifyPassword(password, DUMMY_HASH), false);

    if (!user || !valid) return bad("Wrong email or password.", 401);

    await createSession(user.id);
    return ok({ id: user.id, email: user.email, name: user.name });
  });
}
