"use client";

export type TrackEvent = "vue" | "appel" | "itineraire";

/** Compteur anonyme, non bloquant. sendBeacon survit à la navigation (clic sur « Appeler »). */
export function track(pharmacyId: number, event: TrackEvent) {
  try {
    const body = new Blob([JSON.stringify({ pharmacy_id: pharmacyId, event })], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/stats", body)) {
      fetch("/api/stats", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  } catch {
    /* les statistiques ne doivent jamais gêner l'utilisateur */
  }
}
