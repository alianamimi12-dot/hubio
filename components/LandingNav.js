"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "./Logo";

const LINKS = [["#fitur", "Fitur"], ["#cara", "Cara kerja"], ["#tampilan", "Tampilan toko"], ["#harga", "Harga"], ["#faq", "Pertanyaan"]];

export default function LandingNav() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 60);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);

  return (
    <>
      <header className={"lp-nav" + (solid ? " solid" : "")}>
        <div className="lp-bar">
          <Logo size={30} />
          <div className="lp-act">
            <Link href="/login" className="btn btn-primary btn-sm"><span className="lp-long">Masuk ke </span>Dashboard</Link>
            <button className="lp-burger" aria-label="Buka menu" aria-expanded={open} onClick={() => setOpen(true)}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>
      </header>
      {open && (
        <div className="lp-menu" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="top"><Logo light size={30} /><button className="x" aria-label="Tutup menu" onClick={() => setOpen(false)}>×</button></div>
          <nav>
            {LINKS.map(([h, l]) => <a key={h} href={h} onClick={() => setOpen(false)}>{l}</a>)}
            <Link href="/login" onClick={() => setOpen(false)}>Masuk</Link>
          </nav>
          <Link href="/register" className="btn btn-primary" onClick={() => setOpen(false)}>Daftar gratis</Link>
        </div>
      )}
    </>
  );
}
