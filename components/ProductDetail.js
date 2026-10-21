"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import RichText from "./RichText";
import { rupiah, effectivePrice, discountPct } from "@/lib/db";

// Detail produk: foto, judul, harga, deskripsi, add-on, lalu tombol Buy. Dipakai di popup toko dan halaman produk.
export default function ProductDetail({ product: p, addons = [] }) {
  const router = useRouter();
  const [step, setStep] = useState("detail");
  const [sel, setSel] = useState([]);
  const [f, setF] = useState({ name: "", email: "", phone: "", usePhone: false });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const chosen = addons.filter((a) => sel.includes(a.id));
  const base = effectivePrice(p);
  const total = base + chosen.reduce((s, a) => s + a.price, 0);
  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const buy = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: p.id, name: f.name, email: f.email, phone: f.usePhone ? f.phone : "", addonIds: sel }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Gagal membuat pesanan.");
      router.push(`/pesanan/${j.orderId}?t=${j.token}`);
    } catch (e2) { setErr(e2.message); setBusy(false); }
  };

  const price = (
    <div className="price">
      <b>{rupiah(base)}</b>{p.discountPrice && <s>{rupiah(p.price)}</s>}
      {p.discountPrice && <span className="badge" style={{ background: "var(--sun)", color: "var(--ink)" }}>-{discountPct(p)}%</span>}
    </div>
  );

  if (step === "checkout") {
    return (
      <form onSubmit={buy}>
        <h2 style={{ fontSize: 22, marginBottom: 12 }}>Checkout</h2>
        <div className="card" style={{ marginBottom: 14, background: "var(--mist)" }}>
          <div className="sumline"><span>{p.name}</span><b>{rupiah(base)}</b></div>
          {chosen.map((a) => <div className="sumline" key={a.id}><span>+ {a.name}</span><b>{rupiah(a.price)}</b></div>)}
          <div className="sumline t"><span>Total</span><span>{rupiah(total)}</span></div>
          <div className="hint">Kode unik ditambahkan di halaman pembayaran.</div>
        </div>
        <div className="field"><label htmlFor="bn">Nama</label><input id="bn" className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>

        <p className="small muted" style={{ margin: "14px 0 8px", fontWeight: 600 }}>Data yang dikirim ke penjual</p>
        <label className="checkrow"><input type="checkbox" checked disabled readOnly /> Email (wajib)</label>
        <input className="input" type="email" required placeholder="email@contoh.com" aria-label="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <div className="hint">Produk dikirim ke email ini setelah pembayaranmu dikonfirmasi.</div>

        <label className="checkrow" style={{ marginTop: 14 }}><input type="checkbox" checked={f.usePhone} onChange={(e) => setF({ ...f, usePhone: e.target.checked })} /> Tambahkan nomor HP (opsional)</label>
        {f.usePhone && <input className="input" type="tel" inputMode="tel" required placeholder="08xxxxxxxxxx" aria-label="Nomor HP" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />}

        {err && <div className="err" style={{ marginTop: 14 }} role="alert">{err}</div>}
        <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} disabled={busy}>{busy ? "Membuat pesanan…" : "Lanjut ke pembayaran"}</button>
        <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => setStep("detail")}>Kembali</button>
      </form>
    );
  }

  return (
    <div>
      {(p.landingUrl || p.coverUrl) && /* eslint-disable-next-line @next/next/no-img-element */ <img className="detailimg" src={p.landingUrl || p.coverUrl} alt={p.name} />}
      <h2 style={{ fontSize: 24 }}>{p.name}</h2>
      {price}
      <RichText html={p.description} extra={p.htmlCode} />

      {addons.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <b>Tambahan (opsional)</b>
          <div style={{ marginTop: 8 }}>
            {addons.map((a) => (
              <label key={a.id} className={"addon" + (sel.includes(a.id) ? " on" : "")}>
                <input type="checkbox" checked={sel.includes(a.id)} onChange={() => toggle(a.id)} />
                <div><b>{a.name}</b>{a.description && <div className="small muted">{a.description}</div>}</div>
                <span className="ap">+{rupiah(a.price)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {chosen.length > 0 && <div className="sumline t" style={{ marginTop: 12 }}><span>Total</span><span>{rupiah(total)}</span></div>}
      <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={() => setStep("checkout")}>Buy</button>
    </div>
  );
}
