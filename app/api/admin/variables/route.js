import { NextResponse } from "next/server";
import { isAuthed } from "../../../lib/adminAuth";

/**
 * /api/admin/variables — what the agent is actually told on a B2C call.
 *
 * WHY IT EXISTS: the variables a Tring call carries are assembled from four places — the user's
 * own settings, the voice they picked, what past calls taught us about the caller, and the lines
 * resolved server-side in prompt_lines.py. Answering "why did it speak Hindi / say the wrong name
 * / use the wrong verbs" meant reading three services. Apollo now generates the whole set for an
 * owner without placing a call; this is the proxy that lets the panel ask.
 *
 * WHY A PROXY: same reason as /api/admin/users next door. Apollo's admin endpoints are gated on a
 * key that can read and write across the platform, and it must never reach the browser.
 *
 *   ?view=user&owner_number=+91…&caller_number=…&task=…   one user, inbound AND outbound
 *   ?view=lines&language=&assistant_gender=&owner_gender=&secondary_language=&use_case=&callee_name=
 *                                                        the generator — any combination, no user
 *   ?view=prompt&owner_number=…                          the FULL prompt, template + variables,
 *                                                        rendered the way the runtime renders it
 *                                                        (omit owner_number for a synthetic user)
 */
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

const APOLLO = (process.env.APOLLO_API_BASE || "https://api.graine.ai").replace(/\/+$/, "");

export async function GET(req) {
  if (!isAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });

  const key = process.env.APOLLO_ADMIN_API_KEY || process.env.ADMIN_API_KEY || "";
  if (!key) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "APOLLO_ADMIN_API_KEY is not set on this deployment. Set it to the SAME value as " +
          "ADMIN_API_KEY in Apollo's environment (Vercel → Settings → Environment Variables), " +
          "then redeploy. ADMIN_API_KEY is accepted as an alias if you prefer one name.",
        needs: ["APOLLO_ADMIN_API_KEY"],
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(req.url);
  const _v = searchParams.get("view");
  const view = _v === "lines" ? "lines" : _v === "prompt" ? "prompt" : "user";
  const qs = new URLSearchParams();
  // Allowlisted, and the list is the contract: a parameter dropped here is not an error anywhere,
  // it is silently ignored — so the panel would show a generated set for the WRONG inputs and
  // nothing would say so.
  const allowed = view === "lines"
    ? ["language", "assistant_gender", "owner_gender", "secondary_language", "use_case", "callee_name"]
    : view === "prompt"
      // The prompt view takes BOTH shapes: a real owner, or the synthetic knobs when there is no
      // owner to render. Dropping either half here would silently render the wrong person.
      ? ["owner_number", "caller_number", "task", "direction", "agent_id",
         "language", "assistant_gender", "owner_gender", "secondary_language", "callee_name"]
      : ["owner_number", "caller_number", "task"];
  for (const k of allowed) {
    const v = searchParams.get(k);
    if (v) qs.set(k, v);
  }
  const path = view === "lines" ? "variables/lines" : view === "prompt" ? "prompt" : "variables";
  const url = `${APOLLO}/api/v1/calls/admin/${path}${qs.toString() ? "?" + qs : ""}`;

  try {
    // X-Internal-API-Key is the header Apollo's admin gate reads. Authorization: Bearer is for
    // Stytch sessions, which this panel does not have.
    const res = await fetch(url, {
      headers: { "X-Internal-API-Key": key, "Content-Type": "application/json" },
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("apollo variables proxy failed:", res.status);
      return NextResponse.json(
        { ok: false, error: `apollo returned ${res.status}`, detail: body?.detail || null },
        { status: res.status === 401 || res.status === 403 ? 502 : res.status },
      );
    }
    return NextResponse.json(body);
  } catch (e) {
    console.error("apollo variables proxy error:", e?.message);
    return NextResponse.json({ ok: false, error: "apollo unreachable" }, { status: 502 });
  }
}
