import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/webpush";
import { sendTelegramMessage } from "@/lib/telegram";
import { searchAmulProducts } from "@/lib/amul/client";

const LOW_STOCK_THRESHOLD = 5;

async function runNotifications() {
  const subscriptions = await prisma.subscription.findMany({
    include: {
      user: { include: { pushSubscriptions: true, telegramConnection: true } },
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

      const qtyNote =
        isLowStock && inventoryQuantity !== undefined
          ? ` Only ${inventoryQuantity} left!`
          : "";

      if (cameBackInStock) {
        const title = "Back in stock!";
        const body = `${sub.productName} is now available in ${pincode}.${qtyNote}`;
        const url = `/?pincode=${pincode}`;

        for (const pushSub of sub.user.pushSubscriptions) {
          const res = await sendPushNotification(pushSub, { title, body, url });
          if (res === "expired") {
            await prisma.pushSubscription.delete({ where: { id: pushSub.id } });
          } else {
            notified++;
          }
        }

        if (sub.user.telegramConnection) {
          await sendTelegramMessage(
            sub.user.telegramConnection.chatId,
            `${title} ${body}`,
          ).catch(() => null);
          notified++;
        }
      } else if (droppedToLowStock) {
        const title = "Low stock alert!";
        const body = `Only ${inventoryQuantity} of ${sub.productName} left in ${pincode}.`;
        const url = `/?pincode=${pincode}`;

        for (const pushSub of sub.user.pushSubscriptions) {
          const res = await sendPushNotification(pushSub, { title, body, url });
          if (res === "expired") {
            await prisma.pushSubscription.delete({ where: { id: pushSub.id } });
          } else {
            notified++;
          }
        }

        if (sub.user.telegramConnection) {
          await sendTelegramMessage(
            sub.user.telegramConnection.chatId,
            `${title} ${body}`,
          ).catch(() => null);
          notified++;
        }
      }

      await prisma.subscription.update({
        where: { id: sub.id },
        data: { lastAvailable: available, lastLowStock: isLowStock },
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
