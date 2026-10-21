"use client";
import { useState } from "react";
import DashShell from "@/components/DashShell";
import RichEditor from "@/components/RichEditor";
import { rupiah, sb, PRODUCT_TYPES, DISPLAYS, uploadImage, uploadPdf, effectivePrice, uid } from "@/lib/db";

const BLANK = { name: "", type: "E-book", description: "", display: "large", price: "", discountPrice: "", active: true, coverUrl: "", landingUrl: "", deliveryKind: "link", deliveryValue: "", addons: [] };
const NOFILES = { cover: null, landing: null, pdf: null };

function View({ s }) {
  const { db, user, store, reload } = s;
  const [form, setForm] = useState(null);
  const [ek, setEk] = useState(0); // kunci editor: dimuat ulang saat berganti produk
  const [files, setFiles] = useState(NOFILES);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const limit = user.plan === "pro" ? Infinity : db.settings.freeProductLimit;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const prev = (file, url) => (file ? URL.createObjectURL(file) : url);
  const setAddon = (i, k, v) => setForm((f) => ({ ...f, addons: f.addons.map((a, x) => (x === i ? { ...a, [k]: v } : a)) }));
  const addAddon = () => setForm((f) => ({ ...f, addons: [...f.addons, { key: uid("a"), name: "", description: "", price: "", link: "" }] }));
  const delAddon = (i) => setForm((f) => ({ ...f, addons: f.addons.filter((_, x) => x !== i) }));
  const link = (p) => `${window.location.origin}/${store.username}/${p.id}`;

  const save = async (e) => {
    e.preventDefault();
    const price = Number(form.price);
    const disc = form.discountPrice === "" ? null : Number(form.discountPrice);
    if (!(price >= 1000)) return setErr("Harga normal minimal Rp1.000.");
    if (disc !== null && !(disc >= 1000 && disc < price)) return setErr("Harga diskon harus lebih kecil dari harga normal (minimal Rp1.000).");
    for (const a of form.addons) {
      if (!a.name.trim()) continue;
      if (!(Number(a.price) >= 0)) return setErr(`Harga add-on "${a.name}" tidak valid.`);
      if (a.link.trim() && !/^https:\/\/\S+$/i.test(a.link.trim())) return setErr(`Tautan add-on "${a.name}" harus diawali https://`);
    }
    setErr(""); setBusy(true);
    try {
      const c = sb();
      let coverUrl = form.coverUrl, landingUrl = form.landingUrl, value = form.deliveryValue.trim();
      if (files.cover) coverUrl = await uploadImage(files.cover, user.id, "cover");
      if (files.landing) landingUrl = await uploadImage(files.landing, user.id, "landing");
      if (form.deliveryKind === "pdf") {
        if (files.pdf) value = await uploadPdf(files.pdf, user.id);
        else if (/^https?:/i.test(value) || !value) throw new Error("Unggah file PDF produk.");
      } else if (!/^https?:\/\/\S+$/i.test(value)) throw new Error("Tautan produk harus diawali https://");

      const row = { name: form.name.trim(), type: form.type, description: form.description, html_code: "", display: form.display, price, discount_price: disc, active: form.active, cover_url: coverUrl || null, landing_url: landingUrl || null };
      let pid = form.id;
      if (pid) { const { error } = await c.from("products").update(row).eq("id", pid); if (error) throw error; }
      else { const { data, error } = await c.from("products").insert({ ...row, seller_id: user.id }).select("id").single(); if (error) throw error; pid = data.id; }
      const { error: fe } = await c.from("product_files").upsert({ product_id: pid, kind: form.deliveryKind, value });
      if (fe) throw fe;

      // Add-on: ganti seluruh daftar add-on produk ini
      const { error: de } = await c.from("product_addons").delete().eq("product_id", pid);
      if (de) throw de;
      const rows = form.addons.filter((a) => a.name.trim()).map((a, i) => ({ product_id: pid, seller_id: user.id, name: a.name.trim(), description: a.description || "", price: Math.round(Number(a.price) || 0), link: a.link.trim() || null, sort: i }));
      if (rows.length) { const { error: ae } = await c.from("product_addons").insert(rows); if (ae) throw ae; }

      setForm(null); setFiles(NOFILES); await reload();
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
  const copy = (p) => { navigator.clipboard?.writeText(link(p)); setCopied(p.id); setTimeout(() => setCopied(""), 1800); };
  const startNew = () => { setErr(""); setFiles(NOFILES); setEk((k) => k + 1); setForm({ ...BLANK }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const startEdit = (p) => {
    setErr(""); setFiles(NOFILES); setEk((k) => k + 1);
    setForm({ ...p, price: String(p.price), discountPrice: p.discountPrice ? String(p.discountPrice) : "", description: p.description + (p.htmlCode ? "\n" + p.htmlCode : ""), addons: (p.addons || []).map((a) => ({ key: a.id, name: a.name, description: a.description, price: String(a.price), link: a.link })) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
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
          <div className="hint">JPG, PNG, WEBP, atau GIF, maksimal 5 MB. Cover tampil di daftar produk, foto landing page tampil di halaman detail.</div>

          <div className="field"><label>Deskripsi produk</label>
            <RichEditor key={ek} value={form.description} onChange={(h) => set("description", h)} userId={user.id} />
            <div className="hint">Atur ukuran font, tebal, miring, dan sisipkan gambar. Atau klik <b>Kode HTML</b> untuk menempel kode sendiri. Kode dibersihkan otomatis: script, form, dan gaya inline dihapus, embed YouTube/Vimeo diperbolehkan.</div></div>

          <div className="field"><label>Add-on (opsional)</label>
            <div className="hint" style={{ marginTop: 0, marginBottom: 8 }}>Tambahan yang bisa dipilih pembeli sebelum membeli. Tampil di halaman produk setelah deskripsi. Tautan add-on dikirim ke pembeli setelah pembayaran dikonfirmasi.</div>
            {form.addons.map((a, i) => (
              <div className="addrow" key={a.key}>
                <div className="grid2">
                  <input className="input" placeholder="Nama add-on (mis. Bonus template)" aria-label="Nama add-on" value={a.name} onChange={(e) => setAddon(i, "name", e.target.value)} />
                  <input className="input" type="number" min="0" step="500" placeholder="Harga (Rp), 0 = gratis" aria-label="Harga add-on" value={a.price} onChange={(e) => setAddon(i, "price", e.target.value)} />
                </div>
                <input className="input" style={{ marginTop: 10 }} placeholder="Deskripsi singkat (opsional)" aria-label="Deskripsi add-on" value={a.description} onChange={(e) => setAddon(i, "description", e.target.value)} />
                <input className="input" style={{ marginTop: 10 }} placeholder="Tautan add-on https:// (opsional)" aria-label="Tautan add-on" value={a.link} onChange={(e) => setAddon(i, "link", e.target.value)} />
                <button type="button" className="btn btn-danger btn-sm" style={{ marginTop: 10 }} onClick={() => delAddon(i)}>Hapus add-on</button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={addAddon}>Tambah add-on</button></div>

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
                <div className="small muted">{p.type} · {rupiah(effectivePrice(p))}{p.discountPrice ? ` (normal ${rupiah(p.price)})` : ""} · {DISPLAYS.find((d) => d[0] === p.display)?.[1]} · {p.deliveryKind === "pdf" ? "PDF" : "Link"}{p.addons?.length ? ` · ${p.addons.length} add-on` : ""}</div></div>
            </div>
            <div className="row wrap">
              <button className="btn btn-primary btn-sm" onClick={() => copy(p)}>{copied === p.id ? "Link tersalin" : "Salin link checkout"}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => startEdit(p)}>Ubah</button>
              <button className="btn btn-ghost btn-sm" onClick={() => toggle(p)}>{p.active ? "Sembunyikan" : "Tampilkan"}</button>
              <button className="btn btn-danger btn-sm" onClick={() => remove(p)}>Hapus</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default function Produk() { return <DashShell title="Produk" subtitle="Atur produk, harga, add-on, dan cara pengirimannya.">{(s) => <View s={s} />}</DashShell>; }
