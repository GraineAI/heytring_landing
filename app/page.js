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
      <Preloader />
      <Motion />
      <Nav />
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

      {/* floating announcement pill (Swish's fixed bottom-center news pill) */}
      <a className="newspill" href="#voice">
        <span>Ring can answer in your own voice</span>
        <span className="chip">→</span>
      </a>
    </>
  );
}
