"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";

type PendingToken = { token: string; botUsername: string };

export function useTelegramConnection() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingToken | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expireRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (expireRef.current) clearTimeout(expireRef.current);
    };
  }, []);

  const { data, isLoading } = useQuery<{ connected: boolean }>({
    queryKey: QUERY_KEYS.telegramStatus(),
    queryFn: async ({ signal }) => {
      const res = await fetch("/api/telegram/status", { signal });
      if (!res.ok) return { connected: false };
      return res.json();
    },
  });

  const connected = data?.connected ?? false;

  function clearTimers() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (expireRef.current) clearTimeout(expireRef.current);
    pollRef.current = null;
    expireRef.current = null;
  }

  async function connect() {
    setBusy(true);
    try {
      const res = await fetch("/api/telegram/token", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to generate token");

      const { token, botUsername } = json as PendingToken;
      setPending({ token, botUsername });

      // Poll until the webhook confirms connection.
      pollRef.current = setInterval(async () => {
        const statusRes = await fetch("/api/telegram/status");
        const status = await statusRes.json();
        if (status.connected) {
          clearTimers();
          setPending(null);
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.telegramStatus(),
          });
        }
      }, 2000);

      // Expire after 15 minutes (matches token TTL).
      expireRef.current = setTimeout(
        () => {
          clearTimers();
          setPending(null);
        },
        15 * 60 * 1000,
      );
    } finally {
      setBusy(false);
    }
  }

  function cancelPending() {
    clearTimers();
    setPending(null);
  }

  async function disconnect() {
    setBusy(true);
    try {
      const res = await fetch("/api/telegram/disconnect", {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to disconnect Telegram");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.telegramStatus() });
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    const res = await fetch("/api/telegram/test", { method: "POST" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to send test");
  }

  const startCommand = pending ? `/start ${pending.token}` : "";

  async function copyStartCommand() {
    if (!pending) return;
    await navigator.clipboard.writeText(startCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return {
    connected,
    isLoading,
    busy,
    pending,
    startCommand,
    copied,
    connect,
    disconnect,
    cancelPending,
    sendTest,
    copyStartCommand,
  };
}
