import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Son `windowSeconds` saniyə ərzində istifadəçinin `action` əməliyyatını
 * neçə dəfə etdiyini yoxlayır. Limitə çatıbsa false qaytarır, əks halda
 * yeni qeyd əlavə edib true qaytarır.
 */
export async function checkRateLimit(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  action: string,
  maxCount: number,
  windowSeconds: number
): Promise<boolean> {
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { count } = await admin
    .from("rate_limit_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", action)
    .gte("created_at", since);

  if ((count ?? 0) >= maxCount) return false;

  await admin.from("rate_limit_log").insert({ user_id: userId, action });
  return true;
}
