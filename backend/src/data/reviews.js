// Seeded reviewers and their reviews. Product ratings and review counts are
// recomputed from these by the seed, so the catalogue never shows invented numbers.

export const REVIEWERS = [
  { name: 'Aditi Rao', email: 'reviewer1@shopkart.dev' },
  { name: 'Kabir Mehta', email: 'reviewer2@shopkart.dev' },
  { name: 'Sneha Iyer', email: 'reviewer3@shopkart.dev' },
  { name: 'Tom Hughes', email: 'reviewer4@shopkart.dev' },
  { name: 'Priya Nair', email: 'reviewer5@shopkart.dev' },
  { name: 'Arjun Singh', email: 'reviewer6@shopkart.dev' },
].map((reviewer) => ({ ...reviewer, password: 'Reviewer@12345', role: 'user' }));

const TEST_SHOPPER = 'test@shopkart.dev';
const by = (n) => `reviewer${n}@shopkart.dev`;
const review = (email, rating, title, body) => ({ email, rating, title, body });

export const REVIEWS = {
  'holo-cat-sticker-pack': [
    review(by(1), 5, 'Shimmers like crazy', 'Stuck two on my laptop and one on my bottle. They catch the light every time I open the lid and still look new after a month in my bag.'),
    review(by(3), 5, 'My cat is jealous', 'Crisp edges, thick vinyl and a holo effect that is strong without being tacky. I peeled one off to move it and it left zero residue.'),
    review(by(5), 4, 'Lovely, wish there were more', 'Eight felt like plenty until I started giving them away. Quality is excellent and I would happily buy a second pack.'),
  ],
  'retro-sunset-sticker': [
    review(by(2), 5, 'Golden hour indeed', 'The colours are richer than in the photos. It survived the dishwasher on my steel bottle, which I did not expect.'),
    review(by(6), 4, 'Small but mighty', 'Three inches is smaller than I pictured, but it fits perfectly on a phone case. Great value.'),
  ],
  'deadline-mood-sticker-set': [
    review(by(4), 5, 'Accurate to the point of pain', "'This is fine' lives on my monitor now. My whole team asked where I got them."),
    review(by(1), 4, 'Funny and well made', 'The matte finish takes ballpoint ink nicely. One sticker was slightly off-centre on the sheet, otherwise perfect.'),
    review(by(5), 5, 'Bought two sets', 'One for me, one for my manager. We now report deadline status exclusively in stickers.'),
  ],
  'tiny-avocado-enamel-pin': [
    review(by(2), 5, 'The heart pit!', "I didn't notice the heart until it arrived and it made my day. Solid weight, smooth enamel, not a scratch."),
    review(by(3), 5, 'Gift hit', 'Gave it to my brunch-obsessed friend and she wears it on her tote every day. The backing card is cute too.'),
    review(by(6), 4, 'Cute, clutch is a bit loose', 'Gorgeous pin. The rubber clutch loosened after a few weeks, so I swapped in a locking back.'),
  ],
  'paper-plane-enamel-pin': [
    review(by(4), 5, 'Silver one is so clean', "Minimal and sharp on a denim jacket. The double clutch means it hasn't moved once."),
    review(by(5), 4, 'Smaller than expected', "It's genuinely tiny, which I like on a collar, but check the size if you want a statement pin."),
  ],
  'retro-cassette-keychain': [
    review(by(1), 5, 'The reels actually spin', 'I fidget with this constantly. The acrylic is thick and the split ring is properly sturdy.'),
    review(by(3), 3, 'Fun, scratches easily', 'Love the look, but the clear acrylic picked up scratches from my keys within a week. Still charming.'),
  ],
  'midnight-gel-pen-trio': [
    review(by(2), 5, 'Best pens I own', "Smooth, dark and genuinely quick-drying. I'm left-handed, so that last part matters, and these don't smudge."),
    review(by(4), 5, 'Plum is the star', 'The plum ink looks almost black until the light hits it. Lovely for journalling.'),
    review(by(6), 4, 'Great pens, want refills', "The writing feel is excellent. I'd love refills so I don't have to buy the trio again."),
    review(TEST_SHOPPER, 5, 'Meeting-proof', "Clicky, comfortable and they haven't skipped once. My colleagues keep borrowing them."),
  ],
  'pocket-dot-grid-notebook': [
    review(by(1), 5, 'No ghosting, as promised', "Fineliners and gel pens don't show through the page. The lay-flat binding is great for sketching."),
    review(by(5), 4, 'Perfect size', 'Fits my jacket pocket. I wish it had a ribbon bookmark, but the paper quality makes up for it.'),
  ],
  'pastel-washi-tape-set': [
    review(by(3), 5, 'Journal glow-up', 'Tears cleanly by hand and lifts off without ripping the paper. The colours are soft and go together perfectly.'),
    review(by(6), 5, 'I label everything now', "I've labelled jars, cables and spice tins. It's addictive."),
    review(by(2), 4, 'Pretty, a little translucent', 'Darker backgrounds show through the lighter rolls. That is how washi works, but worth knowing.'),
  ],
  'brass-paper-clips': [
    review(by(4), 5, 'Ageing beautifully', "They've picked up a warm patina after a few weeks. Weirdly satisfying to use."),
    review(by(1), 4, 'Solid little clips', 'Heavier than steel clips and they grip well. Thirty is plenty.'),
  ],
  'felt-mini-cactus': [
    review(by(5), 5, 'Office plant achieved', "Hand-stitched and adorable. The tiny pot is real terracotta, which I didn't expect."),
    review(by(2), 5, 'Survived my neglect', "Finally, a plant I haven't killed. It gets compliments on every video call."),
    review(by(4), 4, 'Cute, slightly smaller', "Lovely craftsmanship. It's small, so it suits a shelf better than a big desk."),
  ],
  'sticky-note-cube': [
    review(by(6), 4, 'Warm colours, strong stick', 'The adhesive holds on my monitor all day. This cube will last me ages.'),
    review(by(3), 4, 'Good stick, good paper', "They don't curl like cheaper notes. I'd love a lined version."),
  ],
  'approved-rubber-stamp': [
    review(by(1), 5, 'Most fun purchase this year', "I stamp my finished to-do lists and it's oddly motivating. Crisp impression with a standard ink pad."),
    review(by(5), 5, 'Office legend', "Brought it to work and now everyone wants their expense reports 'approved'."),
  ],
  'velcro-cable-ties': [
    review(by(2), 5, 'Desk finally tidy', 'Wrapped every cable behind my monitor in ten minutes. Reusable, and the grip is strong.'),
    review(by(4), 4, 'Does the job', 'Simple and effective. The orange ones make the charger cable easy to spot.'),
    review(by(6), 5, 'Travel essential', 'I keep a few in my bag for chargers and earphones. No more tangles.'),
  ],
  'pop-phone-grip': [
    review(by(3), 4, 'The pop is satisfying', "Sticks firmly to my case and the stand mode is handy for video calls. It's a bit thick in my pocket."),
    review(by(1), 3, 'Good grip, so-so adhesive', 'Works well, but the adhesive lifted on my textured case. Fine on a smooth one.'),
    review(by(5), 5, 'Sage is lovely', 'Matches my case perfectly. I use the stand every evening for recipes.'),
  ],
  'sour-gummy-worms-tin': [
    review(by(2), 5, 'Properly sour', 'Actually sour, not just sugary. The tin is great for refilling afterwards.'),
    review(by(6), 4, 'Moreish', 'Finished the tin in two days. The green apple ones are the best.'),
  ],
  'kacha-aam-candy': [
    review(by(4), 5, 'School-gate nostalgia', 'Exactly like the ones we bought outside school. That salt and chilli hit is perfect.'),
    review(by(3), 5, 'Gone in a day', "Bought them for the office and they'd vanished by lunch. Ordering three next time."),
    review(by(1), 5, 'Tangy and addictive', 'The raw mango flavour is spot on, and each one is wrapped, so they are easy to carry.'),
    review(TEST_SHOPPER, 4, 'A touch spicy for me', 'Lovely flavour, though the chilli kick surprised me. My family loved them.'),
  ],
};
