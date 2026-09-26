import { Lock, Mail } from "lucide-react";

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
  return (
    <div className={cn("flex h-[700px] w-full overflow-hidden rounded-2xl bg-white shadow-xl", className)}>
      <div className="hidden w-full md:inline-block">
        <img
          className="h-full w-full object-cover"
          src={SIDE_IMAGE}
          alt="Helpdesk agent assisting customers"
        />
      </div>

      <div className="flex w-full flex-col items-center justify-center px-4">
        <form
          className="flex w-80 flex-col items-center justify-center md:w-96"
          onSubmit={onSubmit}
        >
          <h1 className="text-center text-5xl font-semibold tracking-tight text-gray-900">
            Sadhox
          </h1>
          <p className="mt-3 text-center text-sm text-gray-500/90">
            Welcome back! Please sign in to continue
          </p>

          <div className="mt-8 flex w-full items-center gap-2 overflow-hidden rounded-full border border-gray-300/60 bg-transparent pl-6">
            <Mail className="size-4 shrink-0 text-gray-500" aria-hidden />
            <input
              type="email"
              placeholder="Email id"
              autoComplete="username"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              className="h-12 w-full bg-transparent text-sm text-gray-500/80 outline-none placeholder:text-gray-500/80"
              required
            />
          </div>

          <div className="mt-6 flex w-full items-center gap-2 overflow-hidden rounded-full border border-gray-300/60 bg-transparent pl-6">
            <Lock className="size-4 shrink-0 text-gray-500" aria-hidden />
            <input
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              className="h-12 w-full bg-transparent text-sm text-gray-500/80 outline-none placeholder:text-gray-500/80"
              required
            />
          </div>

          <div className="mt-8 flex w-full items-center justify-between text-gray-500/80">
            <div className="flex items-center gap-2">
              <input
                className="h-5"
                type="checkbox"
                id="login-remember"
                checked={rememberMe}
                onChange={(event) => onRememberMeChange?.(event.target.checked)}
              />
              <label className="text-sm" htmlFor="login-remember">
                Remember me
              </label>
            </div>
            <span className="cursor-default text-sm underline opacity-60">
              Forgot password?
            </span>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mt-8 h-11 w-full rounded-full bg-indigo-500 text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Login"}
          </button>

          {children}
        </form>
      </div>
    </div>
  );
}
