import Preloader from "./components/Preloader";
import Nav from "./components/Nav";
import Motion from "./components/Motion";
import Hero from "./components/Hero";
import Story from "./components/Story";
import PhoneStory from "./components/PhoneStory";
import VideoSection from "./components/VideoSection";
import AppBento from "./components/AppBento";
import Pillars from "./components/Pillars";
import Proof from "./components/Proof";
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
            {/* Swish's rhythm: atmosphere, then plain talk, then proof, then
                what we own, then the ask. PhoneStory, AppBento, HowItWorks and
                the Squadron game were all saying versions of the same thing in
                more chrome; the game still lives at /play for the app's WebView. */}
            <Hero />
            <Story />
            <PhoneStory />
            <AppBento />
            <VideoSection />
            <Pillars />
            <Proof />
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
