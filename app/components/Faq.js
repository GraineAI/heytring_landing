"use client";
import { useState } from "react";
import { ChevRight } from "./Icons";

const qa = [
  {
    q: "What exactly is Tring?",
    a: "Tring is a personal AI phone assistant for India. Its assistant is named Ring. When a call you don't want to take comes in, Ring answers it, talks to the caller in their language, handles what they need, and hands you a summary. It can also make calls for you when you ask.",
  },
  {
    q: "Is Tring free?",
    a: "Yes. Call screening with live transcript, take over, Ask Ring to call, wrap-up notes, spam blocking and the English + Hindi assistant are all free. Tring Pro adds extras like your own cloned voice.",
  },
  {
    q: "Is the voice cloning safe?",
    a: "You can clone only your own voice, with your in-app consent — cloning anyone else's is prohibited. Nothing is ever trained on your voice or call audio, and disabling it permanently deletes your sample.",
  },
  {
    q: "Are my private conversations recorded?",
    a: "No. The moment you take over a call, recording and transcription stop. Only the part Ring handles is kept, encrypted, so you get your note and history.",
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
