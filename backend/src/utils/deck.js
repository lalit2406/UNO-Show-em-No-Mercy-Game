/**
 * Card deck distribution and generation logic for UNO Show 'Em No Mercy.
 * Total cards: 168
 * 
 * Number cards: 0-9 in Red, Yellow, Green, Blue (2 of each per color) = 80 cards
 * Draw 2: 3 of each color = 12 cards
 * Draw 4: 2 of each color = 8 cards
 * Skip: 3 of each color = 12 cards
 * Skip Everyone: 2 of each color = 8 cards
 * Reverse: 3 of each color = 12 cards
 * Discard All: 3 of each color = 12 cards
 * Wild Cards:
 *  - Wild (Standard): 4 cards
 *  - Wild Reverse Draw 4: 8 cards
 *  - Wild Draw 6: 4 cards
 *  - Wild Draw 10: 4 cards
 *  - Wild Color Roulette: 4 cards (adjusted to keep 168 total with standard Wilds)
 */

const COLORS = ['Red', 'Yellow', 'Green', 'Blue'];

export function generateDeck() {
  const deck = [];
  let cardId = 0;

  const addCard = (color, type, value, drawValue = 0) => {
    deck.push({
      id: `${color.toLowerCase()}_${type}_${cardId++}`,
      color,
      type,
      value: String(value),
      drawValue
    });
  };

  // 1. Number Cards (0-9, 2 of each per color)
  COLORS.forEach(color => {
    for (let num = 0; num <= 9; num++) {
      addCard(color, 'number', num);
      addCard(color, 'number', num);
    }
  });

  // 2. Colored Action Cards
  COLORS.forEach(color => {
    // Draw 2 (3 of each color)
    for (let i = 0; i < 3; i++) {
      addCard(color, 'draw2', 'draw2', 2);
    }
    // Draw 4 (2 of each color)
    for (let i = 0; i < 2; i++) {
      addCard(color, 'draw4', 'draw4', 4);
    }
    // Skip (3 of each color)
    for (let i = 0; i < 3; i++) {
      addCard(color, 'skip', 'skip');
    }
    // Skip Everyone (2 of each color)
    for (let i = 0; i < 2; i++) {
      addCard(color, 'skip_everyone', 'skip_everyone');
    }
    // Reverse (3 of each color)
    for (let i = 0; i < 3; i++) {
      addCard(color, 'reverse', 'reverse');
    }
    // Discard All (3 of each color)
    for (let i = 0; i < 3; i++) {
      addCard(color, 'discard_all', 'discard_all');
    }
  });

  // 3. Wild Cards
  // Standard Wild (4 cards)
  for (let i = 0; i < 4; i++) {
    addCard('Wild', 'wild', 'wild');
  }
  // Wild Reverse Draw 4 (8 cards)
  for (let i = 0; i < 8; i++) {
    addCard('Wild', 'wild_reverse_draw4', 'wild_reverse_draw4', 4);
  }
  // Wild Draw 6 (4 cards)
  for (let i = 0; i < 4; i++) {
    addCard('Wild', 'wild_draw6', 'wild_draw6', 6);
  }
  // Wild Draw 10 (4 cards)
  for (let i = 0; i < 4; i++) {
    addCard('Wild', 'wild_draw10', 'wild_draw10', 10);
  }
  // Wild Color Roulette (4 cards)
  for (let i = 0; i < 4; i++) {
    addCard('Wild', 'wild_color_roulette', 'wild_color_roulette');
  }

  return deck;
}

export function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
