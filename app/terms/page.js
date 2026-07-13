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
          <p>You agree not to use the Services to:</p>
          <ul>
            <li>break any applicable law or transmit content that is harassing, defamatory, obscene, hateful, harmful, or fraudulent;</li>
            <li><strong>impersonate any real person, or clone or imitate any voice that is not your own</strong>;</li>
            <li>phish for OTPs, passwords, or financial details;</li>
            <li>spam, telemarket, robocall, or place bulk automated calls;</li>
            <li>record any person unlawfully;</li>
            <li>interfere with, disrupt, reverse-engineer, decompile, or place undue burden on the Services or their security features;</li>
            <li>scrape or systematically harvest data from the Services;</li>
            <li>use the Services to compete with us or for any unauthorised commercial purpose.</li>
          </ul>
          <p>Any breach may result in suspension or termination.</p>

          <h2>5. AI disclaimer</h2>
          <p>Ring is an AI assistant. It may occasionally misinterpret a caller&rsquo;s intent, tone, or context, and <strong>it cannot verify or authenticate any caller&rsquo;s identity, legitimacy, or intent.</strong> Summaries and notes are generated from the call transcript and provided for convenience — <strong>review anything important yourself before acting on it.</strong> Ring&rsquo;s output is not legal, medical, or financial advice.</p>

          <h2>6. Voice cloning</h2>
          <p>If you enable voice cloning, Ring uses <strong>instant (zero-shot) cloning</strong> on an existing pre-trained speech model conditioned by your voice sample. <strong>We never train any model on your voice or call audio.</strong> You may clone <strong>only your own voice</strong>, with your in-app consent; cloning or imitating anyone else&rsquo;s voice is prohibited and grounds for immediate termination. Full detail is in our <a href="/privacy#voice">Privacy Policy (§5)</a>.</p>

          <h2>7. Subscriptions, billing, cancellation &amp; refunds</h2>
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
          <h3>Cancellation &amp; refunds</h3>
          <p>You can cancel anytime; you retain access to paid features until the end of the paid period. <strong>Refunds</strong> are provided where a paid feature failed to unlock, you were charged in duplicate, or where required by law — processed within 7–10 business days. Apple purchases follow Apple&rsquo;s refund process. We may change prices and plans with notice; changes do not affect the period you have already paid for.</p>

          <h2>8. Term and termination</h2>
          <p>These Terms remain in effect while you use the Services. We may suspend or terminate your access at our discretion for breach of these Terms or any applicable law. You may stop using the Services and delete your account at any time (Privacy Policy §9).</p>

          <h2>9. Modifications and interruptions</h2>
          <p>We may change, suspend, or discontinue any part of the Services at any time without notice. We are not liable for any loss or inconvenience caused by unavailability, downtime, or discontinuance. We do not guarantee the Services will always be available or error-free.</p>

          <h2>10. Disclaimer and limitation of liability</h2>
          <p>The Services are provided <strong>&ldquo;as is&rdquo; and &ldquo;as available&rdquo;</strong> without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement. To the maximum extent permitted by law, Mavrix AI Private Limited is not liable for missed calls, miscommunication by the assistant, caller behaviour, or any indirect, incidental, or consequential losses — except in cases of proven gross negligence or wilful misconduct. <strong>Our total aggregate liability is limited to the subscription fees you paid in the 3 months before the claim.</strong></p>

          <h2>11. Indemnification</h2>
          <p>You agree to indemnify and hold Mavrix AI Private Limited harmless from any claims or losses arising from your misuse of the Services, your breach of these Terms, or your violation of any law or third-party right.</p>

          <h2>12. Governing law and dispute resolution</h2>
          <p>These Terms are governed by the laws of India. You and Mavrix AI Private Limited irrevocably agree that the <strong>courts of New Delhi, Delhi</strong> shall have <strong>exclusive jurisdiction</strong> over any dispute arising in connection with these Terms.</p>

          <h2>13. Privacy</h2>
          <p>Your use of the Services is also governed by our <strong><a href="/privacy">Privacy Policy</a></strong> (published at <a href="https://heytring.com/privacy">https://heytring.com/privacy</a>), incorporated into these Terms by reference. The Services are hosted in India; by using them you consent to your data being processed in India.</p>

          <h2>14. Grievances and contact</h2>
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
