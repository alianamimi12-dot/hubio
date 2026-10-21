"use client";
import { useState } from "react";
import DashShell from "@/components/DashShell";
import { THEMES, RESERVED, uid, sb, uploadImage } from "@/lib/db";

function Form({ s }) {
  const { store, user, reload } = s;
  const [f, setF] = useState({ ...store, socials: { instagram: "", tiktok: "", whatsapp: "", ...store.socials } });
  const [msg, setMsg] = useState(null);
  const [nl, setNl] = useState({ title: "", url: "" });
  const [hex, setHex] = useState(store.color || "#2B9BE6");
  const [avatar, setAvatar] = useState(null);
  const [busy, setBusy] = useState(false);
  const color = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : null;

  const save = async (e) => {
    e.preventDefault();
    const un = f.username.trim().toLowerCase();
    if (un.length < 3) return setMsg({ bad: "Username minimal 3 karakter." });
    if (RESERVED.includes(un)) return setMsg({ bad: "Username tidak tersedia." });
    if (!color) return setMsg({ bad: "Kode warna harus 6 digit heksadesimal, contoh #399292." });
    setBusy(true); setMsg(null);
    try {
      let avatarUrl = f.avatarUrl || null;
      if (avatar) avatarUrl = await uploadImage(avatar, user.id, "avatar");
      const { error } = await sb().from("stores").update({ username: un, name: f.name.trim(), bio: f.bio, color, avatar_url: avatarUrl, socials: f.socials, links: f.links || [] }).eq("user_id", store.userId);
      if (error) throw error;
      setF({ ...f, avatarUrl: avatarUrl || "" }); setAvatar(null);
      setMsg({ ok: "Perubahan tersimpan." });
      reload();
    } catch (er) {
      setMsg({ bad: er.code === "23505" ? "Username sudah dipakai." : er.code === "23514" ? "Username hanya boleh huruf kecil, angka, titik, dan garis bawah (3-30 karakter)." : er.message });
    }
    setBusy(false);
  };
  const addLink = () => {
    if (!nl.title || !nl.url) return;
    setF({ ...f, links: [...(f.links || []), { id: uid("l"), ...nl }] }); setNl({ title: "", url: "" });
  };
  const shown = avatar ? URL.createObjectURL(avatar) : f.avatarUrl;

  return (
    <form className="stack" onSubmit={save}>
      <div className="card">
        <h3>Profil toko</h3>
        <div className="field"><label htmlFor="sa">Foto profil toko</label>
          <div className="row">
            {shown ? /* eslint-disable-next-line @next/next/no-img-element */ <img className="avprev" src={shown} alt="Foto profil" /> : <div className="avprev" style={{ display: "grid", placeItems: "center", font: "700 30px var(--fd)", color: "#fff", background: color || "#2B9BE6" }}>{(f.name || "?").charAt(0).toUpperCase()}</div>}
            <div style={{ flex: 1 }}>
              <input id="sa" className="input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setAvatar(e.target.files?.[0] || null)} />
              {f.avatarUrl && !avatar && <button type="button" className="btn btn-danger btn-sm" style={{ marginTop: 8 }} onClick={() => setF({ ...f, avatarUrl: "" })}>Hapus foto</button>}
            </div>
          </div>
          <div className="hint">JPG, PNG, WEBP, atau GIF, maksimal 5 MB. Sebaiknya persegi.</div>
        </div>
        <div className="field"><label htmlFor="sn">Nama toko</label><input id="sn" className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="field"><label htmlFor="su">Username</label><input id="su" className="input" required value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "") })} /><div className="hint">Link toko: /{f.username}</div></div>
        <div className="field"><label htmlFor="sb">Deskripsi</label><textarea id="sb" className="input" value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></div>
        <div className="field"><label htmlFor="sc">Warna toko</label>
          <div className="colorrow">
            <input type="color" aria-label="Pilih warna dari palet" value={color || "#2B9BE6"} onChange={(e) => setHex(e.target.value)} />
            <input id="sc" className="input" style={{ maxWidth: 150 }} placeholder="#399292" maxLength={7} value={hex} onChange={(e) => { let v = e.target.value.trim(); if (v && v[0] !== "#") v = "#" + v; setHex(v); }} />
            <span className="small" style={{ color: color ? "var(--ok)" : "var(--bad)" }}>{color ? "Kode warna valid" : "Format: # lalu 6 huruf/angka, mis. #399292"}</span>
          </div>
          <div className="chips" style={{ marginTop: 10 }}>{Object.entries(THEMES).map(([n, c]) => (
            <button type="button" key={n} className={"chip" + (color && color.toLowerCase() === c.toLowerCase() ? " on" : "")} onClick={() => setHex(c)}><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 9, background: c, marginRight: 6, verticalAlign: "-1px" }} />{n}</button>
          ))}</div>
          <div className="hint">Warna dipakai untuk tombol beli dan sorotan di halaman tokomu.</div>
        </div>
      </div>
      <div className="card">
        <h3>Media sosial</h3>
        {["instagram", "tiktok", "whatsapp"].map((k) => (
          <div className="field" key={k}><label htmlFor={"so" + k} style={{ textTransform: "capitalize" }}>{k}</label><input id={"so" + k} className="input" type="url" placeholder="https://" value={f.socials[k]} onChange={(e) => setF({ ...f, socials: { ...f.socials, [k]: e.target.value } })} /></div>
        ))}
      </div>
      <div className="card">
        <h3>Tautan tambahan</h3>
        {(f.links || []).map((l) => <div className="listrow" key={l.id}><div><b>{l.title}</b><div className="small muted">{l.url}</div></div><button type="button" className="btn btn-danger btn-sm" onClick={() => setF({ ...f, links: f.links.filter((x) => x.id !== l.id) })}>Hapus</button></div>)}
        <div className="grid2" style={{ marginTop: 12 }}>
          <input className="input" placeholder="Judul tautan" aria-label="Judul tautan" value={nl.title} onChange={(e) => setNl({ ...nl, title: e.target.value })} />
          <input className="input" type="url" placeholder="https://" aria-label="URL tautan" value={nl.url} onChange={(e) => setNl({ ...nl, url: e.target.value })} />
        </div>
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={addLink}>Tambah tautan</button>
      </div>
      {msg?.bad && <div className="err" role="alert">{msg.bad}</div>}
      {msg?.ok && <div className="okmsg" role="status">{msg.ok}</div>}
      <button className="btn btn-primary" disabled={busy}>{busy ? "Menyimpan…" : "Simpan perubahan"}</button>
    </form>
  );
}

export default function Toko() {
  return <DashShell title="Toko" subtitle="Atur tampilan dan informasi tokomu.">{(s) => <Form s={s} />}</DashShell>;
}
