import { admin, getInvoice } from "@/lib/server";

export const dynamic = "force-dynamic";

// Hanya untuk pembayaran paket Pro ke Hubio. Pesanan produk TIDAK lewat sini
// (pembeli membayar langsung ke rekening/QRIS penjual dan penjual mengonfirmasi sendiri).
export async function POST(req) {
  if (!process.env.XENDIT_CALLBACK_TOKEN || req.headers.get("x-callback-token") !== process.env.XENDIT_CALLBACK_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const p = await req.json();
    const ext = p.external_id;
    if (!p.id || !ext || !ext.startsWith("PRO-")) return new Response("ok");
    if (p.status === "PAID" || p.status === "SETTLED") {
      const inv = await getInvoice(p.id); // cek ulang langsung ke Xendit
      if (!["PAID", "SETTLED"].includes(inv.status) || inv.external_id !== ext) return new Response("ok");
      const { error } = await admin().rpc("activate_pro", { p_external: ext, p_invoice: inv.id, p_amount: inv.amount });
      if (error) throw error;
    }
    return new Response("ok");
  } catch (e) {
    console.error("webhook xendit gagal:", e.message);
    return new Response("error", { status: 500 });
  }
}
