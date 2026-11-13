import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const check = await requireAdmin();
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });
  const admin = createAdminClient();
  const { data } = await admin.from("recovery_requests").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(30);
  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(req: NextRequest) {
  const check = await requireAdmin();
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });
  const { id, status } = await req.json();
  if (!["resolved", "rejected"].includes(status)) return NextResponse.json({ error: "status düzgün deyil" }, { status: 400 });
  const admin = createAdminClient();
  await admin.from("recovery_requests").update({ status }).eq("id", id);
  return NextResponse.json({ ok: true });
}
