import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ listings: [] });

  const admin = createAdminClient();
  const { data: listings } = await admin
    .from("listings")
    .select("id, title, price, image_url, status")
    .ilike("title", `%${q}%`)
    .limit(8);

  return NextResponse.json({ listings: listings ?? [] });
}
