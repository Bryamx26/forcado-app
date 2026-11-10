// Règles métier des commandes, sans Express ni stockage : faciles à tester.
import { ORDER_STATUS, isFinal, MAX_LINES, MAX_NOTE_LENGTH, STATUS_LABELS, clampQty } from '../shared/orderStatus.js';
import { roundMoney } from '../shared/money.js';
import { groupLimits, pickChoices } from '../shared/options.js';
import { ORDER_MODE } from '../shared/pickup.js';

// code : identifiant stable de l'erreur, que l'écran du client traduit dans sa langue (avec vars si besoin).
export class OrderError extends Error {
  constructor(message, { status = 400, code = 'invalid_order', vars } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.vars = vars;
  }
}

const findMenuItem = (menu, itemId) => menu.flatMap((c) => c.items).find((i) => i.id === itemId);

function checkGroup(item, group, choices) {
  const { min, max } = groupLimits(group);
  if (choices.length < min) throw new OrderError(`Choix manquant : ${item.name} / ${group.name}`, { code: 'choice_missing' });
  if (choices.length > max) throw new OrderError(`Trop de choix : ${item.name} / ${group.name}`, { code: 'too_many_choices' });
  const soldOut = choices.find((choice) => choice.soldOut);
  if (soldOut) {
    throw new OrderError(`Désolé, « ${soldOut.name} » vient d'être épuisé. Choisissez autre chose.`, {
      status: 409,
      code: 'choice_sold_out',
      vars: { itemId: item.id, groupId: group.id, choiceId: soldOut.id, choice: soldOut.name },
    });
  }
}

// Recalcule une ligne à partir de la carte : le client ne fixe jamais les prix.
// Les ruptures (soldOut) ne sont vérifiées que si la carte les porte : la carte du client les porte, celle de
// l'équipe non, pour qu'elle puisse corriger une commande avec ce qui reste en cuisine.
export function buildLine(raw, menu, mode = ORDER_MODE.DINE_IN) {
  const item = findMenuItem(menu, raw?.itemId);
  if (!item) {
    throw new OrderError("Un article n'est plus à la carte. Retirez-le puis renvoyez la commande.", { code: 'item_gone' });
  }
  if (item.soldOut) {
    throw new OrderError(`Désolé, « ${item.name} » vient d'être épuisé. Retirez-le du panier.`, {
      status: 409,
      code: 'item_sold_out',
      vars: { itemId: item.id },
    });
  }
  const chosen = raw.options || {};
  const options = [];
  let unit = item.price;
  for (const group of item.options) {
    const choices = pickChoices(group, chosen[group.id]);
    checkGroup(item, group, choices);
    for (const choice of choices) {
      unit += choice.price;
      options.push({ group: group.name, choice: choice.name });
    }
  }
  const qty = clampQty(raw.qty);
  return {
    itemId: item.id,
    name: item.name,
    emoji: item.emoji,
    qty,
    options,
    note: String(raw.note || '').slice(0, MAX_NOTE_LENGTH),
    unitPrice: roundMoney(unit),
    total: roundMoney(unit * qty),
    // Taux de TVA selon sur place / à emporter, s'il est renseigné sur l'article (à valider avec le comptable).
    vatRate: item.vat?.[mode] ?? null,
  };
}

export function buildLines(rawLines, menu, mode) {
  if (!Array.isArray(rawLines) || rawLines.length === 0) throw new OrderError('Le panier est vide', { code: 'empty_cart' });
  return rawLines.slice(0, MAX_LINES).map((raw) => buildLine(raw, menu, mode));
}

export const orderTotal = (lines) => roundMoney(lines.reduce((sum, line) => sum + line.total, 0));

// Modification par l'équipe : une ligne gardée ({ keep: index, qty }) conserve son prix d'origine,
// un nouvel article ({ itemId, qty, options, note }) est chiffré avec la carte actuelle.
export function editLines(order, rawLines, menu) {
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    throw new OrderError('La commande doit garder au moins un article. Sinon, annulez-la.');
  }
  return rawLines.slice(0, MAX_LINES).map((raw) => {
    if (!Number.isInteger(raw?.keep)) return buildLine(raw, menu);
    const kept = order.lines[raw.keep];
    if (!kept) throw new OrderError('Ligne inconnue');
    const qty = clampQty(raw.qty);
    return { ...kept, qty, total: roundMoney(kept.unitPrice * qty) };
  });
}

export function assertEditable(order) {
  if (isFinal(order.status)) {
    throw new OrderError('Cette commande est terminée, elle ne peut plus être modifiée.', { status: 409, code: 'order_closed' });
  }
}

// seenStatus : le statut que l'employé voyait à l'écran. Si un collègue l'a changé entre-temps, on refuse
// au lieu d'écraser son geste.
export function assertTransition(order, nextStatus, seenStatus) {
  if (order.status === nextStatus) return;
  if (isFinal(order.status) || (seenStatus && seenStatus !== order.status)) {
    const label = STATUS_LABELS[order.status].toLowerCase();
    throw new OrderError(`La commande n° ${order.number} est déjà « ${label} » : un collègue l'a changée.`, {
      status: 409,
      code: 'status_conflict',
    });
  }
}

// placement : { mode, table } sur place, ou { mode, table: null, customerName, pickupAt, status } à emporter.
export function newOrder({ placement, lines, lang, now = new Date() }) {
  const at = now.toISOString();
  const { status = ORDER_STATUS.NEW, ...where } = placement;
  return {
    id: crypto.randomUUID(),
    ...where,
    lang,
    lines,
    total: orderTotal(lines),
    status,
    statusHistory: [{ status, at }],
    createdAt: at,
    updatedAt: at,
  };
}

// Changement de statut, gardé dans l'historique pour le temps de préparation et les statistiques.
export function statusChange(order, status, now = new Date()) {
  const at = now.toISOString();
  return { status, updatedAt: at, statusHistory: [...(order.statusHistory || []), { status, at }] };
}
