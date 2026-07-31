import { prisma } from "@/lib/prisma";
import type { NotificationChannel, NotificationType } from "@prisma/client";

export type NotificationLogEntry = {
  userId: string;
  channel: NotificationChannel;
  type: NotificationType;
  productId?: string;
  productName?: string;
  status: "SENT" | "FAILED";
  error?: string;
};

export async function logNotification(entry: NotificationLogEntry) {
  await prisma.notificationLog.create({ data: entry });
}

// Batched variant for hot paths (e.g. the per-minute notification sweep)
// that can produce many log rows in one run - one insert instead of one
// per channel per subscription.
export async function logNotificationsBatch(entries: NotificationLogEntry[]) {
  if (entries.length === 0) return;
  await prisma.notificationLog.createMany({ data: entries });
}
