// Choix du stockage, en un seul endroit.
// - Postgres (DATABASE_URL) : commandes, carte, ruptures et photos, chaque ligne liée à un commerce.
// - Redis Upstash : temps réel (pub/sub) et limites de requêtes ; stocke aussi les données tant que Postgres n'est pas branché.
// - Sans rien : fichiers dans data/, pour le développement.
const env = process.env;

export const redisConfig =
  (env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL) && (env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN)
    ? {
        url: env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN,
      }
    : null;

export const databaseUrl = env.DATABASE_URL || env.POSTGRES_URL || null;

export const dataKind = databaseUrl ? 'postgres' : redisConfig ? 'redis' : 'fichier';

// Le commerce servi par cette installation. Pour l'instant une installation = un commerce ;
// le jour où une seule app en sert plusieurs, cet identifiant viendra de la requête (sous-domaine, adresse…).
export const commerceId = env.COMMERCE_ID || 'forcado';
