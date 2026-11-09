// Connexion Upstash Redis, partagée par tous les modules de stockage.
// Sans ses variables d'environnement (en local), chaque module se replie sur ses fichiers ou sa mémoire.
import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export const hasRedis = Boolean(url && token);

// rawValues : renvoie les chaînes telles quelles, sans essayer de les relire en JSON.
export function redisClient({ rawValues = false } = {}) {
  if (!hasRedis) return null;
  return new Redis({ url, token, ...(rawValues ? { automaticDeserialization: false } : {}) });
}
