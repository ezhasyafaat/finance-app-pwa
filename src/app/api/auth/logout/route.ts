import { destroySession } from "@/lib/auth";
import { ok, handle } from "@/lib/http";

export async function POST() {
  return handle(async () => {
    await destroySession();
    return ok({ ok: true });
  });
}
