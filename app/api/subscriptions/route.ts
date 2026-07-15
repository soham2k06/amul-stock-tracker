import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createSubscriptionSchema,
  subscriptionQuerySchema,
} from "@/validation/subscription";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pincodeParam = request.nextUrl.searchParams.get("pincode");

  if (pincodeParam) {
    const parsed = subscriptionQuerySchema.safeParse({ pincode: pincodeParam });
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: session.user.id, pincode: parsed.data.pincode },
      select: { id: true, productId: true, productName: true, pincode: true },
    });
    return NextResponse.json(subscriptions);
  }

  const subscriptions = await prisma.subscription.findMany({
    where: { userId: session.user.id },
    select: { id: true, productId: true, productName: true, pincode: true },
    orderBy: [{ pincode: "asc" }, { createdAt: "asc" }],
  });

  const productIds = [...new Set(subscriptions.map((s) => s.productId))];
  const logs = productIds.length
    ? await prisma.notificationLog.findMany({
        where: {
          userId: session.user.id,
          productId: { in: productIds },
          status: "SENT",
        },
        orderBy: { createdAt: "desc" },
        select: { productId: true, createdAt: true },
      })
    : [];

  const lastNotifiedByProduct = new Map<string, Date>();
  for (const log of logs) {
    if (log.productId && !lastNotifiedByProduct.has(log.productId)) {
      lastNotifiedByProduct.set(log.productId, log.createdAt);
    }
  }

  return NextResponse.json(
    subscriptions.map((sub) => ({
      ...sub,
      lastNotifiedAt: lastNotifiedByProduct.get(sub.productId) ?? null,
    })),
  );
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { productId, productName, pincode } = parsed.data;

  try {
    const subscription = await prisma.subscription.upsert({
      where: {
        userId_productId_pincode: {
          userId: session.user.id,
          productId,
          pincode,
        },
      },
      update: {},
      create: { userId: session.user.id, productId, productName, pincode },
    });
    return NextResponse.json(subscription, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}
