import { db } from "@/db";
import { users } from "@/db/schema";
import { createResetToken } from "@/lib/auth";
import { ok, tooMany, handle, readJson } from "@/lib/http";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { eq } from "drizzle-orm";
import { z } from "zod";

const Body = z.object({ email: z.string().email().max(255) });

export async function POST(req: Request) {
  return handle(async () => {
    const ip = clientIp(req);
    const limited = rateLimit(`forgot:ip:${ip}`, { limit: 5, windowMs: 15 * 60_000 });
    if (!limited.ok) return tooMany(limited.retryAfter);

    const parsed = Body.safeParse(await readJson(req));
    // Always respond the same way — never reveal whether the email is registered.
    if (!parsed.success) return ok({ ok: true });
    const { email } = parsed.data;

    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    let echoed: string | undefined;
    if (user) {
      const token = await createResetToken(user.id);
      const link = `/reset?token=${token}`;
      // No mail transport in this self-hosted build: log the link for the owner.
      console.log(`[password-reset] ${email} -> ${link}`);
      // Opt-in convenience: surface the token in the response for local/self-host use.
      if (process.env.RESET_ECHO === "1") echoed = token;
    }
    return ok({ ok: true, ...(echoed ? { resetToken: echoed } : {}) });
  });
}
