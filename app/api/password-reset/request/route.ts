import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendResetPasswordEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";
import { requestPasswordResetSchema } from "@/validation/password-reset";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = requestPasswordResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email } = parsed.data;

  const user = await prisma.user.findFirst({
    where: { recoveryEmail: email, recoveryEmailVerified: true },
  });

  // Always respond the same way regardless of whether a match was found, so
  // this endpoint can't be used to enumerate which emails are registered.
  if (user) {
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const url = `${getSiteUrl()}/reset-password?token=${token}`;
    await sendResetPasswordEmail(email, url);
  }

  return NextResponse.json({ ok: true });
}
