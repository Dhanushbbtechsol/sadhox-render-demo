import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

import LoginForm from "@/components/ui/login-form";
import { homePathForRole, useAuthStore } from "@/stores/auth-store";
import type { UserRole } from "@/types/itsm";

/** Dev-only role shortcuts — no passwords in the client bundle. */
const ROLE_PRESETS: { role: UserRole; email: string; label: string }[] =
  import.meta.env.DEV
    ? [
        { role: "EndUser", email: "enduser@sadhox.local", label: "EndUser" },
        { role: "Agent", email: "agent@sadhox.local", label: "Agent" },
        { role: "Admin", email: "admin@sadhox.local", label: "Admin" },
      ]
    : [];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const loginAsRole = useAuthStore((s) => s.loginAsRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
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
    <main className="bg-background relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-8">
      <div className="bg-primary/10 pointer-events-none absolute -top-24 left-1/4 size-72 rounded-full blur-3xl" />
      <div className="bg-accent/40 pointer-events-none absolute right-1/5 -bottom-24 size-80 rounded-full blur-3xl" />
      <div className="relative z-10 w-full max-w-5xl animate-in-up">
        <LoginForm
          email={email}
          password={password}
          pending={pending}
          rememberMe={rememberMe}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onRememberMeChange={setRememberMe}
          onSubmit={handleSubmit}
        >
          {ROLE_PRESETS.length > 0 ? (
            <div className="mt-6 w-full space-y-2 text-left">
              <p className="text-muted-foreground text-center text-xs font-medium tracking-wide uppercase">
                Quick role switch (dev only)
              </p>
              <div className="flex flex-col gap-1.5">
                {ROLE_PRESETS.map((preset) => (
                  <button
                    key={preset.role}
                    type="button"
                    className="border-border/80 bg-muted/40 text-foreground hover:border-primary/30 hover:bg-accent flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs transition-all duration-200"
                    onClick={() => {
                      loginAsRole(preset.role);
                      toast.success(`Signed in as ${preset.label}`);
                      const from = (location.state as { from?: string } | null)?.from;
                      const target =
                        from && from !== "/login" ? from : homePathForRole(preset.role);
                      void navigate(target, { replace: true });
                    }}
                  >
                    <span className="font-medium">{preset.email}</span>
                    <span className="text-muted-foreground">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </LoginForm>
      </div>
    </main>
  );
}
