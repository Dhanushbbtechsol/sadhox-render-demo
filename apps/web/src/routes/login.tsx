import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

import LoginForm from "@/components/ui/login-form";
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
          <div className="mt-6 w-full space-y-2 text-left">
            <p className="text-muted-foreground text-center text-xs font-medium tracking-wide uppercase">
              Demo accounts
            </p>
            <div className="flex flex-col gap-1.5">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  className="border-border/80 bg-muted/40 text-foreground hover:border-primary/30 hover:bg-accent flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs transition-all duration-200"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                  }}
                >
                  <span className="font-medium">{account.email}</span>
                  <span className="text-muted-foreground">{account.role}</span>
                </button>
              ))}
            </div>
          </div>
        </LoginForm>
      </div>
    </main>
  );
}
