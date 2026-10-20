import { admin, siteUrl, userFromRequest } from "@/lib/server";
import { deliverOrder, emailReady } from "@/lib/email";

export const dynamic = "force-dynamic";

// Penjual mengonfirmasi dana masuk (action=confirm), membatalkan (cancel), atau kirim ulang email produk (resend)
export async function POST(req, { params }) {
  try {
    const user = await userFromRequest(req);
    if (!user) return Response.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
    const { action } = await req.json();
    const db = admin();
    const { data: o } = await db.from("orders").select("id, seller_id, status").eq("id", params.id).maybeSingle();
    if (!o || o.seller_id !== user.id) return Response.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    const { data: me } = await db.from("profiles").select("suspended").eq("id", user.id).single();
    if (me?.suspended) return Response.json({ error: "Akun dinonaktifkan." }, { status: 403 });
    const site = siteUrl(req);

    if (action === "cancel") {
      const { data } = await db.from("orders").update({ status: "cancelled" }).eq("id", o.id).eq("status", "pending").select("id").maybeSingle();
      return Response.json({ ok: !!data, error: data ? undefined : "Pesanan ini sudah tidak menunggu pembayaran." });
    }
    if (action === "confirm") {
      // Hanya pesanan "pending" yang bisa dikonfirmasi; klik ganda tidak mengirim dua kali
      await db.from("orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", o.id).eq("status", "pending");
    } else if (action !== "resend") return Response.json({ error: "Aksi tidak dikenal." }, { status: 400 });

    const { data: cur } = await db.from("orders").select("status").eq("id", o.id).single();
    if (cur.status !== "paid") return Response.json({ error: "Pesanan belum dikonfirmasi." }, { status: 409 });
    const email = await deliverOrder(db, o.id, site, { resend: action === "resend" });
    return Response.json({ ok: true, email, emailConfigured: emailReady() });
  } catch (e) {
    return Response.json({ error: e.message || "Terjadi kesalahan." }, { status: 500 });
  }
}
