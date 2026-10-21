"use client";
import { useState } from "react";
import DashShell from "@/components/DashShell";
import { rupiah, fullDate, accessToken, sb } from "@/lib/db";

const TABS = [["pending", "Menunggu"], ["paid", "Dikonfirmasi"], ["cancelled", "Dibatalkan"]];

function View({ s }) {
  const { db, reload } = s;
  const [tab, setTab] = useState("pending");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState("");
  const [proof, setProof] = useState(null); // URL bukti pembayaran yang sedang dibuka

  const act = async (o, action) => {
    const text = action === "confirm"
      ? `Konfirmasi hanya jika dana ${rupiah(o.total)} SUDAH masuk ke rekening/QRIS-mu.\n\nProduk "${o.productName}" langsung dikirim ke ${o.buyerEmail}. Lanjut?`
      : action === "cancel" ? "Batalkan pesanan ini? Pembeli tidak akan menerima produk." : "";
    if (text && !confirm(text)) return;
    setBusy(o.id + action); setMsg(null);
    try {
      const r = await fetch(`/api/orders/${o.id}/confirm`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await accessToken()) }, body: JSON.stringify({ action }) });
      const j = await r.json();
      if (!r.ok || j.ok === false) throw new Error(j.error || "Gagal memproses.");
      if (action === "cancel") setMsg({ ok: "Pesanan dibatalkan." });
      else if (j.email === "sent") setMsg({ ok: `Terkonfirmasi. Produk sudah dikirim ke ${o.buyerEmail}.` });
      else if (j.email === "failed") setMsg({ bad: "Terkonfirmasi, tetapi email gagal dikirim. Coba tombol Kirim ulang email." });
      else if (j.email === "disabled") setMsg({ bad: "Terkonfirmasi. Email otomatis belum diaktifkan oleh pengelola Hubio, jadi salin link akses dan kirim manual ke pembeli." });
      else setMsg({ ok: "Terkonfirmasi." });
      await reload();
    } catch (e) { setMsg({ bad: e.message }); }
    setBusy("");
  };

  const viewProof = async (o) => {
    setMsg(null);
    const { data, error } = await sb().storage.from("payment-proofs").createSignedUrl(o.proofPath, 600);
    if (error) return setMsg({ bad: "Bukti tidak bisa dibuka: " + error.message });
    setProof(data.signedUrl);
  };

  const term = q.trim().toLowerCase();
  const list = db.orders.filter((o) => o.status === tab && (!term || String(o.total).includes(term) || o.buyerName.toLowerCase().includes(term) || o.buyerEmail.toLowerCase().includes(term) || o.id.toLowerCase().includes(term)));
  const cnt = (k) => db.orders.filter((o) => o.status === k).length;
  const link = (o) => `${window.location.origin}/pesanan/${o.id}?t=${o.token}`;

  return (
    <div className="stack">
      <div className="card">
        <p style={{ marginBottom: 8 }}><b>Cara kerja:</b> pembeli transfer ke rekening/QRIS-mu dengan nominal unik lalu mengunggah bukti pembayaran. Cocokkan nominalnya di mutasi, lalu klik <b>Konfirmasi dana masuk</b>. Produk langsung dikirim ke email pembeli.</p>
        <input className="input" placeholder="Cari nominal (mis. 49127), nama, email, atau nomor pesanan" aria-label="Cari transaksi" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="tabs">{TABS.map(([k, l]) => <button key={k} className={"chip" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>{l} ({cnt(k)})</button>)}</div>
      {msg?.ok && <div className="okmsg" role="status">{msg.ok}</div>}
      {msg?.bad && <div className="err" role="alert">{msg.bad}</div>}

      {list.length === 0 ? <div className="card empty">Tidak ada transaksi di sini.</div> : list.map((o) => (
        <div className={"tx" + (o.status === "pending" && o.buyerPaidAt ? " mark" : "")} key={o.id}>
          <div className="row between wrap">
            <div><div className="small muted">Cocokkan di mutasi</div><div className="amt">{rupiah(o.total)}</div><div className="small muted">harga {rupiah(o.amount)} + kode unik {o.uniqueCode}</div></div>
            <div className="right"><b>{o.productName}</b>{o.addons?.length > 0 && <div className="small">+ {o.addons.map((a) => a.name).join(", ")}</div>}<div className="small muted">{o.id} · {fullDate(o.createdAt)}</div>
              {o.status === "pending" && o.proofPath && <span className="badge wait">Bukti pembayaran diterima</span>}
              {o.status === "pending" && !o.proofPath && <span className="badge">Belum ada bukti</span>}
              {o.status === "paid" && <span className="badge ok">{o.deliveredAt ? "Produk terkirim" : "Email belum terkirim"}</span>}</div>
          </div>
          <div className="small" style={{ margin: "10px 0" }}>{o.buyerName} · {o.buyerEmail}{o.buyerPhone && <> · {o.buyerPhone}</>}</div>
          <div className="row wrap">
            {o.proofPath && <button className="btn btn-ghost btn-sm" onClick={() => viewProof(o)}>Lihat bukti pembayaran</button>}
            {o.status === "pending" && <>
              <button className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => act(o, "confirm")}>{busy === o.id + "confirm" ? "Memproses…" : "Konfirmasi dana masuk"}</button>
              <button className="btn btn-danger btn-sm" disabled={!!busy} onClick={() => act(o, "cancel")}>Batalkan</button>
            </>}
            {o.status === "paid" && <>
              <button className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => act(o, "resend")}>Kirim ulang email</button>
              <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(link(o))}>Salin link akses pembeli</button>
            </>}
          </div>
        </div>
      ))}

      {proof && (
        <div className="modalbg" onClick={() => setProof(null)} role="dialog" aria-modal="true" aria-label="Bukti pembayaran">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="row between" style={{ marginBottom: 12 }}><b>Bukti pembayaran</b><button className="btn btn-ghost btn-sm" onClick={() => setProof(null)}>Tutup</button></div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={proof} alt="Bukti pembayaran dari pembeli" style={{ width: "100%", borderRadius: 12 }} />
            <p className="hint">Tautan bukti hanya berlaku sebentar. Cocokkan nominal dan namanya dengan mutasi rekeningmu.</p>
          </div>
        </div>
      )}
    </div>
  );
}
export default function Transaksi() { return <DashShell title="Transaksi" subtitle="Cek bukti dan dana masuk, lalu konfirmasi pesanan pembelimu.">{(s) => <View s={s} />}</DashShell>; }
