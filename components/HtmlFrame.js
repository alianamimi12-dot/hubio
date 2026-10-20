// Menampilkan kode HTML buatan penjual dengan AMAN: di dalam iframe ber-sandbox, tanpa JavaScript,
// tanpa akses ke cookie/akun Hubio. Gaya (CSS), gambar, dan embed (mis. YouTube) tetap bisa tampil.
export default function HtmlFrame({ code, height = 420 }) {
  if (!code?.trim()) return null;
  const doc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank"><style>body{font-family:Arial,sans-serif;margin:12px;color:#0B2540;line-height:1.5}img{max-width:100%;height:auto}</style></head><body>${code}</body></html>`;
  return <iframe className="htmlframe" title="Informasi produk" sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" loading="lazy" srcDoc={doc} style={{ height }} />;
}
