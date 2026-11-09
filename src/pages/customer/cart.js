import { unitPrice } from '../../../shared/options.js';

// Le panier suit la carte actuelle : si l'équipe change un prix ou retire un article pendant que le client
// choisit, il le voit avant d'envoyer (le serveur facture toujours au prix de la carte).
export function priceCart(cart, menu) {
  if (!menu) return cart.map((line) => ({ ...line, price: unitPrice(line.item, line.options) }));
  const items = new Map(menu.flatMap((c) => c.items).map((i) => [i.id, i]));
  return cart.map((line) => {
    const item = items.get(line.item.id);
    return item ? { ...line, item, price: unitPrice(item, line.options) } : { ...line, gone: true, price: 0 };
  });
}

export const cartTotal = (lines) => lines.reduce((sum, line) => sum + line.price * line.qty, 0);
export const cartCount = (lines) => lines.reduce((sum, line) => sum + line.qty, 0);

export const soldOutItemIds = (menu) => new Set((menu || []).flatMap((c) => c.items.filter((i) => i.soldOut).map((i) => i.id)));

// Ce que le serveur attend : identifiants et choix, jamais de prix.
export const toOrderLines = (cart) => cart.map((l) => ({ itemId: l.item.id, qty: l.qty, options: l.options, note: l.note }));
