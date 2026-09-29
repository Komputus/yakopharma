"use client";
import Link from "next/link";
import { useState } from "react";
import { REPORT_LABELS, REPORT_TYPES, type ReportType } from "@/lib/types";

export default function ReportForm({ pharmacyId, pharmacyName, initialType }: { pharmacyId: number | null; pharmacyName?: string; initialType?: ReportType }) {
  const [type, setType] = useState<ReportType>(initialType ?? (pharmacyId ? "fermee" : "nouvelle_pharmacie"));
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  // Sans pharmacie ciblée, seul le signalement d'une pharmacie manquante a un sens.
  const types = pharmacyId ? REPORT_TYPES.filter((t) => t !== "nouvelle_pharmacie") : (["nouvelle_pharmacie"] as ReportType[]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError("");
    try {
      const r = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_type: type, pharmacy_id: pharmacyId, note }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      setState("done");
    } catch (err: any) {
      setError(err?.message || "Envoi impossible. Vérifiez votre connexion et réessayez.");
      setState("idle");
    }
  }

  if (state === "done")
    return (
      <div className="mt-6 rounded-lg bg-yako-50 p-4">
        <p className="font-medium">Merci ! Votre signalement sera vérifié avant toute modification.</p>
        <Link href="/" className="mt-3 block text-yako-600 underline">
          Retour à la carte
        </Link>
      </div>
    );

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      {pharmacyName && <p className="font-medium">{pharmacyName}</p>}
      <fieldset className="space-y-2">
        <legend className="sr-only">Type de signalement</legend>
        {types.map((t) => (
          <label key={t} className="flex items-center gap-2">
            <input type="radio" name="type" checked={type === t} onChange={() => setType(t)} className="accent-yako-600" />
            {REPORT_LABELS[t]}
          </label>
        ))}
      </fieldset>
      <label className="block text-sm">
        {type === "nouvelle_pharmacie" ? "Nom, quartier et adresse de la pharmacie" : "Précisions (facultatif)"}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={4}
          required={type === "nouvelle_pharmacie"}
          className="mt-1 w-full rounded border border-gray-300 p-2"
        />
      </label>
      <p className="text-xs text-gray-500">Ne saisissez aucune information de santé personnelle.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={state === "sending"} className="w-full rounded-lg bg-yako-600 py-3 font-medium text-white disabled:opacity-60">
        {state === "sending" ? "Envoi…" : "Envoyer"}
      </button>
    </form>
  );
}
