"use client";
import { useState } from "react";
import DashShell from "@/components/DashShell";
import HtmlFrame from "@/components/HtmlFrame";
import { rupiah, sb, PRODUCT_TYPES, DISPLAYS, uploadImage, uploadPdf, effectivePrice } from "@/lib/db";

const BLANK = { name: "", type: "E-book", description: "", htmlCode: "", display: "large", price: "", discountPrice: "", active: true, coverUrl: "", landingUrl: "", deliveryKind: "link", deliveryValue: "" };

function View({ s }) {
  const { db, user, reload } = s;
  const [form, setForm] = useState(null);
  const [files, setFiles] = useState({ cover: null, landing: null, pdf: null });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const limit = user.plan === "pro" ? Infinity : db.settings.freeProductLimit;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const prev = (file, url) => (file ? URL.createObjectURL(file) : url);

  const save = async (e) => {
    e.preventDefault();
    const price = Number(form.price);
    const disc = form.discountPrice === "" ? null : Number(form.discountPrice);
    if (!(price >= 1000)) return setErr("Harga normal minimal Rp1.000.");
    if (disc !== null && !(disc >= 1000 && disc < price)) return setErr("Harga diskon harus lebih kecil dari harga normal (minimal Rp1.000).");
    setErr(""); setBusy(true);
    try {
      const c = sb();
      let coverUrl = form.coverUrl, landingUrl = form.landingUrl, value = form.deliveryValue.trim();
      if (files.cover) coverUrl = await uploadImage(files.cover, user.id, "cover");
      if (files.landing) landingUrl = await uploadImage(files.landing, user.id, "landing");
      if (form.deliveryKind === "pdf") {
        if (files.pdf) value = await uploadPdf(files.pdf, user.id);
        else if (/^https?:/i.test(value) || !value) throw new Error("Unggah file PDF produk.");
      } else {
        if (!/^https?:\/\/\S+$/i.test(value)) throw new Error("Tautan produk harus diawali https://");
      }
      const row = { name: form.name.trim(), type: form.type, description: form.description, html_code: form.htmlCode, display: form.display, price, discount_price: disc, active: form.active, cover_url: coverUrl || null, landing_url: landingUrl || null };
      let pid = form.id;
      if (pid) { const { error } = await c.from("products").update(row).eq("id", pid); if (error) throw error; }
      else { const { data, error } = await c.from("products").insert({ ...row, seller_id: user.id }).select("id").single(); if (error) throw error; pid = data.id; }
      const { error: fe } = await c.from("product_files").upsert({ product_id: pid, kind: form.deliveryKind, value });
      if (fe) throw fe;
      setForm(null); setFiles({ cover: null, landing: null, pdf: null }); await reload();
    } catch (e2) { setErr(e2.message || "Gagal menyimpan."); }
    setBusy(false);
  };

  const toggle = async (p) => { await sb().from("products").update({ active: !p.active }).eq("id", p.id); reload(); };
  const remove = async (p) => {
    if (!confirm("Hapus produk ini?")) return;
    const { error } = await sb().from("products").delete().eq("id", p.id);
    if (error) alert(/foreign key|violates/i.test(error.message) ? "Produk ini sudah pernah dipesan, jadi tidak bisa dihapus. Pilih Sembunyikan saja." : error.message);
    reload();
  };
  const startNew = () => { setErr(""); setFiles({ cover: null, landing: null, pdf: null }); setForm({ ...BLANK }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const full = db.products.length >= limit;

  return (
    <div className="stack">
      <div className="row wrap">
        <button className="btn btn-primary btn-sm" onClick={startNew} disabled={full}>Tambah produk</button>
        {full && <span className="small muted">Paket Free dibatasi {limit} produk. Upgrade ke Pro untuk menambah.</span>}
      </div>

      {form && (
        <form className="card" onSubmit={save}>
          <h3>{form.id ? "Ubah produk" : "Produk baru"}</h3>
          <div className="field"><label htmlFor="pn">Nama produk</label><input id="pn" className="input" required value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="field"><label htmlFor="pt">Jenis</label><select id="pt" className="input" value={form.type} onChange={(e) => set("type", e.target.value)}>{PRODUCT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>

          <div className="grid2">
            <div className="field"><label htmlFor="pp">Harga normal (Rp)</label><input id="pp" className="input" type="number" min="1000" step="500" required value={form.price} onChange={(e) => set("price", e.target.value)} /></div>
            <div className="field"><label htmlFor="pdp">Harga diskon (Rp, opsional)</label><input id="pdp" className="input" type="number" min="1000" step="500" value={form.discountPrice} onChange={(e) => set("discountPrice", e.target.value)} /><div className="hint">Kosongkan jika tidak ada diskon.</div></div>
          </div>

          <div className="field"><label>Ukuran tampilan di toko</label>
            <div className="seg">{DISPLAYS.map(([v, l, d]) => <label key={v} className={form.display === v ? "on" : ""}><input type="radio" name="disp" checked={form.display === v} onChange={() => set("display", v)} />{l}<small>{d}</small></label>)}</div></div>

          <div className="grid2">
            <div className="field"><label htmlFor="pc">Foto cover produk</label><input id="pc" className="input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setFiles({ ...files, cover: e.target.files?.[0] || null })} />
              {(files.cover || form.coverUrl) && /* eslint-disable-next-line @next/next/no-img-element */ <img className="imgprev sq" src={prev(files.cover, form.coverUrl)} alt="Pratinjau cover" />}</div>
            <div className="field"><label htmlFor="pl">Foto landing page</label><input id="pl" className="input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setFiles({ ...files, landing: e.target.files?.[0] || null })} />
              {(files.landing || form.landingUrl) && /* eslint-disable-next-line @next/next/no-img-element */ <img className="imgprev" src={prev(files.landing, form.landingUrl)} alt="Pratinjau landing page" />}</div>
          </div>
          <div className="hint">Gambar JPG, PNG, WEBP, atau GIF, maksimal 5 MB. Cover tampil di daftar produk, foto landing page tampil di halaman detail.</div>

          <div className="field"><label htmlFor="pd">Deskripsi produk</label><textarea id="pd" className="input" value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div className="field"><label htmlFor="ph">Kode HTML (opsional)</label><textarea id="ph" className="input" style={{ fontFamily: "monospace", minHeight: 110 }} placeholder="<h3>Isi kelas</h3><ul><li>...</li></ul>" value={form.htmlCode} onChange={(e) => set("htmlCode", e.target.value)} />
            <div className="hint">Tampil di halaman detail produk. Demi keamanan pembeli, kode dijalankan di area terisolasi: gaya (CSS), gambar, dan embed seperti YouTube bisa tampil, tetapi JavaScript tidak berjalan.</div>
            {form.htmlCode.trim() && <HtmlFrame code={form.htmlCode} height={220} />}</div>

          <div className="field"><label>Cara produk dikirim ke pembeli</label>
            <div className="seg">
              <label className={form.deliveryKind === "link" ? "on" : ""}><input type="radio" name="dk" checked={form.deliveryKind === "link"} onChange={() => setForm({ ...form, deliveryKind: "link", deliveryValue: /^https?:/i.test(form.deliveryValue) ? form.deliveryValue : "" })} />Via link<small>Drive, Notion, kelas, dll</small></label>
              <label className={form.deliveryKind === "pdf" ? "on" : ""}><input type="radio" name="dk" checked={form.deliveryKind === "pdf"} onChange={() => setForm({ ...form, deliveryKind: "pdf", deliveryValue: /^https?:/i.test(form.deliveryValue) ? "" : form.deliveryValue })} />Upload PDF<small>file dikirim ke email</small></label>
            </div></div>
          {form.deliveryKind === "link"
            ? <div className="field"><label htmlFor="pf">Tautan produk</label><input id="pf" className="input" placeholder="https://" value={form.deliveryValue} onChange={(e) => set("deliveryValue", e.target.value)} /></div>
            : <div className="field"><label htmlFor="pu">File PDF</label><input id="pu" className="input" type="file" accept="application/pdf" onChange={(e) => setFiles({ ...files, pdf: e.target.files?.[0] || null })} />
                <div className="hint">{form.deliveryValue && !files.pdf ? "PDF sudah tersimpan. Pilih file baru hanya jika ingin menggantinya. " : ""}Maksimal 50 MB. Disimpan privat. PDF sampai 8 MB juga dilampirkan di email pembeli.</div></div>}

          <label className="checkrow"><input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} /> Tampilkan di toko</label>
          {err && <div className="err" style={{ marginTop: 12 }} role="alert">{err}</div>}
          <div className="row" style={{ marginTop: 16 }}><button className="btn btn-primary" disabled={busy}>{busy ? "Menyimpan…" : "Simpan produk"}</button><button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>Batal</button></div>
        </form>
      )}

      <div className="card">
        {db.products.length === 0 ? <div className="empty">Belum ada produk. Tambahkan produk pertamamu.</div> : db.products.map((p) => (
          <div className="listrow wrap" key={p.id}>
            <div className="row" style={{ flex: 1, minWidth: 200 }}>
              {p.coverUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.coverUrl} alt="" style={{ width: 52, height: 52, borderRadius: 12, objectFit: "cover" }} />}
              <div><b>{p.name}</b> {!p.active && <span className="badge wait">Disembunyikan</span>}
                <div className="small muted">{p.type} · {rupiah(effectivePrice(p))}{p.discountPrice ? ` (normal ${rupiah(p.price)})` : ""} · {DISPLAYS.find((d) => d[0] === p.display)?.[1]} · {p.deliveryKind === "pdf" ? "PDF" : "Link"}</div></div>
            </div>
            <div className="row wrap">
              <button className="btn btn-ghost btn-sm" onClick={() => { setErr(""); setFiles({ cover: null, landing: null, pdf: null }); setForm({ ...p, price: String(p.price), discountPrice: p.discountPrice ? String(p.discountPrice) : "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Ubah</button>
              <button className="btn btn-ghost btn-sm" onClick={() => toggle(p)}>{p.active ? "Sembunyikan" : "Tampilkan"}</button>
              <button className="btn btn-danger btn-sm" onClick={() => remove(p)}>Hapus</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default function Produk() { return <DashShell title="Produk" subtitle="Atur produk, harga, dan cara pengirimannya.">{(s) => <View s={s} />}</DashShell>; }
