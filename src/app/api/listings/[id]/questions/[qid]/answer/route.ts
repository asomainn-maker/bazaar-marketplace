import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { id, qid } = await params;
  const { answer } = await req.json();
  if (typeof answer !== "string" || !answer.trim()) {
    return NextResponse.json({ error: "Cavab boş ola bilməz" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: listing } = await admin.from("listings").select("seller_id").eq("id", id).maybeSingle();
  if (!listing || listing.seller_id !== user.id) {
    return NextResponse.json({ error: "Yalnız satıcı cavab verə bilər" }, { status: 403 });
  }

  const { error } = await admin
    .from("listing_questions")
    .update({ answer: answer.trim().slice(0, 1000), answered_at: new Date().toISOString() })
    .eq("id", qid)
    .eq("listing_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
