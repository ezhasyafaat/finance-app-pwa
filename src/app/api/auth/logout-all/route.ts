import { requireUserId, revokeAllSessions, destroySession } from "@/lib/auth";
import { ok, handle } from "@/lib/http";

/** Revoke every session for the current user (all devices) and log out here. */
export async function POST() {
  return handle(async () => {
    const userId = await requireUserId();
    await revokeAllSessions(userId);
    await destroySession();
    return ok({ ok: true });
  });
}
