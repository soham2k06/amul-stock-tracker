import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Clean up any existing tokens for this user
  await prisma.telegramToken.deleteMany({
    where: { userId: session.user.id },
  });

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await prisma.telegramToken.create({
    data: { userId: session.user.id, token, expiresAt },
  });

  return NextResponse.json({
    token,
    botUsername: process.env.TELEGRAM_BOT_USERNAME,
  });
}
