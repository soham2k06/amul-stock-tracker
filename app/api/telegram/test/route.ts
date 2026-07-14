import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";
import { logNotification } from "@/lib/notification-log";

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

  try {
    await sendTelegramMessage(
      connection.chatId,
      "Test notification from Amul Stock Tracker - your Telegram connection is working!"
    );
    await logNotification({ userId: session.user.id, channel: "TELEGRAM", type: "TEST", status: "SENT" });
  } catch (err) {
    await logNotification({
      userId: session.user.id,
      channel: "TELEGRAM",
      type: "TEST",
      status: "FAILED",
      error: err instanceof Error ? err.message : "Unknown error",
    });
    throw err;
  }

  return NextResponse.json({ success: true });
}
