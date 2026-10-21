"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { loadPublicStore, recordVisit, rupiah, effectivePrice, discountPct } from "@/lib/db";
import { Problem } from "@/components/DashShell";
import HtmlFrame from "@/components/HtmlFrame";

const refParam = () => new URLSearchParams(window.location.search).get("ref") || "Langsung";

function Price({ p }) {
  return <div className="price"><b>{rupiah(effectivePrice(p))}</b>{p.discountPrice && <s>{rupiah(p.price)}</s>}</div>;
}
function Cover({ p }) {
  return (
    <div className="cv">
      {p.coverUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.coverUrl} alt="" loading="lazy" /> : p.type.charAt(0)}
      {p.discountPrice && <span className="off">-{discountPct(p)}%</span>}
    </div>
  );
}

export default function StorePage() {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [pick, setPick] = useState(null);
  const [menu, setMenu] = useState(false);
  const [cat, setCat] = useState("");

  useEffect(() => {
    let live = true;
    loadPublicStore(username).then((d) => {
      if (!live) return;
      setData(d);
      if (d.store) {
        const k = "hubio_seen_" + d.store.userId;
        if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, "1"); recordVisit(d.store.userId, null, refParam()); }
      }
    });
    return () => { live = false; };
  }, [username]);

  if (!data) return <div className="storepage" />;
  if (data.error) return <Problem error={data.error} />;
  if (!data.store) {
    return (
      <div className="authwrap"><div className="authbox" style={{ textAlign: "center" }}>
        <h1>Toko tidak ditemukan</h1>
        <p className="muted" style={{ margin: "8px 0 18px" }}>Periksa kembali link tokonya, atau buat tokomu sendiri.</p>
        <Link href="/register" className="btn btn-primary">Buat toko gratis</Link>
      </div></div>
    );
  }

  const { store, products } = data;
  const soc = store.socials || {};
  const open = (p) => { recordVisit(store.userId, p.id, refParam()); setPick(p); };

  // Kategori untuk menu samping, diambil dari jenis produk yang ada
  const counts = {};
  products.forEach((p) => { counts[p.type] = (counts[p.type] || 0) + 1; });
  const cats = Object.entries(counts);
  const shown = cat ? products.filter((p) => p.type === cat) : products;
  const choose = (c) => { setCat(c); setMenu(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  // Produk "kecil" yang berurutan digabung dalam grid 2 kolom; "besar" 1 kolom; "sangat kecil" seperti tombol
  const blocks = [];
  shown.forEach((p) => {
    const last = blocks[blocks.length - 1];
    if (p.display === "small") { if (last?.kind === "small") last.items.push(p); else blocks.push({ kind: "small", items: [p] }); }
    else blocks.push({ kind: p.display, items: [p] });
  });

  return (
    <div className="storepage" style={{ "--store": store.color }}>
      <div className="storebox">
        <div className="storebar">
          <button className="sburger" aria-label="Buka menu" aria-expanded={menu} onClick={() => setMenu(true)}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
          <b>{store.name}</b>
          <span style={{ width: 42 }} />
        </div>

        <div className="storehead">
          <div className="av">{store.name.charAt(0).toUpperCase()}</div>
          <h1>{store.name} {store.isPro && <span className="badge pro" style={{ verticalAlign: "middle" }}>Pro</span>}</h1>
          {store.bio && <p className="muted" style={{ marginTop: 6 }}>{store.bio}</p>}
          <div className="socials">
            {soc.instagram && <a href={soc.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>}
            {soc.tiktok && <a href={soc.tiktok} target="_blank" rel="noopener noreferrer">TikTok</a>}
            {soc.whatsapp && <a href={soc.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
          </div>
        </div>

        <div id="tautan">
          {store.links.map((l) => <a key={l.id} className="sl" href={l.url} target="_blank" rel="noopener noreferrer">{l.title}</a>)}
        </div>
        {cat && <p className="small muted" style={{ marginBottom: 10 }}>Menampilkan: <b>{cat}</b> · <button className="chip" onClick={() => setCat("")}>Lihat semua</button></p>}
        {shown.length === 0 && <div className="card empty">Belum ada produk.</div>}
        {blocks.map((b, i) => {
          if (b.kind === "small") return (
            <div className="pgrid" key={i}>{b.items.map((p) => (
              <button key={p.id} className="pcard small" onClick={() => open(p)}><Cover p={p} /><div className="bd"><div className="nm">{p.name}</div><Price p={p} /></div></button>
            ))}</div>
          );
          const p = b.items[0];
          if (b.kind === "tiny") return (
            <button key={p.id} className="tinybtn" onClick={() => open(p)}><span>{p.name}</span><span className="tp">{p.discountPrice && <s>{rupiah(p.price)}</s>}<b>{rupiah(effectivePrice(p))}</b></span></button>
          );
          return (
            <button key={p.id} className="pcard large" onClick={() => open(p)}><Cover p={p} /><div className="bd"><div className="nm">{p.name}</div><div className="small muted">{p.type}</div><Price p={p} /></div></button>
          );
        })}
        <div className="poweredby">Dibuat dengan <Link href="/" style={{ fontWeight: 700, color: "var(--blue-d)" }}>Hubio</Link></div>
      </div>

      {menu && (
        <>
          <div className="sbg" onClick={() => setMenu(false)} />
          <aside className="sdrawer" aria-label="Menu toko">
            <div className="sd-head">
              <div className="sd-av">{store.name.charAt(0).toUpperCase()}</div>
              <b>{store.name}</b>
              <button aria-label="Tutup menu" onClick={() => setMenu(false)}>×</button>
            </div>
            <button className={"sd-it" + (!cat ? " on" : "")} onClick={() => choose("")}>Beranda<span>{products.length}</span></button>
            {cats.length > 0 && <div className="sd-title">Kategori</div>}
            {cats.map(([t, n]) => <button key={t} className={"sd-it" + (cat === t ? " on" : "")} onClick={() => choose(t)}>{t}<span>{n}</span></button>)}
            {store.links.length > 0 && <a className="sd-it" href="#tautan" onClick={() => setMenu(false)}>Tautan</a>}
            {(soc.instagram || soc.tiktok || soc.whatsapp) && <div className="sd-title">Hubungi & ikuti</div>}
            {soc.instagram && <a className="sd-it" href={soc.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>}
            {soc.tiktok && <a className="sd-it" href={soc.tiktok} target="_blank" rel="noopener noreferrer">TikTok</a>}
            {soc.whatsapp && <a className="sd-it" href={soc.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
          </aside>
        </>
      )}

      {pick && <ProductModal product={pick} onClose={() => setPick(null)} />}
    </div>
  );
}

function ProductModal({ product: p, onClose }) {
  const router = useRouter();
  const [step, setStep] = useState("detail");
  const [f, setF] = useState({ name: "", email: "", phone: "", usePhone: false });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const buy = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: p.id, name: f.name, email: f.email, phone: f.usePhone ? f.phone : "" }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Gagal membuat pesanan.");
      router.push(`/pesanan/${j.orderId}?t=${j.token}`);
    } catch (e2) { setErr(e2.message); setBusy(false); }
  };

  return (
    <div className="modalbg" onClick={onClose} role="dialog" aria-modal="true" aria-label={p.name}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row between"><h2 style={{ fontSize: 22 }}>{step === "detail" ? p.name : "Checkout"}</h2><button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Tutup</button></div>

        {step === "detail" && (
          <div>
            {(p.landingUrl || p.coverUrl) && /* eslint-disable-next-line @next/next/no-img-element */ <img className="detailimg" style={{ marginTop: 14 }} src={p.landingUrl || p.coverUrl} alt={p.name} />}
            <Price p={p} />
            {p.description && <p className="desc">{p.description}</p>}
            <HtmlFrame code={p.htmlCode} />
            <button className="btn btn-primary btn-block" style={{ marginTop: 10 }} onClick={() => setStep("checkout")}>Beli sekarang</button>
          </div>
        )}

        {step === "checkout" && (
          <form onSubmit={buy}>
            <div className="card" style={{ margin: "14px 0", background: "var(--mist)" }}>
              <b>{p.name}</b><Price p={p} />
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
        )}
      </div>
    </div>
  );
}
