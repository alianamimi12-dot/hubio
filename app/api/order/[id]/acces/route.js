import { admin } from "@/lib/server";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Halaman pembeli: cara bayar (saat menunggu) atau akses produk (setelah dikonfirmasi penjual)
export async function GET(req, { params }) {
  try {
    const token = new URL(req.url).searchParams.get("token") || "";
    if (!UUID.test(token)) return Response.json({ error: "Link tidak valid." }, { status: 400 });
    const db = admin();
    const { data: o } = await db.from("orders").select("id, seller_id, product_id, product_name, amount, unique_code, total, status, buyer_paid_at").eq("id", params.id).eq("access_token", token).maybeSingle();
    if (!o) return Response.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    const base = { status: o.status, productName: o.product_name, total: o.total, amount: o.amount, uniqueCode: o.unique_code, buyerMarked: !!o.buyer_paid_at };

    if (o.status === "pending") {
      const { data: st } = await db.from("stores").select("name, payment").eq("user_id", o.seller_id).single();
      const pay = st?.payment || {};
      return Response.json({ ...base, storeName: st?.name, payment: { banks: pay.banks || [], qris: Array.isArray(pay.qris) ? pay.qris : pay.qris ? [{ id: "q0", label: "QRIS", url: pay.qris }] : [], note: pay.note || "" } });
    }
    if (o.status !== "paid") return Response.json(base);

    const { data: f } = await db.from("product_files").select("kind, value").eq("product_id", o.product_id).maybeSingle();
    if (!f) return Response.json({ ...base, url: null });
    let url = f.value;
    if (f.kind === "pdf") {
      const { data, error } = await db.storage.from("product-files").createSignedUrl(f.value, 3600, { download: true });
      if (error) throw error;
      url = data.signedUrl;
    }
    return Response.json({ ...base, kind: f.kind, url });
  } catch (e) {
    return Response.json({ error: e.message || "Terjadi kesalahan." }, { status: 500 });
  }
}
