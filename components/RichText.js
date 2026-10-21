"use client";
import { useMemo } from "react";
import { descToHtml, cleanHtml } from "@/lib/sanitize";

// Menampilkan deskripsi produk (HTML yang sudah dibersihkan). `extra` = kode HTML lama (kolom html_code).
export default function RichText({ html, extra }) {
  const out = useMemo(() => descToHtml(html) + (extra ? cleanHtml(extra) : ""), [html, extra]);
  if (!out) return null;
  return <div className="rich" dangerouslySetInnerHTML={{ __html: out }} />;
}
