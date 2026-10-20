import Link from "next/link";

// Logo Hubio: atap rumah + huruf H (hub) dan nama. Dibuat dari SVG + teks agar tajam di semua ukuran.
export function Mark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M5 18 L20 6 L35 18" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 21 V34 M27 21 V34 M13 28 H27" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo({ href = "/", light = false, size = 34 }) {
  return (
    <Link href={href} className={"logo" + (light ? " light" : "")} aria-label="Hubio beranda">
      <Mark size={size} />
      <span className="logotext" style={{ fontSize: size * 0.82 }}>Hubio</span>
    </Link>
  );
}
