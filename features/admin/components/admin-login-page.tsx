"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Something went wrong");
  }
}

export function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"password" | "otp">("password");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const passwordMutation = useMutation({
    mutationFn: () => postJson("/api/admin/auth/password", { password }),
    onSuccess: () => {
      toast.success("Code sent - check your email");
      setStep("otp");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    },
  });

  const otpMutation = useMutation({
    mutationFn: () => postJson("/api/admin/auth/otp", { code }),
    onSuccess: () => {
      router.push("/admin");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    },
  });

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Admin login
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {step === "password"
          ? "Enter the admin password to receive a login code."
          : "Enter the 6-digit code sent to your email."}
      </p>

      {step === "password" ? (
        <form
          className="mt-6 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            passwordMutation.mutate();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              autoFocus
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={passwordMutation.isPending || !password}>
            Continue
          </Button>
        </form>
      ) : (
        <form
          className="mt-6 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            otpMutation.mutate();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-otp">Login code</Label>
            <Input
              id="admin-otp"
              inputMode="numeric"
              autoFocus
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <Button type="submit" disabled={otpMutation.isPending || code.length !== 6}>
            Verify
          </Button>
          <button
            type="button"
            onClick={() => setStep("password")}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Back
          </button>
        </form>
      )}
    </div>
  );
}
