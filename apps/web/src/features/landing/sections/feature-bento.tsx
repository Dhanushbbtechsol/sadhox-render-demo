import {
  BarChart3,
  BookOpen,
  Boxes,
  Check,
  FileSpreadsheet,
  GitPullRequestArrow,
  Laptop,
  Link2,
  Search,
  ShieldAlert,
  ShoppingBag,
  Ticket,
  Undo2,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { fadeUp, PanelCard, PriorityPill, SectionHeading, stagger } from "../primitives";

function CardHeader({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="relative z-10">
      <div className="mb-5 flex items-center gap-2.5">
        <Icon className="size-4 text-(--l-accent)" />
        <h3 className="text-lg font-semibold tracking-tight text-(--l-ink)">{title}</h3>
      </div>
      <p className="max-w-md text-sm leading-relaxed text-(--l-ink-2)">{body}</p>
    </div>
  );
}

function BentoCell({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <motion.div variants={fadeUp} className={className}>
      <PanelCard className="flex h-full flex-col p-6 sm:p-7">{children}</PanelCard>
    </motion.div>
  );
}

const SURFACE = "rounded-lg border border-(--l-rule) bg-white";

/* ---------- Visuals ---------- */

const TICKETS = [
  { ref: "INC-000142", title: "VPN drops for Finance", p: "P1" as const, used: 78 },
  { ref: "INC-000139", title: "Outlook not syncing", p: "P2" as const, used: 46 },
  { ref: "INC-000137", title: "Printer queue stuck", p: "P3" as const, used: 22 },
];

function TicketsVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <div ref={ref} className="mt-6 space-y-2.5">
      {TICKETS.map((t, i) => (
        <motion.div
          key={t.ref}
          initial={{ opacity: 0, x: -20 }}
          animate={inView ? { opacity: 1, x: 0 } : undefined}
          transition={{ delay: 0.15 * i, duration: 0.6 }}
          className={cn(SURFACE, "flex items-center gap-3 px-3 py-2.5")}
        >
          <PriorityPill priority={t.p} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-(--l-ink)">{t.title}</p>
              <span className="landing-mono text-[10px] text-(--l-ink-3)">{t.ref}</span>
            </div>
            <div className="mt-2 h-[3px] overflow-hidden bg-(--l-paper-2)">
              <motion.div
                initial={{ width: 0 }}
                animate={inView ? { width: `${t.used}%` } : undefined}
                transition={{ delay: 0.3 + 0.15 * i, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                className={cn("h-full", t.used > 70 ? "bg-(--l-accent)" : "bg-(--l-ink)/70")}
              />
            </div>
          </div>
        </motion.div>
      ))}
      <p className="pt-1 text-[11px] text-(--l-ink-3)">Bars show time used against each ticket’s response-time rule.</p>
    </div>
  );
}

function IssuesVisual() {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const nodes = [
    { x: 30, y: 25 },
    { x: 30, y: 75 },
    { x: 30, y: 125 },
  ];
  return (
    <svg ref={ref} viewBox="0 0 260 150" className="mt-6 w-full" aria-hidden>
      {nodes.map((n, i) => (
        <motion.path
          key={i}
          d={`M${n.x + 22} ${n.y} C 120 ${n.y}, 140 75, 196 75`}
          fill="none"
          stroke="var(--l-ink)"
          strokeOpacity="0.45"
          strokeWidth="1.25"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : undefined}
          transition={{ delay: 0.2 * i, duration: 1.1, ease: "easeInOut" }}
        />
      ))}
      {nodes.map((n, i) => (
        <g key={`n${i}`}>
          <rect x={n.x - 22} y={n.y - 11} width="44" height="22" rx="4" fill="#fff" stroke="var(--l-rule)" />
          <text x={n.x} y={n.y + 3.5} textAnchor="middle" fontSize="9" fill="var(--l-ink-2)" fontFamily="Geist Mono, monospace">
            INC
          </text>
        </g>
      ))}
      <motion.g
        initial={{ scale: 0.6, opacity: 0 }}
        animate={inView ? { scale: 1, opacity: 1 } : undefined}
        transition={{ delay: 0.9, type: "spring", stiffness: 180, damping: 14 }}
        style={{ transformOrigin: "222px 75px" }}
      >
        <circle cx="222" cy="75" r="27" fill="var(--l-accent-soft)" stroke="var(--l-accent)" />
        <text x="222" y="73" textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--l-accent-ink)" fontFamily="Geist Mono, monospace">
          ISSUE
        </text>
        <text x="222" y="85" textAnchor="middle" fontSize="7.5" fill="var(--l-accent-ink)">
          root cause
        </text>
      </motion.g>
    </svg>
  );
}

const APPROVAL_STEPS = ["Submitted", "Approved", "Fulfilled"];

function CatalogVisual() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(reduce ? 2 : 0);
  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setStep((s) => (s + 1) % 4), 1400);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <div className="mt-6 space-y-5">
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Laptop, label: "New laptop" },
          { icon: ShieldAlert, label: "VPN access" },
          { icon: ShoppingBag, label: "Software" },
        ].map(({ icon: Icon, label }, i) => (
          <div
            key={label}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-[11px] font-medium transition-colors",
              i === 0 ? "border-(--l-ink) bg-white text-(--l-ink)" : "border-(--l-rule) bg-white/60 text-(--l-ink-3)",
            )}
          >
            <Icon className="size-4" />
            {label}
          </div>
        ))}
      </div>
      <div className="flex items-center">
        {APPROVAL_STEPS.map((label, i) => {
          const done = step > i;
          const current = step === i;
          return (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <motion.div
                  animate={{
                    backgroundColor: done ? "#2f7d4f" : current ? "#17160f" : "#ebe5d8",
                    color: done || current ? "#f3efe6" : "#7a7466",
                    scale: current ? 1.12 : 1,
                  }}
                  className="grid size-6 place-items-center rounded-full"
                >
                  {done ? <Check className="size-3.5" /> : <span className="landing-mono text-[10px]">{i + 1}</span>}
                </motion.div>
                <span className="text-[10px] text-(--l-ink-3)">{label}</span>
              </div>
              {i < APPROVAL_STEPS.length - 1 ? (
                <div className="mx-1 mb-4 h-px flex-1 overflow-hidden bg-(--l-rule)">
                  <motion.div animate={{ width: done ? "100%" : "0%" }} className="h-full bg-(--l-ok)" />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const CHANGE_TYPES = [
  { label: "Standard", tone: "bg-[#e3eee6] text-[#2f7d4f] ring-[#bcd7c5]" },
  { label: "Normal", tone: "bg-(--l-paper-2) text-(--l-ink-2) ring-(--l-rule)" },
  { label: "Emergency", tone: "bg-(--l-accent-soft) text-(--l-accent-ink) ring-[#e8b4a2]" },
];

function ChangesVisual() {
  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-wrap gap-2">
        {CHANGE_TYPES.map((t) => (
          <span key={t.label} className={cn("rounded px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", t.tone)}>
            {t.label}
          </span>
        ))}
      </div>
      <div className={cn(SURFACE, "p-3 text-[12px]")}>
        <div className="flex items-center justify-between">
          <span className="font-medium text-(--l-ink)">Firewall rule update</span>
          <span className="landing-mono text-[10px] text-(--l-ink-3)">CHG-000021</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-(--l-ink-3)">
          <span>Window</span>
          <span className="landing-mono text-(--l-ink)">SAT 22:00–23:30</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-(--l-ink-3)">
          <span className="flex items-center gap-1">
            <Undo2 className="size-3" /> Rollback plan
          </span>
          <span className="text-(--l-ok)">Ready</span>
        </div>
      </div>
    </div>
  );
}

function AssetsVisual() {
  return (
    <div className={cn(SURFACE, "mt-6 p-3")}>
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-md bg-(--l-ink) text-(--l-paper)">
          <Laptop className="size-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-(--l-ink)">MacBook Pro 14”</p>
          <p className="landing-mono text-[10px] text-(--l-ink-3)">AST-000031 · IN USE</p>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        {["INC-000128 · Battery swelling", "REQ-000064 · RAM upgrade"].map((line) => (
          <div key={line} className="flex items-center gap-2 rounded bg-(--l-paper) px-2 py-1.5 text-[11px] text-(--l-ink-2)">
            <Link2 className="size-3 text-(--l-accent)" />
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

const QUERY = "reset vpn password";

function KnowledgeVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-40px" });
  const reduce = useReducedMotion();
  const [typed, setTyped] = useState(reduce ? QUERY.length : 0);

  useEffect(() => {
    if (!inView || reduce) return;
    setTyped(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(i);
      if (i >= QUERY.length) window.clearInterval(id);
    }, 70);
    return () => window.clearInterval(id);
  }, [inView, reduce]);

  const done = typed >= QUERY.length;

  return (
    <div ref={ref} className="mt-6 space-y-2.5">
      <div className="flex items-center gap-2 rounded-lg border border-(--l-ink)/40 bg-white px-3 py-2.5 text-sm">
        <Search className="size-4 text-(--l-ink-3)" />
        <span className="text-(--l-ink)">{QUERY.slice(0, typed)}</span>
        <span className="landing-caret -ml-1.5 h-4 w-px bg-(--l-accent)" />
      </div>
      {[
        { title: "How to reset your VPN password", meta: "Network · 2 min read" },
        { title: "VPN keeps disconnecting? Try this", meta: "Network · Linked to 14 tickets" },
      ].map((article, i) => (
        <motion.div
          key={article.title}
          initial={false}
          animate={{ opacity: done ? 1 : 0, y: done ? 0 : 8 }}
          transition={{ delay: done ? 0.1 + i * 0.12 : 0 }}
          className="flex items-center gap-3 border-b border-(--l-rule) px-1 py-2.5 last:border-0"
        >
          <BookOpen className="size-4 shrink-0 text-(--l-ink-3)" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-(--l-ink)">{article.title}</p>
            <p className="text-[11px] text-(--l-ink-3)">{article.meta}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

const BARS = [42, 58, 51, 74, 66, 88, 71];
const PEAK = BARS.indexOf(Math.max(...BARS));

function InsightsVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <div ref={ref} className="mt-6">
      <div className="flex h-28 items-end gap-2 border-b border-(--l-ink)/30">
        {BARS.map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={inView ? { height: `${h}%` } : undefined}
            transition={{ delay: i * 0.07, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className={cn("flex-1", i === PEAK ? "bg-(--l-accent)" : "bg-(--l-ink)/80")}
          />
        ))}
      </div>
      <div className="landing-mono mt-1.5 flex justify-between text-[10px] text-(--l-ink-3)">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="flex-1 text-center">
            {d}
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {["CSV", "Excel"].map((format) => (
          <span
            key={format}
            className="inline-flex items-center gap-1.5 rounded-md border border-(--l-rule) bg-white px-2.5 py-1.5 text-[11px] font-medium text-(--l-ink-2)"
          >
            <FileSpreadsheet className="size-3.5 text-(--l-ok)" /> Export {format}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Section ---------- */

export function FeatureBento() {
  return (
    <section id="features" className="relative scroll-mt-24 py-28">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          index="01"
          eyebrow="Modules"
          title={
            <>
              Six modules. <span className="landing-em">One calm desk.</span>
            </>
          }
          description="Stop juggling inboxes, spreadsheets and chat threads. Everything is connected, so context follows the work."
        />

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-6"
        >
          <BentoCell className="md:col-span-2 lg:col-span-4">
            <div className="grid h-full gap-4 lg:grid-cols-2">
              <CardHeader
                icon={Ticket}
                title="Tickets"
                body="Report, prioritise and resolve incidents with automatic priorities, a response-time clock on every ticket, and a queue that sorts by what’s due next."
              />
              <TicketsVisual />
            </div>
          </BentoCell>

          <BentoCell className="lg:col-span-2">
            <CardHeader
              icon={Workflow}
              title="Issues"
              body="Link repeat tickets to one Issue, record the root cause and mark known errors."
            />
            <IssuesVisual />
          </BentoCell>

          <BentoCell className="lg:col-span-2">
            <CardHeader
              icon={ShoppingBag}
              title="Catalog & requests"
              body="A shop-like catalog with custom form fields, plus approvals before anything is fulfilled."
            />
            <CatalogVisual />
          </BentoCell>

          <BentoCell className="lg:col-span-2">
            <CardHeader
              icon={GitPullRequestArrow}
              title="Change requests"
              body="Standard, normal and emergency changes with scheduled windows and a rollback path."
            />
            <ChangesVisual />
          </BentoCell>

          <BentoCell className="lg:col-span-2">
            <CardHeader
              icon={Boxes}
              title="Assets"
              body="A register of every device and licence, each linked to the tickets raised against it."
            />
            <AssetsVisual />
          </BentoCell>

          <BentoCell className="lg:col-span-3">
            <CardHeader
              icon={BookOpen}
              title="Knowledge base"
              body="Publish answers once. Employees find them on their own, and agents attach them to tickets in one click."
            />
            <KnowledgeVisual />
          </BentoCell>

          <BentoCell className="md:col-span-2 lg:col-span-3">
            <CardHeader
              icon={BarChart3}
              title="Insights & reports"
              body="Live KPIs for volume, status and on-time rate, plus organisation, person and activity reports you can export."
            />
            <InsightsVisual />
          </BentoCell>
        </motion.div>
      </div>
    </section>
  );
}
