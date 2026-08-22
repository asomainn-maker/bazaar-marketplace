import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { id } = await params;
  const { description, image_url } = await req.json();

  const admin = createAdminClient();
  const { data: listing } = await admin.from("listings").select("seller_id").eq("id", id).maybeSingle();
  if (!listing || listing.seller_id !== user.id) {
    return NextResponse.json({ error: "İcazə yoxdur" }, { status: 403 });
  }

  const patch: Record<string, string | null> = {};
  if (typeof description === "string") patch.description = description.trim().slice(0, 2000) || null;
  if (typeof image_url === "string") patch.image_url = image_url;

  const { error } = await admin.from("listings").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
