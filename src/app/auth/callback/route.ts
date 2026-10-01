import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/email";
import { lookupGeo, getClientIp } from "@/lib/geo";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    if (data.user) {
      const ip = getClientIp(request.headers);
      const { country, city } = await lookupGeo(ip);
      const admin = createAdminClient();
      await notifyUser(
        admin,
        data.user.id,
        "Hesabınıza yeni giriş aşkarlandı",
        `Hesabınıza <b>${ip}</b> IP ünvanından (Google) giriş edildi.<br/>Ölkə: <b>${country}</b><br/>Şəhər: <b>${city}</b><br/><br/>Bu siz deyilsinizsə: <a href="${origin}/forgot-password">Şifrəni dəyiş</a>`
      );
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
