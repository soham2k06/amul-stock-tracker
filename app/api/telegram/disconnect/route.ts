import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await prisma.telegramConnection.findFirst({
    where: { userId: session.user.id },
  });

  await prisma.telegramConnection.deleteMany({
    where: { userId: session.user.id },
  });

  if (connection) {
    await sendTelegramMessage(
      connection.chatId,
      "Your Telegram account has been disconnected from Amul Stock Tracker. You will no longer receive stock alerts here.\nContact sohmm.dev@gmail.com if you found any inconvenience using the app.",
    ).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
