import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAdmin } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { id } = await params;
  const { reason } = await req.json();
  if (typeof reason !== "string" || !reason.trim()) {
    return NextResponse.json({ error: "Səbəb tələb olunur" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: listing } = await admin.from("listings").select("title").eq("id", id).maybeSingle();
  if (!listing) return NextResponse.json({ error: "Elan tapılmadı" }, { status: 404 });

  const { error } = await admin
    .from("listing_reports")
    .insert({ listing_id: id, reporter_id: user.id, reason: reason.trim().slice(0, 500) });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await notifyAdmin("Elan report edildi", `"<b>${listing.title}</b>" elanı report edildi. Səbəb: ${reason.trim()}`);

  return NextResponse.json({ ok: true });
}
