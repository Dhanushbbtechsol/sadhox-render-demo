import { Lock, Mail } from "lucide-react";

import { cn } from "@/lib/utils";

export interface LoginDemoFormProps {
  email?: string;
  password?: string;
  pending?: boolean;
  onEmailChange?: (email: string) => void;
  onPasswordChange?: (password: string) => void;
  onSubmit?: (event: React.FormEvent) => void;
  className?: string;
}

/** Compact card-style login demo used as an alternate layout. */
export default function LoginDemoForm({
  email = "",
  password = "",
  pending = false,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  className,
}: LoginDemoFormProps) {
  return (
    <form
      className={cn(
        "w-full max-w-96 rounded-2xl border border-gray-300/60 bg-white px-8 text-center",
        className,
      )}
      onSubmit={onSubmit}
    >
      <h1 className="mt-10 text-center text-5xl font-semibold tracking-tight text-gray-900">
        Sadhox
      </h1>
      <p className="mt-2 text-sm text-gray-500">Please sign in to continue</p>

      <div className="mt-10 flex h-12 w-full items-center gap-2 overflow-hidden rounded-full border border-gray-300/80 bg-white pl-6">
        <Mail className="size-4 shrink-0 text-gray-500" aria-hidden />
        <input
          type="email"
          placeholder="Email id"
          autoComplete="username"
          value={email}
          onChange={(event) => onEmailChange?.(event.target.value)}
          className="h-full w-full bg-transparent text-sm text-gray-500 outline-none placeholder:text-gray-500"
          required
        />
      </div>

      <div className="mt-4 flex h-12 w-full items-center gap-2 overflow-hidden rounded-full border border-gray-300/80 bg-white pl-6">
        <Lock className="size-4 shrink-0 text-gray-500" aria-hidden />
        <input
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => onPasswordChange?.(event.target.value)}
          className="h-full w-full bg-transparent text-sm text-gray-500 outline-none placeholder:text-gray-500"
          required
        />
      </div>

      <div className="mt-5 text-left text-indigo-500">
        <span className="cursor-default text-sm opacity-60">Forgot password?</span>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 h-11 w-full rounded-full bg-indigo-500 text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Login"}
      </button>
      <p className="mt-3 mb-11 text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <span className="cursor-default text-indigo-500 opacity-60">Sign up</span>
      </p>
    </form>
  );
}
