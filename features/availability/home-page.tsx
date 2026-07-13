"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import {
  Grid2x2,
  ListIcon,
  MapPin,
  Search,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { QUERY_KEYS } from "@/constants/query-keys";
import { CATEGORIES } from "@/lib/constants";
import type { ServerSession } from "@/lib/get-server-session";
import { useSession } from "@/hooks/use-session";
import type { ProductAvailability } from "@/types/amul";
import ProductCardGrid from "./product-card-grid";
import ProductCardList from "./product-card-list";
import { PincodePanel, ViewToggle } from "./components";
import { SignInDialog } from "./sign-in-dialog";

type AvailabilityResponse = { results: ProductAvailability[]; total: number };
type SubscriptionRecord = {
  id: string;
  productId: string;
  productName: string;
  pincode: string;
};

const PINCODE_RE = /^\d{6}$/;
const LIMIT_OPTIONS = [6, 9, 12, 24];
const VIEWS = ["grid", "list"] as const;

export function HomePage({
  initialSession,
}: {
  initialSession?: ServerSession;
}) {
  const categoryAliases = CATEGORIES.map((c) => c.alias) as [
    string,
    ...string[],
  ];

  const [params, setParams] = useQueryStates({
    pincode: parseAsString.withDefault(""),
    category: parseAsStringLiteral(categoryAliases).withDefault("protein"),
    q: parseAsString.withDefault(""),
    start: parseAsInteger.withDefault(0),
    limit: parseAsInteger.withDefault(6),
    view: parseAsStringLiteral(VIEWS).withDefault("grid"),
  });

  const [signInOpen, setSignInOpen] = useState(false);
  const [pendingProduct, setPendingProduct] =
    useState<ProductAvailability | null>(null);

  const { data: session, refetch: refetchSession } =
    useSession(initialSession);
  const queryClient = useQueryClient();

  const didAutoFill = useRef(false);
  useEffect(() => {
    if (didAutoFill.current) return;
    if (!session?.user?.pincode) return;
    if (params.pincode) return;
    didAutoFill.current = true;
    const pin = session.user.pincode;

    setTimeout(() => setParams({ pincode: pin, start: 0 }), 0);
  }, [session, params.pincode, setParams]);

  const [searchInput, setSearchInput] = useState(params.q);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearchChange(val: string) {
    setSearchInput(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setParams({ q: val, start: 0 });
    }, 400);
  }

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handlePincodeChange(val: string) {
    setParams({ pincode: val, start: 0 });
    if (!session) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      fetch("/api/user/pincode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode: val || null }),
      })
        .then((res) => {
          if (res.ok) refetchSession();
        })
        .catch(() => {});
    }, 600);
  }

  const hasPincode = PINCODE_RE.test(params.pincode);
  // The session has a saved pincode that hasn't been applied to the URL yet
  // (the effect below does that on mount): treat that as "pending" rather
  // than "not set" to avoid a flash of the empty state.
  const isPincodePending = !hasPincode && !!session?.user?.pincode;

  const { data, isLoading, isError, error } = useQuery<AvailabilityResponse>({
    queryKey: QUERY_KEYS.availability({
      pincode: params.pincode,
      category: params.category,
      q: params.q,
      start: params.start,
      limit: params.limit,
    }),
    queryFn: async ({ signal }) => {
      const sp = new URLSearchParams({
        pincode: params.pincode,
        category: params.category,
      });
      if (params.q) sp.set("q", params.q);
      sp.set("start", String(params.start));
      sp.set("limit", String(params.limit));
      const res = await fetch(`/api/availability?${sp}`, { signal });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      return json as AvailabilityResponse;
    },
    enabled: hasPincode,
  });

  const { data: subscriptions } = useQuery<SubscriptionRecord[]>({
    queryKey: QUERY_KEYS.subscriptions({ pincode: params.pincode }),
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/subscriptions?pincode=${params.pincode}`, {
        signal,
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: hasPincode && !!session,
  });

  const subscribedMap = new Map(
    subscriptions?.map((s) => [s.productId, s.id]) ?? [],
  );

  const [mutatingProductId, setMutatingProductId] = useState<string | null>(
    null,
  );

  const subscribeMutation = useMutation({
    mutationFn: async (product: ProductAvailability) => {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.productId,
          productName: product.name,
          pincode: params.pincode,
        }),
      });
      if (!res.ok) throw new Error("Failed to subscribe");
      return res.json();
    },
    onSettled: () => setMutatingProductId(null),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.subscriptions({ pincode: params.pincode }),
      });
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const res = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to unsubscribe");
    },
    onSettled: () => setMutatingProductId(null),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.subscriptions({ pincode: params.pincode }),
      });
    },
  });

  function handleSubscribeToggle(product: ProductAvailability) {
    if (!session) {
      setPendingProduct(product);
      setSignInOpen(true);
      return;
    }
    setMutatingProductId(product.productId);
    const subId = subscribedMap.get(product.productId);
    if (subId) {
      unsubscribeMutation.mutate(subId);
    } else {
      subscribeMutation.mutate(product);
    }
  }

  function handleSignInSuccess() {
    if (pendingProduct) {
      subscribeMutation.mutate(pendingProduct);
      setPendingProduct(null);
    }
  }

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / params.limit));
  const currentPage = Math.floor(params.start / params.limit) + 1;

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-10 pb-8 sm:pt-16 sm:pb-12">
            <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] items-center">
              <div>
                <Badge className="rounded-full bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 gap-1.5 px-3">
                  <Sparkles className="h-3.5 w-3.5" />
                  Real-time restock alerts
                </Badge>
                <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight">
                  Get Amul{" "}
                  <span className="relative inline-block">
                    <span className="relative z-10 text-primary">whey</span>
                    <span className="absolute inset-x-0 bottom-1 h-3 bg-accent/40 -skew-x-6 z-0" />
                  </span>{" "}
                  before it{" "}
                  <span className="italic text-primary/80">vanishes</span>.
                </h1>
                <p className="mt-4 max-w-xl text-base sm:text-lg text-muted-foreground">
                  Amul protein products sell out in minutes. Set your pincode,
                  pick your favourites, and we&apos;ll alert you the second
                  they&apos;re back in stock.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-success">
                      <Zap className="h-4 w-4" />
                    </div>
                    Alerts under 60s
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/25 text-accent-foreground">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    Tracked every minute
                  </div>
                </div>
              </div>

              <PincodePanel
                pincode={params.pincode}
                setPincode={handlePincodeChange}
                pending={isPincodePending}
              />
            </div>
          </div>
        </section>

        {/* CONTROLS */}
        {(hasPincode || isPincodePending) && (
          <>
            <section className="mx-auto max-w-7xl px-4 sm:px-6 w-full">
              <div className="milk-card rounded-2xl p-4 sm:p-5 flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search Amul products…"
                    value={searchInput}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9 h-11 rounded-lg bg-background/70"
                  />
                </div>
                <Select
                  value={params.category}
                  onValueChange={(v) => {
                    setSearchInput("");
                    setParams({
                      category: v as typeof params.category,
                      start: 0,
                      q: "",
                    });
                  }}
                >
                  <SelectTrigger className="h-11! md:w-56 bg-background/70 rounded-lg">
                    <SelectValue>
                      {
                        CATEGORIES.find((c) => c.alias === params.category)
                          ?.name
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.alias} value={c.alias}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1 rounded-lg border bg-background/70 p-1 w-fit">
                  <ViewToggle
                    active={params.view === "grid"}
                    onClick={() => setParams({ view: "grid" })}
                    icon={<Grid2x2 className="h-4 w-4" />}
                    label="Grid"
                  />
                  <ViewToggle
                    active={params.view === "list"}
                    onClick={() => setParams({ view: "list" })}
                    icon={<ListIcon className="h-4 w-4" />}
                    label="List"
                  />
                </div>
              </div>
            </section>

            {/* RESULTS */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 py-8 w-full">
              {isError && (
                <div className="milk-card mb-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                  {(error as Error).message}
                </div>
              )}

              {(isLoading || isPincodePending) && (
                <div
                  className={
                    params.view === "grid"
                      ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
                      : "flex flex-col gap-3"
                  }
                >
                  {Array.from({ length: params.limit }).map((_, i) => (
                    <Skeleton
                      key={i}
                      className={
                        params.view === "grid"
                          ? "aspect-3/4 rounded-2xl"
                          : "h-32 rounded-2xl"
                      }
                    />
                  ))}
                </div>
              )}

              {!isLoading && !isPincodePending && data && (
                <>
                  <div className="mb-4 flex items-end justify-between">
                    <div>
                      <h2 className="font-display text-2xl font-semibold">
                        {total} product{total === 1 ? "" : "s"}
                      </h2>
                      {params.q && (
                        <p className="text-sm text-muted-foreground">
                          matching &quot;{params.q}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  {params.view === "grid" ? (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {data.results.map((p) => (
                        <ProductCardGrid
                          key={p.productId}
                          p={p}
                          subscribed={subscribedMap.has(p.productId)}
                          loading={mutatingProductId === p.productId}
                          onToggle={() => handleSubscribeToggle(p)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {data.results.map((p) => (
                        <ProductCardList
                          key={p.productId}
                          p={p}
                          subscribed={subscribedMap.has(p.productId)}
                          loading={mutatingProductId === p.productId}
                          onToggle={() => handleSubscribeToggle(p)}
                        />
                      ))}
                    </div>
                  )}

                  {total === 0 && (
                    <div className="milk-card rounded-2xl p-12 text-center">
                      <p className="text-muted-foreground">
                        {params.q
                          ? `No products match "${params.q}".`
                          : "No products found."}
                      </p>
                    </div>
                  )}

                  {/* PAGINATION */}
                  {total > 0 && (
                    <div className="mt-8 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Per page</span>
                        <Select
                          value={String(params.limit)}
                          onValueChange={(v) =>
                            setParams({ limit: Number(v), start: 0 })
                          }
                        >
                          <SelectTrigger className="h-9 w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LIMIT_OPTIONS.map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="ml-2">
                          Page {currentPage} of {totalPages}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === 1}
                          onClick={() =>
                            setParams({
                              start: Math.max(0, params.start - params.limit),
                            })
                          }
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === totalPages}
                          onClick={() =>
                            setParams({ start: params.start + params.limit })
                          }
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}

        {!hasPincode && !isPincodePending && (
          <section className="mx-auto max-w-3xl px-4 sm:px-6 pb-24">
            <div className="milk-card rounded-3xl p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MapPin className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-display text-2xl font-semibold">
                Set your pincode to start
              </h3>
              <p className="mt-2 text-muted-foreground">
                Amul stock and pricing varies by delivery region. Pick your
                pincode above to see what&apos;s available near you.
              </p>
            </div>
          </section>
        )}
      </div>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        Not affiliated with Amul. Prices &amp; availability sourced from
        shop.amul.com. Built by{" "}
        <a
          href="https://sohamb.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-4"
        >
          Soham
        </a>
        .
      </footer>

      <SignInDialog
        open={signInOpen}
        onOpenChange={(open) => {
          setSignInOpen(open);
          if (!open) setPendingProduct(null);
        }}
        onSuccess={handleSignInSuccess}
      />
    </div>
  );
}
