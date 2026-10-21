"use client";
import { useEffect, useRef, useState } from "react";
import { descToHtml } from "@/lib/sanitize";
import { uploadImage } from "@/lib/db";
import RichText from "./RichText";

const SIZES = [["2", "Kecil"], ["3", "Normal"], ["5", "Besar"], ["6", "Sangat besar"]];

// Editor deskripsi: ukuran font, tebal, miring, daftar, unggah gambar, atau mode kode HTML.
export default function RichEditor({ value, onChange, userId }) {
  const ref = useRef(null);
  const fileRef = useRef(null);
  const saved = useRef(null);
  const [mode, setMode] = useState("visual");
  const [code, setCode] = useState(value || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Isi editor saat pertama dan setiap kali kembali dari mode kode
  useEffect(() => {
    if (mode === "visual" && ref.current) ref.current.innerHTML = descToHtml(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const sync = () => {
    if (!ref.current) return;
    const h = ref.current.innerHTML;
    setCode(h); onChange(h);
  };
  const exec = (cmd, arg) => {
    if (!ref.current) return;
    ref.current.focus();
    document.execCommand(cmd, false, arg);
    sync();
  };
  const keep = (e) => e.preventDefault(); // jaga agar teks yang dipilih tidak hilang saat menekan tombol

  const pickImage = () => {
    const sel = window.getSelection();
    saved.current = sel && sel.rangeCount && ref.current && ref.current.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null;
    fileRef.current?.click();
  };
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true); setErr("");
    try {
      const url = await uploadImage(file, userId, "desc");
      ref.current.focus();
      if (saved.current) { const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(saved.current); }
      document.execCommand("insertImage", false, url);
      sync();
    } catch (e2) { setErr(e2.message); }
    setBusy(false);
  };

  return (
    <div className="rte">
      <div className="rte-bar" role="toolbar" aria-label="Format teks">
        {mode === "visual" && (
          <>
            {SIZES.map(([v, l]) => (
              <button type="button" key={v} className="rte-b" onMouseDown={keep} onClick={() => exec("fontSize", v)} title={"Ukuran font: " + l}>
                <span style={{ fontSize: 9 + Number(v) * 1.6 }}>A</span><small>{l}</small>
              </button>
            ))}
            <button type="button" className="rte-b" onMouseDown={keep} onClick={() => exec("bold")} aria-label="Tebal"><b>B</b></button>
            <button type="button" className="rte-b" onMouseDown={keep} onClick={() => exec("italic")} aria-label="Miring"><i>I</i></button>
            <button type="button" className="rte-b" onMouseDown={keep} onClick={() => exec("insertUnorderedList")}>• Daftar</button>
            <button type="button" className="rte-b" onClick={pickImage} disabled={busy}>{busy ? "Mengunggah…" : "Gambar"}</button>
          </>
        )}
        <button type="button" className={"rte-b" + (mode === "html" ? " on" : "")} onClick={() => setMode(mode === "visual" ? "html" : "visual")}>
          {mode === "visual" ? "</> Kode HTML" : "Kembali ke editor"}
        </button>
      </div>

      {mode === "visual" ? (
        <div ref={ref} className="rte-area rich" contentEditable suppressContentEditableWarning onInput={sync} onBlur={sync} role="textbox" aria-multiline="true" aria-label="Deskripsi produk" />
      ) : (
        <textarea className="input rte-code" spellCheck={false} value={code} onChange={(e) => { setCode(e.target.value); onChange(e.target.value); }} placeholder="<h3>Isi paket</h3><ul><li>Poin 1</li></ul>" />
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={onFile} />
      {err && <div className="err" role="alert" style={{ margin: 8 }}>{err}</div>}
      {mode === "html" && code.trim() && (
        <div className="rte-prev"><div className="small muted" style={{ marginBottom: 6 }}>Pratinjau (setelah dibersihkan otomatis)</div><RichText html={code} /></div>
      )}
    </div>
  );
}
