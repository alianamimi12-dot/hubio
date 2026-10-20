import { admin, siteUrl } from "@/lib/server";
import { notifyBuyerMarked } from "@/lib/email";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Pembeli menekan "Saya sudah bayar". Ini hanya penanda untuk penjual, BUKAN konfirmasi pembayaran.
export async function POST(req, { params }) {
  try {
    const token = new URL(req.url).searchParams.get("token") || "";
    if (!UUID.test(token)) return Response.json({ error: "Link tidak valid." }, { status: 400 });
    const db = admin();
    const { data: o } = await db.from("orders").update({ buyer_paid_at: new Date().toISOString() })
      .eq("id", params.id).eq("access_token", token).eq("status", "pending").is("buyer_paid_at", null)
      .select("id, seller_id, product_name, buyer_name, buyer_email, buyer_phone, total, unique_code, amount, access_token").maybeSingle();
    if (o) await notifyBuyerMarked(db, o, siteUrl(req));
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message || "Terjadi kesalahan." }, { status: 500 });
  }
}
