import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";

const DAYS = 30;

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildDayBuckets(days: number): string[] {
  const buckets: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    buckets.push(dayKey(d));
  }
  return buckets;
}

export async function GET(request: NextRequest) {
  if (!(await requireAdminSession(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - DAYS);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalSubscriptions,
    notificationsLast7d,
    pushUserGroups,
    telegramUserCount,
    emailUserCount,
    recentUsers,
    recentNotifications,
    topProductGroups,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count(),
    prisma.notificationLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.pushSubscription.groupBy({ by: ["userId"] }),
    prisma.telegramConnection.count(),
    prisma.user.count({ where: { notificationEmailVerified: true } }),
    prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.notificationLog.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, channel: true },
    }),
    prisma.subscription.groupBy({
      by: ["productName"],
      _count: { _all: true },
      orderBy: { _count: { productName: "desc" } },
      take: 10,
    }),
  ]);

  const buckets = buildDayBuckets(DAYS);

  const signupsByDay = new Map(buckets.map((b) => [b, 0]));
  for (const u of recentUsers) {
    const key = dayKey(u.createdAt);
    if (signupsByDay.has(key)) signupsByDay.set(key, (signupsByDay.get(key) ?? 0) + 1);
  }

  const notificationsByDay = new Map(
    buckets.map((b) => [b, { push: 0, telegram: 0, email: 0 }]),
  );
  for (const n of recentNotifications) {
    const key = dayKey(n.createdAt);
    const bucket = notificationsByDay.get(key);
    if (!bucket) continue;
    if (n.channel === "PUSH") bucket.push++;
    else if (n.channel === "TELEGRAM") bucket.telegram++;
    else if (n.channel === "EMAIL") bucket.email++;
  }

  return NextResponse.json({
    stats: {
      totalUsers,
      totalSubscriptions,
      notificationsLast7d,
    },
    channelAdoption: [
      { channel: "push", count: pushUserGroups.length },
      { channel: "telegram", count: telegramUserCount },
      { channel: "email", count: emailUserCount },
    ],
    signups: buckets.map((date) => ({ date, count: signupsByDay.get(date) ?? 0 })),
    notifications: buckets.map((date) => ({
      date,
      ...notificationsByDay.get(date)!,
    })),
    topProducts: topProductGroups.map((p) => ({
      productName: p.productName,
      count: p._count._all,
    })),
  });
}
