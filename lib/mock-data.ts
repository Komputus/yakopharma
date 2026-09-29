import type { Pharmacy } from "./types";

// DONNÉES FICTIVES — uniquement pour valider le rendu avant l'import réel.
const base = { verified: false, source: "manuel" as const, last_updated_at: "2026-09-29T00:00:00Z" };

export const MOCK_PHARMACIES: Pharmacy[] = [
  { id: 1, name: "Pharmacie Exemple Plateau", address: "Avenue Franchet d'Esperey", commune: "Plateau", quartier: "Centre-ville", lat: 5.3236, lng: -4.0197, phone: "+225 27 00 00 00 01", opening_hours: "24h/24", is_garde_active: true, ...base },
  { id: 2, name: "Pharmacie Exemple Cocody Angré", address: "Boulevard Latrille", commune: "Cocody", quartier: "Angré", lat: 5.3963, lng: -3.9977, phone: "+225 27 00 00 00 02", opening_hours: "08h-20h", is_garde_active: false, ...base },
  { id: 3, name: "Pharmacie Exemple Riviera 2", address: "Rue des Jardins", commune: "Cocody", quartier: "Riviera 2", lat: 5.3541, lng: -3.9714, phone: "+225 27 00 00 00 03", opening_hours: "08h-21h", is_garde_active: true, ...base },
  { id: 4, name: "Pharmacie Exemple Marcory", address: "Boulevard de Marseille", commune: "Marcory", quartier: "Zone 4", lat: 5.3005, lng: -3.9945, phone: "+225 27 00 00 00 04", opening_hours: "08h-20h", is_garde_active: false, ...base },
  { id: 5, name: "Pharmacie Exemple Treichville", address: "Avenue 16", commune: "Treichville", quartier: "Arras", lat: 5.2921, lng: -4.0089, phone: "+225 27 00 00 00 05", opening_hours: "24h/24", is_garde_active: true, ...base },
  { id: 6, name: "Pharmacie Exemple Yopougon", address: "Rue Princesse", commune: "Yopougon", quartier: "Sicogi", lat: 5.3412, lng: -4.0872, phone: "+225 27 00 00 00 06", opening_hours: "08h-20h", is_garde_active: false, ...base },
  { id: 7, name: "Pharmacie Exemple Abobo", address: "Carrefour PK18", commune: "Abobo", quartier: "PK18", lat: 5.4231, lng: -4.0203, phone: "+225 27 00 00 00 07", opening_hours: "08h-19h", is_garde_active: true, ...base },
  { id: 8, name: "Pharmacie Exemple Adjamé", address: "Près du marché", commune: "Adjamé", quartier: "Liberté", lat: 5.3579, lng: -4.0245, phone: "+225 27 00 00 00 08", opening_hours: "07h30-21h", is_garde_active: false, ...base },
];
