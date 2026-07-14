import { NextRequest, NextResponse } from "next/server";
import { adminOtpSchema } from "@/validation/admin";
import { checkAdminRateLimit, getRequestIp, verifyAdminOtp } from "@/lib/admin-auth";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
} from "@/lib/admin-session";

export async function POST(request: NextRequest) {
  const ip = getRequestIp(request);
  if (!checkAdminRateLimit(`admin-otp:${ip}`, { windowMs: 10 * 60 * 1000, max: 5 })) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = adminOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const valid = await verifyAdminOtp(parsed.data.code);
  if (!valid) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
  }

  const token = await createAdminSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
