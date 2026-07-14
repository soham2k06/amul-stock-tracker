import { randomInt, createHash, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAdminOtpEmail } from "@/lib/email";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";

const OTP_IDENTIFIER = "admin-otp";
const OTP_TTL_MS = 5 * 60 * 1000;

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function issueAdminOtp(): Promise<void> {
  const email = process.env.ADMIN_OTP_EMAIL;
  if (!email) throw new Error("ADMIN_OTP_EMAIL is not set");

  const code = randomInt(100000, 1000000).toString();

  await prisma.verification.deleteMany({ where: { identifier: OTP_IDENTIFIER } });
  await prisma.verification.create({
    data: {
      id: crypto.randomUUID(),
      identifier: OTP_IDENTIFIER,
      value: sha256Hex(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  await sendAdminOtpEmail(email, code);
}

export async function verifyAdminOtp(code: string): Promise<boolean> {
  const record = await prisma.verification.findFirst({
    where: { identifier: OTP_IDENTIFIER },
  });
  if (!record) return false;

  await prisma.verification.delete({ where: { id: record.id } });

  if (record.expiresAt < new Date()) return false;
  return record.value === sha256Hex(code);
}

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkAdminRateLimit(
  key: string,
  { windowMs, max }: { windowMs: number; max: number },
): boolean {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count++;
  return true;
}

export function getRequestIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function requireAdminSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(token);
}
