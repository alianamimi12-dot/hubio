"use client";
import { useState } from "react";
import DashShell from "@/components/DashShell";
import { sb, uid, uploadImage } from "@/lib/db";

function Form({ s }) {
  const { store, user, reload } = s;
  const pay = store.payment || {};
  const [banks, setBanks] = useState(pay.banks || []);
  const [qris, setQris] = useState(pay.qris || "");
  const [note, setNote] = useState(pay.note || "");
  const [file, setFile] = useState(null);
  const [nb, setNb] = useState({ bank: "", account: "", holder: "" });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const add = () => {
    if (!nb.bank.trim() || !/^[0-9]{5,20}$/.test(nb.account) || !nb.holder.trim()) return setMsg({ bad: "Isi bank atau e-wallet, nomor (5-20 digit angka), dan nama pemilik." });
    setBanks([...banks, { id: uid("b"), bank: nb.bank.trim(), account: nb.account, holder: nb.holder.trim() }]); setNb({ bank: "", account: "", holder: "" }); setMsg(null);
  };
  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      let q = qris;
      if (file) q = await uploadImage(file, user.id, "qris");
      if (!banks.length && !q) throw new Error("Tambahkan minimal satu rekening atau gambar QRIS.");
      const { error } = await sb().from("stores").update({ payment: { banks, qris: q || null, note } }).eq("user_id", store.userId);
      if (error) throw error;
      setQris(q); setFile(null); setMsg({ ok: "Pengaturan pembayaran tersimpan." }); reload();
    } catch (e2) { setMsg({ bad: e2.message }); }
    setBusy(false);
  };

  return (
    <form className="stack" onSubmit={save}>
      <div className="warn">Pembayaran pembeli masuk <b>langsung ke rekening dan QRIS-mu</b>. Hubio tidak menyimpan atau memegang uangmu. Pastikan nomor dan nama pemilik benar, karena akan tampil ke pembeli saat membayar.</div>
      <div className="card">
        <h3>Rekening bank atau e-wallet</h3>
        {banks.map((b) => <div className="listrow" key={b.id}><div><b>{b.bank}</b> {b.account}<div className="small muted">a.n. {b.holder}</div></div><button type="button" className="btn btn-danger btn-sm" onClick={() => setBanks(banks.filter((x) => x.id !== b.id))}>Hapus</button></div>)}
        {banks.length === 0 && <div className="empty">Belum ada rekening.</div>}
        <div className="grid2" style={{ marginTop: 12 }}>
          <input className="input" placeholder="Bank / e-wallet (BCA, DANA...)" aria-label="Bank" value={nb.bank} onChange={(e) => setNb({ ...nb, bank: e.target.value })} />
          <input className="input" inputMode="numeric" placeholder="Nomor rekening" aria-label="Nomor rekening" value={nb.account} onChange={(e) => setNb({ ...nb, account: e.target.value.replace(/\D/g, "") })} />
        </div>
        <input className="input" style={{ marginTop: 10 }} placeholder="Nama pemilik rekening" aria-label="Nama pemilik" value={nb.holder} onChange={(e) => setNb({ ...nb, holder: e.target.value })} />
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={add}>Tambah rekening</button>
      </div>
      <div className="card">
        <h3>QRIS</h3>
        <input className="input" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Gambar QRIS" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <div className="hint">Unggah gambar QRIS tokomu (JPG/PNG, maks 5 MB). Pembeli scan lalu mengisi nominal sesuai yang tertera.</div>
        {(file || qris) && /* eslint-disable-next-line @next/next/no-img-element */ <img className="qris" src={file ? URL.createObjectURL(file) : qris} alt="Pratinjau QRIS" />}
        {qris && !file && <button type="button" className="btn btn-danger btn-sm" style={{ marginTop: 10 }} onClick={() => setQris("")}>Hapus QRIS</button>}
      </div>
      <div className="card">
        <h3>Catatan untuk pembeli (opsional)</h3>
        <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mis. Konfirmasi maksimal 1x24 jam di jam kerja." />
      </div>
      <div className="okmsg">Setiap pesanan otomatis diberi <b>kode unik 1 sampai 999</b> pada nominal (mis. Rp49.000 menjadi Rp49.127). Dua pembeli yang belum bayar tidak akan pernah mendapat nominal yang sama, jadi mutasi di bank mudah dicocokkan.</div>
      {msg?.bad && <div className="err" role="alert">{msg.bad}</div>}
      {msg?.ok && <div className="okmsg" role="status">{msg.ok}</div>}
      <button className="btn btn-primary" disabled={busy}>{busy ? "Menyimpan…" : "Simpan pengaturan pembayaran"}</button>
    </form>
  );
}
export default function Pembayaran() { return <DashShell title="Pembayaran" subtitle="Rekening dan QRIS tempat pembeli membayar.">{(s) => <Form s={s} />}</DashShell>; }
