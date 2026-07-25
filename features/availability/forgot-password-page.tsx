"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordResetSchema } from "@/validation/password-reset";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = requestPasswordResetSchema.safeParse({ email });
    if (!parsed.success) {
      setError("Enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      await fetch("/api/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      // Always show the same result, whether or not the email matched a
      // verified recovery email - avoids leaking which emails are registered.
      setSubmitted(true);
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
          Forgot your password?
        </h1>

        {submitted ? (
          <p className="mt-3 text-sm text-muted-foreground">
            If that email matches a verified recovery email, we&apos;ve sent
            a reset link to it. Check your inbox.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your verified recovery email and we&apos;ll send you a
              link to reset your password.
            </p>
            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            href="/"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Back to sign in
          </Link>
        </p>

        {SUPPORT_EMAIL && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Did not set a recovery email?{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-foreground underline underline-offset-4"
            >
              Contact me
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
