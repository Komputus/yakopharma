import Link from "next/link";
import ReportForm from "@/components/ReportForm";
import { getPharmacy } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Signaler({ searchParams }: { searchParams: Promise<{ pharmacy?: string }> }) {
  const id = Number((await searchParams).pharmacy);
  const pharmacy = Number.isInteger(id) && id > 0 ? await getPharmacy(id) : null;

  return (
    <main className="mx-auto max-w-lg p-4">
      <Link href={pharmacy ? `/pharmacie/${pharmacy.id}` : "/"} className="text-sm text-yako-600 underline">
        ← Retour
      </Link>
      <h1 className="mt-3 text-xl font-semibold">Signaler une information</h1>
      <ReportForm pharmacyId={pharmacy?.id ?? null} pharmacyName={pharmacy?.name} />
    </main>
  );
}
