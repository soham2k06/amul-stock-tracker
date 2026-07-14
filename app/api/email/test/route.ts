import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTestEmail } from "@/lib/email";
import { logNotification } from "@/lib/notification-log";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      notificationEmail: true,
      notificationEmailVerified: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.notificationEmail || !user.notificationEmailVerified) {
    return NextResponse.json(
      { error: "Verify your email first" },
      { status: 400 },
    );
  }

  try {
    await sendTestEmail(user.notificationEmail);
    await logNotification({ userId: session.user.id, channel: "EMAIL", type: "TEST", status: "SENT" });
  } catch (err) {
    await logNotification({
      userId: session.user.id,
      channel: "EMAIL",
      type: "TEST",
      status: "FAILED",
      error: err instanceof Error ? err.message : "Unknown error",
    });
    throw err;
  }

  return NextResponse.json({ success: true });
}
