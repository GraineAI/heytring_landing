import Nav from "./components/Nav";
import Motion from "./components/Motion";
import Hero from "./components/Hero";
import Strip from "./components/Strip";
import Journey from "./components/Journey";
import RollingText from "./components/RollingText";
import Slider from "./components/Slider";
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
        <RollingText />
        <Journey />
        <VoiceClone />
        <HowItWorks />
        <AskRing />
        <Handles />
        <Slider />
        <Trust />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
