import { Eye, EyeOff, Lock, Mail, TicketIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const SIDE_IMAGE =
  "https://images.unsplash.com/photo-1560264280-88b68371db39?auto=format&fit=crop&w=1200&q=80";

export interface LoginFormProps {
  email: string;
  password: string;
  pending?: boolean;
  rememberMe?: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onRememberMeChange?: (checked: boolean) => void;
  onSubmit: (event: React.FormEvent) => void;
  className?: string;
  children?: React.ReactNode;
}

export default function LoginForm({
  email,
  password,
  pending = false,
  rememberMe = false,
  onEmailChange,
  onPasswordChange,
  onRememberMeChange,
  onSubmit,
  className,
  children,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div
      className={cn(
        "border-border/80 bg-card flex h-[700px] w-full overflow-hidden rounded-2xl border shadow-lift",
        className,
      )}
    >
      <div className="relative hidden w-full md:inline-block">
        <img
          className="h-full w-full object-cover"
          src={SIDE_IMAGE}
          alt="Helpdesk agent assisting customers"
        />
        <div className="from-sidebar/90 via-sidebar/50 absolute inset-0 bg-gradient-to-t to-transparent" />
        <div className="absolute inset-x-0 bottom-0 space-y-2 p-8 text-white">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground mb-3 flex size-10 items-center justify-center rounded-xl">
            <TicketIcon className="size-5" />
          </div>
          <p className="text-2xl font-semibold tracking-tight">Sadhox Service Desk</p>
          <p className="max-w-sm text-sm text-white/75">
            Resolve incidents faster with a clear queue, priorities, and service catalog.
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col items-center justify-center px-6">
        <form
          className="flex w-full max-w-sm flex-col items-center justify-center"
          onSubmit={onSubmit}
        >
          <h1 className="text-foreground text-center text-4xl font-semibold tracking-tight">
            Sadhox
          </h1>
          <p className="text-muted-foreground mt-2 text-center text-sm">
            Welcome back — sign in to continue
          </p>

          <div className="border-input bg-background focus-within:border-primary/50 focus-within:ring-primary/25 mt-8 flex w-full items-center gap-2 overflow-hidden rounded-xl border px-4 shadow-soft transition-all focus-within:ring-[3px]">
            <Mail className="text-muted-foreground size-4 shrink-0" aria-hidden />
            <input
              type="email"
              placeholder="Email"
              autoComplete="username"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              className="text-foreground placeholder:text-muted-foreground h-11 w-full bg-transparent text-sm outline-none"
              required
            />
          </div>

          <div className="border-input bg-background focus-within:border-primary/50 focus-within:ring-primary/25 mt-4 flex w-full items-center gap-2 overflow-hidden rounded-xl border px-4 shadow-soft transition-all focus-within:ring-[3px]">
            <Lock className="text-muted-foreground size-4 shrink-0" aria-hidden />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              className="text-foreground placeholder:text-muted-foreground h-11 w-full bg-transparent text-sm outline-none"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-muted-foreground hover:text-foreground shrink-0 rounded-md p-1 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )}
            </button>
          </div>

          <div className="text-muted-foreground mt-6 flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                className="accent-primary size-4 rounded"
                type="checkbox"
                id="login-remember"
                checked={rememberMe}
                onChange={(event) => onRememberMeChange?.(event.target.checked)}
              />
              <label className="text-sm" htmlFor="login-remember">
                Remember me
              </label>
            </div>
            <span className="cursor-default text-sm underline opacity-60">Forgot password?</span>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="btn-gradient mt-8 h-11 w-full rounded-xl text-sm font-medium text-white shadow-soft transition-all duration-200 hover:brightness-110 hover:shadow-lift hover:-translate-y-px active:scale-[0.98] disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>

          {children}
        </form>
      </div>
    </div>
  );
}
