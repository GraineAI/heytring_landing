import LegalHeader from "../components/LegalHeader";
import Footer from "../components/Footer";
import { Arrow } from "../components/Icons";

export const metadata = {
  title: "End User License Agreement (EULA) — Tring",
  description:
    "The licence governing your use of the Tring mobile app, operated by Mavrix AI Private Limited. Governed by the laws of India.",
  alternates: { canonical: "https://heytring.com/eula" },
};

export default function Eula() {
  return (
    <>
      <LegalHeader />
      <main className="legal">
        <div className="legal__wrap">
          <a className="back" href="/"><Arrow style={{ transform: "rotate(180deg)" }} /> Home</a>
          <h1>End User License Agreement</h1>
          <p className="updated">Last updated: 12 August 2026</p>

          <p style={{ marginTop: 24 }}>
            This End User License Agreement (&ldquo;<strong>EULA</strong>&rdquo; or
            &ldquo;Licence&rdquo;) is a legally binding agreement between you (&ldquo;you,&rdquo;
            &ldquo;your,&rdquo; the &ldquo;end user&rdquo;) and <strong>Mavrix AI Private
            Limited</strong> (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo;
            &ldquo;our&rdquo;), a company incorporated in India under the Companies Act, 2013
            (CIN <strong>U62099KA2025PTC210316</strong>), with its registered office at No. 8/3,
            Prince Ville, Challaghatta Village, Domlur, Bangalore North, Bangalore – 560071,
            Karnataka, India. It governs your download, installation, and use of the
            <strong> Tring</strong> mobile application for Android and iOS, including all software,
            updates, and over-the-air releases we make available (the &ldquo;<strong>App</strong>&rdquo;).
          </p>
          <p>
            <strong>By downloading, installing, or using the App, you agree to be bound by this
            EULA.</strong> If you do not agree, do not download, install, or use the App, and delete
            any copy you have. This EULA is <em>in addition to</em>, and incorporates by reference,
            our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>. Where
            this EULA speaks specifically to the software licence, it governs; for everything else —
            eligibility, acceptable use, subscriptions, refunds, liability, and grievances — the
            Terms of Service govern. Capitalised terms not defined here have the meaning given in the
            Terms of Service.
          </p>

          <h2 style={{ borderTop: "none", paddingTop: 0, marginTop: 34 }}>1. Licence, not a sale</h2>
          <p>
            The App is <strong>licensed to you, not sold.</strong> Subject to your continuing
            compliance with this EULA, we grant you a <strong>limited, personal, non-exclusive,
            non-transferable, non-sublicensable, revocable licence</strong> to install and use one
            copy of the App on a mobile device that you own or control, solely for your own
            personal, non-commercial use (or, where you subscribe to Tring for Business, your
            internal business use). All rights not expressly granted are reserved by us and our
            licensors.
          </p>

          <h2>2. Eligibility</h2>
          <p>
            The App is intended for users who are <strong>at least 18 years old</strong> and legally
            capable of entering into a binding contract under the Indian Contract Act, 1872. You may
            connect <strong>only phone numbers that belong to you.</strong> Full eligibility terms are
            in the <a href="/terms#top">Terms of Service (§2)</a>.
          </p>

          <h2>3. What you may not do</h2>
          <p>You must not, and must not permit any third party to:</p>
          <ul>
            <li>copy, modify, adapt, translate, or create derivative works of the App, except as expressly permitted by law that cannot be excluded by agreement;</li>
            <li>reverse-engineer, decompile, or disassemble the App, or attempt to derive its source code, except to the limited extent applicable law expressly permits despite this restriction;</li>
            <li>rent, lease, lend, sell, redistribute, sublicense, or transfer the App or your licence to it;</li>
            <li>remove, obscure, or alter any proprietary notices, or circumvent, disable, or interfere with security, licensing, or authentication features (including device-integrity / app-attestation checks);</li>
            <li>use the App to build a competing product, or to place marketing, telemarketing, promotional, bulk, or automated calls of any kind — which is prohibited and, in India, unlawful (see <a href="/terms#top">Terms §4</a>);</li>
            <li>use the App other than through the interfaces and within the usage rules we and the app stores provide.</li>
          </ul>
          <p>Any breach terminates this Licence automatically (see §11).</p>

          <h2>4. Ownership and intellectual property</h2>
          <p>
            The App and all intellectual property in it — software, designs, text, audio, models,
            trademarks, and logos — are owned by us or our licensors and are protected by Indian and
            international law. This EULA grants you no ownership interest, only the limited licence
            described above.
          </p>

          <h2>5. Automatic updates and over-the-air releases</h2>
          <p>
            The App improves through frequent <strong>over-the-air (OTA) updates</strong> delivered
            after you install it. <strong>You consent to the App automatically downloading and
            installing such updates,</strong> which may add, change, or remove features. This EULA
            applies to every updated version unless an update is accompanied by a separate licence,
            in which case that licence governs it. We are not obliged to provide any particular
            update, or to continue supporting older versions or devices.
          </p>

          <h2>6. Call handling, recording, and your consent obligations</h2>
          <p>
            The App is a call assistant: with your permission it answers, records, and transcribes
            the assistant portion of calls, reads caller ID, and can place calls you ask it to make.
            By enabling these features <strong>you instruct and consent to this processing.</strong>
          </p>
          <p>
            <strong>You are responsible for using the App lawfully</strong>, including obtaining any
            consent the law of your jurisdiction requires before a call is recorded or handled on
            your behalf. You must only screen calls to numbers that are yours, and must not use the
            App to record any person unlawfully. How call data is processed, stored, and deleted is
            described in our <a href="/privacy#recording">Privacy Policy — Call-recording notice
            (§8)</a>, and processing is carried out on the legal bases set out there under the
            <strong> Digital Personal Data Protection Act, 2023</strong>.
          </p>

          <h2>7. AI assistant and voice — acknowledgement</h2>
          <p>
            The in-app assistant is <strong>artificial intelligence</strong>. It may misinterpret a
            caller&rsquo;s intent or context and <strong>cannot verify any caller&rsquo;s identity or
            legitimacy</strong>; summaries and notes are generated for convenience and you should
            review anything important before acting on it. If you enable voice cloning, you may clone
            <strong> only your own voice</strong>, with your in-app consent. These acknowledgements are
            set out in full in the <a href="/terms#top">Terms of Service (§5 and §6)</a> and form part
            of this EULA.
          </p>

          <h2>8. Third-party software and services</h2>
          <p>
            The App includes third-party and open-source components licensed under their own terms,
            and relies on third-party services (including your app store, payment processors, and
            telecom carriers). Your use of those services is subject to <strong>their</strong> terms,
            and we are not responsible for them. Where an open-source licence grants you rights that
            conflict with a restriction in this EULA, the open-source licence governs that component
            to the extent of the conflict.
          </p>

          <h2>9. Privacy</h2>
          <p>
            Our <a href="/privacy">Privacy Policy</a> explains what the App collects and why, and is
            incorporated into this EULA by reference. The Services are hosted in India; by using the
            App you consent to your data being processed in India in accordance with the DPDP Act,
            2023 and the Information Technology Act, 2000.
          </p>

          <h2>10. Disclaimer of warranties and limitation of liability</h2>
          <p>
            The App is provided <strong>&ldquo;as is&rdquo; and &ldquo;as available&rdquo;</strong>
            without warranties of any kind, to the maximum extent permitted by law. Our aggregate
            liability, and the exclusions that apply, are set out in <a href="/terms#top">Terms of
            Service §12</a> and apply equally to this EULA. <strong>Nothing in this EULA excludes or
            limits any right or remedy you have that cannot lawfully be excluded, including your
            rights as a consumer under the Consumer Protection Act, 2019.</strong>
          </p>

          <h2>11. Term and termination</h2>
          <p>
            This EULA is effective until terminated. It terminates <strong>automatically</strong> if
            you breach any of its terms, and you may terminate it at any time by uninstalling the App
            and deleting your account (<a href="/privacy#rights">Privacy Policy §9</a>). On
            termination your licence ends and you must stop using and delete the App. Sections that by
            their nature should survive (ownership, disclaimers, limitation of liability,
            indemnification, governing law) survive termination.
          </p>

          <h2>12. Export and sanctions compliance</h2>
          <p>
            You represent that you are not located in, and will not use or export the App into, any
            country or to any person subject to applicable trade sanctions or export controls,
            including under India&rsquo;s Foreign Trade (Development and Regulation) Act, 1992 and
            applicable United States law. You further represent that you are <strong>not located in a
            country that is subject to a U.S. Government embargo or designated as
            &ldquo;terrorist-supporting,&rdquo;</strong> and that you are not listed on any U.S.
            Government list of prohibited or restricted parties.
          </p>

          <h2>13. Governing law and dispute resolution</h2>
          <p>
            This EULA is governed by the <strong>laws of India</strong>. Subject to any
            non-excludable right you have to approach a consumer forum at your place of residence
            under the Consumer Protection Act, 2019, you and Mavrix AI Private Limited agree that the
            <strong> courts of New Delhi, Delhi</strong> shall have <strong>exclusive
            jurisdiction</strong> over any dispute arising out of or in connection with this EULA.
          </p>

          <h2>14. Grievance redressal</h2>
          <p>
            In accordance with the Information Technology Act, 2000, the Information Technology
            (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, and the DPDP Act,
            2023, complaints about the App or your data may be sent to our Grievance Officer:
          </p>
          <p>
            <strong>Grievance Officer</strong><br />
            Mavrix AI Private Limited<br />
            No. 8/3, Prince Ville, Challaghatta Village, Domlur, Bangalore North,<br />
            Bangalore – 560071, Karnataka, India<br />
            <a href="mailto:grievance@heytring.com">grievance@heytring.com</a>
          </p>
          <p>
            We acknowledge grievances within <strong>24 hours</strong> and resolve them within the
            timelines required by law.
          </p>

          {/* Apple's Developer Program License Agreement (Schedule 1) requires that a custom EULA
              contain, at minimum, the terms below, and names Apple a third-party beneficiary. This
              block satisfies those minimum terms for App Store installs. Android installs are
              governed by §16. */}
          <h2>15. Additional terms for App Store (Apple) installs</h2>
          <p>
            If you download the App from the Apple App Store, the following additional terms apply,
            and prevail over any conflicting term of this EULA to the extent required by Apple:
          </p>
          <ul>
            <li><strong>This EULA is between you and Mavrix AI Private Limited only, not Apple.</strong> We, not Apple, are solely responsible for the App and its content.</li>
            <li><strong>Scope of licence.</strong> The licence granted is non-transferable and limited to use of the App on any Apple-branded products that you own or control, as permitted by the Usage Rules in the Apple Media Services Terms and Conditions, except that it may be accessed by other accounts associated with you via Family Sharing or volume purchasing.</li>
            <li><strong>Maintenance and support.</strong> We are solely responsible for providing any maintenance and support for the App. Apple has no obligation to furnish any maintenance or support.</li>
            <li><strong>Warranty.</strong> We are solely responsible for any product warranties, whether express or implied by law, to the extent not effectively disclaimed. If the App fails to conform to any applicable warranty, you may notify Apple, and Apple will refund the purchase price (if any) for the App; to the maximum extent permitted by law, Apple has no other warranty obligation, and any other claims, losses, liabilities, damages, costs, or expenses attributable to any failure to conform to any warranty are our responsibility.</li>
            <li><strong>Product claims.</strong> We, not Apple, are responsible for addressing any claims relating to the App or your use of it, including product-liability claims, any claim that the App fails to conform to any legal or regulatory requirement, claims under consumer-protection or similar legislation, and claims arising under privacy law.</li>
            <li><strong>Intellectual property.</strong> In the event of any third-party claim that the App or your use of it infringes that third party&rsquo;s intellectual property rights, we, not Apple, are solely responsible for the investigation, defence, settlement, and discharge of that claim.</li>
            <li><strong>Legal compliance.</strong> You represent and warrant that you are not located in a country subject to a U.S. Government embargo or designated as &ldquo;terrorist-supporting,&rdquo; and that you are not on any U.S. Government list of prohibited or restricted parties (see §12).</li>
            <li><strong>Developer name and contact.</strong> Any questions, complaints, or claims regarding the App should be directed to Mavrix AI Private Limited at <a href="mailto:customer@heytring.com">customer@heytring.com</a>, at the registered-office address above.</li>
            <li><strong>Third-party terms.</strong> You must comply with any applicable third-party terms of agreement when using the App.</li>
            <li><strong>Apple as third-party beneficiary.</strong> Apple and Apple&rsquo;s subsidiaries are third-party beneficiaries of this EULA and, upon your acceptance, have the right (and are deemed to have accepted the right) to enforce this EULA against you as a third-party beneficiary.</li>
          </ul>

          <h2>16. Additional terms for Google Play (Android) installs</h2>
          <p>
            If you download the App from Google Play, your download and use are additionally subject
            to the <strong>Google Play Terms of Service</strong>. Google is not a party to this EULA
            and is not responsible for the App.
          </p>

          <h2>17. Changes to this EULA</h2>
          <p>
            We may update this EULA to reflect changes to the App or the law. The &ldquo;Last
            updated&rdquo; date reflects the latest version, and material changes will be notified
            in-app or by email to the address you registered with. Your continued use of the App after
            an update means you accept the revised EULA.
          </p>

          <h2>18. Contact</h2>
          <p>
            <strong>Mavrix AI Private Limited</strong> (CIN U62099KA2025PTC210316)<br />
            No. 8/3, Prince Ville, Challaghatta Village, Domlur, Bangalore North,<br />
            Bangalore – 560071, Karnataka, India<br />
            <a href="mailto:customer@heytring.com">customer@heytring.com</a> — <a href="https://heytring.com">https://heytring.com</a>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
