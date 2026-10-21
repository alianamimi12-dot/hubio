import { admin, siteUrl } from "@/lib/server";
import { notifyBuyerMarked } from "@/lib/email";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Pembeli mengunggah bukti pembayaran (foto/screenshot). Foto dikecilkan di browser sebelum dikirim.
export async function POST(req, { params }) {
  try {
    const token = new URL(req.url).searchParams.get("token") || "";
    if (!UUID.test(token)) return Response.json({ error: "Link tidak valid." }, { status: 400 });
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") return Response.json({ error: "Pilih foto bukti pembayaran." }, { status: 400 });
    const ext = TYPES[file.type];
    if (!ext) return Response.json({ error: "Format foto harus JPG, PNG, atau WEBP." }, { status: 400 });
    if (file.size > 4 * 1024 * 1024) return Response.json({ error: "Ukuran foto maksimal 4 MB." }, { status: 413 });

    const db = admin();
    const { data: o } = await db.from("orders").select("id, seller_id, status, proof_path").eq("id", params.id).eq("access_token", token).maybeSingle();
    if (!o) return Response.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    if (o.status !== "pending") return Response.json({ error: "Pesanan ini sudah tidak menunggu pembayaran." }, { status: 409 });

    const path = `${o.seller_id}/${o.id}-${Date.now()}.${ext}`;
    const up = await db.storage.from("payment-proofs").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
    if (up.error) throw up.error;
    if (o.proof_path) await db.storage.from("payment-proofs").remove([o.proof_path]); // ganti bukti lama

    const now = new Date().toISOString();
    const { data: upd } = await db.from("orders").update({ proof_path: path, proof_at: now, buyer_paid_at: now })
      .eq("id", o.id).eq("status", "pending")
      .select("id, seller_id, product_name, buyer_name, buyer_email, buyer_phone, total, unique_code, amount, access_token").single();
    if (upd && !o.proof_path) await notifyBuyerMarked(db, upd, siteUrl(req)); // beri tahu penjual hanya untuk bukti pertama
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message || "Terjadi kesalahan." }, { status: 500 });
  }
}
