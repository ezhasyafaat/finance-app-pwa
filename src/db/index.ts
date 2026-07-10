import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/finance";

// Reuse one client across hot reloads (dev) AND warm serverless invocations
// (prod) so we don't re-open a TCP+TLS connection on every request.
const globalForDb = globalThis as unknown as { client?: ReturnType<typeof postgres> };

const client =
  globalForDb.client ??
  postgres(connectionString, {
    // Serverless: one connection per instance; the pooler multiplexes.
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    // Required for PgBouncer transaction pooling (Neon "-pooler" endpoint):
    // prepared statements aren't supported there.
    prepare: false,
  });
globalForDb.client = client;

export const db = drizzle(client, { schema });
export { schema };
