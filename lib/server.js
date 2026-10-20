// Hanya dipakai di sisi server (Route Handler). Jangan diimpor dari komponen "use client".
import { createClient } from "@supabase/supabase-js";

export function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server belum dikonfigurasi.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function userFromRequest(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin().auth.getUser(token);
  return error ? null : data.user;
}

const XENDIT = "https://api.xendit.co";
const xauth = () => "Basic " + Buffer.from((process.env.XENDIT_SECRET_KEY || "") + ":").toString("base64");
export const xenditReady = () => !!process.env.XENDIT_SECRET_KEY;

export async function createInvoice(body) {
  const r = await fetch(XENDIT + "/v2/invoices", { method: "POST", headers: { Authorization: xauth(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || "Gagal membuat tagihan pembayaran.");
  return j;
}
export async function getInvoice(id) {
  const r = await fetch(`${XENDIT}/v2/invoices/${encodeURIComponent(id)}`, { headers: { Authorization: xauth() }, cache: "no-store" });
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || "Gagal membaca tagihan.");
  return j;
}
export const siteUrl = (req) => (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/$/, "");
