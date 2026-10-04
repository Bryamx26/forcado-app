// Carte d'exemple inspirée d'une pastelaria portugaise.
// Les prix sont indicatifs : à remplacer par la vraie carte de Forcado.
export const menu = [
  {
    id: 'patisseries',
    name: 'Pâtisseries',
    items: [
      {
        id: 'nata',
        name: 'Pastel de nata',
        description: 'Le classique : pâte feuilletée croustillante et crème cuite caramélisée.',
        price: 1.9,
        emoji: '🥧',
        options: [
          { id: 'topping', name: 'Garniture', type: 'single', required: true, choices: [
            { id: 'nature', name: 'Nature', price: 0 },
            { id: 'cannelle', name: 'Cannelle', price: 0 },
            { id: 'sucre', name: 'Sucre glace', price: 0 },
            { id: 'cannelle-sucre', name: 'Cannelle + sucre glace', price: 0 },
          ] },
          { id: 'chaud', name: 'Service', type: 'single', required: true, choices: [
            { id: 'tiede', name: 'Tiède', price: 0 },
            { id: 'ambiant', name: 'Température ambiante', price: 0 },
          ] },
        ],
      },
      {
        id: 'berlim',
        name: 'Bola de Berlim',
        description: 'Beignet moelleux roulé dans le sucre.',
        price: 2.8,
        emoji: '🍩',
        options: [
          { id: 'garniture', name: 'Garniture', type: 'single', required: true, choices: [
            { id: 'creme', name: 'Crème pâtissière', price: 0 },
            { id: 'sans', name: 'Sans garniture', price: -0.3 },
            { id: 'chocolat', name: 'Chocolat', price: 0.3 },
          ] },
        ],
      },
      {
        id: 'pao-deus',
        name: 'Pão de Deus',
        description: 'Brioche garnie de noix de coco râpée.',
        price: 2.5,
        emoji: '🥯',
        options: [
          { id: 'extras', name: 'Avec', type: 'multi', choices: [
            { id: 'beurre', name: 'Beurre', price: 0.5 },
            { id: 'jambon', name: 'Jambon', price: 1.2 },
            { id: 'fromage', name: 'Fromage', price: 1.2 },
          ] },
        ],
      },
      {
        id: 'travesseiro',
        name: 'Travesseiro de Sintra',
        description: 'Feuilleté roulé à la crème d\'amande et d\'œuf.',
        price: 2.9,
        emoji: '🥐',
        options: [],
      },
      {
        id: 'queijada',
        name: 'Queijada',
        description: 'Petite tartelette au fromage frais et à la cannelle.',
        price: 2.2,
        emoji: '🧁',
        options: [],
      },
      {
        id: 'bolo-arroz',
        name: 'Bolo de arroz',
        description: 'Muffin à la farine de riz, léger et citronné.',
        price: 2.0,
        emoji: '🍰',
        options: [],
      },
    ],
  },
  {
    id: 'boissons',
    name: 'Boissons',
    items: [
      {
        id: 'bica',
        name: 'Bica',
        description: 'L\'expresso portugais, court et intense.',
        price: 1.8,
        emoji: '☕',
        options: [
          { id: 'sucre', name: 'Sucre', type: 'single', required: true, choices: [
            { id: 'sans', name: 'Sans sucre', price: 0 },
            { id: 'avec', name: 'Avec sucre', price: 0 },
          ] },
        ],
      },
      {
        id: 'galao',
        name: 'Galão',
        description: 'Expresso allongé de lait chaud, servi en verre.',
        price: 3.2,
        emoji: '🥛',
        options: [
          { id: 'lait', name: 'Lait', type: 'single', required: true, choices: [
            { id: 'vache', name: 'Lait entier', price: 0 },
            { id: 'avoine', name: 'Avoine', price: 0.4 },
            { id: 'soja', name: 'Soja', price: 0.4 },
          ] },
          { id: 'taille', name: 'Taille', type: 'single', required: true, choices: [
            { id: 'normal', name: 'Normal', price: 0 },
            { id: 'grand', name: 'Grand', price: 0.8 },
          ] },
          { id: 'extras', name: 'Extras', type: 'multi', choices: [
            { id: 'double', name: 'Double shot', price: 0.6 },
            { id: 'cannelle', name: 'Cannelle', price: 0 },
          ] },
        ],
      },
      {
        id: 'cha',
        name: 'Thé',
        description: 'Sélection de thés en infusion.',
        price: 2.8,
        emoji: '🍵',
        options: [
          { id: 'variete', name: 'Variété', type: 'single', required: true, choices: [
            { id: 'vert', name: 'Vert', price: 0 },
            { id: 'noir', name: 'Noir', price: 0 },
            { id: 'menthe', name: 'Menthe', price: 0 },
          ] },
        ],
      },
      {
        id: 'jus',
        name: 'Jus d\'orange pressé',
        description: 'Pressé à la minute.',
        price: 4.0,
        emoji: '🍊',
        options: [
          { id: 'glace', name: 'Glaçons', type: 'single', required: true, choices: [
            { id: 'sans', name: 'Sans glaçons', price: 0 },
            { id: 'avec', name: 'Avec glaçons', price: 0 },
          ] },
        ],
      },
    ],
  },
];

export function findItem(id) {
  for (const cat of menu) {
    const item = cat.items.find((i) => i.id === id);
    if (item) return item;
  }
  return null;
}
