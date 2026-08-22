import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import sharp from "sharp";

const BUCKET = "listing-images";

async function ensureBucket(admin: ReturnType<typeof createAdminClient>) {
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: "5MB" });
  }
}

async function addWatermark(buffer: Buffer): Promise<Buffer> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const width = metadata.width ?? 800;
    const height = metadata.height ?? 600;
    const fontSize = Math.round(width * 0.09);

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${fontSize}"
          font-weight="bold" fill="white" fill-opacity="0.16" text-anchor="middle"
          dominant-baseline="middle" transform="rotate(-20 ${width / 2} ${height / 2})">
          itembazar
        </text>
      </svg>`;

    return await image
      .composite([{ input: Buffer.from(svg), gravity: "center" }])
      .jpeg({ quality: 88 })
      .toBuffer();
  } catch {
    // Watermark əlavə olunmasa da orijinal şəkli itirmə.
    return buffer;
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Fayl tələb olunur" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Yalnız şəkil qəbul olunur" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Şəkil 5MB-dan kiçik olmalıdır" }, { status: 400 });

  const admin = createAdminClient();
  await ensureBucket(admin);

  const originalBuffer = Buffer.from(await file.arrayBuffer());
  const watermarked = await addWatermark(originalBuffer);

  const path = `${user.id}/${Date.now()}.jpg`;

  const { error } = await admin.storage.from(BUCKET).upload(path, watermarked, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: pub.publicUrl });
}
