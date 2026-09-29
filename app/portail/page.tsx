"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Pharmacy } from "@/lib/types";
import type { PortalGarde } from "@/lib/portal";

const fmt = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
const inputCls = "mt-1 w-full rounded border border-gray-300 p-2";

export default function Portail() {
  const [me, setMe] = useState<{ pharmacy: Pharmacy; gardes: PortalGarde[] } | null>(null);
  const [checked, setChecked] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [info, setInfo] = useState({ phone: "", opening_hours: "", address: "" });
  const [gStart, setGStart] = useState("");
  const [gEnd, setGEnd] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/portail/me", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setMe(d);
      setInfo({ phone: d.pharmacy.phone ?? "", opening_hours: d.pharmacy.opening_hours ?? "", address: d.pharmacy.address ?? "" });
    } else setMe(null);
    setChecked(true);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function call(url: string, method: string, body?: unknown, okText = "Enregistré.") {
    setMsg(null);
    try {
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg({ ok: false, text: d.error ?? "Erreur." });
        return false;
      }
      setMsg({ ok: true, text: okText });
      return true;
    } catch {
      setMsg({ ok: false, text: "Connexion impossible. Réessayez." });
      return false;
    }
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (await call("/api/portail/login", "POST", { code }, "Connecté.")) {
      setCode("");
      load();
    }
  }

  if (!checked) return <main className="p-4 text-gray-500">Chargement…</main>;

  if (!me)
    return (
      <main className="mx-auto max-w-sm p-4">
        <Link href="/" className="text-sm text-yako-600 underline">
          ← Retour
        </Link>
        <h1 className="mt-3 text-xl font-semibold">Espace pharmacie</h1>
        <p className="mt-1 text-sm text-gray-600">Entrez le code d'accès remis par l'équipe Yako Pharma.</p>
        <form onSubmit={login} className="mt-4 space-y-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="XXXXX-XXXXX"
            autoCapitalize="characters"
            autoComplete="off"
            className="w-full rounded border border-gray-300 p-3 text-center font-mono text-lg tracking-widest"
          />
          {msg && !msg.ok && <p className="text-sm text-red-600">{msg.text}</p>}
          <button className="w-full rounded-lg bg-yako-600 py-3 font-medium text-white">Se connecter</button>
        </form>
      </main>
    );

  const p = me.pharmacy;
  return (
    <main className="mx-auto max-w-lg space-y-6 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{p.name}</h1>
          <p className="text-sm text-gray-600">{p.commune}</p>
          <p className="mt-1 text-sm">{p.is_garde_active ? <span className="font-medium text-corail-600">● De garde en ce moment</span> : <span className="text-gray-500">Pas de garde en ce moment</span>}</p>
        </div>
        <button
          onClick={async () => {
            await call("/api/portail/logout", "POST", undefined, "Déconnecté.");
            setMe(null);
          }}
          className="text-sm text-gray-600 underline"
        >
          Déconnexion
        </button>
      </div>

      {msg && <p className={`rounded p-2 text-sm ${msg.ok ? "bg-yako-50 text-yako-700" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}

      <section>
        <h2 className="font-semibold">Mes informations</h2>
        <p className="text-xs text-gray-500">Visibles tout de suite par le public.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (await call("/api/portail/me", "PATCH", info)) load();
          }}
          className="mt-2 space-y-3"
        >
          <label className="block text-sm">
            Téléphone
            <input value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} inputMode="tel" maxLength={30} className={inputCls} />
          </label>
          <label className="block text-sm">
            Horaires d'ouverture
            <input value={info.opening_hours} onChange={(e) => setInfo({ ...info, opening_hours: e.target.value })} placeholder="08h-20h" maxLength={80} className={inputCls} />
          </label>
          <label className="block text-sm">
            Adresse
            <input value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} maxLength={150} className={inputCls} />
          </label>
          <button className="w-full rounded-lg bg-yako-600 py-2 font-medium text-white">Enregistrer</button>
        </form>
      </section>

      <section>
        <h2 className="font-semibold">Déclarer une garde</h2>
        <p className="text-xs text-gray-500">Votre déclaration est vérifiée par l'équipe avant d'apparaître sur la carte.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (await call("/api/portail/garde", "POST", { garde_start: new Date(gStart).toISOString(), garde_end: new Date(gEnd).toISOString() }, "Garde envoyée, en attente de validation.")) {
              setGStart("");
              setGEnd("");
              load();
            }
          }}
          className="mt-2 space-y-3"
        >
          <label className="block text-sm">
            Début
            <input type="datetime-local" required value={gStart} onChange={(e) => setGStart(e.target.value)} className={inputCls} />
          </label>
          <label className="block text-sm">
            Fin
            <input type="datetime-local" required value={gEnd} onChange={(e) => setGEnd(e.target.value)} className={inputCls} />
          </label>
          <button className="w-full rounded-lg bg-corail-500 py-2 font-medium text-white">Envoyer la garde</button>
        </form>
        {p.is_garde_active && (
          <button
            onClick={async () => {
              if (confirm("Terminer votre garde maintenant ?") && (await call("/api/portail/garde/end", "POST", undefined, "Garde terminée."))) load();
            }}
            className="mt-3 w-full rounded-lg border border-gray-300 py-2 text-sm"
          >
            Terminer ma garde maintenant
          </button>
        )}
      </section>

      <section>
        <h2 className="font-semibold">Mes gardes (30 derniers jours et à venir)</h2>
        {!me.gardes.length && <p className="mt-1 text-sm text-gray-500">Aucune.</p>}
        <ul className="mt-2 space-y-2">
          {me.gardes.map((g) => (
            <li key={g.id} className="rounded border bg-white p-2 text-sm">
              {fmt(g.garde_start)} → {fmt(g.garde_end)}{" "}
              <span className={g.approved ? "text-yako-600" : "text-amber-600"}>{g.approved ? "· validée" : "· en attente"}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
