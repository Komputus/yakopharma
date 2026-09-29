// Applique db/schema.sql sur DATABASE_URL. À lancer UNE fois sur une base vide : npm run db:migrate
import { readFileSync } from "fs";
import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL manquant (voir .env.example)");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
  console.log("Schéma appliqué.");
} finally {
  await client.end();
}
