import {
  CheckCircle2,
  Inbox,
  MailCheck,
  MessagesSquare,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
import { useRef } from "react";

import { gsap, ScrollTrigger, useGSAP } from "../gsap";
import { SectionHeading } from "../primitives";

type Stage = {
  status: string;
  title: string;
  body: string;
  points: string[];
  icon: LucideIcon;
};

const STAGES: Stage[] = [
  {
    status: "New",
    title: "Reported in seconds",
    body: "An employee describes the problem from the portal. Categories guide them, and priority is worked out from impact and urgency.",
    points: ["Guided categories", "Automatic P1–P4", "Deadline starts now"],
    icon: Inbox,
  },
  {
    status: "Assigned",
    title: "Routed to the right person",
    body: "Round-robin or least-loaded assignment picks an agent from the project team, so no ticket waits in limbo.",
    points: ["Round-robin", "Least-loaded", "Project-scoped pools"],
    icon: UserRoundCheck,
  },
  {
    status: "In progress",
    title: "Worked on together, live",
    body: "Agents and requesters talk in real-time comments. Related knowledge articles, assets and known issues sit right beside the ticket.",
    points: ["Live comments", "Linked articles", "Linked assets"],
    icon: MessagesSquare,
  },
  {
    status: "Resolved",
    title: "Fixed — and everyone knows",
    body: "The requester is emailed the moment it's resolved. Recurring faults roll up into an Issue with its root cause recorded.",
    points: ["Email notification", "Root-cause issues", "Known errors"],
    icon: MailCheck,
  },
  {
    status: "Closed",
    title: "Closed automatically",
    body: "Resolved tickets close themselves after three days, and every step along the way stays in the audit trail.",
    points: ["Auto-close", "Full history", "Reportable"],
    icon: CheckCircle2,
  },
];

export function LifecycleSection() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const trackEl = track.current!;
        const distance = () => trackEl.scrollWidth - window.innerWidth + 96;

        const scroller = gsap.to(trackEl, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: ".lifecycle-pin",
            pin: true,
            scrub: 0.8,
            start: "top top",
            end: () => `+=${distance()}`,
            invalidateOnRefresh: true,
          },
        });

        gsap.fromTo(
          ".lifecycle-progress",
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
              trigger: ".lifecycle-pin",
              start: "top top",
              end: () => `+=${distance()}`,
              scrub: 0.8,
            },
          },
        );

        gsap.utils.toArray<HTMLElement>(".lifecycle-card").forEach((card) => {
          ScrollTrigger.create({
            trigger: card,
            containerAnimation: scroller,
            start: "left 65%",
            end: "right 35%",
            toggleClass: { targets: card, className: "is-active" },
          });
          gsap.from(card.querySelectorAll(".lifecycle-point"), {
            opacity: 0,
            x: 24,
            stagger: 0.08,
            scrollTrigger: { trigger: card, containerAnimation: scroller, start: "left 75%" },
          });
        });
      });

      mm.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>(".lifecycle-card").forEach((card) => {
          gsap.from(card, {
            y: 40,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: card, start: "top 85%" },
          });
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.utils.toArray<HTMLElement>(".lifecycle-card").forEach((card) => card.classList.add("is-active"));
      });
    },
    { scope: section },
  );

  return (
    <section ref={section} id="lifecycle" className="relative scroll-mt-10 bg-(--l-night) py-24 text-(--l-cream) lg:py-0">
      <div className="lifecycle-pin relative flex flex-col justify-center overflow-hidden lg:h-svh">
        <div className="mx-auto w-full max-w-6xl px-4">
          <SectionHeading
            index="02"
            tone="dark"
            align="left"
            eyebrow="How it works"
            title={
              <>
                From <span className="landing-em">“it’s broken”</span> to “it’s closed”.
              </>
            }
            description="One ticket, five stages, zero guesswork. Scroll to follow it through the desk."
          />

          {/* Progress rail */}
          <div className="relative mt-10 hidden h-px bg-(--l-cream)/15 lg:block">
            <div className="lifecycle-progress absolute inset-x-0 -top-px h-[3px] origin-left bg-(--l-accent)" />
          </div>
        </div>

        <div
          ref={track}
          className="mt-10 flex flex-col gap-5 px-4 lg:w-max lg:flex-row lg:gap-6 lg:pr-24 lg:pl-[max(1rem,calc((100vw-72rem)/2+1rem))]"
        >
          {STAGES.map((stage, index) => (
            <article
              key={stage.status}
              className="lifecycle-card group relative w-full shrink-0 overflow-hidden rounded-xl border border-(--l-cream)/15 bg-(--l-night-2) p-7 transition-all duration-500 lg:w-[400px] lg:opacity-50 lg:[&.is-active]:opacity-100 [&.is-active]:border-(--l-cream)/40"
            >
              <span className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-(--l-accent) transition-transform duration-700 group-[.is-active]:scale-x-100" />
              <div className="flex items-center justify-between">
                <div className="grid size-11 place-items-center rounded-md bg-(--l-cream)/10 text-(--l-cream) transition-colors duration-500 group-[.is-active]:bg-(--l-accent)">
                  <stage.icon className="size-5" />
                </div>
                <span className="landing-mono text-xs text-(--l-cream-2)">0{index + 1} / 05</span>
              </div>

              <p className="landing-mono mt-7 text-[11px] tracking-[0.14em] text-(--l-cream-2) uppercase">{stage.status}</p>
              <h3 className="landing-display mt-2 text-2xl text-(--l-cream)">{stage.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-(--l-cream-2)">{stage.body}</p>

              <ul className="mt-6 flex flex-wrap gap-2">
                {stage.points.map((point) => (
                  <li
                    key={point}
                    className="lifecycle-point rounded border border-(--l-cream)/15 px-2.5 py-1 text-xs text-(--l-cream)"
                  >
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
