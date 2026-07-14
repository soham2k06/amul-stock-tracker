import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      emailNotificationsEnabled: true,
      notificationEmail: true,
      notificationEmailVerified: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const pending = await prisma.notificationEmailToken.findFirst({
    where: { userId: session.user.id },
  });

  return NextResponse.json({
    enabled: user.emailNotificationsEnabled,
    address: user.notificationEmail,
    verified: user.notificationEmailVerified,
    pendingEmail: pending?.email ?? null,
  });
}
