import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { code } = await req.json();
  if (typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ error: "Kod tələb olunur" }, { status: 400 });
  }

  const { error } = await supabase.auth.verifyOtp({ email: user.email, token: code.trim(), type: "email" });
  if (error) return NextResponse.json({ error: "Kod yanlışdır və ya vaxtı bitib" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
