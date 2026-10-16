import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/email";
import { lookupGeo, getClientIp } from "@/lib/geo";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error_description") || searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(oauthError)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Giriş kodu tapılmadı")}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error?.message ?? "Giriş uğursuz oldu")}`);
  }

  try {
    const ip = getClientIp(request.headers);
    const { country, city } = await lookupGeo(ip);
    await notifyUser(
      createAdminClient(),
      data.user.id,
      "Hesabınıza yeni giriş aşkarlandı",
      `Hesabınıza <b>${ip}</b> IP ünvanından (Google) giriş edildi.<br/>Ölkə: <b>${country}</b><br/>Şəhər: <b>${city}</b><br/><br/>Bu siz deyilsinizsə: <a href="${origin}/forgot-password">Şifrəni dəyiş</a>`
    );
  } catch {
    // xəbərdarlıq emaili getməsə də giriş davam etsin
  }

  return NextResponse.redirect(`${origin}/`);
}
