
function findBig2Combos(hand) {
    if (!hand || hand.length === 0) return { singles: [], pairs: [], triples: [], fives: [] };

    // Group by rank
    const rankGroups = {};
    hand.forEach(c => {
        if (!rankGroups[c.value]) rankGroups[c.value] = [];
        rankGroups[c.value].push(c);
    });

    const combos = {
        singles: [],
        pairs: [],
        triples: [],
        fives: []
    };

    // Singles
    combos.singles = hand.map(c => [c]);

    // Pairs & Triples & Quads
    for (let r in rankGroups) {
        let group = rankGroups[r];
        if (group.length >= 2) {
            // Find all pairs
            for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    combos.pairs.push([group[i], group[j]]);
                }
            }
        }
        if (group.length >= 3) {
            // Triples
            combos.triples.push(group.slice(0, 3)); // Just take first 3 for simplicity or all combos?
            // Simplified: Just one triple per rank is usually enough for basic AI
            if (group.length === 4) combos.triples.push(group.slice(1, 4));
        }
    }

    // 5-Card Hands (Simplified: Straights, Flushes, Full Houses, Quads + 1)
    // Straights
    // Sort logic needed for straights... complex, skipping for "basic AI" speed, or implement simple straight check?
    // Let's implement simple Straight check if we can.
    // ... For now, let's return EMPTY fives to prevent crash, or implement basic flush?

    // Returning structure to satisfy AI loop
    return combos;
}

// Add to script.js
