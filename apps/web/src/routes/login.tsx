import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { homePathForRole, useAuthStore } from "@/stores/auth-store";

const DEMO_ACCOUNTS = [
  { email: "agent@sadhox.local", password: "password", role: "Agent" },
  { email: "user@sadhox.local", password: "password", role: "EndUser" },
  { email: "admin@sadhox.local", password: "password", role: "Admin" },
] as const;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("agent@sadhox.local");
  const [password, setPassword] = useState("password");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const user = await login(email, password);
      const from = (location.state as { from?: string } | null)?.from;
      const target = from && from !== "/login" ? from : homePathForRole(user.role);
      toast.success(`Signed in as ${user.role}`);
      void navigate(target, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#1c1824] px-4">
      {/* Mesh gradient background — faded / lighter */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <style>
          {`
            @keyframes float1 {
              0%, 100% { transform: translate(0, 0); }
              50% { transform: translate(-10px, 10px); }
            }
            @keyframes float2 {
              0%, 100% { transform: translate(0, 0); }
              50% { transform: translate(10px, -10px); }
            }
          `}
        </style>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 800 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full opacity-90"
        >
          <defs>
            <linearGradient id="login_grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d4a017" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#b45309" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="login_grad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.65" />
            </linearGradient>
            <radialGradient id="login_grad3" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.35" />
            </radialGradient>
            <filter id="login_blur1" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="40" />
            </filter>
            <filter id="login_blur2" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="30" />
            </filter>
            <filter id="login_blur3" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="50" />
            </filter>
          </defs>
          <g style={{ animation: "float1 20s ease-in-out infinite" }}>
            <ellipse
              cx="200"
              cy="500"
              rx="280"
              ry="200"
              fill="url(#login_grad1)"
              filter="url(#login_blur1)"
              transform="rotate(-30 200 500)"
            />
            <rect
              x="480"
              y="60"
              width="340"
              height="280"
              rx="80"
              fill="url(#login_grad2)"
              filter="url(#login_blur2)"
              transform="rotate(15 650 200)"
            />
          </g>
          <g style={{ animation: "float2 25s ease-in-out infinite" }}>
            <circle
              cx="650"
              cy="450"
              r="170"
              fill="url(#login_grad3)"
              filter="url(#login_blur3)"
              opacity="0.85"
            />
            <ellipse
              cx="80"
              cy="140"
              rx="200"
              ry="140"
              fill="#ca8a04"
              filter="url(#login_blur2)"
              opacity="0.45"
            />
          </g>
        </svg>
        {/* Soft fade wash so the scene reads lighter */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white/5" />
      </div>

      <div
        className="relative z-10 w-full max-w-md space-y-6 rounded-2xl border border-white/20 p-6 text-white shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.1) 100%)",
        }}
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Sadhox
          </h1>
          <p className="text-sm text-white/70">
            Sign in to the ITSM workspace.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-white/85">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="border-white/20 bg-white/10 text-white shadow-none backdrop-blur-sm placeholder:text-white/40 focus-visible:border-white/35"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-white/85">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="border-white/20 bg-white/10 text-white shadow-none backdrop-blur-sm placeholder:text-white/40 focus-visible:border-white/35"
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-white/55">
            Demo accounts
          </p>
          <div className="flex flex-col gap-1">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                className="flex items-center justify-between rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-left text-xs text-white/90 backdrop-blur-sm transition-colors hover:bg-white/15"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                }}
              >
                <span>{account.email}</span>
                <span className="text-white/55">{account.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
