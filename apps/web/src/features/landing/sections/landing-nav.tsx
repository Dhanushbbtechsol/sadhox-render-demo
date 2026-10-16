import { ArrowRight } from "lucide-react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";
import { Link } from "react-router";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#lifecycle", label: "How it works" },
  { href: "#roles", label: "Roles" },
  { href: "#platform", label: "Security" },
];

export function LandingNav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    setScrolled(latest > 24);
    // Tuck away while reading downward, return on any upward scroll.
    setHidden(latest > 640 && latest > previous + 4);
  });

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: hidden ? -96 : 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-500",
        scrolled
          ? "border-(--l-rule) bg-(--l-paper)/85 backdrop-blur-md"
          : "border-transparent bg-transparent",
      )}
    >
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <a href="#top" className="text-lg font-semibold tracking-tight text-(--l-ink)">
          ITSM
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm text-(--l-ink-2) underline-offset-[6px] transition-colors hover:text-(--l-ink) hover:underline"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <Link
          to="/login"
          className="group inline-flex items-center gap-1.5 rounded-md bg-(--l-ink) px-4 py-2 text-sm font-medium text-(--l-paper) transition-colors hover:bg-(--l-accent)"
        >
          Sign in
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </nav>
    </motion.header>
  );
}
