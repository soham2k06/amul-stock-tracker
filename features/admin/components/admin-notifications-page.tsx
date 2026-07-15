"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import type { NotificationLog } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminPagination } from "./admin-pagination";

type AdminNotificationRow = Pick<
  NotificationLog,
  "id" | "channel" | "type" | "productName" | "status" | "error"
> & {
  createdAt: string;
  user: { id: string; name: string; email: string; username: string | null };
};

type AdminNotificationsResponse = {
  logs: AdminNotificationRow[];
  total: number;
  page: number;
  limit: number;
};

const CHANNEL_OPTIONS = [
  { value: "all", label: "All channels" },
  { value: "PUSH", label: "Push" },
  { value: "TELEGRAM", label: "Telegram" },
  { value: "EMAIL", label: "Email" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "SENT", label: "Sent" },
  { value: "FAILED", label: "Failed" },
];

export function AdminNotificationsPage() {
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.adminNotifications({ channel, status, page }),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (channel !== "all") params.set("channel", channel);
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/admin/notifications?${params}`, { signal });
      if (!res.ok) throw new Error("Failed to load notifications");
      return res.json() as Promise<AdminNotificationsResponse>;
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <section className="pt-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Notifications</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {data ? `${data.total} notification${data.total === 1 ? "" : "s"} logged` : "Loading..."}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Select
          value={channel}
          onValueChange={(v) => {
            if (!v) return;
            setChannel(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue>
              {CHANNEL_OPTIONS.find((c) => c.value === channel)?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CHANNEL_OPTIONS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={(v) => {
            if (!v) return;
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue>{STATUS_OPTIONS.find((s) => s.value === status)?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card mt-6 rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : data?.logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No notifications found
                </TableCell>
              </TableRow>
            ) : (
              data?.logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground">
                    {log.user.name || log.user.username || log.user.email}
                  </TableCell>
                  <TableCell>{log.channel}</TableCell>
                  <TableCell>{log.type}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {(log.productName ?? "-").replace(/amul/i, "")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.status === "SENT" ? "secondary" : "destructive"}>
                      {log.status}
                    </Badge>
                    {log.error && (
                      <p className="mt-1 max-w-60 truncate text-xs text-muted-foreground" title={log.error}>
                        {log.error}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </section>
  );
}
