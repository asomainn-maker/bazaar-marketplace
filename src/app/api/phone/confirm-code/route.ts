import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { code } = await req.json();
  if (typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ error: "Kod tələb olunur" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("phone_verification_code")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.phone_verification_code || profile.phone_verification_code !== code.trim()) {
    return NextResponse.json({ error: "Kod yanlışdır" }, { status: 400 });
  }

  await admin
    .from("profiles")
    .update({ phone_verified: true, phone_verification_code: null })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
