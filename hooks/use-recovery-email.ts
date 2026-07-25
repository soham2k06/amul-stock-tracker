"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";

type RecoveryEmailStatus = {
  address: string | null;
  verified: boolean;
  pendingEmail: string | null;
};

export function useRecoveryEmail() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expireRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (expireRef.current) clearTimeout(expireRef.current);
    };
  }, []);

  const { data, isLoading } = useQuery<RecoveryEmailStatus>({
    queryKey: QUERY_KEYS.recoveryEmailStatus(),
    queryFn: async ({ signal }) => {
      const res = await fetch("/api/recovery-email/status", { signal });
      if (!res.ok) return { address: null, verified: false, pendingEmail: null };
      return res.json();
    },
  });

  const address = data?.address ?? "";
  const verified = data?.verified ?? false;
  const pendingEmail = data?.pendingEmail ?? null;

  function clearTimers() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (expireRef.current) clearTimeout(expireRef.current);
    pollRef.current = null;
    expireRef.current = null;
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recoveryEmailStatus() });
  }

  async function setEmail(email: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/recovery-email/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update recovery email");

      invalidate();

      if (json.pending) {
        clearTimers();
        // Poll until the verification link is clicked.
        pollRef.current = setInterval(async () => {
          const statusRes = await fetch("/api/recovery-email/status");
          const status = await statusRes.json();
          if (status.verified) {
            clearTimers();
            invalidate();
          }
        }, 2000);

        // Expire after 15 minutes (matches token TTL).
        expireRef.current = setTimeout(
          () => {
            clearTimers();
            invalidate();
          },
          15 * 60 * 1000,
        );
      }

      return json as { pending: boolean };
    } finally {
      setBusy(false);
    }
  }

  function cancelPending() {
    clearTimers();
  }

  return {
    address,
    verified,
    pendingEmail,
    isLoading,
    busy,
    setEmail,
    cancelPending,
  };
}
