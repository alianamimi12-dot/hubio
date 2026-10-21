"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { loadPublicStore, recordVisit } from "@/lib/db";
import { Problem } from "@/components/DashShell";
import ProductDetail from "@/components/ProductDetail";

// Link checkout khusus satu produk: /username/ID-PRODUK
export default function ProductPage() {
  const { username, pid } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    let live = true;
    loadPublicStore(username).then((d) => {
      if (!live) return;
      setData(d);
      const p = d.products?.find((x) => x.id === pid);
      if (d.store && p) recordVisit(d.store.userId, p.id, new URLSearchParams(window.location.search).get("ref") || "Langsung");
    });
    return () => { live = false; };
  }, [username, pid]);

  if (!data) return <div className="storepage" />;
  if (data.error) return <Problem error={data.error} />;
  const product = data.products?.find((x) => x.id === pid);
  if (!data.store || !product) {
    return (
      <div className="authwrap"><div className="authbox" style={{ textAlign: "center" }}>
        <h1>Produk tidak ditemukan</h1>
        <p className="muted" style={{ margin: "8px 0 18px" }}>Produk ini mungkin sudah disembunyikan atau linknya salah.</p>
        {data.store && <Link href={`/${data.store.username}`} className="btn btn-primary">Lihat toko</Link>}
      </div></div>
    );
  }
  const { store } = data;
  const addons = (data.addons || []).filter((a) => a.productId === product.id);

  return (
    <div className="storepage" style={{ "--store": store.color }}>
      <div className="storebox">
        <Link href={`/${store.username}`} className="storebar" style={{ justifyContent: "flex-start" }}>
          <span className="sd-av">{store.avatarUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={store.avatarUrl} alt="" /> : store.name.charAt(0).toUpperCase()}</span>
          <b style={{ textAlign: "left" }}>{store.name}</b>
        </Link>
        <div className="card"><ProductDetail product={product} addons={addons} /></div>
        <div className="poweredby">Dibuat dengan <Link href="/" style={{ fontWeight: 700, color: "var(--blue-d)" }}>Hubio</Link></div>
      </div>
    </div>
  );
}
