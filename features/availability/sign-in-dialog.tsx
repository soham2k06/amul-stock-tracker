"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type Mode = "signin" | "signup";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

// Mirrors the usernameValidator/min-max length in lib/auth.ts so bad
// usernames are caught before the round trip to the server.
const USERNAME_PATTERN = /^[a-zA-Z0-9_.@+-]+$/;
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;

function validateUsername(username: string): string | null {
  if (username.length < USERNAME_MIN_LENGTH) {
    return `Username must be at least ${USERNAME_MIN_LENGTH} characters`;
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return `Username must be at most ${USERNAME_MAX_LENGTH} characters`;
  }
  if (!USERNAME_PATTERN.test(username)) {
    return "Username can only contain letters, numbers, and _ . @ + -";
  }
  return null;
}

export function SignInDialog({ open, onOpenChange, onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setShowPassword(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "signup") {
      const usernameError = validateUsername(username);
      if (usernameError) {
        setError(usernameError);
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        const result = await authClient.signIn.username({
          username,
          password,
          rememberMe,
        });
        if (result.error)
          throw new Error(result.error.message ?? "Sign in failed");
      } else {
        // better-auth's core still requires an email on every account; this
        // one is never shown or contacted - login is username-only.
        const result = await authClient.signUp.email({
          email: `${username}@users.noreply.invalid`,
          password,
          name: username,
          username,
        });
        if (result.error)
          throw new Error(result.error.message ?? "Sign up failed");
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "signin" ? "Sign in" : "Create account"}
          </DialogTitle>
          <DialogDescription>
            {mode === "signin"
              ? "Sign in to subscribe to product availability alerts."
              : "Create an account to subscribe to product availability alerts."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="user123"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          {mode === "signin" && (
            <div className="flex items-center justify-between gap-2 mt-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <Label
                  htmlFor="remember-me"
                  className="text-sm font-normal cursor-pointer"
                >
                  Remember me
                </Label>
              </div>
              <Link
                href="/forgot-password"
                onClick={() => onOpenChange(false)}
                className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Forgot password?
              </Link>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading
              ? mode === "signin"
                ? "Signing in..."
                : "Creating account..."
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {mode === "signin" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className="font-medium text-foreground underline underline-offset-4"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="font-medium text-foreground underline underline-offset-4"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </DialogContent>
    </Dialog>
  );
}
