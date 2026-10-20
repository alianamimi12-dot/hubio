# Hubio

Platform toko digital: satu tautan untuk menjual produk digital. Next.js 14 + Supabase + Resend. Warna brand biru.

## Cara kerja pembayaran (model langsung ke penjual)

1. Pembeli membuka toko `/username`, memilih produk, lalu checkout. **Email wajib**, nomor HP opsional (dicentang pembeli).
2. Server membuat pesanan dan **kode unik 1-999** pada nominal (Rp49.000 menjadi Rp49.127). Database menjamin **tidak ada dua pesanan menunggu milik penjual yang sama dengan total transfer yang sama**, jadi mutasi mudah dicocokkan.
3. Pembeli melihat rekening dan QRIS **penjual** di halaman `/pesanan/...`, transfer tepat sesuai nominal, lalu menekan "Saya sudah bayar" (hanya penanda; penjual diberi tahu lewat email).
4. Penjual membuka **Dashboard > Transaksi**, mencari nominal di mutasi banknya, lalu klik **Konfirmasi dana masuk**.
5. Server mengirim **email dari Hubio** ke email pembeli berisi produk sesuai pesanan: tombol buka produk, tautan langsung (untuk produk link), dan **lampiran PDF** (untuk produk PDF sampai 8 MB). PDF disimpan privat; tautan unduhnya dibuat baru setiap dibuka dan kedaluwarsa 1 jam.

Hubio **tidak memegang uang penjual**. Karena itu tidak ada saldo atau penarikan. Pendapatan Hubio: paket **Pro** (produk tanpa batas; Free dibatasi 5 produk, bisa diubah admin).

## Pertanyaan umum

**Apakah harus punya email hubio.id?** Tidak perlu membuat kotak surat. Yang dibutuhkan adalah **domain** yang kamu miliki (mis. `hubio.id`) yang diverifikasi di Resend, lalu pengirimnya cukup `Hubio <noreply@hubio.id>` (tanpa mailbox). Email penjual **tidak** dipakai sebagai pengirim; email penjual dipasang sebagai *reply-to*, jadi saat pembeli membalas, balasannya ke penjual. Jika belum punya domain, pakai domain lain milikmu. Tanpa domain terverifikasi, Resend hanya mengizinkan kirim ke email pemilik akun Resend (cukup untuk uji coba).

**Bagaimana produk terkirim sesuai produk dan email pembeli?** Setiap pesanan menyimpan produk yang dibeli dan email yang diisi pembeli. Saat penjual mengonfirmasi, server membaca file/link produk itu dari tabel `product_files`, lalu mengirimnya ke email di pesanan tersebut. Konfirmasi ganda tidak mengirim dua kali (ada penanda `delivered_at`). Penjual juga bisa **Kirim ulang email** atau **Salin link akses pembeli**.

## Halaman

| Area | Halaman |
|---|---|
| Publik | `/`, `/login`, `/register`, `/[username]` (toko), `/pesanan/[id]` (cara bayar + akses produk) |
| Penjual | `/dashboard` ringkasan, `/produk`, `/pesanan` (**Transaksi: konfirmasi dana masuk**), `/pembayaran` (rekening + QRIS), `/toko`, `/statistik` |
| Admin Hubio | `/admin` (pengguna, transaksi, pengaturan paket) |

Produk: foto cover, foto landing page, deskripsi, kode HTML, harga normal + diskon, pengiriman via link atau PDF, tampilan **kecil** (2 kolom), **besar** (1 kolom), atau **sangat kecil** (seperti tombol).
Kode HTML dijalankan di area terisolasi (iframe sandbox): CSS, gambar, dan embed tampil, JavaScript tidak berjalan, supaya akun pembeli aman.

## Setup (urut)

### 1. Supabase
1. Buat project di supabase.com. Buka **SQL Editor**, tempel seluruh `supabase/schema.sql`, **Run**.
   (Jika sebelumnya sudah menjalankan skema versi lama, buat project Supabase baru untuk uji coba. Strukturnya berubah cukup banyak.)
2. **Project Settings > API**: salin URL, `anon key`, dan `service_role key`.
3. **Authentication > URL Configuration**: isi Site URL dengan alamat situsmu dan tambahkan `https://ALAMATMU/login` di Redirect URLs.
4. **Authentication > Providers > Email**: untuk uji coba boleh matikan "Confirm email". Untuk produksi aktifkan dan pasang SMTP sendiri.
5. Daftar lewat `/register`, lalu jadikan dirimu admin Hubio di SQL Editor:
   `update public.profiles set role = 'admin' where email = 'emailkamu@contoh.com';`

### 2. Resend (wajib untuk email otomatis)
1. resend.com > **Domains > Add Domain**, ikuti langkah record DNS sampai *Verified*.
2. **API Keys > Create**, salin ke `RESEND_API_KEY`. Isi `RESEND_FROM`, mis. `Hubio <noreply@hubio.id>`.

### 3. Vercel
Unggah ke GitHub, **Add New > Project** di Vercel, isi semua variabel dari `.env.example` (kecuali Xendit jika belum perlu), **Deploy**. Setelah alamat final jadi, isi `NEXT_PUBLIC_SITE_URL` lalu **Redeploy**.

### 4. Uji alur penuh
1. Daftar sebagai penjual, buka **Pembayaran** dan isi rekening/QRIS, lalu tambah produk (isi link atau PDF).
2. Buka `/usernamemu` di jendela lain, beli produk itu dengan emailmu.
3. Pada **Transaksi**, cari nominal unik, klik **Konfirmasi dana masuk**, dan cek emailmu.

## Yang perlu kamu sadari

- **Konfirmasi manual.** Sistem tidak membaca mutasi bank. Penjual yang menentukan dana sudah masuk. Pembeli yang menekan "Saya sudah bayar" tidak otomatis mendapat produk. Penjual yang salah klik konfirmasi akan mengirim produk tanpa pembayaran, dan konfirmasi tidak bisa dibatalkan.
- **Nominal unik hanya berlaku selama pesanan berstatus menunggu.** Setelah dikonfirmasi atau dibatalkan, angkanya boleh dipakai lagi. Transfer yang datang terlambat setelah pesanan dibatalkan perlu dicek manual oleh penjual.
- **Tanggung jawab penjual.** Penjual bertanggung jawab atas produk, refund, dan pajaknya sendiri. Siapkan Syarat & Ketentuan, Kebijakan Privasi, dan aturan penjual (produk terlarang, penipuan) sebelum dibuka untuk umum.
- Pelunasan otomatis (tanpa klik penjual) butuh integrasi payment gateway atau pembaca mutasi bank. Itu model yang berbeda dan dapat ditambahkan nanti.
- Belum ada: lupa kata sandi, login Google, pembatasan spam kunjungan, agregasi statistik di server.

## Menjalankan lokal

```bash
cp .env.example .env.local   # isi nilainya
npm install
npm run dev
```

## Struktur

```
supabase/schema.sql              skema, RLS, kode unik, storage
app/api/checkout                 buat pesanan + kode unik
app/api/orders/[id]/access       cara bayar / akses produk untuk pembeli
app/api/orders/[id]/paid         pembeli menandai sudah bayar
app/api/orders/[id]/confirm      penjual konfirmasi / batalkan / kirim ulang email
app/api/pro/checkout             bayar paket Pro (opsional, Xendit)
lib/email.js                     email (Resend) + pengiriman produk
lib/db.js                        klien Supabase dan pemuatan data
components/HtmlFrame.js          tampilan kode HTML yang aman
```
