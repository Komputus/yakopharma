"use client";
import { useCallback, useState } from "react";
import { REPORT_LABELS, type Pharmacy, type ReportStatus, type UserReport } from "@/lib/types";
import type { PortalGarde } from "@/lib/portal";

type Tab = "signalements" | "gardes" | "acces";
const fmt = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

export default function Admin() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<Tab>("signalements");
  const [status, setStatus] = useState<ReportStatus>("en_attente");
  const [reports, setReports] = useState<UserReport[]>([]);
  const [gardes, setGardes] = useState<PortalGarde[]>([]);
  const [search, setSearch] = useState("");
  const [found, setFound] = useState<Pharmacy[]>([]);
  const [codes, setCodes] = useState<Record<number, string>>({});
  const [error, setError] = useState("");

  const api = useCallback(
    async (url: string, init: RequestInit = {}) => {
      const r = await fetch(url, {
        ...init,
        cache: "no-store",
        headers: { "x-admin-token": token, "Content-Type": "application/json" },
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "Erreur");
      return d;
    },
    [token]
  );

  const guard = async (fn: () => Promise<void>) => {
    setError("");
    try {
      await fn();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const loadReports = (s: ReportStatus) =>
    guard(async () => {
      setReports(await api(`/api/admin/reports?status=${s}`));
      setStatus(s);
    });
  const loadGardes = () => guard(async () => setGardes(await api("/api/admin/gardes")));

  const enter = (e: React.FormEvent) => {
    e.preventDefault();
    guard(async () => {
      setReports(await api("/api/admin/reports?status=en_attente"));
      setAuthed(true);
    });
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    if (t === "gardes") loadGardes();
    if (t === "signalements") loadReports(status);
  };

  const pill = (active: boolean) => `rounded-full px-3 py-1 ${active ? "bg-yako-600 text-white" : "bg-yako-100"}`;

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="text-xl font-semibold">Administration</h1>
      {!authed && (
        <form onSubmit={enter} className="mt-3 flex gap-2">
          <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Jeton admin" className="flex-1 rounded border p-2" />
          <button className="rounded bg-yako-600 px-4 text-white">Entrer</button>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {authed && (
        <>
          <div className="mt-4 flex gap-2 text-sm">
            <button onClick={() => switchTab("signalements")} className={pill(tab === "signalements")}>Signalements</button>
            <button onClick={() => switchTab("gardes")} className={pill(tab === "gardes")}>Gardes déclarées</button>
            <button onClick={() => switchTab("acces")} className={pill(tab === "acces")}>Accès pharmacies</button>
          </div>

          {tab === "signalements" && (
            <>
              <div className="mt-3 flex gap-2 text-sm">
                {(["en_attente", "verifie", "rejete"] as ReportStatus[]).map((s) => (
                  <button key={s} onClick={() => loadReports(s)} className={pill(s === status)}>
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
              {!reports.length && <p className="mt-4 text-gray-500">Rien ici.</p>}
              <ul className="mt-3 space-y-3">
                {reports.map((r) => (
                  <li key={r.id} className="rounded-lg border bg-white p-3">
                    <p className="font-medium">
                      {REPORT_LABELS[r.report_type]} {r.pharmacy_name && <span className="font-normal">— {r.pharmacy_name}</span>}
                    </p>
                    {r.note && <p className="mt-1 text-sm">{r.note}</p>}
                    <p className="mt-1 text-xs text-gray-500">{fmt(r.created_at)}</p>
                    {status === "en_attente" && (
                      <div className="mt-2 flex gap-2">
                        {(["verifie", "rejete"] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => guard(async () => { await api(`/api/admin/reports/${r.id}`, { method: "PATCH", body: JSON.stringify({ status: s }) }); await loadReports(status); })}
                            className={`rounded px-3 py-1 text-sm ${s === "verifie" ? "bg-yako-600 text-white" : "bg-gray-200"}`}
                          >
                            {s === "verifie" ? "Vérifier" : "Rejeter"}
                          </button>
                        ))}
                      </div>
                    )}
                    {status === "en_attente" && r.report_type === "plus_en_garde" && (
                      <p className="mt-1 text-xs text-gray-500">« Vérifier » clôt la garde en cours de cette pharmacie.</p>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          {tab === "gardes" && (
            <>
              <p className="mt-3 text-sm text-gray-600">Gardes envoyées par les pharmacies. Rien n'est public tant que vous n'approuvez pas.</p>
              {!gardes.length && <p className="mt-4 text-gray-500">Aucune garde en attente.</p>}
              <ul className="mt-3 space-y-3">
                {gardes.map((g) => (
                  <li key={g.id} className="rounded-lg border bg-white p-3">
                    <p className="font-medium">{g.pharmacy_name}</p>
                    <p className="text-sm">{fmt(g.garde_start)} → {fmt(g.garde_end)}</p>
                    <div className="mt-2 flex gap-2">
                      {(["approuve", "rejete"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => guard(async () => { await api(`/api/admin/gardes/${g.id}`, { method: "PATCH", body: JSON.stringify({ status: s }) }); await loadGardes(); })}
                          className={`rounded px-3 py-1 text-sm ${s === "approuve" ? "bg-yako-600 text-white" : "bg-gray-200"}`}
                        >
                          {s === "approuve" ? "Approuver" : "Rejeter"}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {tab === "acces" && (
            <>
              <p className="mt-3 text-sm text-gray-600">
                Générez un code d'accès pour une pharmacie et transmettez-le lui (WhatsApp, en main propre). Le code n'est affiché qu'une fois ; en générer un nouveau invalide l'ancien.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  guard(async () => setFound(await (await fetch(`/api/pharmacies?q=${encodeURIComponent(search)}`)).json()));
                }}
                className="mt-3 flex gap-2"
              >
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, quartier ou commune" className="flex-1 rounded border p-2" />
                <button className="rounded bg-yako-600 px-4 text-white">Chercher</button>
              </form>
              <ul className="mt-3 space-y-2">
                {found.map((p) => (
                  <li key={p.id} className="rounded-lg border bg-white p-3">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-gray-600">{p.quartier}, {p.commune}</p>
                    {codes[p.id] ? (
                      <p className="mt-2 rounded bg-yako-50 p-2 text-center font-mono text-lg tracking-widest">{codes[p.id]}</p>
                    ) : (
                      <button
                        onClick={() => guard(async () => { const d = await api("/api/admin/access", { method: "POST", body: JSON.stringify({ pharmacy_id: p.id }) }); setCodes((c) => ({ ...c, [p.id]: d.code })); })}
                        className="mt-2 rounded bg-corail-500 px-3 py-1 text-sm text-white"
                      >
                        Générer un code
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </main>
  );
}
