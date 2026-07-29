import { neon } from "@neondatabase/serverless";

let sqlInstance = null;
let schemaReady = null;

export function sql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  if (!sqlInstance) sqlInstance = neon(process.env.DATABASE_URL);
  return sqlInstance;
}

/** Creates the tables on first use — no migration tooling needed. */
export function ensureSchema() {
  if (!schemaReady) {
    const q = sql();
    schemaReady = (async () => {
      await q`
        CREATE TABLE IF NOT EXISTS waitlist (
          id serial PRIMARY KEY,
          name text NOT NULL,
          email text NOT NULL,
          device text NOT NULL,
          placement text,
          source text,
          utm jsonb,
          user_agent text,
          country text,
          created_at timestamptz NOT NULL DEFAULT now()
        )`;
      await q`CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_uq ON waitlist ((lower(email)))`;
      await q`
        CREATE TABLE IF NOT EXISTS clicks (
          id serial PRIMARY KEY,
          kind text NOT NULL,
          placement text,
          referrer text,
          user_agent text,
          country text,
          created_at timestamptz NOT NULL DEFAULT now()
        )`;
    })().catch((e) => { schemaReady = null; throw e; });
  }
  return schemaReady;
}

export function requestMeta(req) {
  return {
    ua: (req.headers.get("user-agent") || "").slice(0, 400),
    country: req.headers.get("x-vercel-ip-country") || null,
    referrer: (req.headers.get("referer") || "").slice(0, 400) || null,
  };
}
