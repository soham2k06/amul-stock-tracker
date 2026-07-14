import { NextRequest, NextResponse } from "next/server";
import { adminPasswordSchema } from "@/validation/admin";
import {
  checkAdminRateLimit,
  getRequestIp,
  issueAdminOtp,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const ip = getRequestIp(request);
  if (!checkAdminRateLimit(`admin-password:${ip}`, { windowMs: 15 * 60 * 1000, max: 5 })) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = adminPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!verifyAdminPassword(parsed.data.password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  try {
    await issueAdminOtp();
  } catch (err) {
    console.error("Failed to send admin OTP", err);
    return NextResponse.json({ error: "Failed to send code" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
