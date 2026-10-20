"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import BarChart from "@/components/BarChart";
import { Problem } from "@/components/DashShell";
import { useSession, signOut, sb, rupiah, fullDate, dateLabel, dayStart } from "@/lib/db";

const TABS = ["Ringkasan", "Pengguna", "Transaksi", "Pengaturan"];

export default function Admin() {
  const s = useSession("admin");
  const router = useRouter();
  const [tab, setTab] = useState("Ringkasan");
  const [msg, setMsg] = useState(null);
  const [fees, setFees] = useState(null);

  useEffect(() => { if (s.db && !fees) setFees({ price: s.db.settings.proPrice, limit: s.db.settings.freeProductLimit }); }, [s.db, fees]);

  if (s.error) return <Problem error={s.error} />;
  if (!s.ready || !fees) return <div className="main muted">Memuat…</div>;
  const { db, reload } = s;

  const sellers = db.users.filter((u) => u.role === "seller");
  const paid = db.orders.filter((o) => o.status === "paid");
  const gmv = paid.reduce((a, o) => a + o.amount, 0);
  const pending = db.orders.filter((o) => o.status === "pending");
  const nameOf = (id) => db.users.find((u) => u.id === id)?.name || "-";
  const series = [];
  for (let i = 13; i >= 0; i--) { const t = dayStart(Date.now() - i * 86400000); series.push({ label: dateLabel(t), value: paid.filter((o) => o.createdAt >= t && o.createdAt < t + 86400000).reduce((a, o) => a + o.amount, 0) }); }

  const call = async (fn, args) => {
    setMsg(null);
    const { error } = await sb().rpc(fn, args);
    if (error) setMsg({ bad: error.message }); else await reload();
  };
  const saveSettings = async () => {
    setMsg(null);
    const { error } = await sb().from("settings").update({ pro_price: Number(fees.price), free_product_limit: Number(fees.limit) }).eq("id", 1);
    if (error) setMsg({ bad: error.message }); else { setMsg({ ok: "Pengaturan tersimpan." }); reload(); }
  };
  const out = async () => { await signOut(); router.push("/"); };

  return (
    <div style={{ minHeight: "100vh", background: "var(--mist)" }}>
      <header className="topbar"><div className="container"><div className="row"><Logo href="/admin" /><span className="badge pro">Admin</span></div><button className="btn btn-ghost btn-sm" onClick={out}>Keluar</button></div></header>
      <div className="container" style={{ padding: "24px 0 60px" }}>
        <div className="chips" style={{ marginBottom: 18 }}>{TABS.map((t) => <button key={t} className={"chip" + (tab === t ? " on" : "")} onClick={() => setTab(t)}>{t}</button>)}</div>
        {msg?.bad && <div className="err" style={{ marginBottom: 14 }} role="alert">{msg.bad}</div>}
        {msg?.ok && <div className="okmsg" style={{ marginBottom: 14 }} role="status">{msg.ok}</div>}

        {tab === "Ringkasan" && <div className="stack">
          <div className="kpis">
            <div className="kpi hl"><div className="l">Pendapatan Hubio (paket Pro)</div><div className="v">{rupiah(db.proRevenue)}</div></div>
            <div className="kpi"><div className="l">Nilai transaksi toko (dikonfirmasi)</div><div className="v">{rupiah(gmv)}</div></div>
            <div className="kpi"><div className="l">Kreator</div><div className="v">{sellers.length}</div></div>
            <div className="kpi"><div className="l">Pengguna Pro</div><div className="v">{sellers.filter((u) => u.plan === "pro").length}</div></div>
            <div className="kpi"><div className="l">Pesanan menunggu pembayaran</div><div className="v">{pending.length}</div></div>
          </div>
          <div className="card"><h3>Transaksi 14 hari terakhir</h3><BarChart data={series} format={rupiah} label="Transaksi platform" /></div>
        </div>}

        {tab === "Pengguna" && <div className="card tablewrap"><table>
          <thead><tr><th>Nama</th><th>Email</th><th>Toko</th><th>Paket</th><th>Status</th><th></th></tr></thead>
          <tbody>{sellers.map((u) => { const st = db.stores.find((x) => x.userId === u.id); return (
            <tr key={u.id}><td><b>{u.name}</b></td><td>{u.email}</td><td>{st ? "/" + st.username : "-"}</td>
              <td><span className={"badge " + (u.plan === "pro" ? "pro" : "")}>{u.plan}</span></td>
              <td><span className={"badge " + (u.suspended ? "bad" : "ok")}>{u.suspended ? "Nonaktif" : "Aktif"}</span></td>
              <td><div className="row wrap">
                <button className="btn btn-ghost btn-sm" onClick={() => call("admin_set_plan", { p_user: u.id, p_plan: u.plan === "pro" ? "free" : "pro" })}>{u.plan === "pro" ? "Turunkan ke Free" : "Jadikan Pro"}</button>
                <button className="btn btn-danger btn-sm" onClick={() => call("admin_set_suspended", { p_user: u.id, p_value: !u.suspended })}>{u.suspended ? "Aktifkan" : "Nonaktifkan"}</button>
              </div></td></tr>); })}</tbody></table></div>}

        {tab === "Transaksi" && <div className="card tablewrap"><table>
          <thead><tr><th>No.</th><th>Tanggal</th><th>Kreator</th><th>Produk</th><th>Pembeli</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>{db.orders.slice(0, 200).map((o) => <tr key={o.id}><td>{o.id}</td><td>{fullDate(o.createdAt)}</td><td>{nameOf(o.sellerId)}</td><td>{o.productName}</td><td>{o.buyerName}</td><td><b>{rupiah(o.total)}</b></td><td><span className={"badge " + (o.status === "paid" ? "ok" : o.status === "cancelled" ? "bad" : "wait")}>{o.status === "paid" ? "dikonfirmasi" : o.status === "cancelled" ? "dibatalkan" : "menunggu"}</span></td></tr>)}</tbody></table></div>}

        {tab === "Pengaturan" && <div className="card stack" style={{ maxWidth: 480 }}>
          <h3>Paket</h3>
          <div className="field"><label htmlFor="pr">Harga paket Pro per 30 hari (Rp)</label><input id="pr" className="input" type="number" min="1000" step="1000" value={fees.price} onChange={(e) => setFees({ ...fees, price: e.target.value })} /></div>
          <div className="field"><label htmlFor="lm">Batas produk paket Free</label><input id="lm" className="input" type="number" min="1" step="1" value={fees.limit} onChange={(e) => setFees({ ...fees, limit: e.target.value })} /></div>
          <p className="hint">Perubahan berlaku untuk produk yang ditambahkan berikutnya.</p>
          <button className="btn btn-primary" onClick={saveSettings}>Simpan pengaturan</button>
        </div>}
      </div>
    </div>
  );
}
