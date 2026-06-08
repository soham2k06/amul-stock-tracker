"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import {
  Bell,
  BellOff,
  CheckCheck,
  Copy,
  ExternalLink,
  FlaskConical,
  MapPin,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import { cn } from "@/lib/utils";

type SubscriptionRecord = {
  id: string;
  productId: string;
  productName: string;
  pincode: string;
};

type GroupedSubscriptions = Record<string, SubscriptionRecord[]>;

export function SubscriptionsPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const queryClient = useQueryClient();

  const { data: subscriptions, isLoading } = useQuery<SubscriptionRecord[]>({
    queryKey: QUERY_KEYS.allSubscriptions(),
    queryFn: async ({ signal }) => {
      const res = await fetch("/api/subscriptions", { signal });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!session,
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to unsubscribe");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.allSubscriptions(),
      });
    },
  });

  if (sessionPending) {
    return (
      <PageShell>
        <LoadingSkeleton />
      </PageShell>
    );
  }

  if (!session) {
    return (
      <PageShell>
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Sign in to view your subscriptions.
        </div>
      </PageShell>
    );
  }

  if (isLoading) {
    return (
      <PageShell>
        <LoadingSkeleton />
      </PageShell>
    );
  }

  const grouped: GroupedSubscriptions = {};
  for (const sub of subscriptions ?? []) {
    (grouped[sub.pincode] ??= []).push(sub);
  }
  const pincodes = Object.keys(grouped).sort();

  return (
    <PageShell>
      <PushNotificationPanel />
      <TelegramPanel />

      {pincodes.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <BellOff className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">No subscriptions yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Use the bell icon on any product to subscribe to stock alerts.
          </p>
          <Link href="/" className="mt-4 inline-block">
            <Button size="sm" variant="outline">
              Browse products
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {pincodes.map((pincode) => (
            <section key={pincode} className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <Link
                  href={`/?pincode=${pincode}`}
                  className="flex items-center gap-1 text-sm font-medium hover:underline underline-offset-4"
                >
                  {pincode}
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </Link>
                <span className="text-xs text-muted-foreground">
                  {grouped[pincode].length} product
                  {grouped[pincode].length !== 1 ? "s" : ""}
                </span>
              </div>

              <ul className="flex flex-col gap-1.5">
                {grouped[pincode].map((sub) => (
                  <li
                    key={sub.id}
                    className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
                  >
                    <span className="text-sm">{sub.productName}</span>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => unsubscribeMutation.mutate(sub.id)}
                      disabled={unsubscribeMutation.isPending}
                      className="shrink-0 gap-1 text-muted-foreground hover:text-destructive"
                    >
                      <BellOff className="h-3.5 w-3.5" />
                      Unsubscribe
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function PushNotificationPanel() {
  const { state, subscribe, unsubscribe, sendTest } = usePushSubscription();
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  async function handleToggle() {
    setBusy(true);
    setTestResult(null);
    try {
      if (state === "subscribed") {
        await unsubscribe();
      } else {
        await subscribe();
      }
    } catch (err) {
      setTestResult(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleTest() {
    setBusy(true);
    setTestResult(null);
    try {
      const result = await sendTest();
      setTestResult(
        `Sent ${result.sent} of ${result.total} notification${result.total !== 1 ? "s" : ""}.`,
      );
    } catch (err) {
      setTestResult(err instanceof Error ? err.message : "Failed to send test");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return null;

  if (state === "unsupported") {
    return (
      <div className="rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
        Push notifications are not supported in this browser.
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
        Notifications are blocked. Allow them in your browser settings and
        reload.
      </div>
    );
  }

  const subscribed = state === "subscribed";

  return (
    <div className="rounded-2xl border px-4 py-3 flex flex-col gap-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">Web Push notifications</p>
          <p className="text-xs text-muted-foreground whitespace-pre-line">
            {subscribed
              ? "You'll receive browser alerts when subscribed products come back in stock.\nEnsure you allow notifications for the browser you are using from settings."
              : "Enable to get browser alerts when subscribed products come back in stock."}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {subscribed && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={busy}
              className="gap-1.5"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              Test
            </Button>
          )}
          <Button
            variant={subscribed ? "outline" : "default"}
            size="sm"
            onClick={handleToggle}
            disabled={busy}
            className={cn(
              "gap-1.5",
              subscribed && "text-destructive hover:text-destructive",
            )}
          >
            {subscribed ? (
              <>
                <BellOff className="h-3.5 w-3.5" />
                Disable
              </>
            ) : (
              <>
                <Bell className="h-3.5 w-3.5" />
                Enable
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

type PendingToken = { token: string; botUsername: string };

function TelegramPanel() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingToken | null>(null);
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ connected: boolean }>({
    queryKey: QUERY_KEYS.telegramStatus(),
    queryFn: async ({ signal }) => {
      const res = await fetch("/api/telegram/status", { signal });
      if (!res.ok) return { connected: false };
      return res.json();
    },
  });

  const connected = data?.connected ?? false;

  async function handleConnect() {
    setBusy(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/telegram/token", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to generate token");

      const { token, botUsername } = json as PendingToken;
      setPending({ token, botUsername });
      setBusy(false);

      // Poll until the webhook confirms connection
      const poll = setInterval(async () => {
        const statusRes = await fetch("/api/telegram/status");
        const status = await statusRes.json();
        if (status.connected) {
          clearInterval(poll);
          setPending(null);
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.telegramStatus(),
          });
        }
      }, 2000);

      // Expire after 15 minutes (matches token TTL)
      setTimeout(
        () => {
          clearInterval(poll);
          setPending(null);
        },
        15 * 60 * 1000,
      );
    } catch (err) {
      setTestResult(
        err instanceof Error ? err.message : "Something went wrong",
      );
      setBusy(false);
    }
  }

  function handleCancelPending() {
    setPending(null);
    setBusy(false);
  }

  async function handleCopy(command: string) {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDisconnect() {
    setBusy(true);
    setTestResult(null);
    try {
      await fetch("/api/telegram/disconnect", { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.telegramStatus() });
    } catch (err) {
      setTestResult(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleTest() {
    setBusy(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/telegram/test", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send test");
      setTestResult("Test message sent to Telegram.");
    } catch (err) {
      setTestResult(err instanceof Error ? err.message : "Failed to send test");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return null;

  const startCommand = pending ? `/start ${pending.token}` : "";

  return (
    <div className="rounded-2xl border px-4 py-3 flex flex-col gap-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">Telegram notifications</p>
          <p className="text-xs text-muted-foreground">
            {connected
              ? "Your Telegram account is linked. You'll receive messages when subscribed products come back in stock."
              : pending
                ? "Waiting for you to connect in Telegram..."
                : "Connect Telegram to receive stock alerts as messages."}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {connected && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={busy}
              className="gap-1.5"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              Test
            </Button>
          )}
          {pending ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelPending}
              className="gap-1.5 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
          ) : (
            <Button
              variant={connected ? "outline" : "default"}
              size="sm"
              onClick={connected ? handleDisconnect : handleConnect}
              disabled={busy}
              className={cn(
                "gap-1.5",
                connected && "text-destructive hover:text-destructive",
              )}
            >
              {connected ? (
                <>
                  <X className="h-3.5 w-3.5" />
                  Disconnect
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Connect
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {pending && (
        <div className="flex flex-col gap-3 rounded-xl bg-muted/50 px-3 py-3">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium">
              Step 1 - Open the bot in Telegram
            </p>
            <a
              href={`https://t.me/${pending.botUsername}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />@{pending.botUsername}
            </a>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium">
              Step 2 - Copy and send this command to the bot
            </p>
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <code className="flex-1 rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs break-all">
                {startCommand}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(startCommand)}
                className="shrink-0 gap-1.5"
              >
                {copied ? (
                  <CheckCheck className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Waiting for confirmation...
          </p>
        </div>
      )}

      {testResult && (
        <p className="text-xs text-muted-foreground">{testResult}</p>
      )}
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-3xl mx-auto p-4 md:px-6 md:py-12 flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
          Subscriptions
        </h1>
        <p className="text-sm text-muted-foreground">
          Products you&apos;re watching for availability alerts
        </p>
      </header>
      {children}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {[1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <div className="flex flex-col gap-1.5">
            {[1, 2, 3].map((j) => (
              <Skeleton key={j} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
