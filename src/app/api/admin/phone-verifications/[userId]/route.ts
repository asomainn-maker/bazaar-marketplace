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
  const { action, code } = await req.json(); // 'set-code' | 'reject'

  if (action === "set-code") {
    if (typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "Kod tələb olunur" }, { status: 400 });
    }
    await admin.from("profiles").update({ phone_verification_code: code.trim() }).eq("id", userId);
  } else if (action === "reject") {
    await admin.from("profiles").update({ phone: null, phone_verified: false, phone_verification_code: null }).eq("id", userId);
  } else {
    return NextResponse.json({ error: "action 'set-code' və ya 'reject' olmalıdır" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
