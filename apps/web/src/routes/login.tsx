import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";
import type { UserRole } from "@/types/api";

/** Dev-only email shortcuts — no passwords in the client bundle. */
const ROLE_PRESETS: { role: UserRole; email: string; label: string }[] =
  import.meta.env.DEV
    ? [
        { role: "EndUser", email: "enduser@sadhox.local", label: "EndUser" },
        { role: "Agent", email: "agent@sadhox.local", label: "Agent" },
        { role: "Admin", email: "admin@sadhox.local", label: "Admin" },
      ]
    : [];

export default function LoginPage() {
  const login = useAuthStore((state) => state.login);
  const loginAsRole = useAuthStore((state) => state.loginAsRole);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/catalog";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password);
      toast.success("Signed in");
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="container mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Sign in with your Sadhox account to access the service catalog.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="pr-9"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 right-1 -translate-y-1/2"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
        {ROLE_PRESETS.length > 0 ? (
          <CardFooter className="flex flex-col items-stretch gap-2">
            <p className="text-muted-foreground text-xs">
              Quick role switch (dev only)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {ROLE_PRESETS.map((preset) => (
                <Button
                  key={preset.role}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    loginAsRole(preset.role);
                    toast.success(`Signed in as ${preset.label}`);
                    navigate(from, { replace: true });
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </CardFooter>
        ) : null}
      </Card>
    </main>
  );
}
