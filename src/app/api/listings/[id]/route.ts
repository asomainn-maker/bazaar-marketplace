import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: listing } = await admin.from("listings").select("seller_id, status").eq("id", id).maybeSingle();
  if (!listing) return NextResponse.json({ error: "Tapılmadı" }, { status: 404 });

  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (listing.seller_id !== user.id && !profile?.is_admin) {
    return NextResponse.json({ error: "İcazə yoxdur" }, { status: 403 });
  }
  if (listing.status === "sold") {
    return NextResponse.json({ error: "Satılmış elan silinə bilməz" }, { status: 400 });
  }

  const { error } = await admin.from("listings").update({ status: "removed" }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
