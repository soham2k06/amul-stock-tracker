import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/webpush";
import { searchAmulProducts } from "@/lib/amul/client";

// Called by a cron job. Protect with NOTIFY_SECRET env var.
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-notify-secret");
  if (!secret || secret !== process.env.NOTIFY_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscriptions = await prisma.subscription.findMany({
    include: {
      user: { include: { pushSubscriptions: true } },
    },
  });

  if (subscriptions.length === 0) {
    return NextResponse.json({ checked: 0, notified: 0 });
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
    // Fetch enough products to cover all subscriptions for this pincode
    const result = await searchAmulProducts(pincode, undefined, {
      start: 0,
      limit: 100,
    });
    if (!result.ok) continue;

    const availableById = new Map(
      result.results.map((p) => [p.productId, p.available])
    );

    for (const sub of subs) {
      const nowAvailable = availableById.get(sub.productId);
      if (nowAvailable === undefined) continue;

      const cameBackInStock = nowAvailable && sub.lastAvailable === false;

      if (cameBackInStock && sub.user.pushSubscriptions.length > 0) {
        for (const pushSub of sub.user.pushSubscriptions) {
          const result = await sendPushNotification(pushSub, {
            title: "Back in stock!",
            body: `${sub.productName} is now available in ${pincode}`,
            url: `/?pincode=${pincode}`,
          });
          if (result === "expired") {
            await prisma.pushSubscription.delete({
              where: { id: pushSub.id },
            });
          } else {
            notified++;
          }
        }
      }

      await prisma.subscription.update({
        where: { id: sub.id },
        data: { lastAvailable: nowAvailable },
      });
    }
  }

  return NextResponse.json({ checked: subscriptions.length, notified });
}
