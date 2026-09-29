# Yako Pharma — Couche 1

PWA Next.js + Tailwind : géolocalisation des pharmacies d'Abidjan et pharmacies de garde.
Localisation uniquement : aucune commande, ordonnance ni donnée de santé.

## Écrans
- `/` — carte (Leaflet/OSM) ou liste triée par distance ; filtre « de garde » ; recherche par commune / quartier / nom (insensible aux accents)
- `/pharmacie/[id]` — fiche : horaires, statut de garde, Appeler, Itinéraire
- `/signaler` — signalement communautaire (toujours « en attente »)
- `/admin` — modération (jeton `ADMIN_TOKEN`)

## Lancer en local (sans base de données)
    npm install
    npm run dev

Sans `DATABASE_URL`, l'app utilise 8 pharmacies FICTIVES et stocke les signalements dans `data/reports.local.json`.
Pour tester la modération : `ADMIN_TOKEN=monjeton` (voir `.env.example`), puis `/admin`.

## Passer aux vraies données
1. Créer une base PostgreSQL avec PostGIS (Supabase ou Railway), copier `.env.example` en `.env`, renseigner `DATABASE_URL` et `ADMIN_TOKEN`.
2. `npm run db:migrate` — crée les tables (une seule fois, base vide).
3. Remplir `data/import/pharmacies.csv` et `data/import/garde.csv` (modèles dans `data/exemple/`).
   Sans `lat`/`lng`, l'adresse est géocodée via Nominatim (1 req/s, résultats mis en cache dans `data/geocode-cache.json`).
4. `npm run db:import -- --dry-run` pour valider, puis `npm run db:import`. Relancer est sans danger (upsert).

Colonnes `pharmacies.csv` : `name,address,commune,quartier,lat,lng,phone,opening_hours,source,verified`
(`source` = `ordre_pharmaciens` | `communautaire` | `manuel`).
Colonnes `garde.csv` : `name,commune,garde_start,garde_end,source_document` (dates ISO, ex. `2026-10-01T08:00:00Z`).

## Modération
- `en_attente` → « Vérifier » ou « Rejeter ». Rien n'est publié automatiquement.
- Seul « N'est plus de garde » agit à la vérification (clôt la garde en cours). Fermée / horaires / nouvelle pharmacie : correction manuelle en base ou via un nouvel import.

## PWA
Manifeste + `public/sw.js` (actif en production : `npm run build && npm start`) — cache de l'app, des dernières réponses API et des tuiles vues.
Icônes PNG 192/512/180 générées par `node scripts/make-icons.mjs` (à remplacer par un vrai logo quand il existera).

## Déploiement (Supabase + Vercel)
1. **Supabase** : nouveau projet (région Europe la plus proche). *Database → Connection string → Transaction pooler* (port 6543) : c'est ton `DATABASE_URL` (ajoute `?sslmode=no-verify`).
2. En local, mets ce `DATABASE_URL` dans `.env`, puis `npm run db:migrate` et `npm run db:import`.
3. **Vercel** : *Add New → Project* → importer `Komputus/yakopharma`. Variables d'environnement : `DATABASE_URL`, `ADMIN_TOKEN` (long et aléatoire). Déployer.
4. Domaine : ajouter `yakopharma.com` / `.ci` dans *Vercel → Settings → Domains*.
5. Test réel : téléphone en 3G, installer la PWA (« Ajouter à l'écran d'accueil »).

Schéma testé sur un moteur Postgres + PostGIS embarqué (PGlite) : création, upsert d'import, recherche par distance/commune sans accents, garde active et clôture.
