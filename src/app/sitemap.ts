import { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://itembazar.online";
  const admin = createAdminClient();

  const { data: listings } = await admin
    .from("listings")
    .select("id, created_at")
    .eq("status", "active")
    .limit(1000);

  const { data: profiles } = await admin.from("profiles").select("username, created_at").limit(1000);

  return [
    { url: base, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/login`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/signup`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    ...((listings ?? []).map((l) => ({
      url: `${base}/listings/${l.id}`,
      lastModified: new Date(l.created_at),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }))),
    ...((profiles ?? []).map((p) => ({
      url: `${base}/u/${p.username}`,
      lastModified: new Date(p.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }))),
  ];
}
