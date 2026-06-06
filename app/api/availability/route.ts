import { NextRequest, NextResponse } from "next/server";
import { availabilitySearchSchema } from "@/validation/availability";
import { searchAmulProducts } from "@/lib/amul/client";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const parsed = availabilitySearchSchema.safeParse({
    pincode: searchParams.get("pincode"),
    q: searchParams.get("q") ?? undefined,
    start: searchParams.get("start") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { pincode, q, start, limit } = parsed.data;
  const result = await searchAmulProducts(pincode, q, { start, limit });

  if (!result.ok) {
    const status = result.error === "FETCH_ERROR" ? 502 : 404;
    return NextResponse.json({ error: result.message }, { status });
  }

  return NextResponse.json({ results: result.results, total: result.total });
}
