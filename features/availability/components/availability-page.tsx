"use client";

import { useEffect, useState } from "react";
import { Search, PackageCheck, PackageX, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductAvailability } from "@/types/amul";
import { PincodeCombobox } from "./pincode-combobox";

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; results: ProductAvailability[]; pincode: string }
  | { status: "error"; message: string };

export function AvailabilityPage() {
  const [pincode, setPincode] = useState("");
  const [filter, setFilter] = useState("");
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle" });

  useEffect(() => {
    if (!/^\d{6}$/.test(pincode)) return;

    let cancelled = false;
    setFetchState({ status: "loading" });

    fetch(`/api/availability?pincode=${pincode}`)
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setFetchState({ status: "error", message: json.error ?? "Something went wrong" });
        } else {
          setFetchState({ status: "success", results: json.results, pincode });
        }
      })
      .catch(() => {
        if (!cancelled) setFetchState({ status: "error", message: "Failed to reach the server" });
      });

    return () => {
      cancelled = true;
    };
  }, [pincode]);

  const visibleResults =
    fetchState.status === "success"
      ? filter.trim() === ""
        ? fetchState.results
        : fetchState.results.filter((p) =>
            p.name.toLowerCase().includes(filter.toLowerCase())
          )
      : [];

  return (
    <div className="flex flex-col flex-1 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-3xl mx-auto px-6 py-12 flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Amul Product Availability
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Select your pincode to see what's in stock
          </p>
        </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5 sm:w-56">
            <label htmlFor="pincode" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Pincode
            </label>
            <PincodeCombobox value={pincode} onChange={setPincode} />
          </div>

          {fetchState.status === "success" && (
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Filter products..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:focus:ring-zinc-50"
              />
            </div>
          )}
        </div>

        {fetchState.status === "loading" && (
          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading products...
          </div>
        )}

        {fetchState.status === "error" && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
            {fetchState.message}
          </div>
        )}

        {fetchState.status === "success" && (
          <section className="flex flex-col gap-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {visibleResults.length === 0
                ? filter
                  ? `No products match "${filter}"`
                  : "No products found"
                : `${visibleResults.length} product${visibleResults.length === 1 ? "" : "s"}`}
            </p>

            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {visibleResults.map((product) => (
                <ProductCard key={product.productId} product={product} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: ProductAvailability }) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-medium text-zinc-900 leading-snug dark:text-zinc-50 truncate">
            {product.name}
          </span>
          {product.price != null && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              ₹{product.price}
              {product.mrp != null && product.mrp !== product.price && (
                <span className="ml-1 line-through text-zinc-400 dark:text-zinc-600">
                  ₹{product.mrp}
                </span>
              )}
            </span>
          )}
        </div>

        <AvailabilityBadge available={product.available} />
      </div>

      <div className="flex items-center justify-between">
        {product.inventoryQuantity != null && (
          <span className="text-xs text-zinc-400 dark:text-zinc-600">
            {product.inventoryQuantity} in stock
          </span>
        )}
        <a
          href={product.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
        >
          View on Amul
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </li>
  );
}

function AvailabilityBadge({ available }: { available: boolean }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        available
          ? "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400"
          : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400"
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
