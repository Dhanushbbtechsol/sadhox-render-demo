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
          <div className="mt-6 w-full space-y-2 text-left">
            <p className="text-center text-xs font-medium uppercase tracking-wide text-gray-400">
              Demo accounts
            </p>
            <div className="flex flex-col gap-1">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs text-gray-700 transition-colors hover:bg-gray-100"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                  }}
                >
                  <span>{account.email}</span>
                  <span className="text-gray-400">{account.role}</span>
                </button>
              ))}
            </div>
          </div>
        </LoginForm>
      </div>
    </main>
  );
}
