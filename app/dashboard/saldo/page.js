"use client";
import { useState } from "react";
import DashShell from "@/components/DashShell";
import { rupiah, fullDate, sb, balanceOf } from "@/lib/db";

const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Facebook", "X (Twitter)", "Threads", "Lainnya"];
const KIND = { referral: "Komisi referral", promo: "Hadiah konten", adjustment: "Penyesuaian admin", withdrawal: "Penarikan", withdrawal_refund: "Penarikan dikembalikan" };
const PST = { pending: ["Menunggu penilaian", "wait"], approved: ["Disetujui", "ok"], rejected: ["Ditolak", "bad"] };
const WST = { diproses: "wait", berhasil: "ok", ditolak: "bad" };

function View({ s }) {
  const { db, user, reload } = s;
  const bal = balanceOf(db);
  const min = db.settings.minWithdraw;
  const processing = db.withdrawals.filter((w) => w.status === "diproses").reduce((a, w) => a + w.amount, 0);
  const paidOut = db.withdrawals.filter((w) => w.status === "berhasil").reduce((a, w) => a + w.amount, 0);
  const earned = db.ledger.filter((l) => l.amount > 0 && l.kind !== "withdrawal_refund").reduce((a, l) => a + l.amount, 0);
  const refLink = `${window.location.origin}/register?ref=${user.refCode}`;

  const [post, setPost] = useState({ platform: "Instagram", url: "" });
  const [acc, setAcc] = useState({ bank: "", account: "", holder: "" });
  const [wd, setWd] = useState({ amount: "", account: db.accounts[0]?.id || "" });
  const [msg, setMsg] = useState({});
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const say = (k, v) => setMsg((m) => ({ ...m, [k]: v }));

  const sendPost = async (e) => {
    e.preventDefault(); say("post", null);
    if (!/^https?:\/\/\S+$/i.test(post.url.trim())) return say("post", { bad: "Tempel link postingan yang diawali https://" });
    setBusy(true);
    const { error } = await sb().from("promo_posts").insert({ user_id: user.id, platform: post.platform, url: post.url.trim() });
    setBusy(false);
    if (error) return say("post", { bad: error.code === "23505" ? "Link ini sudah pernah dikirim." : error.message });
    setPost({ ...post, url: "" }); say("post", { ok: "Terkirim. Admin akan menilai kontenmu." }); reload();
  };

  const addAcc = async (e) => {
    e.preventDefault(); say("acc", null);
    if (!acc.bank.trim() || !/^[0-9]{5,20}$/.test(acc.account) || !acc.holder.trim()) return say("acc", { bad: "Isi bank atau e-wallet, nomor (5-20 digit angka), dan nama pemilik." });
    if (db.accounts.length >= 5) return say("acc", { bad: "Maksimal 5 rekening penarikan." });
    setBusy(true);
    const { error } = await sb().from("withdraw_accounts").insert({ user_id: user.id, bank: acc.bank.trim(), account: acc.account, holder: acc.holder.trim() });
    setBusy(false);
    if (error) return say("acc", { bad: error.message });
    setAcc({ bank: "", account: "", holder: "" }); say("acc", { ok: "Rekening ditambahkan." }); await reload();
  };
  const delAcc = async (id) => { if (!confirm("Hapus rekening ini?")) return; await sb().from("withdraw_accounts").delete().eq("id", id); reload(); };

  const askWd = async (e) => {
    e.preventDefault(); say("wd", null);
    const amount = Number(wd.amount);
    if (!(amount >= min)) return say("wd", { bad: `Penarikan minimal ${rupiah(min)}.` });
    if (amount > bal) return say("wd", { bad: "Saldo tidak mencukupi." });
    if (!wd.account) return say("wd", { bad: "Tambahkan dan pilih rekening penarikan." });
    setBusy(true);
    // Pemeriksaan saldo dan pencatatan dilakukan di database (dikunci), bukan di browser
    const { error } = await sb().rpc("request_withdrawal", { p_amount: amount, p_account: wd.account });
    setBusy(false);
    if (error) return say("wd", { bad: error.message });
    setWd({ ...wd, amount: "" }); say("wd", { ok: "Permintaan penarikan dikirim. Admin Hubio akan memprosesnya." }); reload();
  };

  return (
    <div className="stack">
      <div className="warn">Saldo ini <b>khusus imbalan promosi Hubio di media sosial</b>. Uang penjualan produkmu tidak lewat sini, karena pembeli membayar langsung ke rekening dan QRIS-mu.</div>

      <div className="kpis">
        <div className="kpi hl"><div className="l">Saldo tersedia</div><div className="v">{rupiah(bal)}</div></div>
        <div className="kpi"><div className="l">Total imbalan</div><div className="v">{rupiah(earned)}</div></div>
        <div className="kpi"><div className="l">Sedang diproses</div><div className="v">{rupiah(processing)}</div></div>
        <div className="kpi"><div className="l">Sudah ditarik</div><div className="v">{rupiah(paidOut)}</div></div>
      </div>

      <div className="card">
        <h3>Program Promosi</h3>
        <p className="muted" style={{ marginBottom: 12 }}>Ada dua cara mendapat saldo:</p>
        <p style={{ marginBottom: 6 }}><b>1. Komisi referral {db.settings.referralPct}%.</b> Bagikan link daftarmu di media sosial. Jika orang yang mendaftar lewat linkmu membeli paket Pro, kamu mendapat {db.settings.referralPct}% dari pembayarannya.</p>
        <div className="copybox" style={{ marginBottom: 14 }}>
          <span style={{ flex: 1 }}>{refLink}</span>
          <button className="btn btn-primary btn-sm" onClick={() => { navigator.clipboard?.writeText(refLink); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>{copied ? "Tersalin" : "Salin"}</button>
        </div>
        <p style={{ marginBottom: 8 }}><b>2. Hadiah konten.</b> Buat postingan promosi Hubio di media sosial, lalu kirim link postingannya. Admin menilai dan memberi hadiah jika disetujui.</p>
        <form onSubmit={sendPost}>
          <div className="grid2">
            <select className="input" aria-label="Platform" value={post.platform} onChange={(e) => setPost({ ...post, platform: e.target.value })}>{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select>
            <input className="input" placeholder="Link postingan https://" aria-label="Link postingan" value={post.url} onChange={(e) => setPost({ ...post, url: e.target.value })} />
          </div>
          {msg.post?.bad && <div className="err" style={{ marginTop: 10 }} role="alert">{msg.post.bad}</div>}
          {msg.post?.ok && <div className="okmsg" style={{ marginTop: 10 }} role="status">{msg.post.ok}</div>}
          <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} disabled={busy}>Kirim konten</button>
        </form>
        {db.promos.length > 0 && (
          <div style={{ marginTop: 14 }}>{db.promos.map((p) => (
            <div className="listrow wrap" key={p.id}>
              <div style={{ minWidth: 0 }}><b>{p.platform}</b><div className="small muted" style={{ overflowWrap: "anywhere" }}>{p.url}</div>{p.note && <div className="small">Catatan admin: {p.note}</div>}</div>
              <div className="right"><span className={"badge " + PST[p.status][1]}>{PST[p.status][0]}</span>{p.status === "approved" && <div><b>{rupiah(p.reward)}</b></div>}</div>
            </div>
          ))}</div>
        )}
      </div>

      <div className="card">
        <h3>Rekening penarikan ({db.accounts.length}/5)</h3>
        {db.accounts.map((a) => <div className="listrow" key={a.id}><div><b>{a.bank}</b> {a.account}<div className="small muted">a.n. {a.holder}</div></div><button type="button" className="btn btn-danger btn-sm" onClick={() => delAcc(a.id)}>Hapus</button></div>)}
        {db.accounts.length === 0 && <div className="empty">Belum ada rekening penarikan.</div>}
        <form onSubmit={addAcc} style={{ marginTop: 12 }}>
          <div className="grid2">
            <input className="input" placeholder="Bank / e-wallet (BCA, DANA...)" aria-label="Bank" value={acc.bank} onChange={(e) => setAcc({ ...acc, bank: e.target.value })} />
            <input className="input" inputMode="numeric" placeholder="Nomor rekening" aria-label="Nomor rekening" value={acc.account} onChange={(e) => setAcc({ ...acc, account: e.target.value.replace(/\D/g, "") })} />
          </div>
          <input className="input" style={{ marginTop: 10 }} placeholder="Nama pemilik rekening" aria-label="Nama pemilik" value={acc.holder} onChange={(e) => setAcc({ ...acc, holder: e.target.value })} />
          {msg.acc?.bad && <div className="err" style={{ marginTop: 10 }} role="alert">{msg.acc.bad}</div>}
          {msg.acc?.ok && <div className="okmsg" style={{ marginTop: 10 }} role="status">{msg.acc.ok}</div>}
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} disabled={busy}>Tambah rekening penarikan</button>
        </form>
      </div>

      <div className="card">
        <h3>Tarik saldo</h3>
        <form onSubmit={askWd}>
          <div className="grid2">
            <div className="field"><label htmlFor="wa">Nominal (Rp)</label><input id="wa" className="input" type="number" min={min} step="1000" required value={wd.amount} onChange={(e) => setWd({ ...wd, amount: e.target.value })} /></div>
            <div className="field"><label htmlFor="wr">Ke rekening</label>
              <select id="wr" className="input" value={wd.account} onChange={(e) => setWd({ ...wd, account: e.target.value })}>
                <option value="">{db.accounts.length ? "Pilih rekening" : "Belum ada rekening"}</option>
                {db.accounts.map((a) => <option key={a.id} value={a.id}>{a.bank} {a.account} (a.n. {a.holder})</option>)}
              </select></div>
          </div>
          {msg.wd?.bad && <div className="err" style={{ marginTop: 10 }} role="alert">{msg.wd.bad}</div>}
          {msg.wd?.ok && <div className="okmsg" style={{ marginTop: 10 }} role="status">{msg.wd.ok}</div>}
          <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy}>Ajukan penarikan</button>
          <p className="hint">Penarikan minimal {rupiah(min)}. Dana ditransfer admin Hubio setelah permintaanmu diperiksa. Jika ditolak, saldo dikembalikan.</p>
        </form>
      </div>

      <div className="card tablewrap">
        <h3>Daftar penarikan</h3>
        {db.withdrawals.length === 0 ? <div className="empty">Belum ada penarikan.</div> : (
          <table>
            <thead><tr><th>Tanggal</th><th>Nominal</th><th>Rekening</th><th>Status</th><th>Catatan</th></tr></thead>
            <tbody>{db.withdrawals.map((w) => <tr key={w.id}><td>{fullDate(w.createdAt)}</td><td><b>{rupiah(w.amount)}</b></td><td>{w.bank} {w.account}<div className="small muted">a.n. {w.holder}</div></td><td><span className={"badge " + WST[w.status]}>{w.status}</span></td><td className="small">{w.note || "-"}</td></tr>)}</tbody>
          </table>
        )}
      </div>

      <div className="card tablewrap">
        <h3>Riwayat saldo</h3>
        {db.ledger.length === 0 ? <div className="empty">Belum ada mutasi saldo.</div> : (
          <table>
            <thead><tr><th>Tanggal</th><th>Keterangan</th><th className="right">Jumlah</th></tr></thead>
            <tbody>{db.ledger.map((l) => <tr key={l.id}><td>{fullDate(l.createdAt)}</td><td>{KIND[l.kind]}{l.note ? <div className="small muted">{l.note}</div> : null}</td><td className="right"><b style={{ color: l.amount < 0 ? "var(--bad)" : "var(--ok)" }}>{l.amount < 0 ? "-" : "+"}{rupiah(Math.abs(l.amount))}</b></td></tr>)}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
export default function Saldo() { return <DashShell title="Saldo & Promosi" subtitle="Imbalan promosi Hubio di media sosial dan penarikannya.">{(s) => <View s={s} />}</DashShell>; }
