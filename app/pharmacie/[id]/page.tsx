import Link from "next/link";
import { notFound } from "next/navigation";
import { getPharmacy } from "@/lib/store";
import { GardeBadge } from "@/components/PharmacyList";

export const dynamic = "force-dynamic";

export default async function Fiche({ params }: { params: Promise<{ id: string }> }) {
  const p = await getPharmacy(Number((await params).id));
  if (!p) notFound();

  return (
    <main className="mx-auto max-w-lg p-4">
      <Link href="/" className="text-sm text-yako-600 underline">
        ← Retour
      </Link>
      <h1 className="mt-3 text-xl font-semibold">{p.name}</h1>
      <p className="text-gray-600">
        {p.address}
        {p.quartier ? `, ${p.quartier}` : ""} — {p.commune}
      </p>
      <p className="mt-2">
        <GardeBadge active={p.is_garde_active} />
      </p>
      <dl className="mt-3 space-y-1 text-sm">
        {p.opening_hours && (
          <div>
            <dt className="inline font-medium">Horaires : </dt>
            <dd className="inline">{p.opening_hours}</dd>
          </div>
        )}
        {p.phone && (
          <div>
            <dt className="inline font-medium">Téléphone : </dt>
            <dd className="inline">{p.phone}</dd>
          </div>
        )}
        <div className="text-gray-500">
          {p.verified ? "Données vérifiées" : "Données non vérifiées"} · mis à jour le{" "}
          {new Date(p.last_updated_at).toLocaleDateString("fr-FR")}
        </div>
      </dl>
      <div className="mt-4 flex gap-2">
        {p.phone && (
          <a href={`tel:${p.phone.replace(/\s/g, "")}`} className="flex-1 rounded-lg bg-corail-500 py-3 text-center font-medium text-white">
            Appeler
          </a>
        )}
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`}
          target="_blank"
          rel="noreferrer"
          className="flex-1 rounded-lg bg-yako-600 py-3 text-center font-medium text-white"
        >
          Itinéraire
        </a>
      </div>
      <Link href={`/signaler?pharmacy=${p.id}`} className="mt-6 block text-center text-sm text-gray-600 underline">
        Une information est incorrecte ? Signaler
      </Link>
    </main>
  );
}
