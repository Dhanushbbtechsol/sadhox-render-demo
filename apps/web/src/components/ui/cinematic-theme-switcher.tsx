import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";

import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

interface Particle {
  id: number;
  delay: number;
  duration: number;
}

type SwitcherSize = "sm" | "md";

const sizeStyles = {
  sm: {
    track: "h-9 w-[58px] p-[3px]",
    thumb: "h-7 w-7",
    thumbTravel: 26,
    icon: 14,
    bgIcon: 12,
    px: "px-2",
  },
  md: {
    track: "h-[64px] w-[104px] p-[6px]",
    thumb: "h-[44px] w-[44px]",
    thumbTravel: 46,
    icon: 20,
    bgIcon: 20,
    px: "px-4",
  },
} as const;

export type CinematicThemeSwitcherProps = {
  size?: SwitcherSize;
  className?: string;
};

export function CinematicThemeSwitcher({
  size = "sm",
  className,
}: CinematicThemeSwitcherProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const reactId = useId();
  const grainLightId = `grain-light-${reactId}`;
  const grainDarkId = `grain-dark-${reactId}`;

  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const isDark = mounted && (theme === "dark" || resolvedTheme === "dark");
  const s = sizeStyles[size];

  useEffect(() => {
    setMounted(true);
  }, []);

  const generateParticles = () => {
    const newParticles: Particle[] = [];
    const particleCount = 3;

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        delay: i * 0.1,
        duration: 0.6 + i * 0.1,
      });
    }

    setParticles(newParticles);
    setIsAnimating(true);

    window.setTimeout(() => {
      setIsAnimating(false);
      setParticles([]);
    }, 1000);
  };

  const handleToggle = () => {
    generateParticles();
    setTheme(isDark ? "light" : "dark");
  };

  if (!mounted) {
    return (
      <div className={cn("relative inline-block", className)}>
        <div
          className={cn(
            "relative flex items-center rounded-full bg-muted",
            s.track,
          )}
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className={cn("relative inline-block", className)}>
      <svg className="absolute h-0 w-0" aria-hidden>
        <defs>
          <filter id={grainLightId}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
            <feColorMatrix in="noise" type="saturate" values="0" result="desaturatedNoise" />
            <feComponentTransfer in="desaturatedNoise" result="lightGrain">
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feBlend in="SourceGraphic" in2="lightGrain" mode="overlay" />
          </filter>
          <filter id={grainDarkId}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
            <feColorMatrix in="noise" type="saturate" values="0" result="desaturatedNoise" />
            <feComponentTransfer in="desaturatedNoise" result="darkGrain">
              <feFuncA type="linear" slope="0.5" />
            </feComponentTransfer>
            <feBlend in="SourceGraphic" in2="darkGrain" mode="overlay" />
          </filter>
        </defs>
      </svg>

      <motion.button
        ref={toggleRef}
        type="button"
        onClick={handleToggle}
        className={cn(
          "relative flex items-center rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          s.track,
        )}
        style={{
          background: isDark
            ? "radial-gradient(ellipse at top left, #1e293b 0%, #0f172a 40%, #020617 100%)"
            : "radial-gradient(ellipse at top left, #ffffff 0%, #f1f5f9 40%, #cbd5e1 100%)",
          boxShadow: isDark
            ? `
              inset 5px 5px 12px rgba(0, 0, 0, 0.9),
              inset -5px -5px 12px rgba(71, 85, 105, 0.4),
              inset 0 2px 4px rgba(0, 0, 0, 1),
              0 2px 4px rgba(0, 0, 0, 0.4),
              0 8px 16px rgba(0, 0, 0, 0.3)
            `
            : `
              inset 5px 5px 12px rgba(148, 163, 184, 0.5),
              inset -5px -5px 12px rgba(255, 255, 255, 1),
              inset 0 2px 4px rgba(148, 163, 184, 0.4),
              0 2px 4px rgba(0, 0, 0, 0.1),
              0 8px 16px rgba(0, 0, 0, 0.08)
            `,
          border: isDark
            ? "2px solid rgba(51, 65, 85, 0.6)"
            : "2px solid rgba(203, 213, 225, 0.6)",
        }}
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        role="switch"
        aria-checked={isDark}
        whileTap={{ scale: 0.98 }}
      >
        <div
          className="pointer-events-none absolute inset-[3px] rounded-full"
          style={{
            boxShadow: isDark
              ? "inset 0 2px 6px rgba(0, 0, 0, 0.9), inset 0 -1px 3px rgba(71, 85, 105, 0.3)"
              : "inset 0 2px 6px rgba(100, 116, 139, 0.4), inset 0 -1px 3px rgba(255, 255, 255, 0.8)",
          }}
        />

        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background: isDark
              ? `
                radial-gradient(ellipse at top, rgba(71, 85, 105, 0.15) 0%, transparent 50%),
                linear-gradient(to bottom, rgba(71, 85, 105, 0.2) 0%, transparent 30%, transparent 70%, rgba(0, 0, 0, 0.3) 100%)
              `
              : `
                radial-gradient(ellipse at top, rgba(255, 255, 255, 0.8) 0%, transparent 50%),
                linear-gradient(to bottom, rgba(255, 255, 255, 0.7) 0%, transparent 30%, transparent 70%, rgba(148, 163, 184, 0.15) 100%)
              `,
            mixBlendMode: "overlay",
          }}
        />

        <div className={cn("absolute inset-0 flex items-center justify-between", s.px)}>
          <Sun
            size={s.bgIcon}
            className={isDark ? "text-yellow-100" : "text-amber-600"}
            aria-hidden
          />
          <Moon
            size={s.bgIcon}
            className={isDark ? "text-yellow-100" : "text-slate-700"}
            aria-hidden
          />
        </div>

        <motion.div
          className={cn(
            "relative z-10 flex items-center justify-center overflow-hidden rounded-full",
            s.thumb,
          )}
          style={{
            background: isDark
              ? "linear-gradient(145deg, #64748b 0%, #475569 50%, #334155 100%)"
              : "linear-gradient(145deg, #ffffff 0%, #fefefe 50%, #f8fafc 100%)",
            boxShadow: isDark
              ? `
                inset 2px 2px 4px rgba(100, 116, 139, 0.4),
                inset -2px -2px 4px rgba(0, 0, 0, 0.8),
                0 4px 12px rgba(0, 0, 0, 0.5)
              `
              : `
                inset 2px 2px 4px rgba(203, 213, 225, 0.3),
                inset -2px -2px 4px rgba(255, 255, 255, 1),
                0 4px 12px rgba(0, 0, 0, 0.12)
              `,
            border: isDark
              ? "2px solid rgba(148, 163, 184, 0.3)"
              : "2px solid rgba(255, 255, 255, 0.9)",
          }}
          animate={{ x: isDark ? s.thumbTravel : 0 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                "linear-gradient(to bottom, rgba(255, 255, 255, 0.4) 0%, transparent 40%, rgba(0, 0, 0, 0.1) 100%)",
              mixBlendMode: "overlay",
            }}
          />

          {isAnimating &&
            particles.map((particle) => (
              <motion.div
                key={particle.id}
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: "10px",
                    height: "10px",
                    background: isDark
                      ? "radial-gradient(circle, rgba(147, 197, 253, 0.5) 0%, rgba(147, 197, 253, 0) 70%)"
                      : "radial-gradient(circle, rgba(251, 191, 36, 0.7) 0%, rgba(251, 191, 36, 0) 70%)",
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: isDark ? 6 : 8, opacity: [0, 1, 0] }}
                  transition={{
                    duration: isDark ? 0.5 : particle.duration,
                    delay: particle.delay,
                    ease: "easeOut",
                  }}
                />
              </motion.div>
            ))}

          <div className="relative z-10">
            {isDark ? (
              <Moon size={s.icon} className="text-yellow-200" aria-hidden />
            ) : (
              <Sun size={s.icon} className="text-amber-500" aria-hidden />
            )}
          </div>
        </motion.div>
      </motion.button>
    </div>
  );
}

export default CinematicThemeSwitcher;
