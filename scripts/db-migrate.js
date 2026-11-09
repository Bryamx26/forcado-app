// Crée ou met à jour les tables Postgres. Rejouable sans risque.
// Usage : DATABASE_URL=postgres://… npm run db:migrate
import fs from 'node:fs';
import { pool } from '../server/db/pool.js';

if (!pool) {
  console.error('DATABASE_URL (ou POSTGRES_URL) manquant.');
  process.exit(1);
}
const sql = fs.readFileSync(new URL('../server/db/schema.sql', import.meta.url), 'utf8');
await pool.query(sql);
await pool.end();
console.log('Schéma Postgres à jour.');
