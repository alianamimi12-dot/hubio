export const BRAND = "Hubio";
// Domain yang tampil di kolom klaim link. Diambil dari NEXT_PUBLIC_SITE_URL jika ada.
export const HOST = (process.env.NEXT_PUBLIC_SITE_URL || "https://hubio.id").replace(/^https?:\/\//, "").replace(/\/$/, "");
