import { NextResponse } from "next/server";
import { UnauthorizedError } from "./auth";

export function ok<T>(data: T, init?: number) {
  return NextResponse.json(data, { status: init ?? 200 });
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** 429 with a Retry-After header. */
export function tooMany(retryAfter: number) {
  return NextResponse.json(
    { error: "Terlalu banyak percobaan. Coba lagi nanti." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

/** Thrown by request parsing when a body is malformed or too large. */
export class BadRequestError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "BadRequestError";
    this.status = status;
  }
}

/**
 * Read + JSON-parse a request body with a hard byte cap so a giant payload
 * can't exhaust memory. Throws BadRequestError (400/413) on violation.
 */
export async function readJson(req: Request, maxBytes = 256 * 1024): Promise<unknown> {
  const len = req.headers.get("content-length");
  if (len && Number(len) > maxBytes) throw new BadRequestError("Payload too large.", 413);

  const buf = await req.arrayBuffer();
  if (buf.byteLength > maxBytes) throw new BadRequestError("Payload too large.", 413);

  const text = new TextDecoder().decode(buf);
  try {
    return JSON.parse(text);
  } catch {
    throw new BadRequestError("Malformed JSON body.");
  }
}

/** Wrap an API handler with auth + error handling. Never leaks internals. */
export function handle(fn: () => Promise<Response>): Promise<Response> {
  return fn().catch((err: unknown) => {
    if (err instanceof UnauthorizedError) return bad("Unauthorized", 401);
    if (err instanceof BadRequestError) return bad(err.message, err.status);
    // Log the real error server-side; return a generic message to the client.
    console.error(err);
    return bad("Server error", 500);
  });
}
