// Règles des options d'un article (lait, taille, suppléments…), partagées par le navigateur et le serveur.

// Prix unitaire d'un article avec les choix sélectionnés : { idGroupe: [idChoix, …] }.
export function unitPrice(item, selected) {
  let price = item.price;
  for (const group of item.options) {
    for (const id of selected[group.id] || []) price += group.choices.find((c) => c.id === id)?.price || 0;
  }
  return price;
}

// Noms des choix sélectionnés, dans l'ordre des groupes.
export function selectedChoiceNames(item, selected) {
  return item.options
    .flatMap((group) => (selected[group.id] || []).map((id) => group.choices.find((c) => c.id === id)?.name))
    .filter(Boolean);
}

// Sélection de départ : le premier choix de chaque groupe obligatoire.
export function defaultSelection(item) {
  return Object.fromEntries(item.options.map((group) => [group.id, group.required ? [group.choices[0].id] : []]));
}

export const isSingleChoice = (group) => group.type === 'single';

// Coche ou décoche un choix en respectant le type du groupe.
export function toggleChoice(selected, group, choiceId) {
  if (isSingleChoice(group)) return { ...selected, [group.id]: [choiceId] };
  const current = selected[group.id] || [];
  const next = current.includes(choiceId) ? current.filter((id) => id !== choiceId) : [...current, choiceId];
  return { ...selected, [group.id]: next };
}
