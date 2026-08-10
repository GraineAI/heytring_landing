import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../../../lib/db";
import { isAuthed } from "../../../lib/adminAuth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * /api/admin/research — writes what you learned from talking to one person.
 *
 * Separate from /api/admin/mark (which flips `contacted`) because these are
 * different acts: marking someone contacted is bookkeeping, recording what
 * they said is the actual work. Conflating them would mean every note edit
 * silently changed their invite status.
 *
 * OUTCOMES are a closed vocabulary on purpose. "How many did we actually
 * reach this week" is the question worth asking, and free text cannot be
 * counted. Everything else belongs in notes.
 */
const OUTCOMES = ["reached", "no_answer", "wrong_number", "refused", "churned", "activated"];

export async function POST(req) {
  if (!isAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const { id, notes, outcome, tags } = await req.json();
    if (!Number.isInteger(id)) {
      return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    }
    if (outcome != null && outcome !== "" && !OUTCOMES.includes(outcome)) {
      return NextResponse.json({ ok: false, error: "unknown outcome" }, { status: 400 });
    }

    await ensureSchema();
    const q = sql();

    // Tags are normalised here rather than trusted from the client: lowercased,
    // trimmed, de-duped and capped. Otherwise "Spam", "spam " and "spam" become
    // three different tags and the counts stop meaning anything.
    const clean = Array.isArray(tags)
      ? [...new Set(tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))].slice(0, 12)
      : null;

    // called_at is stamped the first time an outcome is set and never moved,
    // so "when did we first reach this person" survives later edits.
    const [row] = await q`
      UPDATE waitlist SET
        notes     = ${notes ?? null},
        outcome   = ${outcome || null},
        tags      = ${clean},
        called_at = COALESCE(called_at, ${outcome ? new Date().toISOString() : null})
      WHERE id = ${id}
      RETURNING id, notes, outcome, tags, called_at`;

    if (!row) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true, row });
  } catch (e) {
    console.error("admin research failed:", e?.message);
    return NextResponse.json({ ok: false, error: "db" }, { status: 500 });
  }
}
