import { admin, siteUrl } from "@/lib/server";
import { notifyOrderCreated } from "@/lib/email";

export const dynamic = "force-dynamic";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[0-9+\-\s]{8,18}$/;

export async function POST(req) {
  try {
    const { productId, name, email, phone } = await req.json();
    if (!productId || !name?.trim() || !EMAIL.test(email || "")) return Response.json({ error: "Nama atau email belum benar." }, { status: 400 });
    if (phone && !PHONE.test(phone)) return Response.json({ error: "Nomor HP tidak valid." }, { status: 400 });

    const db = admin();
    const { data: prod } = await db.from("products").select("id, seller_id, name, price, discount_price, active").eq("id", productId).maybeSingle();
    if (!prod || !prod.active) return Response.json({ error: "Produk tidak tersedia." }, { status: 404 });
    const { data: seller } = await db.from("profiles").select("suspended").eq("id", prod.seller_id).single();
    if (seller?.suspended) return Response.json({ error: "Toko ini sedang tidak aktif." }, { status: 404 });
    const { data: store } = await db.from("stores").select("payment").eq("user_id", prod.seller_id).single();
    const pay = store?.payment || {};
    const qrisList = Array.isArray(pay.qris) ? pay.qris : pay.qris ? [{ id: "q0", label: "QRIS", url: pay.qris }] : [];
    if (!(pay.banks?.length || qrisList.length)) return Response.json({ error: "Penjual belum mengatur metode pembayaran." }, { status: 409 });
    const { data: hasFile } = await db.from("product_files").select("product_id").eq("product_id", prod.id).maybeSingle();
    if (!hasFile) return Response.json({ error: "Produk ini belum siap dijual." }, { status: 409 });

    // Harga selalu dari database. Kode unik 1-999: total transfer tiap pesanan menunggu dijamin berbeda
    // oleh indeks unik di database, jadi kalau bentrok kita coba kode lain.
    const amount = prod.discount_price ?? prod.price;
    const used = new Set();
    let order = null, lastErr = null;
    for (let i = 0; i < 40 && !order; i++) {
      let code; do { code = 1 + Math.floor(Math.random() * 999); } while (used.has(code) && used.size < 999);
      used.add(code);
      const { data, error } = await db.from("orders").insert({
        seller_id: prod.seller_id, product_id: prod.id, product_name: prod.name,
        buyer_name: name.trim().slice(0, 80), buyer_email: email.trim().toLowerCase(), buyer_phone: phone?.trim() || null,
        amount, unique_code: code,
      }).select("id, seller_id, product_name, buyer_name, buyer_email, buyer_phone, amount, unique_code, total, access_token").single();
      if (!error) order = data; else if (error.code !== "23505") throw error; else lastErr = error;
    }
    if (!order) throw lastErr || new Error("Gagal membuat pesanan. Coba lagi.");

    await notifyOrderCreated(db, order, siteUrl(req)); // tidak melempar error; email bersifat best-effort
    return Response.json({ orderId: order.id, token: order.access_token });
  } catch (e) {
    return Response.json({ error: e.message || "Terjadi kesalahan." }, { status: 500 });
  }
}
