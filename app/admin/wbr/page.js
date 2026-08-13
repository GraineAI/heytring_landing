"use client";

/**
 * /admin/wbr — THE WEEKLY BUSINESS REVIEW.
 *
 * The other admin page is a dashboard: you go to it with a question. This is a document: you read
 * it start to finish on a Monday, in order, and it is the same order every week. Those are
 * different objects and they are why this does not look like the rest of the panel.
 *
 * It is set as print, not as UI. The whole vocabulary of the modern dashboard — cards floating on
 * a dark field, tinted status pills, gradient fills, coloured dots, a badge on every number — is
 * absent on purpose, because every one of those devices spends attention to make a screen look
 * active, and this page needs the reader's attention for the numbers. What is left is what a
 * printed report has always used: one measured column, hairline rules, a real type hierarchy,
 * tabular figures that align down the page, and a single accent colour that only ever means
 * "someone should speak to this".
 *
 * It prints. That is not a novelty — a WBR that can be put on paper is one people can read in a
 * room without a screen between them, which was the original point of the format.
 */

import React, { useEffect, useState } from "react";
import { P, SERIF, SANS, NUM, Label, Rule, Page, Marked } from "../components/paper";
import Figure from "../components/Figure";
import { buildSpine, headline } from "../components/spine";
import { detect, describe } from "../components/signals";

const REASON_LABEL = {
  not_useful: "Didn't find it useful", too_many_calls: "Too many notifications",
  didnt_work: "It didn't work properly", privacy: "Privacy concerns",
  setup_hard: "Setup was too hard", other: "Something else",
};

const money = (n) => (n == null ? "—" : Number(n).toLocaleString("en-IN"));

/** The spine as a ruled table. A funnel drawn as boxes is a diagram; drawn as a table it is read. */
function Spine({ nodes }) {
  const COLS = "1fr 4.5rem 4rem 4rem 1.4fr";
  const cell = { fontFamily: SANS, fontSize: 11.5, color: P.ink, padding: "7px 0", ...NUM };
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 12 }}>
        {["Stage", "Count", "Kept", "Lost", "The controllable input"].map((h, i) => (
          <Label key={h} style={{ textAlign: i > 0 && i < 4 ? "right" : "left" }}>{h}</Label>
        ))}
      </div>
      <Rule weight="strong" style={{ marginTop: 5 }} />
      {nodes.map((n) => (
        <Marked key={n.key} on={n.constraint}>
          <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 12,
                        borderBottom: `1px solid ${P.rule}` }}>
            <div style={{ ...cell, fontVariantNumeric: "normal",
                          fontWeight: n.constraint ? 700 : 400,
                          color: n.constraint ? P.mark : P.ink }}>
              {n.label}
            </div>
            <div style={{ ...cell, textAlign: "right" }}>{n.value == null ? "—" : money(n.value)}</div>
            {/* A seam and a loop print WORDS, never a percentage. The two sides are different
                populations; a number there would be arithmetic wearing the costume of a rate. */}
            <div style={{ ...cell, textAlign: "right", color: n.constraint ? P.mark : P.ink2 }}>
              {n.seam ? <span style={{ fontSize: 9.5, color: P.ink3 }}>seam</span>
                : n.loop ? <span style={{ fontSize: 9.5, color: P.ink3 }}>loop</span>
                : n.kept == null ? "—" : `${(n.kept * 100).toFixed(0)}%`}
            </div>
            <div style={{ ...cell, textAlign: "right", color: n.lost ? P.ink2 : P.ink3 }}>
              {n.lost == null ? "—" : money(n.lost)}
            </div>
            <div style={{ ...cell, fontVariantNumeric: "normal", fontSize: 10.5, color: P.ink3 }}>
              {n.lever}
            </div>
          </div>
        </Marked>
      ))}
      <div style={{ fontFamily: SANS, fontSize: 9.5, color: P.ink3, marginTop: 8, lineHeight: 1.5, maxWidth: 640 }}>
        <b style={{ color: P.ink2 }}>Seam</b> — the two counts come from different systems (store
        clicks from this site's database, installs from Apollo) and most installs never touched our
        link, so no conversion is computed. <b style={{ color: P.ink2 }}>Loop</b> — referrals are the
        flywheel closing, not a funnel step.
      </div>
    </div>
  );
}

/** A ruled statistic. No card, no border, no tint — a rule above and figures that align. */
function Stat({ label, value, unit = "", sub }) {
  return (
    <div style={{ flex: "1 1 128px", minWidth: 118 }}>
      <Rule weight="strong" />
      <div style={{ fontFamily: SERIF, fontSize: 27, color: P.ink, marginTop: 6, lineHeight: 1, ...NUM }}>
        {value == null ? <span style={{ color: P.ink3 }}>—</span>
          : <>{typeof value === "number" ? value.toLocaleString("en-IN") : value}<span style={{ fontSize: 15 }}>{unit}</span></>}
      </div>
      <Label style={{ marginTop: 6 }}>{label}</Label>
      {sub && <div style={{ fontFamily: SANS, fontSize: 10, color: P.ink3, marginTop: 2, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
}

export default function WBR() {
  const [stats, setStats] = useState(null);
  const [lifecycle, setLifecycle] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [series, setSeries] = useState(null);
  const [ref, setRef] = useState(null);
  const [rev, setRev] = useState(null);
  const [why, setWhy] = useState(null);
  const [authed, setAuthed] = useState(null);

  // Every loader is declared above the only effect, and there is no early return between them —
  // see app/admin/tdz.test.mjs for the blank page that rule exists to prevent.
  const get = async (url) => {
    const r = await fetch(url, { cache: "no-store" });
    if (r.status === 401) { setAuthed(false); return null; }
    setAuthed(true);
    const j = await r.json().catch(() => ({}));
    return j?.ok === false ? null : j;
  };
  const loadAll = async () => {
    const d = await get("/api/admin/data");
    if (d) {
      const c = d.clicks || [];
      setStats({ play_clicks: c.filter((r) => r.kind === "play").length,
                 ios_clicks: c.filter((r) => r.kind === "ios").length,
                 signups: (d.waitlist || []).length });
    }
    get("/api/admin/users?view=users&limit=1").then(() => {});
    get("/api/admin/users?view=metrics").then((j) => j && setMetrics(j));
    get("/api/admin/users?limit=500&view=users").then((j) => j && setLifecycle(j));
    get("/api/admin/churn?view=timeseries").then((j) => j && setSeries(j));
    get("/api/admin/churn?view=referrals&goal=500000&horizon_days=80&days=90").then((j) => j && setRef(j));
    get("/api/admin/churn?view=revenue&days=90").then((j) => j && setRev(j));
    get("/api/admin/churn?view=funnel").then((j) => j && setWhy(j));
  };

  useEffect(() => { loadAll(); }, []);

  const nodes = buildSpine({
    reach: stats ? (stats.play_clicks || 0) + (stats.ios_clicks || 0) : null,
    funnel: lifecycle?.funnel,
    cumulative: lifecycle?.funnel_cumulative,
    referred: ref?.referrers ?? null,
  });
  const h = headline(nodes);
  const cum = Object.fromEntries(nodes.map((n) => [n.key, n.value]));
  const m = metrics || {};
  const s = series?.series || {};
  const activation = cum.installed > 0 && cum.signed_in != null
    ? Math.round((cum.signed_in / cum.installed) * 1000) / 10 : null;

  // EXCEPTIONS ONLY. "WBR time is precious. If things are within expected variances, business
  // owners say 'nothing to see here' and move along."
  const exceptions = [
    ["Deletions", s.deletions?.weeks, true], ["Delete screen opened", s.deletions_initiated?.weeks, true],
    ["Logouts", s.logouts?.weeks, true], ["Signups", s.signups?.weeks, false],
    ["Calls answered", s.calls_answered?.weeks, false], ["App opens", s.app_opens?.weeks, false],
  ].map(([name, wk, invert]) => ({ name, sig: detect(wk, { invert }) })).filter((x) => x.sig);

  const reasons = Object.entries(why?.exit_reasons || {}).sort((a, b) => b[1] - a[1]);
  const today = new Date();
  const weekOf = today.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ background: P.paper, minHeight: "100vh", padding: "56px 24px 96px" }}>
      <style>{`
        @media print {
          @page { margin: 16mm; }
          body { background: #fff; }
          .wbr-noprint { display: none !important; }
          section { page-break-inside: avoid; }
        }
      `}</style>
      <div style={{ maxWidth: 940, margin: "0 auto" }}>

        {/* MASTHEAD. A document announces itself once, at the top, and then gets out of the way. */}
        <header>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div>
              <Label>Tring · India · login required</Label>
              <h1 style={{ fontFamily: SERIF, fontSize: 44, lineHeight: 1.02, color: P.ink,
                           margin: "8px 0 0", fontWeight: 400, letterSpacing: "-.01em" }}>
                The Weekly<br />Business Review
              </h1>
            </div>
            <div style={{ textAlign: "right", fontFamily: SANS, fontSize: 10.5, color: P.ink3, lineHeight: 1.8 }}>
              <div>Week of <span style={{ color: P.ink }}>{weekOf}</span></div>
              <div>{exceptions.length === 0 ? "No metric outside 2σ" : `${exceptions.length} exception${exceptions.length > 1 ? "s" : ""} to discuss`}</div>
              <div className="wbr-noprint" style={{ marginTop: 6 }}>
                <a href="/admin" style={{ color: P.ink2 }}>← the dashboard</a>
                <span style={{ color: P.rule }}> · </span>
                <button onClick={() => window.print()}
                        style={{ background: "none", border: 0, padding: 0, font: "inherit",
                                 color: P.ink2, cursor: "pointer", textDecoration: "underline" }}>
                  print
                </button>
              </div>
            </div>
          </div>
          <Rule weight="strong" style={{ marginTop: 18 }} />
          <div style={{ fontFamily: SANS, fontSize: 11.5, color: P.ink2, marginTop: 10,
                        lineHeight: 1.65, maxWidth: 620 }}>
            Read in order, top to bottom. The pages follow the customer, not our departments —
            the failures worth finding live in the joins between them. Anything inside its normal
            range is left unremarked; only the marked lines need an owner to speak.
          </div>
        </header>

        {authed === false && (
          <div style={{ fontFamily: SANS, fontSize: 12, color: P.mark, marginTop: 28 }}>
            Not signed in. Sign in at <a href="/admin" style={{ color: P.mark }}>/admin</a>, then reload.
          </div>
        )}

        {/* 1 ───────────────────────────────────────────────────────────────────────────────── */}
        <Page n="1" title="The constraint" note="one stage, never a list">
          {h ? (
            <Marked on>
              <div style={{ maxWidth: 700 }}>
                <div style={{ fontFamily: SERIF, fontSize: 25, lineHeight: 1.3, color: P.ink }}>
                  {h.from} → {h.stage} keeps <span style={{ ...NUM }}>{h.keptPct}%</span>.
                  {h.lost ? <> {money(h.lost)} people are lost at that one step.</> : null}
                </div>
                <div style={{ fontFamily: SANS, fontSize: 11.5, color: P.ink2, marginTop: 10, lineHeight: 1.7 }}>
                  The lever is <b style={{ color: P.ink }}>{h.lever}</b>. Everything subordinates to
                  this: work that improves a different stage cannot move the total until this one
                  clears — it only moves people into the queue in front of it.
                </div>
              </div>
            </Marked>
          ) : (
            <div style={{ fontFamily: SANS, fontSize: 11.5, color: P.ink3 }}>
              Waiting on the app-user funnel. The constraint names itself the moment it arrives.
            </div>
          )}
        </Page>

        {/* 2 ───────────────────────────────────────────────────────────────────────────────── */}
        <Page n="2" title="End to end" note="in the order a customer meets it">
          <Spine nodes={nodes} />
        </Page>

        {/* 3 ───────────────────────────────────────────────────────────────────────────────── */}
        <Page n="3" title="Output metrics" note="results — nobody can work on these directly">
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
            <Stat label="Signed in, all time" value={cum.signed_in}
                  sub={cum.installed ? `of ${money(cum.installed)} installs` : null} />
            <Stat label="Calls answered" value={m.calls_answered_week} sub="this week" />
            <Stat label="Stayed 5+ days" value={cum.retained} sub="the only durable number here" />
            <Stat label="Entitled now" value={rev?.entitled_now}
                  sub={rev ? `${rev.entitled_paid ?? 0} paid · ${rev.entitled_granted ?? 0} referral` : null} />
            <Stat label="D7 retention" value={m.d7?.answered_pct} unit="%"
                  sub={m.d7?.cohort ? `n=${m.d7.cohort} — read the cohort first` : null} />
          </div>
        </Page>

        {/* 4 ───────────────────────────────────────────────────────────────────────────────── */}
        <Page n="4" title="Controllable input metrics" note="the levers — next week's work moves these">
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
            <Stat label="Activation" value={activation} unit="%" sub="installed → signed in" />
            <Stat label="Time to first answer" value={m.time_to_first_answer_hours} unit="h" sub="median" />
            <Stat label="Answers per user" value={m.answers_per_active_user_week} sub="per week — depth" />
            <Stat label="Referring" value={ref?.participation_pct} unit="%"
                  sub={ref ? `k = ${ref.k_factor ?? "—"}` : null} />
            <Stat label="Active this week" value={m.active_devices_week} sub="devices that opened" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(272px, 1fr))",
                        gap: "30px 34px", marginTop: 34 }}>
            {[["Signups", "signups", false, null],
              ["Calls answered", "calls_answered", false, null],
              ["App opens", "app_opens", false, null],
              ["Deletions", "deletions", true, "down is good"],
              ["Delete screen opened", "deletions_initiated", true, "intent, not the act"],
              ["Logouts", "logouts", true, "not churn until it fails to reverse"]]
              .filter(([, k]) => s[k]?.weeks?.length)
              .map(([title, k, invert, note]) => (
                <Figure key={k} title={title} kind="input" invert={invert} note={note}
                        weeks={s[k].weeks || []} months={s[k].months || []}
                        exception={exceptions.some((e) => e.name === title && e.sig.bad)} />
              ))}
          </div>
          <div style={{ fontFamily: SANS, fontSize: 9.5, color: P.ink3, marginTop: 20, lineHeight: 1.6 }}>
            {series
              ? "Every figure is drawn to the same format on purpose: solid is the last six weeks, dashed is the six before it, and the box score underneath reads the same three ratios in the same three columns. The second pane opens once there are twelve months of history to put in it."
              : "Trend figures load with the time series."}
          </div>
        </Page>

        {/* 5 ───────────────────────────────────────────────────────────────────────────────── */}
        <Page n="5" title="Exceptions" note="variances only — the rest is nominal">
          {exceptions.length === 0 ? (
            <div style={{ fontFamily: SANS, fontSize: 11.5, color: P.ink2, maxWidth: 620, lineHeight: 1.7 }}>
              Nothing moved more than 2σ from its six-week trend. Quiet is information: it means no
              one has to explain anything this week, and the meeting can be short.
            </div>
          ) : (
            <div>
              {exceptions.map(({ name, sig }, i) => (
                <Marked key={name} on={sig.bad}>
                  <div style={{ padding: "10px 0", borderBottom: `1px solid ${P.rule}` }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                      <span style={{ fontFamily: SERIF, fontSize: 15, color: P.ink3, ...NUM }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span style={{ fontFamily: SANS, fontSize: 12.5, color: P.ink }}>
                        {describe(name, sig)}
                      </span>
                    </div>
                    {/* A WBR line is not closed by noticing it. The owner speaks to it, and if they
                        cannot, the answer is "we are still analysing" — never a guess. */}
                    <div style={{ fontFamily: SANS, fontSize: 10, color: P.ink3, marginTop: 5,
                                  display: "flex", gap: 26 }}>
                      <span>Owner ································</span>
                      <span>Cause ····································</span>
                    </div>
                  </div>
                </Marked>
              ))}
            </div>
          )}
        </Page>

        {/* 6 ───────────────────────────────────────────────────────────────────────────────── */}
        <Page n="6" title="Voice of the customer" note="anecdotes, in their words">
          <div style={{ fontFamily: SANS, fontSize: 11.5, color: P.ink2, maxWidth: 640, lineHeight: 1.7 }}>
            Data and anecdote are a check on one another. When they agree the picture is settled;
            when they disagree, one of them is measuring the wrong thing and it is worth finding out
            which. These are the reasons people gave on the delete screen, in the wording they were
            shown.
          </div>
          {reasons.length === 0 ? (
            <div style={{ fontFamily: SANS, fontSize: 11.5, color: P.ink3, marginTop: 14 }}>
              No exit reasons recorded yet. That is a collection which has just started, not a zero.
            </div>
          ) : (
            <div style={{ marginTop: 16, maxWidth: 560 }}>
              <Rule weight="strong" />
              {reasons.map(([k, n]) => (
                <div key={k} style={{ display: "flex", alignItems: "baseline", gap: 12,
                                      padding: "8px 0", borderBottom: `1px solid ${P.rule}` }}>
                  <span style={{ fontFamily: SANS, fontSize: 12, color: P.ink, flex: 1 }}>
                    “{REASON_LABEL[k] || k}”
                  </span>
                  <span style={{ fontFamily: SERIF, fontSize: 17, color: P.ink, ...NUM }}>{n}</span>
                </div>
              ))}
            </div>
          )}
        </Page>

        <Rule weight="strong" style={{ marginTop: 52 }} />
        <div style={{ fontFamily: SANS, fontSize: 9.5, color: P.ink3, marginTop: 10, lineHeight: 1.6 }}>
          Every figure on this page is measured, never modelled. Where two numbers come from
          different systems the conversion between them is left blank rather than estimated, and a
          stage we have not measured prints “—” rather than nought.
        </div>
      </div>
    </div>
  );
}
