import { createBrowserClient } from "@supabase/ssr";

export function createClient(options?: { rememberMe?: boolean }) {
  const maxAge = options?.rememberMe === false ? 60 * 60 * 24 : 60 * 60 * 24 * 30; // 1 gün / 30 gün

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { maxAge },
    }
  );
}
