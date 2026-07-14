import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const redirectBase = `${getSiteUrl()}/subscriptions`;

  if (!token) {
    return NextResponse.redirect(`${redirectBase}?emailError=1`);
  }

  const record = await prisma.notificationEmailToken.findUnique({
    where: { token },
  });

  if (!record || record.expiresAt < new Date()) {
    if (record) {
      await prisma.notificationEmailToken.delete({ where: { token } });
    }
    return NextResponse.redirect(`${redirectBase}?emailError=1`);
  }

  await prisma.user.update({
    where: { id: record.userId },
    data: {
      notificationEmail: record.email,
      notificationEmailVerified: true,
    },
  });
  await prisma.notificationEmailToken.deleteMany({
    where: { userId: record.userId },
  });

  return NextResponse.redirect(`${redirectBase}?emailVerified=1`);
}
