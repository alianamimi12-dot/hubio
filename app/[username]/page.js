"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { loadPublicStore, recordVisit, rupiah, effectivePrice, discountPct } from "@/lib/db";
import { Problem } from "@/components/DashShell";
import ProductDetail from "@/components/ProductDetail";

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
function Avatar({ store, cls }) {
  return <div className={cls}>{store.avatarUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={store.avatarUrl} alt="" /> : store.name.charAt(0).toUpperCase()}</div>;
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
          <Avatar store={store} cls="av" />
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
              <Avatar store={store} cls="sd-av" />
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

      {pick && (
        <div className="modalbg" onClick={() => setPick(null)} role="dialog" aria-modal="true" aria-label={pick.name}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="row between" style={{ marginBottom: 12 }}>
              <Link href={`/${store.username}/${pick.id}`} className="small muted" style={{ textDecoration: "underline" }}>Buka halaman produk</Link>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPick(null)}>Tutup</button>
            </div>
            <ProductDetail product={pick} addons={(data.addons || []).filter((a) => a.productId === pick.id)} />
          </div>
        </div>
      )}
    </div>
  );
}
