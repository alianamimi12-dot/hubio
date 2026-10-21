"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Logo from "@/components/Logo";
import { rupiah } from "@/lib/db";
import ProofUpload from "@/components/ProofUpload";

function Copy({ text, label = "Salin" }) {
  const [ok, setOk] = useState(false);
  return <button type="button" className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); }}>{ok ? "Tersalin" : label}</button>;
}

// Halaman pembeli: cara bayar saat menunggu, lalu akses produk setelah penjual mengonfirmasi
export default function Pesanan() {
  const { id } = useParams();
  const [res, setRes] = useState(null);
  const [marking, setMarking] = useState(false);
  const token = () => (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("t") || "");

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/orders/${id}/access?token=${token()}`, { cache: "no-store" });
      setRes({ ok: r.ok, ...(await r.json()) });
    } catch { setRes({ ok: false, error: "Koneksi bermasalah. Muat ulang halaman ini." }); }
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 6000);
    return () => clearInterval(t);
  }, [load]);

  const mark = async () => {
    setMarking(true);
    await fetch(`/api/orders/${id}/paid?token=${token()}`, { method: "POST" });
    await load(); setMarking(false);
  };

  const pay = res?.payment;
  const base = String(res?.total ?? "");
  return (
    <div className="authwrap"><div className="authbox" style={{ width: "min(480px,100%)" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><Logo /></div>
      {!res && <p className="muted" style={{ textAlign: "center" }}>Memeriksa pesanan…</p>}
      {res && !res.ok && <div style={{ textAlign: "center" }}><h1 style={{ fontSize: 24 }}>Pesanan tidak ditemukan</h1><p className="muted" style={{ marginTop: 8 }}>{res.error}</p></div>}

      {res?.ok && res.status === "pending" && (
        <div className="stack">
          <h1 style={{ fontSize: 26 }}>Selesaikan pembayaran</h1>
          <p className="muted">{res.productName} · pesanan <b>{id}</b></p>
          <div className="pay">
            <div className="small muted">Transfer tepat sejumlah</div>
            <div className="total">{rupiah(res.total)}</div>
            <div className="small" style={{ margin: "6px 0 10px" }}>Harga {rupiah(res.amount)} + kode unik <b>{res.uniqueCode}</b>. <b>Nominal harus persis sama</b> supaya pembayaranmu langsung dikenali penjual.</div>
            <Copy text={base} label="Salin nominal" />
          </div>
          <div>
            <b>Bayar ke {res.storeName}</b>
            {pay.banks.map((b) => (
              <div className="bank" key={b.id}>
                <div><b>{b.bank}</b><div style={{ font: "700 18px var(--fd)" }}>{b.account}</div><div className="small muted">a.n. {b.holder}</div></div>
                <Copy text={b.account} />
              </div>
            ))}
            {pay.qris.map((q) => (
              <div key={q.id} style={{ textAlign: "center", marginTop: 14 }}>
                <b>{q.label || "QRIS"}</b>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="qris" src={q.url} alt={q.label || "QRIS"} />
              </div>
            ))}
            {pay.qris.length > 0 && <div className="small muted" style={{ marginTop: 6, textAlign: "center" }}>Scan salah satu QRIS, lalu masukkan nominal di atas.</div>}
            {pay.note && <p className="small muted" style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{pay.note}</p>}
          </div>
                   <ProofUpload id={id} token={token()} sent={res.buyerMarked} onDone={load} />
          <p className="hint">Produk dikirim ke emailmu setelah penjual memastikan dana masuk. Simpan link halaman ini.</p>
        </div>
      )}

      {res?.ok && res.status === "paid" && (
        <div className="stack" style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 26 }}>Pembayaran dikonfirmasi</h1>
          <p className="muted">{res.productName} · pesanan <b>{id}</b></p>
          {res.url ? <a className="btn btn-primary btn-block" href={res.url} target="_blank" rel="noopener noreferrer">{res.kind === "pdf" ? "Unduh PDF" : "Buka produk"}</a> : <p className="err">Penjual belum mengisi file produk. Hubungi penjual dengan nomor pesanan di atas.</p>}
          {res.addons?.filter((a) => a.link).map((a) => <a key={a.name} className="btn btn-ghost btn-block" href={a.link} target="_blank" rel="noopener noreferrer">Buka add-on: {a.name}</a>)}
          <p className="hint">Salinan produk juga dikirim ke emailmu. Cek folder spam bila belum masuk.</p>
        </div>
      )}

      {res?.ok && res.status === "cancelled" && <div style={{ textAlign: "center" }}><h1 style={{ fontSize: 24 }}>Pesanan dibatalkan</h1><p className="muted" style={{ marginTop: 8 }}>Pesanan ini dibatalkan oleh penjual. Jika kamu sudah transfer, hubungi penjual dengan nomor pesanan {id}.</p></div>}
      <p className="small" style={{ marginTop: 20, textAlign: "center" }}><Link href="/" style={{ color: "var(--blue-d)", fontWeight: 700 }}>Hubio</Link></p>
    </div></div>
  );
}
