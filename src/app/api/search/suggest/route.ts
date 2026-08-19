import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ listings: [] });

  const admin = createAdminClient();
  const { data: listings } = await admin
    .from("listings")
    .select("id, title, price, image_url")
    .eq("status", "active")
    .ilike("title", `%${q}%`)
    .limit(6);

  return NextResponse.json({ listings: listings ?? [] });
}
