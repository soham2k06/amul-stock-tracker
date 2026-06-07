import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/webpush";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pushSubs = await prisma.pushSubscription.findMany({
    where: { userId: session.user.id },
  });

  if (pushSubs.length === 0) {
    return NextResponse.json(
      { error: "No push subscriptions found. Enable notifications first." },
      { status: 404 }
    );
  }

  const results = await Promise.allSettled(
    pushSubs.map(async (sub) => {
      const result = await sendPushNotification(sub, {
        title: "Test Notification",
        body: "Push notifications are working correctly!",
        url: "/subscriptions",
      });
      if (result === "expired") {
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
      }
      return result;
    })
  );

  const sent = results.filter(
    (r) => r.status === "fulfilled" && r.value === "sent"
  ).length;

  return NextResponse.json({ sent, total: pushSubs.length });
}
