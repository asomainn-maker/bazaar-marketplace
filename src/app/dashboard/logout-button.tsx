"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button onClick={handleLogout} className="rounded-full border border-line px-3 py-1.5 text-mist hover:text-paper">
      Çıxış
    </button>
  );
}
