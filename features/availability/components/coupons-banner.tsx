"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCheck, Copy, Tag, X } from "lucide-react";
import { QUERY_KEYS } from "@/constants/query-keys";
import type { AmulCoupon } from "@/types/amul";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = { className?: string };

export function CouponsBanner({ className }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data } = useQuery<{ coupons: AmulCoupon[] }>({
    queryKey: QUERY_KEYS.coupons(),
    queryFn: async ({ signal }) => {
      const res = await fetch("/api/coupons", { signal });
      if (!res.ok) return { coupons: [] };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const coupons = data?.coupons ?? [];

  if (dismissed || coupons.length === 0) return null;

  async function handleCopy(code: string, id: string) {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function formatDiscount(coupon: AmulCoupon) {
    if (coupon.type === "percentage") {
      const max = coupon.maximum_discount
        ? ` (up to ₹${coupon.maximum_discount})`
        : "";
      return `${coupon.amount}% off${max}`;
    }
    return `₹${coupon.amount} off`;
  }

  function formatExpiry(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-950/30",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          <Tag className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            Active coupons
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setDismissed(true)}
          className="shrink-0 text-amber-600 hover:text-amber-800 dark:text-amber-400"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="mt-2 flex flex-col gap-2">
        {coupons.map((coupon) => (
          <div
            key={coupon._id}
            className="flex flex-col sm:flex-row sm:items-center gap-2"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <code className="rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 font-mono text-xs font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-300 shrink-0">
                {coupon.coupon_code}
              </code>
              <span className="text-xs text-amber-800 dark:text-amber-300 truncate">
                {coupon.name}
                {" - "}
                <span className="font-medium">{formatDiscount(coupon)}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {coupon.end_date && (
                <span className="text-xs text-amber-600 dark:text-amber-500">
                  Expires {formatExpiry(coupon.end_date)}
                </span>
              )}
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleCopy(coupon.coupon_code, coupon._id)}
                className="gap-1 text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200"
              >
                {copiedId === coupon._id ? (
                  <CheckCheck className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copiedId === coupon._id ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
