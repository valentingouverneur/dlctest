// DLC v2 — sample data (alimentaire GMS)

export const DLC_PRODUCTS = [
  { ean: '3033710065684', title: 'Cordon Bleu de Volaille x4', brand: 'Le Gaulois', weight: '400 g', cat: 'Frais', color: '#E8DCC4' },
  { ean: '3270190022862', title: 'Poisson Pané au Cabillaud x10', brand: 'Findus', weight: '600 g', cat: 'Surgelés', color: '#D5DEE6' },
  { ean: '3175680011459', title: "Sardines à l'huile d'olive", brand: 'La Belle-Iloise', weight: '115 g', cat: 'Épicerie', color: '#E4D9C2' },
  { ean: '8711327373105', title: "Ben & Jerry's Cookie Dough", brand: "Ben & Jerry's", weight: '465 ml', cat: 'Surgelés', color: '#7BB342', imageUrl: 'assets/8711327373105.jpg' },
  { ean: '3266980006891', title: 'Glace Vanille Bourbon', brand: 'Twister', weight: '8 x 50 ml', cat: 'Surgelés', color: '#E5DDD0' },
  { ean: '3245412567980', title: 'Émincés de Poulet Rôti', brand: 'Le Gaulois', weight: '150 g', cat: 'Frais', color: '#EDE3CC' },
  { ean: '3017624010701', title: 'Pâte à Tartiner Noisettes', brand: 'Nutella', weight: '750 g', cat: 'Épicerie', color: '#E8D8B8' },
  { ean: '3270190114567', title: 'Croque-Monsieur Jambon Emmental x2', brand: 'Findus', weight: '200 g', cat: 'Surgelés', color: '#DDE0CB' },
  { ean: '3175680077461', title: 'Maquereaux à la Tomate', brand: 'La Belle-Iloise', weight: '169 g', cat: 'Épicerie', color: '#E6CFC0' },
  { ean: '3033491111111', title: 'Nuggets de Poulet x20', brand: 'Le Gaulois', weight: '500 g', cat: 'Surgelés', color: '#EAE0C8' },
  { ean: '3245414587621', title: 'Riz au Lait Vanille x4', brand: 'La Laitière', weight: '4 x 115 g', cat: 'Frais', color: '#EDE7DC' },
  { ean: '3175680066540', title: "Thon Blanc Germon à l'Huile d'Olive", brand: 'La Belle-Iloise', weight: '160 g', cat: 'Épicerie', color: '#DDD3BF' },
  { ean: '3270190009023', title: 'Brandade de Morue Parmentière', brand: 'Findus', weight: '450 g', cat: 'Surgelés', color: '#E4DBC6' },
  { ean: '3033491022226', title: 'Escalopes de Dinde', brand: 'Le Gaulois', weight: '300 g', cat: 'Frais', color: '#ECE3CD', manual: true },
  { ean: '3266980015114', title: 'Bâtonnets Glacés Chocolat x6', brand: 'Twister', weight: '6 x 65 ml', cat: 'Surgelés', color: '#D8CCB8' },
  { ean: '3017620422003', title: 'Biscuits Petits Beurre', brand: 'LU', weight: '200 g', cat: 'Épicerie', color: '#E6D8B8', manual: true },
  { ean: '3245412987650', title: 'Yaourts Brassés Fruits Mixés x8', brand: 'La Laitière', weight: '8 x 125 g', cat: 'Frais', color: '#E6DCC8' },
  { ean: '3270190008767', title: 'Beignets de Poulet Crispy', brand: 'Findus', weight: '450 g', cat: 'Surgelés', color: '#E4D6BC' },
  { ean: '3175680022554', title: 'Rillettes de Sardine au Citron', brand: 'La Belle-Iloise', weight: '60 g', cat: 'Épicerie', color: '#E0D2BB' },
  { ean: '3033491045544', title: 'Saucisses de Strasbourg x10', brand: 'Le Gaulois', weight: '350 g', cat: 'Frais', color: '#E8D6C2' },
  { ean: '3266980030009', title: 'Cornets Glacés Vanille Caramel x6', brand: 'Twister', weight: '6 x 120 ml', cat: 'Surgelés', color: '#E5D9C2', manual: true },
];

export const DLC_DUE = [
  { ...DLC_PRODUCTS[0], dueDate: '2026-05-02', daysLeft: 1 },
  { ...DLC_PRODUCTS[4], dueDate: '2026-05-03', daysLeft: 2 },
  { ...DLC_PRODUCTS[12], dueDate: '2026-05-03', daysLeft: 2 },
  { ...DLC_PRODUCTS[6], dueDate: '2026-05-05', daysLeft: 4 },
  { ...DLC_PRODUCTS[15], dueDate: '2026-05-08', daysLeft: 7 },
  { ...DLC_PRODUCTS[1], dueDate: '2026-05-12', daysLeft: 11 },
];
