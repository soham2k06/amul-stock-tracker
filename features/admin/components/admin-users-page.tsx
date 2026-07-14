"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  createdAt: string;
  notificationEmailVerified: boolean;
  telegramConnection: { id: string } | null;
  _count: { subscriptions: number; pushSubscriptions: number };
};

type AdminUsersResponse = {
  users: AdminUserRow[];
  total: number;
  page: number;
  limit: number;
};

export function AdminUsersPage() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
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
    queryKey: QUERY_KEYS.adminUsers({ q, page }),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        q,
        page: String(page),
        limit: String(limit),
      });
      const res = await fetch(`/api/admin/users?${params}`, { signal });
      if (!res.ok) throw new Error("Failed to load users");
      return res.json() as Promise<AdminUsersResponse>;
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <section className="pt-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Users
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {data
          ? `${data.total} registered user${data.total === 1 ? "" : "s"}`
          : "Loading..."}
      </p>

      <Input
        placeholder="Search by name, email, or username"
        value={qInput}
        onChange={(e) => setQInput(e.target.value)}
        className="mt-6 max-w-sm"
      />

      <div className="bg-card mt-6 rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Subscriptions</TableHead>
              <TableHead>Channels</TableHead>
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
            ) : data?.users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              data?.users.map((user) => (
                <TableRow key={user.id} className="h-11">
                  <TableCell>
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="font-medium hover:underline"
                    >
                      {user.name || user.username || "Unnamed"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(user.createdAt)}
                  </TableCell>
                  <TableCell>{user._count.subscriptions}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {user._count.pushSubscriptions > 0 && (
                        <Badge variant="secondary">Push</Badge>
                      )}
                      {user.telegramConnection && (
                        <Badge variant="secondary">Telegram</Badge>
                      )}
                      {user.notificationEmailVerified && (
                        <Badge variant="secondary">Email</Badge>
                      )}
                    </div>
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
