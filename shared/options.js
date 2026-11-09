// Règles des options d'un article (lait, taille, suppléments…), partagées par le navigateur et le serveur.
//
// Un groupe d'options : { id, name, min, max, choices: [{ id, name, price, default? }] }.
// Une ancienne carte décrit les groupes par type ('single' | 'multi') et required : groupLimits() traduit les deux.

export function groupLimits(group) {
  if (Number.isInteger(group.min) && Number.isInteger(group.max)) return { min: group.min, max: group.max };
  if (group.type === 'multi') return { min: 0, max: group.choices.length };
  return { min: group.required === false ? 0 : 1, max: 1 };
}

export const isSingleChoice = (group) => groupLimits(group).max === 1;
export const isRequired = (group) => groupLimits(group).min > 0;

// Clé de disponibilité d'un choix. Un choix d'un groupe partagé (setId) est épuisé pour tous les articles à la fois.
export const choiceKey = (itemId, group, choiceId) => `choice:${group.setId ? `set-${group.setId}` : itemId}/${group.id}/${choiceId}`;

// Groupes d'un article : d'abord les groupes partagés qu'il utilise, puis les siens.
export function expandOptions(item, optionSets = []) {
  const shared = (item.optionSetIds || [])
    .map((id) => optionSets.find((set) => set.id === id))
    .filter(Boolean)
    .map((set) => ({ ...set, setId: set.id }));
  return [...shared, ...(item.options || [])];
}

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

// Sélection de départ : les choix marqués « par défaut », sinon les premiers choix disponibles d'un groupe obligatoire.
function defaultChoiceIds(group) {
  const { min, max } = groupLimits(group);
  const available = group.choices.filter((c) => !c.soldOut);
  const marked = available.filter((c) => c.default);
  const picked = marked.length ? marked : available.slice(0, min);
  return picked.slice(0, max).map((c) => c.id);
}

export function defaultSelection(item) {
  return Object.fromEntries(item.options.map((group) => [group.id, defaultChoiceIds(group)]));
}

// Coche ou décoche un choix sans dépasser le maximum du groupe.
export function toggleChoice(selected, group, choiceId) {
  if (isSingleChoice(group)) return { ...selected, [group.id]: [choiceId] };
  const current = selected[group.id] || [];
  if (current.includes(choiceId)) return { ...selected, [group.id]: current.filter((id) => id !== choiceId) };
  if (current.length >= groupLimits(group).max) return selected;
  return { ...selected, [group.id]: [...current, choiceId] };
}

// Choix valides pour un groupe : identifiants connus, sans doublon, au plus max.
export function pickChoices(group, rawIds) {
  const ids = [...new Set(Array.isArray(rawIds) ? rawIds : rawIds == null ? [] : [rawIds])];
  return ids.map((id) => group.choices.find((c) => c.id === id)).filter(Boolean);
}

// Ce qu'un groupe demande au client, pour l'indication à côté de son nom.
export function limitsHint(group) {
  const { min, max } = groupLimits(group);
  if (max === 1) return min === 1 ? { key: 'options.one' } : { key: 'options.optionalOne' };
  if (min === 0) return { key: 'options.upTo', vars: { max } };
  if (min === max) return { key: 'options.exactly', vars: { count: min } };
  return { key: 'options.between', vars: { min, max } };
}

// Vrai quand chaque groupe a un nombre de choix entre son minimum et son maximum.
export function isSelectionComplete(item, selected) {
  return item.options.every((group) => {
    const { min, max } = groupLimits(group);
    const count = (selected[group.id] || []).length;
    return count >= min && count <= max;
  });
}
