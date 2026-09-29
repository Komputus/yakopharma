export type Pharmacy = {
  id: number;
  name: string;
  address: string;
  commune: string;
  quartier: string;
  lat: number;
  lng: number;
  phone: string;
  opening_hours: string;
  is_garde_active: boolean;
  verified: boolean;
  source: "ordre_pharmaciens" | "communautaire" | "manuel";
  last_updated_at: string;
  distance_km?: number;
};

export const REPORT_TYPES = ["fermee", "horaires_incorrects", "plus_en_garde", "nouvelle_pharmacie"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];
export type ReportStatus = "en_attente" | "verifie" | "rejete";

export const REPORT_LABELS: Record<ReportType, string> = {
  fermee: "Pharmacie fermée",
  horaires_incorrects: "Horaires incorrects",
  plus_en_garde: "N'est plus de garde",
  nouvelle_pharmacie: "Pharmacie manquante",
};

export type UserReport = {
  id: number;
  pharmacy_id: number | null;
  pharmacy_name?: string | null;
  report_type: ReportType;
  note: string;
  created_at: string;
  status: ReportStatus;
};

export type SearchParams = {
  lat: number;
  lng: number;
  garde: boolean;
  commune?: string;
  q?: string;
};

export const COMMUNES = [
  "Abobo", "Adjamé", "Anyama", "Attécoubé", "Bingerville", "Cocody", "Koumassi",
  "Marcory", "Plateau", "Port-Bouët", "Songon", "Treichville", "Yopougon",
];
