import express from 'express';
import { brand } from './config.js';
import { mountAuth, staffFrom } from './auth.js';
import { mountEvents } from './events.js';
import { securityHeaders, sameOrigin, rateLimit, clientIp } from './security.js';
import { menuRoutes } from './routes/menu.js';
import { adminRoutes } from './routes/admin.js';
import { orderRoutes } from './routes/orders.js';

const app = express();
app.disable('x-powered-by');
app.use(securityHeaders);
app.use('/api', sameOrigin);
// Les photos de la carte (déjà réduites dans le navigateur) ont besoin d'une limite plus large.
app.use('/api/admin/images', express.json({ limit: '1mb' }));
app.use(express.json({ limit: '50kb' }));

// Limites par IP contre l'envoi massif de fausses commandes et l'ouverture de flux en boucle.
// Tous les téléphones branchés sur le wifi de l'établissement partagent la même adresse IP : les limites par IP
// doivent donc tenir un coup de feu de toute la salle. La limite serrée s'applique par table.
const tooManyOrders = 'Trop de commandes envoyées. Demandez au comptoir.';
app.post('/api/orders', rateLimit('orders', 150, 10 * 60, tooManyOrders));
app.post(
  '/api/orders',
  rateLimit('orders-table', 15, 10 * 60, tooManyOrders, (req) => `${clientIp(req)}:${parseInt(req.body?.table, 10) || 0}`),
);
app.get('/api/orders/track', rateLimit('track', 1200, 60));
// Le flux des employés connectés n'est pas limité : le comptoir est souvent sur le même wifi que les clients.
const eventsLimit = rateLimit('events', 300, 60);
app.get('/api/events', (req, res, next) => (staffFrom(req) ? next() : eventsLimit(req, res, next)));
mountAuth(app);
mountEvents(app);

app.get('/api/config', (_req, res) => res.json(brand));
app.use('/api', menuRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur du serveur' });
});

export default app;
