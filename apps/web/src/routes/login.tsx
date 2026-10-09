import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

import LoginForm from "@/components/ui/login-form";
import { ApiError, isServiceReachabilityError } from "@/lib/api";
import { homePathForRole, useAuthStore } from "@/stores/auth-store";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
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
      if (error instanceof ApiError && error.status === 401) {
        toast.error("Wrong email or password");
      } else if (isServiceReachabilityError(error)) {
        toast.error("Can't reach the service. Try again shortly.");
      } else {
        toast.error(error instanceof Error ? error.message : "Login failed");
      }
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
        />
      </div>
    </main>
  );
}
