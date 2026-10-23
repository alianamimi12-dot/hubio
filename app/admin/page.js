"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import BarChart from "@/components/BarChart";
import { Problem } from "@/components/DashShell";
import { useSession, signOut, sb, rupiah, fullDate, dateLabel, dayStart } from "@/lib/db";

const TABS = ["Ringkasan", "Pengguna", "Transaksi", "Penarikan", "Promosi", "Pengaturan"];
const WST = { diproses: "wait", berhasil: "ok", ditolak: "bad" };
const PST = { pending: "wait", approved: "ok", rejected: "bad" };

export default function Admin() {
  const s = useSession("admin");
  const router = useRouter();
  const [tab, setTab] = useState("Ringkasan");
  const [msg, setMsg] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [adj, setAdj] = useState({ user: "", amount: "", note: "" });

  useEffect(() => { if (s.db && !cfg) setCfg({ price: s.db.settings.proPrice, limit: s.db.settings.freeProductLimit, ref: s.db.settings.referralPct, min: s.db.settings.minWithdraw }); }, [s.db, cfg]);

  if (s.error) return <Problem error={s.error} />;
  if (!s.ready || !cfg) return <div className="dmain muted">Memuat…</div>;
  const { db, reload } = s;

  const sellers = db.users.filter((u) => u.role === "seller");
  const paid = db.orders.filter((o) => o.status === "paid");
  const gmv = paid.reduce((a, o) => a + o.amount, 0);
  const pendingWd = db.withdrawals.filter((w) => w.status === "diproses");
  const pendingPromo = db.promos.filter((p) => p.status === "pending");
  const nameOf = (id) => db.users.find((u) => u.id === id)?.name || "-";
  const series = [];
  for (let i = 13; i >= 0; i--) { const t = dayStart(Date.now() - i * 86400000); series.push({ label: dateLabel(t), value: paid.filter((o) => o.createdAt >= t && o.createdAt < t + 86400000).reduce((a, o) => a + o.amount, 0) }); }

  const call = async (fn, args, okText) => {
    setMsg(null);
    const { error } = await sb().rpc(fn, args);
    if (error) setMsg({ bad: error.message }); else { if (okText) setMsg({ ok: okText }); await reload(); }
  };
  const saveCfg = async () => {
    setMsg(null);
    const { error } = await sb().from("settings").update({ pro_price: Number(cfg.price), free_product_limit: Number(cfg.limit), referral_pct: Number(cfg.ref), min_withdraw: Number(cfg.min) }).eq("id", 1);
    if (error) setMsg({ bad: error.message }); else { setMsg({ ok: "Pengaturan tersimpan." }); reload(); }
  };
  const out = async () => { await signOut(); router.push("/"); };

  const approveWd = (w) => { if (confirm(`Setujui hanya setelah kamu mentransfer ${rupiah(w.amount)} ke ${w.bank} ${w.account} a.n. ${w.holder}. Lanjut?`)) call("admin_set_withdrawal", { p_id: w.id, p_status: "berhasil", p_note: "" }, "Penarikan disetujui."); };
  const rejectWd = (w) => { const note = prompt("Alasan penolakan (dilihat penjual):", ""); if (note !== null) call("admin_set_withdrawal", { p_id: w.id, p_status: "ditolak", p_note: note }, "Penarikan ditolak, saldo dikembalikan."); };
  const approvePromo = (p) => { const v = prompt(`Nominal hadiah untuk konten ${p.platform} ini (Rp):`, "10000"); if (v === null) return; const n = Math.round(Number(v)); if (!(n >= 0)) return setMsg({ bad: "Nominal tidak valid." }); call("admin_review_promo", { p_id: p.id, p_status: "approved", p_reward: n, p_note: "" }, "Konten disetujui."); };
  const rejectPromo = (p) => { const note = prompt("Alasan penolakan (dilihat penjual):", ""); if (note !== null) call("admin_review_promo", { p_id: p.id, p_status: "rejected", p_reward: 0, p_note: note }, "Konten ditolak."); };
  const doAdjust = async (e) => {
    e.preventDefault();
    const n = Math.round(Number(adj.amount));
    if (!adj.user || !n) return setMsg({ bad: "Pilih pengguna dan isi nominal (boleh negatif untuk mengurangi)." });
    await call("admin_adjust_balance", { p_user: adj.user, p_amount: n, p_note: adj.note }, "Saldo disesuaikan.");
    setAdj({ user: adj.user, amount: "", note: "" });
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--mist)" }}>
      <header className="topbar"><div className="container"><div className="row"><Logo href="/admin" /><span className="badge pro">Admin</span></div><button className="btn btn-ghost btn-sm" onClick={out}>Keluar</button></div></header>
      <div className="container" style={{ padding: "24px 0 60px" }}>
        <div className="chips" style={{ marginBottom: 18 }}>{TABS.map((t) => {
          const n = t === "Penarikan" ? pendingWd.length : t === "Promosi" ? pendingPromo.length : 0;
          return <button key={t} className={"chip" + (tab === t ? " on" : "")} onClick={() => setTab(t)}>{t}{n > 0 ? ` (${n})` : ""}</button>;
        })}</div>
        {msg?.bad && <div className="err" style={{ marginBottom: 14 }} role="alert">{msg.bad}</div>}
        {msg?.ok && <div className="okmsg" style={{ marginBottom: 14 }} role="status">{msg.ok}</div>}

        {tab === "Ringkasan" && <div className="stack">
          <div className="kpis">
            <div className="kpi hl"><div className="l">Pendapatan Hubio (paket Pro)</div><div className="v">{rupiah(db.proRevenue)}</div></div>
            <div className="kpi"><div className="l">Nilai transaksi toko</div><div className="v">{rupiah(gmv)}</div></div>
            <div className="kpi"><div className="l">Kreator</div><div className="v">{sellers.length}</div></div>
            <div className="kpi"><div className="l">Pengguna Pro</div><div className="v">{sellers.filter((u) => u.plan === "pro").length}</div></div>
            <div className="kpi"><div className="l">Penarikan menunggu</div><div className="v">{pendingWd.length}</div></div>
            <div className="kpi"><div className="l">Konten promosi menunggu</div><div className="v">{pendingPromo.length}</div></div>
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

        {tab === "Penarikan" && <div className="card tablewrap">
          {db.withdrawals.length === 0 ? <div className="empty">Belum ada permintaan penarikan.</div> : <table>
            <thead><tr><th>Tanggal</th><th>Penjual</th><th>Nominal</th><th>Rekening tujuan</th><th>Status</th><th></th></tr></thead>
            <tbody>{db.withdrawals.map((w) => (
              <tr key={w.id}><td>{fullDate(w.createdAt)}</td><td>{nameOf(w.userId)}</td><td><b>{rupiah(w.amount)}</b></td><td>{w.bank} {w.account}<div className="small muted">a.n. {w.holder}</div></td>
                <td><span className={"badge " + WST[w.status]}>{w.status}</span>{w.note && <div className="small muted">{w.note}</div>}</td>
                <td>{w.status === "diproses" && <div className="row"><button className="btn btn-primary btn-sm" onClick={() => approveWd(w)}>Setujui</button><button className="btn btn-danger btn-sm" onClick={() => rejectWd(w)}>Tolak</button></div>}</td></tr>))}</tbody></table>}
          <p className="hint" style={{ marginTop: 12 }}>Transfer dilakukan manual oleh admin ke rekening tujuan, lalu klik Setujui untuk mencatatnya. Tolak mengembalikan saldo ke penjual.</p>
        </div>}

        {tab === "Promosi" && <div className="stack">
          <div className="card tablewrap">
            <h3>Konten promosi dari penjual</h3>
            {db.promos.length === 0 ? <div className="empty">Belum ada konten yang dikirim.</div> : <table>
              <thead><tr><th>Tanggal</th><th>Penjual</th><th>Platform</th><th>Link</th><th>Status</th><th></th></tr></thead>
              <tbody>{db.promos.map((p) => (
                <tr key={p.id}><td>{fullDate(p.createdAt)}</td><td>{nameOf(p.userId)}</td><td>{p.platform}</td>
                  <td style={{ maxWidth: 240, overflowWrap: "anywhere" }}><a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--blue-d)", textDecoration: "underline" }}>{p.url}</a></td>
                  <td><span className={"badge " + PST[p.status]}>{p.status}</span>{p.status === "approved" && <div className="small"><b>{rupiah(p.reward)}</b></div>}{p.note && <div className="small muted">{p.note}</div>}</td>
                  <td>{p.status === "pending" && <div className="row"><button className="btn btn-primary btn-sm" onClick={() => approvePromo(p)}>Setujui</button><button className="btn btn-danger btn-sm" onClick={() => rejectPromo(p)}>Tolak</button></div>}</td></tr>))}</tbody></table>}
          </div>
          <form className="card stack" style={{ maxWidth: 520 }} onSubmit={doAdjust}>
            <h3>Tambah atau kurangi saldo manual</h3>
            <select className="input" aria-label="Pengguna" value={adj.user} onChange={(e) => setAdj({ ...adj, user: e.target.value })}><option value="">Pilih pengguna</option>{sellers.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}</select>
            <input className="input" type="number" step="1000" placeholder="Nominal (Rp), negatif untuk mengurangi" aria-label="Nominal" value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} />
            <input className="input" placeholder="Catatan (mis. Komisi Pro manual)" aria-label="Catatan" value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} />
            <button className="btn btn-primary">Simpan penyesuaian</button>
            <p className="hint">Dipakai, misalnya, untuk komisi referral dari paket Pro yang kamu aktifkan manual.</p>
          </form>
        </div>}

        {tab === "Pengaturan" && <div className="card stack" style={{ maxWidth: 480 }}>
          <h3>Paket dan promosi</h3>
          <div className="field"><label htmlFor="pr">Harga paket Pro per 30 hari (Rp)</label><input id="pr" className="input" type="number" min="1000" step="1000" value={cfg.price} onChange={(e) => setCfg({ ...cfg, price: e.target.value })} /></div>
          <div className="field"><label htmlFor="lm">Batas produk paket Free</label><input id="lm" className="input" type="number" min="1" step="1" value={cfg.limit} onChange={(e) => setCfg({ ...cfg, limit: e.target.value })} /></div>
          <div className="field"><label htmlFor="rf">Komisi referral dari pembayaran Pro (%)</label><input id="rf" className="input" type="number" min="0" max="100" step="1" value={cfg.ref} onChange={(e) => setCfg({ ...cfg, ref: e.target.value })} /></div>
          <div className="field"><label htmlFor="mw">Penarikan saldo minimal (Rp)</label><input id="mw" className="input" type="number" min="1000" step="1000" value={cfg.min} onChange={(e) => setCfg({ ...cfg, min: e.target.value })} /></div>
          <p className="hint">Perubahan berlaku untuk transaksi berikutnya.</p>
          <button className="btn btn-primary" onClick={saveCfg}>Simpan pengaturan</button>
        </div>}
      </div>
    </div>
  );
}
