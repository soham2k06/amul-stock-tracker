"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecoveryEmail } from "@/hooks/use-recovery-email";
import { toast } from "sonner";

function RecoveryEmailCard() {
  const recoveryEmail = useRecoveryEmail();
  const [emailInputOverride, setEmailInputOverride] = useState<string | null>(
    null,
  );
  const emailInput = emailInputOverride ?? recoveryEmail.address;

  const [showForm, setShowForm] = useState(false);
  const isSettled = recoveryEmail.verified && !recoveryEmail.pendingEmail;
  // Once a change settles (verified, nothing pending), collapse the form back
  // down - adjusted during render (React's recommended pattern) rather than
  // in an effect. Mirrors the same fix in the email-notifications card.
  const [settledKey, setSettledKey] = useState(false);
  if (isSettled !== settledKey) {
    setSettledKey(isSettled);
    if (isSettled) setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await recoveryEmail.setEmail(emailInput);
      toast.success("Verification email sent - check your inbox");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to send verification email",
      );
    }
  }

  if (recoveryEmail.isLoading) {
    return (
      <div className="milk-card relative overflow-hidden rounded-3xl p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
        </div>
        <Skeleton className="mt-4 h-4 w-full" />
      </div>
    );
  }

  return (
    <div className="milk-card relative overflow-hidden rounded-3xl p-4 sm:p-6">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/5 blur-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex sm:items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-accent text-primary-foreground shadow-md shrink-0">
              <KeyRound className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">
                Recovery email
              </h3>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                {recoveryEmail.verified ? (
                  <Badge className="gap-1 bg-success/15 text-success border border-success/30">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="gap-1 text-muted-foreground"
                  >
                    <XCircle className="h-3 w-3" /> Not set
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          {recoveryEmail.verified
            ? `Used to reset your password if you forget it. Currently set to ${recoveryEmail.address}.`
            : "Add and verify an email so you can reset your password if you ever forget it."}
        </p>

        {recoveryEmail.verified && !showForm && !recoveryEmail.pendingEmail && (
          <button
            type="button"
            onClick={() => {
              setEmailInputOverride("");
              setShowForm(true);
            }}
            className="mt-3 text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Change email
          </button>
        )}

        {(!isSettled || showForm) && (
          <form
            onSubmit={handleSubmit}
            className="mt-4 flex flex-col gap-2 rounded-xl bg-muted/50 px-3 py-3"
          >
            <p className="text-xs font-medium">
              {recoveryEmail.verified
                ? "Verify a new address to switch your recovery email."
                : "Add and verify an email address to use for password recovery."}
            </p>
            <div className="flex flex-col md:flex-row gap-2">
              <Input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInputOverride(e.target.value)}
                placeholder="you@example.com"
                className="flex-1"
              />
              <Button
                type="submit"
                variant="outline"
                disabled={recoveryEmail.busy || !emailInput}
                className="shrink-0 h-11"
              >
                Verify
              </Button>
              {recoveryEmail.verified && !recoveryEmail.pendingEmail && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={recoveryEmail.busy}
                  onClick={() => {
                    setEmailInputOverride(null);
                    setShowForm(false);
                  }}
                  className="shrink-0 h-11"
                >
                  Cancel
                </Button>
              )}
            </div>
            {recoveryEmail.pendingEmail && (
              <p className="text-xs text-muted-foreground">
                Check {recoveryEmail.pendingEmail} for a confirmation link...
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

export default RecoveryEmailCard;
