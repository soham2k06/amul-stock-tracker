import { NextResponse } from "next/server";
import { getDefaultSession } from "@/lib/amul/api";

export async function GET() {
  try {
    const api = await getDefaultSession();
    const coupons = await api.getCoupons();
    return NextResponse.json({ coupons });
  } catch {
    return NextResponse.json({ coupons: [] });
  }
}
