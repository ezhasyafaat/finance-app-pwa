import { db } from "@/db";
import { users, categories } from "@/db/schema";
import { hashPassword, createSession, MAX_PASSWORD } from "@/lib/auth";
import { DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES } from "@/lib/defaults";
import { ok, bad, tooMany, handle, readJson } from "@/lib/http";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { eq } from "drizzle-orm";
import { z } from "zod";

const Body = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(MAX_PASSWORD),
  name: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  return handle(async () => {
    // Allow self-hosters to close registration after creating their account.
    if (process.env.DISABLE_REGISTRATION === "1") return bad("Registration is disabled.", 403);

    const ip = clientIp(req);
    const limited = rateLimit(`register:ip:${ip}`, { limit: 5, windowMs: 60 * 60_000 });
    if (!limited.ok) return tooMany(limited.retryAfter);

    const parsed = Body.safeParse(await readJson(req));
    if (!parsed.success) return bad("Invalid email or password (min 6 chars).");
    const { email, password, name } = parsed.data;

    const exists = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (exists) return bad("Email already registered.", 409);

    const [user] = await db
      .insert(users)
      .values({ email, passwordHash: await hashPassword(password), name })
      .returning();

    await db.insert(categories).values([
      ...DEFAULT_INCOME_CATEGORIES.map((c) => ({
        userId: user.id, name: c.name, type: "income" as const, icon: c.icon, color: c.color, isDefault: true,
      })),
      ...DEFAULT_EXPENSE_CATEGORIES.map((c) => ({
        userId: user.id, name: c.name, type: "expense" as const, icon: c.icon, color: c.color, isDefault: true,
      })),
    ]);

    await createSession(user.id);
    return ok({ id: user.id, email: user.email, name: user.name }, 201);
  });
}
