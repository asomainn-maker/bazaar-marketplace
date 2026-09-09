import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logToDiscord } from "@/lib/discord";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: profile } = await admin.from("profiles").select("username").eq("id", id).maybeSingle();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json(
      { error: "Silmək mümkün olmadı (əlaqəli sifarişlər ola bilər). Bunun əvəzinə ban edin." },
      { status: 400 }
    );
  }

  await logToDiscord("admin", `🗑️ @${profile?.username ?? id} istifadəçisi silindi.`);
  return NextResponse.json({ ok: true });
}
