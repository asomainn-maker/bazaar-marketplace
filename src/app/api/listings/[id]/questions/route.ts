import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { id } = await params;
  const { question } = await req.json();
  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "Sual boş ola bilməz" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: q, error } = await admin
    .from("listing_questions")
    .insert({ listing_id: id, asker_id: user.id, question: question.trim().slice(0, 500) })
    .select("id, question, answer, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: profile } = await admin.from("profiles").select("username").eq("id", user.id).maybeSingle();
  return NextResponse.json({ question: { ...q, asker_username: profile?.username ?? "istifadəçi" } });
}
