import NumberFlow from "@number-flow/react";
import { Layers, Timer } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { fadeUp, PRIORITY_TONE, SectionHeading, stagger, type LandingPriority } from "../primitives";

type Level = "Low" | "Medium" | "High";
const LEVELS: Level[] = ["Low", "Medium", "High"];

/** Mirrors apps/server/src/incidents/priority.ts calculatePriority. */
function calculatePriority(impact: Level, urgency: Level): LandingPriority {
  if (impact === "High" && urgency === "High") return "P1";
  if ((impact === "High" && urgency === "Medium") || (impact === "Medium" && urgency === "High")) return "P2";
  if (
    (impact === "Medium" && urgency === "Medium") ||
    (impact === "Low" && urgency === "High") ||
    (impact === "High" && urgency === "Low")
  ) {
    return "P3";
  }
  return "P4";
}

/** Default Response time rules (seeded; Admins can edit them). */
const RULES: Record<LandingPriority, { respond: number; resolve: number; label: string }> = {
  P1: { respond: 15, resolve: 4, label: "Critical" },
  P2: { respond: 60, resolve: 8, label: "High" },
  P3: { respond: 240, resolve: 24, label: "Moderate" },
  P4: { respond: 480, resolve: 72, label: "Low" },
};

const FLOOR: LandingPriority = "P2";

function higher(a: LandingPriority, b: LandingPriority): LandingPriority {
  return a < b ? a : b;
}

function Segmented({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Level;
  onChange: (level: Level) => void;
}) {
  return (
    <div>
      <p className="landing-mono mb-2 text-[11px] tracking-[0.12em] text-(--l-ink-3) uppercase">{label}</p>
      <div
        role="radiogroup"
        aria-label={label}
        className="relative grid grid-cols-3 rounded-md border border-(--l-rule) bg-(--l-paper) p-1"
      >
        {LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={value === level}
            onClick={() => onChange(level)}
            className={cn(
              "relative z-10 rounded py-2 text-sm font-medium transition-colors",
              value === level ? "text-(--l-paper)" : "text-(--l-ink-2) hover:text-(--l-ink)",
            )}
          >
            {value === level ? (
              <motion.span
                layoutId={`seg-${label}`}
                className="absolute inset-0 -z-10 rounded bg-(--l-ink)"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            ) : null}
            {level}
          </button>
        ))}
      </div>
    </div>
  );
}

function formatRespond(minutes: number) {
  return minutes >= 60 ? { value: minutes / 60, suffix: " h" } : { value: minutes, suffix: " min" };
}

export function PriorityPlayground() {
  const [impact, setImpact] = useState<Level>("High");
  const [urgency, setUrgency] = useState<Level>("Medium");
  const [floorOn, setFloorOn] = useState(false);

  const base = calculatePriority(impact, urgency);
  const priority = floorOn ? higher(base, FLOOR) : base;
  const raised = floorOn && priority !== base;
  const rule = RULES[priority];
  const respond = formatRespond(rule.respond);

  return (
    <section className="relative py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 lg:grid-cols-2">
        <div>
          <SectionHeading
            index="03"
            align="left"
            eyebrow="Try it"
            title={
              <>
                Priority that <span className="landing-em">explains itself.</span>
              </>
            }
            description="No more arguing over what’s urgent. Every ticket is scored from impact × urgency, and Admins can set a minimum priority per subcategory so critical areas never slip."
          />
          <motion.ol
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="mt-10 border-t border-(--l-rule) text-sm text-(--l-ink-2)"
          >
            {[
              "The higher of impact × urgency, category volume and subcategory floor wins",
              "Response-time rules per P-level are editable by Admins",
              "Breaches are flagged automatically and the team is emailed",
            ].map((line, i) => (
              <motion.li key={line} variants={fadeUp} className="flex gap-4 border-b border-(--l-rule) py-3.5">
                <span className="landing-mono text-[11px] text-(--l-accent)">0{i + 1}</span>
                {line}
              </motion.li>
            ))}
          </motion.ol>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-xl border border-(--l-ink)/15 bg-white p-6 shadow-[0_30px_60px_-40px_rgb(23_22_15/0.4)] sm:p-8"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Segmented label="Impact" value={impact} onChange={setImpact} />
            <Segmented label="Urgency" value={urgency} onChange={setUrgency} />
          </div>

          <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-md border border-(--l-rule) px-4 py-3">
            <span className="flex items-center gap-3 text-sm">
              <Layers className="size-4 text-(--l-ink-3)" />
              <span>
                <span className="font-medium text-(--l-ink)">Network › Outage</span>
                <span className="block text-xs text-(--l-ink-3)">Subcategory minimum: {FLOOR}</span>
              </span>
            </span>
            <input
              type="checkbox"
              checked={floorOn}
              onChange={(event) => setFloorOn(event.target.checked)}
              className="peer sr-only"
            />
            <span className="relative h-6 w-11 shrink-0 rounded-full bg-(--l-rule) transition-colors peer-checked:bg-(--l-accent) peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--l-accent) after:absolute after:top-1 after:left-1 after:size-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
          </label>

          <div
            className="mt-6 grid grid-cols-[auto_1fr] items-center gap-6 rounded-lg bg-(--l-paper) p-5"
            aria-live="polite"
          >
            <AnimatePresence mode="popLayout">
              <motion.div
                key={priority}
                initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.6, opacity: 0, rotate: 8 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={cn(
                  "landing-display grid size-24 place-items-center rounded-lg text-4xl ring-1 ring-inset",
                  PRIORITY_TONE[priority],
                )}
              >
                {priority}
              </motion.div>
            </AnimatePresence>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-(--l-ink)">
                {rule.label} priority
                {raised ? (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="landing-mono ml-2 rounded bg-(--l-accent-soft) px-1.5 py-0.5 align-middle text-[10px] text-(--l-accent-ink)"
                  >
                    RAISED FROM {base}
                  </motion.span>
                ) : null}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-(--l-ink-3)">
                    <Timer className="size-3.5" /> First response
                  </dt>
                  <dd className="text-2xl font-semibold text-(--l-ink) tabular-nums">
                    <NumberFlow value={respond.value} suffix={respond.suffix} />
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-(--l-ink-3)">
                    <Timer className="size-3.5" /> Resolve within
                  </dt>
                  <dd className="text-2xl font-semibold text-(--l-ink) tabular-nums">
                    <NumberFlow value={rule.resolve} suffix=" h" />
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Matrix mini-map */}
          <div className="landing-mono mt-6 grid grid-cols-[auto_repeat(3,1fr)] gap-1.5 text-center text-[10px]">
            <span />
            {LEVELS.map((u) => (
              <span key={u} className="pb-1 text-(--l-ink-3)">
                {u}
              </span>
            ))}
            {[...LEVELS].reverse().map((i) => (
              <div key={i} className="contents">
                <span className="pr-2 text-right leading-7 text-(--l-ink-3)">{i}</span>
                {LEVELS.map((u) => {
                  const cell = calculatePriority(i, u);
                  const active = i === impact && u === urgency;
                  return (
                    <button
                      key={u}
                      type="button"
                      aria-label={`Impact ${i}, urgency ${u}: ${cell}`}
                      onClick={() => {
                        setImpact(i);
                        setUrgency(u);
                      }}
                      className={cn(
                        "h-7 rounded ring-1 ring-inset transition-all",
                        PRIORITY_TONE[cell],
                        active ? "ring-2 ring-(--l-ink)" : "opacity-55 hover:opacity-100",
                      )}
                    >
                      {cell}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-[10px] text-(--l-ink-3)">
            Rows: impact · Columns: urgency · Default rules shown; Admins can tune them.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
