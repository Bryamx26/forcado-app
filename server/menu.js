// Carte de départ, chargée la toute première fois (base vide).
// Ensuite, la carte se gère depuis l'espace employés (onglet Carte) et vit dans la base.
// Textes en français, néerlandais, anglais et portugais. Les prix et les allergènes sont indicatifs : à remplacer par la vraie carte de Forcado.
export const defaultMenu = [
  {
    id: 'patisseries',
    name: { fr: 'Pâtisseries', nl: 'Gebak', en: 'Pastries', pt: 'Pastelaria' },
    items: [
      {
        id: 'nata',
        name: 'Pastel de nata',
        description: { fr: 'Le classique : pâte feuilletée croustillante et crème cuite caramélisée.', nl: 'De klassieker: krokant bladerdeeg en gekarameliseerde room.', en: 'The classic: crisp puff pastry and caramelised custard.', pt: 'O clássico: massa folhada estaladiça e creme caramelizado.' },
        price: 1.9,
        emoji: '🥧',
        image: '/produits/nata.jpg',
        allergens: ['gluten', 'oeufs', 'lait'],
        mayContain: ['fruits_coque'],
        options: [
          { id: 'topping', name: { fr: 'Garniture', nl: 'Vulling', en: 'Topping', pt: 'Cobertura' }, type: 'single', required: true, choices: [
            { id: 'nature', name: { fr: 'Nature', nl: 'Natuur', en: 'Plain', pt: 'Simples' }, price: 0 },
            { id: 'cannelle', name: { fr: 'Cannelle', nl: 'Kaneel', en: 'Cinnamon', pt: 'Canela' }, price: 0 },
            { id: 'sucre', name: { fr: 'Sucre glace', nl: 'Poedersuiker', en: 'Icing sugar', pt: 'Açúcar em pó' }, price: 0 },
            { id: 'cannelle-sucre', name: { fr: 'Cannelle + sucre glace', nl: 'Kaneel + poedersuiker', en: 'Cinnamon + icing sugar', pt: 'Canela + açúcar em pó' }, price: 0 },
          ] },
          { id: 'chaud', name: { fr: 'Service', nl: 'Opdienen', en: 'Serving', pt: 'Serviço' }, type: 'single', required: true, choices: [
            { id: 'tiede', name: { fr: 'Tiède', nl: 'Lauw', en: 'Warm', pt: 'Morno' }, price: 0 },
            { id: 'ambiant', name: { fr: 'Température ambiante', nl: 'Kamertemperatuur', en: 'Room temperature', pt: 'Temperatura ambiente' }, price: 0 },
          ] },
        ],
      },
      {
        id: 'berlim',
        name: 'Bola de Berlim',
        description: { fr: 'Beignet moelleux roulé dans le sucre.', nl: 'Zachte oliebol, gerold in suiker.', en: 'Soft doughnut rolled in sugar.', pt: 'Bola macia passada por açúcar.' },
        price: 2.8,
        emoji: '🍩',
        allergens: ['gluten', 'oeufs', 'lait'],
        mayContain: ['fruits_coque', 'soja'],
        options: [
          { id: 'garniture', name: { fr: 'Garniture', nl: 'Vulling', en: 'Topping', pt: 'Cobertura' }, type: 'single', required: true, choices: [
            { id: 'creme', name: { fr: 'Crème pâtissière', nl: 'Banketbakkersroom', en: 'Custard', pt: 'Creme pasteleiro' }, price: 0 },
            { id: 'sans', name: { fr: 'Sans garniture', nl: 'Zonder vulling', en: 'No filling', pt: 'Sem recheio' }, price: -0.3 },
            { id: 'chocolat', name: { fr: 'Chocolat', nl: 'Chocolade', en: 'Chocolate', pt: 'Chocolate' }, price: 0.3 },
          ] },
        ],
      },
      {
        id: 'pao-deus',
        name: 'Pão de Deus',
        description: { fr: 'Brioche garnie de noix de coco râpée.', nl: 'Brioche met geraspte kokos.', en: 'Brioche topped with grated coconut.', pt: 'Brioche coberto com coco ralado.' },
        price: 2.5,
        emoji: '🥯',
        allergens: ['gluten', 'oeufs', 'lait'],
        mayContain: ['fruits_coque'],
        options: [
          { id: 'extras', name: { fr: 'Avec', nl: 'Met', en: 'With', pt: 'Com' }, type: 'multi', choices: [
            { id: 'beurre', name: { fr: 'Beurre', nl: 'Boter', en: 'Butter', pt: 'Manteiga' }, price: 0.5 },
            { id: 'jambon', name: { fr: 'Jambon', nl: 'Ham', en: 'Ham', pt: 'Fiambre' }, price: 1.2 },
            { id: 'fromage', name: { fr: 'Fromage', nl: 'Kaas', en: 'Cheese', pt: 'Queijo' }, price: 1.2 },
          ] },
        ],
      },
      {
        id: 'travesseiro',
        name: 'Travesseiro de Sintra',
        description: { fr: "Feuilleté roulé à la crème d'amande et d'œuf.", nl: 'Opgerold bladerdeeg met amandel- en eiercrème.', en: 'Rolled puff pastry with almond and egg cream.', pt: 'Folhado enrolado com creme de amêndoa e ovo.' },
        price: 2.9,
        emoji: '🥐',
        allergens: ['gluten', 'oeufs', 'lait', 'fruits_coque'],
        mayContain: [],
        options: [],
      },
      {
        id: 'queijada',
        name: 'Queijada',
        description: { fr: 'Petite tartelette au fromage frais et à la cannelle.', nl: 'Taartje met verse kaas en kaneel.', en: 'Small fresh-cheese and cinnamon tart.', pt: 'Pequena tarte de queijo fresco e canela.' },
        price: 2.2,
        emoji: '🧁',
        allergens: ['gluten', 'oeufs', 'lait'],
        mayContain: ['fruits_coque'],
        options: [],
      },
      {
        id: 'bolo-arroz',
        name: 'Bolo de arroz',
        description: { fr: 'Muffin à la farine de riz, léger et citronné.', nl: 'Muffin van rijstmeel, licht en citroenachtig.', en: 'Rice-flour muffin, light and lemony.', pt: 'Bolo de farinha de arroz, leve e com limão.' },
        price: 2.0,
        emoji: '🍰',
        allergens: ['gluten', 'oeufs', 'lait'],
        mayContain: ['fruits_coque'],
        options: [],
      },
    ],
  },
  {
    id: 'boissons',
    name: { fr: 'Boissons', nl: 'Dranken', en: 'Drinks', pt: 'Bebidas' },
    items: [
      {
        id: 'bica',
        name: 'Bica',
        description: { fr: "L'expresso portugais, court et intense.", nl: 'De Portugese espresso, kort en intens.', en: 'The Portuguese espresso, short and intense.', pt: 'O café português, curto e intenso.' },
        price: 1.8,
        emoji: '☕',
        allergens: [],
        mayContain: [],
        options: [
          { id: 'sucre', name: { fr: 'Sucre', nl: 'Suiker', en: 'Sugar', pt: 'Açúcar' }, type: 'single', required: true, choices: [
            { id: 'sans', name: { fr: 'Sans sucre', nl: 'Zonder suiker', en: 'No sugar', pt: 'Sem açúcar' }, price: 0 },
            { id: 'avec', name: { fr: 'Avec sucre', nl: 'Met suiker', en: 'With sugar', pt: 'Com açúcar' }, price: 0 },
          ] },
        ],
      },
      {
        id: 'galao',
        name: 'Galão',
        description: { fr: 'Expresso allongé de lait chaud, servi en verre.', nl: 'Espresso met warme melk, geserveerd in een glas.', en: 'Espresso topped up with hot milk, served in a glass.', pt: 'Café com leite quente, servido em copo.' },
        price: 3.2,
        emoji: '🥛',
        allergens: ['lait'],
        mayContain: ['soja'],
        options: [
          { id: 'lait', name: { fr: 'Lait', nl: 'Melk', en: 'Milk', pt: 'Leite' }, type: 'single', required: true, choices: [
            { id: 'vache', name: { fr: 'Lait entier', nl: 'Volle melk', en: 'Whole milk', pt: 'Leite gordo' }, price: 0 },
            { id: 'avoine', name: { fr: 'Avoine', nl: 'Haver', en: 'Oat', pt: 'Aveia' }, price: 0.4 },
            { id: 'soja', name: 'Soja', price: 0.4 },
          ] },
          { id: 'taille', name: { fr: 'Taille', nl: 'Formaat', en: 'Size', pt: 'Tamanho' }, type: 'single', required: true, choices: [
            { id: 'normal', name: { fr: 'Normal', nl: 'Normaal', en: 'Regular', pt: 'Normal' }, price: 0 },
            { id: 'grand', name: { fr: 'Grand', nl: 'Groot', en: 'Large', pt: 'Grande' }, price: 0.8 },
          ] },
          { id: 'extras', name: 'Extras', type: 'multi', choices: [
            { id: 'double', name: 'Double shot', price: 0.6 },
            { id: 'cannelle', name: { fr: 'Cannelle', nl: 'Kaneel', en: 'Cinnamon', pt: 'Canela' }, price: 0 },
          ] },
        ],
      },
      {
        id: 'cha',
        name: { fr: 'Thé', nl: 'Thee', en: 'Tea', pt: 'Chá' },
        description: { fr: 'Sélection de thés en infusion.', nl: 'Selectie van thee.', en: 'A selection of teas.', pt: 'Seleção de chás.' },
        price: 2.8,
        emoji: '🍵',
        allergens: [],
        mayContain: [],
        options: [
          { id: 'variete', name: { fr: 'Variété', nl: 'Soort', en: 'Variety', pt: 'Variedade' }, type: 'single', required: true, choices: [
            { id: 'vert', name: { fr: 'Vert', nl: 'Groen', en: 'Green', pt: 'Verde' }, price: 0 },
            { id: 'noir', name: { fr: 'Noir', nl: 'Zwart', en: 'Black', pt: 'Preto' }, price: 0 },
            { id: 'menthe', name: { fr: 'Menthe', nl: 'Munt', en: 'Mint', pt: 'Menta' }, price: 0 },
          ] },
        ],
      },
      {
        id: 'jus',
        name: { fr: "Jus d'orange pressé", nl: 'Versgeperst sinaasappelsap', en: 'Fresh orange juice', pt: 'Sumo de laranja natural' },
        description: { fr: 'Pressé à la minute.', nl: 'Vers geperst.', en: 'Freshly squeezed.', pt: 'Espremido na hora.' },
        price: 4.0,
        emoji: '🍊',
        allergens: [],
        mayContain: [],
        options: [
          { id: 'glace', name: { fr: 'Glaçons', nl: 'IJsblokjes', en: 'Ice', pt: 'Gelo' }, type: 'single', required: true, choices: [
            { id: 'sans', name: { fr: 'Sans glaçons', nl: 'Zonder ijsblokjes', en: 'No ice', pt: 'Sem gelo' }, price: 0 },
            { id: 'avec', name: { fr: 'Avec glaçons', nl: 'Met ijsblokjes', en: 'With ice', pt: 'Com gelo' }, price: 0 },
          ] },
        ],
      },
    ],
  },
];
