"use client";
import { useState } from "react";
import { ChevRight } from "./Icons";

const qa = [
  {
    q: "What exactly is Tring?",
    a: "Tring is a personal AI phone assistant for India. Its assistant is named Ring. When a call you don't want to take comes in, Ring answers it, talks to the caller in their language, handles what they need, and hands you a summary. It can also make calls for you when you ask.",
  },
  {
    q: "Does Ring actually talk to people on the phone?",
    a: "Yes. Ring holds a real, natural conversation with the caller — takes the message, gives the delivery driver directions, screens the spam call — and you get a live transcript plus a wrap-up note. You can drop in a line or tap Take over to jump in at any point.",
  },
  {
    q: "Is the voice cloning safe? Can I clone someone else's voice?",
    a: "You can clone only your own voice, with your in-app consent — that's a hard rule, and cloning or imitating anyone else's voice is prohibited. It uses instant, zero-shot cloning on a pre-built speech model, so nothing is ever trained on your voice or call audio. Disable it and your sample is permanently deleted.",
  },
  {
    q: "Is Tring free?",
    a: "Yes. Everything that makes Tring, Tring — call screening with live transcript, take over, Ask Ring to call, wrap-up notes, spam blocking, favourites and the English + Hindi assistant — is free. Tring Plus adds extras like instant voice cloning and custom assistant templates.",
  },
  {
    q: "Are my private conversations recorded?",
    a: "No. The moment you take over a call, recording and transcription stop. What you say to the caller yourself is never recorded, transcribed or stored. Only the part Ring handles is kept, encrypted, so you get your note and history.",
  },
  {
    q: "Which languages does Ring speak?",
    a: "The assistant currently speaks English and Hindi, and answers callers in their language. When Ring answers in your cloned voice, it does so in the caller's language too.",
  },
  {
    q: "Is it on iPhone?",
    a: "Tring is built for both Android and iOS. The iOS build leans into a premium glass look; Android uses Material You. Grab it from the App Store or Google Play.",
  },
  {
    q: "How do I stop or pause it?",
    a: "Turn screening off in the app anytime, or dial your carrier's deactivation code — calls then ring your phone directly. You can delete any single call, or delete your whole account and all associated data from Settings.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="section" id="faq">
      <div className="wrap">
        <div className="head" style={{ margin: "0 auto", textAlign: "center", maxWidth: 640 }}>
          <span className="eyebrow" style={{ justifyContent: "center" }}>Questions</span>
          <h2>Everything you might ask before you download.</h2>
        </div>

        <div className="faq">
          {qa.map((item, i) => {
            const isOpen = open === i;
            return (
              <div className="qa" key={i} data-open={isOpen}>
                <button
                  className="qa__q"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                >
                  {item.q}
                  <span className="qa__sign"><ChevRight /></span>
                </button>
                <div className="qa__a"><p>{item.a}</p></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
