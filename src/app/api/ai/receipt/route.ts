import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { ok, bad, handle, readJson } from "@/lib/http";
import { parseReceipt } from "@/lib/ai/parseReceipt";
import { aiConfigured } from "@/lib/ai/client";
import { resolveCategoryId } from "@/lib/resolve";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

// Max decoded image payload (~9 MB image → ~12 MB base64 string).
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

// Only accept an inline base64 image data URL. This blocks SSRF: without it a
// caller could pass "http://169.254.169.254/…" or "file://…" as image_url and
// have the AI gateway fetch an internal resource on our behalf.
const Body = z.object({
  image: z
    .string()
    .max(MAX_IMAGE_BYTES)
    .regex(
      /^data:image\/(png|jpe?g|webp|heic|heif|gif);base64,[A-Za-z0-9+/=\s]+$/i,
      "Image must be an inline base64 data URL.",
    ),
});

export async function POST(req: Request) {
  return handle(async () => {
    const userId = await requireUserId();
    if (!aiConfigured()) return bad("AI/OCR is not configured (set AI_API_KEY).", 503);

    const parsed = Body.safeParse(await readJson(req, MAX_IMAGE_BYTES + 4096));
    if (!parsed.success) return bad("Provide a valid receipt image.");

    const expenseCats = await db
      .select({ name: categories.name })
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.type, "expense")));

    const draft = await parseReceipt(parsed.data.image, {
      accountNames: [],
      expenseCategories: expenseCats.map((c) => c.name),
    });
    draft.categoryId = await resolveCategoryId(userId, draft.categoryName, "expense");
    return ok(draft);
  });
}

// Larger body limit for base64 images.
export const maxDuration = 60;
