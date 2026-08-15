"use client";
import React from "react";
import { CountUp, Rise } from "./motion";
import MetricChart, { CHART_COLORS as COL } from "./MetricChart";
import { buildSpine, headline } from "./spine";

/**
 * THE DECK — the whole business on one screen, in the order the customer meets it.
 *
 * Everything below this component on /admin is a detail panel: correct, occasionally vital, and
 * useless as a first read because there are twenty of them. Amazon's answer to that is a deck with
 * three properties, and this has all three:
 *
 *   1. END TO END, customer order. Not "web metrics, then app metrics, then billing" — those are
 *      our departments, not their experience, and the failures worth finding live in the joins.
 *   2. INPUTS SEPARATED FROM OUTPUTS. An output says what the score is; only a controllable input
 *      says what to do about it. Reading them the same way is how a team ends up optimising the
 *      number of detail pages instead of the number of sales.
 *   3. ONE THING FLAGGED. The constraint, in a sentence, at the top. Not four "areas of concern".
 *
 * Deliberately NOT here: geography, device mix, hourly curves, screen ranks. All real, none of them
 * the first question on a Monday morning.
 */

const INK = "#e6edf3", MUTED = "#9aa4b2", FAINT = "#5b6673";
const card = { background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 12 };

const fmt = (v, unit = "") =>
  v == null ? "—" : `${typeof v === "number" ? v.toLocaleString("en-IN") : v}${unit}`;

/** A stage of the journey. The number in the CONNECTOR is the one that matters — see Band. */
function Node({ n, i }) {
  const bad = n.constraint;
  return (
    // maxWidth so a node that lands alone on a wrapped row does not stretch to fill it — the band
    // reads as a sequence of comparable steps, and a step three times the width of its neighbours
    // looks like it means three times as much.
    <Rise delay={i * 60} style={{ flex: "1 1 128px", minWidth: 118, maxWidth: 230 }}>
      <div style={{
        height: "100%", padding: "11px 12px", borderRadius: 11, boxSizing: "border-box",
        background: bad ? "rgba(255,123,114,.07)" : "rgba(255,255,255,.03)",
        border: `1px solid ${bad ? "rgba(255,123,114,.38)" : "rgba(255,255,255,.09)"}`,
      }}>
        <div style={{ color: MUTED, fontSize: 10.5, lineHeight: 1.3, minHeight: 27 }}>{n.label}</div>
        <div style={{ color: bad ? COL.bad : "#fff", fontSize: 20, fontWeight: 700,
                      fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
          {n.value == null ? <span style={{ color: FAINT, fontSize: 13 }}>—</span>
                           : <CountUp value={n.value} />}
        </div>
        {/* The lever, on every stage. A funnel without one is a scoreboard: you can see the step
            that is failing and still have no idea what to go and do tomorrow. */}
        <div style={{ color: bad ? "rgba(255,123,114,.85)" : FAINT, fontSize: 9.5, marginTop: 3,
                      lineHeight: 1.3 }}>
          {n.lever}
        </div>
      </div>
    </Rise>
  );
}

/**
 * The connector carries the conversion, because the DROP between steps is the finding and the
 * counts are just context. Across a seam it carries an explanation instead of a number — the two
 * sides are different populations and a percentage there would be invented.
 */
function Link({ n }) {
  if (n.seam) {
    return (
      <div style={{ alignSelf: "center", textAlign: "center", minWidth: 58, padding: "0 2px" }}>
        <div style={{ color: FAINT, fontSize: 13, letterSpacing: 1 }}>⇢</div>
        <div style={{ color: FAINT, fontSize: 8.5, lineHeight: 1.25 }}>different<br />source</div>
      </div>
    );
  }
  if (n.loop) {
    return (
      <div style={{ alignSelf: "center", textAlign: "center", minWidth: 58 }}>
        <div style={{ color: COL.input, fontSize: 13 }}>↻</div>
        <div style={{ color: FAINT, fontSize: 8.5, lineHeight: 1.25 }}>back to<br />the top</div>
      </div>
    );
  }
  if (n.kept == null) {
    return <div style={{ alignSelf: "center", color: FAINT, fontSize: 13, minWidth: 34, textAlign: "center" }}>→</div>;
  }
  const pct = n.kept * 100;
  const bad = n.constraint;
  return (
    <div style={{ alignSelf: "center", textAlign: "center", minWidth: 52 }}>
      <div style={{ color: bad ? COL.bad : pct < 50 ? "#E7B75A" : MUTED, fontSize: 12.5,
                    fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {pct.toFixed(0)}%
      </div>
      <div style={{ color: bad ? COL.bad : FAINT, fontSize: 9 }}>
        {n.lost > 0 ? `−${n.lost.toLocaleString("en-IN")}` : "→"}
      </div>
    </div>
  );
}

function Band({ nodes }) {
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "stretch", marginTop: 12 }}>
      {nodes.map((n, i) => (
        <React.Fragment key={n.key}>
          {i > 0 && <Link n={n} />}
          <Node n={n} i={i} />
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * A metric with no trend behind it. Same box for outputs and inputs; only the badge differs.
 *
 * `failed` is not cosmetic. An em dash on this dashboard means "measured, and there is nothing
 * there" — a real finding a reader may act on. When the request behind a tile did not come back,
 * saying the same thing would be a fabrication. It says so instead, and names the reason.
 */
/**
 * A number, and — on demand — the arithmetic behind it.
 *
 * WHY THE FORMULA IS PART OF THE COMPONENT rather than a footnote or a separate guide page.
 * Every disagreement this dashboard has had with itself was a denominator question: the same
 * label computed over two different populations, or a per-stage bucket read where a cumulative
 * was meant. Both were invisible because a rendered number carries no trace of how it was made.
 * A reader who can see `82 ÷ 63 = 1.30` can tell in one glance whether the denominator is the one
 * they had in mind — and, when two tiles disagree, which of them is answering their question.
 *
 * Off by default: a permanently-visible division under every tile is noise on the days nothing
 * is in dispute. One toggle turns them all on at once, because checking a single number in
 * isolation is exactly the habit that let the 46x gap in "calls answered" survive.
 */
function Stat({ label, value, unit = "", sub, kind, failed, formula, showFormula, dec = 0 }) {
  return (
    <div style={{ ...card, padding: "11px 13px", flex: "1 1 132px", minWidth: 124 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ color: MUTED, fontSize: 10.5 }}>{label}</span>
        {kind && (
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: .4, padding: "1px 4px", borderRadius: 4,
                         color: kind === "input" ? COL.input : COL.output,
                         background: kind === "input" ? "rgba(92,217,138,.13)" : "rgba(139,149,161,.13)" }}>
            {kind === "input" ? "IN" : "OUT"}
          </span>
        )}
      </div>
      <div style={{ color: failed ? "#E7B75A" : "#fff", fontSize: failed ? 13 : 21, fontWeight: 700,
                    fontVariantNumeric: "tabular-nums", marginTop: failed ? 6 : 2 }}>
        {/* Counting up draws the eye to what MOVED between refreshes. CountUp honours
            prefers-reduced-motion internally and renders the final value immediately. */}
        {failed ? "unavailable"
          : value == null ? "—"
          : <CountUp value={Number(value)} decimals={dec} suffix={unit} />}
      </div>
      <div style={{ color: failed ? "#E7B75A" : FAINT, fontSize: 10, lineHeight: 1.3, marginTop: 1 }}>
        {failed || sub || ""}
      </div>
      {showFormula && formula && !failed && (
        <div style={{ marginTop: 6, paddingTop: 5, borderTop: "1px dashed rgba(255,255,255,.09)",
                      color: "#7d8896", fontSize: 10, lineHeight: 1.45,
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
          {formula}
        </div>
      )}
    </div>
  );
}

function GroupLabel({ children, note, tone }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap", marginTop: 20 }}>
      <span style={{ color: tone === "input" ? COL.input : COL.output, fontSize: 10.5, fontWeight: 700,
                     letterSpacing: .8 }}>
        {children}
      </span>
      <span style={{ color: FAINT, fontSize: 11 }}>{note}</span>
    </div>
  );
}

const SOURCE = {
  lifecycle: "App users (Apollo)", metrics: "Product metrics (Apollo)", series: "Weekly trends",
  referrals: "Referral engine", revenue: "Subscriptions",
};

export default function Deck({ stats, lifecycle, metrics, series, referrals, revenue, errors }) {
  // Only the sources this deck actually draws from. A carrier panel failing is real, but it is not
  // this card's problem and listing it here would train people to skim the banner.
  const broken = Object.keys(SOURCE).filter((k) => errors?.[k]);
  const nodes = buildSpine({
    reach: stats ? (stats.play_clicks || 0) + (stats.ios_clicks || 0) : null,
    funnel: lifecycle?.funnel,
    cumulative: lifecycle?.funnel_cumulative,
    referred: referrals?.referrers ?? null,
  });
  const h = headline(nodes);
  const s = series?.series || {};

  // Formulas are OFF by default and toggled for the whole deck at once — see Stat.
  const [showF, setShowF] = React.useState(false);
  /** `n(x)` — a number for a formula string, or "?" when the input is missing, so a formula can
   *  never read as though it were computed from a zero it did not have. */
  const n = (v) => (v == null || Number.isNaN(Number(v)) ? "?" : Number(v).toLocaleString("en-IN"));
  /** `div(a, b, out, unit)` — "a ÷ b = out". Names the two populations that produced the ratio,
   *  which is the thing every disagreement on this dashboard has turned out to be about. */
  const div = (a, b, out, unit = "") => `${n(a)} ÷ ${n(b)} = ${out == null ? "?" : out}${unit}`;
  const m = metrics || {};

  // Activation, spelled out. The strategist prompt argues this one number is worth ~60,000 users
  // at the current target, which makes it the input metric the deck should lead its lever row with.
  const cum = Object.fromEntries(nodes.map((n) => [n.key, n.value]));
  const activation = cum.installed > 0 && cum.signed_in != null
    ? Math.round((cum.signed_in / cum.installed) * 1000) / 10 : null;

  return (
    <div style={{ background: "#0B0B0C", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18,
                  padding: 20, marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 19, fontWeight: 700, color: "#fff", margin: 0 }}>The business, end to end</h2>
        <span style={{ color: MUTED, fontSize: 12 }}>
          in the order a customer meets it — not the order we happen to store it in
        </span>
      </div>

      {/* WHAT DID NOT LOAD, BEFORE ANY NUMBER IS READ. A deck whose sources half-failed is worse
          than no deck: every tile still looks authoritative, and the missing ones look like zeros.
          Say it at the top, name the source, and give the reason the server actually gave. */}
      {broken.length > 0 && (
        <div style={{ marginTop: 12, padding: "10px 13px", borderRadius: 11,
                      background: "rgba(231,183,90,.09)", border: "1px solid rgba(231,183,90,.32)" }}>
          <span style={{ color: "#E7B75A", fontSize: 10, fontWeight: 700, letterSpacing: .6 }}>
            {broken.length} SOURCE{broken.length > 1 ? "S" : ""} DID NOT LOAD
          </span>
          <div style={{ color: MUTED, fontSize: 11.5, marginTop: 4, lineHeight: 1.5 }}>
            The tiles they feed read “unavailable” rather than “—”. A dash here means we measured
            and found nothing, which is a different claim from not having been able to ask.
          </div>
          {broken.map((k) => (
            <div key={k} style={{ color: "#e6edf3", fontSize: 11.5, marginTop: 3 }}>
              <b>{SOURCE[k]}</b> <span style={{ color: FAINT }}>— {errors[k]}</span>
            </div>
          ))}
        </div>
      )}

      {/* THE ONE SENTENCE. If a reader gets no further than this line, they still learned the most
          important thing on the page. */}
      {h ? (
        <div style={{ marginTop: 12, padding: "11px 14px", borderRadius: 11,
                      background: "rgba(255,123,114,.08)", border: "1px solid rgba(255,123,114,.3)" }}>
          <span style={{ color: COL.bad, fontSize: 10, fontWeight: 700, letterSpacing: .6 }}>THE CONSTRAINT</span>
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, marginTop: 3, lineHeight: 1.45 }}>
            {h.from} → {h.stage} keeps {h.keptPct}%
            {h.lost ? ` · ${h.lost.toLocaleString("en-IN")} people lost right here` : ""}
          </div>
          <div style={{ color: MUTED, fontSize: 11.5, marginTop: 3 }}>
            The lever is {h.lever}. Work anywhere else moves people into the queue in front of this,
            not through it.
          </div>
        </div>
      ) : (
        <div style={{ color: errors?.lifecycle ? "#E7B75A" : FAINT, fontSize: 11.5, marginTop: 12 }}>
          {errors?.lifecycle
            ? `No constraint: the funnel it is computed from did not load (${errors.lifecycle}).`
            : "Load the app-user panels below and the constraint names itself here."}
        </div>
      )}

      <Band nodes={nodes} />

      {/* ── OUTPUTS ─────────────────────────────────────────────────────────────────────────
          The score. Real, and almost entirely useless as instructions: nobody can go to work on
          "total users" tomorrow morning. */}
      {/* One control for the whole deck. Checking a single number in isolation is exactly the
          habit that let a 46x gap between two "calls answered" tiles survive unnoticed — so the
          affordance reveals every formula at once, and comparing denominators becomes the default
          way to read the page rather than an investigation someone has to decide to start. */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <button onClick={() => setShowF((v) => !v)}
                aria-pressed={showF}
                style={{ background: showF ? "rgba(92,217,138,.14)" : "transparent",
                         border: "1px solid " + (showF ? "rgba(92,217,138,.45)" : "rgba(255,255,255,.14)"),
                         color: showF ? "#5CD98A" : MUTED, borderRadius: 7, padding: "4px 10px",
                         fontSize: 11, cursor: "pointer", transition: "all .18s ease" }}>
          {showF ? "Hide formulas" : "Show formulas"}
        </button>
      </div>

      <GroupLabel tone="output" note="results — what happened. You cannot pull these directly.">
        OUTPUT METRICS
      </GroupLabel>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <Stat kind="output" failed={errors?.lifecycle} label="Signed in, all time" value={cum.signed_in}
              sub={cum.installed ? `of ${cum.installed.toLocaleString("en-IN")} installs` : null}
              showFormula={showF}
              formula={`everyone at stage signed_in or later = ${n(cum.signed_in)}\ncumulative, so it includes forwarding-on, activated and retained`} />
        {/* FOUR WINDOWS, because "how many calls did Tring answer" was only ever answerable as a
            rolling seven days — which is the one window nobody asks for. Today and this month are
            CALENDAR windows in IST: a UTC day boundary puts 00:00-05:30 IST into yesterday, so
            "today" read low every morning in a way that looked plausible. The rolling week is kept
            alongside because answers-per-active-user divides by a rolling active count and the two
            must span the same window — a Monday-morning calendar week of 3 is not a contradiction
            of a rolling week of 80. */}
        <Stat kind="output" failed={errors?.metrics} label="Calls · today" value={m.calls_answered_today}
              sub="since midnight IST" showFormula={showF}
              formula={`count(call_records) where created_at ≥ today 00:00 IST\nAND (app_screening OR app_outbound) AND NOT is_demo = ${n(m.calls_answered_today)}`} />
        <Stat kind="output" failed={errors?.metrics} label="Calls · this week" value={m.calls_answered_this_week}
              sub="since Monday IST" showFormula={showF}
              formula={`calendar week, Monday 00:00 IST → now = ${n(m.calls_answered_this_week)}\nNOT the rolling 7 days below — different window, different number`} />
        <Stat kind="output" failed={errors?.metrics} label="Calls · this month" value={m.calls_answered_this_month}
              sub="since the 1st, IST" showFormula={showF}
              formula={`calendar month, 1st 00:00 IST → now = ${n(m.calls_answered_this_month)}`} />
        <Stat kind="output" failed={errors?.metrics} label="Calls · all time" value={m.calls_answered_total}
              sub="every call Ring has answered" showFormula={showF}
              formula={`count(call_records) where (app_screening OR app_outbound)\nAND NOT is_demo, no date bound = ${n(m.calls_answered_total)}`} />
        <Stat kind="output" failed={errors?.metrics} label="Calls answered" value={m.calls_answered_week} sub="rolling 7 days"
              showFormula={showF}
              formula={`count(call_records) where created_at ≥ 7d ago\nAND (app_screening OR app_outbound) AND NOT is_demo\n= ${n(m.calls_answered_week)} — B2B campaign calls excluded`} />
        <Stat kind="output" failed={errors?.lifecycle} label="Stayed 5+ days" value={cum.retained} sub="the only durable number here"
              showFormula={showF}
              formula={`people with an answered call on ≥5 distinct days = ${n(cum.retained)}\ndays are counted per OWNER, so a dual-SIM user is one person`} />
        <Stat kind="output" failed={errors?.revenue} label="Entitled now" value={revenue?.entitled_now}
              sub={revenue ? `${revenue.entitled_paid ?? 0} paid · ${revenue.entitled_granted ?? 0} referral` : "load Subscriptions"} />
        <Stat kind="output" failed={errors?.metrics} label="D7 retention" value={m.d7?.answered_pct} unit="%" dec={1}
              sub={m.d7?.cohort ? `n=${m.d7.cohort} — read the cohort first` : null}
              showFormula={showF}
              formula={div(m.d7?.answered, m.d7?.cohort, m.d7?.answered_pct, "%") + `\ncohort = people whose FIRST call was exactly 7 days ago`} />
      </div>

      {/* ── INPUTS ──────────────────────────────────────────────────────────────────────────
          The levers. Each one is something a small team can change this week, which is the entire
          test for belonging in this row. */}
      <GroupLabel tone="input" note="the levers — these are what next week's work actually moves.">
        CONTROLLABLE INPUT METRICS
      </GroupLabel>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <Stat kind="input" failed={errors?.lifecycle} label="Activation" value={activation} unit="%" dec={1} sub="installed → signed in"
              showFormula={showF}
              formula={div(cum.signed_in, cum.installed, activation, "%") + `\ndenominator = everyone Apollo has a record of, NOT PostHog installs`} />
        <Stat kind="input" failed={errors?.metrics} label="Time to first answer" value={m.time_to_first_answer_hours} unit="h" dec={1}
              sub="median, sign-in → proof it works"
              showFormula={showF}
              formula={`median(first answered call − signed in) = ${n(m.time_to_first_answer_hours)}h\nmedian, not mean — one person waiting a week would drag a mean`} />
        <Stat kind="input" failed={errors?.metrics} label="Answers / active user" value={m.answers_per_active_user_week} dec={2} sub="depth, per week"
              showFormula={showF}
              formula={div(m.calls_answered_week, m.active_devices_week, m.answers_per_active_user_week) + `\ncalls this week ÷ devices that opened the app this week`} />
        <Stat kind="input" failed={errors?.referrals} label="Referring" value={referrals?.participation_pct} unit="%" dec={1}
              sub={referrals ? `k=${referrals.k_factor ?? "—"}` : "load The referral engine"}
              showFormula={showF}
              formula={div(referrals?.referrers, referrals?.eligible, referrals?.participation_pct, "%") + `\nk = redemptions ÷ referrers — invites that became users, per referrer`} />
        <Stat kind="input" failed={errors?.metrics} label="Active this week" value={m.active_devices_week} sub="devices that opened the app"
              showFormula={showF}
              formula={`distinct owners in app_opens over the last 7 days = ${n(m.active_devices_week)}\nDEVICES that opened — not people who answered a call`} />
      </div>

      {/* The 6-12s, in the house format, for the inputs that have a history. Same shape as every
          other trend on the dashboard so nobody has to learn a second chart. */}
      {series && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                      gap: 10, marginTop: 12 }}>
          {/* "Deletion EVENTS", not "deletions". This counts account_deletion_completed events,
              while the churn card counts deleted_accounts tombstones — which are deduped per
              person, so someone who deletes, re-signs-up and deletes again is 2 events and 1
              person. Unlabelled they read as the same quantity disagreeing with itself (4 vs 1),
              which is the same events-vs-people distinction the signup card already spells out. */}
          {[["Signups", "signups", false], ["Calls answered", "calls_answered", false],
            ["App opens", "app_opens", false], ["Deletion events", "deletions", true]]
            .filter(([, k]) => s[k]?.weeks?.length)
            .map(([title, k, invert], i) => (
              <Rise key={k} delay={i * 60}>
                <MetricChart title={title} kind="input" invert={invert}
                             weeks={s[k].weeks || []} months={s[k].months || []}
                             note={k === "deletions" ? "down is good · events, not people — the churn card counts people"
                                                      : invert ? "down is good" : undefined} />
              </Rise>
            ))}
        </div>
      )}

      <div style={{ color: FAINT, fontSize: 10.5, marginTop: 14, lineHeight: 1.5 }}>
        Everything below this card is the appendix — the same business cut by geography, device,
        hour and screen. Read it when this deck raises a question, not before.
      </div>
    </div>
  );
}
