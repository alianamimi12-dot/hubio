// Hanya dipakai di sisi server. Email lewat Resend (https://resend.com), tanpa paket tambahan.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rp = (n) => "Rp" + Math.round(n || 0).toLocaleString("id-ID");

export const emailReady = () => !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM);

export async function sendEmail({ to, subject, html, text, replyTo, attachments }) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM, to: [to], subject, html, text,
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(attachments?.length ? { attachments } : {}),
    }),
  });
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.message || "Gagal mengirim email."); }
}

function layout(title, body, button) {
  return `<!doctype html><html><body style="margin:0;background:#EEF7FD;font-family:Arial,Helvetica,sans-serif;color:#0B2540">
<div style="max-width:520px;margin:0 auto;padding:24px 16px">
<div style="font-size:26px;font-weight:800;color:#2B9BE6;margin-bottom:16px">Hubio</div>
<div style="background:#fff;border:1px solid #D6E8F4;border-radius:16px;padding:24px">
<h1 style="font-size:22px;margin:0 0 12px">${esc(title)}</h1>
${body}
${button ? `<p style="margin:24px 0 4px"><a href="${esc(button.url)}" style="background:#2B9BE6;color:#fff;text-decoration:none;font-weight:700;padding:13px 24px;border-radius:999px;display:inline-block">${esc(button.label)}</a></p>` : ""}
</div>
<p style="font-size:12px;color:#3F5A75;margin:16px 4px">Email ini dikirim otomatis oleh Hubio atas nama penjual. Jangan bagikan tautan di dalamnya kepada orang lain.</p>
</div></body></html>`;
}
const row = (k, v) => `<tr><td style="padding:4px 12px 4px 0;color:#3F5A75;font-size:14px">${esc(k)}</td><td style="padding:4px 0;font-size:14px"><b>${esc(v)}</b></td></tr>`;

/* ---------- Templat ---------- */
export function orderCreatedBuyer({ o, storeName, link }) {
  return {
    subject: `Pesanan ${o.id}: selesaikan pembayaran ${rp(o.total)}`,
    html: layout("Pesananmu sudah dibuat",
      `<p style="margin:0 0 14px;line-height:1.5">Halo ${esc(o.buyer_name)}, segera transfer <b>tepat ${esc(rp(o.total))}</b> (termasuk kode unik ${esc(o.unique_code)}) ke ${esc(storeName)}. Nominal harus persis sama agar pembayaranmu cepat dikenali.</p>
       <table style="border-collapse:collapse">${row("Produk", o.product_name)}${row("Nomor pesanan", o.id)}${row("Total transfer", rp(o.total))}</table>`,
      { label: "Lihat cara bayar", url: link }),
    text: `Halo ${o.buyer_name}, segera transfer TEPAT ${rp(o.total)} (termasuk kode unik ${o.unique_code}) ke ${storeName}.\nProduk: ${o.product_name}\nNomor pesanan: ${o.id}\n\nCara bayar: ${link}`,
  };
}

export function orderCreatedSeller({ o, link }) {
  return {
    subject: `Pesanan baru menunggu pembayaran: ${rp(o.total)}`,
    html: layout("Pesanan baru",
      `<p style="margin:0 0 14px;line-height:1.5">Seorang pembeli membuat pesanan. Cek mutasi rekening/QRIS untuk nominal <b>${esc(rp(o.total))}</b>.</p>
       <table style="border-collapse:collapse">${row("Produk", o.product_name)}${row("Total transfer", rp(o.total))}${row("Pembeli", o.buyer_name)}${row("Email", o.buyer_email)}${o.buyer_phone ? row("No. HP", o.buyer_phone) : ""}</table>`,
      { label: "Buka transaksi", url: link }),
    text: `Pesanan baru: ${o.product_name}\nTotal transfer: ${rp(o.total)}\nPembeli: ${o.buyer_name} (${o.buyer_email})\n\nBuka transaksi: ${link}`,
  };
}

export function buyerMarkedSeller({ o, link }) {
  return {
    subject: `Bukti pembayaran masuk: ${rp(o.total)}`,
    html: layout("Pembeli mengirim bukti pembayaran",
      `<p style="margin:0 0 14px;line-height:1.5">${esc(o.buyer_name)} mengunggah bukti pembayaran untuk nominal <b>${esc(rp(o.total))}</b>. Buka transaksi untuk melihat buktinya, cek mutasi, lalu konfirmasi bila dana sudah masuk.</p>`,
      { label: "Buka transaksi", url: link }),
    text: `${o.buyer_name} mengunggah bukti pembayaran ${rp(o.total)} (${o.product_name}). Lihat bukti dan konfirmasi: ${link}`,
  };
}

export function deliveryBuyer({ o, storeName, link, directUrl, hasAttachment }) {
  const extra = directUrl ? `<p style="margin:14px 0 0;font-size:14px;line-height:1.5">Tautan langsung produk: <a href="${esc(directUrl)}">${esc(directUrl)}</a></p>` : "";
  const att = hasAttachment ? `<p style="margin:14px 0 0;font-size:14px">File PDF juga terlampir di email ini.</p>` : "";
  const ad = Array.isArray(o.addons) ? o.addons : [];
  const safe = (u) => (/^https?:\/\//i.test(u || "") ? u : null);
  const adHtml = ad.length
    ? `<p style="margin:14px 0 4px;font-size:14px"><b>Add-on:</b></p>` + ad.map((a) => `<p style="margin:2px 0;font-size:14px">${esc(a.name)}${safe(a.link) ? ` - <a href="${esc(a.link)}">${esc(a.link)}</a>` : ""}</p>`).join("")
    : "";
  const adText = ad.length ? "\nAdd-on:\n" + ad.map((a) => `- ${a.name}${safe(a.link) ? ": " + a.link : ""}`).join("\n") : "";
  return {
    subject: `Produkmu siap: ${o.product_name}`,
    html: layout("Pembayaran dikonfirmasi",
      `<p style="margin:0 0 14px;line-height:1.5">Halo ${esc(o.buyer_name)}, pembayaranmu ke ${esc(storeName)} sudah dikonfirmasi. Terima kasih!</p>
       <table style="border-collapse:collapse">${row("Produk", o.product_name)}${row("Nomor pesanan", o.id)}${row("Total", rp(o.total))}</table>${extra}${att}${adHtml}`,
      { label: "Buka produk", url: link }),
    text: `Halo ${o.buyer_name}, pembayaranmu ke ${storeName} sudah dikonfirmasi.\nProduk: ${o.product_name}\nNomor pesanan: ${o.id}\n\nBuka produk: ${link}${directUrl ? "\nTautan langsung: " + directUrl : ""}${hasAttachment ? "\nFile PDF terlampir." : ""}${adText}\n\nSimpan email ini.`,
  };
}

/* ---------- Pengiriman ---------- */
const COLS = "id, seller_id, product_id, product_name, buyer_name, buyer_email, buyer_phone, amount, unique_code, total, access_token, addons";
const MAX_ATTACH = 8 * 1024 * 1024;

async function sellerInfo(db, sellerId) {
  const [{ data: st }, { data: p }] = await Promise.all([
    db.from("stores").select("name").eq("user_id", sellerId).maybeSingle(),
    db.from("profiles").select("email").eq("id", sellerId).single(),
  ]);
  return { storeName: st?.name || "toko ini", sellerEmail: p?.email };
}

export async function notifyOrderCreated(db, o, site) {
  if (!emailReady()) return;
  const { storeName, sellerEmail } = await sellerInfo(db, o.seller_id);
  await Promise.allSettled([
    sendEmail({ to: o.buyer_email, replyTo: sellerEmail, ...orderCreatedBuyer({ o, storeName, link: `${site}/pesanan/${o.id}?t=${o.access_token}` }) }),
    sendEmail({ to: sellerEmail, ...orderCreatedSeller({ o, link: `${site}/dashboard/pesanan` }) }),
  ]);
}

export async function notifyBuyerMarked(db, o, site) {
  if (!emailReady()) return;
  const { sellerEmail } = await sellerInfo(db, o.seller_id);
  await sendEmail({ to: sellerEmail, ...buyerMarkedSeller({ o, link: `${site}/dashboard/pesanan` }) }).catch((e) => console.error("email penjual gagal:", e.message));
}

// Kirim produk ke email pembeli sesuai produk di pesanan. Diklaim atomik (delivered_at) agar tidak terkirim ganda.
export async function deliverOrder(db, orderId, site, { resend = false } = {}) {
  if (!emailReady()) return "disabled";
  let q = db.from("orders").update({ delivered_at: new Date().toISOString() }).eq("id", orderId).eq("status", "paid");
  q = resend ? q.or(`delivered_at.is.null,delivered_at.lt.${new Date(Date.now() - 60000).toISOString()}`) : q.is("delivered_at", null);
  const { data: o } = await q.select(COLS).maybeSingle();
  if (!o) return "skipped";
  try {
    const { storeName, sellerEmail } = await sellerInfo(db, o.seller_id);
    const { data: f } = await db.from("product_files").select("kind, value").eq("product_id", o.product_id).maybeSingle();
    let attachments, directUrl;
    if (f?.kind === "link") directUrl = f.value;
    if (f?.kind === "pdf") {
      try {
        const { data: blob } = await db.storage.from("product-files").download(f.value);
        if (blob && blob.size <= MAX_ATTACH) {
          const name = f.value.split("/").pop().replace(/^\d+-/, "") || "produk.pdf";
          attachments = [{ filename: name, content: Buffer.from(await blob.arrayBuffer()).toString("base64") }];
        }
      } catch (e) { console.error("lampiran gagal, kirim tautan saja:", e.message); }
    }
    const t = deliveryBuyer({ o, storeName, link: `${site}/pesanan/${o.id}?t=${o.access_token}`, directUrl, hasAttachment: !!attachments });
    await sendEmail({ to: o.buyer_email, replyTo: sellerEmail, attachments, ...t });
    return "sent";
  } catch (e) {
    await db.from("orders").update({ delivered_at: null }).eq("id", orderId);
    console.error("email produk gagal:", e.message);
    return "failed";
  }
}
