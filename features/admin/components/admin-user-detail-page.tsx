"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/query-keys";
import type { Subscription, NotificationLog } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils";

type AdminUserDetail = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  pincode: string | null;
  createdAt: string;
  notificationEmail: string | null;
  notificationEmailVerified: boolean;
  subscriptions: Array<
    Pick<
      Subscription,
      | "id"
      | "productId"
      | "productName"
      | "pincode"
      | "lastAvailable"
      | "lastLowStock"
    >
  >;
  pushSubscriptions: Array<{ id: string; createdAt: string }>;
  telegramConnection: { id: string; chatId: string } | null;
  notificationLogs: Array<
    Pick<
      NotificationLog,
      "id" | "channel" | "type" | "status" | "productName" | "error"
    > & {
      createdAt: string;
    }
  >;
};

export function AdminUserDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: QUERY_KEYS.adminUser({ id }),
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/admin/users/${id}`, { signal });
      if (!res.ok) throw new Error("Failed to load user");
      return res.json() as Promise<AdminUserDetail>;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user");
    },
    onSuccess: () => {
      toast.success("User deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      router.push("/admin/users");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    },
  });

  if (isLoading) {
    return (
      <section className="pt-10">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-32 w-full" />
      </section>
    );
  }

  if (!user) {
    return (
      <section className="pt-10">
        <p className="text-muted-foreground">User not found.</p>
      </section>
    );
  }

  return (
    <section className="pt-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {user.name || user.username || "Unnamed user"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Joined {formatDateTime(user.createdAt)}
            {user.pincode ? ` - Pincode ${user.pincode}` : ""}
          </p>
        </div>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger render={<Button variant="destructive" />}>
            Delete user
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this user?</DialogTitle>
              <DialogDescription>
                This permanently removes {user.email} along with their
                subscriptions, sessions, and connected channels. This cannot be
                undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 flex gap-2">
        {user.pushSubscriptions.length > 0 && (
          <Badge variant="secondary">
            Push - {user.pushSubscriptions.length} device
            {user.pushSubscriptions.length === 1 ? "" : "s"}
          </Badge>
        )}
        {user.telegramConnection && (
          <Badge variant="secondary">Telegram connected</Badge>
        )}
        {user.notificationEmailVerified && (
          <Badge variant="secondary">Email - {user.notificationEmail}</Badge>
        )}
        {user.pushSubscriptions.length === 0 &&
          !user.telegramConnection &&
          !user.notificationEmailVerified && (
            <span className="text-sm text-muted-foreground">
              No channels connected
            </span>
          )}
      </div>

      <div className="mt-10">
        <h2 className="font-display text-xl font-semibold">
          Subscriptions ({user.subscriptions.length})
        </h2>
        <div className="mt-4 rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Pincode</TableHead>
                <TableHead>Last known status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {user.subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No subscriptions
                  </TableCell>
                </TableRow>
              ) : (
                user.subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>{sub.productName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {sub.pincode}
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="mt-10 pb-16">
        <h2 className="font-display text-xl font-semibold">
          Recent notifications
        </h2>
        <div className="mt-4 rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {user.notificationLogs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No notifications sent yet
                  </TableCell>
                </TableRow>
              ) : (
                user.notificationLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.channel}</TableCell>
                    <TableCell>{log.type}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.productName ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          log.status === "SENT" ? "secondary" : "destructive"
                        }
                      >
                        {log.status}
                      </Badge>
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
      </div>
    </section>
  );
}
