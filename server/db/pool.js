// Connexion à Postgres, partagée par tout le serveur.
// Sur Vercel, chaque instance garde peu de connexions : utilisez l'adresse « poolée » de votre fournisseur
// (Neon, Supabase…) dans DATABASE_URL.
import pg from 'pg';
import { databaseUrl, commerceId } from '../backend.js';

// Les montants (numeric) arrivent en texte par défaut : on les veut en nombres.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => Number(v));

export const pool = databaseUrl ? new pg.Pool({ connectionString: databaseUrl, max: 3, idleTimeoutMillis: 10_000 }) : null;

// Une ligne commerces doit exister avant toute commande ou carte. Créée au premier usage, une fois par instance.
let ready;
export function ensureCommerce() {
  ready ??= pool
    .query('INSERT INTO commerces (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING', [
      commerceId,
      process.env.BRAND_NAME || commerceId,
    ])
    .catch((e) => {
      ready = null;
      throw e;
    });
  return ready;
}

export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
