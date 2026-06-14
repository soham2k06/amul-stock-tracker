"use client";

import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { useEffect, useRef, useState } from "react";
import { QUERY_KEYS } from "@/constants/query-keys";
import {
  Search,
  PackageCheck,
  PackageX,
  ExternalLink,
  LayoutList,
  LayoutGrid,
  Bell,
  BellOff,
  Loader2,
} from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import type { ProductAvailability } from "@/types/amul";
import { CATEGORIES } from "@/lib/constants";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PincodeCombobox } from "./pincode-combobox";
import { SignInDialog } from "./sign-in-dialog";
import { CouponsBanner } from "./coupons-banner";
import { authClient } from "@/lib/auth-client";

type AvailabilityResponse = { results: ProductAvailability[]; total: number };
type SubscriptionRecord = {
  id: string;
  productId: string;
  productName: string;
  pincode: string;
};

const LIMIT_OPTIONS = [8, 16, 32];
const PINCODE_RE = /^\d{6}$/;
const VIEWS = ["list", "card"] as const;

const LABEL_STYLES: Record<
  NonNullable<ProductAvailability["label"]>,
  string
> = {
  new: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  bestseller:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  trending:
    "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400",
};

const LABEL_TEXT: Record<NonNullable<ProductAvailability["label"]>, string> = {
  new: "New",
  bestseller: "Best Seller",
  trending: "Trending",
};

export function AvailabilityPage() {
  const categoryAliases = CATEGORIES.map((c) => c.alias) as [
    string,
    ...string[],
  ];

  const [params, setParams] = useQueryStates({
    pincode: parseAsString.withDefault(""),
    category: parseAsStringLiteral(categoryAliases).withDefault("protein"),
    q: parseAsString.withDefault(""),
    start: parseAsInteger.withDefault(0),
    limit: parseAsInteger.withDefault(8),
    view: parseAsStringLiteral(VIEWS).withDefault("list"),
  });

  const [signInOpen, setSignInOpen] = useState(false);
  const [pendingProduct, setPendingProduct] =
    useState<ProductAvailability | null>(null);

  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();

  const didAutoFill = useRef(false);
  useEffect(() => {
    if (didAutoFill.current) return;
    if (!session?.user?.pincode) return;
    if (params.pincode) return;
    didAutoFill.current = true;
    setParams({ pincode: session.user.pincode, start: 0 });
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
      }).catch(() => {});
    }, 600);
  }

  const hasPincode = PINCODE_RE.test(params.pincode);

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
  const totalPages = Math.ceil(total / params.limit);
  const currentPage = Math.floor(params.start / params.limit) + 1;

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-3xl mx-auto p-4 md:px-6 md:py-12 flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
            Amul Product Availability
          </h1>
          <p className="text-sm text-muted-foreground">
            Select your pincode to see what&apos;s in stock
          </p>
        </header>

        <CouponsBanner />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5 sm:w-64">
            <label
              htmlFor="pincode"
              className="text-sm font-medium text-muted-foreground"
            >
              Pincode
            </label>
            <PincodeCombobox
              value={params.pincode}
              onChange={handlePincodeChange}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:w-52 w-full">
            <label className="text-sm font-medium text-muted-foreground">
              Category
            </label>
            <Select
              value={params.category}
              onValueChange={(val) => {
                setSearchInput("");
                setParams({
                  category: val as typeof params.category,
                  start: 0,
                  q: "",
                });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {CATEGORIES.find((c) => c.alias === params.category)?.name}
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
          </div>

          {hasPincode && (
            <InputGroup className="flex-1">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                type="text"
                placeholder="Search products..."
                value={searchInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleSearchChange(e.target.value)
                }
              />
            </InputGroup>
          )}
        </div>

        {isError && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/20 px-4 py-3 text-sm text-destructive">
            {(error as Error).message}
          </div>
        )}

        {isLoading && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-24" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-16 rounded-lg" />
                <Skeleton className="h-8 w-28" />
              </div>
            </div>
            <ul
              className={cn(
                "grid gap-3",
                params.view === "card"
                  ? "grid-cols-2 sm:grid-cols-3"
                  : "grid-cols-1",
              )}
            >
              {Array.from({ length: params.limit }).map((_, i) => (
                <ProductCardSkeleton key={i} view={params.view} />
              ))}
            </ul>
          </section>
        )}

        {data && (
          <Tabs
            value={params.view}
            onValueChange={(v) =>
              v && setParams({ view: v as "list" | "card" })
            }
          >
            <section className="flex flex-col gap-4">
              <div className="flex items-center flex-wrap justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  {total === 0
                    ? params.q
                      ? `No products match "${params.q}"`
                      : "No products found"
                    : `${total} product${total === 1 ? "" : "s"}`}
                </p>

                <div className="flex items-center gap-2 shrink-0">
                  <TabsList>
                    <TabsTrigger value="list">
                      <LayoutList className="h-4 w-4" />
                      List
                    </TabsTrigger>
                    <TabsTrigger value="card">
                      <LayoutGrid className="h-4 w-4" />
                      Grid
                    </TabsTrigger>
                  </TabsList>

                  <span className="text-xs text-muted-foreground">
                    Per page
                  </span>
                  <Select
                    value={String(params.limit)}
                    onValueChange={(val) =>
                      setParams({ limit: Number(val), start: 0 })
                    }
                  >
                    <SelectTrigger size="sm" className="w-16">
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
                </div>
              </div>

              <TabsContent value="list">
                <ul className="grid grid-cols-1 gap-3">
                  {data.results.map((product) => (
                    <ProductListItem
                      key={product.productId}
                      product={product}
                      subscriptionId={subscribedMap.get(product.productId)}
                      loading={mutatingProductId === product.productId}
                      onSubscribeToggle={handleSubscribeToggle}
                    />
                  ))}
                </ul>
              </TabsContent>

              <TabsContent value="card">
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {data.results.map((product) => (
                    <ProductCardItem
                      key={product.productId}
                      product={product}
                      subscriptionId={subscribedMap.get(product.productId)}
                      loading={mutatingProductId === product.productId}
                      onSubscribeToggle={handleSubscribeToggle}
                    />
                  ))}
                </ul>
              </TabsContent>

              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (params.start > 0)
                            setParams({
                              start: Math.max(0, params.start - params.limit),
                            });
                        }}
                        className={cn(
                          params.start <= 0 && "pointer-events-none opacity-50",
                        )}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <span className="px-3 text-sm text-muted-foreground">
                        {currentPage} / {totalPages}
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages)
                            setParams({ start: params.start + params.limit });
                        }}
                        className={cn(
                          currentPage >= totalPages &&
                            "pointer-events-none opacity-50",
                        )}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </section>
          </Tabs>
        )}
      </div>

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

type ProductItemProps = {
  product: ProductAvailability;
  subscriptionId: string | undefined;
  loading: boolean;
  onSubscribeToggle: (product: ProductAvailability) => void;
};

function ProductListItem({
  product,
  subscriptionId,
  loading,
  onSubscribeToggle,
}: ProductItemProps) {
  return (
    <li className="flex flex-col gap-2 rounded-2xl border p-4">
      <div className="flex gap-4">
        <div className="relative h-20 w-20 shrink-0">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="96px"
              className="rounded-xl object-contain"
            />
          ) : (
            <div className="h-full w-full rounded-xl bg-muted" />
          )}
          {product.label && (
            <div className="absolute -bottom-1.5 left-0 right-0 flex justify-center">
              <LabelBadge label={product.label} />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
            <span className="text-sm font-medium leading-snug">
              {product.name}
            </span>
            <div className="md:hidden">
              {product.price != null && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">
                    ₹{product.price}
                  </span>
                  {product.mrp && product.mrp !== product.price && (
                    <span className="text-xs line-through text-muted-foreground">
                      ₹{product.mrp}
                    </span>
                  )}
                  {product.discount != null && (
                    <DiscountBadge discount={product.discount} />
                  )}
                </div>
              )}
            </div>
            <span className="hidden md:block">
              <AvailabilityBadge available={product.available} />
            </span>
          </div>

          <div className="hidden md:flex md:flex-col md:gap-2.5">
            {product.price != null && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold">₹{product.price}</span>
                {product.mrp && product.mrp !== product.price && (
                  <span className="text-xs line-through text-muted-foreground">
                    ₹{product.mrp}
                  </span>
                )}
                {product.discount != null && (
                  <DiscountBadge discount={product.discount} />
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              {!!product.inventoryQuantity && product.available && (
                <span className="text-xs text-muted-foreground">
                  {product.inventoryQuantity} in stock
                </span>
              )}
              <div className="ml-auto flex items-center gap-2">
                <SubscribeButton
                  subscriptionId={subscriptionId}
                  loading={loading}
                  onToggle={() => onSubscribeToggle(product)}
                />
                <a
                  href={product.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  View on Amul
                  <ExternalLink className="size-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden flex items-center justify-between w-full gap-2">
        {!!product.inventoryQuantity && product.available && (
          <span className="text-xs text-muted-foreground">
            {product.inventoryQuantity} in stock
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <SubscribeButton
            subscriptionId={subscriptionId}
            loading={loading}
            onToggle={() => onSubscribeToggle(product)}
          />
          <a
            href={product.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View on Amul
            <ExternalLink className="size-4" />
          </a>
        </div>
      </div>
    </li>
  );
}

function ProductCardItem({
  product,
  subscriptionId,
  loading,
  onSubscribeToggle,
}: ProductItemProps) {
  return (
    <li className="flex flex-col rounded-2xl border overflow-hidden">
      <div className="relative aspect-square bg-muted">
        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, 256px"
            className="object-contain p-3"
          />
        )}
        {product.label && (
          <div className="absolute top-2 left-2">
            <LabelBadge label={product.label} />
          </div>
        )}
        {product.discount != null && (
          <div className="absolute top-2 right-2">
            <DiscountBadge discount={product.discount} />
          </div>
        )}
      </div>

      <div className="flex flex-col justify-between flex-1 gap-2 p-3">
        <span className="text-sm font-medium leading-snug">{product.name}</span>

        <div className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            {product.price != null && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-semibold">₹{product.price}</span>
                {product.mrp && product.mrp !== product.price && (
                  <span className="text-xs line-through text-muted-foreground">
                    ₹{product.mrp}
                  </span>
                )}
              </div>
            )}

            {!!product.inventoryQuantity && product.available && (
              <span className="text-xs text-muted-foreground">
                {product.inventoryQuantity} in stock
              </span>
            )}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <AvailabilityBadge available={product.available} />
            <div className="flex items-center gap-2">
              <SubscribeButton
                subscriptionId={subscriptionId}
                loading={loading}
                onToggle={() => onSubscribeToggle(product)}
              />
              <a
                href={product.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <ExternalLink className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

function SubscribeButton({
  subscriptionId,
  loading,
  onToggle,
}: {
  subscriptionId: string | undefined;
  loading: boolean;
  onToggle: () => void;
}) {
  const subscribed = !!subscriptionId;
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onToggle}
      disabled={loading}
      title={subscribed ? "Unsubscribe from alerts" : "Subscribe to alerts"}
      className={cn(
        subscribed
          ? "text-amber-500 hover:text-amber-600"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : subscribed ? (
        <BellOff className="size-4" />
      ) : (
        <Bell className="size-4" />
      )}
    </Button>
  );
}

function ProductCardSkeleton({ view }: { view: "list" | "card" }) {
  if (view === "card") {
    return (
      <li className="flex flex-col rounded-2xl border overflow-hidden">
        <Skeleton className="aspect-square" />
        <div className="flex flex-col gap-2 p-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3 mt-1" />
        </div>
      </li>
    );
  }

  return (
    <li className="flex gap-4 rounded-2xl border p-4">
      <Skeleton className="h-24 w-24 shrink-0 rounded-xl" />
      <div className="flex flex-1 flex-col gap-2.5 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
        </div>
        <Skeleton className="h-4 w-1/4" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </li>
  );
}

function LabelBadge({
  label,
}: {
  label: NonNullable<ProductAvailability["label"]>;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        LABEL_STYLES[label],
      )}
    >
      {LABEL_TEXT[label]}
    </span>
  );
}

function DiscountBadge({ discount }: { discount: number }) {
  return (
    <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-bold text-white">
      {discount}% off
    </span>
  );
}

function AvailabilityBadge({ available }: { available: boolean }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        available
          ? "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400"
          : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400",
      )}
    >
      {available ? (
        <PackageCheck className="h-3 w-3" />
      ) : (
        <PackageX className="h-3 w-3" />
      )}
      {available ? "In stock" : "Out of stock"}
    </span>
  );
}
