-- Yako Pharma — schéma PostgreSQL + PostGIS (Couche 1)
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA public;
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public;

-- Recherche insensible aux accents/casse ("Adjame" trouve "Adjamé").
CREATE OR REPLACE FUNCTION unaccent_lower(t text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT lower(public.unaccent('public.unaccent', t)) $$;

CREATE TYPE pharmacy_source AS ENUM ('ordre_pharmaciens', 'communautaire', 'manuel');
CREATE TYPE report_type     AS ENUM ('fermee', 'horaires_incorrects', 'plus_en_garde', 'nouvelle_pharmacie');
CREATE TYPE report_status   AS ENUM ('en_attente', 'verifie', 'rejete');

CREATE TABLE pharmacy (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  address         TEXT,
  commune         TEXT NOT NULL,
  quartier        TEXT,
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  geom            GEOGRAPHY(Point, 4326)
                  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) STORED,
  phone           TEXT,
  opening_hours   TEXT,
  verified        BOOLEAN NOT NULL DEFAULT FALSE,
  source          pharmacy_source NOT NULL DEFAULT 'manuel',
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, commune)
);
CREATE INDEX pharmacy_geom_idx ON pharmacy USING GIST (geom);
CREATE INDEX pharmacy_commune_idx ON pharmacy (commune);

CREATE TABLE garde_schedule (
  id              BIGSERIAL PRIMARY KEY,
  pharmacy_id     BIGINT NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  garde_start     TIMESTAMPTZ NOT NULL,
  garde_end       TIMESTAMPTZ NOT NULL CHECK (garde_end > garde_start),
  source_document TEXT,
  -- Garde déclarée par la pharmacie : approved=false tant qu'un admin ne l'a pas validée.
  approved        BOOLEAN NOT NULL DEFAULT TRUE,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pharmacy_id, garde_start)
);
CREATE INDEX garde_period_idx ON garde_schedule (garde_start, garde_end);

-- is_garde_active est calculé, jamais saisi à la main.
CREATE VIEW pharmacy_with_garde AS
SELECT p.*,
       EXISTS (
         SELECT 1 FROM garde_schedule g
         WHERE g.pharmacy_id = p.id AND g.approved AND now() BETWEEN g.garde_start AND g.garde_end
       ) AS is_garde_active
FROM pharmacy p;

-- Accès du portail pharmacie : code généré par un admin, stocké haché (SHA-256), affiché une seule fois.
CREATE TABLE pharmacy_access (
  pharmacy_id   BIGINT PRIMARY KEY REFERENCES pharmacy(id) ON DELETE CASCADE,
  code_hash     TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- Statistiques de visibilité : simples compteurs par jour, AUCUNE donnée sur l'utilisateur (ni IP, ni identifiant).
CREATE TABLE pharmacy_stat (
  pharmacy_id BIGINT NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  day         DATE   NOT NULL,
  event       TEXT   NOT NULL CHECK (event IN ('vue', 'appel', 'itineraire')),
  count       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (pharmacy_id, day, event)
);

-- Signalements communautaires : jamais publiés automatiquement (file de modération).
CREATE TABLE user_report (
  id          BIGSERIAL PRIMARY KEY,
  pharmacy_id BIGINT REFERENCES pharmacy(id) ON DELETE CASCADE,
  report_type report_type NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  status      report_status NOT NULL DEFAULT 'en_attente'
);

-- Exemple "pharmacie de garde la plus proche" :
-- SELECT *, ST_Distance(geom, ST_MakePoint($lng,$lat)::geography) AS dist_m
-- FROM pharmacy_with_garde WHERE is_garde_active
-- ORDER BY geom <-> ST_MakePoint($lng,$lat)::geography LIMIT 20;
