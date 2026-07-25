"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { confirmPasswordResetSchema } from "@/validation/password-reset";

export function ResetPasswordPage({ token }: { token: string | null }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    const parsed = confirmPasswordResetSchema.safeParse({ token, password });
    if (!parsed.success) {
      setError("Password must be between 8 and 128 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to reset password");

      toast.success("Password reset - sign in with your new password");
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-16 mb-16">
      <div className="milk-card relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-accent text-primary-foreground shadow-md">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold">
          Reset your password
        </h1>

        {!token ? (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              This reset link is invalid or has expired.
            </p>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link
                href="/forgot-password"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Request a new link
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose a new password for your account.
            </p>
            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
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
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading}>
                {loading ? "Resetting..." : "Reset password"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
