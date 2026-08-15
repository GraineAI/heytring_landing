import { neon } from "@neondatabase/serverless";

let sqlInstance = null;
let schemaReady = null;

export function sql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  if (!sqlInstance) {
    // cache: "no-store" is CRITICAL on Vercel — Next.js's Data Cache
    // otherwise caches the driver's fetch() calls, freezing query
    // results (reads went stale in production until this was set).
    sqlInstance = neon(process.env.DATABASE_URL, { fetchOptions: { cache: "no-store" } });
  }
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
      await q`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS landing text`;
      await q`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS contacted boolean NOT NULL DEFAULT false`;
      // ── user-research columns ────────────────────────────────────────────
      // "Talk to your users" only compounds if the answers are written down
      // somewhere the whole team can read. Notes live next to the person, not
      // in someone's inbox.
      //
      // `outcome` is deliberately a small vocabulary rather than free text:
      // reached / no_answer / wrong_number / refused / churned / activated.
      // Counting "how many did we actually reach" is the point, and free text
      // cannot be counted.
      await q`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS notes text`;
      await q`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS outcome text`;
      await q`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS tags text[]`;
      await q`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS called_at timestamptz`;
      // one row per (email, device): the same email may join for Android AND iPhone
      await q`DROP INDEX IF EXISTS waitlist_email_uq`;
      await q`CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_device_uq ON waitlist ((lower(email)), device)`;
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
      // ── unique-visitor columns ───────────────────────────────────────────
      // Both tables counted EVENTS and called them people. "Play clicks: 412"
      // was 412 rows, which could be 412 visitors or one person on a bad
      // connection tapping twelve times, and nothing stored could tell the
      // difference. The same anonymous first-party id (middleware.js) now
      // rides on every write, so COUNT(DISTINCT visitor_id) is answerable.
      //
      // NULLABLE on purpose: a cookie-blocking browser or a bot has no id, and
      // minting one per row would manufacture a unique visitor per event —
      // the exact error this is meant to remove. A null row is one we know we
      // cannot attribute, and it is excluded from unique counts rather than
      // silently inflating them.
      await q`ALTER TABLE clicks ADD COLUMN IF NOT EXISTS visitor_id text`;
      await q`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS visitor_id text`;
      await q`CREATE INDEX IF NOT EXISTS clicks_visitor_idx ON clicks (visitor_id)`;
      await q`CREATE INDEX IF NOT EXISTS clicks_created_idx ON clicks (created_at DESC)`;

      // ── visits: the top of the funnel, in our own database ───────────────
      // Unique visitors existed only inside GA4 and Vercel, so the one number
      // that makes every other number mean something — what share of people
      // who saw the page joined — could not be computed at all from data we
      // own. Two dashboards with different definitions of a "user" and no way
      // to join them is not a funnel.
      //
      // ONE ROW PER VISITOR PER PATH PER DAY, enforced by the unique index
      // rather than by the caller: a beacon that fires on every render, a
      // double-mounted effect in React strict mode, or a user reloading twenty
      // times would otherwise each look like twenty visits. The database is
      // the only place that constraint cannot be forgotten.
      await q`
        CREATE TABLE IF NOT EXISTS visits (
          id serial PRIMARY KEY,
          visitor_id text NOT NULL,
          day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
          path text NOT NULL,
          referrer text,
          utm jsonb,
          user_agent text,
          country text,
          created_at timestamptz NOT NULL DEFAULT now()
        )`;
      await q`CREATE UNIQUE INDEX IF NOT EXISTS visits_visitor_path_day_uq ON visits (visitor_id, path, day)`;
      await q`CREATE INDEX IF NOT EXISTS visits_created_idx ON visits (created_at DESC)`;

      // ── AI strategy cache ────────────────────────────────────────────────
      // The insights panel calls a model. Its cache was a module-level Map in a
      // serverless function, which a cold start empties — so the dashboard paid
      // for a fresh generation far more often than the 10-minute TTL implies,
      // and every open tab bought one every ten minutes whether or not anyone
      // was reading it. A row survives cold starts and every instance shares it.
      await q`
        CREATE TABLE IF NOT EXISTS insights_cache (
          key text PRIMARY KEY,
          data jsonb NOT NULL,
          model text,
          created_at timestamptz NOT NULL DEFAULT now()
        )`;
      await q`CREATE INDEX IF NOT EXISTS insights_cache_created_idx ON insights_cache (created_at DESC)`;
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
