import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTwilioClient, normalizePhone } from "@/lib/twilio";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { phone, code } = await req.json();
  if (typeof phone !== "string" || typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ error: "Nömrə və kod tələb olunur" }, { status: 400 });
  }

  const normalized = normalizePhone(phone.trim());

  try {
    const client = getTwilioClient();
    const check = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks.create({ to: normalized, code: code.trim() });

    if (check.status !== "approved") {
      return NextResponse.json({ error: "Kod yanlışdır və ya vaxtı bitib" }, { status: 400 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Yoxlama uğursuz oldu";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ phone: normalized, phone_verified: true })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
