"use client";
import { useCallback, useState } from "react";
import { REPORT_LABELS, type ReportStatus, type UserReport } from "@/lib/types";

export default function Admin() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<ReportStatus>("en_attente");
  const [reports, setReports] = useState<UserReport[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(
    async (s: ReportStatus, t = token) => {
      setError("");
      const r = await fetch(`/api/admin/reports?status=${s}`, { headers: { "x-admin-token": t }, cache: "no-store" });
      if (!r.ok) {
        setReports(null);
        setError((await r.json()).error ?? "Erreur");
        return;
      }
      setStatus(s);
      setReports(await r.json());
    },
    [token]
  );

  async function decide(id: number, s: "verifie" | "rejete") {
    const r = await fetch(`/api/admin/reports/${id}`, {
      method: "PATCH",
      headers: { "x-admin-token": token, "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
    if (r.ok) load(status);
    else setError((await r.json()).error ?? "Erreur");
  }

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="text-xl font-semibold">Modération des signalements</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load("en_attente");
        }}
        className="mt-3 flex gap-2"
      >
        <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Jeton admin" className="flex-1 rounded border p-2" />
        <button className="rounded bg-yako-600 px-4 text-white">Entrer</button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {reports && (
        <>
          <div className="mt-4 flex gap-2 text-sm">
            {(["en_attente", "verifie", "rejete"] as ReportStatus[]).map((s) => (
              <button key={s} onClick={() => load(s)} className={`rounded-full px-3 py-1 ${s === status ? "bg-yako-600 text-white" : "bg-yako-100"}`}>
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
                <p className="mt-1 text-xs text-gray-500">{new Date(r.created_at).toLocaleString("fr-FR")}</p>
                {status === "en_attente" && (
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => decide(r.id, "verifie")} className="rounded bg-yako-600 px-3 py-1 text-sm text-white">
                      Vérifier
                    </button>
                    <button onClick={() => decide(r.id, "rejete")} className="rounded bg-gray-200 px-3 py-1 text-sm">
                      Rejeter
                    </button>
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
    </main>
  );
}
