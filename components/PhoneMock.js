// Tiruan tampilan toko Hubio di HP. Dipakai di landing page untuk memperlihatkan 3 ukuran tampilan produk.
function Head() {
  return (<><div className="ph-av">R</div><div className="ph-nm">Rara Kreatif</div><div className="ph-bio">Template dan panduan untuk kreator pemula</div></>);
}
export default function PhoneMock({ variant = "large", className = "" }) {
  return (
    <div className={"ph " + className} aria-hidden="true">
      <Head />
      {variant === "large" && <>
        <div className="it"><div className="cvr"><em>-30%</em></div><b>Template Konten 30 Hari</b><div className="pr">Rp49.000<s>Rp70.000</s></div></div>
        <div className="it"><div className="cvr b" /><b>E-book Mulai Jualan Online</b><div className="pr">Rp79.000</div></div>
      </>}
      {variant === "small" && <>
        <div className="g2">
          <div className="it"><div className="cvr"><em>-30%</em></div><b>Template Konten</b><div className="pr">Rp49rb</div></div>
          <div className="it"><div className="cvr b" /><b>E-book Jualan</b><div className="pr">Rp79rb</div></div>
          <div className="it"><div className="cvr c" /><b>Kelas Foto HP</b><div className="pr">Rp149rb</div></div>
          <div className="it"><div className="cvr d" /><b>Preset Warna</b><div className="pr">Rp35rb</div></div>
        </div>
      </>}
      {variant === "tiny" && <>
        {[["Template Konten 30 Hari", "Rp49.000"], ["E-book Jualan Online", "Rp79.000"], ["Kelas Foto Produk", "Rp149.000"], ["Preset Warna", "Rp35.000"], ["Konsultasi 1 Jam", "Rp99.000"]].map(([n, p]) => <div className="tb" key={n}><span>{n}</span><span>{p}</span></div>)}
      </>}
      {variant === "hero" && <>
        <div className="it"><div className="cvr"><em>-30%</em></div><b>Template Konten 30 Hari</b><div className="pr">Rp49.000<s>Rp70.000</s></div><span className="go">Beli sekarang</span></div>
        <div className="tb"><span>E-book Jualan Online</span><span>Rp79.000</span></div>
        <div className="tb"><span>Kelas Foto Produk</span><span>Rp149.000</span></div>
      </>}
    </div>
  );
}
