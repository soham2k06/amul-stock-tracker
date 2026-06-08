import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await prisma.telegramConnection.findUnique({
    where: { userId: session.user.id },
  });

  if (!connection) {
    return NextResponse.json(
      { error: "Telegram not connected" },
      { status: 400 }
    );
  }

  await sendTelegramMessage(
    connection.chatId,
    "Test notification from Amul Stock Tracker - your Telegram connection is working!"
  );

  return NextResponse.json({ success: true });
}
