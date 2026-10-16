import { motion, useScroll, useSpring } from "motion/react";
import { useEffect } from "react";

import "./landing.css";
import { ScrollTrigger } from "./gsap";
import { FeatureBento } from "./sections/feature-bento";
import { FinalCta, LandingFooter } from "./sections/final-cta";
import { Hero } from "./sections/hero";
import { LandingNav } from "./sections/landing-nav";
import { LifecycleSection } from "./sections/lifecycle-section";
import { PlatformSection } from "./sections/platform-section";
import { PriorityPlayground } from "./sections/priority-playground";
import { RolesSection } from "./sections/roles-section";
import { TrustStrip } from "./sections/trust-strip";

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "ITSM — IT service desk";
    const root = document.documentElement;
    root.style.scrollBehavior = "smooth";
    // The app shell paints a tinted gradient on <body>; keep it from
    // flashing through during pin refreshes or overscroll.
    const body = document.body;
    const previousBody = body.style.background;
    body.style.background = "#f3efe6";

    // Fonts and images shift layout after first paint; re-measure pins.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    void document.fonts?.ready.then(refresh);

    return () => {
      document.title = previousTitle;
      root.style.scrollBehavior = "";
      body.style.background = previousBody;
      window.removeEventListener("load", refresh);
    };
  }, []);

  return (
    <div className="landing-root relative min-h-svh antialiased">
      <motion.div
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-(--l-accent)"
        aria-hidden
      />

      <LandingNav />
      <main className="relative z-[2]">
        <Hero />
        <TrustStrip />
        <FeatureBento />
        <LifecycleSection />
        <PriorityPlayground />
        <RolesSection />
        <PlatformSection />
        <FinalCta />
      </main>
      <div className="relative z-[2]">
        <LandingFooter />
      </div>
    </div>
  );
}
