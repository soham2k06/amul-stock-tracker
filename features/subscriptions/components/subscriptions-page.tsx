"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import type { Subscription } from "@prisma/client";
import {
  Bell,
  BellRing,
  CheckCheck,
  Copy,
  ExternalLink,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ServerSession } from "@/lib/get-server-session";
import { useSession } from "@/hooks/use-session";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import { useTelegramConnection } from "@/hooks/use-telegram-connection";
import ChannelCard, { ChannelCardSkeleton } from "../channel-card";
import { toast } from "sonner";
import SubscriptionRow from "../subscription-row";
import { SignInDialog } from "@/features/availability/sign-in-dialog";

type SubscriptionRecord = Pick<
  Subscription,
  "id" | "productId" | "productName" | "pincode"
>;

export function SubscriptionsPage({
  initialSession,
}: {
  initialSession?: ServerSession;
}) {
  const { data: session } = useSession(initialSession);
  const [signInOpen, setSignInOpen] = useState(false);
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

  const push = usePushSubscription();
  const pushSubscribed = push.state === "subscribed";
  const pushUnsupported = push.state === "unsupported";
  const pushDenied = push.state === "denied";

  async function handlePushToggle() {
    if (pushUnsupported) {
      toast.error("Push notifications aren't supported in this browser");
      return;
    }
    if (pushDenied) {
      toast.error(
        "Notifications are blocked. Allow them in your browser settings and reload.",
      );
      return;
    }
    try {
      if (pushSubscribed) {
        await push.unsubscribe();
        toast.message("Web push disabled");
      } else {
        await push.subscribe();
        toast.success("Web push enabled");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handlePushTest() {
    try {
      const result = await push.sendTest();
      toast.success(
        `Sent ${result.sent} of ${result.total} notification${result.total !== 1 ? "s" : ""}.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send test");
    }
  }

  const pushDescription = pushUnsupported
    ? "Push notifications are not supported in this browser."
    : pushDenied
      ? "Notifications are blocked. Allow them in your browser settings and reload."
      : "You'll receive browser alerts when subscribed products come back in stock. Ensure you allow notifications for the browser you are using from settings.";

  const telegram = useTelegramConnection();

  async function handleTelegramToggle() {
    if (telegram.pending) {
      telegram.cancelPending();
      return;
    }
    try {
      if (telegram.connected) {
        await telegram.disconnect();
        toast.message("Telegram disconnected");
      } else {
        await telegram.connect();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleTelegramTest() {
    try {
      await telegram.sendTest();
      toast.success("Test message sent to Telegram");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send test");
    }
  }

  const telegramDescription = telegram.connected
    ? "Your Telegram account is linked. You'll receive messages when subscribed products come back in stock."
    : telegram.pending
      ? "Waiting for you to connect in Telegram..."
      : "Get instant Amul restock alerts delivered to your Telegram. Fastest channel — perfect for popular protein drops that sell out in minutes.";

  if (!session) {
    return (
      <>
        <div className="rounded-2xl mt-12 border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Sign in to view your subscriptions.
          </p>
          <Button
            className="mt-4 rounded-xl"
            onClick={() => setSignInOpen(true)}
          >
            Sign in
          </Button>
        </div>
        <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
      </>
    );
  }

  const subs = subscriptions ?? [];

  return (
    <>
      <section className="pt-10">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
          <Bell className="h-3.5 w-3.5" /> Notifications
        </div>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl font-semibold tracking-tight">
          Your alert <span className="italic text-primary">command center</span>
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Pick how you want to hear about restocks, and manage the products
          you&apos;re watching. You&apos;ll only get pinged the moment stock is
          back.
        </p>
      </section>

      {/* CHANNELS */}
      <section className="mt-8">
        <h2 className="mb-4 font-display text-xl font-semibold">
          Subscription channels
        </h2>
        <div className="grid gap-5 md:grid-cols-2">
          {push.state === "loading" ? (
            <ChannelCardSkeleton />
          ) : (
            <ChannelCard
              title="Web push notifications"
              description={pushDescription}
              enabled={pushSubscribed}
              onToggle={handlePushToggle}
              onTest={handlePushTest}
              actionLabel={pushSubscribed ? "Disable" : "Enable"}
              icon={<BellRing className="h-6 w-6" />}
              accent="primary"
              disabled={pushUnsupported || pushDenied}
            />
          )}
          {telegram.isLoading ? (
            <ChannelCardSkeleton />
          ) : (
            <ChannelCard
              title="Telegram notifications"
              description={telegramDescription}
              enabled={telegram.connected}
              onToggle={handleTelegramToggle}
              onTest={handleTelegramTest}
              actionLabel={
                telegram.pending
                  ? "Cancel"
                  : telegram.connected
                    ? "Disconnect"
                    : "Connect"
              }
              icon={<Send className="h-6 w-6" />}
              accent="accent"
              busy={telegram.busy}
            >
              {telegram.pending && (
                <div className="mt-4 flex flex-col gap-3 rounded-xl bg-muted/50 px-3 py-3">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium">
                      Step 1 - Open the bot in Telegram
                    </p>
                    <a
                      href={`https://t.me/${telegram.pending.botUsername}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" />@
                      {telegram.pending.botUsername}
                    </a>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium">
                      Step 2 - Copy and send this command to the bot
                    </p>
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <code className="flex-1 rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs break-all">
                        {telegram.startCommand}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={telegram.copyStartCommand}
                        className="shrink-0 gap-1.5"
                      >
                        {telegram.copied ? (
                          <CheckCheck className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {telegram.copied ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Waiting for confirmation...
                  </p>
                </div>
              )}
            </ChannelCard>
          )}
        </div>
      </section>

      <section className="mt-12 pb-16">
        <div className="mb-4 flex items-end justify-between">
          <div>
            {isLoading ? (
              <Skeleton className="h-7 w-40" />
            ) : (
              <h2 className="font-display text-xl font-semibold">
                Watching {subs.length} product{subs.length === 1 ? "" : "s"}
              </h2>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;ll ping you across your enabled channels.
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-xl"
            nativeButton={false}
            render={<Link href="/">Add more</Link>}
          ></Button>
        </div>

        {isLoading ? (
          <SubscriptionListSkeleton />
        ) : subs.length === 0 ? (
          <div className="milk-card rounded-3xl p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bell className="h-7 w-7" />
            </div>
            <h3 className="mt-4 font-display text-2xl font-semibold">
              No subscriptions yet
            </h3>
            <p className="mt-2 text-muted-foreground">
              Browse Amul products and hit &quot;Notify me&quot; to start
              watching.
            </p>
            <Button
              className="mt-6 rounded-xl"
              nativeButton={false}
              render={<Link href="/">Browse products</Link>}
            ></Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {subs.map((sub) => (
              <SubscriptionRow
                key={sub.id}
                sub={sub}
                disabled={unsubscribeMutation.isPending}
                onRemove={() =>
                  unsubscribeMutation.mutate(sub.id, {
                    onSuccess: () => {
                      toast("Unsubscribed", { description: sub.productName });
                    },
                  })
                }
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function SubscriptionListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  );
}
