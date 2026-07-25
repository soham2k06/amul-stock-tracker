import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const redirectBase = `${getSiteUrl()}/subscriptions`;

  if (!token) {
    return NextResponse.redirect(`${redirectBase}?recoveryEmailError=1`);
  }

  const record = await prisma.recoveryEmailToken.findUnique({
    where: { token },
  });

  if (!record || record.expiresAt < new Date()) {
    if (record) {
      await prisma.recoveryEmailToken.delete({ where: { token } });
    }
    return NextResponse.redirect(`${redirectBase}?recoveryEmailError=1`);
  }

  await prisma.user.update({
    where: { id: record.userId },
    data: {
      recoveryEmail: record.email,
      recoveryEmailVerified: true,
    },
  });
  await prisma.recoveryEmailToken.deleteMany({
    where: { userId: record.userId },
  });

  return NextResponse.redirect(`${redirectBase}?recoveryEmailVerified=1`);
}
