"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { sb, configured, RESERVED } from "@/lib/db";

export default function Register() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", username: "", pw: "" });
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const u = (new URLSearchParams(window.location.search).get("u") || "").toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 30);
    if (u) setF((x) => ({ ...x, username: u }));
  }, []);
  const set = (k) => (e) => setF({ ...f, [k]: k === "username" ? e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "") : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!configured()) return setErr("Supabase belum disambungkan. Lihat README.");
    if (f.pw.length < 8) return setErr("Kata sandi minimal 8 karakter.");
    if (f.username.length < 3) return setErr("Username minimal 3 karakter.");
    if (RESERVED.includes(f.username)) return setErr("Username tidak tersedia.");
    setBusy(true);
    const c = sb();
    // Periksa username. Error pemeriksaan TIDAK boleh dibaca sebagai "sudah dipakai".
    let free = null, why = "";
    const r1 = await c.rpc("username_available", { p: f.username });
    if (!r1.error && typeof r1.data === "boolean") free = r1.data;
    else {
      why = r1.error?.message || "";
      const r2 = await c.from("public_stores").select("user_id").eq("username", f.username).maybeSingle(); // cadangan
      if (!r2.error) free = !r2.data; else why = why || r2.error.message;
    }
    if (free === null) { setBusy(false); return setErr("Tidak bisa memeriksa username (" + why + "). Pastikan supabase/schema.sql sudah dijalankan di Supabase."); }
    if (free === false) { setBusy(false); return setErr("Username sudah dipakai. Coba yang lain."); }
    const { data, error } = await c.auth.signUp({
      email: f.email.trim(), password: f.pw,
      options: { data: { name: f.name.trim(), username: f.username }, emailRedirectTo: window.location.origin + "/login" },
    });
    setBusy(false);
    if (error) {
      const m = error.message || "";
      return setErr(/already registered/i.test(m) ? "Email sudah terdaftar. Silakan masuk."
        : /database error/i.test(m) ? "Akun gagal dibuat di database. Jalankan supabase/migrations/003_robust_signup.sql lalu coba lagi. (" + m + ")"
        : /rate limit/i.test(m) ? "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi."
        : m);
    }
    if (data.session) router.push("/dashboard/produk");
    else setInfo("Akun dibuat. Kami mengirim email konfirmasi. Buka emailnya, lalu masuk.");
  };

  return (
    <div className="authwrap">
      <div className="authbox">
        <Logo />
        <h1>Buat toko gratismu</h1>
        <p className="muted" style={{ marginBottom: 18 }}>Selesai dalam satu menit.</p>
        {info ? <div className="okmsg" role="status">{info}</div> : (
          <form onSubmit={submit}>
            <div className="field"><label htmlFor="nm">Nama toko atau nama kamu</label><input id="nm" className="input" required value={f.name} onChange={set("name")} /></div>
            <div className="field"><label htmlFor="un">Username</label><input id="un" className="input" required value={f.username} onChange={set("username")} placeholder="namamu" /><div className="hint">Link tokomu: /{f.username || "namamu"}</div></div>
            <div className="field"><label htmlFor="em">Email</label><input id="em" className="input" type="email" required value={f.email} onChange={set("email")} autoComplete="email" /></div>
            <div className="field"><label htmlFor="pw">Kata sandi</label><input id="pw" className="input" type="password" required value={f.pw} onChange={set("pw")} autoComplete="new-password" /></div>
            {err && <div className="err" style={{ marginTop: 14 }} role="alert">{err}</div>}
            <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} disabled={busy}>{busy ? "Memproses…" : "Daftar"}</button>
          </form>
        )}
        <p className="small muted" style={{ marginTop: 16 }}>Sudah punya akun? <Link href="/login" style={{ color: "var(--blue-d)", fontWeight: 700 }}>Masuk</Link></p>
      </div>
    </div>
  );
}
