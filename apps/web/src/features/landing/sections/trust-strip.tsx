import NumberFlow from "@number-flow/react";
import {
  Bell,
  BookOpen,
  Boxes,
  ClipboardCheck,
  FileSpreadsheet,
  FolderKanban,
  GitPullRequestArrow,
  History,
  Lock,
  MessagesSquare,
  Route,
  Timer,
} from "lucide-react";
import { motion, useInView } from "motion/react";
import { useRef } from "react";

import { fadeUp, stagger } from "../primitives";

const STATS = [
  { value: 6, suffix: "", label: "service modules in one desk" },
  { value: 4, suffix: "", label: "role-tailored workspaces" },
  { value: 15, suffix: " min", label: "first-response target for P1" },
  { value: 100, suffix: "%", label: "of record changes audited" },
];

const CHIPS = [
  { icon: Route, label: "Smart assignment" },
  { icon: Timer, label: "Response-time tracking" },
  { icon: MessagesSquare, label: "Live comments" },
  { icon: ClipboardCheck, label: "Approvals" },
  { icon: GitPullRequestArrow, label: "Change scheduling" },
  { icon: Boxes, label: "Asset register" },
  { icon: BookOpen, label: "Knowledge base" },
  { icon: FolderKanban, label: "Projects & modules" },
  { icon: Bell, label: "Email notifications" },
  { icon: History, label: "Audit log" },
  { icon: FileSpreadsheet, label: "CSV & Excel exports" },
  { icon: Lock, label: "Secure sessions" },
];

export function TrustStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section aria-label="At a glance" className="relative border-y border-(--l-ink)/15">
      <motion.div
        ref={ref}
        variants={stagger}
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        className="mx-auto grid max-w-6xl grid-cols-2 border-(--l-rule) md:grid-cols-4 md:divide-x md:divide-(--l-rule)"
      >
        {STATS.map((stat) => (
          <motion.div key={stat.label} variants={fadeUp} className="px-4 py-10 md:px-8">
            <div className="landing-display text-5xl leading-none text-(--l-ink) tabular-nums sm:text-[3.5rem]">
              <NumberFlow value={inView ? stat.value : 0} suffix={stat.suffix} />
            </div>
            <p className="landing-mono mt-3 text-[11px] tracking-wide text-(--l-ink-3) uppercase">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="landing-marquee overflow-hidden border-t border-(--l-rule) py-5">
        <div className="landing-marquee-track flex w-max gap-3">
          {[...CHIPS, ...CHIPS].map(({ icon: Icon, label }, i) => (
            <span
              key={`${label}-${i}`}
              aria-hidden={i >= CHIPS.length}
              className="flex items-center gap-2 rounded-md border border-(--l-rule) px-3.5 py-1.5 text-sm whitespace-nowrap text-(--l-ink-2)"
            >
              <Icon className="size-4 text-(--l-ink-3)" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
