import LegalHeader from "../components/LegalHeader";
import Footer from "../components/Footer";
import { Arrow } from "../components/Icons";

export const metadata = {
  title: "Delete your account — Tring",
  description:
    "How to delete your Tring (Mavrix AI Private Limited) account and associated data, and what is deleted or kept.",
  alternates: { canonical: "https://heytring.com/delete-account" },
};

export default function DeleteAccount() {
  return (
    <>
      <LegalHeader />
      <main className="legal">
        <div className="legal__wrap">
          <a className="back" href="/">
            <Arrow style={{ transform: "rotate(180deg)" }} /> Home
          </a>
          <h1>Delete your account &amp; data</h1>
          <p className="updated">Last updated: 15 July 2026</p>

          <p style={{ marginTop: 24 }}>
            This page explains how to delete your <strong>Tring</strong> account (the app whose AI
            assistant is named <strong>Ring</strong>), operated by{" "}
            <strong>Mavrix AI Private Limited</strong>, and exactly what data is deleted or kept when
            you do.
          </p>

          <h2>Option 1 — Delete inside the app (fastest)</h2>
          <ol style={{ paddingLeft: 20, margin: "0 0 16px" }}>
            <li>Open the <strong>Tring</strong> app.</li>
            <li>Go to <strong>Settings</strong>.</li>
            <li>Scroll to the bottom and tap <strong>Delete account &amp; data</strong>.</li>
            <li>
              Confirm when prompted. Your account and associated personal data are then permanently
              deleted.
            </li>
          </ol>

          <h2>Option 2 — Request by email</h2>
          <p>
            If you can&rsquo;t open the app, email{" "}
            <a href="mailto:customer@heytring.com">customer@heytring.com</a> from the account you
            signed up with, subject <strong>&ldquo;Delete my Tring account&rdquo;</strong>, and
            include the <strong>phone number</strong> registered to the account. We verify ownership
            and complete the deletion <strong>within 30 days</strong>.
          </p>

          <h2>What gets deleted</h2>
          <p>When your account is deleted, we permanently remove:</p>
          <ul>
            <li>Your account details — name, phone number, assistant language and preferences</li>
            <li>Call records — caller number/name, time, duration and outcome</li>
            <li>
              Recordings, transcripts, notes and summaries of the AI portion of calls Ring handled
              for you
            </li>
            <li>Synced contact names and numbers</li>
            <li>Your voice sample and voice clone (if you enabled voice cloning)</li>
            <li>Favourites and screening preferences</li>
            <li>Device push identifiers and app-usage/log data tied to your account</li>
          </ul>
          <p>
            We also remove the mapping between your identity and your call/task data, and instruct
            our AI service providers to delete any data retained on our behalf. Your data is never
            sold and is never used for advertising.
          </p>

          <h2>What is kept, and for how long</h2>
          <p>
            After deletion we retain only the <strong>minimum required by law</strong> — chiefly{" "}
            <strong>transaction, billing and tax/accounting records</strong> of any purchases — for
            the retention period required under applicable Indian law (e.g. the Income-tax and GST
            rules). This is held access-restricted, isolated from further processing, and deleted at
            the end of that period.
          </p>
          <div className="callout">
            <p>
              <strong>Deletion is permanent</strong> — once complete, your account and data cannot
              be recovered. Subscription and payment records held by <strong>Google Play</strong> or
              <strong> Apple</strong> are governed by those platforms&rsquo; own policies; cancel a
              subscription in the Play Store / App Store to stop future billing.
            </p>
          </div>

          <h2>Contact</h2>
          <p>
            <strong>Mavrix AI Private Limited</strong> (CIN U62099KA2025PTC210316)
            <br />
            No. 8/3, Prince Ville, Challaghatta Village, Domlur, Bangalore North,
            <br />
            Bangalore – 560071, Karnataka, India
            <br />
            <a href="mailto:customer@heytring.com">customer@heytring.com</a> —{" "}
            <a href="https://heytring.com">https://heytring.com</a>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
