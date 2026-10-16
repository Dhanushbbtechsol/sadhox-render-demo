import {
  Briefcase,
  CheckCircle2,
  Headset,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { SectionHeading } from "../primitives";

type Role = {
  id: string;
  label: string;
  icon: LucideIcon;
  headline: string;
  body: string;
  points: string[];
  preview: { label: string; value: string }[];
};

const ROLES: Role[] = [
  {
    id: "enduser",
    label: "End user",
    icon: UserRound,
    headline: "Get help without the back-and-forth.",
    body: "A friendly self-service desk where employees report problems, request what they need and follow progress, with no IT jargon.",
    points: [
      "Report a ticket in seconds with guided categories",
      "Order from the service catalog like a shop",
      "Track status and response time live",
      "Find answers in the knowledge base first",
    ],
    preview: [
      { label: "My open tickets", value: "2" },
      { label: "Requests awaiting approval", value: "1" },
      { label: "Suggested articles", value: "4" },
    ],
  },
  {
    id: "agent",
    label: "Agent",
    icon: Headset,
    headline: "A queue that sorts itself.",
    body: "Agents see what’s due next, collaborate in real time and have every bit of context, from assets to articles, beside the ticket.",
    points: [
      "Queue ordered by response deadline",
      "Live comments with teammates and requesters",
      "Link tickets to issues, assets and articles",
      "Fulfil approved requests and run changes",
    ],
    preview: [
      { label: "Due in the next hour", value: "3" },
      { label: "Assigned to me", value: "11" },
      { label: "Resolved today", value: "9" },
    ],
  },
  {
    id: "manager",
    label: "Manager",
    icon: Briefcase,
    headline: "Clear visibility across your projects.",
    body: "Managers own projects, see their own KPIs and charts, and approve the requests and changes that affect their teams.",
    points: [
      "Dashboards scoped to the projects you own",
      "Approve requests and changes for your projects",
      "Volume and on-time trends per project",
      "Spot breaches before they escalate",
    ],
    preview: [
      { label: "Projects owned", value: "3" },
      { label: "Pending approvals", value: "5" },
      { label: "On-time rate", value: "97%" },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    icon: ShieldCheck,
    headline: "Full control, without the clutter.",
    body: "Admins shape the whole desk: people, projects, catalog, categories and response-time rules, with a complete audit trail.",
    points: [
      "Users, roles, projects and modules",
      "Catalog, categories and response-time rules",
      "Audit log, background jobs and escalation",
      "Reports and dashboard exports to CSV and Excel",
    ],
    preview: [
      { label: "Active users", value: "248" },
      { label: "Catalog items", value: "36" },
      { label: "Audit events today", value: "1,204" },
    ],
  },
];

export function RolesSection() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [touched, setTouched] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { margin: "-30%" });
  const role = ROLES[active]!;

  useEffect(() => {
    if (touched || reduce || !inView) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % ROLES.length), 5200);
    return () => window.clearInterval(id);
  }, [touched, reduce, inView]);

  function select(index: number) {
    setTouched(true);
    setActive(index);
  }

  return (
    <section ref={ref} id="roles" className="relative scroll-mt-24 border-y border-(--l-ink)/15 bg-(--l-paper-2) py-28">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          index="04"
          eyebrow="Built for everyone"
          title={
            <>
              One product. <span className="landing-em">Four tailored desks.</span>
            </>
          }
          description="Everyone signs in to the same place and sees exactly what their role needs, nothing more and nothing less."
        />

        <div
          role="tablist"
          aria-label="Roles"
          className="mx-auto mt-12 flex w-fit max-w-full flex-wrap justify-center gap-1 rounded-lg border border-(--l-rule) bg-(--l-card) p-1"
        >
          {ROLES.map((r, i) => (
            <button
              key={r.id}
              role="tab"
              type="button"
              id={`role-tab-${r.id}`}
              aria-selected={i === active}
              aria-controls="role-panel"
              onClick={() => select(i)}
              className={cn(
                "relative flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
                i === active ? "text-(--l-paper)" : "text-(--l-ink-2) hover:text-(--l-ink)",
              )}
            >
              {i === active ? (
                <motion.span
                  layoutId="role-pill"
                  className="absolute inset-0 -z-0 rounded-md bg-(--l-ink)"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              ) : null}
              <r.icon className="relative size-4" />
              <span className="relative">{r.label}</span>
            </button>
          ))}
        </div>

        <div
          id="role-panel"
          role="tabpanel"
          aria-labelledby={`role-tab-${role.id}`}
          className="relative mt-10 overflow-hidden rounded-xl border border-(--l-rule) bg-(--l-card)"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="grid gap-10 p-7 sm:p-10 lg:grid-cols-[1.1fr_1fr]"
            >
              <div className="relative">
                <h3 className="landing-display text-3xl leading-[1.08] text-(--l-ink) sm:text-4xl">{role.headline}</h3>
                <p className="mt-4 text-(--l-ink-2)">{role.body}</p>
                <ul className="mt-7 border-t border-(--l-rule)">
                  {role.points.map((point, i) => (
                    <motion.li
                      key={point}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.07 }}
                      className="flex items-start gap-3 border-b border-(--l-rule) py-3 text-[15px] text-(--l-ink)"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-(--l-accent)" />
                      {point}
                    </motion.li>
                  ))}
                </ul>
              </div>

              <div className="relative grid content-center gap-3">
                {role.preview.map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, scale: 0.96, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.09, type: "spring", stiffness: 260, damping: 22 }}
                    className="flex items-center justify-between rounded-lg border border-(--l-rule) bg-white px-5 py-4"
                  >
                    <span className="text-sm text-(--l-ink-2)">{item.label}</span>
                    <span className="landing-display text-3xl leading-none text-(--l-ink) tabular-nums">{item.value}</span>
                  </motion.div>
                ))}
                <p className="landing-mono text-center text-[10px] tracking-wide text-(--l-ink-3) uppercase">Illustrative numbers</p>
              </div>
            </motion.div>
          </AnimatePresence>

          {!touched && !reduce ? (
            <motion.div
              key={`bar-${active}`}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: inView ? 1 : 0 }}
              transition={{ duration: 5.2, ease: "linear" }}
              className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-(--l-accent)"
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
