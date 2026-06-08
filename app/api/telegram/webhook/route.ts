import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";
import { telegramWebhookSchema } from "@/validation/telegram";

export async function POST(request: NextRequest) {
  // Verify the request is from Telegram using the webhook secret
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (webhookSecret) {
    const incoming = request.headers.get("x-telegram-bot-api-secret-token");
    if (incoming !== webhookSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await request.json().catch(() => null);
  const parsed = telegramWebhookSchema.safeParse(body);
  if (!parsed.success || !parsed.data.message) {
    return NextResponse.json({ ok: true });
  }

  const { chat, text } = parsed.data.message;
  const chatId = String(chat.id);

  if (!text?.startsWith("/start")) {
    return NextResponse.json({ ok: true });
  }

  const parts = text.split(" ");
  const token = parts[1]?.trim();

  if (!token) {
    await sendTelegramMessage(
      chatId,
      "Please enter your connection link in the format: /start <token>. You can generate this link from the app."
    );
    return NextResponse.json({ ok: true });
  }

  const record = await prisma.telegramToken.findUnique({ where: { token } });

  if (!record || record.expiresAt < new Date()) {
    if (record) {
      await prisma.telegramToken.delete({ where: { id: record.id } });
    }
    await sendTelegramMessage(
      chatId,
      "This connection link has expired. Please generate a new one from the app."
    );
    return NextResponse.json({ ok: true });
  }

  await prisma.telegramConnection.upsert({
    where: { userId: record.userId },
    update: { chatId },
    create: { userId: record.userId, chatId },
  });

  await prisma.telegramToken.delete({ where: { id: record.id } });

  await sendTelegramMessage(
    chatId,
    "Connected! You'll now receive Telegram alerts when your subscribed Amul products come back in stock."
  );

  return NextResponse.json({ ok: true });
}
