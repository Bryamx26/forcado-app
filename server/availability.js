// Ruptures du jour : articles et choix marqués « épuisé » par l'équipe, ajoutés à la carte servie aux clients.
import { getMenu } from './catalog.js';
import { store } from './store.js';
import { choiceKey } from '../shared/options.js';

const markGroup = (item, group, soldOut) => ({
  ...group,
  choices: group.choices.map((choice) => ({ ...choice, soldOut: soldOut.has(choiceKey(item.id, group, choice.id)) })),
});

export function markAvailability(menu, soldOut) {
  return menu.map((cat) => ({
    ...cat,
    items: cat.items.map((item) => ({
      ...item,
      soldOut: soldOut.has(item.id),
      options: item.options.map((group) => markGroup(item, group, soldOut)),
    })),
  }));
}

export async function soldOutSet() {
  return new Set(await store.soldOut());
}

// Carte du client : traduite, avec les ruptures. C'est aussi celle qui chiffre et contrôle ses commandes.
export async function customerMenu(lang) {
  const [menu, soldOut] = await Promise.all([getMenu(lang), soldOutSet()]);
  return markAvailability(menu, soldOut);
}

// Vrai si la clé désigne bien un choix de la carte actuelle.
export async function isKnownChoice(key) {
  const menu = await getMenu();
  return menu.some((cat) => cat.items.some((item) => item.options.some((g) => g.choices.some((c) => choiceKey(item.id, g, c.id) === key))));
}
