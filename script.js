/* --- STATE MANAGEMENT --- */
let chips = 10000;
let currentBet = 0;
let currentGame = null; // 'blackjack', 'poker', 'big2'
let deck = [];
let playerHand = [];
let dealerHand = [];
let heldCards = [false, false, false, false, false]; // For Poker
let gamePhase = 'betting'; // 'betting', 'playing', 'result'
// Big 2 State
let big2State = {
    deck: [],
    pHand: [],
    oHand: [],
    lastPlayed: [],
    turn: 'player', // 'player' or 'opponent'
    passCount: 0
};


/* --- DOM ELEMENTS --- */
const screens = {
    title: document.getElementById('title-screen'),
    selection: document.getElementById('game-selection'),
    gameplay: document.getElementById('gameplay-area'),
    gameOver: document.getElementById('game-over-screen')
};

const ui = {
    chipDisplay: document.getElementById('chip-count-display'),
    chipVal: document.getElementById('chips-val'),
    betVal: document.getElementById('bet-val'),
    gameTitle: document.getElementById('current-game-title'),
    bettingPhase: document.getElementById('betting-phase'),
    blackjackBoard: document.getElementById('blackjack-board'),
    pokerBoard: document.getElementById('poker-board'),
    big2Board: document.getElementById('big2-board'),
    roundResult: document.getElementById('round-result'),
    resultTitle: document.getElementById('result-title'),
    resultMessage: document.getElementById('result-message'),
    btnNextRound: document.getElementById('btn-next-round'),
    effectsOverlay: document.getElementById('effects-overlay')
};

/* --- INITIALIZATION --- */
document.addEventListener('DOMContentLoaded', () => {
    updateChipDisplay();

    ui.btnMute = document.getElementById('btn-mute');
    const bgm = document.getElementById('bgm-audio');

    // Audio State
    let isMuted = false;
    bgm.volume = 0.5; // Set reasonable volume

    // Attempt Autoplay on Load
    bgm.play().catch(() => {
        console.log("Autoplay blocked. Waiting for interaction.");
        // Fallback: Play on first interaction
        const playOnInteraction = () => {
            bgm.play();
            document.removeEventListener('click', playOnInteraction);
            document.removeEventListener('keydown', playOnInteraction);
        };
        document.addEventListener('click', playOnInteraction);
        document.addEventListener('keydown', playOnInteraction);
    });

    // Navigation
    document.getElementById('btn-start').addEventListener('click', () => {
        showScreen('selection');
    });

    document.getElementById('btn-quit').addEventListener('click', () => window.close());
    document.getElementById('btn-back-title').addEventListener('click', () => showScreen('title'));
    document.getElementById('btn-select-blackjack').addEventListener('click', () => enterGame('blackjack'));
    document.getElementById('btn-select-poker').addEventListener('click', () => enterGame('poker'));
    document.getElementById('btn-select-big2').addEventListener('click', () => enterGame('big2'));
    document.getElementById('btn-exit-game').addEventListener('click', () => showScreen('selection'));
    document.getElementById('btn-restart').addEventListener('click', resetGame);

    // Mute Toggle
    ui.btnMute.addEventListener('click', () => {
        isMuted = !isMuted;
        bgm.muted = isMuted;
        ui.btnMute.innerText = isMuted ? '🔇' : '🔊';
    });

    // Betting
    document.querySelectorAll('.btn-bet').forEach(btn => {
        btn.addEventListener('click', (e) => placeBet(e.target.dataset.amount));
    });
    document.getElementById('btn-deal').addEventListener('click', startGameRound);

    // Blackjack Actions
    document.getElementById('btn-bj-hit').addEventListener('click', bjHit);
    document.getElementById('btn-bj-stand').addEventListener('click', bjStand);

    // Poker Actions
    document.getElementById('btn-pk-draw').addEventListener('click', pkDraw);

    // Big 2 Actions
    document.getElementById('btn-b2-play').addEventListener('click', big2Play);
    document.getElementById('btn-b2-pass').addEventListener('click', big2Pass);

    // Result
    ui.btnNextRound.addEventListener('click', resetRound);
});

/* --- NAVIGATION --- */
function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');

    if (screenName === 'title' || screenName === 'game-over-screen') {
        ui.chipDisplay.classList.add('hidden');
    } else {
        ui.chipDisplay.classList.remove('hidden');
    }
}

function enterGame(gameType) {
    currentGame = gameType;
    if (gameType === 'blackjack') ui.gameTitle.innerText = 'Blackjack';
    if (gameType === 'poker') ui.gameTitle.innerText = 'Poker (Vs Dealer)';
    if (gameType === 'big2') ui.gameTitle.innerText = 'Big 2';
    showScreen('gameplay');
    resetRound();
}

function resetGame() {
    chips = 10000;
    updateChipDisplay();
    showScreen('title');
    document.getElementById('yumeko-scream').src = document.getElementById('yumeko-scream').src;
}

/* --- CORE GAME LOGIC --- */
function updateChipDisplay() {
    ui.chipVal.innerText = chips;
}

function placeBet(amount) {
    let betAmount = 0;
    if (amount === 'all') {
        betAmount = chips;
    } else {
        betAmount = parseInt(amount);
    }

    if (betAmount > chips) return;
    if (currentBet + betAmount > chips) return;

    if (amount === 'all') {
        currentBet = chips;
    } else {
        if (chips >= currentBet + betAmount) {
            currentBet += betAmount;
        }
    }

    ui.betVal.innerText = currentBet;
    document.getElementById('btn-deal').disabled = currentBet === 0;
}

function startGameRound() {
    if (currentBet <= 0 || currentBet > chips) return;

    chips -= currentBet;
    updateChipDisplay();

    document.getElementById('btn-deal').disabled = true;

    gamePhase = 'playing';
    ui.bettingPhase.classList.add('hidden');
    ui.roundResult.classList.add('hidden');

    deck = createDeck();
    shuffleDeck(deck);
    playerHand = [];
    dealerHand = [];

    ui.blackjackBoard.classList.add('hidden');
    ui.pokerBoard.classList.add('hidden');
    ui.big2Board.classList.add('hidden');

    if (currentGame === 'blackjack') {
        ui.blackjackBoard.classList.remove('hidden');
        startBlackjack();
    } else if (currentGame === 'poker') {
        ui.pokerBoard.classList.remove('hidden');
        startPoker();
    } else if (currentGame === 'big2') {
        ui.big2Board.classList.remove('hidden');
        startBig2();
    }
}

function resetRound() {
    currentBet = 0;
    ui.betVal.innerText = '0';
    ui.bettingPhase.classList.remove('hidden');
    ui.blackjackBoard.classList.add('hidden');
    ui.pokerBoard.classList.add('hidden');
    ui.big2Board.classList.add('hidden');
    ui.roundResult.classList.add('hidden');
    document.getElementById('btn-deal').disabled = true;

    // Remove shake
    document.body.classList.remove('shake-screen');

    // Check Game Over
    if (chips <= 0) {
        showGameOver();
    }
}

function showGameOver() {
    showScreen('gameOver');
}

/* --- DECK LOGIC --- */
const SUITS = ['♠', '♥', '♣', '♦'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createDeck() {
    let d = [];
    for (let s of SUITS) {
        for (let v of VALUES) {
            d.push({ suit: s, value: v });
        }
    }
    return d;
}

function shuffleDeck(d) {
    for (let i = d.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [d[i], d[j]] = [d[j], d[i]];
    }
}

function getCardValue(card) {
    if (['J', 'Q', 'K'].includes(card.value)) return 10;
    if (card.value === 'A') return 11;
    return parseInt(card.value);
}

function renderCard(card, hidden = false) {
    const el = document.createElement('div');
    el.className = `card ${hidden ? 'hidden-card' : ''} ${['♥', '♦'].includes(card.suit) ? 'red' : 'black'}`;
    if (!hidden) {
        el.innerText = `${card.value}${card.suit}`;
    }
    return el;
}

/* --- BLACKJACK --- */
function startBlackjack() {
    playerHand.push(deck.pop());
    dealerHand.push(deck.pop());
    playerHand.push(deck.pop());
    dealerHand.push(deck.pop());

    renderBlackjackBoard();

    const pScore = calculateBlackjackScore(playerHand);
    if (pScore === 21) {
        endBlackjackRound();
    }
}

function renderBlackjackBoard(revealDealer = false) {
    const pContainer = document.getElementById('bj-player-cards');
    const dContainer = document.getElementById('bj-dealer-cards');
    pContainer.innerHTML = '';
    dContainer.innerHTML = '';

    playerHand.forEach(c => pContainer.appendChild(renderCard(c)));

    dealerHand.forEach((c, i) => {
        if (i === 0 && !revealDealer) {
            dContainer.appendChild(renderCard(c, true));
        } else {
            dContainer.appendChild(renderCard(c));
        }
    });

    document.getElementById('bj-player-score').innerText = calculateBlackjackScore(playerHand);
    document.getElementById('bj-dealer-score').innerText = revealDealer ? calculateBlackjackScore(dealerHand) : '?';

    if (gamePhase === 'playing') {
        document.querySelector('.bj-actions').style.visibility = 'visible';
    } else {
        document.querySelector('.bj-actions').style.visibility = 'hidden';
    }
}

function calculateBlackjackScore(hand) {
    let score = 0;
    let aces = 0;
    for (let card of hand) {
        score += getCardValue(card);
        if (card.value === 'A') aces++;
    }
    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }
    return score;
}

function bjHit() {
    playerHand.push(deck.pop());
    renderBlackjackBoard();
    if (calculateBlackjackScore(playerHand) > 21) {
        endBlackjackRound();
    }
}

function bjStand() {
    let dScore = calculateBlackjackScore(dealerHand);
    while (dScore < 17) {
        dealerHand.push(deck.pop());
        dScore = calculateBlackjackScore(dealerHand);
    }
    renderBlackjackBoard(true);
    endBlackjackRound(true);
}

function endBlackjackRound(dealerPlayed = false) {
    gamePhase = 'result';
    renderBlackjackBoard(true);

    const pScore = calculateBlackjackScore(playerHand);
    const dScore = calculateBlackjackScore(dealerHand);

    let win = false;
    let push = false;
    let msg = "";

    if (pScore > 21) {
        msg = "BUST! YOU LOSE.";
    } else if (dScore > 21) {
        win = true;
        msg = "DEALER BUSTS! YOU WIN.";
    } else if (pScore > dScore) {
        win = true;
        msg = "YOU WIN!";
    } else if (pScore < dScore) {
        msg = "DEALER WINS.";
    } else {
        push = true;
        msg = "PUSH (TIE).";
    }

    if (win && pScore === 21) {
        triggerEcstasyEffect();
    }

    showResult(win, push, msg, 1);
}

function triggerEcstasyEffect() {
    document.body.classList.add('shake-screen');
    const texts = ["ああっ...!", "すごい...", "イクッ!", "気持ちいい...", "もっと..."];

    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const el = document.createElement('div');
            el.className = 'floating-text';
            el.innerText = texts[Math.floor(Math.random() * texts.length)];
            el.style.left = Math.random() * 80 + 10 + '%';
            el.style.top = Math.random() * 80 + 10 + '%';
            ui.effectsOverlay.appendChild(el);
            setTimeout(() => el.remove(), 2000);
        }, i * 300);
    }
}

/* --- POKER (Vs Dealer) --- */
function startPoker() {
    heldCards = [false, false, false, false, false];

    // Deal 5 to each
    for (let i = 0; i < 5; i++) playerHand.push(deck.pop());
    for (let i = 0; i < 5; i++) dealerHand.push(deck.pop());

    renderPokerBoard(false);
    document.getElementById('btn-pk-draw').disabled = false;
    document.getElementById('pk-message').innerText = "Select cards to hold, then click DRAW.";
}

function renderPokerBoard(revealDealer) {
    // Render Player
    const pContainer = document.getElementById('pk-player-cards');
    pContainer.innerHTML = '';
    playerHand.forEach((c, i) => {
        const cardEl = renderCard(c);
        cardEl.classList.add('poker-card');
        if (heldCards[i]) cardEl.classList.add('held');
        cardEl.addEventListener('click', () => {
            if (activePokerDraw()) {
                heldCards[i] = !heldCards[i];
                renderPokerBoard(false);
            }
        });
        pContainer.appendChild(cardEl);
    });

    const pEval = evaluatePokerHand(playerHand);
    document.getElementById('pk-player-info').innerText = pEval.name;

    // Render Dealer
    const dContainer = document.getElementById('pk-dealer-cards');
    dContainer.innerHTML = '';
    dealerHand.forEach((c, i) => {
        if (!revealDealer) {
            dContainer.appendChild(renderCard(c, true));
        } else {
            dContainer.appendChild(renderCard(c));
        }
    });

    if (revealDealer) {
        const dEval = evaluatePokerHand(dealerHand);
        document.getElementById('pk-dealer-info').innerText = dEval.name;
    } else {
        document.getElementById('pk-dealer-info').innerText = "?";
    }
}

function activePokerDraw() {
    return !document.getElementById('btn-pk-draw').disabled;
}

function pkDraw() {
    for (let i = 0; i < 5; i++) {
        if (!heldCards[i]) {
            playerHand[i] = deck.pop();
        }
    }

    document.getElementById('btn-pk-draw').disabled = true;
    heldCards = [false, false, false, false, false];
    renderPokerBoard(false);

    dealerAIPlay();
}

function dealerAIPlay() {
    // Dealer evaluates hand. 
    // Simplified AI: if has Pair or better, swap 0. Else swap 3.
    const dEval = evaluatePokerHand(dealerHand);

    let swapCount = 3;
    if (dEval.rank >= 1) swapCount = 0;

    if (swapCount > 0) {
        dealerHand.sort((a, b) => getPokerValue(b) - getPokerValue(a)); // Desc
        for (let i = 5 - swapCount; i < 5; i++) {
            dealerHand[i] = deck.pop();
        }
    }

    endPokerRound();
}

function endPokerRound() {
    gamePhase = 'result';
    renderPokerBoard(true); // Reveal Dealer

    const pEval = evaluatePokerHand(playerHand);
    const dEval = evaluatePokerHand(dealerHand);

    let win = false;
    let push = false;
    let msg = `${pEval.name} vs ${dEval.name}.`;

    if (pEval.rank > dEval.rank) {
        win = true;
    } else if (pEval.rank < dEval.rank) {
        win = false;
    } else {
        // Tie breaker - Sum of values
        let pSum = playerHand.reduce((a, c) => a + getPokerValue(c), 0);
        let dSum = dealerHand.reduce((a, c) => a + getPokerValue(c), 0);
        if (pSum > dSum) win = true;
        else if (pSum < dSum) win = false;
        else push = true;
        // True tie is extremely rare; treat same rank same sum as push.
    }

    if (win) msg = "YOU WIN! " + msg;
    else if (push) msg = "PUSH. " + msg;
    else msg = "YOU LOSE. " + msg;

    showResult(win, push, msg, 1);
}

// Simple Poker Evaluator
function evaluatePokerHand(hand) {
    const sorted = [...hand].sort((a, b) => getPokerValue(a) - getPokerValue(b));
    const suits = hand.map(c => c.suit);
    const values = sorted.map(c => getPokerValue(c));

    const isFlush = suits.every(s => s === suits[0]);

    let isStraight = true;
    for (let i = 0; i < 4; i++) {
        if (values[i + 1] !== values[i] + 1) {
            if (i === 3 && values[4] === 14 && values[0] === 2 && values[1] === 3 && values[2] === 4 && values[3] === 5) {
                isStraight = true;
            } else {
                isStraight = false;
            }
        }
    }

    const counts = {};
    values.forEach(v => counts[v] = (counts[v] || 0) + 1);
    const countValues = Object.values(counts);

    if (isFlush && isStraight) {
        if (values[0] === 10) return { rank: 9, name: "Royal Flush" };
        return { rank: 8, name: "Straight Flush" };
    }
    if (countValues.includes(4)) return { rank: 7, name: "Four of a Kind" };
    if (countValues.includes(3) && countValues.includes(2)) return { rank: 6, name: "Full House" };
    if (isFlush) return { rank: 5, name: "Flush" };
    if (isStraight) return { rank: 4, name: "Straight" };
    if (countValues.includes(3)) return { rank: 3, name: "Three of a Kind" };

    let pairs = 0;
    countValues.forEach(c => { if (c === 2) pairs++; });
    if (pairs === 2) return { rank: 2, name: "Two Pair" };
    if (pairs === 1) return { rank: 1, name: "Pair" };

    return { rank: 0, name: "High Card" };
}

function getPokerValue(card) {
    if (card.value === 'J') return 11;
    if (card.value === 'Q') return 12;
    if (card.value === 'K') return 13;
    if (card.value === 'A') return 14;
    return parseInt(card.value);
}

/* --- BIG 2 GAME LOGIC --- */
const B2_RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
const B2_SUITS = ['♦', '♣', '♥', '♠'];

function getBig2Value(card) {
    const rIdx = B2_RANKS.indexOf(card.value);
    const sIdx = B2_SUITS.indexOf(card.suit);
    return rIdx * 4 + sIdx;
}

function sortBig2Hand(hand) {
    return hand.sort((a, b) => getBig2Value(a) - getBig2Value(b));
}

function startBig2() {
    big2State.pHand = [];
    big2State.oHand = [];
    big2State.lastPlayed = [];
    big2State.passCount = 0;
    big2State.control = true;

    big2State.deck = createDeck();
    shuffleDeck(big2State.deck);

    for (let i = 0; i < 13; i++) big2State.pHand.push(big2State.deck.pop());
    for (let i = 0; i < 13; i++) big2State.oHand.push(big2State.deck.pop());

    sortBig2Hand(big2State.pHand);
    sortBig2Hand(big2State.oHand);

    const pLow = getBig2Value(big2State.pHand[0]);
    const oLow = getBig2Value(big2State.oHand[0]);

    if (pLow < oLow) {
        big2State.turn = 'player';
        document.getElementById('b2-status').innerText = "Your Turn (Lowest Card)";
        big2State.control = true;
    } else {
        big2State.turn = 'opponent';
        big2State.control = true;
        document.getElementById('b2-status').innerText = "Opponent's Turn";
        setTimeout(big2AI, 1000);
    }

    renderBig2Board();
}

function renderBig2Board() {
    const pContainer = document.getElementById('b2-player-cards');
    pContainer.innerHTML = '';
    big2State.pHand.forEach(c => {
        const el = renderCard(c);
        el.classList.add('big2-card');
        el.dataset.val = getBig2Value(c);
        if (c.selected) el.classList.add('held');

        el.addEventListener('click', () => {
            if (big2State.turn === 'player') {
                c.selected = !c.selected;
                renderBig2Board();
            }
        });
        pContainer.appendChild(el);
    });

    const oContainer = document.getElementById('b2-opp-cards');
    oContainer.innerHTML = '';
    big2State.oHand.forEach(() => {
        oContainer.appendChild(renderCard({ suit: '', value: '' }, true));
    });
    document.getElementById('b2-opp-count').innerText = big2State.oHand.length;

    const tContainer = document.getElementById('b2-last-played');
    tContainer.innerHTML = '';
    big2State.lastPlayed.forEach(c => tContainer.appendChild(renderCard(c)));

    document.getElementById('btn-b2-play').disabled = big2State.turn !== 'player';
    document.getElementById('btn-b2-pass').disabled = big2State.turn !== 'player' || big2State.control;
}

function big2Play() {
    const selected = big2State.pHand.filter(c => c.selected);
    if (selected.length === 0) return;

    if (isValidBig2Play(selected)) {
        big2State.lastPlayed = selected;
        big2State.pHand = big2State.pHand.filter(c => !c.selected);
        big2State.control = false;
        big2State.passCount = 0;

        checkBig2Win();
        if (gamePhase === 'playing') {
            big2State.turn = 'opponent';
            document.getElementById('b2-status').innerText = "Opponent's Turn";
            renderBig2Board();
            setTimeout(big2AI, 1000);
        }
    } else {
        alert("Invalid Play!");
    }
}

function big2Pass() {
    if (big2State.control) return;

    big2State.turn = 'opponent';
    document.getElementById('b2-status').innerText = "Passed. Opponent's Turn";

    big2State.passCount++;
    if (big2State.passCount >= 1) {
        big2State.control = true;
        big2State.lastPlayed = [];
    }

    big2State.pHand.forEach(c => c.selected = false);

    renderBig2Board();
    setTimeout(big2AI, 1000);
}

function isValidBig2Play(cards) {
    sortBig2Hand(cards);

    const type = getBig2HandType(cards);
    if (!type) return false;

    if (big2State.control || big2State.lastPlayed.length === 0) return true;

    if (cards.length !== big2State.lastPlayed.length) return false;

    const lastType = getBig2HandType(big2State.lastPlayed);
    const myVal = getBig2HandValue(cards, type);
    const lastVal = getBig2HandValue(big2State.lastPlayed, lastType);

    if (cards.length === 5) {
        if (type.rank > lastType.rank) return true;
        if (type.rank < lastType.rank) return false;
        return myVal > lastVal;
    }

    return myVal > lastVal;
}

function getBig2HandType(cards) {
    if (cards.length === 1) return { rank: 1, name: 'Single' };
    if (cards.length === 2) {
        if (cards[0].value === cards[1].value) return { rank: 2, name: 'Pair' };
        return null;
    }
    if (cards.length === 5) {
        let isStraight = true;
        for (let i = 0; i < 4; i++) {
            if (Math.floor(getBig2Value(cards[i + 1]) / 4) !== Math.floor(getBig2Value(cards[i]) / 4) + 1) isStraight = false;
        }

        const isFlush = cards.every(c => c.suit === cards[0].suit);

        const counts = {};
        cards.forEach(c => counts[c.value] = (counts[c.value] || 0) + 1);
        const vals = Object.values(counts);

        if (isFlush && isStraight) return { rank: 9, name: 'Straight Flush' };
        if (vals.includes(4)) return { rank: 8, name: 'Quads' };
        if (vals.includes(3) && vals.includes(2)) return { rank: 7, name: 'Full House' };
        if (isFlush) return { rank: 6, name: 'Flush' };
        if (isStraight) return { rank: 5, name: 'Straight' };
    }
    return null;
}

function getBig2HandValue(cards, type) {
    const maxCard = cards[cards.length - 1];
    return getBig2Value(maxCard);
}

/* --- BIG 2 AI --- */
function big2AI() {
    if (gamePhase !== 'playing') return;

    let play = null;
    let hand = big2State.oHand;

    if (big2State.control || big2State.lastPlayed.length === 0) {
        play = [hand[0]];
    } else {
        const toBeat = big2State.lastPlayed;
        const targetVal = getBig2HandValue(toBeat, getBig2HandType(toBeat));

        if (toBeat.length === 1) {
            play = hand.find(c => getBig2Value(c) > targetVal);
            if (play) play = [play];
        } else if (toBeat.length === 2) {
            for (let i = 0; i < hand.length - 1; i++) {
                if (hand[i].value === hand[i + 1].value) {
                    let p = [hand[i], hand[i + 1]];
                    if (getBig2HandValue(p) > targetVal) {
                        play = p;
                        break;
                    }
                }
            }
        }
    }

    if (play) {
        big2State.lastPlayed = play;
        big2State.oHand = big2State.oHand.filter(c => !play.includes(c));
        big2State.control = false;
        big2State.passCount = 0;
        document.getElementById('b2-status').innerText = "Opponent Played.";

        checkBig2Win();
    } else {
        if (big2State.control) {
            play = [hand[0]];
            big2State.lastPlayed = play;
            big2State.oHand = hand.filter(c => c !== hand[0]);
            big2State.control = false;
        } else {
            big2State.passCount++;
            big2State.control = true;
            big2State.lastPlayed = [];
            document.getElementById('b2-status').innerText = "Opponent Passed. Your Control.";
        }
    }

    if (gamePhase === 'playing') {
        big2State.turn = 'player';
        renderBig2Board();
    }
}

function checkBig2Win() {
    if (big2State.pHand.length === 0) {
        gamePhase = 'result';
        showResult(true, false, "BIG 2 WINNER!", 2);
    } else if (big2State.oHand.length === 0) {
        gamePhase = 'result';
        showResult(false, false, "OPPONENT WINS BIG 2.", 0);
    }
}

/* --- RESULTS SYSTEM --- */
function showResult(win, push, message, multiplier) {
    const overlay = ui.roundResult;
    ui.roundResult.classList.remove('hidden');
    ui.resultTitle.innerText = win ? "WINNER" : (push ? "PUSH" : "LOSER");
    ui.resultTitle.className = win ? "win" : (push ? "win" : "loss");

    if (win) {
        let profit = Math.floor(currentBet * multiplier);
        chips += (currentBet + profit);
        ui.resultMessage.innerText = `${message} (+${profit})`;
    } else if (push) {
        chips += currentBet;
        ui.resultMessage.innerText = `${message} (+0)`;
    } else {
        ui.resultMessage.innerText = `${message} (-${currentBet})`;
    }

    updateChipDisplay();
}
