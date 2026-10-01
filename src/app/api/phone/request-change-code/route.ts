import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { error } = await supabase.auth.signInWithOtp({ email: user.email, options: { shouldCreateUser: false } });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, email: user.email });
}
