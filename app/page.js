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
import Languages from "./components/Languages";
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
            <Languages />
            <VoiceClone />
            <Faq />
            <FinalCta />
          </main>
          <Footer />
        </div>
      </div>

      {/* The beta-invite modal is unmounted, not deleted. Both platforms are publicly
          installable now — Play open testing and a public TestFlight join link — so every
          CTA links straight to a store and nothing is left to open a form. components/
          BetaModal.js is kept because putting it back is one import and one line, and
          because the waitlist table it wrote to is still read by the admin dashboard. */}
    </>
  );
}
