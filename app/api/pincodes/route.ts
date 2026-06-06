import { getDefaultSession } from "@/lib/amul/api";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  q: z.string().regex(/^\d{3,6}$/, "Must be 3-6 digits"),
});

export async function GET(request: NextRequest) {
  const parsed = schema.safeParse({
    q: request.nextUrl.searchParams.get("q"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const session = await getDefaultSession();
    const records = await session.searchPincode(parsed.data.q);
    return NextResponse.json({ records });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
