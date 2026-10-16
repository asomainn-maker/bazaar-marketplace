"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Ehtiyat: Supabase "?code=..." ilə ana səhifəyə qaytararsa, sessiyanı burada tamamlayırıq.
export default function AuthCodeHandler() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname.startsWith("/auth/") || pathname.startsWith("/reset-password")) return;
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (!code) return;

    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).finally(() => {
      url.searchParams.delete("code");
      window.history.replaceState({}, "", url.pathname + url.search);
      router.refresh();
    });
  }, [pathname, router]);

  return null;
}
