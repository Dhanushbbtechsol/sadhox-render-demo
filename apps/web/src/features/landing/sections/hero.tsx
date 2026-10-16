import { ArrowRight, ArrowDown } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { useNavigate } from "react-router";

import { gsap, useGSAP } from "../gsap";
import { MagneticButton } from "../primitives";
import { HeroMockup } from "./hero-mockup";

const HEADLINE_A = ["Every", "ticket", "routed."];
const HEADLINE_B = ["Every", "deadline"];

const ASSURANCES = ["Role-based access", "Full audit trail", "Real-time updates"];

export function Hero() {
  const navigate = useNavigate();
  const scope = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({ target: scope, offset: ["start start", "end start"] });
  const copyY = useTransform(scrollYProgress, [0, 0.6], [0, -60]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
        tl.from(".hero-pill", { y: 16, opacity: 0, duration: 0.6 })
          .from(".hero-word", { yPercent: 115, duration: 1, stagger: 0.07 }, "-=0.25")
          .from(".hero-fade", { y: 22, opacity: 0, duration: 0.8, stagger: 0.1 }, "-=0.6")
          .from(".hero-visual", { y: 80, opacity: 0, duration: 1.3, ease: "expo.out" }, "-=0.7");
      });
    },
    { scope },
  );

  return (
    <section ref={scope} id="top" className="relative isolate pt-32 pb-24 sm:pt-40">
      <motion.div style={{ y: copyY, opacity: copyOpacity }} className="mx-auto max-w-6xl px-4 text-center">
        <a
          href="#features"
          className="hero-pill group landing-mono mb-10 inline-flex items-center gap-3 border-y border-(--l-rule) py-2 text-[11px] tracking-[0.12em] text-(--l-ink-2) uppercase transition-colors hover:text-(--l-ink)"
        >
          <span className="text-(--l-accent)">IT service desk</span>
          <span className="hidden h-3 w-px bg-(--l-rule) sm:block" />
          <span className="hidden sm:inline">Tickets, requests, changes and assets in one place</span>
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </a>

        <h1 className="landing-display text-[2.9rem] leading-[0.98] text-(--l-ink) sm:text-7xl lg:text-[6.25rem]">
          <span className="block">
            {HEADLINE_A.map((word) => (
              <span key={word} className="inline-block overflow-hidden pb-2 align-bottom">
                <span className="hero-word mr-[0.2em] inline-block">{word}</span>
              </span>
            ))}
          </span>
          <span className="block">
            {HEADLINE_B.map((word) => (
              <span key={word} className="inline-block overflow-hidden pb-2 align-bottom">
                <span className="hero-word mr-[0.2em] inline-block">{word}</span>
              </span>
            ))}
            <span className="inline-block overflow-hidden pb-2 align-bottom">
              <span className="hero-word inline-block text-(--l-accent)">met.</span>
            </span>
          </span>
        </h1>

        <p className="hero-fade mx-auto mt-8 max-w-xl text-base text-pretty text-(--l-ink-2) sm:text-lg">
          Tickets, issues, requests, changes, assets and knowledge in one desk. Priorities set themselves,
          deadlines track themselves, and your team fixes things faster.
        </p>

        <div className="hero-fade mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <MagneticButton
            onClick={() => void navigate("/login")}
            className="bg-(--l-ink) text-(--l-paper) hover:bg-(--l-accent)"
          >
            Sign in to your desk
            <ArrowRight className="size-4" />
          </MagneticButton>
          <MagneticButton
            href="#lifecycle"
            className="border border-(--l-ink)/25 text-(--l-ink) hover:border-(--l-ink) hover:bg-(--l-ink)/[0.04]"
          >
            See how it works
            <ArrowDown className="size-4" />
          </MagneticButton>
        </div>

        <ul className="hero-fade landing-mono mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] tracking-wide text-(--l-ink-3) uppercase">
          {ASSURANCES.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="size-1.5 bg-(--l-accent)" />
              {item}
            </li>
          ))}
        </ul>
      </motion.div>

      <div className="hero-visual mt-16 px-4 sm:mt-20">
        <HeroMockup />
      </div>
    </section>
  );
}
