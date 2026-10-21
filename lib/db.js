"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

/* ---------- Konfigurasi ---------- */
export const PRODUCT_TYPES = ["E-book", "Template", "Worksheet", "Preset", "Desain digital", "E-course", "Kelas online", "Jasa", "Lainnya"];
export const DISPLAYS = [["small", "Kecil", "2 kolom"], ["large", "Besar", "1 kolom penuh"], ["tiny", "Sangat kecil", "seperti tombol"]];
export const RESERVED = ["dashboard", "admin", "login", "register", "api", "pesanan", "checkout", "_next", "favicon.ico", "logo.png"];
export const THEMES = { Biru: "#2B9BE6", Laut: "#1678BE", Langit: "#67BAEB", Navy: "#0B2540", Tosca: "#14A3A3" };

/* ---------- Helper format ---------- */
export const rupiah = (n) => "Rp" + Math.round(n || 0).toLocaleString("id-ID");
export const uid = (p) => p + "_" + Math.random().toString(36).slice(2, 9);
export const dayStart = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const dateLabel = (t) => { const d = new Date(t); return d.getDate() + "/" + (d.getMonth() + 1); };
export const fullDate = (t) => new Date(t).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
export const inputDate = (t) => { const d = new Date(t); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
export const effectivePrice = (p) => (p.discountPrice ? p.discountPrice : p.price);
export const discountPct = (p) => (p.discountPrice ? Math.round((1 - p.discountPrice / p.price) * 100) : 0);

/* ---------- Klien Supabase ---------- */
let client = null;
export const configured = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export function sb() {
  if (!client) {
    if (!configured()) return null;
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }
  return client;
}
export async function accessToken() {
  const { data } = await sb().auth.getSession();
  return data.session?.access_token || null;
}

// Unggah gambar ke bucket publik (cover, landing page, QRIS). Mengembalikan URL publik.
export async function uploadImage(file, userId, prefix) {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) throw new Error("Gambar harus berformat JPG, PNG, WEBP, atau GIF.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Ukuran gambar maksimal 5 MB.");
  const ext = file.type.split("/")[1];
  const path = `${userId}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const { error } = await sb().storage.from("product-media").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return sb().storage.from("product-media").getPublicUrl(path).data.publicUrl;
}
export async function uploadPdf(file, userId) {
  if (file.type !== "application/pdf") throw new Error("File harus berformat PDF.");
  if (file.size > 50 * 1024 * 1024) throw new Error("Ukuran PDF maksimal 50 MB.");
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${Date.now()}-${safe}`;
  const { error } = await sb().storage.from("product-files").upload(path, file, { contentType: "application/pdf" });
  if (error) throw error;
  return path;
}

/* ---------- Pemetaan baris database -> objek halaman ---------- */
const ms = (t) => (t ? new Date(t).getTime() : null);
const effPlan = (p) => (p.plan === "pro" && (!p.plan_expires_at || new Date(p.plan_expires_at) > new Date()) ? "pro" : "free");
const mapUser = (p) => ({ id: p.id, name: p.name, email: p.email, role: p.role, plan: effPlan(p), planExpiresAt: ms(p.plan_expires_at), suspended: p.suspended, createdAt: ms(p.created_at) });
const mapStore = (s) => ({ userId: s.user_id, username: s.username, name: s.name, bio: s.bio, color: s.color, socials: s.socials || {}, links: s.links || [], payment: s.payment || {}, avatarUrl: s.avatar_url || "" });
const mapProductBase = (p) => ({ id: p.id, sellerId: p.seller_id, name: p.name, type: p.type, description: p.description, htmlCode: p.html_code || "", coverUrl: p.cover_url || "", landingUrl: p.landing_url || "", display: p.display, price: p.price, discountPrice: p.discount_price || null });
const mapProduct = (p) => {
  const f = Array.isArray(p.product_files) ? p.product_files[0] : p.product_files;
  const addons = (p.product_addons || []).slice().sort((a, b) => a.sort - b.sort).map((a) => ({ id: a.id, name: a.name, description: a.description || "", price: a.price, link: a.link || "" }));
  return { ...mapProductBase(p), active: p.active, deliveryKind: f?.kind || "link", deliveryValue: f?.value || "", addons };
};
const mapOrder = (o) => ({ id: o.id, sellerId: o.seller_id, productId: o.product_id, productName: o.product_name, buyerName: o.buyer_name, buyerEmail: o.buyer_email, buyerPhone: o.buyer_phone || "", amount: o.amount, uniqueCode: o.unique_code, total: o.total, status: o.status, token: o.access_token, buyerPaidAt: ms(o.buyer_paid_at), paidAt: ms(o.paid_at), deliveredAt: ms(o.delivered_at), addons: o.addons || [], createdAt: ms(o.created_at) });
const mapVisit = (v) => ({ sellerId: v.seller_id, productId: v.product_id, source: v.source, ts: ms(v.created_at) });
const mapSettings = (s) => ({ proPrice: s.pro_price, freeProductLimit: s.free_product_limit });

async function fetchAll(build) {
  const out = [];
  for (let from = 0; out.length < 20000; from += 1000) {
    const { data, error } = await build().range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

async function loadAll(c, userId) {
  const { data: prof, error } = await c.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  const user = mapUser(prof);
  const { data: set } = await c.from("settings").select("*").eq("id", 1).single();
  const settings = mapSettings(set);

  if (user.role === "admin") {
    const [users, stores, orders, pro] = await Promise.all([
      fetchAll(() => c.from("profiles").select("*").order("created_at")),
      fetchAll(() => c.from("stores").select("*")),
      fetchAll(() => c.from("orders").select("*").order("created_at", { ascending: false })),
      fetchAll(() => c.from("pro_payments").select("amount, status").eq("status", "paid")),
    ]);
    return { user, store: null, db: { settings, users: users.map(mapUser), stores: stores.map(mapStore), orders: orders.map(mapOrder), proRevenue: pro.reduce((a, p) => a + p.amount, 0), products: [], visits: [] } };
  }

  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const [{ data: st }, products, orders, visits] = await Promise.all([
    c.from("stores").select("*").eq("user_id", userId).maybeSingle(),
    fetchAll(() => c.from("products").select("*, product_files(kind, value), product_addons(*)").eq("seller_id", userId).order("created_at")),
    fetchAll(() => c.from("orders").select("*").eq("seller_id", userId).order("created_at", { ascending: false })),
    fetchAll(() => c.from("visits").select("seller_id, product_id, source, created_at").eq("seller_id", userId).gte("created_at", since).order("created_at")),
  ]);
  return {
    user, store: st ? mapStore(st) : null,
    db: { settings, users: [user], stores: st ? [mapStore(st)] : [], products: products.map(mapProduct), orders: orders.map(mapOrder), visits: visits.map(mapVisit) },
  };
}

/* ---------- Sesi ---------- */
export function useSession(role) {
  const router = useRouter();
  const [state, setState] = useState({ loading: true, user: null, store: null, db: null, error: null });

  const reload = useCallback(async () => {
    const c = sb();
    if (!c) return setState({ loading: false, user: null, store: null, db: null, error: "config" });
    const { data } = await c.auth.getSession();
    if (!data.session) return setState({ loading: false, user: null, store: null, db: null, error: null });
    try { setState({ loading: false, error: null, ...(await loadAll(c, data.session.user.id)) }); }
    catch (e) { setState({ loading: false, user: null, store: null, db: null, error: e.message || "gagal" }); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const { user, loading, error } = state;
  useEffect(() => {
    if (loading || error) return;
    if (!user || user.suspended) router.replace("/login");
    else if (role && user.role !== role) router.replace(user.role === "admin" ? "/admin" : "/dashboard");
  }, [loading, error, user, role, router]);

  const ready = !loading && !error && !!user && !user.suspended && (!role || user.role === role);
  return { ...state, reload, ready };
}
export async function signOut() { await sb()?.auth.signOut(); }

/* ---------- Statistik (dihitung dari data yang sudah dimuat) ---------- */
export function statsFor(db, sellerId, from, to) {
  const at = (o) => o.paidAt || o.createdAt;
  const orders = db.orders.filter((o) => o.sellerId === sellerId && o.status === "paid" && at(o) >= from && at(o) <= to);
  const visits = db.visits.filter((v) => v.sellerId === sellerId && v.ts >= from && v.ts <= to);
  const revenue = orders.reduce((s, o) => s + o.amount, 0);
  const visitors = visits.filter((v) => !v.productId).length;
  const productViews = visits.filter((v) => v.productId).length;
  const series = [];
  for (let t = dayStart(from); t <= to && series.length < 62; t += 86400000) {
    const e = t + 86400000;
    const od = orders.filter((o) => at(o) >= t && at(o) < e);
    series.push({ label: dateLabel(t), value: od.reduce((s, o) => s + o.amount, 0), orders: od.length, visits: visits.filter((v) => v.ts >= t && v.ts < e).length });
  }
  const top = db.products.filter((p) => p.sellerId === sellerId).map((p) => {
    const po = orders.filter((o) => o.productId === p.id);
    return { id: p.id, name: p.name, sold: po.length, revenue: po.reduce((s, o) => s + o.amount, 0), views: visits.filter((v) => v.productId === p.id).length };
  }).sort((a, b) => b.sold - a.sold || b.revenue - a.revenue);
  const sources = {}; visits.forEach((v) => { sources[v.source] = (sources[v.source] || 0) + 1; });
  return {
    revenue, orders: orders.length, avg: orders.length ? revenue / orders.length : 0, visitors, productViews,
    conversion: visitors ? (orders.length / visitors) * 100 : 0,
    series, top, sources: Object.entries(sources).sort((a, b) => b[1] - a[1]),
  };
}

/* ---------- Toko publik (tanpa login) ---------- */
export async function loadPublicStore(username) {
  const c = sb();
  if (!c) return { error: "config" };
  const sr = await c.from("public_stores").select("*").eq("username", String(username).toLowerCase()).maybeSingle();
  if (sr.error) return { error: sr.error.message };
  const store = sr.data;
  if (!store) return { store: null };
  // Urut dari produk terlama. Jika kolom created_at belum ada di tampilan, tetap muat tanpa urutan.
  let pr = await c.from("public_products").select("*").eq("seller_id", store.user_id).order("created_at");
  if (pr.error) pr = await c.from("public_products").select("*").eq("seller_id", store.user_id);
  if (pr.error) return { error: pr.error.message };
  return {
    store: { userId: store.user_id, username: store.username, name: store.name, bio: store.bio, color: store.color, socials: store.socials || {}, links: store.links || [], isPro: store.is_pro },
    products: (pr.data || []).map(mapProductBase),
  };
}
export function recordVisit(sellerId, productId, source) {
  sb()?.rpc("record_visit", { p_seller: sellerId, p_product: productId || null, p_source: source || "Langsung" }).then(() => {});
}
