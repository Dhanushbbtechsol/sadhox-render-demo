import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type Variants,
} from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const PRIORITY_TONE = {
  P1: "bg-[#f6ddd2] text-[#a8340f] ring-[#e8b4a2]",
  P2: "bg-[#f2e4c2] text-[#8a5a0b] ring-[#e0c88d]",
  P3: "bg-[#dce6e2] text-[#2f5b56] ring-[#b4cac4]",
  P4: "bg-[#e6e1d6] text-[#5b574c] ring-[#d2cbbc]",
} as const;

export type LandingPriority = keyof typeof PRIORITY_TONE;

export function PriorityPill({
  priority,
  className,
}: {
  priority: LandingPriority;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "landing-mono inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
        PRIORITY_TONE[priority],
        className,
      )}
    >
      {priority}
    </span>
  );
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

/** Editorial section opener: numbered mono label over a serif headline. */
export function SectionHeading({
  index,
  eyebrow,
  title,
  description,
  align = "center",
  tone = "light",
  className,
}: {
  index: string;
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "center" | "left";
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      className={cn(
        "max-w-2xl space-y-5",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      <motion.p
        variants={fadeUp}
        className={cn(
          "landing-mono flex items-center gap-3 text-[11px] font-medium tracking-[0.14em] uppercase",
          align === "center" && "justify-center",
          dark ? "text-(--l-cream-2)" : "text-(--l-ink-3)",
        )}
      >
        <span className="text-(--l-accent)">{index}</span>
        <span className={cn("h-px w-8", dark ? "bg-(--l-cream)/25" : "bg-(--l-rule)")} />
        {eyebrow}
      </motion.p>
      <motion.h2
        variants={fadeUp}
        className={cn(
          "landing-display text-[2.3rem] leading-[1.04] text-balance sm:text-[3.4rem]",
          dark ? "text-(--l-cream)" : "text-(--l-ink)",
        )}
      >
        {title}
      </motion.h2>
      {description ? (
        <motion.p
          variants={fadeUp}
          className={cn(
            "text-base text-pretty sm:text-lg",
            dark ? "text-(--l-cream-2)" : "text-(--l-ink-2)",
          )}
        >
          {description}
        </motion.p>
      ) : null}
    </motion.div>
  );
}

/** Flat paper card; hover firms up the border instead of glowing. */
export function PanelCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-(--l-rule) bg-(--l-card) transition-colors duration-300 hover:border-(--l-ink)/45",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Button that leans toward the cursor. */
export function MagneticButton({
  children,
  className,
  onClick,
  href,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
}) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 15 });
  const sy = useSpring(y, { stiffness: 220, damping: 15 });

  function onMove(event: React.PointerEvent<HTMLElement>) {
    if (reduce) return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left - rect.width / 2) * 0.2);
    y.set((event.clientY - rect.top - rect.height / 2) * 0.3);
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  const classes = cn(
    "relative inline-flex items-center justify-center gap-2 rounded-md px-6 py-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--l-accent)",
    className,
  );

  if (href) {
    return (
      <motion.a
        href={href}
        style={{ x: sx, y: sy }}
        onPointerMove={onMove}
        onPointerLeave={reset}
        whileTap={{ scale: 0.97 }}
        className={classes}
      >
        {children}
      </motion.a>
    );
  }

  return (
    <motion.button
      type="button"
      style={{ x: sx, y: sy }}
      onPointerMove={onMove}
      onPointerLeave={reset}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={classes}
    >
      {children}
    </motion.button>
  );
}
