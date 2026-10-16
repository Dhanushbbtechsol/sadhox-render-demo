import {
  BellRing,
  FolderLock,
  Hash,
  History,
  KeyRound,
  Radio,
  ShieldCheck,
  TimerReset,
  type LucideIcon,
} from "lucide-react";
import { useRef } from "react";

import { gsap, ScrollTrigger, useGSAP } from "../gsap";
import { SectionHeading } from "../primitives";

const ITEMS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: ShieldCheck, title: "Role-based access", body: "Four roles with server-enforced permissions on every screen and action." },
  { icon: FolderLock, title: "Project-level privacy", body: "People only see tickets, requests and changes for the projects they belong to." },
  { icon: KeyRound, title: "Secure sessions", body: "Short-lived access tokens with a rotating, httpOnly refresh cookie." },
  { icon: History, title: "Complete audit trail", body: "Every create, update and approval is logged with who, what and when." },
  { icon: Radio, title: "Real-time by default", body: "Comments and updates appear instantly for everyone on the ticket." },
  { icon: TimerReset, title: "Automated checks", body: "Background jobs flag late tickets and auto-close resolved ones." },
  { icon: BellRing, title: "Email notifications", body: "Requesters and teams are told the moment something changes." },
  { icon: Hash, title: "Readable references", body: "INC, ISS, REQ, CHG and AST codes everyone can quote on a call." },
];

export function PlatformSection() {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(".platform-item", { opacity: 0, y: 40 });
        ScrollTrigger.batch(".platform-item", {
          start: "top 88%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: "power3.out", overwrite: true }),
        });

        gsap.to(".platform-ring", {
          rotate: 360,
          ease: "none",
          scrollTrigger: { trigger: scope.current, start: "top bottom", end: "bottom top", scrub: 1 },
        });
      });
    },
    { scope },
  );

  return (
    <section ref={scope} id="platform" className="relative scroll-mt-24 py-28">
      <div className="mx-auto grid max-w-6xl gap-14 px-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionHeading
            index="05"
            align="left"
            eyebrow="Trust & reliability"
            title={
              <>
                Built to be <span className="landing-em">trusted.</span>
              </>
            }
            description="Security and accountability aren’t add-ons. They’re built into how every ticket, request and change moves through the desk."
          />

          <div className="relative mt-12 hidden size-56 lg:block" aria-hidden>
            <div className="platform-ring absolute inset-0 rounded-full border border-dashed border-(--l-ink)/25" />
            <div className="platform-ring absolute inset-6 rounded-full border border-dotted border-(--l-accent)/60" />
            <div className="absolute inset-14 grid place-items-center rounded-full bg-(--l-ink)">
              <ShieldCheck className="size-12 text-(--l-paper)" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        <div className="grid border-t border-l border-(--l-rule) sm:grid-cols-2">
          {ITEMS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="platform-item group border-r border-b border-(--l-rule) p-6 transition-colors hover:bg-(--l-card)"
            >
              <Icon className="size-5 text-(--l-accent)" strokeWidth={1.75} />
              <h3 className="mt-5 text-base font-semibold text-(--l-ink)">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-(--l-ink-2)">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
