import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendNotificationEmailVerification } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";
import { setNotificationEmailSchema } from "@/validation/email";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = setNotificationEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email } = parsed.data;
  const userId = session.user.id;

  await prisma.notificationEmailToken.deleteMany({ where: { userId } });

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await prisma.notificationEmailToken.create({
    data: { userId, email, token, expiresAt },
  });

  const url = `${getSiteUrl()}/api/email/verify?token=${token}`;
  await sendNotificationEmailVerification(email, url);

  return NextResponse.json({ pending: true });
}
