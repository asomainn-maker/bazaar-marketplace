import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logToDiscord } from "@/lib/discord";

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
  const { data: targetProfile } = await admin.from("profiles").select("username, phone").eq("id", userId).maybeSingle();

  if (action === "set-code") {
    if (typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "Kod tələb olunur" }, { status: 400 });
    }
    await admin.from("profiles").update({ phone_verification_code: code.trim() }).eq("id", userId);
    await logToDiscord("phone", `🔑 @${targetProfile?.username ?? userId} (${targetProfile?.phone ?? "?"}) üçün kod təyin olundu: \`${code.trim()}\``);
  } else if (action === "reject") {
    await admin.from("profiles").update({ phone: null, phone_verified: false, phone_verification_code: null }).eq("id", userId);
    await logToDiscord("phone", `❌ @${targetProfile?.username ?? userId} telefon tələbi rədd edildi.`);
  } else {
    return NextResponse.json({ error: "action 'set-code' və ya 'reject' olmalıdır" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
