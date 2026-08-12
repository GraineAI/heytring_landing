import { sql, ensureSchema } from "../../../lib/db";
import { isAuthed } from "../../../lib/adminAuth";
import { toCsv, csvResponse } from "../../../lib/csv";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";


/**
 * APP USERS live in Apollo's Mongo, not this Postgres, so their export cannot be a SQL query like
 * the other two. It proxies the same endpoint the admin table renders from, which means the file
 * the marketing team downloads and the rows they are looking at can never disagree.
 */
async function exportAppUsers(searchParams) {
  const key = process.env.APOLLO_ADMIN_API_KEY || process.env.ADMIN_API_KEY || "";
  if (!key) return new Response("APOLLO_ADMIN_API_KEY is not set on this deployment.", { status: 503 });
  const base = (process.env.APOLLO_API_BASE || "https://api.graine.ai").replace(/\/+$/, "");
  // 1000 is the endpoint's hard ceiling (Query(..., le=1000)); asking for more is a 422, not a
  // truncation, so the whole export would fail rather than come back short.
  // WALK THE PAGES. 1000 is the endpoint's hard per-page ceiling (Query(..., le=1000)) — asking
  // for more is a 422, not a truncation, so a naive single request would fail outright above that
  // and, worse, a slightly smaller one would succeed while silently dropping everyone past the
  // first page. An export that looks complete and is not is the failure worth engineering against,
  // so this pages until the server says there is no more and refuses to guess otherwise.
  const PAGE = 1000;
  // Sized ABOVE the endpoint's own universe cap (_UNIVERSE_CAP = 20k) so this loop is never the
  // binding limit — if the row count ever plateaus on a round number, it should be because the
  // server said so and set `truncated`, not because the client quietly stopped asking.
  const MAX_PAGES = 25;
  const all = [];
  let offset = 0, truncated = false, matched = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const qs = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
    for (const k of ["days", "stage", "platform"]) {
      const v = searchParams.get(k);
      if (v) qs.set(k, v);
    }
    const res = await fetch(`${base}/api/v1/calls/admin/users?${qs}`, {
      headers: { "X-Internal-API-Key": key }, cache: "no-store",
    });
    const j = await res.json().catch(() => ({}));
    if (!j?.ok) {
      if (page === 0) return new Response("Apollo returned no rows", { status: 502 });
      // Keep what we have rather than lose the whole export — but MARK IT. A bare `break` here
      // produced a file with no -PARTIAL in its name and no truncation header, which is precisely
      // the failure the rest of this function is written to prevent: a short list somebody works
      // through believing they have reached everybody.
      truncated = true;
      break;
    }
    const batch = j.users || j.rows || [];
    all.push(...batch);
    matched = j.matched ?? matched;
    truncated = truncated || !!j.truncated;
    // Stop on the server's own signal. Stopping on a short page alone would be wrong when the
    // filter genuinely returns fewer than a full page — which is the common case.
    if (!j.has_more || batch.length === 0) break;
    offset += batch.length;
    if (page === MAX_PAGES - 1) truncated = true;
  }

  // Flatten the contact sub-document — a nested object would serialise as raw JSON in one cell,
  // which is exactly the column someone needs to sort by before ringing people.
  const rows = all.map((u) => ({
    ...u,
    contact_count: u?.contact?.contact_count ?? 0,
    last_contact_at: u?.contact?.last_contact_at ?? "",
    last_outcome: u?.contact?.last_outcome ?? "",
    sentiment: u?.contact?.sentiment ?? "",
    last_note: u?.contact?.last_note ?? "",
  }));
  const columns = ["phone", "name", "stage", "platform", "first_seen", "code_requested_at",
                   "signed_in", "signed_in_at", "calls_answered", "active_days", "last_call_at",
                   "nudges_sent", "reachable_by_push", "contact_count", "last_contact_at",
                   "last_outcome", "sentiment", "last_note"];
  const headers = ["Phone", "Name", "Stage", "Platform", "First seen", "Asked for code",
                   "Signed in", "Signed in at", "Calls answered", "Active days", "Last call",
                   "Nudges sent", "Reachable by push", "Times contacted", "Last contacted",
                   "Last outcome", "Sentiment", "Last note"];
  // Say so IN THE FILENAME when the export is short. A truncated CSV that is named like a
  // complete one becomes a list somebody works through believing they have reached everybody.
  const name = `tring-app-users${truncated ? "-PARTIAL" : ""}-${new Date().toISOString().slice(0, 10)}.csv`;
  // `?safe=0` for machine consumers: phone is the join key, and the Excel apostrophe convention
  // would make every row fail to match on re-import.
  const safe = searchParams.get("safe") !== "0";
  const res = csvResponse(toCsv(rows, columns, headers, { safe }), name);
  res.headers.set("X-Rows-Exported", String(rows.length));
  if (matched != null) res.headers.set("X-Rows-Matched", String(matched));
  if (truncated) res.headers.set("X-Export-Truncated", "1");
  return res;
}

export async function GET(req) {
  if (!isAuthed(req)) return new Response("Unauthorized", { status: 401 });
  const { searchParams } = new URL(req.url);
  const requested = searchParams.get("table");
  if (requested === "app_users") {
    try {
      return await exportAppUsers(searchParams);
    } catch (e) {
      console.error("app-user export failed:", e?.message);
      return new Response("Export failed", { status: 500 });
    }
  }
  const table = requested === "clicks" ? "clicks" : "waitlist";
  try {
    await ensureSchema();
    const q = sql();
    let rows, columns;
    if (table === "clicks") {
      rows = await q`SELECT id, kind, placement, referrer, user_agent, country, created_at FROM clicks ORDER BY created_at DESC`;
      columns = ["id", "kind", "placement", "referrer", "user_agent", "country", "created_at"];
    } else {
      rows = await q`SELECT id, name, email, device, placement, source, utm, landing, user_agent, country, contacted, created_at FROM waitlist ORDER BY created_at DESC`;
      columns = ["id", "name", "email", "device", "placement", "source", "utm", "landing", "user_agent", "country", "contacted", "created_at"];
    }
    return csvResponse(toCsv(rows, columns),
                       `tring-${table}-${new Date().toISOString().slice(0, 10)}.csv`);
  } catch (e) {
    console.error("export failed:", e?.message);
    return new Response("Export failed", { status: 500 });
  }
}
