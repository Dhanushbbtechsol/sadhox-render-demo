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
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-slate-100 px-4 py-8">
      <div className="relative z-10 w-full max-w-5xl">
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
              <p className="text-center text-xs font-medium uppercase tracking-wide text-gray-400">
                Quick role switch (dev only)
              </p>
              <div className="flex flex-col gap-1">
                {ROLE_PRESETS.map((preset) => (
                  <button
                    key={preset.role}
                    type="button"
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs text-gray-700 transition-colors hover:bg-gray-100"
                    onClick={() => {
                      loginAsRole(preset.role);
                      toast.success(`Signed in as ${preset.label}`);
                      const from = (location.state as { from?: string } | null)?.from;
                      const target =
                        from && from !== "/login" ? from : homePathForRole(preset.role);
                      void navigate(target, { replace: true });
                    }}
                  >
                    <span>{preset.email}</span>
                    <span className="text-gray-400">{preset.label}</span>
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
