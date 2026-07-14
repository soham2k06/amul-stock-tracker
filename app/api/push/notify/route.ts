import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/webpush";
import { sendTelegramMessage } from "@/lib/telegram";
import { sendStockAlertEmail } from "@/lib/email";
import { searchAmulProducts } from "@/lib/amul/client";
import { getSiteUrl } from "@/lib/site-url";
import { logNotification } from "@/lib/notification-log";
import type { NotificationType } from "@prisma/client";
import type { ProductAvailability } from "@/types/amul";

const LOW_STOCK_THRESHOLD = 5;
const SITE_URL = getSiteUrl();

function buildStockMessageBody(
  productName: string,
  product: ProductAvailability,
  pincode: string,
) {
  const price = product.price != null ? `₹${product.price}` : "Price unavailable";
  const quantity = product.inventoryQuantity ?? 0;
  return [
    productName,
    `${price} • Pincode ${pincode} • ${quantity} available`,
    product.productUrl,
    `Manage your subscriptions at ${SITE_URL}/subscriptions`,
  ].join("\n");
}

async function runNotifications() {
  const subscriptions = await prisma.subscription.findMany({
    include: {
      user: {
        include: { pushSubscriptions: true, telegramConnection: true },
      },
    },
  });

  if (subscriptions.length === 0) {
    return { checked: 0, notified: 0 };
  }

  // Group subscriptions by pincode to minimize API calls
  const byPincode = new Map<string, typeof subscriptions>();
  for (const sub of subscriptions) {
    const list = byPincode.get(sub.pincode) ?? [];
    list.push(sub);
    byPincode.set(sub.pincode, list);
  }

  let notified = 0;

  for (const [pincode, subs] of byPincode) {
    const result = await searchAmulProducts(pincode, undefined, {
      start: 0,
      limit: 100,
    });
    if (!result.ok) continue;

    const productById = new Map(result.results.map((p) => [p.productId, p]));

    for (const sub of subs) {
      const product = productById.get(sub.productId);
      if (!product) continue;

      const { available, inventoryQuantity } = product;
      const isLowStock =
        available &&
        inventoryQuantity !== undefined &&
        inventoryQuantity > 0 &&
        inventoryQuantity <= LOW_STOCK_THRESHOLD;

      const cameBackInStock = available && sub.lastAvailable === false;
      const droppedToLowStock = isLowStock && !sub.lastLowStock && !cameBackInStock;

      if (cameBackInStock || droppedToLowStock) {
        const title = cameBackInStock ? "Back in stock" : `Only ${inventoryQuantity} left`;
        const body = buildStockMessageBody(sub.productName, product, pincode);
        const url = `/?pincode=${pincode}`;
        const notificationType: NotificationType = cameBackInStock
          ? "RESTOCK"
          : "LOW_STOCK";

        for (const pushSub of sub.user.pushSubscriptions) {
          try {
            const res = await sendPushNotification(pushSub, { title, body, url });
            if (res === "expired") {
              await prisma.pushSubscription.delete({ where: { id: pushSub.id } });
            } else {
              notified++;
              await logNotification({
                userId: sub.userId,
                channel: "PUSH",
                type: notificationType,
                productId: sub.productId,
                productName: sub.productName,
                status: "SENT",
              });
            }
          } catch (err) {
            await logNotification({
              userId: sub.userId,
              channel: "PUSH",
              type: notificationType,
              productId: sub.productId,
              productName: sub.productName,
              status: "FAILED",
              error: err instanceof Error ? err.message : "Unknown error",
            });
          }
        }

        if (sub.user.telegramConnection) {
          try {
            await sendTelegramMessage(
              sub.user.telegramConnection.chatId,
              `${title}\n${body}`,
            );
            notified++;
            await logNotification({
              userId: sub.userId,
              channel: "TELEGRAM",
              type: notificationType,
              productId: sub.productId,
              productName: sub.productName,
              status: "SENT",
            });
          } catch (err) {
            await logNotification({
              userId: sub.userId,
              channel: "TELEGRAM",
              type: notificationType,
              productId: sub.productId,
              productName: sub.productName,
              status: "FAILED",
              error: err instanceof Error ? err.message : "Unknown error",
            });
          }
        }

        if (
          sub.user.emailNotificationsEnabled &&
          sub.user.notificationEmail &&
          sub.user.notificationEmailVerified
        ) {
          try {
            await sendStockAlertEmail(sub.user.notificationEmail, {
              title,
              body,
              url: `${SITE_URL}${url}`,
            });
            notified++;
            await logNotification({
              userId: sub.userId,
              channel: "EMAIL",
              type: notificationType,
              productId: sub.productId,
              productName: sub.productName,
              status: "SENT",
            });
          } catch (err) {
            await logNotification({
              userId: sub.userId,
              channel: "EMAIL",
              type: notificationType,
              productId: sub.productId,
              productName: sub.productName,
              status: "FAILED",
              error: err instanceof Error ? err.message : "Unknown error",
            });
          }
        }
      }

      // lastLowStock is sticky for the current in-stock streak: once the
      // low-stock alert has fired, don't re-fire it just because the
      // quantity ticks back above the threshold and dips again. It only
      // resets when the product goes fully out of stock, starting a new
      // restock cycle.
      const newLastLowStock = available
        ? sub.lastLowStock || isLowStock
        : false;

      await prisma.subscription.update({
        where: { id: sub.id },
        data: { lastAvailable: available, lastLowStock: newLastLowStock },
      });
    }
  }

  return { checked: subscriptions.length, notified };
}

// Called by Vercel Cron every 5 minutes.
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runNotifications();
  return NextResponse.json(result);
}

// Manual trigger protected by NOTIFY_SECRET.
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-notify-secret");
  if (!secret || secret !== process.env.NOTIFY_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runNotifications();
  return NextResponse.json(result);
}
