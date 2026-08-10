/**
 * /admin/guide — a plain-English guide to the /admin metrics, for marketers and sales.
 * Static (no live data): methodology + a worked example, so it stays true as the numbers move.
 * Example figures are labelled "example" and rounded — read the live values on /admin.
 */
export const metadata = { title: "How to read the Tring metrics", robots: { index: false } };

const INK = "#FFF0EB", SUB = "#B7A79D", MUTED = "#8C7C73", CORAL = "#F4532E", GREEN = "#3FBF7F", AMBER = "#FFB454";
const BG = "#000000", CARD = "#0B0B0C", BORDER = "1px solid rgba(255,255,255,.08)";

function Card({ children, style }) {
  return <div style={{ background: CARD, border: BORDER, borderRadius: 16, padding: 22, ...style }}>{children}</div>;
}
function H({ children, sub }) {
  return (
    <div style={{ margin: "40px 0 14px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: -0.3 }}>{children}</h2>
      {sub && <div style={{ fontSize: 14, color: MUTED, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
function Metric({ name, plain, tring, action, color }) {
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: color || "#fff" }}>{name}</div>
      <div style={{ fontSize: 14, color: INK, marginTop: 8, lineHeight: 1.55 }}>{plain}</div>
      {tring && <div style={{ fontSize: 13.5, color: SUB, marginTop: 8, lineHeight: 1.55 }}><strong style={{ color: INK }}>In Tring:</strong> {tring}</div>}
      {action && <div style={{ fontSize: 13.5, color: GREEN, marginTop: 8, lineHeight: 1.5 }}>→ {action}</div>}
    </Card>
  );
}

export default function Guide() {
  const bar = (label, val, pct, warn) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
        <span style={{ color: INK }}>{label}</span><span style={{ color: SUB }}>{val}</span>
      </div>
      <div style={{ height: 20, background: "rgba(255,255,255,.05)", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: warn ? AMBER : CORAL, borderRadius: 6 }} />
      </div>
    </div>
  );
  return (
    <div style={{ minHeight: "100vh", background: BG, color: INK, padding: "48px 20px", fontFamily: "inherit" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        <a href="/admin" style={{ color: MUTED, fontSize: 13, textDecoration: "none" }}>← Back to dashboard</a>
        <h1 style={{ fontSize: 34, fontWeight: 800, color: "#fff", margin: "12px 0 6px", letterSpacing: -0.6 }}>
          How to read the Tring numbers
        </h1>
        <div style={{ fontSize: 15, color: SUB }}>A guide for marketing &amp; sales · no jargon · the dashboard updates itself every 10 minutes</div>

        {/* mental model */}
        <H sub="Every number answers one of these. Nothing else to memorise.">The whole dashboard in 3 questions</H>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[["1 · How many people?", "Reach — installs, signups, active users.", CORAL],
            ["2 · How far did they get?", "The funnel — did they actually start using Tring, or leave?", AMBER],
            ["3 · Did they come back?", "Stickiness — a one-time open is not a user.", GREEN]].map(([t, d, c]) => (
            <Card key={t} style={{ flex: "1 1 220px" }}>
              <div style={{ color: c, fontWeight: 800, fontSize: 15 }}>{t}</div>
              <div style={{ color: SUB, fontSize: 13.5, marginTop: 6, lineHeight: 1.5 }}>{d}</div>
            </Card>
          ))}
        </div>

        {/* Priya */}
        <H sub="Follow one real user and every number will make sense.">Meet Priya — one user, end to end</H>
        <Card>
          <div style={{ fontSize: 14, color: INK, lineHeight: 1.6, marginBottom: 14 }}>
            Priya sees your WhatsApp forward, taps the link, and here is exactly what she feeds on the dashboard:
          </div>
          {[["Taps “Get on Play Store”", "Play click"],
            ["Installs Tring", "Installed"],
            ["Opens the app", "Opened + she is a DAU today"],
            ["Enters her number, gets an OTP", "Requested OTP"],
            ["Types the code", "Signed in ← she is now a REAL user"],
            ["Finishes setup, forwarding turns on", "Onboarded + Forwarding on"],
            ["Comes back 3 days later", "Now part of WAU and MAU"]].map(([a, b], i) => (
            <div key={i} style={{ display: "flex", gap: 14, padding: "9px 0", borderBottom: i < 6 ? "1px solid rgba(255,255,255,.06)" : "none" }}>
              <div style={{ width: 24, color: MUTED, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: "1 1 50%", color: INK, fontSize: 14 }}>{a}</div>
              <div style={{ flex: "1 1 40%", color: CORAL, fontSize: 13.5, fontWeight: 600 }}>{b}</div>
            </div>
          ))}
          <div style={{ fontSize: 14, color: INK, marginTop: 16, padding: 14, background: "rgba(244,83,46,.08)", borderRadius: 10, lineHeight: 1.55 }}>
            <strong>The entire job of marketing &amp; sales</strong> is getting more Priyas from step 1 to step 6 — and back for step 7.
          </div>
        </Card>

        {/* the two MAU numbers */}
        <H sub="The one thing that confuses everyone.">Why MAU shows two numbers (127 and “244 incl. test”)</H>
        <Card>
          <div style={{ fontSize: 14.5, color: INK, lineHeight: 1.65 }}>
            The raw count includes <strong style={{ color: AMBER }}>robots, not people</strong> — our own build machines,
            phone emulators used in testing, and Apple’s review team (who sit in the US). On an India-only app,
            roughly <strong>half</strong> the raw number is this test traffic.
            <div style={{ display: "flex", gap: 20, marginTop: 16, flexWrap: "wrap" }}>
              <div><div style={{ fontSize: 30, fontWeight: 800, color: GREEN }}>127</div><div style={{ color: SUB, fontSize: 13 }}>real Indians — <strong>quote this</strong></div></div>
              <div><div style={{ fontSize: 30, fontWeight: 800, color: MUTED }}>244</div><div style={{ color: SUB, fontSize: 13 }}>incl. test — never quote alone</div></div>
            </div>
            <div style={{ marginTop: 14, color: SUB, fontSize: 13.5 }}>
              (Example figures — read the live values on the dashboard.) The small “incl. test” number under each
              tile is only there so nobody thinks we’re hiding it. <strong style={{ color: INK }}>Always talk in the real-India number.</strong>
            </div>
          </div>
        </Card>

        {/* the funnel */}
        <H sub="The most important picture on the dashboard — read it as a leaking bucket.">The funnel: where you lose people (and money)</H>
        <Card>
          {bar("Installed", "140", 100)}
          {bar("Opened", "140 · 100% of installs", 100)}
          {bar("Signed in", "46 · ~50% — half leave here", 33, true)}
          <div style={{ fontSize: 14, color: INK, marginTop: 12, lineHeight: 1.6 }}>
            Wherever a bar suddenly gets shorter, <strong>that’s where you’re losing customers.</strong> Right now the
            leak is between “Opened” and “Signed in” — people open Tring, then bail at the phone-number / OTP screen.
          </div>
          <div style={{ fontSize: 13.5, color: GREEN, marginTop: 10 }}>
            → Fixing that one screen turns installs you already paid for into real users — cheaper than buying more installs.
          </div>
          <div style={{ fontSize: 12.5, color: MUTED, marginTop: 12 }}>
            (The later steps — Onboarded, Forwarding — read 0 today only because they’re brand-new measurements that
            start recording in the next app release, not because nobody does them.)
          </div>
        </Card>

        {/* every metric */}
        <H sub="What each tile means, in Priya terms, and what to do about it.">Every metric, plain English</H>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
          <Metric name="Installed" color={CORAL} plain="Phones that installed the app — real people and test robots mixed together." tring="~260, but only ~140 are real Indians." />
          <Metric name="Signed in" color={GREEN} plain="People who actually typed the OTP and became real users. Your truest ‘customers’ number." tring="~47." action="This is the number to grow." />
          <Metric name="Activation %" color={AMBER} plain="Out of everyone who installs, how many finish signing in." tring="~18% — so 82 of every 100 installers leave before Tring does anything." action="Biggest opportunity: fix the sign-in step." />
          <Metric name="DAU / WAU / MAU" plain="People active in the last Day / Week / Month. DAU = ‘how busy today’, MAU = ‘how big this month’." tring="~16 / ~49 / ~127." />
          <Metric name="Stickiness" plain="DAU ÷ MAU — of everyone active this month, how many are active today. Higher = people rely on it." tring="~13%. Watch it grow over time." />
          <Metric name="Sessions / person" plain="How many times a real user opens Tring per month." tring="~15 — healthy; they’re not installing and forgetting." />
        </div>

        {/* screens panel */}
        <H sub="You asked what ‘$screen · by views’ means — here it is.">The “Screens” panel</H>
        <Card>
          <div style={{ fontSize: 14.5, color: INK, lineHeight: 1.65 }}>
            It shows which screens people look at most. A row like <code style={{ color: CORAL }}>home · 4,501 · 130p</code> reads as:
            <div style={{ margin: "12px 0", paddingLeft: 14, borderLeft: `2px solid ${CORAL}` }}>
              <div style={{ color: INK }}><strong>4,501</strong> = total views of the home screen</div>
              <div style={{ color: INK }}><strong>130p</strong> = 130 different people saw it</div>
            </div>
            The trick is comparing the <strong>people</strong> counts. <code style={{ color: AMBER }}>login_phone · 166p</code> shows
            <strong> more</strong> people than <code>home · 130p</code> — because <strong>everyone</strong> hits the login screen,
            but ~36 of them leave before ever reaching home. <strong style={{ color: INK }}>That 166 → 130 gap is a drop-off,</strong>
            and it’s the same story the funnel tells: we lose people at sign-in.
          </div>
        </Card>

        {/* every other panel */}
        <H sub="A one-line meaning for every remaining box on the dashboard.">The rest of the panels</H>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
          <Metric name="Retention" color={GREEN} plain="Of the people who joined in a given week, how many are still opening the app 1, 2, 4 weeks later." tring="This is the real ‘are we keeping people’ chart. A flat-ish line after week 1 = a real habit. A line that falls to zero = people try it once and leave." action="The number that decides if growth compounds or leaks." />
          <Metric name="Drop-off" color={AMBER} plain="Where in the journey people quit — the same story as the funnel, said as ‘X% never reach the next step’." tring="Ours points at the sign-in step." action="Attack the biggest drop first." />
          <Metric name="Product events" plain="Actions WE chose to track — took over a call, enabled caller ID, referred a friend. Unlike screens, these are real intent." tring="Small numbers today because tracking was only just re-added; they grow with the next release." />
          <Metric name="“stale” tag" color={AMBER} plain="An event that has fired NOTHING for 7+ days. It means either a feature was removed, or tracking broke — a warning light, not a user number." tring="Most stale rows are old features from before the app rebuild." action="Ignore for marketing; it’s a health check for engineering." />
          <Metric name="Engagement & lifecycle" plain="Feature pickup (caller ID, favourites, referrals) and churn (logged out, deleted account) — what people DO once they’re in." tring="Referrals here = your word-of-mouth engine; deletions = your leak." />
          <Metric name="Top events" plain="Raw counts of everything, mostly automatic ($screen, $autocapture, Application Opened). Plumbing, not a KPI." tring="Useful for engineers checking data flows — not a number to report." />
          <Metric name="Sessions" plain="How many separate times the app was opened. ‘Per person’ tells you if people come back within a day." tring="~15/person/month = a used app, not a dead install." />
          <Metric name="By country" color={CORAL} plain="India vs everywhere-else. On an India-only app, ‘everywhere else’ is almost entirely test infrastructure." tring="India = your real market; US = robots. This is what the ‘incl. test’ split is built from." />
        </div>

        {/* map */}
        <H sub="Where Tring already spreads by word of mouth.">The map &amp; states</H>
        <Card>
          <div style={{ fontSize: 14.5, color: INK, lineHeight: 1.65 }}>
            Delhi, Himachal, UP and Haryana lead. Two ways to use this:
            <ul style={{ margin: "10px 0 0", paddingLeft: 20, color: SUB, lineHeight: 1.7 }}>
              <li><strong style={{ color: INK }}>Double down</strong> where you’re already strong — referral pushes, local WhatsApp groups, regional-language creative.</li>
              <li><strong style={{ color: INK }}>Or test a new state</strong> and watch whether a new bar appears on the map next week.</li>
            </ul>
          </div>
        </Card>

        {/* weekly */}
        <H sub="Put these in a weekly message to the team. Ignore the rest.">The only 3 numbers that matter weekly</H>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[["Signed-in users", "Real customers. Growing week over week?", GREEN],
            ["Activation %", "Every point up = free users from the same ad spend.", AMBER],
            ["Signups by source", "Which channel brings people who sign in, not just click.", CORAL]].map(([t, d, c]) => (
            <Card key={t} style={{ flex: "1 1 220px" }}>
              <div style={{ color: c, fontWeight: 800, fontSize: 15 }}>{t}</div>
              <div style={{ color: SUB, fontSize: 13.5, marginTop: 6, lineHeight: 1.5 }}>{d}</div>
            </Card>
          ))}
        </div>

        {/* founder line */}
        <H>The one-paragraph version for a busy founder</H>
        <Card style={{ borderColor: "rgba(244,83,46,.3)" }}>
          <div style={{ fontSize: 15, color: INK, lineHeight: 1.7, fontStyle: "italic" }}>
            “260 installs, but only ~140 are real Indians — the rest are test machines. Of those, ~47 signed in and
            became users (18% activation). They open the app ~15×/month and cluster in Delhi, Himachal, UP and Haryana.
            <strong style={{ color: "#fff", fontStyle: "normal" }}> Our biggest lever isn’t more installs — it’s fixing the sign-in step, where we lose 4 out of 5 people.”</strong>
          </div>
        </Card>

        {/* cheat sheet */}
        <H>Cheat sheet</H>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 560 }}>
              <thead><tr>
                {["Metric", "Plain meaning", "What to do"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", color: MUTED, fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", borderBottom: BORDER }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[["Installed", "Downloaded the app (incl. test robots)", "Watch the India-only cut, not the raw number"],
                  ["Signed in", "Real users (finished OTP)", "Grow this — it’s the real customer count"],
                  ["Activation %", "Install → signed in", "Fix sign-in; biggest lever for more users"],
                  ["MAU", "Active this month (real India)", "Report the 127, never the 244"],
                  ["Stickiness", "Daily ÷ monthly actives", "Should rise as people keep the app"],
                  ["Screens", "Which screens people see, by people", "Big people-drops = where users leave"],
                  ["States / map", "Where users are", "Double down or test new regions"]].map((r, i) => (
                  <tr key={i}>{r.map((c, j) => (
                    <td key={j} style={{ padding: "11px 16px", borderBottom: "1px solid rgba(255,255,255,.06)", color: j === 0 ? "#fff" : j === 2 ? GREEN : SUB, fontWeight: j === 0 ? 700 : 400 }}>{c}</td>
                  ))}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div style={{ fontSize: 12.5, color: MUTED, margin: "32px 0 8px", textAlign: "center" }}>
          Numbers on the live dashboard refresh automatically every 10 minutes. Example figures here are rounded and illustrative.
        </div>
        <div style={{ textAlign: "center" }}>
          <a href="/admin" style={{ color: CORAL, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>← Back to the live dashboard</a>
        </div>
      </div>
    </div>
  );
}
