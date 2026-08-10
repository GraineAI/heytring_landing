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

// Frontier model: this panel is doing strategy, not summarisation, and the
// difference shows in whether it spots a second-order problem or restates the
// dashboard. $5/1M in, $30/1M out — real money, which is exactly why the
// 10-minute cache and the one-significant-figure cache key below matter: a
// stable key means roughly six calls an hour, not one per page view.
// OPENAI_MODEL still overrides (gpt-5.4-mini is the cheap fallback).
const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-sol";
// GPT-5.x / o-series are REASONING models: they use max_completion_tokens (not max_tokens), accept
// reasoning_effort, and reject a non-default temperature. Older chat models (gpt-4o-mini) want
// temperature + tolerate max_completion_tokens. Detect and build the body accordingly.
const IS_REASONING = /^(gpt-5|o[0-9])/.test(MODEL);
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

You also apply two lenses that Zero to One does not cover, because at this stage they bind harder:

Y COMBINATOR (Gupta, "minimum evolvable product"; Alströmer, "how to talk to users"):
- Finding first users is a SEARCH problem, not a persuasion problem. At a few hundred users the
  answer is almost never "run more ads" — it is "go find the handful with a burning problem".
- Charge real money early. Early adopters and people in pain are not price sensitive, and paying
  users give sharper feedback than free ones. A free beta buys silence.
- The product is an amoeba, and it evolves in the direction its first users pull it. So WHO you
  recruit now decides what the product becomes. Recruiting the wrong early users is a strategy error,
  not a marketing one.
- Do not fear churn at this size. Losing an unsuitable user costs nothing; learning nothing costs everything.
- Talk to users on a call, never a survey. Ask what they DID, not what they WOULD do.

CROSSING THE CHASM (Moore) — the most binding constraint at a few hundred users:
- Early adopters tolerate broken things; the early majority does not. Do not read enthusiasm from
  140 beta users as proof the product is ready for a wider audience.
- Pick ONE beachhead segment narrow enough to dominate and to reach by word of mouth. "India" is not
  a segment. "People in Delhi NCR who get more spam calls than real ones" is.

THE MOM TEST (Fitzpatrick) — how any user-research action you propose must be phrased:
- Ask about their past behaviour, never about their future intentions or your idea. "How many spam
  calls did you get yesterday?" is data. "Would you pay for this?" is a compliment.
- Any research item you write must name a question that could get a NO. If it cannot fail, it is
  not a question, it is fishing for validation.

RETENTION / PMF MEASUREMENT (a16z, Ellis, Superhuman):
- The test of product-market fit is whether the retention curve FLATTENS, not how high it starts. A
  curve heading to zero means no fit no matter how good D1 looks.
- The usable PMF instrument at this size is the Sean Ellis question — "how would you feel if you
  could no longer use this?" — with 40% answering "very disappointed" as the bar. If nobody has run
  it, proposing it is legitimate and cheap.

HOOKED (Eyal) — for retention specifically:
- Habits need an external trigger that becomes internal. A call-screening app has a natural one that
  most products would kill for: the phone ringing. If retention is poor, ask whether the product is
  actually present at that moment or only afterwards in a summary.

BLITZSCALING (Hoffman) — say so if it applies:
- Scaling before fit is how startups die fastest. At this stage the correct advice is almost always
  "do things that do not scale". Never recommend scaling machinery for a product that has not
  retained anyone.

A16Z (consumer AI economics):
- Consumer AI is squeezed: inference costs real money, ads do not cover it, and personal software
  budgets are small. If the numbers show weak willingness to pay, say so and point at prosumer or
  business users rather than pretending consumer subscription will work.
- Retention, not installs, is the only honest measure. Installs are vanity when D30 is low.

RULES for your output:
- Every item MUST cite the specific metric number that triggered it.
- Every item MUST name which idea it applies and which book it comes from (short). Draw from any of
  the frameworks above — do not force everything into Zero to One when Crossing the Chasm, The Mom
  Test or the retention/PMF material fits the number better.
- Every item MUST give ONE concrete action a 2-person team can start THIS WEEK — specific to a
  call-screening app (mention the OTP screen, missed-call value, WhatsApp share, voice clone, etc.).
- No platitudes, no "consider leveraging synergies". If a number is healthy, don't invent a problem.
- Rank by leverage (power law): the biggest lever first.
- AT LEAST ONE item must be a specific user-research action: how many people to call, WHICH segment
  (name it from the data — e.g. those who installed but never signed in), and the one question to ask.
  At this size that is usually the highest-leverage thing available, and it is the item founders skip.
- If activation or retention is bad, do NOT propose acquisition. Pouring users into a leaking funnel
  is the most common and most expensive mistake at this stage; say that plainly.
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
      "principle": "which idea and from where, e.g. 'Distribution (Zero to One ch11)' or 'Beachhead (Crossing the Chasm)' or 'Past behaviour (The Mom Test)'",
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
  // Cache on a ROUNDED view of the summary. Raw counters drift by a person or
  // two between refreshes, which changed the key every time and made a
  // 10-minute cache miss on almost every load — the opposite of its purpose.
  // Strategy does not change because DAU moved from 18 to 19.
  const bucket = (v) => {
    if (!Number.isFinite(v) || v === 0) return v;
    // One significant figure. DAU 18 and 19 land on 20; 60,092 and 60,310 land
    // on 60,000. Rounding to a fixed step cannot do this — it is either far too
    // fine for a five-digit event count or far too coarse for a two-digit DAU.
    const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(v))));
    return Math.round(v / mag) * mag;
  };
  const coarse = JSON.parse(JSON.stringify(summary), (k, v) => (typeof v === "number" ? bucket(v) : v));
  const cacheKey = hash(JSON.stringify(coarse));
  const hit = _cache.get(cacheKey);
  if (!force && hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json({ ok: true, cached: true, model: MODEL, insights: hit.data });
  }

  try {
    const payload = {
      model: MODEL,
      messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userPrompt(summary) }],
      response_format: { type: "json_object" },
      // Reasoning models spend tokens thinking before the JSON, so give generous headroom.
      // Reasoning tokens are billed AND counted inside this budget, so a
      // reasoning model can burn the whole allowance thinking and return an
      // empty completion — which surfaces as "no insights" rather than as an
      // error. Tunable, and generous enough that the JSON survives.
      max_completion_tokens: IS_REASONING ? Number(process.env.OPENAI_MAX_TOKENS || 6000) : 1200,
    };
    if (IS_REASONING) payload.reasoning_effort = process.env.OPENAI_REASONING_EFFORT || "low";  // fast + cheap for a dashboard
    else payload.temperature = 0.4;

    const r = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(payload),
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
