import { db } from "@/db";
import { periods } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { ok, bad, handle, readJson } from "@/lib/http";
import { buildPeriodForDate, dateInPeriod } from "@/lib/period";
import { todayIso } from "@/lib/utils";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Body = z.object({
  // Either provide explicit dates, or a startDay to auto-generate this period.
  name: z.string().max(60).optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  startDay: z.number().int().min(1).max(31).optional(),
});

export async function GET() {
  return handle(async () => {
    const userId = await requireUserId();
    const rows = await db
      .select()
      .from(periods)
      .where(eq(periods.userId, userId))
      .orderBy(desc(periods.startDate));
    return ok(rows);
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const userId = await requireUserId();
    const parsed = Body.safeParse(await readJson(req));
    if (!parsed.success) return bad("Invalid period data.");
    const d = parsed.data;

    let name = d.name;
    let startDate = d.startDate;
    let endDate = d.endDate;

    if (!startDate || !endDate) {
      const draft = buildPeriodForDate(new Date(), d.startDay ?? 25);
      name = name ?? draft.name;
      startDate = draft.startDate;
      endDate = draft.endDate;
    }

    const isActive = dateInPeriod(todayIso(), startDate!, endDate!);
    if (isActive) {
      await db.update(periods).set({ isActive: false }).where(eq(periods.userId, userId));
    }

    const [row] = await db
      .insert(periods)
      .values({ userId, name: name ?? "Period", startDate: startDate!, endDate: endDate!, isActive })
      .returning();
    return ok(row, 201);
  });
}
