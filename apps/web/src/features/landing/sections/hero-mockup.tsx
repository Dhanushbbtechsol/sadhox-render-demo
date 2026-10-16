import NumberFlow from "@number-flow/react";
import {
  BarChart3,
  BookOpen,
  Boxes,
  CheckCircle2,
  GitPullRequestArrow,
  LayoutDashboard,
  MessageSquare,
  Search,
  ShoppingBag,
  Ticket,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { PriorityPill, type LandingPriority } from "../primitives";

type QueueRow = {
  ref: string;
  title: string;
  priority: LandingPriority;
  agent: string;
  /** Seconds left on the resolve clock when the row appears. */
  remaining: number;
  total: number;
};

const H = 3600;

const POOL: QueueRow[] = [
  { ref: "INC-000142", title: "VPN drops for the Finance team", priority: "P1", agent: "AK", remaining: 3 * H + 42 * 60, total: 4 * H },
  { ref: "INC-000139", title: "Outlook not syncing on mobile", priority: "P2", agent: "RS", remaining: 5 * H + 12 * 60, total: 8 * H },
  { ref: "REQ-000087", title: "New laptop for design onboarding", priority: "P3", agent: "MJ", remaining: 19 * H, total: 24 * H },
  { ref: "INC-000137", title: "Printer queue stuck on floor 3", priority: "P3", agent: "AK", remaining: 9 * H + 30 * 60, total: 24 * H },
  { ref: "CHG-000021", title: "Firewall rule update (Normal)", priority: "P4", agent: "DV", remaining: 61 * H, total: 72 * H },
  { ref: "INC-000143", title: "Payroll portal returns 502", priority: "P1", agent: "RS", remaining: 3 * H + 58 * 60, total: 4 * H },
  { ref: "REQ-000088", title: "Figma licence for marketing", priority: "P4", agent: "MJ", remaining: 70 * H, total: 72 * H },
  { ref: "INC-000144", title: "Wi-Fi slow in meeting room B", priority: "P2", agent: "DV", remaining: 7 * H + 20 * 60, total: 8 * H },
];

const NAV = [LayoutDashboard, Ticket, Search, ShoppingBag, GitPullRequestArrow, Boxes, BookOpen, BarChart3];

function formatClock(seconds: number) {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / H);
  const m = Math.floor((s % H) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function HeroMockup() {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);

  // Rows enter one at a time from the pool; `tick` drives countdowns.
  const [rows, setRows] = useState(() =>
    POOL.slice(0, 4).map((row, i) => ({ ...row, key: `${row.ref}-${i}`, born: 0 })),
  );
  const [tick, setTick] = useState(0);
  const [kpi, setKpi] = useState({ open: 128, onTime: 96.4, resolved: 42 });
  const tickRef = useRef(0);
  const cursor = useRef(4);

  useEffect(() => {
    if (reduce) return;
    const clock = window.setInterval(() => {
      tickRef.current += 1;
      setTick(tickRef.current);
    }, 1000);
    const feed = window.setInterval(() => {
      const next = POOL[cursor.current % POOL.length]!;
      cursor.current += 1;
      const row = { ...next, key: `${next.ref}-${cursor.current}`, born: tickRef.current };
      setRows((prev) => [row, ...prev].slice(0, 4));
      setKpi((k) => ({
        open: k.open + (Math.random() > 0.5 ? 1 : -1),
        onTime: Math.min(99.4, Math.max(94.1, +(k.onTime + (Math.random() - 0.4) * 0.6).toFixed(1))),
        resolved: k.resolved + 1,
      }));
    }, 3400);
    return () => {
      window.clearInterval(clock);
      window.clearInterval(feed);
    };
  }, [reduce]);

  // Pointer tilt + scroll-driven "lay flat" as the hero scrolls away.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ["start end", "end start"] });
  const scrollTilt = useTransform(scrollYProgress, [0.15, 0.5], [14, 0]);
  const rotateX = useSpring(
    useTransform([py, scrollTilt], ([y, s]) => (y as number) * -6 + (s as number)),
    { stiffness: 120, damping: 20 },
  );
  const rotateY = useSpring(useTransform(px, (x) => x * 8), { stiffness: 120, damping: 20 });
  const scale = useTransform(scrollYProgress, [0.15, 0.5], [0.95, 1]);

  function onMove(event: React.PointerEvent<HTMLDivElement>) {
    if (reduce) return;
    const rect = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - rect.left) / rect.width - 0.5);
    py.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  return (
    <div
      ref={wrapRef}
      onPointerMove={onMove}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
      className="relative mx-auto w-full max-w-5xl [perspective:1800px]"
    >
      <motion.div
        style={reduce ? undefined : { rotateX, rotateY, scale, transformStyle: "preserve-3d" }}
        className="relative overflow-hidden rounded-xl border border-(--l-ink)/15 bg-white shadow-[0_1px_0_var(--l-rule),0_40px_80px_-40px_rgb(23_22_15/0.35)]"
        aria-label="Preview of the ITSM agent dashboard"
        role="img"
      >
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-(--l-rule) bg-(--l-card) px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-(--l-rule)" />
          <span className="size-2.5 rounded-full bg-(--l-rule)" />
          <span className="size-2.5 rounded-full bg-(--l-rule)" />
          <div className="landing-mono mx-auto flex items-center gap-2 rounded border border-(--l-rule) bg-white px-3 py-0.5 text-[11px] text-(--l-ink-3)">
            <span className="size-1.5 rounded-full bg-(--l-ok)" />
            itsm / tickets
          </div>
        </div>

        <div className="flex">
          <div className="hidden w-14 shrink-0 flex-col items-center gap-3 bg-(--l-ink) py-4 sm:flex">
            {NAV.map((Icon, i) => (
              <div
                key={i}
                className={
                  i === 1
                    ? "grid size-8 place-items-center rounded-md bg-(--l-paper) text-(--l-ink)"
                    : "grid size-8 place-items-center rounded-md text-(--l-cream)/50"
                }
              >
                <Icon className="size-4" />
              </div>
            ))}
          </div>

          <div className="min-w-0 flex-1 space-y-4 p-4 sm:p-5">
            {/* KPIs */}
            <div className="grid grid-cols-3 divide-x divide-(--l-rule) rounded-lg border border-(--l-rule)">
              <Kpi label="Open tickets">
                <NumberFlow value={kpi.open} />
              </Kpi>
              <Kpi label="On time">
                <NumberFlow value={kpi.onTime} format={{ minimumFractionDigits: 1 }} suffix="%" />
              </Kpi>
              <Kpi label="Resolved today">
                <NumberFlow value={kpi.resolved} />
              </Kpi>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_200px]">
              {/* Queue */}
              <div className="rounded-lg border border-(--l-rule)">
                <div className="flex items-center justify-between border-b border-(--l-rule) px-3 py-2 text-[11px] text-(--l-ink-3)">
                  <span>My queue · sorted by deadline</span>
                  <span className="landing-mono flex items-center gap-1.5 text-(--l-ok)">
                    <span className="relative flex size-1.5">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-(--l-ok) opacity-60" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-(--l-ok)" />
                    </span>
                    LIVE
                  </span>
                </div>
                <ul className="relative">
                  <AnimatePresence initial={false}>
                    {[...rows]
                      .sort((a, b) => a.remaining - (tick - a.born) - (b.remaining - (tick - b.born)))
                      .map((row) => {
                        const left = row.remaining - (tick - row.born);
                        const pct = Math.max(4, (left / row.total) * 100);
                        return (
                          <motion.li
                            key={row.key}
                            layout
                            initial={{ opacity: 0, y: -18, backgroundColor: "rgba(212,71,31,0.08)" }}
                            animate={{ opacity: 1, y: 0, backgroundColor: "rgba(212,71,31,0)" }}
                            exit={{ opacity: 0, x: 40 }}
                            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-(--l-rule)/70 px-3 py-2.5 last:border-0"
                          >
                            <PriorityPill priority={row.priority} />
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-medium text-(--l-ink)">{row.title}</p>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="landing-mono text-[10px] text-(--l-ink-3)">{row.ref}</span>
                                <div className="h-[3px] flex-1 overflow-hidden bg-(--l-paper-2)">
                                  <div
                                    className={cn(
                                      "h-full transition-[width] duration-1000",
                                      pct < 30 ? "bg-(--l-accent)" : "bg-(--l-ink)/70",
                                    )}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="landing-mono hidden text-[11px] text-(--l-ink-2) tabular-nums sm:inline">
                                {formatClock(left)}
                              </span>
                              <span className="landing-mono grid size-6 place-items-center rounded-full border border-(--l-rule) bg-(--l-card) text-[9px] text-(--l-ink-2)">
                                {row.agent}
                              </span>
                            </div>
                          </motion.li>
                        );
                      })}
                  </AnimatePresence>
                </ul>
              </div>

              {/* Mini chart */}
              <div className="hidden flex-col rounded-lg border border-(--l-rule) p-3 lg:flex">
                <p className="text-[11px] text-(--l-ink-3)">Volume · 7 days</p>
                <svg viewBox="0 0 180 110" className="mt-2 w-full flex-1" aria-hidden>
                  <g stroke="var(--l-rule)" strokeWidth="1">
                    <line x1="0" x2="180" y1="30" y2="30" />
                    <line x1="0" x2="180" y1="60" y2="60" />
                    <line x1="0" x2="180" y1="90" y2="90" />
                  </g>
                  <motion.path
                    d="M0 80 C 20 70, 30 40, 50 52 S 85 88, 105 60 S 140 20, 180 30"
                    fill="none"
                    stroke="var(--l-ink)"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.9, duration: 1.6, ease: "easeInOut" }}
                  />
                  <motion.circle
                    cx="176"
                    cy="31"
                    r="3.5"
                    fill="var(--l-accent)"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 2.4 }}
                  />
                </svg>
                <div className="landing-mono mt-2 grid grid-cols-2 gap-2 text-[10px]">
                  <div className="rounded bg-[#e3eee6] px-2 py-1 text-(--l-ok)">MET 412</div>
                  <div className="rounded bg-(--l-accent-soft) px-2 py-1 text-(--l-accent-ink)">LATE 9</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Realtime events */}
      <FloatingToast
        className="-bottom-12 left-4 xl:-left-16"
        delay={1.6}
        icon={<MessageSquare className="size-4 text-(--l-ink)" />}
        title="Alice replied on INC-000142"
        body="“Rolled back the VPN profile, can you retry?”"
      />
      <FloatingToast
        className="-top-7 -right-4 xl:-right-14"
        delay={2.1}
        icon={<CheckCircle2 className="size-4 text-(--l-ok)" />}
        title="REQ-000087 approved"
        body="Sent to the agent to fulfil"
        floatOffset={-10}
      />
    </div>
  );
}

function Kpi({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-3">
      <p className="landing-mono truncate text-[10px] tracking-wide text-(--l-ink-3) uppercase">{label}</p>
      <div className="mt-1 text-xl font-semibold text-(--l-ink) tabular-nums sm:text-2xl">{children}</div>
    </div>
  );
}

function FloatingToast({
  className,
  delay,
  icon,
  title,
  body,
  floatOffset = 10,
}: {
  className: string;
  delay: number;
  icon: React.ReactNode;
  title: string;
  body: string;
  floatOffset?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`absolute z-10 hidden md:block ${className}`}
      aria-hidden
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, floatOffset, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="flex w-64 items-start gap-3 rounded-lg border border-(--l-ink)/15 bg-white p-3.5 shadow-[0_16px_40px_-20px_rgb(23_22_15/0.35)]"
      >
        <div className="grid size-8 shrink-0 place-items-center rounded-md bg-(--l-paper)">{icon}</div>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-(--l-ink)">{title}</p>
          <p className="mt-0.5 text-[11px] text-(--l-ink-3)">{body}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
