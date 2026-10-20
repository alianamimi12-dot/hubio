"use client";
import { useState } from "react";
import DashShell from "@/components/DashShell";
import { sb, uid, uploadImage } from "@/lib/db";

const MAX_BANKS = 10, MAX_QRIS = 5;
const toList = (q) => (Array.isArray(q) ? q : q ? [{ id: "q0", label: "QRIS", url: q }] : []);

function Form({ s }) {
  const { store, user, reload } = s;
  const pay = store.payment || {};
  const [banks, setBanks] = useState(pay.banks || []);
  const [qris, setQris] = useState(toList(pay.qris));
  const [note, setNote] = useState(pay.note || "");
  const [nb, setNb] = useState({ bank: "", account: "", holder: "" });
  const [nq, setNq] = useState({ label: "", file: null });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const addBank = () => {
    if (banks.length >= MAX_BANKS) return setMsg({ bad: `Maksimal ${MAX_BANKS} rekening.` });
    if (!nb.bank.trim() || !/^[0-9]{5,20}$/.test(nb.account) || !nb.holder.trim()) return setMsg({ bad: "Isi bank atau e-wallet, nomor (5-20 digit angka), dan nama pemilik." });
    setBanks([...banks, { id: uid("b"), bank: nb.bank.trim(), account: nb.account, holder: nb.holder.trim() }]);
    setNb({ bank: "", account: "", holder: "" }); setMsg(null);
  };

  const addQris = async () => {
    if (qris.length >= MAX_QRIS) return setMsg({ bad: `Maksimal ${MAX_QRIS} QRIS.` });
    if (!nq.file) return setMsg({ bad: "Pilih foto atau gambar QRIS terlebih dahulu." });
    setBusy(true); setMsg(null);
    try {
      const url = await uploadImage(nq.file, user.id, "qris");
      setQris([...qris, { id: uid("q"), label: nq.label.trim() || `QRIS ${qris.length + 1}`, url }]);
      setNq({ label: "", file: null });
      document.getElementById("qfile").value = "";
    } catch (e) { setMsg({ bad: e.message }); }
    setBusy(false);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!banks.length && !qris.length) return setMsg({ bad: "Tambahkan minimal satu rekening atau satu QRIS." });
    setBusy(true); setMsg(null);
    const { error } = await sb().from("stores").update({ payment: { banks, qris, note } }).eq("user_id", store.userId);
    setBusy(false);
    if (error) return setMsg({ bad: error.message });
    setMsg({ ok: "Pengaturan pembayaran tersimpan." }); reload();
  };

  return (
    <form className="stack" onSubmit={save}>
      <div className="warn">Pembayaran pembeli masuk <b>langsung ke rekening dan QRIS-mu</b>. Hubio tidak menyimpan atau memegang uangmu. Pastikan nomor dan nama pemilik benar, karena akan tampil ke pembeli saat membayar.</div>

      <div className="card">
        <h3>Rekening bank atau e-wallet ({banks.length}/{MAX_BANKS})</h3>
        {banks.map((b) => <div className="listrow" key={b.id}><div><b>{b.bank}</b> {b.account}<div className="small muted">a.n. {b.holder}</div></div><button type="button" className="btn btn-danger btn-sm" onClick={() => setBanks(banks.filter((x) => x.id !== b.id))}>Hapus</button></div>)}
        {banks.length === 0 && <div className="empty">Belum ada rekening.</div>}
        <div className="grid2" style={{ marginTop: 12 }}>
          <input className="input" placeholder="Bank / e-wallet (BCA, DANA...)" aria-label="Bank" value={nb.bank} onChange={(e) => setNb({ ...nb, bank: e.target.value })} />
          <input className="input" inputMode="numeric" placeholder="Nomor rekening" aria-label="Nomor rekening" value={nb.account} onChange={(e) => setNb({ ...nb, account: e.target.value.replace(/\D/g, "") })} />
        </div>
        <input className="input" style={{ marginTop: 10 }} placeholder="Nama pemilik rekening" aria-label="Nama pemilik" value={nb.holder} onChange={(e) => setNb({ ...nb, holder: e.target.value })} />
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={addBank}>Tambah rekening</button>
      </div>

      <div className="card">
        <h3>QRIS ({qris.length}/{MAX_QRIS})</h3>
        {qris.map((q) => (
          <div className="listrow" key={q.id}>
            <div className="row">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={q.url} alt={q.label} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 10, border: "1.5px solid var(--line)" }} /><b>{q.label}</b></div>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => setQris(qris.filter((x) => x.id !== q.id))}>Hapus</button>
          </div>
        ))}
        {qris.length === 0 && <div className="empty">Belum ada QRIS.</div>}
        <div className="grid2" style={{ marginTop: 12 }}>
          <input className="input" placeholder="Nama QRIS (mis. QRIS BCA)" aria-label="Nama QRIS" value={nq.label} onChange={(e) => setNq({ ...nq, label: e.target.value })} />
          <input id="qfile" className="input" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Foto QRIS" onChange={(e) => setNq({ ...nq, file: e.target.files?.[0] || null })} />
        </div>
        <div className="hint">Foto atau gambar QRIS (JPG/PNG/WEBP, maks 5 MB). Kamu bisa menambahkan lebih dari satu, mis. QRIS bank dan QRIS e-wallet.</div>
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={addQris} disabled={busy}>{busy ? "Mengunggah…" : "Tambah QRIS"}</button>
      </div>

      <div className="card">
        <h3>Catatan untuk pembeli (opsional)</h3>
        <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mis. Konfirmasi maksimal 1x24 jam di jam kerja." />
      </div>
      <div className="okmsg">Setiap pesanan otomatis diberi <b>kode unik 1 sampai 999</b> pada nominal (mis. Rp49.000 menjadi Rp49.127). Dua pembeli yang belum bayar tidak akan pernah mendapat nominal yang sama, jadi mutasi di bank mudah dicocokkan.</div>
      {msg?.bad && <div className="err" role="alert">{msg.bad}</div>}
      {msg?.ok && <div className="okmsg" role="status">{msg.ok}</div>}
      <button className="btn btn-primary" disabled={busy}>Simpan pengaturan pembayaran</button>
      <p className="hint">Setelah menambah atau menghapus, klik <b>Simpan pengaturan pembayaran</b> agar tersimpan.</p>
    </form>
  );
}
export default function Pembayaran() { return <DashShell title="Pembayaran" subtitle="Rekening dan QRIS tempat pembeli membayar.">{(s) => <Form s={s} />}</DashShell>; }
