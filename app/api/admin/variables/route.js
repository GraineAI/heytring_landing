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
    //
    // X-Payment-Secret is Apollo's SECOND accepted staff credential (staff_secret_matches takes
    // either), sent only when one is configured here. It exists because a deployment that holds
    // one secret and not the other is the normal state, and a panel that can only present one of
    // the two fails with an error that looks like a bug in the endpoint.
    const headers = { "X-Internal-API-Key": key, "Content-Type": "application/json" };
    if (process.env.PAYMENT_SECRET) headers["X-Payment-Secret"] = process.env.PAYMENT_SECRET;

    const res = await fetch(url, { headers, cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("apollo variables proxy failed:", res.status);
      // A 401 here is ALWAYS the key, never the route — and the obvious fix is the wrong one often
      // enough to be worth spelling out. Apollo resolves INTERNAL_CREDIT_API_KEY FIRST and falls
      // back to ADMIN_API_KEY, so on a deployment where both are set to different values,
      // ADMIN_API_KEY is inert and copying it here authenticates nothing.
      const hint = (res.status === 401 || res.status === 403)
        ? "Apollo rejected the admin key. It resolves INTERNAL_CREDIT_API_KEY first and only " +
          "falls back to ADMIN_API_KEY — if both are set on Apollo, the value this panel needs " +
          "in APOLLO_ADMIN_API_KEY is INTERNAL_CREDIT_API_KEY's. Check with: curl -s -o /dev/null " +
          "-w '%{http_code}' -H \"X-Internal-API-Key: $KEY\" " +
          `${APOLLO}/api/v1/calls/admin/users?limit=1  (200 = right key). The users panel fails ` +
          "the same way with the same key, so this is not specific to this page."
        : null;
      return NextResponse.json(
        { ok: false, error: `apollo returned ${res.status}`, detail: body?.detail || null, hint },
        { status: res.status === 401 || res.status === 403 ? 502 : res.status },
      );
    }
    return NextResponse.json(body);
  } catch (e) {
    console.error("apollo variables proxy error:", e?.message);
    return NextResponse.json({ ok: false, error: "apollo unreachable" }, { status: 502 });
  }
}
