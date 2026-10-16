import { ArrowRight, ArrowUp } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { useNavigate } from "react-router";

import { MagneticButton } from "../primitives";

export function FinalCta() {
  const navigate = useNavigate();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const scale = useTransform(scrollYProgress, [0, 1], [0.92, 1]);

  return (
    <section ref={ref} className="px-4 pt-4 pb-24">
      <motion.div
        style={{ scale }}
        className="relative mx-auto max-w-6xl overflow-hidden rounded-xl bg-(--l-night) px-6 py-20 sm:px-14 sm:py-24"
      >
        <div className="grid items-end gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="landing-mono flex items-center gap-3 text-[11px] tracking-[0.14em] text-(--l-cream-2) uppercase">
              <span className="text-(--l-accent)">06</span>
              <span className="h-px w-8 bg-(--l-cream)/25" />
              Get started
            </p>
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="landing-display mt-6 text-[2.6rem] leading-[1] text-balance text-(--l-cream) sm:text-6xl"
            >
              Give your team a desk they’ll <span className="landing-em">actually enjoy</span> using.
            </motion.h2>
          </div>

          <div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15, duration: 0.8 }}
              className="max-w-sm text-lg text-(--l-cream-2)"
            >
              Sign in with your work account and pick up right where your queue left off.
            </motion.p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <MagneticButton
                onClick={() => void navigate("/login")}
                className="bg-(--l-accent) text-(--l-paper) hover:bg-(--l-cream) hover:text-(--l-ink)"
              >
                Sign in
                <ArrowRight className="size-4" />
              </MagneticButton>
              <MagneticButton
                href="#top"
                className="border border-(--l-cream)/25 text-(--l-cream) hover:border-(--l-cream)"
              >
                <ArrowUp className="size-4" />
                Back to top
              </MagneticButton>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-(--l-ink)/15 px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-(--l-ink-3) sm:flex-row">
        <span className="text-base font-semibold tracking-tight text-(--l-ink)">ITSM</span>
        <nav aria-label="Footer" className="flex gap-6">
          <a href="#features" className="hover:text-(--l-ink)">Features</a>
          <a href="#roles" className="hover:text-(--l-ink)">Roles</a>
          <a href="#platform" className="hover:text-(--l-ink)">Security</a>
        </nav>
        <p className="landing-mono text-xs">© {new Date().getFullYear()} ITSM</p>
      </div>
    </footer>
  );
}
