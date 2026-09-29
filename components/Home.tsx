"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { COMMUNES, type Pharmacy } from "@/lib/types";
import { ABIDJAN_CENTER } from "@/lib/geo";
import PharmacyList, { GardeBadge } from "./PharmacyList";
import { track } from "@/lib/track";

const PharmacyMap = dynamic(() => import("./PharmacyMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-yako-50" />,
});

type View = "liste" | "carte";

export default function Home() {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [gardeOnly, setGardeOnly] = useState(true);
  const [commune, setCommune] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [view, setView] = useState<View>("carte");
  const [items, setItems] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Pharmacy | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem("yako-view") as View | null;
      if (v) setView(v);
    } catch {}
    navigator.geolocation?.getCurrentPosition(
      (g) => setPos({ lat: g.coords.latitude, lng: g.coords.longitude }),
      () => {} // refus : on reste sur le centre d'Abidjan
    );
  }, []);

  const switchView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem("yako-view", v);
    } catch {}
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const origin = pos ?? ABIDJAN_CENTER;
  const searching = commune !== "" || debouncedQ !== "";

  useEffect(() => {
    const ctrl = new AbortController();
    const params = new URLSearchParams({ lat: String(origin.lat), lng: String(origin.lng), garde: gardeOnly ? "1" : "0" });
    if (commune) params.set("commune", commune);
    if (debouncedQ) params.set("q", debouncedQ);
    setLoading(true);
    fetch(`/api/pharmacies?${params}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setItems(d);
        setError(null);
        setLoading(false);
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setError("Connexion faible : données récentes indisponibles.");
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [origin.lat, origin.lng, gardeOnly, commune, debouncedQ]);

  // En recherche, la carte se centre sur le premier résultat ; sinon sur l'utilisateur.
  const mapCenter = searching && items[0] ? { lat: items[0].lat, lng: items[0].lng } : origin;
  const onSelect = useCallback((p: Pharmacy) => {
    setSelected(p);
    track(p.id, "vue");
  }, []);

  return (
    <main className="relative flex h-dvh flex-col">
      <header className="z-[1000] bg-yako-600 px-4 pb-2 pt-3 text-white">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Yako Pharma</h1>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={gardeOnly} onChange={(e) => setGardeOnly(e.target.checked)} className="h-4 w-4 accent-corail-500" />
            De garde maintenant
          </label>
        </div>
        <div className="mt-2 flex gap-2">
          <select
            value={commune}
            onChange={(e) => setCommune(e.target.value)}
            aria-label="Commune"
            className="w-2/5 rounded bg-white px-2 py-1.5 text-sm text-gray-900"
          >
            <option value="">Toutes communes</option>
            {COMMUNES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Quartier ou nom…"
            aria-label="Rechercher un quartier ou une pharmacie"
            className="min-w-0 flex-1 rounded bg-white px-2 py-1.5 text-sm text-gray-900"
          />
        </div>
        <div className="mt-2 flex gap-1 text-sm" role="tablist">
          {(["carte", "liste"] as View[]).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => switchView(v)}
              className={`rounded-full px-4 py-1 capitalize ${view === v ? "bg-white text-yako-700" : "bg-yako-700 text-white"}`}
            >
              {v}
            </button>
          ))}
          <Link href="/signaler?type=nouvelle_pharmacie" className="ml-auto self-center text-xs underline">
            Signaler une pharmacie
          </Link>
        </div>
      </header>

      {error && <p className="z-[1000] bg-amber-100 px-4 py-1 text-sm text-amber-900">{error}</p>}

      {view === "liste" ? (
        <div className="flex-1 overflow-y-auto bg-white">
          {loading && !items.length ? <p className="p-6 text-center text-gray-500">Chargement…</p> : <PharmacyList items={items} />}
        </div>
      ) : (
        <div className="relative flex-1">
          <PharmacyMap pharmacies={items} center={mapCenter} user={pos} onSelect={onSelect} />
          {!loading && !items.length && !error && (
            <p className="absolute left-1/2 top-4 z-[1000] -translate-x-1/2 rounded bg-white px-3 py-2 text-sm shadow">
              Aucune pharmacie trouvée.
            </p>
          )}
        </div>
      )}

      {view === "carte" && selected && (
        <section className="absolute inset-x-0 bottom-0 z-[1000] rounded-t-2xl bg-white p-4 shadow-2xl">
          <button onClick={() => setSelected(null)} className="absolute right-3 top-2 text-2xl leading-none text-gray-400" aria-label="Fermer">
            ×
          </button>
          <Link href={`/pharmacie/${selected.id}`} className="block pr-8 font-semibold">
            {selected.name}
          </Link>
          <p className="text-sm text-gray-600">
            {selected.address}, {selected.quartier} — {selected.commune}
          </p>
          <p className="mt-1 text-sm">
            <GardeBadge active={selected.is_garde_active} /> · {selected.opening_hours}
            {selected.distance_km !== undefined && ` · ${selected.distance_km.toFixed(1)} km`}
          </p>
          <div className="mt-3 flex gap-2">
            <a href={`tel:${selected.phone.replace(/\s/g, "")}`} onClick={() => track(selected.id, "appel")} className="flex-1 rounded-lg bg-corail-500 py-2 text-center font-medium text-white">
              Appeler
            </a>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => track(selected.id, "itineraire")}
              className="flex-1 rounded-lg bg-yako-600 py-2 text-center font-medium text-white"
            >
              Itinéraire
            </a>
          </div>
        </section>
      )}
    </main>
  );
}
