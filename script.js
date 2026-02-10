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

// Higher or Lower State
let hlState = {
    currentCard: null,
    potentialPayout: 0,
    active: false
};

// Russian Roulette State
let rrState = {
    bulletIndex: -1,
    currentIndex: 0,
    turn: 1, // 1 or 2
    active: false,
    chambers: [false, false, false, false, false, false]
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
    hlBoard: document.getElementById('hl-board'),
    hlPayout: document.getElementById('hl-payout-val'),
    hlMessage: document.getElementById('hl-message'),
    rrBoard: document.getElementById('rr-board'),
    rrTurn: document.getElementById('rr-turn-display'),
    rrCylinder: document.getElementById('rr-cylinder'),
    rrMessage: document.getElementById('rr-message'),
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
    document.getElementById('btn-select-hl').addEventListener('click', () => enterGame('hl'));
    document.getElementById('btn-select-rr').addEventListener('click', () => enterGame('rr'));
    document.getElementById('btn-select-big2').addEventListener('click', () => triggerEcstasyEffect());
    document.getElementById('btn-exit-game').addEventListener('click', () => showScreen('selection'));
    document.getElementById('btn-restart').addEventListener('click', resetGame);

    // Higher/Lower Actions
    document.getElementById('btn-hl-higher').addEventListener('click', () => hlGuess('higher'));
    document.getElementById('btn-hl-lower').addEventListener('click', () => hlGuess('lower'));
    document.getElementById('btn-hl-collect').addEventListener('click', hlCollect);

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

    // Russian Roulette Actions
    document.getElementById('btn-rr-shoot-self').addEventListener('click', () => rrPullTrigger('self'));
    document.getElementById('btn-rr-shoot-opp').addEventListener('click', () => rrPullTrigger('opponent'));

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
    if (gameType === 'big2') ui.gameTitle.innerText = 'Big 2 (Coming Soon!)';
    if (gameType === 'hl') {
        ui.gameTitle.innerText = 'Higher or Lower';
        // Automatic All-In
        currentBet = chips;
        chips = 0;
        updateChipDisplay();
        showScreen('gameplay');
        startHLGame();
        return;
    }
    if (gameType === 'rr') {
        ui.gameTitle.innerText = 'Russian Roulette';
        showScreen('gameplay');
        startRRGame();
        return;
    }
    showScreen('gameplay');
    resetRound();
}

function startRRGame() {
    ui.bettingPhase.classList.add('hidden');
    ui.roundResult.classList.add('hidden');
    ui.rrBoard.classList.remove('hidden');

    rrState.bulletIndex = Math.floor(Math.random() * 6);
    rrState.currentIndex = 0;
    rrState.turn = 1;
    rrState.active = true;
    rrState.chambers = [false, false, false, false, false, false];

    ui.rrCylinder.classList.add('spin');
    ui.rrMessage.innerText = "Spinning the cylinder...";
    document.getElementById('btn-rr-pull').disabled = true;

    setTimeout(() => {
        ui.rrCylinder.classList.remove('spin');
        ui.rrMessage.innerText = "Cylinder locked. Pull the trigger.";
        document.getElementById('btn-rr-pull').disabled = false;
        updateRRUI();
    }, 1500);
}

function updateRRUI() {
    ui.rrTurn.innerText = `PLAYER ${rrState.turn}'S TURN`;
    ui.rrTurn.style.color = rrState.turn === 1 ? '#ffd700' : '#ff4444';

    // Clear chambers
    for (let i = 1; i <= 6; i++) {
        const chamber = ui.rrBoard.querySelector(`.c${i}`);
        chamber.classList.remove('fired');
    }

    // Mark previous chambers as fired (clicked)
    for (let i = 0; i < rrState.currentIndex; i++) {
        const chamber = ui.rrBoard.querySelector(`.c${i + 1}`);
        chamber.classList.add('fired');
    }

    // Visual rotation of cylinder to current position
    const rotation = rrState.currentIndex * 60;
    ui.rrCylinder.style.transform = `rotate(-${rotation}deg)`;
}

function rrPullTrigger(target) {
    if (!rrState.active) return;

    document.getElementById('btn-rr-shoot-self').disabled = true;
    document.getElementById('btn-rr-shoot-opp').disabled = true;

    if (rrState.currentIndex === rrState.bulletIndex) {
        // LETHAL
        rrState.active = false;

        // Determine who gets shot
        let victim = rrState.turn;
        if (target === 'opponent') {
            victim = rrState.turn === 1 ? 2 : 1;
        }

        ui.rrMessage.innerText = `...`;

        setTimeout(() => {
            triggerBangEffect();
            triggerLethalEffect();
            ui.rrMessage.innerText = `BANG! PLAYER ${victim} IS DEAD.`;

            setTimeout(() => {
                const winner = victim === 1 ? 2 : 1;
                showRRDeathScreen(winner, victim);
            }, 2500);
        }, 500);
    } else {
        // CLICK (Safe)
        ui.rrMessage.innerText = "...";
        rrState.currentIndex++;

        setTimeout(() => {
            ui.rrMessage.innerText = "CLICK... You survived.";
            setTimeout(() => {
                rrState.turn = rrState.turn === 1 ? 2 : 1;
                ui.rrMessage.innerText = "Next player, make your choice.";
                document.getElementById('btn-rr-shoot-self').disabled = false;
                document.getElementById('btn-rr-shoot-opp').disabled = false;
                updateRRUI();
            }, 1000);
        }, 500);
    }
}

function triggerBangEffect() {
    const overlay = document.getElementById('rr-bang-overlay');
    overlay.classList.remove('hidden');
    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 2000);
}

function showRRDeathScreen(winner, loser) {
    const screen = document.createElement('div');
    screen.className = 'rr-death-screen';
    screen.innerHTML = `
        <h1 class="death-title">DEATH</h1>
        <p class="death-msg">Player ${loser} has been eliminated.</p>
        <h2 style="color: #ffd700;">PLAYER ${winner} SURVIVES</h2>
        <button id="btn-rr-restart" class="btn-primary" style="margin-top: 50px;">Return to Menu</button>
    `;
    document.body.appendChild(screen);

    document.getElementById('btn-rr-restart').addEventListener('click', () => {
        screen.remove();
        showScreen('selection');
    });
}

function triggerLethalEffect() {
    // Flash
    const flash = document.createElement('div');
    flash.className = 'lethal-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 800);

    // Splatter
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const platter = document.createElement('div');
            platter.className = 'blood-splatter';
            platter.innerText = '☠';
            platter.style.left = 20 + Math.random() * 60 + '%';
            platter.style.top = 20 + Math.random() * 60 + '%';
            document.body.appendChild(platter);
            setTimeout(() => platter.remove(), 2500);
        }, i * 200);
    }

    document.body.classList.add('shake-screen');
    setTimeout(() => document.body.classList.remove('shake-screen'), 1000);
}

function startHLGame() {
    ui.bettingPhase.classList.add('hidden');
    ui.roundResult.classList.add('hidden');
    ui.hlBoard.classList.remove('hidden');

    deck = createDeck();
    shuffleDeck(deck);

    hlState.currentCard = deck.pop();
    hlState.potentialPayout = currentBet;
    hlState.active = true;

    // Initial collect disabled
    document.getElementById('btn-hl-collect').disabled = true;

    updateHLUI();
}

function updateHLUI() {
    const container = document.getElementById('hl-card-container');
    container.innerHTML = '';
    container.appendChild(renderCard(hlState.currentCard));
    ui.hlPayout.innerText = Math.floor(hlState.potentialPayout);
    ui.hlMessage.innerText = "Higher or Lower?";
}

function hlGuess(dir) {
    if (!hlState.active) return;

    const nextCard = deck.pop();
    const container = document.getElementById('hl-card-container');
    container.innerHTML = '';
    container.appendChild(renderCard(nextCard));

    const oldVal = getHigherLowerValue(hlState.currentCard);
    const newVal = getHigherLowerValue(nextCard);

    let win = false;
    let push = false;

    if (newVal === oldVal) {
        push = true;
    } else if (dir === 'higher' && newVal > oldVal) {
        win = true;
    } else if (dir === 'lower' && newVal < oldVal) {
        win = true;
    }

    if (win) {
        const gain = currentBet * 0.5;
        hlState.potentialPayout += gain;
        hlState.currentCard = nextCard;
        ui.hlPayout.innerText = Math.floor(hlState.potentialPayout);
        ui.hlMessage.innerText = `CORRECT! +${gain} potential payout.`;
        document.getElementById('btn-hl-collect').disabled = false;
        triggerSmallEffect();
    } else if (push) {
        hlState.currentCard = nextCard;
        ui.hlMessage.innerText = "TIE! No change.";
    } else {
        hlState.active = false;
        hlState.potentialPayout = 0;
        ui.hlMessage.innerText = "WRONG! YOU LOSE EVERYTHING.";
        setTimeout(() => {
            showResult(false, false, "LOSER! You guessed wrong.", 0);
        }, 1500);
    }
}

function getHigherLowerValue(card) {
    // 2 is lowest, Ace is highest for this mode
    const order = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    return order.indexOf(card.value);
}

function triggerSmallEffect() {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.innerText = "GOOD!";
    el.style.left = '50%';
    el.style.top = '40%';
    ui.effectsOverlay.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

function hlCollect() {
    if (!hlState.active) return;

    const payout = Math.floor(hlState.potentialPayout);
    hlState.active = false;

    const multiplier = hlState.potentialPayout / (currentBet || 1);
    showResult(true, false, `COLLECTED ${payout} Chips!`, multiplier);
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
    } else if (amount === 'half') {
        betAmount = Math.floor(chips / 2);
    } else {
        betAmount = parseInt(amount);
    }

    if (betAmount > chips) return;
    if (currentBet + betAmount > chips) return;

    if (amount === 'all') {
        currentBet = chips;
    } else if (amount === 'half') {
        currentBet = Math.floor(chips / 2);
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
    ui.hlBoard.classList.add('hidden');
    ui.rrBoard.classList.add('hidden');
    ui.roundResult.classList.add('hidden');
    document.getElementById('btn-deal').disabled = true;

    // Remove shake
    document.body.classList.remove('shake-screen');

    // Check Game Over
    if (chips <= 0 && currentGame !== 'hl') {
        showGameOver();
        return;
    }

    // Continuous Play for Higher or Lower
    if (currentGame === 'hl') {
        if (chips <= 0 && hlState.potentialPayout <= 0) {
            showGameOver();
            return;
        }
        enterGame('hl');
        return;
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

    if (currentGame === 'hl') {
        setTimeout(resetRound, 2000);
    } else {
        showResult(win, push, msg, win ? 2 : 0);
    }
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

    showResult(win, push, msg, win ? 2 : 0);
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


/* --- BIG 2 GAME LOGIC (4-PLAYER) --- */
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

// 0: Player, 1: Right, 2: Top, 3: Left
const PLAYER_NAMES = ["You", "Rival Right", "Rival Top", "Rival Left"];

function startBig2() {
    // Initialize State
    gamePhase = 'playing';
    big2State.hands = [[], [], [], []]; // 4 hands
    big2State.lastPlayed = [];
    big2State.passCount = 0;
    big2State.control = true;

    // Create & Shuffle Deck
    big2State.deck = createDeck();
    shuffleDeck(big2State.deck);

    // Deal 13 cards to each
    for (let i = 0; i < 52; i++) {
        big2State.hands[i % 4].push(big2State.deck[i]);
    }

    // Sort all hands
    big2State.hands.forEach(h => sortBig2Hand(h));

    // Determine Start: Holder of Lowest Card (3 of Diamonds / Lowest value)
    let lowestVal = 999;
    let starter = 0;

    for (let p = 0; p < 4; p++) {
        if (big2State.hands[p].length > 0) {
            let val = getBig2Value(big2State.hands[p][0]);
            if (val < lowestVal) {
                lowestVal = val;
                starter = p;
            }
        }
    }

    big2State.turn = starter;
    big2State.control = true; // First player has control (Free Turn)

    // Safety Force Clear
    big2State.lastPlayed = [];
    big2State.passCount = 0;

    console.log(`Big 2 Started. Starter: ${starter}, Lowest Card Val: ${lowestVal}`);

    updateBig2UI();

    if (starter !== 0) {
        setTimeout(playBig2Turn, 800);
    }
}

function playBig2Turn() {
    if (gamePhase !== 'playing') return;

    const pIdx = big2State.turn;
    if (pIdx === 0) return; // Player's turn, wait for input

    // AI Logic for Players 1, 2, 3
    let hand = big2State.hands[pIdx];
    let play = null;

    // 1. Analyze
    const combos = findBig2Combos(hand);

    // 2. Decide
    if (big2State.control || big2State.lastPlayed.length === 0) {
        // AI has control: Play lowest possible set to get rid of cards
        // Strategy: Play 5-card hands first, then Triples, Pairs, Singles?
        // Or keep it simple: Play smallest combo.
        if (combos.fives.length > 0) play = combos.fives[0];
        else if (combos.triples.length > 0) play = combos.triples[0];
        else if (combos.pairs.length > 0) play = combos.pairs[0];
        else play = [hand[0]]; // Play lowest single
    } else {
        // Response
        const last = big2State.lastPlayed;
        const lastType = getBig2HandType(last);
        const lastVal = getBig2HandValue(last, lastType);

        if (last.length === 1) {
            play = hand.find(c => getBig2Value(c) > lastVal);
            if (play) play = [play];
        } else if (last.length === 2 && combos.pairs.length > 0) {
            play = combos.pairs.find(p => getBig2HandValue(p, { name: 'Pair' }) > lastVal);
        } else if (last.length === 3 && combos.triples.length > 0) {
            play = combos.triples.find(t => getBig2HandValue(t, { name: 'Triple' }) > lastVal);
        } else if (last.length === 5 && combos.fives.length > 0) {
            const betterFives = combos.fives.filter(f => {
                const fType = getBig2HandType(f);
                if (fType.rank > lastType.rank) return true;
                if (fType.rank === lastType.rank) return getBig2HandValue(f, fType) > lastVal;
                return false;
            });
            if (betterFives.length > 0) play = betterFives[0];
        }
    }

    // 3. Execute or Pass
    if (play) {
        big2State.lastPlayed = play;
        // Remove cards from hand
        const playVals = play.map(c => getBig2Value(c));
        big2State.hands[pIdx] = hand.filter(c => !playVals.includes(getBig2Value(c)));

        big2State.control = false;
        big2State.passCount = 0; // Reset pass count on play

        console.log(`AI ${pIdx} Played:`, play);

        updateBig2UI();

        // WIN CHECK
        if (big2State.hands[pIdx].length === 0) {
            gamePhase = 'result';
            showResult(false, false, `${PLAYER_NAMES[pIdx]} Wins! You Lose.`, 0);
            return;
        }

        nextTurn();
    } else {
        // Pass
        console.log(`AI ${pIdx} Passed`);
        passTurn();
    }
}

function findBig2Combos(hand) {
    const rankGroups = {};
    hand.forEach(c => {
        if (!rankGroups[c.value]) rankGroups[c.value] = [];
        rankGroups[c.value].push(c);
    });

    const pairs = [];
    const triples = [];

    for (const r in rankGroups) {
        const g = rankGroups[r];
        if (g.length >= 2) {
            for (let i = 0; i < g.length; i++) {
                for (let j = i + 1; j < g.length; j++) {
                    pairs.push([g[i], g[j]]);
                }
            }
        }
        if (g.length >= 3) {
            triples.push(g.slice(0, 3));
        }
    }

    return {
        singles: hand.map(c => [c]),
        pairs: pairs,
        triples: triples,
        fives: [] // TODO: Implement straights/flushes
    };
}

function getBig2HandType(cards) {
    if (cards.length === 1) return { rank: 1, name: 'Single' };
    if (cards.length === 2 && cards[0].value === cards[1].value) return { rank: 2, name: 'Pair' };
    if (cards.length === 3 && cards[0].value === cards[1].value && cards[0].value === cards[2].value) return { rank: 3, name: 'Triple' };
    // Simplified checks for 5 ignored for now to prevent crash
    return { rank: 0, name: 'Invalid' };
}

function getBig2HandValue(cards, type) {
    // Simplified value: value of last card
    return getBig2Value(cards[cards.length - 1]);
}

function nextTurn() {
    big2State.turn = (big2State.turn + 1) % 2; // Cycle 0, 1
    updateBig2UI();

    if (big2State.turn !== 0) {
        // AI Turn (Rival)
        setTimeout(playBig2Turn, 1000);
    } else {
        // Your Turn
        console.log("Your Turn");
        const status = document.getElementById('b2-status');
        if (status) status.innerText = big2State.control ? "YOUR TURN (Free)" : "YOUR TURN";
    }
}

function passTurn() {
    big2State.passCount++;
    console.log(`Pass Count: ${big2State.passCount}`);

    // In 1v1, if 1 person passes (the other person), the active player gets control.
    if (big2State.passCount >= 1) {
        console.log("Control Reset to Next Player");
        big2State.control = true;
        big2State.lastPlayed = [];
        big2State.passCount = 0;
    }

    nextTurn();
}

function big2Play() {
    const selected = big2State.hands[0].filter(c => c.selected);
    if (selected.length === 0) return;

    if (isValidBig2Play(selected)) {
        big2State.lastPlayed = selected;
        big2State.hands[0] = big2State.hands[0].filter(c => !c.selected);
        big2State.control = false;
        big2State.passCount = 0;

        updateBig2UI();

        if (big2State.hands[0].length === 0) {
            gamePhase = 'result';
            showResult(true, false, "BIG 2 CHAMPION! YOU WIN!", 2);
            return;
        }

        nextTurn();
    } else {
        alert("Invalid Play!");
    }
}

function big2Pass() {
    if (big2State.control) {
        alert("You have control, you cannot pass!");
        return;
    }
    big2State.hands[0].forEach(c => c.selected = false);
    passTurn();
}

/* --- BIG 2 AI & LOGIC --- */

function isValidBig2Play(cards) {
    sortBig2Hand(cards);

    // Check if player holds lowest card on first turn
    // (Simplified: Game logic handles turn order, but Strict rules require playing lowest card. 
    // We will relax this for player freedom, but AI will do it.)

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
    if (cards.length === 3) {
        if (cards[0].value === cards[1].value && cards[1].value === cards[2].value) return { rank: 3, name: 'Triple' };
        return null;
    }
    if (cards.length === 5) {
        let isStraight = true;
        for (let i = 0; i < 4; i++) { // Simple sequential check based on Big 2 Ranks
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
    // Value of hand is determined by highest card, EXCEPT for Full House/Quads where it's the rank of the combo
    if (type.name === 'Full House' || type.name === 'Quads' || type.name === 'Triple') {
        const counts = {};
        cards.forEach(c => counts[c.value] = (counts[c.value] || 0) + 1);
        // Find value with count >= 3 (for FH/Triple) or 4 (Quads)
        for (let v in counts) {
            if (type.name === 'Quads' && counts[v] === 4) return B2_RANKS.indexOf(v) * 4; // Rank only
            if ((type.name === 'Full House' || type.name === 'Triple') && counts[v] >= 3) return B2_RANKS.indexOf(v) * 4;
        }
    }
    const maxCard = cards[cards.length - 1];
    return getBig2Value(maxCard);
}

/* --- RESULTS SYSTEM (End of Big 2 Logic) --- */

/* --- RESULTS SYSTEM --- */
function showResult(win, push, message, multiplier) {
    const overlay = ui.roundResult;
    ui.roundResult.classList.remove('hidden');
    ui.resultTitle.innerText = win ? "WINNER" : (push ? "PUSH" : "LOSER");
    ui.resultTitle.className = win ? "win" : (push ? "win" : "loss");

    if (win) {
        let totalReturn = Math.floor(currentBet * multiplier);
        let profit = totalReturn - currentBet;
        chips += totalReturn;
        ui.resultMessage.innerText = `${message} (+${profit})`;
    } else if (push) {
        chips += currentBet;
        ui.resultMessage.innerText = `${message} (+0)`;
    } else {
        ui.resultMessage.innerText = `${message} (-${currentBet})`;
    }

    updateChipDisplay();
}
