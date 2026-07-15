import LegalHeader from "../components/LegalHeader";
import Footer from "../components/Footer";
import { Arrow } from "../components/Icons";

export const metadata = {
  title: "Terms of Service — Tring",
  description: "The terms governing your use of Tring, operated by Mavrix AI Private Limited.",
  alternates: { canonical: "https://heytring.com/terms" },
};

export default function Terms() {
  return (
    <>
      <LegalHeader />
      <main className="legal">
        <div className="legal__wrap">
          <a className="back" href="/"><Arrow style={{ transform: "rotate(180deg)" }} /> Home</a>
          <h1>Terms of Service</h1>
          <p className="updated">Last updated: 13 July 2026</p>

          <h2 style={{ borderTop: "none", paddingTop: 0, marginTop: 34 }}>Agreement to our legal terms</h2>
          <p>
            We are <strong>Mavrix AI Private Limited</strong> (&ldquo;Company,&rdquo;
            &ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;), a company incorporated in
            India under the Companies Act, 2013 (CIN <strong>U62099KA2025PTC210316</strong>),
            with its registered office at <strong>No. 8/3, Prince Ville, Challaghatta Village,
            Domlur, Bangalore North, Bangalore – 560071, Karnataka, India</strong>.
          </p>
          <p>
            We operate the website <a href="https://heytring.com">https://heytring.com</a> (the
            &ldquo;Site&rdquo;) and the <strong>Tring</strong> mobile apps for Android and iOS,
            together with all related products and services that link to these terms
            (collectively, the &ldquo;Services&rdquo;). Tring is a personal AI phone assistant;
            its assistant is named <strong>Ring</strong>. Delegate the calls you don&rsquo;t want
            to pick up — spam, deliveries, vendors, routine errands — to Ring, and get on with
            your day.
          </p>
          <p>You can contact us at <a href="mailto:customer@heytring.com">customer@heytring.com</a> or via <a href="https://heytring.com">https://heytring.com</a>.</p>
          <p>
            These Terms are a legally binding agreement between you and Mavrix AI Private Limited.
            <strong> By accessing or using the Services, you agree to be bound by all of these
            Terms. If you do not agree, you must not use the Services.</strong> We may update
            these Terms at any time; the &ldquo;Last updated&rdquo; date reflects the latest
            version, and your continued use after changes means you accept them.
          </p>
          <p>The Services are intended for users <strong>at least 18 years old.</strong> Persons under 18 may not use or register.</p>

          <h2>1. What &ldquo;Tring&rdquo; means, and how it works</h2>
          <p><em>Tring-tring</em> is the sound a telephone makes when it rings in India — the sound of someone trying to reach you. Tring is the assistant that answers it for you.</p>
          <p><strong>End to end:</strong> a caller dials you → you don&rsquo;t pick up → your carrier diverts the call to your Tring number → Ring answers in seconds, talks to the caller in their language, and finds out what they need → you get a notification when the call starts, a live transcript you can watch, rolling &ldquo;so far&rdquo; updates, and one-tap <strong>Take over</strong> to jump in → when the call ends you get a wrap-up note. The reverse works too: tell Ring who to call and what you need, and it dials, handles it, and reports back. Spam never reaches you; important people always do.</p>

          <h2>2. Eligibility and your responsibilities</h2>
          <p>By using the Services you represent that: (1) you have legal capacity and agree to these Terms; (2) you are at least 18; (3) you will not use the Services through automated, non-human means except as normally provided; (4) you will not use the Services for any illegal or unauthorised purpose; and (5) your use will not violate any applicable law.</p>
          <p><strong>You may only connect phone numbers that belong to you.</strong> Diverting someone else&rsquo;s number to Tring is prohibited.</p>

          <h2>3. Our services and licence</h2>
          <p>Subject to these Terms, we grant you a non-exclusive, non-transferable, revocable licence to access and use the Services for your personal, non-commercial use (or your internal business use where you subscribe to Tring for Business). We own or license all intellectual property in the Services — software, designs, text, audio, trademarks, and logos (&ldquo;Content&rdquo; and &ldquo;Marks&rdquo;) — and reserve all rights not expressly granted.</p>

          <h2>4. Prohibited activities</h2>

          <h3>4.1 No marketing, telemarketing or promotional calls — zero tolerance</h3>
          <p>
            <strong>Tring is a personal assistant. It must never be used to make marketing,
            promotional, telemarketing, sales, survey, political, or bulk/automated calls of any
            kind — to anyone, ever.</strong> Using an AI voice to place unsolicited commercial
            calls is <strong>illegal in India</strong> under the TRAI Telecom Commercial
            Communications Customer Preference Regulations (TCCCPR) and the Do Not Disturb (DND)
            framework, and it exposes both you and us to regulatory penalties, telecom
            disconnection, and criminal liability.
          </p>
          <p>This is not a policy we balance against other things:</p>
          <ul>
            <li><strong>Any account used for such calls is terminated immediately, without notice or refund</strong>, and the numbers involved are permanently barred from the Services.</li>
            <li>We will report unlawful campaigns to the relevant telecom operator and authorities and cooperate fully with them, including disclosing your account records where legally required.</li>
            <li>You are solely liable for every consequence of such use, including any penalty, claim, or disconnection suffered by us, and you indemnify us for it in full.</li>
          </ul>
          <p>
            Ring is built to <em>stop</em> unwanted calls reaching people. Using it to make them is
            the exact opposite of what this product is for.
          </p>

          <h3>4.2 Everything else you must not do</h3>
          <p>You agree not to use the Services to:</p>
          <ul>
            <li>break any applicable law or transmit content that is harassing, defamatory, obscene, hateful, harmful, or fraudulent;</li>
            <li><strong>impersonate any real person, or clone or imitate any voice that is not your own</strong>;</li>
            <li>phish for OTPs, passwords, or financial details, or attempt any scam or social-engineering call;</li>
            <li>place calls to numbers you have no legitimate personal reason to call, or to numbers registered on the DND/NCPR registry for any commercial purpose;</li>
            <li>record any person unlawfully;</li>
            <li>interfere with, disrupt, reverse-engineer, decompile, or place undue burden on the Services or their security features;</li>
            <li>scrape or systematically harvest data from the Services;</li>
            <li>use the Services to compete with us or for any unauthorised commercial purpose.</li>
          </ul>
          <p>Any breach may result in immediate suspension or termination.</p>

          <h2>5. AI disclaimer</h2>
          <p>Ring is an AI assistant. It may occasionally misinterpret a caller&rsquo;s intent, tone, or context, and <strong>it cannot verify or authenticate any caller&rsquo;s identity, legitimacy, or intent.</strong> Summaries and notes are generated from the call transcript and provided for convenience — <strong>review anything important yourself before acting on it.</strong> Ring&rsquo;s output is not legal, medical, or financial advice.</p>

          <h2>6. Voice cloning</h2>
          <p>If you enable voice cloning, Ring uses <strong>instant (zero-shot) cloning</strong> on an existing pre-trained speech model conditioned by your voice sample. <strong>We never train any model on your voice or call audio.</strong> You may clone <strong>only your own voice</strong>, with your in-app consent; cloning or imitating anyone else&rsquo;s voice is prohibited and grounds for immediate termination. Full detail is in our <a href="/privacy#voice">Privacy Policy (§5)</a>.</p>

          <h2>7. Subscriptions &amp; billing</h2>
          <h3>Plans</h3>
          <p><strong>Tring is free.</strong> Everything that makes Tring Tring costs nothing:</p>
          <ul>
            <li>Call screening with live transcript</li>
            <li>Take over live calls</li>
            <li>Outbound errands (&ldquo;Ask Ring to call&rdquo;)</li>
            <li>Wrap-up notes &amp; full call history</li>
            <li>Mid-call live summary notifications</li>
            <li>Spam blocking &amp; caller ID</li>
            <li>Favourites priority ring-through</li>
            <li>Multilingual assistant (English + Hindi)</li>
          </ul>
          <p><strong>Paid — Tring Plus</strong> adds only the extras:</p>
          <table>
            <thead><tr><th>Paid feature</th><th>What it is</th></tr></thead>
            <tbody>
              <tr><td>Instant voice cloning</td><td>Ring answers in a voice like yours (§6)</td></tr>
              <tr><td>Extra assistant templates</td><td>additional ready-made personas and screening styles</td></tr>
              <tr><td>Custom templates</td><td>design your own assistant persona, greetings, and call scripts</td></tr>
              <tr><td>Tring for Business</td><td>business lines, teams, and business-hours reception</td></tr>
            </tbody>
          </table>
          <p><em>Pricing is shown in-app at purchase and may change with notice.</em></p>
          <h3>Billing</h3>
          <ul>
            <li><strong>Android:</strong> billed via Google Play / Razorpay in Indian Rupees, inclusive of GST.</li>
            <li><strong>iOS:</strong> billed via Apple In-App Purchase; one free trial per Apple ID.</li>
            <li>Subscriptions <strong>auto-renew</strong> unless cancelled at least 24 hours before the end of the current billing period, from your Play Store / App Store subscription settings.</li>
          </ul>
          <h3>Cancellation</h3>
          <p>
            You can cancel anytime from your Play Store / App Store subscription settings. You keep
            paid features until the end of the period you have already paid for; we don&rsquo;t claw
            anything back mid-period. Cancelling stops the next renewal — it is not itself a refund
            request.
          </p>

          {/* id="refunds" — the app's Settings → Legal → Refund policy row links to /terms#refunds */}
          <h2 id="refunds">8. Refund policy</h2>
          <p>
            Tring Plus is a <strong>digital subscription</strong>, delivered instantly on purchase.
            We keep this simple and fair.
          </p>

          <h3>8.1 When you get a refund</h3>
          <p>We refund in full, no questions asked, when:</p>
          <ul>
            <li><strong>A paid feature never unlocked.</strong> You paid and voice cloning / templates / business features didn&rsquo;t activate.</li>
            <li><strong>You were charged twice</strong> for the same period, or charged after you cancelled.</li>
            <li><strong>A technical fault on our side</strong> made the paid features unusable for a meaningful part of your billing period and we couldn&rsquo;t fix it after you told us.</li>
            <li><strong>You were charged in error</strong> — a plan you didn&rsquo;t pick, or a price you weren&rsquo;t shown.</li>
            <li><strong>The law requires it</strong>, including your rights under Indian consumer law.</li>
          </ul>

          <h3>8.2 What we don&rsquo;t refund</h3>
          <ul>
            <li>Periods you have already used the paid features for. Cancelling on day 28 of a month doesn&rsquo;t refund that month — it stops the next one.</li>
            <li>Change of mind after substantial use of a paid feature (for example, cloning your voice and using it across a month of calls).</li>
            <li>Charges older than 30 days, unless the law says otherwise.</li>
            <li>Anything not paid to us — see 8.4.</li>
          </ul>

          <h3>8.3 How to ask, and how long it takes</h3>
          <p>
            Email <a href="mailto:customer@heytring.com">customer@heytring.com</a> from your
            registered email or phone with the date, amount, and what went wrong. We aim to:
          </p>
          <ul>
            <li><strong>acknowledge within 24 hours</strong>,</li>
            <li><strong>decide within 3 business days</strong>, and</li>
            <li>where approved, <strong>return the money within 7–10 business days</strong> to the original payment method (your bank may take a further cycle to display it).</li>
          </ul>
          <p>
            If we say no, we tell you plainly why, and you can ask us to look again. In any event we
            will resolve a complaint no later than 30 days from receipt, as required under the
            Consumer Protection (E-Commerce) Rules, 2020.
          </p>

          <h3>8.4 Store purchases (important)</h3>
          <p>
            Where you paid through <strong>Apple</strong> or <strong>Google Play</strong>, those
            stores — not us — hold the money and control refunds under their own policies:
          </p>
          <ul>
            <li><strong>iOS:</strong> request via Apple at <a href="https://reportaproblem.apple.com" target="_blank" rel="noopener noreferrer">reportaproblem.apple.com</a>. <strong>Only one free trial per Apple ID</strong>; cancel at least 24 hours before the trial ends to avoid being charged.</li>
            <li><strong>Android / Google Play:</strong> request via Play Store → Subscriptions, or contact us and we&rsquo;ll help you raise it.</li>
          </ul>
          <p>
            We will always advocate for you with the store, but we cannot force a refund the store
            declines. Where we billed you directly (Razorpay), the section above applies in full. We
            never see or store your card number, CVV, UPI PIN or net-banking credentials — those are
            handled only by Razorpay / Apple / Google on their own PCI-DSS-compliant systems.
          </p>

          <h3>8.5 Free plan</h3>
          <p>
            Everything core in Tring is free and always will be — call screening, take-over,
            errands, notes, spam blocking. If you never buy Tring Plus, there is nothing to refund.
          </p>

          <h2>9. Price and plan changes</h2>
          <p>
            We may change prices or what&rsquo;s in a plan. We&rsquo;ll tell you in-app before it
            affects you, and never change the price of a period you&rsquo;ve already paid for. If you
            don&rsquo;t accept a new price, cancel before it renews.
          </p>

          <h2>10. Term and termination</h2>
          <p>These Terms remain in effect while you use the Services. We may suspend or terminate your access at our discretion for breach of these Terms or any applicable law. You may stop using the Services and delete your account at any time (Privacy Policy §9).</p>

          <h2>11. Modifications and interruptions</h2>
          <p>We may change, suspend, or discontinue any part of the Services at any time without notice. We are not liable for any loss or inconvenience caused by unavailability, downtime, or discontinuance. We do not guarantee the Services will always be available or error-free.</p>

          <h2>12. Disclaimer and limitation of liability</h2>
          <p>The Services are provided <strong>&ldquo;as is&rdquo; and &ldquo;as available&rdquo;</strong> without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement. To the maximum extent permitted by law, Mavrix AI Private Limited is not liable for missed calls, miscommunication by the assistant, caller behaviour, or any indirect, incidental, or consequential losses — except in cases of proven gross negligence or wilful misconduct. <strong>Our total aggregate liability is limited to the subscription fees you paid in the 3 months before the claim.</strong></p>

          <h2>13. Indemnification</h2>
          <p>You agree to indemnify and hold Mavrix AI Private Limited harmless from any claims or losses arising from your misuse of the Services, your breach of these Terms, or your violation of any law or third-party right.</p>

          <h2>14. Governing law and dispute resolution</h2>
          <p>These Terms are governed by the laws of India. You and Mavrix AI Private Limited irrevocably agree that the <strong>courts of New Delhi, Delhi</strong> shall have <strong>exclusive jurisdiction</strong> over any dispute arising in connection with these Terms.</p>

          <h2>15. Privacy</h2>
          <p>Your use of the Services is also governed by our <strong><a href="/privacy">Privacy Policy</a></strong> (published at <a href="https://heytring.com/privacy">https://heytring.com/privacy</a>), incorporated into these Terms by reference. The Services are hosted in India; by using them you consent to your data being processed in India.</p>

          <h2>16. Grievances and contact</h2>
          <p>
            <strong>Mavrix AI Private Limited</strong> (CIN U62099KA2025PTC210316)<br />
            No. 8/3, Prince Ville, Challaghatta Village, Domlur, Bangalore North,<br />
            Bangalore – 560071, Karnataka, India<br />
            <a href="mailto:customer@heytring.com">customer@heytring.com</a> — <a href="https://heytring.com">https://heytring.com</a>
          </p>
          <p>Grievances are acknowledged within 24 hours and resolved within the timelines of the Information Technology Act, 2000 and the DPDP Act, 2023.</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
