"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "./Logo";
import { useSession, signOut } from "@/lib/db";

const ICONS = {
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  box: "M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6",
  wallet: "M3 7h15a3 3 0 013 3v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM3 7l12-3v3M17 14h2",
  store: "M3 9l2-5h14l2 5M3 9h18M5 9v11h14V9M10 20v-5h4v5",
  chart: "M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6",
  ext: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5",
};
function Ico({ n }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[n]} /></svg>;
}

const NAV = [
  ["/dashboard", "Ringkasan", "home"],
  ["/dashboard/produk", "Produk", "box"],
  ["/dashboard/pesanan", "Transaksi", "receipt"],
  ["/dashboard/pembayaran", "Pembayaran", "wallet"],
  ["/dashboard/toko", "Toko", "store"],
  ["/dashboard/statistik", "Statistik", "chart"],
];

export function Problem({ error }) {
  return (
    <div className="authwrap"><div className="authbox">
      <Logo />
      <h1 style={{ fontSize: 24 }}>{error === "config" ? "Supabase belum disambungkan" : "Data gagal dimuat"}</h1>
      <p className="muted" style={{ marginTop: 8 }}>
        {error === "config"
          ? "Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di Vercel (Settings > Environment Variables), lalu deploy ulang. Langkahnya ada di README."
          : `Pesan: ${error}. Pastikan skema SQL sudah dijalankan di Supabase.`}
      </p>
    </div></div>
  );
}

export default function DashShell({ title, subtitle, children, actions }) {
  const s = useSession("seller");
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (s.error) return <Problem error={s.error} />;
  if (!s.ready) return <div className="dmain muted">Memuat…</div>;
  const out = async () => { await signOut(); router.push("/"); };
  const pending = s.db.orders.filter((o) => o.status === "pending").length;
  const on = (h) => (h === "/dashboard" ? path === h : path.startsWith(h));
  return (
    <div className="dshell">
      <div className="dtop">
        <button className="dburger" aria-label="Buka menu" aria-expanded={open} onClick={() => setOpen(true)}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
        <Logo href="/dashboard" size={28} />
        <span style={{ width: 42 }} />
      </div>

      {open && <div className="dbg" onClick={() => setOpen(false)} />}
      <aside className={"dsb" + (open ? " open" : "")} aria-label="Menu dashboard">
        <div className="dsb-head">
          <Logo href="/dashboard" />
          <button className="dsb-x" aria-label="Tutup menu" onClick={() => setOpen(false)}>×</button>
        </div>
        <nav aria-label="Menu utama" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV.map(([h, l, ic]) => (
            <Link key={h} href={h} className={"dnav" + (on(h) ? " on" : "")} onClick={() => setOpen(false)}>
              <Ico n={ic} /><span style={{ flex: 1 }}>{l}</span>
              {h === "/dashboard/pesanan" && pending > 0 && <span className="cnt">{pending}</span>}
            </Link>
          ))}
        </nav>
        <div className="dsb-foot">
          {s.store && <Link href={`/${s.store.username}`} className="dnav" target="_blank"><Ico n="ext" /><span>Lihat toko</span></Link>}
          <div className="small muted" style={{ padding: "0 8px" }}>{s.user.name}<br />Paket <b>{s.user.plan === "pro" ? "Pro" : "Free"}</b></div>
          <button className="btn btn-ghost btn-sm btn-block" onClick={out}>Keluar</button>
        </div>
      </aside>

      <main className="dmain">
        <div className="pagehead row between wrap">
          <div><h1>{title}</h1>{subtitle && <p className="muted">{subtitle}</p>}</div>
          <div className="row">{actions}</div>
        </div>
        {!s.store ? <div className="err">Toko belum ditemukan untuk akun ini. Hubungi admin.</div> : typeof children === "function" ? children(s) : children}
      </main>
    </div>
  );
}
