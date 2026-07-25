import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/prisma";
import { confirmPasswordResetSchema } from "@/validation/password-reset";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = confirmPasswordResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { token, password } = parsed.data;

  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!record || record.expiresAt < new Date()) {
    if (record) {
      await prisma.passwordResetToken.delete({ where: { token } });
    }
    return NextResponse.json(
      { error: "This reset link is invalid or has expired" },
      { status: 400 },
    );
  }

  const account = await prisma.account.findFirst({
    where: { userId: record.userId, providerId: "credential" },
  });
  if (!account) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired" },
      { status: 400 },
    );
  }

  const hashed = await hashPassword(password);

  await prisma.account.update({
    where: { id: account.id },
    data: { password: hashed },
  });
  await prisma.passwordResetToken.deleteMany({
    where: { userId: record.userId },
  });
  await prisma.session.deleteMany({ where: { userId: record.userId } });

  return NextResponse.json({ ok: true });
}
