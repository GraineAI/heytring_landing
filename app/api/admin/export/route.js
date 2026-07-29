import { sql, ensureSchema } from "../../../lib/db";
import { isAuthed } from "../../../lib/adminAuth";

export const dynamic = "force-dynamic";

function toCsv(rows, columns) {
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    if (v instanceof Date) return v.toISOString();
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(","), ...rows.map((r) => columns.map((c) => esc(r[c])).join(","))].join("\n");
}

export async function GET(req) {
  if (!isAuthed(req)) return new Response("Unauthorized", { status: 401 });
  const table = new URL(req.url).searchParams.get("table") === "clicks" ? "clicks" : "waitlist";
  try {
    await ensureSchema();
    const q = sql();
    let rows, columns;
    if (table === "clicks") {
      rows = await q`SELECT id, kind, placement, referrer, user_agent, country, created_at FROM clicks ORDER BY created_at DESC`;
      columns = ["id", "kind", "placement", "referrer", "user_agent", "country", "created_at"];
    } else {
      rows = await q`SELECT id, name, email, device, placement, source, utm, landing, user_agent, country, created_at FROM waitlist ORDER BY created_at DESC`;
      columns = ["id", "name", "email", "device", "placement", "source", "utm", "landing", "user_agent", "country", "created_at"];
    }
    const csv = toCsv(rows, columns);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tring-${table}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e) {
    console.error("export failed:", e?.message);
    return new Response("Export failed", { status: 500 });
  }
}
