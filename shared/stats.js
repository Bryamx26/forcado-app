// Statistiques de ventes, calculées à partir des commandes (fonctions pures, testées).
import { ORDER_STATUS } from './orderStatus.js';
import { roundMoney } from './money.js';
import { averagePrepMinutes } from './kitchen.js';
import { ORDER_MODE, zonedParts } from './pickup.js';

const TOP_ITEMS = 10;
const HOURS = 24;

const sum = (values) => values.reduce((total, v) => total + v, 0);

function topItems(orders) {
  const items = new Map();
  for (const line of orders.flatMap((o) => o.lines)) {
    const item = items.get(line.name) || { name: line.name, qty: 0, revenue: 0 };
    item.qty += line.qty;
    item.revenue = roundMoney(item.revenue + line.total);
    items.set(line.name, item);
  }
  return [...items.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, TOP_ITEMS);
}

function ordersByHour(orders, timeZone) {
  const hours = Array(HOURS).fill(0);
  for (const order of orders) hours[Math.floor(zonedParts(Date.parse(order.createdAt), timeZone).minutes / 60)]++;
  return hours;
}

// days : liste des jours (AAAA-MM-JJ) de la période, pour que les jours sans vente apparaissent à zéro.
function revenueByDay(orders, days, timeZone) {
  const byDay = Object.fromEntries(days.map((date) => [date, { date, count: 0, revenue: 0 }]));
  for (const order of orders) {
    const day = byDay[zonedParts(Date.parse(order.createdAt), timeZone).date];
    if (!day) continue;
    day.count++;
    day.revenue = roundMoney(day.revenue + order.total);
  }
  return Object.values(byDay);
}

// Les commandes annulées sont comptées à part et n'entrent pas dans le chiffre d'affaires.
export function summarize(orders, { days, timeZone }) {
  const sold = orders.filter((o) => o.status !== ORDER_STATUS.CANCELLED);
  const revenue = roundMoney(sum(sold.map((o) => o.total)));
  const prep = averagePrepMinutes(sold, sold.length);
  return {
    count: sold.length,
    revenue,
    averageTicket: sold.length ? roundMoney(revenue / sold.length) : 0,
    cancelled: orders.length - sold.length,
    takeaway: sold.filter((o) => o.mode === ORDER_MODE.TAKEAWAY).length,
    averagePrepMinutes: prep == null ? null : Math.round(prep),
    topItems: topItems(sold),
    byHour: ordersByHour(sold, timeZone),
    byDay: revenueByDay(sold, days, timeZone),
  };
}

// Jours de from à to inclus (AAAA-MM-JJ).
export function daysBetween(from, to) {
  const days = [];
  for (let ms = Date.parse(`${from}T12:00:00Z`); ms <= Date.parse(`${to}T12:00:00Z`); ms += 86400000) {
    days.push(new Date(ms).toISOString().slice(0, 10));
  }
  return days;
}

const csvField = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

// Export pour le comptable : une ligne par commande, séparateur « ; » (Excel en français).
export function ordersCsv(orders, timeZone) {
  const header = ['Date', 'Heure', 'Numéro', 'Mode', 'Table ou prénom', 'Statut', 'Articles', 'Total'];
  const rows = orders.map((o) => {
    const { date, minutes } = zonedParts(Date.parse(o.createdAt), timeZone);
    const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    const items = o.lines.map((l) => `${l.qty} × ${l.name}${l.options.length ? ` (${l.options.map((x) => x.choice).join(', ')})` : ''}`).join(' | ');
    const where = o.mode === ORDER_MODE.TAKEAWAY ? o.customerName : o.table;
    return [date, time, o.number, o.mode || ORDER_MODE.DINE_IN, where, o.status, items, String(o.total).replace('.', ',')];
  });
  return [header, ...rows].map((row) => row.map(csvField).join(';')).join('\r\n');
}
