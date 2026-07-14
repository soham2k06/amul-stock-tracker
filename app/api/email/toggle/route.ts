import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emailToggleSchema } from "@/validation/email";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = emailToggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { enabled } = parsed.data;

  if (enabled) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        notificationEmail: true,
        notificationEmailVerified: true,
      },
    });
    if (!user?.notificationEmail || !user.notificationEmailVerified) {
      return NextResponse.json(
        { error: "Verify your email before enabling this channel" },
        { status: 400 },
      );
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { emailNotificationsEnabled: enabled },
  });

  return NextResponse.json({ enabled });
}
