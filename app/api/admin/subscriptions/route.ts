import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { adminSubscriptionsQuerySchema } from "@/validation/admin";

export async function GET(request: NextRequest) {
  if (!(await requireAdminSession(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = adminSubscriptionsQuerySchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    pincode: searchParams.get("pincode") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  const { q, pincode, page, limit } = parsed.data;

  const where = {
    ...(q ? { productName: { contains: q, mode: "insensitive" as const } } : {}),
    ...(pincode ? { pincode } : {}),
  };

  const [subscriptions, total, topProducts] = await Promise.all([
    prisma.subscription.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.subscription.count({ where }),
    prisma.subscription.groupBy({
      by: ["productName"],
      _count: { _all: true },
      orderBy: { _count: { productName: "desc" } },
      take: 5,
    }),
  ]);

  return NextResponse.json({
    subscriptions,
    total,
    page,
    limit,
    topProducts: topProducts.map((p) => ({
      productName: p.productName,
      count: p._count._all,
    })),
  });
}
