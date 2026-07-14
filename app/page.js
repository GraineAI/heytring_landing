import Nav from "./components/Nav";
import Motion from "./components/Motion";
import Hero from "./components/Hero";
import Strip from "./components/Strip";
import VoiceClone from "./components/VoiceClone";
import HowItWorks from "./components/HowItWorks";
import AskRing from "./components/AskRing";
import Handles from "./components/Handles";
import Trust from "./components/Trust";
import Faq from "./components/Faq";
import FinalCta from "./components/FinalCta";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <>
      <Motion />
      <Nav />
      <main>
        <Hero />
        <Strip />
        <VoiceClone />
        <HowItWorks />
        <AskRing />
        <Handles />
        <Trust />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
