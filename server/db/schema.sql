-- Schéma Postgres de l'app. Chaque donnée appartient à un commerce (commerce_id) :
-- une seule base peut ainsi servir plusieurs établissements, chacun avec sa carte et ses commandes.
-- Le script est rejouable sans risque : `npm run db:migrate`.

CREATE TABLE IF NOT EXISTS commerces (
  id            text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]{1,40}$'),
  name          text NOT NULL,
  -- Identité (couleurs, textes, mentions légales) : remplacera les variables BRAND_* et LEGAL_*.
  settings      jsonb NOT NULL DEFAULT '{}',
  -- Mot de passe du comptoir, haché (scrypt). Vide tant que STAFF_PASSWORD est utilisé.
  password_hash text,
  -- Prochain numéro de commande affiché au comptoir.
  next_number   integer NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id           uuid PRIMARY KEY,
  commerce_id  text NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  number       integer NOT NULL,
  table_number integer NOT NULL CHECK (table_number > 0),
  status       text NOT NULL CHECK (status IN ('nouvelle', 'en_cours', 'prete', 'servie', 'annulee')),
  total        numeric(10, 2) NOT NULL,
  -- Lignes figées au moment de la commande (nom, options, prix) : la carte peut changer ensuite.
  lines        jsonb NOT NULL,
  created_at   timestamptz NOT NULL,
  updated_at   timestamptz NOT NULL,
  modified_at  timestamptz,
  UNIQUE (commerce_id, number)
);
-- Le comptoir ne lit que les commandes récentes de son commerce.
CREATE INDEX IF NOT EXISTS orders_commerce_recent ON orders (commerce_id, created_at DESC);

-- La carte reste un document JSON par commerce (catégories > articles > options) : elle est petite et
-- toujours lue en entier. Les commandes ne pointent pas dessus, elles gardent leur copie des lignes.
CREATE TABLE IF NOT EXISTS menus (
  commerce_id text PRIMARY KEY REFERENCES commerces(id) ON DELETE CASCADE,
  data        jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sold_out (
  commerce_id text NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  item_id     text NOT NULL,
  PRIMARY KEY (commerce_id, item_id)
);

-- Photos envoyées depuis l'onglet Carte (déjà réduites, 600 Ko max). À déplacer vers un stockage de fichiers
-- (Vercel Blob, S3…) si elles deviennent nombreuses.
CREATE TABLE IF NOT EXISTS images (
  id          text PRIMARY KEY,
  commerce_id text NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  data        bytea NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
