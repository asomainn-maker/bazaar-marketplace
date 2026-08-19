import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: "İcazə yoxdur" }, { status: 403 });

  const { userId } = await params;
  const { action } = await req.json(); // 'approve' | 'reject'
  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "action 'approve' və ya 'reject' olmalıdır" }, { status: 400 });
  }

  if (action === "approve") {
    await admin.from("profiles").update({ phone_verified: true }).eq("id", userId);
  } else {
    await admin.from("profiles").update({ phone: null, phone_verified: false }).eq("id", userId);
  }

  return NextResponse.json({ ok: true });
}
