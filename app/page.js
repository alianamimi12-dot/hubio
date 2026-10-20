import Link from "next/link";
import Logo from "@/components/Logo";
import LandingNav from "@/components/LandingNav";
import ClaimForm from "@/components/ClaimForm";
import PhoneMock from "@/components/PhoneMock";
import { HOST } from "@/lib/brand";

const ICONS = {
  box: "M4 8l8-4 8 4v8l-8 4-8-4V8zm0 0l8 4m0 0l8-4m-8 4v8",
  cap: "M2 9l10-5 10 5-10 5L2 9zm4 3v5c0 1 3 3 6 3s6-2 6-3v-5",
  tag: "M3 12V4h8l10 10-8 8L3 12zm5-4h.01",
  link: "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  pct: "M19 5L5 19M7 7h.01M17 17h.01",
  wallet: "M3 7h15a3 3 0 013 3v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm0 0l12-3v3M16 14h2",
  mail: "M3 6h18v12H3zM3 7l9 7 9-7",
  arrow: "M5 12h14M13 6l6 6-6 6",
};
function Icon({ n, size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[n]} /></svg>;
}

const FEATS = [
  ["box", "Produk Digital", "E-book, template, worksheet, preset, dan desain. Kirim lewat link atau file PDF."],
  ["cap", "Kelas & E-course", "Bagikan akses kelas lewat link. Pembeli menerimanya langsung di email setelah bayar."],
  ["tag", "Jasa", "Jual layanan seperti desain, konsultasi, atau editing dengan harga yang kamu tentukan."],
  ["link", "Link in Bio", "Satu halaman berisi produk, tautan, dan media sosial untuk semua bio-mu."],
  ["grid", "Tampilan Fleksibel", "Pilih produk tampil kecil (2 kolom), besar (1 kolom), atau sangat kecil seperti tombol."],
  ["pct", "Harga Coret & Diskon", "Pasang harga normal dan harga diskon agar pembeli melihat penghematannya."],
  ["wallet", "Uang Langsung ke Rekeningmu", "Pembeli bayar ke rekening atau QRIS-mu sendiri dengan nominal unik, jadi mudah dicek di mutasi."],
  ["mail", "Email Otomatis", "Setelah kamu konfirmasi dana masuk, produk langsung dikirim ke email pembeli."],
];
const STEPS = [
  ["Daftar & klaim link", "Pilih username, lalu atur nama toko, foto, dan warna."],
  ["Tambah produk", "Pasang foto, deskripsi, harga, dan pilih pengiriman via link atau PDF."],
  ["Bagikan tautan", "Taruh link tokomu di Instagram, TikTok, atau WhatsApp."],
  ["Konfirmasi & terkirim", "Cek dana masuk, klik konfirmasi, produk terkirim ke email pembeli."],
];
const SEGS = [
  ["Kreator Konten", "Ubah audiensmu jadi penghasilan lewat produk digital dari bio-mu.", ["Produk Digital", "Link in Bio"]],
  ["Pengajar & Mentor", "Jual kelas, modul, dan materi belajar dari satu halaman.", ["E-course", "Kelas Online"]],
  ["Desainer & Seniman", "Jual template, preset, dan karya digital dengan tampilan yang rapi.", ["Template", "Preset"]],
  ["Brand & UMKM", "Punya toko online sendiri tanpa perlu membangun website dari awal.", ["Toko Digital", "Jasa"]],
  ["Konsultan & Freelancer", "Tawarkan jasamu dengan harga jelas dan pembayaran langsung.", ["Jasa", "Worksheet"]],
  ["Penulis & Peneliti", "Jual e-book, panduan, dan laporan dalam format PDF.", ["E-book", "PDF"]],
];
const FAQ = [
  ["Apakah uang penjualan masuk ke Hubio?", "Tidak. Pembeli membayar langsung ke rekening bank atau QRIS milikmu. Hubio tidak memegang uangmu dan tidak memotong penjualanmu."],
  ["Bagaimana pembeli menerima produk?", "Setelah pembeli transfer dan kamu mengecek dana masuk, klik Konfirmasi di dashboard. Produk langsung dikirim ke email pembeli, berupa tautan atau file PDF."],
  ["Apa itu kode unik?", "Setiap pesanan mendapat tambahan angka unik di nominal, misalnya Rp49.000 menjadi Rp49.127. Dua pembeli tidak pernah mendapat nominal yang sama, jadi kamu cepat menemukan pembayarannya di mutasi."],
  ["Apakah harus punya website atau domain sendiri?", "Tidak. Kamu cukup daftar dan mendapat link toko sendiri yang bisa langsung dibagikan."],
  ["Berapa biayanya?", "Paket Free gratis dengan batas jumlah produk. Paket Pro membuka produk tanpa batas. Lihat bagian harga di atas."],
];

export default function Home() {
  return (
    <>
      <LandingNav />

      <section className="lp-hero">
        <div className="container">
          <h1>Satu tautan untuk jualan online-mu.</h1>
          <p className="sub">Buat halaman toko mobile dalam hitungan menit. Jual produk digital, kelas, dan jasa, lalu bagikan ke semua media sosialmu.</p>
          <ClaimForm host={HOST} />
          <p className="lp-note">Gratis untuk memulai. Tanpa kartu kredit.</p>
          <div className="lp-stage">
            <PhoneMock variant="large" className="p2" />
            <PhoneMock variant="hero" className="p1" />
            <div className="lp-chip c1"><i><Icon n="box" size={15} /></i>Produk Digital</div>
            <div className="lp-chip c2"><i><Icon n="cap" size={15} /></i>Kelas</div>
            <div className="lp-chip c3"><i><Icon n="tag" size={15} /></i>Jasa</div>
          </div>
        </div>
      </section>

      <div className="container" style={{ marginTop: 28 }}>
        <div className="lp-banner">
          <b>Temukan jalur penghasilanmu. Bahkan jika mulai dari nol.</b>
          <a href="#fitur" className="btn">Cari tahu</a>
        </div>
      </div>

      <section className="lp-sec" id="fitur">
        <div className="container">
          <h2>Lebih dari sekadar link-in-bio</h2>
          <p className="lead">Jual produk atau keahlian apa pun dengan Hubio. Kami bantu seluruh alur kerjamu dari awal sampai selesai.</p>
          <div className="lp-feats">
            {FEATS.map(([i, t, d], k) => (
              <div className={"lp-card" + (k === 0 ? " on" : "")} key={t}>
                <div className="ic"><Icon n={i} /></div>
                <div><h3>{t}</h3><p>{d}</p></div>
              </div>
            ))}
            <Link href="/register" className="lp-card more"><span>Buat tokomu sekarang</span><Icon n="arrow" /></Link>
          </div>
        </div>
      </section>

      <section className="lp-sec" id="cara" style={{ background: "var(--mist)" }}>
        <div className="container">
          <h2>Dari daftar sampai pesanan pertama</h2>
          <p className="lead">Tidak perlu membangun website dari awal.</p>
          <div className="lp-steps">
            {STEPS.map(([t, d], i) => <div className="lp-step" key={t}><div className="n">{i + 1}</div><h3>{t}</h3><p>{d}</p></div>)}
          </div>
        </div>
      </section>

      <section className="lp-sec" id="tampilan">
        <div className="container" style={{ textAlign: "center" }}>
          <h2>Tampilkan produk sesuai gayamu</h2>
          <p className="lead" style={{ margin: "0 auto" }}>Campur ukuran dalam satu toko: produk andalan tampil besar, produk pendukung tampil kecil atau seperti tombol.</p>
          <div className="lp-show">
            <figure><PhoneMock variant="small" /><figcaption>Kecil<small>2 kolom</small></figcaption></figure>
            <figure><PhoneMock variant="large" /><figcaption>Besar<small>1 kolom penuh</small></figcaption></figure>
            <figure><PhoneMock variant="tiny" /><figcaption>Sangat kecil<small>seperti tombol</small></figcaption></figure>
          </div>
        </div>
      </section>

      <section className="lp-sec" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="lp-dark">
            <h2>Kreator, profesional, dan bisnis.</h2>
            <p className="lead">Jika kamu punya sesuatu untuk dijual, atau ingin tampil profesional secara online, inilah platformmu.</p>
            <div className="lp-seg">
              {SEGS.map(([t, d, tags]) => <div key={t}><h3>{t}</h3><p>{d}</p><div className="tags">{tags.map((x) => <span key={x}>{x}</span>)}</div></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="lp-sec" id="harga" style={{ paddingTop: 0 }}>
        <div className="container">
          <h2>Mulai gratis, upgrade saat butuh</h2>
          <p className="lead">Uang penjualan selalu masuk langsung ke rekeningmu. Hubio tidak memotong penjualanmu.</p>
          <div className="plans">
            <div className="plan"><b>Free</b><div className="big">Gratis</div><p className="muted">untuk memulai</p><ul><li>Toko dengan link unik</li><li>Sampai 5 produk</li><li>Konfirmasi dan email otomatis ke pembeli</li><li>Statistik penjualan</li></ul></div>
            <div className="plan pro"><b>Pro</b><div className="big">Produk tanpa batas</div><p style={{ opacity: 0.8 }}>untuk toko yang berkembang</p><ul><li>Semua fitur Free</li><li>Jumlah produk tanpa batas</li><li>Lencana Pro di toko</li></ul></div>
          </div>
        </div>
      </section>

      <section className="lp-sec" id="faq" style={{ paddingTop: 0 }}>
        <div className="container">
          <h2>Pertanyaan yang sering muncul</h2>
          <div className="lp-faq">
            {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </div>
      </section>

      <div className="container">
        <div className="lp-banner">
          <b>Siap punya toko digital sendiri? Buat dalam hitungan menit.</b>
          <Link href="/register" className="btn">Daftar gratis</Link>
        </div>
      </div>

      <footer className="lp-foot">
        <div className="container">
          <div className="cols">
            <div><Logo light size={32} /><p style={{ marginTop: 12, maxWidth: "24em" }}>Satu tautan untuk menjual produk digital, kelas, dan jasa dari toko milikmu sendiri.</p></div>
            <div><h4>Jual</h4><a href="#fitur">Produk Digital</a><a href="#fitur">Kelas & E-course</a><a href="#fitur">Jasa</a><a href="#tampilan">Tampilan toko</a></div>
            <div><h4>Hubio</h4><a href="#cara">Cara kerja</a><a href="#harga">Harga</a><a href="#faq">Pertanyaan</a><Link href="/login">Masuk</Link><Link href="/register">Daftar</Link></div>
          </div>
          <div className="copy">© {new Date().getFullYear()} Hubio. Semua hak dilindungi.</div>
        </div>
      </footer>
    </>
  );
}
