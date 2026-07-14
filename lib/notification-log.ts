import { prisma } from "@/lib/prisma";
import type { NotificationChannel, NotificationType } from "@prisma/client";

export async function logNotification({
  userId,
  channel,
  type,
  productId,
  productName,
  status,
  error,
}: {
  userId: string;
  channel: NotificationChannel;
  type: NotificationType;
  productId?: string;
  productName?: string;
  status: "SENT" | "FAILED";
  error?: string;
}) {
  await prisma.notificationLog.create({
    data: { userId, channel, type, productId, productName, status, error },
  });
}
