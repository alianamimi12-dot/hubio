import DOMPurify from "dompurify";

// Membersihkan HTML buatan penjual sebelum ditampilkan di halaman Hubio.
// Dihapus: script, form, gaya inline (style), dan embed selain YouTube/Vimeo.
let hooked = false;
const EMBED = /^https:\/\/(www\.youtube(-nocookie)?\.com\/embed\/|player\.vimeo\.com\/video\/)/;

function setup() {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") { node.setAttribute("target", "_blank"); node.setAttribute("rel", "noopener noreferrer nofollow"); }
    if (node.tagName === "IFRAME") {
      const src = node.getAttribute("src") || "";
      if (!EMBED.test(src)) { if (node.parentNode) node.parentNode.removeChild(node); }
      else { node.setAttribute("loading", "lazy"); node.removeAttribute("srcdoc"); }
    }
  });
}

export function cleanHtml(html) {
  if (typeof window === "undefined" || !html) return "";
  setup();
  return DOMPurify.sanitize(String(html), {
    USE_PROFILES: { html: true },
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allow", "allowfullscreen", "frameborder"],
    FORBID_TAGS: ["style", "form", "input", "button", "textarea", "select", "script", "object", "embed"],
    FORBID_ATTR: ["style"],
  });
}

// Deskripsi lama berupa teks biasa: ubah baris baru menjadi <br>. Deskripsi baru berupa HTML: dibersihkan.
export function descToHtml(s) {
  s = String(s || "");
  if (!s.trim()) return "";
  if (/<\/?[a-z][\s\S]*?>/i.test(s)) return cleanHtml(s);
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
}
