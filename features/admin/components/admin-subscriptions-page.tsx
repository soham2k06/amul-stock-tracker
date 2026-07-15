"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import type { Subscription } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminPagination } from "./admin-pagination";
import { formatDateTime } from "@/lib/utils";

type AdminSubscriptionRow = Pick<
  Subscription,
  | "id"
  | "productId"
  | "productName"
  | "pincode"
  | "lastAvailable"
  | "lastLowStock"
  | "createdAt"
> & {
  user: { id: string; name: string; email: string; username: string | null };
};

type AdminSubscriptionsResponse = {
  subscriptions: AdminSubscriptionRow[];
  total: number;
  page: number;
  limit: number;
  topProducts: Array<{ productName: string; count: number }>;
};

export function AdminSubscriptionsPage() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [pincode, setPincode] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setQ(qInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [qInput]);

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.adminSubscriptions({ q, pincode, page }),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        q,
        pincode,
        page: String(page),
        limit: String(limit),
      });
      const res = await fetch(`/api/admin/subscriptions?${params}`, { signal });
      if (!res.ok) throw new Error("Failed to load subscriptions");
      return res.json() as Promise<AdminSubscriptionsResponse>;
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <section className="pt-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Subscriptions
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {data
          ? `${data.total} product watch${data.total === 1 ? "" : "es"} across all users`
          : "Loading..."}
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Top watched products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 text-sm">
            {!isLoading && data?.topProducts ? (
              data.topProducts.map((p) => (
                <div
                  key={p.productName}
                  className="flex items-baseline bg-background px-3 py-2 rounded-xl gap-1.5"
                >
                  <span className="font-medium">
                    {p.productName.replace(/amul/i, "")}
                  </span>
                  <span className="text-muted-foreground">x{p.count}</span>
                </div>
              ))
            ) : (
              <>
                <Skeleton className="h-9 w-72" />
                <Skeleton className="h-9 w-104" />
                <Skeleton className="h-9 w-96" />
                <Skeleton className="h-9 w-104" />
                <Skeleton className="h-9 w-md" />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Search by product name"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          className="max-w-sm"
        />
        <Input
          placeholder="Filter by pincode"
          value={pincode}
          onChange={(e) => {
            setPincode(e.target.value);
            setPage(1);
          }}
          className="max-w-40"
        />
      </div>

      <div className="bg-card mt-6 rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Pincode</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Subscribed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : data?.subscriptions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  No subscriptions found
                </TableCell>
              </TableRow>
            ) : (
              data?.subscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">
                    {sub.productName.replace(/amul/i, "")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {sub.pincode}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {sub.user.name || sub.user.username || sub.user.email}
                  </TableCell>
                  <TableCell>
                    {sub.lastAvailable === false
                      ? "Out of stock"
                      : sub.lastLowStock
                        ? "Low stock"
                        : sub.lastAvailable
                          ? "Available"
                          : "Unknown"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(sub.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AdminPagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </section>
  );
}
