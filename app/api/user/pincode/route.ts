import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  pincode: z.string().regex(/^\d{6}$/).nullable(),
});

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid pincode" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { pincode: parsed.data.pincode },
  });

  return NextResponse.json({ success: true });
}
