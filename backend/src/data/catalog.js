// Seed catalogue. Prices are integer paise (₹49 – ₹799). `daysAgo` only sets
// createdAt on first insert so "newest" sorting has something to sort. Ratings and
// review counts are not listed here: the seed derives them from REVIEWS.

const unsplash = (id) => `https://images.unsplash.com/photo-${id}?w=900&q=80&auto=format&fit=crop`;

// Every URL below was checked with `curl -sI` (HTTP 200, image/jpeg).
const IMAGES = {
  'holo-cat-sticker-pack': [unsplash('1625768375625-b61dac6a6202'), unsplash('1790065803471-3040c2e33769')],
  'plant-parent-sticker-sheet': [unsplash('1603959823148-f60a3f4d4b09'), unsplash('1590102426028-bf1ed6b354f5')],
  'retro-sunset-sticker': [unsplash('1706466615917-e44750d177d7'), unsplash('1717703943629-9a6d04e7adbb')],
  'deadline-mood-sticker-set': [unsplash('1714859100552-3e432e8f3981'), unsplash('1589325788132-fb855c348c3a')],
  'tiny-avocado-enamel-pin': [unsplash('1523049673857-eb18f1d7b578'), unsplash('1785088561362-6f3d1584c31d')],
  'paper-plane-enamel-pin': [unsplash('1742823275436-accdf6eab3bf'), unsplash('1791340447372-fd752d26b004')],
  'cutting-chai-enamel-pin': [unsplash('1628702773947-1bcd12856811'), unsplash('1720875733075-fd8494df7908')],
  'retro-cassette-keychain': [unsplash('1585435669168-f4cc3f5d1b8e'), unsplash('1687363714985-990685339050')],
  'midnight-gel-pen-trio': [unsplash('1628621317388-6ebde0c18574'), unsplash('1601311911926-dbdae16e54c9')],
  'pocket-dot-grid-notebook': [unsplash('1787640619073-3dcb10c316c4'), unsplash('1743385779483-ceb9cc28117e')],
  'pastel-washi-tape-set': [unsplash('1777401085858-12a3e267a6f8'), unsplash('1785668709724-52ddd2f2c086')],
  'neon-mini-highlighters': [unsplash('1771868421764-a3de7fd9c4c1'), unsplash('1769794371008-954a71d95ce8')],
  'brass-paper-clips': [unsplash('1512278753435-c834ff8a597a'), unsplash('1581302142327-4e6a9535747a')],
  'felt-mini-cactus': [unsplash('1459411552884-841db9b3cc2a'), unsplash('1528476513691-07e6f563d97f')],
  'sticky-note-cube': [unsplash('1568219557405-376e23e4f7cf'), unsplash('1759868937753-34859b641bc1')],
  'approved-rubber-stamp': [unsplash('1619418602850-35ad20aa1700'), unsplash('1761624867836-a87e33d020c6')],
  'velcro-cable-ties': [unsplash('1760348213270-7cd00b8c3405'), unsplash('1634839763121-58fcfed2a94a')],
  'pop-phone-grip': [unsplash('1763989724074-e0619abafea9'), unsplash('1760744633470-86915d6446e3')],
  'webcam-privacy-slider': [unsplash('1755155469427-a61921d9cf01'), unsplash('1762681290673-ba1ad4ea0875')],
  'cable-saver-springs': [unsplash('1572721546624-05bf65ad7679'), unsplash('1587037542794-6ca5f4772330')],
  'sour-gummy-worms-tin': [unsplash('1516747773440-e114ee0d3c07'), unsplash('1499195333224-3ce974eecb47')],
  'kacha-aam-candy': [unsplash('1685478677352-43868751fb8e'), unsplash('1588755821761-a4d1eafe2b19')],
  'dark-chocolate-coins': [unsplash('1780932168865-b771a469d282'), unsplash('1772986258634-a729cd51aea4')],
  'peppermint-pocket-tin': [unsplash('1788387101924-ccee55f94b2c'), unsplash('1766504965754-e4482c1f60e7')],
};

const product = (fields) => ({ badges: [], tags: [], ...fields, images: IMAGES[fields.slug] });

export const PRODUCTS = [
  // ── Stickers ────────────────────────────────────────────────────────────
  product({
    slug: 'holo-cat-sticker-pack',
    name: 'Holo Cat Sticker Pack',
    tagline: 'Eight cats. Zero shedding.',
    description:
      'Eight die-cut holographic cats that catch the light every time you open your laptop. Waterproof vinyl with a scratch-proof laminate, and they peel off clean when you inevitably rearrange them.',
    category: 'stickers',
    price: 19900,
    compareAtPrice: 24900,
    stock: 140,
    tags: ['cats', 'holographic', 'laptop', 'waterproof'],
    badges: ['bestseller'],
    daysAgo: 120,
  }),
  product({
    slug: 'plant-parent-sticker-sheet',
    name: 'Plant Parent Sticker Sheet',
    tagline: 'Impossible to overwater.',
    description:
      'Twelve leafy friends on one matte sheet: monstera, pothos and a smug little cactus. Made for journals, planners and water bottles. No sunlight required.',
    category: 'stickers',
    price: 14900,
    stock: 96,
    tags: ['plants', 'journaling', 'matte'],
    daysAgo: 95,
  }),
  product({
    slug: 'retro-sunset-sticker',
    name: 'Retro Sunset Die-Cut Sticker',
    tagline: 'Golden hour, on demand.',
    description:
      'A three-inch slice of seventies sunset in thick waterproof vinyl. Stick it on a laptop, a bottle or a bike and enjoy golden hour at 9 a.m.',
    category: 'stickers',
    price: 9900,
    stock: 200,
    tags: ['retro', 'sunset', 'laptop', 'waterproof'],
    badges: ['new'],
    daysAgo: 4,
  }),
  product({
    slug: 'deadline-mood-sticker-set',
    name: 'Deadline Mood Sticker Set',
    tagline: "For every stage of 'almost done'.",
    description:
      "Six moods, from 'plenty of time' to 'this is fine'. Writable matte vinyl, so you can date-stamp your own breakdowns.",
    category: 'stickers',
    price: 17900,
    compareAtPrice: 21900,
    stock: 75,
    tags: ['funny', 'office', 'planner'],
    badges: ['bestseller'],
    daysAgo: 60,
  }),

  // ── Pins & keychains ────────────────────────────────────────────────────
  product({
    slug: 'tiny-avocado-enamel-pin',
    name: 'Tiny Avocado Enamel Pin',
    tagline: 'All of the toast. None of the brown.',
    description:
      "Hard enamel with gold-plated edges and a pit that's secretly a little heart. Comes with a rubber clutch and a backing card worth keeping.",
    category: 'pins',
    price: 29900,
    compareAtPrice: 37900,
    stock: 64,
    tags: ['enamel', 'food', 'gift'],
    badges: ['bestseller'],
    daysAgo: 110,
  }),
  product({
    slug: 'paper-plane-enamel-pin',
    name: 'Paper Plane Enamel Pin',
    tagline: 'Fly the coop. Stay on your collar.',
    description:
      "A tiny origami plane in hard enamel, mid-flight and slightly smug. Pick polished gold or silver plating; the double clutch back means it won't escape.",
    category: 'pins',
    price: 27900,
    stock: 48,
    tags: ['enamel', 'travel', 'gift'],
    colors: [
      { name: 'Gold', hex: '#C9A227' },
      { name: 'Silver', hex: '#B8BCC2' },
    ],
    badges: ['new'],
    daysAgo: 7,
  }),
  product({
    slug: 'cutting-chai-enamel-pin',
    name: 'Cutting Chai Enamel Pin',
    tagline: 'Half a glass. Full personality.',
    description:
      'A tiny cutting glass with a wisp of steam, in glossy hard enamel. Limited run, and the last batch vanished faster than the real thing at 4 p.m.',
    category: 'pins',
    price: 34900,
    stock: 0,
    tags: ['chai', 'enamel', 'desi'],
    badges: ['limited'],
    daysAgo: 30,
  }),
  product({
    slug: 'retro-cassette-keychain',
    name: 'Retro Cassette Keychain',
    tagline: 'Mixtape energy for your keys.',
    description:
      'A palm-sized acrylic cassette with reels that actually spin, on a sturdy split ring. Your keys finally have a soundtrack.',
    category: 'pins',
    price: 24900,
    stock: 3,
    tags: ['keychain', 'retro', 'music'],
    colors: [
      { name: 'Tangerine', hex: '#FF5A1F' },
      { name: 'Cobalt', hex: '#1E5EFF' },
      { name: 'Ink', hex: '#111111' },
    ],
    badges: ['limited'],
    daysAgo: 21,
  }),

  // ── Stationery ──────────────────────────────────────────────────────────
  product({
    slug: 'midnight-gel-pen-trio',
    name: 'Midnight Gel Pen Trio',
    tagline: 'Ink so smooth it feels like cheating.',
    description:
      "Three 0.5 mm gel pens in black, midnight blue and plum. Quick-dry ink that left hands won't smudge, and a click you'll do absent-mindedly in meetings.",
    category: 'stationery',
    price: 19900,
    stock: 180,
    tags: ['pens', 'gel', 'writing'],
    badges: ['bestseller'],
    daysAgo: 150,
  }),
  product({
    slug: 'pocket-dot-grid-notebook',
    name: 'Pocket Dot-Grid Notebook',
    tagline: 'Big ideas, pocket-sized.',
    description:
      "An A6 notebook with 80 pages of 100 gsm dot-grid paper that doesn't ghost. Lay-flat binding and rounded corners that survive a jeans pocket.",
    category: 'stationery',
    price: 34900,
    stock: 90,
    tags: ['notebook', 'dot grid', 'journaling'],
    colors: [
      { name: 'Paper', hex: '#F7F4EE' },
      { name: 'Tangerine', hex: '#FF5A1F' },
      { name: 'Ink', hex: '#111111' },
    ],
    daysAgo: 80,
  }),
  product({
    slug: 'pastel-washi-tape-set',
    name: 'Pastel Washi Tape Set',
    tagline: 'Decorate everything. Commit to nothing.',
    description:
      'Five rolls of Japanese-style washi in sorbet pastels. Tears by hand, repositions without drama, and makes even a grocery list look intentional.',
    category: 'stationery',
    price: 29900,
    compareAtPrice: 36900,
    stock: 120,
    tags: ['washi', 'journaling', 'pastel', 'craft'],
    badges: ['new'],
    daysAgo: 10,
  }),
  product({
    slug: 'neon-mini-highlighters',
    name: 'Neon Mini Highlighters',
    tagline: 'Make the important bits glow.',
    description:
      'Four stubby highlighters in neon yellow, pink, green and orange. Chisel tips, no bleed-through on regular paper, and small enough for any pencil case.',
    category: 'stationery',
    price: 14900,
    stock: 150,
    tags: ['highlighters', 'study', 'neon'],
    daysAgo: 70,
  }),

  // ── Desk ────────────────────────────────────────────────────────────────
  product({
    slug: 'brass-paper-clips',
    name: 'Brass Paper Clips (30)',
    tagline: 'Holding it together, literally.',
    description:
      'Thirty solid brass clips that pick up a lovely patina the longer you use them. Each one grips up to 20 sheets and quietly upgrades any desk drawer.',
    category: 'desk',
    price: 14900,
    stock: 160,
    tags: ['clips', 'brass', 'office', 'minimal'],
    daysAgo: 100,
  }),
  product({
    slug: 'felt-mini-cactus',
    name: 'Felt Mini Cactus',
    tagline: "The only plant you can't kill.",
    description:
      'A hand-stitched wool-felt cactus in a tiny terracotta pot. Zero watering, zero prickles, maximum desk cheer.',
    category: 'desk',
    price: 44900,
    stock: 40,
    tags: ['plants', 'decor', 'felt', 'gift'],
    badges: ['new'],
    daysAgo: 2,
  }),
  product({
    slug: 'sticky-note-cube',
    name: 'Sticky Note Cube',
    tagline: "400 tiny reminders you'll actually read.",
    description:
      'A chunky cube of 400 sticky notes in four warm colours. Strong enough to hold on a monitor, gentle enough to let go of a book without tearing pages.',
    category: 'desk',
    price: 24900,
    compareAtPrice: 29900,
    stock: 110,
    tags: ['sticky notes', 'office', 'planning'],
    daysAgo: 55,
  }),
  product({
    slug: 'approved-rubber-stamp',
    name: "'Approved' Mini Rubber Stamp",
    tagline: 'Make every decision feel official.',
    description:
      "A palm-sized wooden stamp that says APPROVED in bold vintage type. Use it on to-do lists, lunch orders and your friend's questionable plans. Works with any standard ink pad.",
    category: 'desk',
    price: 39900,
    stock: 55,
    tags: ['stamp', 'office', 'funny'],
    badges: ['limited'],
    daysAgo: 40,
  }),

  // ── Tech ────────────────────────────────────────────────────────────────
  product({
    slug: 'velcro-cable-ties',
    name: 'Velcro Cable Ties (10)',
    tagline: 'Tame the spaghetti.',
    description:
      'Ten reusable hook-and-loop ties for chargers, headphones and the mystery cable behind your monitor. Colour-coded and endlessly re-wrappable.',
    category: 'tech',
    price: 19900,
    stock: 175,
    tags: ['cables', 'organisation', 'desk setup'],
    colors: [
      { name: 'Ink', hex: '#111111' },
      { name: 'Tangerine', hex: '#FF5A1F' },
    ],
    badges: ['bestseller'],
    daysAgo: 130,
  }),
  product({
    slug: 'pop-phone-grip',
    name: 'Pop-Out Phone Grip',
    tagline: 'Hold on. Literally.',
    description:
      "A collapsible grip and stand that sticks to the back of your phone or case. One-handed scrolling, hands-free video calls, and a satisfying pop you'll fidget with all day.",
    category: 'tech',
    price: 34900,
    stock: 85,
    tags: ['phone', 'grip', 'stand'],
    colors: [
      { name: 'Tangerine', hex: '#FF5A1F' },
      { name: 'Cobalt', hex: '#1E5EFF' },
      { name: 'Sage', hex: '#9CAF88' },
      { name: 'Ink', hex: '#111111' },
    ],
    badges: ['new'],
    daysAgo: 5,
  }),
  product({
    slug: 'webcam-privacy-slider',
    name: 'Webcam Privacy Slider (3)',
    tagline: 'Camera off, for real.',
    description:
      "Three ultra-thin sliders for your laptop, tablet or monitor camera. At 0.7 mm your lid still closes, and they slide open only when you're camera-ready.",
    category: 'tech',
    price: 14900,
    stock: 140,
    tags: ['privacy', 'laptop', 'webcam'],
    daysAgo: 90,
  }),
  product({
    slug: 'cable-saver-springs',
    name: 'Cable Saver Springs (4)',
    tagline: 'Stop the fray before it starts.',
    description:
      "Four flexible springs that wrap the weakest spot on your charging cables. They snap on in seconds and add months to a cable's life.",
    category: 'tech',
    price: 9900,
    stock: 130,
    tags: ['cables', 'charging', 'protection'],
    colors: [
      { name: 'Mint', hex: '#7FD1B9' },
      { name: 'Peach', hex: '#FFB38A' },
    ],
    daysAgo: 65,
  }),

  // ── Snacks ──────────────────────────────────────────────────────────────
  product({
    slug: 'sour-gummy-worms-tin',
    name: 'Sour Gummy Worms Tin',
    tagline: 'Pucker up, desk buddy.',
    description:
      "A pocket tin of sugar-dusted sour worms in four fruit flavours. Equal parts wince and grin, and resealable for 'just one more'.",
    category: 'snacks',
    price: 14900,
    stock: 120,
    tags: ['candy', 'sour', 'gummies'],
    badges: ['bestseller'],
    daysAgo: 85,
  }),
  product({
    slug: 'kacha-aam-candy',
    name: 'Kacha Aam Candy Pouch',
    tagline: 'Raw mango, zero chill.',
    description:
      'Twenty tangy raw-mango candies with a pinch of salt and chilli, just like the school-gate classic. Individually wrapped, so sharing stays optional.',
    category: 'snacks',
    price: 4900,
    stock: 200,
    tags: ['mango', 'candy', 'desi', 'tangy'],
    badges: ['bestseller'],
    daysAgo: 140,
  }),
  product({
    slug: 'dark-chocolate-coins',
    name: 'Dark Chocolate Coins',
    tagline: "Spend them wisely. Or don't.",
    description:
      'Ten foil-wrapped coins of 55% dark chocolate, minted for desk-drawer emergencies. Rich rather than bitter, and genuinely hard to save.',
    category: 'snacks',
    price: 17900,
    compareAtPrice: 21900,
    stock: 2,
    tags: ['chocolate', 'dark chocolate', 'gift'],
    badges: ['limited'],
    daysAgo: 15,
  }),
  product({
    slug: 'peppermint-pocket-tin',
    name: 'Peppermint Pocket Tin',
    tagline: 'Fresh breath, tiny tin.',
    description:
      'Sugar-free peppermints in a slide-open tin that clicks shut. Cool enough for post-lunch meetings, small enough for the coin pocket.',
    category: 'snacks',
    price: 9900,
    stock: 100,
    tags: ['mints', 'fresh', 'pocket'],
    badges: ['new'],
    daysAgo: 3,
  }),
];

export const COUPONS = [
  { code: 'WELCOME10', type: 'percent', value: 10, maxDiscount: 10000, isActive: true },
  { code: 'FLAT50', type: 'flat', value: 5000, minSubtotal: 49900, isActive: true },
  { code: 'FREESHIP', type: 'freeship', value: 0, isActive: true },
];

// Removed from the store; the seed deletes them and detaches them from carts.
export const RETIRED_COUPONS = ['FLAT5'];

export const USERS = [
  { name: 'ShopKart Admin', email: 'admin@shopkart.dev', password: 'Admin@12345', role: 'admin' },
  { name: 'Test Shopper', email: 'test@shopkart.dev', password: 'Test@12345', role: 'user' },
  { name: 'Store Owner', email: 'test@gmail.com', password: 'test@123', role: 'admin' },
];
