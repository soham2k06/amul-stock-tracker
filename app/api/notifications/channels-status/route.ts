import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user, telegramConnection, pushSubscriptionCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailNotificationsEnabled: true },
    }),
    prisma.telegramConnection.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.pushSubscription.count({ where: { userId: session.user.id } }),
  ]);

  const email = user?.emailNotificationsEnabled ?? false;
  const telegram = !!telegramConnection;
  const push = pushSubscriptionCount > 0;

  return NextResponse.json({
    hasAnyChannel: email || telegram || push,
    email,
    telegram,
    push,
  });
}
