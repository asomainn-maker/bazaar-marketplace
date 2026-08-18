import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const AUTO_RELEASE_DAYS = 3;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, seller_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!order || order.seller_id !== user.id) {
    return NextResponse.json({ error: "Sifariş tapılmadı" }, { status: 404 });
  }
  if (order.status !== "paid") {
    return NextResponse.json({ error: "Bu sifariş artıq təslim edilib" }, { status: 400 });
  }

  const now = new Date();
  const autoRelease = new Date(now.getTime() + AUTO_RELEASE_DAYS * 24 * 60 * 60 * 1000);

  const { error } = await admin
    .from("orders")
    .update({ status: "delivered", delivered_at: now.toISOString(), auto_release_at: autoRelease.toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, auto_release_at: autoRelease.toISOString() });
}
