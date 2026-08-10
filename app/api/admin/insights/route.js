import { NextResponse } from "next/server";
import { isAuthed } from "../../../lib/adminAuth";

/**
 * /api/admin/insights — OpenAI-written strategy over the live metrics, framed in Peter Thiel's
 * "Zero to One".
 *
 * The OpenAI key is read server-side and NEVER sent to the browser (same rule as the PostHog key).
 * The client posts the compact summary it is already showing; the model reasons over exactly what
 * the admin sees. Output is forced to strict JSON so the panel renders reliably.
 *
 * Cost control: the result is cached in-memory for 10 minutes (matched to the dashboard's refresh),
 * keyed by a hash of the summary — so ten admins refreshing does not mean ten model calls. A manual
 * "Regenerate" passes force:true to bypass the cache.
 */
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";  // override with whatever your account has
const OPENAI_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1") + "/chat/completions";
const TTL_MS = 10 * 60 * 1000;

// Module-level cache (best-effort; serverless may cold-start, which just means a fresh call).
const _cache = new Map(); // key -> { at, data }

function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return String(h); }

// The prompt engineering. The whole point is that the model does NOT hand back generic growth
// advice — every item must be pinned to a number on the dashboard and to a specific Zero to One
// idea, and must be doable by a small team this week.
const SYSTEM = `You are a ruthless, numerate growth & product strategist advising the founder of Tring —
an INDIA-ONLY, login-required AI call-screening app that answers a user's MISSED calls in Hinglish and
Indian languages, on the SIM they already have (no new number). It is a small beta.

You think strictly in Peter Thiel's "Zero to One":
- 0→1, not 1→n (ch1): the durable value is a vernacular voice assistant that ANSWERS calls, not a better spam list.
- Monopoly over competition (ch3-4): win by dominating a narrow niche, not fighting Truecaller/Google head-on.
- Last mover / durability (ch5): favour what compounds (the cloned, context-aware voice) over copyable plumbing (call forwarding).
- Definite optimism (ch6): demand a concrete plan — a number and a date — never "grow and see".
- The power law (ch7): a few users/channels/features matter far more than the rest; concentrate.
- Secrets (ch8): act on what the data reveals that the market doesn't see.
- Distribution (ch11): a product with no referral loop dies; treat distribution as equal to product.

RULES for your output:
- Every item MUST cite the specific metric number that triggered it.
- Every item MUST name which Zero to One idea it applies (short).
- Every item MUST give ONE concrete action a 2-person team can start THIS WEEK — specific to a
  call-screening app (mention the OTP screen, missed-call value, WhatsApp share, voice clone, etc.).
- No platitudes, no "consider leveraging synergies". If a number is healthy, don't invent a problem.
- Rank by leverage (power law): the biggest lever first.
Return STRICT JSON only.`;

function userPrompt(summary) {
  return `Live Tring metrics (India = real users; "global" includes CI/emulator/store-review bots — ignore those as users):
${JSON.stringify(summary, null, 2)}

Return JSON with this exact shape:
{
  "headline": "one sharp sentence naming the single biggest issue right now",
  "items": [
    { "priority": "critical" | "high" | "medium",
      "title": "short imperative, e.g. 'Fix the sign-in step'",
      "metric": "the exact number that triggered this, e.g. '18% activation, 213/260 never signed in'",
      "principle": "which Zero to One idea, e.g. 'Distribution (ch11)'",
      "action": "one concrete step this week" }
  ],
  "one_bet": "the single highest-leverage bet to concentrate on (the power-law focus), one sentence"
}
Give 4 to 6 items, ordered by leverage.`;
}

export async function POST(req) {
  if (!isAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: "Set OPENAI_API_KEY in the environment to enable the AI strategist." }, { status: 200 });

  let body = {};
  try { body = await req.json(); } catch {}
  const summary = body.summary || {};
  const force = !!body.force;
  const cacheKey = hash(JSON.stringify(summary));
  const hit = _cache.get(cacheKey);
  if (!force && hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json({ ok: true, cached: true, model: MODEL, insights: hit.data });
  }

  try {
    const r = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userPrompt(summary) }],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 1100,
      }),
      cache: "no-store",
    });
    if (!r.ok) {
      const detail = (await r.text()).slice(0, 200);   // may quote the model id, never the key
      console.error("openai insights HTTP", r.status, detail);
      return NextResponse.json({ ok: false, error: `OpenAI ${r.status} — check OPENAI_API_KEY / OPENAI_MODEL (${MODEL}).` }, { status: 200 });
    }
    const j = await r.json();
    const raw = j.choices?.[0]?.message?.content || "{}";
    let insights;
    try { insights = JSON.parse(raw); } catch { insights = { headline: "Model returned unparseable output.", items: [] }; }
    _cache.set(cacheKey, { at: Date.now(), data: insights });
    return NextResponse.json({ ok: true, model: MODEL, insights });
  } catch (e) {
    console.error("openai insights failed:", e?.message);
    return NextResponse.json({ ok: false, error: "AI request failed (network or config)." }, { status: 200 });
  }
}
