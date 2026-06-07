"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import {
  Bell,
  BellOff,
  ExternalLink,
  FlaskConical,
  MapPin,
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">Push notifications</p>
          <p className="text-xs text-muted-foreground">
            {subscribed
              ? "You'll receive browser alerts when subscribed products come back in stock."
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

      {testResult && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <span>{testResult}</span>
          <button onClick={() => setTestResult(null)}>
            <X className="h-3 w-3" />
          </button>
        </div>
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
