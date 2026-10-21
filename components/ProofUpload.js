"use client";
import { useState } from "react";

// Kecilkan foto di browser (maks 1600px, JPEG) supaya cepat terunggah dan di bawah batas ukuran server.
async function compress(file) {
  if (!/^image\//.test(file.type)) throw new Error("Pilih file gambar (JPG, PNG, atau WEBP).");
  let bmp;
  try { bmp = await createImageBitmap(file); } catch { throw new Error("Foto tidak bisa dibaca. Coba screenshot bukti pembayarannya lalu unggah."); }
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.82));
  if (!blob) throw new Error("Gagal memproses foto.");
  return blob;
}

export default function ProofUpload({ id, token, sent, onDone }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [again, setAgain] = useState(false);

  const submit = async () => {
    if (!file) return setErr("Pilih foto bukti pembayaran terlebih dahulu.");
    setBusy(true); setErr("");
    try {
      const blob = await compress(file);
      const fd = new FormData();
      fd.append("file", blob, "bukti.jpg");
      const r = await fetch(`/api/orders/${id}/proof?token=${token}`, { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Gagal mengunggah bukti.");
      setFile(null); setAgain(false);
      await onDone();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  if (sent && !again) {
    return (
      <div className="stack">
        <div className="okmsg" role="status">Bukti pembayaran sudah dikirim. Penjual akan mengecek, dan halaman ini otomatis berubah setelah dikonfirmasi.</div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAgain(true)}>Ganti bukti pembayaran</button>
      </div>
    );
  }
  return (
    <div className="stack">
      <div className="warn"><b>Setelah transfer, unggah bukti pembayaran</b> (screenshot atau foto struk) agar penjual bisa mengonfirmasi lebih cepat.</div>
      <input className="input" type="file" accept="image/*" aria-label="Foto bukti pembayaran" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      {err && <div className="err" role="alert">{err}</div>}
      <button className="btn btn-primary btn-block" onClick={submit} disabled={busy}>{busy ? "Mengunggah…" : "Kirim bukti pembayaran"}</button>
    </div>
  );
}
