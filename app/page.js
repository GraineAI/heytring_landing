import Preloader from "./components/Preloader";
import Nav from "./components/Nav";
import Motion from "./components/Motion";
import Hero from "./components/Hero";
import PhoneStory from "./components/PhoneStory";
import AppBento from "./components/AppBento";
import VideoSection from "./components/VideoSection";
import HowItWorks from "./components/HowItWorks";
import TalkToRing from "./components/TalkToRing";
import RingGame3D from "./components/RingGame3D";
import VoiceClone from "./components/VoiceClone";
import Faq from "./components/Faq";
import FinalCta from "./components/FinalCta";
import Footer from "./components/Footer";
import BetaModal from "./components/BetaModal";

export default function Home() {
  return (
    <>
      <Preloader />
      <Motion />
      <Nav />
      {/* fixed elements stay outside the ScrollSmoother wrapper (GSAP docs) */}
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <main>
            <Hero />
            <PhoneStory />
            <AppBento />
            <VideoSection />
            <HowItWorks />
            {/* The product, on the page. SupportChat mounts the same agent as a
                corner bubble — right for support, wrong for a landing page
                selling an AI that answers calls, where hiding the strongest
                argument behind a launcher asks the visitor to go looking. */}
            <TalkToRing />
            <RingGame3D />
            <VoiceClone />
            <Faq />
            <FinalCta />
          </main>
          <Footer />
        </div>
      </div>

      {/* closed-beta invite form, opened by any [data-beta] element */}
      <BetaModal />
    </>
  );
}
