"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "./Logo";
import { useSession, signOut } from "@/lib/db";

const NAV = [
  ["/dashboard", "Ringkasan"],
  ["/dashboard/produk", "Produk"],
  ["/dashboard/pesanan", "Transaksi"],
  ["/dashboard/pembayaran", "Pembayaran"],
  ["/dashboard/toko", "Toko"],
  ["/dashboard/statistik", "Statistik"],
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
  if (s.error) return <Problem error={s.error} />;
  if (!s.ready) return <div className="main muted">Memuat…</div>;
  const out = async () => { await signOut(); router.push("/"); };
  const pending = s.db.orders.filter((o) => o.status === "pending").length;
  const label = (h, l) => (h === "/dashboard/pesanan" && pending > 0 ? <>{l}<span className="cnt">{pending}</span></> : l);
  const on = (h) => (h === "/dashboard" ? path === h : path.startsWith(h));
  return (
    <div className="shell">
      <aside className="side">
        <Logo href="/dashboard" />
        {NAV.map(([h, l]) => <Link key={h} href={h} className={"nav" + (on(h) ? " on" : "")}>{label(h, l)}</Link>)}
        <div style={{ marginTop: "auto" }} className="stack">
          <div className="small muted" style={{ padding: "0 8px" }}>{s.user.name}<br />Paket <b>{s.user.plan === "pro" ? "Pro" : "Free"}</b></div>
          <button className="btn btn-ghost btn-sm btn-block" onClick={out}>Keluar</button>
        </div>
      </aside>
      <main className="main">
        <div className="pagehead row between wrap">
          <div><h1>{title}</h1>{subtitle && <p className="muted">{subtitle}</p>}</div>
          <div className="row">{actions}<button className="btn btn-ghost btn-sm mobonly" onClick={out}>Keluar</button></div>
        </div>
        {!s.store ? <div className="err">Toko belum ditemukan untuk akun ini. Hubungi admin.</div> : typeof children === "function" ? children(s) : children}
      </main>
      <nav className="mobbar" aria-label="Menu utama">
        {NAV.map(([h, l]) => <Link key={h} href={h} className={on(h) ? "on" : ""}>{label(h, l)}</Link>)}
      </nav>
    </div>
  );
}
