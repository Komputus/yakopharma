import Link from "next/link";
import type { Pharmacy } from "@/lib/types";

export function GardeBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="font-medium text-corail-600">● De garde</span>
  ) : (
    <span className="text-gray-500">Pas de garde</span>
  );
}

export default function PharmacyList({ items }: { items: Pharmacy[] }) {
  if (!items.length) return <p className="p-6 text-center text-gray-600">Aucune pharmacie trouvée.</p>;
  return (
    <ul className="divide-y divide-yako-100">
      {items.map((p) => (
        <li key={p.id}>
          <Link href={`/pharmacie/${p.id}`} className="block px-4 py-3 active:bg-yako-50">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-semibold">{p.name}</h2>
              {p.distance_km !== undefined && <span className="shrink-0 text-sm text-gray-500">{p.distance_km.toFixed(1)} km</span>}
            </div>
            <p className="text-sm text-gray-600">
              {p.quartier ? `${p.quartier}, ` : ""}
              {p.commune}
            </p>
            <p className="text-sm">
              <GardeBadge active={p.is_garde_active} />
              {p.opening_hours && <span className="text-gray-500"> · {p.opening_hours}</span>}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
