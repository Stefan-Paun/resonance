// Wechsel zwischen Liste und Himmel: Wahl merken und mit ?ansicht= neu laden, damit die Liste three.js nie lädt.
// Kein DOM auf Modulebene; wird von start.js, liste.js und app.js benutzt.
import { ANSICHT_KEY, KONTEXT_KEY } from "./listendaten.js";

export function ansichtWechseln(ziel) {
  try { localStorage.setItem(ANSICHT_KEY, ziel); } catch { /* privat: die Adresse reicht */ }
  if (ziel === "himmel") { try { sessionStorage.removeItem(KONTEXT_KEY); } catch { /* egal */ } }
  const u = new URL(location.href);
  u.searchParams.set("ansicht", ziel); u.hash = "";
  location.assign(u.toString());
}

/** Nach einem verlorenen WebGL-Kontext: für diese Sitzung zur Liste, ohne die gemerkte Wahl zu ändern. */
export function zurListeNachKontextverlust() {
  try { sessionStorage.setItem(KONTEXT_KEY, "1"); } catch { /* ohne Speicher: Adresse */ }
  const u = new URL(location.href);
  u.searchParams.delete("ansicht");
  try { if (sessionStorage.getItem(KONTEXT_KEY) !== "1") u.searchParams.set("ansicht", "liste"); } catch { u.searchParams.set("ansicht", "liste"); }
  u.hash = "";
  location.assign(u.toString());
}
