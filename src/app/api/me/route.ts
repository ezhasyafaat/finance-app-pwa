import { db } from "@/db";
import { users } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { aiConfigured } from "@/lib/ai/client";
import { ok, handle } from "@/lib/http";
import { eq } from "drizzle-orm";

export async function GET() {
  return handle(async () => {
    const userId = await getUserId();
    // Only expose whether AI is available — never the provider/model names.
    if (!userId) return ok({ user: null, ai: { configured: aiConfigured() } });
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    return ok({
      user: user ? { id: user.id, email: user.email, name: user.name } : null,
      ai: { configured: aiConfigured() },
    });
  });
}
