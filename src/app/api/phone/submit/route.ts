import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone-utils";
import { notifyAdmin } from "@/lib/email";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { phone } = await req.json();
  if (typeof phone !== "string" || phone.trim().length < 7) {
    return NextResponse.json({ error: "Telefon nömrəsi düzgün deyil" }, { status: 400 });
  }

  const normalized = normalizePhone(phone.trim());
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ phone: normalized, phone_verified: false })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await notifyAdmin("Yeni telefon doğrulama tələbi", `İstifadəçi telefon nömrəsi göndərdi: <b>${normalized}</b>. Panelə keçib kod təyin edin.`);
  return NextResponse.json({ ok: true, phone: normalized });
}
