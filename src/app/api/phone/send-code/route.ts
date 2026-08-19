import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTwilioClient, normalizePhone } from "@/lib/twilio";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { phone } = await req.json();
  if (typeof phone !== "string" || phone.trim().length < 7) {
    return NextResponse.json({ error: "Telefon nömrəsi düzgün deyil" }, { status: 400 });
  }

  const normalized = normalizePhone(phone.trim());

  try {
    const client = getTwilioClient();
    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications.create({ to: normalized, channel: "sms" });
    return NextResponse.json({ ok: true, phone: normalized });
  } catch (e) {
    const message = e instanceof Error ? e.message : "SMS göndərilmədi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
