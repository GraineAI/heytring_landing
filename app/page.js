import Preloader from "./components/Preloader";
import Nav from "./components/Nav";
import Motion from "./components/Motion";
import Hero from "./components/Hero";
import PhoneStory from "./components/PhoneStory";
import VideoSection from "./components/VideoSection";
import HowItWorks from "./components/HowItWorks";
import VoiceClone from "./components/VoiceClone";
import Faq from "./components/Faq";
import FinalCta from "./components/FinalCta";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <>
      {/* fixed elements live outside the ScrollSmoother wrapper (GSAP docs) */}
      <Preloader />
      <Motion />
      <Nav />
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <main>
            <Hero />
            <PhoneStory />
            <VideoSection />
            <HowItWorks />
            <VoiceClone />
            <Faq />
            <FinalCta />
          </main>
          <Footer />
        </div>
      </div>
    </>
  );
}
