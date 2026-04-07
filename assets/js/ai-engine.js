// ============================================================
// TX-Dom-Dev — ai-engine.js
// AI logic extracted from game.js v13.5.0
// Functions: evaluateHandForBid, aiChooseTrump, choose_tile_ai
// ============================================================

// AI Bidding Logic
function evaluateHandForBid(hand) {
  const doubles = [];
  const blanks = [];
  const maxBid = GAME_MODE === 'MOON' ? 7 : (GAME_MODE === 'T42' ? 42 : 51);
  const minBid = GAME_MODE === 'MOON' ? 4 : (GAME_MODE === 'T42' ? 30 : 34);
  const midBid = GAME_MODE === 'MOON' ? 4 : (GAME_MODE === 'T42' ? 36 : 39);
  const maxPip = session.game.max_pip;

  for (const tile of hand) {
    const [a, b] = tile;
    if (a === b) doubles.push(tile);
    if (a === 0 || b === 0) blanks.push(tile);
  }

  if (GAME_MODE !== 'T42' && blanks.length >= 4) {
    const has01 = blanks.some(t => (t[0] === 0 && t[1] === 1) || (t[0] === 1 && t[1] === 0));
    let maxSmallPip = 0;
    let maxDoublePip = 0;
    for (const tile of hand) {
      const [a, b] = tile;
      if (a === b) {
        maxDoublePip = Math.max(maxDoublePip, a);
      } else if (a === 0 || b === 0) {
        maxSmallPip = Math.max(maxSmallPip, Math.max(a, b));
      }
    }
    if (has01 && maxSmallPip <= 2 && maxDoublePip <= 1) {
      return { action: "bid", bid: maxBid, marks: 1 };
    }
  }

  // ── Enhanced doubles/covered-off bidding evaluation ──
  if (doubles.length >= 4) {
    // Analyze covered offs: non-double tiles where you hold the double of the higher pip
    const doublePips = new Set(doubles.map(d => d[0]));
    const nonDoubles = hand.filter(t => t[0] !== t[1]);
    let coveredOffs = 0;
    let uncoveredOffs = 0;
    for (const t of nonDoubles) {
      const highPip = Math.max(t[0], t[1]);
      if (doublePips.has(highPip)) {
        coveredOffs++;
      } else {
        uncoveredOffs++;
      }
    }
    const handSize = session.game.hand_size;

    // PATTERN A: All doubles (no offs at all) → max bid 2x
    if (doubles.length === handSize) {
      return { action: "bid", bid: maxBid, marks: 2 };
    }

    // PATTERN B: (handSize-1) doubles + 1 covered off → max bid 2x
    // e.g., TN51: 5 doubles + 1 covered off; T42: 6 doubles + 1 covered off
    if (doubles.length >= handSize - 1 && coveredOffs >= 1 && uncoveredOffs === 0) {
      return { action: "bid", bid: maxBid, marks: 2 };
    }

    // PATTERN B2: 3+ top trumps (where trump double counts) + remaining doubles, no uncovered → 2x
    // e.g., 7-7, 7-6, 7-5, 3-3, 5-5, 0-0 → the 7-7 is both a double and trump double
    if (uncoveredOffs === 0 && nonDoubles.length >= 2) {
      for (let tp = maxPip; tp >= 2; tp--) {
        if (!doublePips.has(tp)) continue;  // Must have the double of this suit
        const trumpTiles = nonDoubles.filter(t => t[0] === tp || t[1] === tp);
        // Check for 2nd and 3rd trump
        const has2nd = trumpTiles.some(t =>
          (t[0] === tp && t[1] === tp - 1) || (t[0] === tp - 1 && t[1] === tp));
        const has3rd = trumpTiles.some(t =>
          (t[0] === tp && t[1] === tp - 2) || (t[0] === tp - 2 && t[1] === tp));
        if (has2nd && has3rd) {
          return { action: "bid", bid: maxBid, marks: 2 };
        }
      }
    }

    // PATTERN C: (handSize-2)+ doubles + all offs covered → max bid 1x
    // e.g., TN51: 4+ doubles + remaining all covered; T42: 5+ doubles + remaining covered
    if (doubles.length >= handSize - 2 && uncoveredOffs === 0) {
      return { action: "bid", bid: maxBid, marks: 1 };
    }

    // PATTERN D: 4+ doubles with at most 1 uncovered off → mid bid
    if (doubles.length >= 4 && uncoveredOffs <= 1) {
      return { action: "bid", bid: midBid, marks: 1 };
    }

    // Default: 4+ doubles → min bid
    return { action: "bid", bid: minBid, marks: 1 };
  }

  for (let trumpPip = maxPip; trumpPip >= 0; trumpPip--) {
    const trumpTiles = hand.filter(t => t[0] === trumpPip || t[1] === trumpPip);
    const trumpCount = trumpTiles.length;
    const hasDoubleTrump = trumpTiles.some(t => t[0] === trumpPip && t[1] === trumpPip);
    const hasSecondTrump = trumpPip > 0 && trumpTiles.some(t =>
      (t[0] === trumpPip && t[1] === trumpPip - 1) || (t[0] === trumpPip - 1 && t[1] === trumpPip)
    );
    const hasThirdTrump = trumpPip > 1 && trumpTiles.some(t =>
      (t[0] === trumpPip && t[1] === trumpPip - 2) || (t[0] === trumpPip - 2 && t[1] === trumpPip)
    );
    const nonTrumpDoubles = doubles.filter(d => d[0] !== trumpPip);

    // Check covered offs among non-trump non-double tiles
    const doublePips = new Set(doubles.map(d => d[0]));
    const ntNonDoubles = hand.filter(t => t[0] !== t[1] && t[0] !== trumpPip && t[1] !== trumpPip);
    let ntCoveredOffs = 0;
    let ntUncoveredOffs = 0;
    for (const t of ntNonDoubles) {
      const highPip = Math.max(t[0], t[1]);
      if (doublePips.has(highPip)) ntCoveredOffs++;
      else ntUncoveredOffs++;
    }

    // PATTERN: 3+ top trumps (double + 2nd + 3rd) + doubles + at most 1 covered off, no uncovered → max bid 2x
    if (trumpCount >= 3 && hasDoubleTrump && hasSecondTrump && hasThirdTrump
        && nonTrumpDoubles.length >= 1 && ntUncoveredOffs === 0) {
      return { action: "bid", bid: maxBid, marks: 2 };
    }

    if (trumpCount >= 4 && nonTrumpDoubles.length >= 2 && hasDoubleTrump && hasSecondTrump) {
      // If remaining tiles are all doubles or covered offs → 2x, otherwise 1x
      if (ntUncoveredOffs === 0 && nonTrumpDoubles.length >= 2) {
        return { action: "bid", bid: maxBid, marks: 2 };
      }
      return { action: "bid", bid: maxBid, marks: 1 };
    }
    if (trumpCount >= 4 && nonTrumpDoubles.length >= 2 && hasDoubleTrump) {
      return { action: "bid", bid: midBid, marks: 1 };
    }
    if (trumpCount >= 3 && hasDoubleTrump && hasSecondTrump && doubles.length >= 1) {
      return { action: "bid", bid: minBid, marks: 1 };
    }
  }

  return { action: "pass" };
}

function aiChooseTrump(hand, bidAmount) {
  const isMoon = GAME_MODE === 'MOON';
  const maxPip = session.game.max_pip;
  const doubles = [];
  const blanks = [];

  for (const tile of hand) {
    const [a, b] = tile;
    if (a === b) doubles.push(tile);
    if (a === 0 || b === 0) blanks.push(tile);
  }

  // ── Nello re-check ──
  if (!nelloDeclareMode && GAME_MODE !== 'T42' && bidAmount >= (GAME_MODE === 'TN51' ? 51 : 7)) {
    const has01 = blanks.some(t => (t[0] === 0 && t[1] === 1) || (t[0] === 1 && t[1] === 0));
    let maxSmallPip = 0, maxDoublePip = 0;
    const riskyDoubles = doubles.filter(d => d[0] >= 3).length;
    let pipSum = 0;
    for (const tile of hand) {
      const [a, b] = tile;
      pipSum += a + b;
      if (a === b) maxDoublePip = Math.max(maxDoublePip, a);
      else if (a === 0 || b === 0) maxSmallPip = Math.max(maxSmallPip, Math.max(a, b));
    }
    if (has01 && blanks.length >= 3 && riskyDoubles <= 1 && pipSum <= 20) {
      return "NELLO";
    }
  }

  const doublePips = new Set(doubles.map(d => d[0]));

  // ── Score each pip as trump ──
  let bestPipScore = -Infinity, bestPip = maxPip;
  for (let pip = maxPip; pip >= 0; pip--) {
    const trumpTiles = hand.filter(t => t[0] === pip || t[1] === pip);
    const hasDouble = trumpTiles.some(t => t[0] === pip && t[1] === pip);
    let score = trumpTiles.length * 10;                       // base trump count
    if (hasDouble) score += 25;                                // double bonus
    // Sequential strength
    const has2nd = trumpTiles.some(t => {
      const other = t[0] === pip ? t[1] : t[0];
      return other === (pip === maxPip ? maxPip - 1 : maxPip);
    });
    const has3rd = trumpTiles.some(t => {
      const other = t[0] === pip ? t[1] : t[0];
      return other === (pip === maxPip ? maxPip - 2 : maxPip - 1);
    });
    if (has2nd) score += 15;
    if (has3rd) score += 10;
    // Gap penalty — missing tiles in trump sequence
    const trumpRanks = trumpTiles.map(t => t[0] === pip ? t[1] : t[0]).concat([pip]);
    const uniqueRanks = [...new Set(trumpRanks)].sort((a,b) => b - a);
    for (let i = 1; i < Math.min(uniqueRanks.length, 4); i++) {
      if (uniqueRanks[i-1] - uniqueRanks[i] > 1) score -= 8;
    }
    // Void/near-void analysis
    const nonTrump = hand.filter(t => t[0] !== pip && t[1] !== pip);
    const suitCount = {};
    for (const t of nonTrump) {
      const hp = Math.max(t[0], t[1]);
      suitCount[hp] = (suitCount[hp] || 0) + 1;
    }
    const suitsPresent = new Set();
    for (const t of nonTrump) { suitsPresent.add(t[0]); suitsPresent.add(t[1]); }
    suitsPresent.delete(pip);
    let voids = 0, nearVoids = 0;
    for (let s = 0; s <= maxPip; s++) {
      if (s === pip) continue;
      const cnt = hand.filter(t => t[0] === s || t[1] === s).length;
      if (cnt === 0) voids++;
      else if (cnt === 1) nearVoids++;
    }
    score += voids * (isMoon ? 12 : 7);
    score += nearVoids * 3;
    // Side doubles bonus
    const sideDoubles = doubles.filter(d => d[0] !== pip);
    score += sideDoubles.length * 8;
    // Covered/uncovered off analysis
    let coveredOffs = 0, uncoveredOffs = 0;
    for (const t of nonTrump) {
      if (t[0] === t[1]) continue; // skip doubles
      const hp = Math.max(t[0], t[1]);
      if (doublePips.has(hp)) coveredOffs++;
      else uncoveredOffs++;
    }
    score += coveredOffs * 7;
    score -= uncoveredOffs * 4;
    // Exposed count tile penalty
    for (const t of nonTrump) {
      if (t[0] === t[1]) continue;
      const hp = Math.max(t[0], t[1]), lp = Math.min(t[0], t[1]);
      const isCount = (hp === 5 && lp === 0) || (hp + lp === 5) || (hp + lp === 10);
      if (isCount && !doublePips.has(hp)) score -= 6;
    }
    // Pip preference tiebreaker
    score += pip * 0.5;

    if (score > bestPipScore) { bestPipScore = score; bestPip = pip; }
  }

  // ── No-Trump scoring ──
  let ntScore = -Infinity;
  if (doubles.length >= 3) {
    ntScore = 0;
    ntScore += doubles.length * 14;
    const ntNonDoubles = hand.filter(t => t[0] !== t[1]);
    for (const t of ntNonDoubles) {
      const hp = Math.max(t[0], t[1]);
      if (doublePips.has(hp)) { ntScore += 8; }
      else { ntScore -= 6; }
      // Count bonus for covered count tiles
      const lp = Math.min(t[0], t[1]);
      if (doublePips.has(hp) && ((hp === 5 && lp === 0) || (hp + lp === 5) || (hp + lp === 10))) {
        ntScore += 5;
      }
    }
    // Diverse doubles bonus
    if (doublePips.size >= 4) ntScore += 3;
    // Voids are BAD in NT
    let ntVoids = 0;
    for (let s = 0; s <= maxPip; s++) {
      if (hand.filter(t => t[0] === s || t[1] === s).length === 0) ntVoids++;
    }
    ntScore -= ntVoids * 5;
    ntScore -= 3; // NT inherent risk penalty
  }

  // ── Doubles trump scoring ──
  let dblScore = -Infinity;
  if (doubles.length >= 3) {
    dblScore = 0;
    dblScore += doubles.length * 18;
    if (doubles.length >= 5) dblScore += 15; // overwhelming count bonus
    // Non-double analysis: high non-doubles are strong in DOUBLES mode
    const nonDbl = hand.filter(t => t[0] !== t[1]);
    for (const t of nonDbl) {
      const hp = Math.max(t[0], t[1]);
      // If we hold this suit's double, the non-double is covered
      if (doublePips.has(hp)) dblScore += 6;
      else dblScore -= 3;
    }
    // DFM bonus scales with average double pip
    if (typeof doublesFollowMe !== 'undefined' && doublesFollowMe === 'on') {
      const avgPip = doubles.reduce((sum, d) => sum + d[0], 0) / doubles.length;
      dblScore += Math.round(avgPip * 2);
    }
  }

  // ── Pick the best ──
  if (ntScore > bestPipScore && ntScore > dblScore) return "NT";
  if (dblScore > bestPipScore && dblScore > ntScore) return "DOUBLES";
  return bestPip;
}

function choose_tile_ai(gameState, playerIndex, contract="NORMAL", returnRec=false, bid=34){
  const p = Number(playerIndex);
  const legal = gameState.legal_indices_for_player(p);
  const hand = gameState.hands[p] || [];
  const trick = gameState.current_trick || [];
  const isLead = trick.length === 0;

  // Debug info collector
  const _dbg = { enabled: returnRec };
  const _dbgCandidates = [];

  // Populate basic debug info BEFORE early returns so "Only legal move" still shows context
  if(_dbg.enabled){
    const _earlyLed = !isLead ? gameState._led_suit_for_trick() : null;
    _dbg.seat = p;
    _dbg.myTeam = GAME_MODE === 'MOON' ? p : (p % 2);
    _dbg.trickNum = gameState.trick_number;
    _dbg.isLead = isLead;
    _dbg.ledPip = _earlyLed === -1 ? 'TRUMP' : (_earlyLed !== null ? _earlyLed : null);
    _dbg.handTiles = hand.map(t => t[0]+'-'+t[1]);
    _dbg.legalTiles = legal.map(i => hand[i][0]+'-'+hand[i][1]);
    _dbg.playedCount = '(early)';
    _dbg.trumpMode = gameState.trump_mode;
    _dbg.trumpSuit = gameState.trump_suit;
    // Basic trump info for early exit
    const _ts = gameState.trump_suit;
    const _tm = gameState.trump_mode;
    const _earlyTrumpsInHand = hand.filter(t => gameState._is_trump_tile(t));
    _dbg.trumpsInHand = _earlyTrumpsInHand.map(t => t[0]+'-'+t[1]);
    _dbg.trumpsRemaining = []; // can't compute without full memory scan
    _dbg.iHaveHighestTrump = '(n/a - only legal move)';
    _dbg.myHighestTrumpRank = '(n/a)';
    _dbg.highestRemainingTrumpRank = '(n/a)';
  }

  const makeResult = (idx, reason) => {
    if(!returnRec) return idx;
    return { index: idx, tile: hand[idx], reason: reason, debugInfo: _dbg.enabled ? _dbg : null };
  };

  if(legal.length === 0) return makeResult(-1, "No legal moves");
  if(legal.length === 1) return makeResult(legal[0], "Only legal move");

  const trumpSuit = gameState.trump_suit;
  const trumpMode = gameState.trump_mode;
  const isNello = contract === "NELLO";
  const maxPip = gameState.max_pip;
  const myTeam = GAME_MODE === 'MOON' ? p : (p % 2);
  const isMoon = GAME_MODE === 'MOON';
  const isSameTeam = (seat) => isMoon ? seat === p : (seat % 2) === myTeam;
  const isOpponent = (seat) => seat !== p && !isSameTeam(seat);
  const trickNum = gameState.trick_number; // 0-indexed: how many tricks completed so far
  const totalTricks = gameState.hand_size || 6;

  // ── Led suit via game engine ──
  let ledPip = null;
  let trumpWasLed = false;
  if(!isLead){
    const engineLed = gameState._led_suit_for_trick();
    if(engineLed === -1) trumpWasLed = true;
    else if(engineLed !== null) ledPip = engineLed;
  }

  const legalTiles = legal.map(i => hand[i]);
  const canFollowSuit = ledPip !== null && legalTiles.some(t =>
    (t[0] === ledPip || t[1] === ledPip) && !gameState._is_trump_tile(t)
  );

  // ── Trick winner ──
  let currentWinner = null;
  let partnerWinning = false;
  let bidderWinning = false;
  if(trick.length > 0){
    const winnerSeat = gameState._determine_trick_winner();
    currentWinner = winnerSeat;
    partnerWinning = GAME_MODE !== 'MOON' && (winnerSeat % 2) === myTeam && winnerSeat !== p;
    if(isNello) bidderWinning = !isSameTeam(winnerSeat);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  TILE MEMORY — all played tiles
  // ═══════════════════════════════════════════════════════════════════
  const playedSet = new Set();
  const addPlayed = (t) => {
    if(!t) return;
    playedSet.add(Math.min(t[0],t[1]) + ',' + Math.max(t[0],t[1]));
  };

  // Build per-player play history for void detection
  // playerPlays[seat] = [ { tile, trickIdx, wasTrump, wasForced } ... ]
  const playerPlays = {};
  for(let s = 0; s < gameState.player_count; s++) playerPlays[s] = [];

  let trickIdx = 0;
  for(let team = 0; team < (gameState.tricks_team || []).length; team++){
    for(const record of (gameState.tricks_team[team] || [])){
      for(let seat = 0; seat < record.length; seat++){
        const t = record[seat];
        if(!t) continue;
        addPlayed(t);
        playerPlays[seat].push({
          tile: t,
          trickIdx: trickIdx,
          wasTrump: gameState._is_trump_tile(t)
        });
      }
      trickIdx++;
    }
  }
  // Current trick
  for(const play of trick){
    if(!Array.isArray(play)) continue;
    const [seat, t] = play;
    addPlayed(t);
    playerPlays[seat].push({
      tile: t,
      trickIdx: trickNum,
      wasTrump: gameState._is_trump_tile(t)
    });
  }
  // Our hand
  for(const t of hand) addPlayed(t);

  const isPlayed = (a, b) => playedSet.has(Math.min(a,b) + ',' + Math.max(a,b));

  // Debug: snapshot tile memory (overwrite early values with full analysis)
  if(_dbg.enabled){
    _dbg.playedCount = playedSet.size;
    _dbg.handTiles = hand.map(t => t[0]+'-'+t[1]);
    _dbg.legalTiles = legal.map(i => hand[i][0]+'-'+hand[i][1]);
    _dbg.trickNum = trickNum;
    _dbg.isLead = isLead;
    _dbg.ledPip = trumpWasLed ? 'TRUMP' : ledPip;
    _dbg.myTeam = myTeam;
    _dbg.seat = p;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  SUIT ANALYSIS — remaining tiles per suit
  // ═══════════════════════════════════════════════════════════════════
  const suitInfo = {};
  for(let pip = 0; pip <= maxPip; pip++){
    if(trumpMode === "PIP" && pip === trumpSuit) continue;
    const suitTiles = [];
    let countRemaining = 0;
    for(let other = 0; other <= maxPip; other++){
      const a = Math.min(pip, other), b = Math.max(pip, other);
      if(trumpMode === "PIP" && (a === trumpSuit || b === trumpSuit)) continue;
      if(trumpMode === "DOUBLES" && a === b) continue;
      if(!isPlayed(a, b)){
        const pts = (a + b === 5) ? 5 : (a + b === 10) ? 10 : 0;
        suitTiles.push({ tile: [a, b], count: pts });
        countRemaining += pts;
      }
    }
    suitInfo[pip] = {
      remaining: suitTiles,
      countRemaining: countRemaining,
      winnerPlayed: isPlayed(pip, pip),
      winnerCount: (pip + pip === 5) ? 5 : (pip + pip === 10) ? 10 : 0,
      tilesLeft: suitTiles.length
    };
  }

  // Debug: suit analysis
  if(_dbg.enabled){
    _dbg.suitAnalysis = {};
    for(const [pip, info] of Object.entries(suitInfo)){
      _dbg.suitAnalysis[pip] = {
        tilesLeft: info.tilesLeft,
        countExposure: info.countRemaining,
        doubleOut: info.winnerPlayed,
        doubleCount: info.winnerCount
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  TRUMP ANALYSIS
  // ═══════════════════════════════════════════════════════════════════
  const trumpsInHand = [];
  const trumpTilesRemaining = []; // unplayed, NOT in our hand
  const allTrumpTiles = []; // every trump tile in the game

  if(trumpMode === "PIP" && trumpSuit !== null){
    for(let other = 0; other <= maxPip; other++){
      const a = Math.min(trumpSuit, other), b = Math.max(trumpSuit, other);
      allTrumpTiles.push([a, b]);
      const inHand = hand.some(h => Math.min(h[0],h[1]) === a && Math.max(h[0],h[1]) === b);
      if(inHand) trumpsInHand.push([a, b]);
      else if(!isPlayed(a, b)) trumpTilesRemaining.push([a, b]);
    }
  } else if(trumpMode === "DOUBLES"){
    for(let v = 0; v <= maxPip; v++){
      allTrumpTiles.push([v, v]);
      const inHand = hand.some(h => h[0] === v && h[1] === v);
      if(inHand) trumpsInHand.push([v, v]);
      else if(!isPlayed(v, v)) trumpTilesRemaining.push([v, v]);
    }
  }

  const getTrumpRankNum = (t) => {
    const r = gameState._trump_rank(t);
    return r[0] * 100 + r[1];
  };
  const myHighestTrump = trumpsInHand.length > 0
    ? Math.max(...trumpsInHand.map(getTrumpRankNum)) : -1;
  const highestRemainingTrump = trumpTilesRemaining.length > 0
    ? Math.max(...trumpTilesRemaining.map(getTrumpRankNum)) : -1;
  const iHaveHighestTrump = trumpsInHand.length > 0 && myHighestTrump > highestRemainingTrump;

  // Debug: trump analysis
  if(_dbg.enabled){
    _dbg.trumpMode = trumpMode;
    _dbg.trumpSuit = trumpSuit;
    _dbg.trumpsInHand = trumpsInHand.map(t => t[0]+'-'+t[1]);
    _dbg.trumpsRemaining = trumpTilesRemaining.map(t => t[0]+'-'+t[1]);
    _dbg.iHaveHighestTrump = iHaveHighestTrump;
    _dbg.myHighestTrumpRank = myHighestTrump;
    _dbg.highestRemainingTrumpRank = highestRemainingTrump;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  VOID TRACKING — detect which players are void in which suits
  // ═══════════════════════════════════════════════════════════════════
  // voidIn[seat] = Set of pips that this player is confirmed void in
  // Also track trump voids specifically
  const voidIn = {};
  const trumpVoidConfirmed = {}; // seat → true if confirmed void in trump
  const trumpVoidLikely = {};    // seat → confidence 0-1

  for(let s = 0; s < gameState.player_count; s++){
    voidIn[s] = new Set();
    trumpVoidConfirmed[s] = false;
    trumpVoidLikely[s] = 0;
  }

  // Analyze completed tricks to find proven voids
  // We need to know what was led in each trick and what each player played
  // Reconstruct trick history from tricks_team records
  // tricks_team[team] = [ record1, record2, ... ] where record[seat] = tile or null
  // The leader of each trick can be inferred: trick 0 leader is from game start,
  // subsequent leaders are the winners of previous tricks.
  // However we don't have easy access to trick leaders from records alone.
  // Instead, use the play order tracked in playerPlays.

  // For void detection, we need: for each completed trick, what suit was led,
  // and did each player follow suit or not?
  // Simpler approach: for each player, for each suit, check if they ever played
  // off-suit when that suit was led. We can detect this from tricks_team.

  // Actually, let's build trick-by-trick from tricks_team with leader info.
  // The game tracks gameState.leader for current trick. For past tricks, the winner
  // of trick N became leader of trick N+1.
  // We don't have direct access to past leaders, but we can reconstruct:
  // the first leader is known from the hand start (stored in session).
  // But from choose_tile_ai we don't have session — only gameState.

  // SIMPLER APPROACH: For each completed trick, find who played what.
  // For each player that played a non-suit, non-trump tile when a suit was led
  // (and they didn't trump in), they're void in that suit.
  // We can detect this because legal_indices forces suit-following.
  // If a player played off-suit AND off-trump, they're void in the led suit.
  // If a player played trump when a non-trump was led, they're void in the led suit.

  // To know what suit was led in each trick, we need the leader's tile.
  // From tricks_team records, each record has tiles for each seat, but not play order.
  // We need to reconstruct leaders.

  // Let's track leaders: first trick leader = ? We don't know from gameState alone
  // unless trick_number > 0 and we can backtrack from current leader.
  // Actually current gameState.leader is the leader of the CURRENT trick
  // (who won the last completed trick). We can chain backwards but it's complex.

  // PRAGMATIC APPROACH: Scan through tricks_team and for each, figure out who
  // likely led based on the double rule (double always wins its suit).
  // OR just look at which seat's tile has the highest rank in the winning suit.

  // EVEN SIMPLER: For void detection, the KEY insight is:
  // If trump was the led suit (led pip = trump), and a player played non-trump,
  // they're void in trump.
  // If a non-trump suit X was led, and a player played a tile NOT containing pip X
  // AND that tile is NOT trump, then the player is void in suit X.
  // If they played trump when suit X was led, they're void in suit X (but have trump).

  // We CAN detect this from the current trick (we know the led pip).
  // For past tricks, we need led pip. Let's reconstruct from tricks_team:

  // Reconstruct all tricks with their leader
  const allCompletedTricks = []; // [ { leader, ledPip, plays: {seat: tile} }, ... ]

  // Merge both teams' trick records into chronological order
  // tricks_team[0] and tricks_team[1] are NOT interleaved by order — they're grouped by team.
  // We need a different approach. Let's use a sequence based on who led.

  // Alternative: since we tracked playerPlays by trickIdx, we can group by trickIdx.
  const tricksByIdx = {};
  for(let s = 0; s < gameState.player_count; s++){
    for(const pp of playerPlays[s]){
      if(!tricksByIdx[pp.trickIdx]) tricksByIdx[pp.trickIdx] = [];
      tricksByIdx[pp.trickIdx].push({ seat: s, tile: pp.tile, wasTrump: pp.wasTrump });
    }
  }

  // But we still need the leader for each trick. Let's track it:
  // The first leader of the hand... we don't know from gameState.
  // But we know: gameState.leader = leader of current (ongoing) trick = winner of last completed trick.
  // If trickNum = 0, gameState.leader is the hand's original leader.
  // If trickNum > 0, we can backtrack: winner of trick N = leader of trick N+1.
  // Winner of the last completed trick = gameState.leader (for the current trick).

  // For completed tricks, find winner by checking which team's record contains it.
  // Actually let's just detect voids from tricks_team differently:
  // For each record, identify the led suit by finding the highest-ranked tile
  // that matches the winning criteria. The LEADER played first. In the record,
  // the leader's tile determines the suit.

  // OK let me just do this practically. For each trick in tricksByIdx (completed ones only,
  // i.e. trickIdx < trickNum), we know all plays. The trick was won by whoever has the
  // highest trump (if any trumps) or highest of led suit. But we need to know WHO LED.

  // Let's reconstruct leaders chain:
  // leader[0] = hand's starting leader. We can approximate: if trickNum == 0,
  // it's gameState.leader. If trickNum > 0, we'd need to chain.
  // For simplicity: let's determine the first leader from the context.
  // The first leader of the hand is determined during bidding (stored in session, not gameState).
  // But if we look at tricks_team, the first trick leader could be any seat.

  // PRACTICAL SHORTCUT: Use the current trick's analysis for void detection
  // (we know ledPip) and for completed tricks, approximate:
  // For each seat in a completed trick, if they played a tile that doesn't contain
  // ANY of the pips of the tiles played by other players who played first... this is
  // getting too complicated for reconstruction.

  // BEST PRACTICAL APPROACH for void detection:
  // 1. From current trick: we know ledPip, analyze voids directly.
  // 2. For completed tricks: check if a player NEVER played a suit that was
  //    present in the trick. If 5+ players played suit X tiles and one didn't,
  //    that one is void.
  // 3. For TRUMP void: any player who played non-trump when they had the option
  //    to trump (off-suit play but no trump played) = void in trump.
  //    But actually: if you're off-suit, you CAN play anything including trump.
  //    If you're off-suit and DON'T play trump, you MIGHT be void in trump,
  //    or you might be saving it. We can't confirm trump void from this alone.
  //    CONFIRMED trump void: a trump suit was led and the player played non-trump.

  // For now, let's implement METHOD A (proven voids from current trick) and
  // METHOD B (inferred trump void from high-trump-on-losing-trick pattern).

  // Current trick void detection
  if(!isLead && ledPip !== null){
    for(const play of trick){
      if(!Array.isArray(play)) continue;
      const [seat, t] = play;
      if(seat === p) continue; // skip self
      const tileHasSuit = (t[0] === ledPip || t[1] === ledPip);
      const tileIsTrump = gameState._is_trump_tile(t);
      if(!tileHasSuit && !tileIsTrump){
        // Player is void in led suit AND void in trump
        voidIn[seat].add(ledPip);
        trumpVoidConfirmed[seat] = true;
      } else if(!tileHasSuit && tileIsTrump){
        // Player is void in led suit, but has trump
        voidIn[seat].add(ledPip);
      }
    }
  }
  // Current trick: trump was led
  if(!isLead && trumpWasLed){
    for(const play of trick){
      if(!Array.isArray(play)) continue;
      const [seat, t] = play;
      if(seat === p) continue;
      if(!gameState._is_trump_tile(t)){
        trumpVoidConfirmed[seat] = true;
      }
    }
  }

  // METHOD B: Inferred trump void from completed tricks
  // If a player played a high non-double trump on a trick that was won by a higher trump,
  // and that was the highest available non-double trump at the time, they likely had no choice.
  // Also: if a player was off-suit and didn't trump in, they MIGHT be void in trump.

  // Scan completed tricks for trump-void signals
  for(let team = 0; team < (gameState.tricks_team || []).length; team++){
    for(const record of (gameState.tricks_team[team] || [])){
      // Find what was played in this trick
      const plays = [];
      for(let seat = 0; seat < record.length; seat++){
        if(record[seat]) plays.push({ seat, tile: record[seat] });
      }
      if(plays.length === 0) continue;

      // Find the trick's led suit by finding which tile was the "leader's"
      // We approximate: the first non-null seat in ascending order from the leader...
      // This is imperfect but serviceable for void detection.

      // Check for non-suit, non-trump plays (proven void in suit)
      // We need to know the led suit for this trick.
      // Heuristic: find the suit that most tiles in this trick share.
      // The led suit = the pip that appears in the most tiles (excluding trumps).
      const pipCounts = {};
      for(const p2 of plays){
        const t = p2.tile;
        if(gameState._is_trump_tile(t)) continue;
        if(t[0] !== undefined) pipCounts[t[0]] = (pipCounts[t[0]] || 0) + 1;
        if(t[1] !== undefined) pipCounts[t[1]] = (pipCounts[t[1]] || 0) + 1;
      }
      let likelyLedPip = null;
      let maxCount = 0;
      for(const [pip, cnt] of Object.entries(pipCounts)){
        if(cnt > maxCount){ maxCount = cnt; likelyLedPip = Number(pip); }
      }

      // Skip suit-void analysis if this was a trump-led trick
      // (most tiles are trump → the non-trump tiles are dumps, not suit indicators)
      const trumpCount = plays.filter(p2 => gameState._is_trump_tile(p2.tile)).length;
      const wasTrumpLedTrick = trumpCount > plays.length / 2;

      if(likelyLedPip !== null && !wasTrumpLedTrick){
        for(const p2 of plays){
          const t = p2.tile;
          const seat = p2.seat;
          if(seat === p) continue;
          const hasSuit = t[0] === likelyLedPip || t[1] === likelyLedPip;
          const isTrump = gameState._is_trump_tile(t);
          if(!hasSuit && !isTrump){
            voidIn[seat].add(likelyLedPip);
            trumpVoidConfirmed[seat] = true;
          } else if(!hasSuit && isTrump){
            voidIn[seat].add(likelyLedPip);
          }
        }
      }
      // For trump-led tricks: detect trump voids (players who played non-trump)
      if(wasTrumpLedTrick){
        for(const p2 of plays){
          const t = p2.tile;
          const seat = p2.seat;
          if(seat === p) continue;
          if(!gameState._is_trump_tile(t)){
            trumpVoidConfirmed[seat] = true;
          }
        }
      }

      // ──────────────────────────────────────────────────────────────
      // PROBABILITY-BASED VOID DETECTION (count-trump aware)
      // ──────────────────────────────────────────────────────────────
      // Instead of basing void confidence on the RANK of the trump played,
      // we calculate the probability that each opponent is holding an
      // unaccounted trump. Key insight: a player who plays a high non-count
      // trump might be protecting a lower count trump — not void at all.
      //
      // Formula: For N opponents who played trump and U unaccounted trumps,
      //   void_probability = 1 - (U / N)    [chance they DON'T hold one]
      //
      // Count-trump factor: if unaccounted trumps include count tiles
      // (pip sum = 5 or 10), opponents may have sacrificed high trumps to
      // protect count. This increases U effectively.
      //
      // Partner hold-back: if an unaccounted count trump is ALSO the highest
      // remaining trump, a partner might be holding it strategically.
      // Don't count that against opponents (reduces U by 1).
      const trumpPlays = plays.filter(p2 => gameState._is_trump_tile(p2.tile));
      if(trumpPlays.length >= 2){
        trumpPlays.sort((a, b) => getTrumpRankNum(b.tile) - getTrumpRankNum(a.tile));

        // Identify opponents who played trump in this trick (excluding us and the double/winner)
        const opponentsInTrick = trumpPlays.filter(tp =>
          tp.seat !== p && !isSameTeam(tp.seat)
        );

        if(opponentsInTrick.length > 0){
          // Find unaccounted trumps at this point in the game
          // (not played in any completed trick up to now, not in our hand)
          // Note: trumpTilesRemaining was computed earlier from global state,
          // but we need trick-local analysis. Recompute for this trick context:
          const allPlayedInTrick = plays.map(p2 => p2.tile);
          const unaccountedAfterTrick = allTrumpTiles.filter(t => {
            // Skip doubles (they control, not relevant for void inference)
            if(t[0] === t[1]) return false;
            // In our hand?
            const inHand = hand.some(h =>
              Math.min(h[0],h[1]) === Math.min(t[0],t[1]) &&
              Math.max(h[0],h[1]) === Math.max(t[0],t[1]));
            if(inHand) return false;
            // Played in this trick?
            const inThisTrick = allPlayedInTrick.some(pt =>
              Math.min(pt[0],pt[1]) === Math.min(t[0],t[1]) &&
              Math.max(pt[0],pt[1]) === Math.max(t[0],t[1]));
            if(inThisTrick) return false;
            // Already played in earlier tricks? (check playedSet)
            if(isPlayed(t[0], t[1])) return false;
            return true;
          });

          // Check for count trumps among unaccounted
          const unaccountedCount = unaccountedAfterTrick.filter(t => {
            const s = t[0] + t[1];
            return s === 5 || s === 10;
          });

          // Partner hold-back: if an unaccounted count trump is also the
          // highest remaining non-double trump, a partner might hold it
          let partnerHoldBack = 0;
          if(unaccountedCount.length > 0){
            const highestRemainingRank = unaccountedAfterTrick.length > 0
              ? Math.max(...unaccountedAfterTrick.map(getTrumpRankNum)) : -1;
            for(const ct of unaccountedCount){
              if(getTrumpRankNum(ct) >= highestRemainingRank){
                // This count trump is the highest remaining — partner might hold it
                partnerHoldBack++;
              }
            }
          }

          const N = opponentsInTrick.length; // opponents who played trump
          // Effective unaccounted = total unaccounted minus partner hold-backs
          const U = Math.max(0, unaccountedAfterTrick.length - partnerHoldBack);

          // Calculate void probability for each opponent in this trick
          const voidProb = N > 0 ? Math.max(0, 1 - (U / N)) : 0.5;

          for(const opp of opponentsInTrick){
            // Only update if this gives higher confidence than what we already have
            const current = trumpVoidLikely[opp.seat] || 0;
            if(voidProb > current){
              trumpVoidLikely[opp.seat] = Math.min(1, voidProb);
            }
          }
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  RETROACTIVE CROSS-TRICK VOID ANALYSIS
  // ═══════════════════════════════════════════════════════════════════
  // After scanning all tricks, re-evaluate using cross-trick information:
  // 1. If a partner revealed a high trump later, we now know that an opponent
  //    who played a lower trump earlier couldn't have had the partner's trump.
  // 2. Recalculate void probability using updated knowledge of who holds what.
  {
    const trumpReveals = {}; // seat → [{rank, trickIdx, tile}]
    let retroTrickIdx = 0;
    for(let team = 0; team < (gameState.tricks_team || []).length; team++){
      for(const record of (gameState.tricks_team[team] || [])){
        for(let seat = 0; seat < record.length; seat++){
          const t = record[seat];
          if(!t || !gameState._is_trump_tile(t)) continue;
          if(!trumpReveals[seat]) trumpReveals[seat] = [];
          trumpReveals[seat].push({ rank: getTrumpRankNum(t), trickIdx: retroTrickIdx, tile: t });
        }
        retroTrickIdx++;
      }
    }

    // For each opponent, check if higher trumps were revealed by others.
    // If so, the opponent's play was genuinely their highest → upgrade confidence.
    // Also factor in count-trump awareness: if the only unaccounted trumps are
    // now known to be held by partners (from later reveals), opponents are more
    // likely void.
    for(let s = 0; s < gameState.player_count; s++){
      if(s === p) continue;
      if(isSameTeam(s)) continue;
      if(trumpVoidConfirmed[s]) continue;
      const oppPlays = trumpReveals[s] || [];
      if(oppPlays.length === 0) continue;

      for(const play of oppPlays){
        let higherRevealedByOthers = false;
        for(let otherSeat = 0; otherSeat < gameState.player_count; otherSeat++){
          if(otherSeat === s || otherSeat === p) continue;
          const otherPlays = trumpReveals[otherSeat] || [];
          for(const op of otherPlays){
            if(op.rank > play.rank){
              higherRevealedByOthers = true;
              break;
            }
          }
          if(higherRevealedByOthers) break;
        }
        if(higherRevealedByOthers){
          // Opponent's play was their actual best — upgrade confidence
          // But still respect count-awareness: check if unaccounted count trumps
          // could explain why they played high (protecting count).
          // If the higher trump was revealed by a PARTNER, then the opponent
          // definitely didn't have it → their high play was forced.
          const currentConf = trumpVoidLikely[s] || 0;

          // Check if any unaccounted count trumps remain
          const unaccountedCountTrumps = trumpTilesRemaining.filter(t => {
            const sum = t[0] + t[1];
            return (sum === 5 || sum === 10) && t[0] !== t[1];
          });

          if(unaccountedCountTrumps.length === 0){
            // No count trumps unaccounted → opponent was definitely forced
            trumpVoidLikely[s] = Math.min(1, Math.max(currentConf, 0.9));
          } else {
            // Count trumps still unaccounted → opponent might be protecting count
            // But we have retroactive evidence → moderate upgrade
            trumpVoidLikely[s] = Math.min(1, Math.max(currentConf, 0.75));
          }
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  SIGNAL TRACKING — partner/opponent suit strength signals
  // ═══════════════════════════════════════════════════════════════════
  // For each pip 0..maxPip, accumulate a "strength signal" from each player's plays.
  // Higher partner signal = partner is strong in that suit → safe to lead.
  // Higher opponent signal = opponent is strong → avoid leading into that suit.
  const partnerSignal = {};   // pip → total signal from all partners
  const opponentSignal = {};  // pip → total signal from all opponents
  for(let pip = 0; pip <= maxPip; pip++){
    partnerSignal[pip] = 0;
    opponentSignal[pip] = 0;
  }

  // Helper: is this the double for a pip?
  const isDouble = (t, pip) => t[0] === pip && t[1] === pip;

  // Helper: determine the "suit pip" of a non-trump tile (the higher end, or the matching end)
  const tileSuitPip = (t) => {
    if(gameState._is_trump_tile(t)) return -1; // trump, no suit signal
    return Math.max(t[0], t[1]);
  };

  // For each completed trick + current trick, analyze each player's plays
  // We need to know if the player LED the trick for the 1.5x multiplier.
  // Build a simple leader chain: leader of trick 0 is unknown unless trickNum=0,
  // but we can approximate from gameState.leader (current trick leader).
  // Chain backwards: leader of trick N = winner of trick N-1.
  // Winner of the last completed trick = gameState.leader.
  // We don't have winner info per trick, but we can approximate:
  // For the current trick, the leader is gameState.leader.
  // For signals, the leading multiplier is a bonus, not critical — skip if unknown.

  // Scan all player plays and accumulate signals
  for(let s = 0; s < gameState.player_count; s++){
    if(s === p) continue; // skip self
    const isPartner = isSameTeam(s);

    for(const pp of playerPlays[s]){
      const t = pp.tile;
      if(gameState._is_trump_tile(t)) continue; // trump plays don't signal suit strength

      const pip = tileSuitPip(t);
      if(pip < 0 || pip > maxPip) continue;

      // Check if player is now void in this suit (decay: reset signal)
      if(voidIn[s].has(pip)) continue;

      let signal = 0;

      if(isDouble(t, pip)){
        // Played the double of this suit — strong signal
        signal = 20;
      } else {
        // Check if this is a sequential tile (2nd or 3rd highest in suit)
        // The double is rank 1, then [pip, pip-1] is rank 2, [pip, pip-2] is rank 3
        const otherEnd = (t[0] === pip) ? t[1] : t[0];
        if(otherEnd >= pip - 2 && otherEnd >= 0){
          // Sequential (high) tile
          signal = 8;
        } else {
          // Any other tile in the suit
          signal = 5;
        }
      }

      // Leading multiplier: if this was the first play in its trick, it's a lead
      // Approximate: check if trick index matches and this was the earliest play
      const trickPlays = tricksByIdx[pp.trickIdx] || [];
      if(trickPlays.length > 0 && trickPlays[0].seat === s){
        // This player was first in the trick record — likely the leader
        signal = Math.round(signal * 1.5);
      }

      if(isPartner){
        partnerSignal[pip] += signal;
      } else {
        opponentSignal[pip] += signal;
      }
    }
  }

  // Decay: if a player showed void in a suit, their prior signals are invalid.
  // We already skip void players above via the voidIn check, but for completeness
  // reset signals for suits where ALL partners (or ALL opponents) are void.
  // This is handled implicitly by the continue above.

  // ═══════════════════════════════════════════════════════════════════
  //  TRUMP CONTROL DETECTION
  // ═══════════════════════════════════════════════════════════════════
  // We have trump control if ALL opponents are void in trump (confirmed or highly likely)
  let opponentsVoidInTrump = true;
  for(let s = 0; s < gameState.player_count; s++){
    if(isSameTeam(s)) continue; // skip teammates
    if(!gameState.active_players.includes(s)) continue; // skip inactive
    if(!trumpVoidConfirmed[s] && trumpVoidLikely[s] < 0.8){
      opponentsVoidInTrump = false;
      break;
    }
  }

  // Also: if all trump tiles are accounted for (in our hand + played), opponents are void
  if(trumpTilesRemaining.length === 0 && trumpMode !== "NONE"){
    // All trumps are either played or in our hand — we have full trump control
    opponentsVoidInTrump = true;
  }

  // Partners have trump = check if any partners still have trump tiles
  let partnersHaveTrump = false;
  for(let s = 0; s < gameState.player_count; s++){
    if(!isSameTeam(s) || s === p) continue;
    if(!trumpVoidConfirmed[s] && trumpVoidLikely[s] < 0.5){
      // Partner might still have trump
      partnersHaveTrump = true;
      break;
    }
  }

  // ENHANCED: Even if trumpTilesRemaining > 0, if all opponents are confirmed/likely
  // void in trump, the remaining trumps must be held by partners.
  // Don't waste high trumps pulling partner trumps — treat as trump control.
  let partnersHoldRemainingTrumps = false;
  if(opponentsVoidInTrump && trumpTilesRemaining.length > 0){
    // All remaining trumps are held by partners
    partnersHoldRemainingTrumps = true;
  }
  // V12.5: Moon is individual — no partners exist
  if(isMoon){ partnersHaveTrump = false; partnersHoldRemainingTrumps = false; }

  const weHaveTrumpControl = opponentsVoidInTrump && (trumpsInHand.length > 0 || partnersHaveTrump);

  // Debug: void tracking + trump control
  if(_dbg.enabled){
    _dbg.voidTracking = {};
    for(let s = 0; s < gameState.player_count; s++){
      if(s === p) continue;
      const voids = Array.from(voidIn[s]);
      const pLabel = (typeof seatToPlayer === 'function') ? ('P'+seatToPlayer(s)) : ('P'+(s+1));
      _dbg.voidTracking[pLabel] = {
        team: isSameTeam(s) ? 'ours' : 'opp',
        voidSuits: voids,
        trumpVoidConfirmed: trumpVoidConfirmed[s],
        trumpVoidLikely: trumpVoidLikely[s]
      };
    }
    _dbg.opponentsVoidInTrump = opponentsVoidInTrump;
    _dbg.partnersHoldRemainingTrumps = partnersHoldRemainingTrumps;
    _dbg.partnersHaveTrump = partnersHaveTrump;
    _dbg.weHaveTrumpControl = weHaveTrumpControl;
    _dbg.partnerSignal = {...partnerSignal};
    _dbg.opponentSignal = {...opponentSignal};
  }

  // ═══════════════════════════════════════════════════════════════════
  //  BID SAFETY — how many points do we still need?
  // ═══════════════════════════════════════════════════════════════════
  const currentBid = bid || (isMoon ? 4 : (GAME_MODE === 'TN51' ? 34 : 30));
  const bidderSeat = gameState.bid_winner_seat !== undefined ? gameState.bid_winner_seat : 0;
  const bidderTeamIdx = isMoon ? bidderSeat : (bidderSeat % 2);
  const isBidderTeam = isMoon ? (p === bidderSeat) : (myTeam === bidderTeamIdx);
  const iAmBidder = p === bidderSeat;
  const ourScore = gameState.team_points[myTeam] || 0;
  const bidderScore = gameState.team_points[bidderTeamIdx] || 0;
  const pointsNeeded = currentBid - (isBidderTeam ? ourScore : bidderScore);
  const bidIsSafe = isBidderTeam ? (pointsNeeded <= 0) : false;
  const bidIsClose = pointsNeeded > 0 && pointsNeeded <= 6;
  const tricksLeft = totalTricks - trickNum;
  // Maximum possible remaining points
  const maxRemainingPoints = tricksLeft; // each trick = 1 point, plus any count tiles
  let remainingCountValue = 0;
  for (let pip = 0; pip <= maxPip; pip++) {
    for (let pip2 = 0; pip2 <= pip; pip2++) {
      const sum = pip + pip2;
      if (sum !== 5 && sum !== 10) continue;
      const tile = [pip, pip2];
      const tileKey = pip * 10 + pip2;
      if (!playedSet.has(tile[0] + ',' + tile[1]) && !playedSet.has(tile[1] + ',' + tile[0])) {
        remainingCountValue += sum;
      }
    }
  }
  const bidDoomed = isBidderTeam && pointsNeeded > (maxRemainingPoints + remainingCountValue);
  const canRelax = isBidderTeam && bidIsSafe && (ourScore - currentBid) > remainingCountValue / 2;
  // Defender urgency: 0-100 scale
  let setBidUrgency = 0;
  if (!isBidderTeam && !isMoon) {
    const bidderNeeds = currentBid - bidderScore;
    if (bidderNeeds <= 0) setBidUrgency = 0; // bidder already made it
    else {
      setBidUrgency = Math.min(100, Math.round((1 - bidderNeeds / currentBid) * 80));
      // Bonus for mark-critical hands
      const bidMarks = (typeof session !== 'undefined' && session.bid_marks) ? session.bid_marks : 1;
      if (bidMarks >= 2) setBidUrgency = Math.min(100, setBidUrgency + 15);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  ENDGAME AWARENESS
  // ═══════════════════════════════════════════════════════════════════
  const preEndgame = tricksLeft === 2;
  const endgame = tricksLeft === 1;
  const mustWinCountTricks = isBidderTeam && !bidIsSafe && pointsNeeded > tricksLeft;

  // ═══════════════════════════════════════════════════════════════════
  //  LAST TRUMP PROTECTION
  // ═══════════════════════════════════════════════════════════════════
  const isLastTrump = trumpsInHand.length === 1;
  // Save last trump UNLESS: bid is not safe and we need to win now, OR it's the last trick
  const shouldSaveLastTrump = isLastTrump && !bidIsClose && tricksLeft > 1;

  // Debug: bid safety + last trump + endgame
  if(_dbg.enabled){
    _dbg.bidSafety = {
      currentBid: currentBid,
      ourScore: ourScore,
      pointsNeeded: pointsNeeded,
      bidIsSafe: bidIsSafe,
      bidIsClose: bidIsClose,
      tricksLeft: tricksLeft,
      preEndgame: preEndgame,
      endgame: endgame,
      mustWinCountTricks: mustWinCountTricks,
      bidDoomed: bidDoomed,
      canRelax: canRelax,
      setBidUrgency: setBidUrgency
    };
    _dbg.lastTrump = {
      isLastTrump: isLastTrump,
      shouldSaveLastTrump: shouldSaveLastTrump
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  NEL-O LOGIC (unchanged from v2)
  // ═══════════════════════════════════════════════════════════════════
  if(isNello){
    // Nello Doubles Only: doubles are their own suit, treat them as normal tiles for AI strategy
    const _nelloDbls = gameState.nello_doubles_suit;
    if(isLead){
      let lowNDIdx = -1, lowNDVal = Infinity, lowIdx = legal[0], lowVal = Infinity;
      for(const idx of legal){
        const tile = hand[idx], val = tile[0]+tile[1], dbl = tile[0]===tile[1];
        if(val < lowVal){ lowVal = val; lowIdx = idx; }
        // In doubles-only mode, doubles are valid low plays (they're their own suit)
        if((!dbl || _nelloDbls) && val < lowNDVal){ lowNDVal = val; lowNDIdx = idx; }
      }
      return lowNDIdx >= 0
        ? makeResult(lowNDIdx, "Nel-O: lead low (force bidder high)")
        : makeResult(lowIdx, "Nel-O: lead low");
    }
    if(bidderWinning){
      let highIdx = legal[0], highVal = 0;
      for(const idx of legal){
        const val = hand[idx][0]+hand[idx][1];
        if(val > highVal){ highVal = val; highIdx = idx; }
      }
      return makeResult(highIdx, "Nel-O: bidder winning, play high");
    }
    {
      let lowNDIdx = -1, lowNDVal = Infinity, lowIdx = legal[0], lowVal = Infinity;
      for(const idx of legal){
        const tile = hand[idx], val = tile[0]+tile[1], dbl = tile[0]===tile[1];
        if(val < lowVal){ lowVal = val; lowIdx = idx; }
        // In doubles-only mode, doubles are valid low plays
        if((!dbl || _nelloDbls) && val < lowNDVal){ lowNDVal = val; lowNDIdx = idx; }
      }
      const reason = partnerWinning
        ? (lowNDIdx >= 0 ? "Nel-O: partner winning, play low" : "Nel-O: partner winning, forced to play double")
        : (lowNDIdx >= 0 ? "Nel-O: play low" : "Nel-O: play low to avoid winning");
      return makeResult(lowNDIdx >= 0 ? lowNDIdx : lowIdx, reason);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  TWO-TRICK LOOKAHEAD — simulate both lead options when 2 tricks remain
  // ═══════════════════════════════════════════════════════════════════
  if(preEndgame && isLead && legal.length === 2 && !isNello){
    // With exactly 2 tricks remaining and 2 tiles in hand, simulate both leads.
    // For each lead option, estimate who wins trick 1 and trick 2.
    // Score = tricks won by our team + count captured.
    let bestLookaheadIdx = -1;
    let bestLookaheadScore = -Infinity;
    const _lookaheadDebug = [];

    for(const leadIdx of legal){
      const leadTile = hand[leadIdx];
      const otherIdx = legal.find(i => i !== leadIdx);
      const otherTile = hand[otherIdx];
      const leadIsTrump = gameState._is_trump_tile(leadTile);
      const leadIsDouble = leadTile[0] === leadTile[1];
      const leadPipVal = Math.max(leadTile[0], leadTile[1]);
      const leadCount = ((leadTile[0] + leadTile[1]) === 5 || (leadTile[0] + leadTile[1]) === 10)
        ? (leadTile[0] + leadTile[1]) : 0;
      const otherIsTrump = gameState._is_trump_tile(otherTile);
      const otherIsDouble = otherTile[0] === otherTile[1];
      const otherCount = ((otherTile[0] + otherTile[1]) === 5 || (otherTile[0] + otherTile[1]) === 10)
        ? (otherTile[0] + otherTile[1]) : 0;

      let score = 0;

      // Estimate trick 1 win probability
      let weWinTrick1 = false;
      if(leadIsTrump && leadIsDouble){
        // Trump double: guaranteed win
        weWinTrick1 = true;
      } else if(leadIsTrump && iHaveHighestTrump){
        // Highest remaining trump: very likely win
        weWinTrick1 = true;
      } else if(!leadIsTrump && leadIsDouble){
        // Non-trump double: wins unless someone trumps in
        // Check if any opponent can trump this suit
        let oppCanTrump = false;
        for(let s = 0; s < gameState.player_count; s++){
          if(isSameTeam(s) || s === p) continue;
          if(!gameState.active_players.includes(s)) continue;
          if(voidIn[s].has(leadPipVal) && !trumpVoidConfirmed[s] && trumpVoidLikely[s] < 0.7){
            oppCanTrump = true; break;
          }
        }
        weWinTrick1 = !oppCanTrump || opponentsVoidInTrump;
      } else if(leadIsTrump){
        // Non-highest trump: uncertain, ~50%
        weWinTrick1 = trumpTilesRemaining.length <= 1;
      } else {
        // Non-trump non-double: risky unless double is out
        const info = suitInfo[leadPipVal];
        weWinTrick1 = info && info.winnerPlayed && info.tilesLeft === 0;
      }

      // Partner cooperative: if partner might win trick 1 for us
      if(!weWinTrick1 && !isMoon){
        // Check if partner might be strong in the led suit
        if(!leadIsTrump && partnerSignal[leadPipVal] >= 15) weWinTrick1 = true;
      }

      // Estimate trick 2: if we win trick 1, we lead trick 2 with the other tile
      // If we lose trick 1, we play the other tile as a follow/dump
      let weWinTrick2 = false;
      if(weWinTrick1){
        // We lead trick 2 with otherTile
        if(otherIsTrump && otherIsDouble) weWinTrick2 = true;
        else if(otherIsTrump) weWinTrick2 = trumpTilesRemaining.length <= 1;
        else if(otherIsDouble) weWinTrick2 = opponentsVoidInTrump;
        else weWinTrick2 = false; // unlikely to win with a random off
      } else {
        // Opponent leads trick 2 — we're following. Low chance of winning unless we have trump
        if(otherIsTrump && !trumpVoidConfirmed[p]) weWinTrick2 = true; // can trump in
        else weWinTrick2 = false;
      }

      // Score calculation
      if(weWinTrick1) score += 1 + leadCount;
      if(weWinTrick2) score += 1 + otherCount;
      // Defensive consideration: if we can't win either, minimize count loss
      if(!weWinTrick1 && !weWinTrick2){
        score -= leadCount + otherCount; // penalize leading count into losses
      }
      // Bidder team bonus for count capture
      if(isBidderTeam && !bidIsSafe){
        if(weWinTrick1) score += leadCount * 0.5;
        if(weWinTrick2) score += otherCount * 0.5;
      }

      _lookaheadDebug.push({
        lead: leadTile[0]+'-'+leadTile[1],
        follow: otherTile[0]+'-'+otherTile[1],
        winTrick1: weWinTrick1,
        winTrick2: weWinTrick2,
        score: score
      });

      if(score > bestLookaheadScore){
        bestLookaheadScore = score;
        bestLookaheadIdx = leadIdx;
      }
    }

    if(_dbg.enabled) _dbg.twoTrickLookahead = _lookaheadDebug;

    // Only use lookahead if it gives a clear winner (>0 difference between options)
    if(bestLookaheadIdx >= 0 && _lookaheadDebug.length === 2 &&
       Math.abs(_lookaheadDebug[0].score - _lookaheadDebug[1].score) > 0){
      return makeResult(bestLookaheadIdx, "Lead: 2-trick lookahead (optimal sequence)");
    }
    // If tied, fall through to normal lead logic
  }

  // ═══════════════════════════════════════════════════════════════════
  //  NORMAL GAME — LEAD LOGIC
  // ═══════════════════════════════════════════════════════════════════
  if(isLead){
    const trumpDoubles = [];
    const otherTrumps = [];
    const nonTrumpDoubles = [];
    const nonTrumpSingles = [];

    for(const idx of legal){
      const tile = hand[idx];
      const dbl = tile[0] === tile[1];
      const isTrump = gameState._is_trump_tile(tile);
      if(isTrump && dbl) trumpDoubles.push(idx);
      else if(isTrump) otherTrumps.push(idx);
      else if(dbl) nonTrumpDoubles.push(idx);
      else nonTrumpSingles.push(idx);
    }

    if(_dbg.enabled){
      let phaseLabel;
      if(weHaveTrumpControl) phaseLabel = 'B (trump control)';
      else if(partnersHoldRemainingTrumps) phaseLabel = 'A (partners hold trumps)';
      else phaseLabel = 'A/C (no control)';
      _dbg.leadCategories = {
        trumpDoubles: trumpDoubles.map(i => hand[i][0]+'-'+hand[i][1]),
        otherTrumps: otherTrumps.map(i => hand[i][0]+'-'+hand[i][1]),
        nonTrumpDoubles: nonTrumpDoubles.map(i => hand[i][0]+'-'+hand[i][1]),
        nonTrumpSingles: nonTrumpSingles.map(i => hand[i][0]+'-'+hand[i][1]),
        phase: phaseLabel,
        partnersHoldTrumps: partnersHoldRemainingTrumps,
        sacrificeLowTrumpEligible: partnersHoldRemainingTrumps && nonTrumpDoubles.length === 0 && otherTrumps.length >= 2,
        sacrificeRankCheck: (function(){
          if(!partnersHoldRemainingTrumps || nonTrumpDoubles.length > 0 || otherTrumps.length < 2) return null;
          const myLow = Math.min(...otherTrumps.map(i => getTrumpRankNum(hand[i])));
          const partnerHigh = trumpTilesRemaining.length > 0 ? Math.max(...trumpTilesRemaining.map(getTrumpRankNum)) : -1;
          return { myLowestRank: myLow, partnerHighestRank: partnerHigh, partnerCanBeat: partnerHigh > myLow };
        })()
      };
    }

    // ── COVERED OFF ENDGAME STRATEGY (V10_78) ──
    // Detects hands of doubles + covered offs and plays optimal order:
    // NT: regular doubles (low→high) → covering doubles → offs (as walkers)
    // Trump: trumps (high→low) → regular doubles → covering doubles → offs
    {
      // Analyze hand composition: find covered offs and their covering doubles
      const coveredOffs = [];   // {offIdx, offTile, coverPip, coverDoubleIdx}
      const coveringDoubleIdxs = new Set();

      for (const idx of nonTrumpSingles) {
        const tile = hand[idx];
        const highPip = Math.max(tile[0], tile[1]);
        // Check if we hold the double of the high pip
        for (const dIdx of nonTrumpDoubles) {
          const dTile = hand[dIdx];
          if (dTile[0] === highPip && dTile[1] === highPip) {
            coveredOffs.push({ offIdx: idx, offTile: tile, coverPip: highPip, coverDoubleIdx: dIdx });
            coveringDoubleIdxs.add(dIdx);
            break;
          }
        }
      }

      // Count uncovered offs (singles that are NOT covered by any double we hold)
      const uncoveredOffs = nonTrumpSingles.filter(idx => !coveredOffs.some(co => co.offIdx === idx));

      // Check if this strategy applies:
      // - Must have at least 1 covered off
      // - At most 2 uncovered offs (still viable)
      // - Rest should be doubles (covering or regular) and possibly trumps
      const regularDoubles = nonTrumpDoubles.filter(idx => !coveringDoubleIdxs.has(idx));
      const allTrumps = [...trumpDoubles, ...otherTrumps];
      const totalManaged = allTrumps.length + regularDoubles.length + coveringDoubleIdxs.size + coveredOffs.length;

      // Strategy activates when hand is mostly doubles + covered offs
      // and bid is high (>=42 in T42 or >= 42 in TN51) OR it's No Trumps
      const isNT = trumpMode === 'NONE';
      const isHighBid = (bid >= 42) || isNT;
      const handMostlyManaged = totalManaged >= legal.length - 2; // allow up to 2 unmanaged tiles

      if (coveredOffs.length >= 1 && uncoveredOffs.length <= 2 && isHighBid && handMostlyManaged) {
        if(_dbg.enabled) _dbg.coveredOffStrategy = {
          coveredOffs: coveredOffs.map(co => hand[co.offIdx][0]+'-'+hand[co.offIdx][1] + ' (covered by ' + co.coverPip + '-' + co.coverPip + ')'),
          regularDoubles: regularDoubles.map(i => hand[i][0]+'-'+hand[i][1]),
          coveringDoubles: [...coveringDoubleIdxs].map(i => hand[i][0]+'-'+hand[i][1]),
          allTrumps: allTrumps.map(i => hand[i][0]+'-'+hand[i][1]),
          uncoveredOffs: uncoveredOffs.map(i => hand[i][0]+'-'+hand[i][1]),
          isNT: isNT,
          activated: true
        };

        // PLAY ORDER:
        // 1. Trumps first (high→low) if any — pull opponent trumps
        if (allTrumps.length > 0) {
          // Sort trumps: play trump doubles first, then highest pip sum
          let bestTrumpIdx = allTrumps[0], bestTrumpScore = -Infinity;
          for (const idx of allTrumps) {
            const tile = hand[idx];
            const dbl = tile[0] === tile[1];
            let score = tile[0] + tile[1];
            if (dbl) score += 100; // trump doubles first
            if (score > bestTrumpScore) { bestTrumpScore = score; bestTrumpIdx = idx; }
          }
          return makeResult(bestTrumpIdx, "Lead: covered-off strategy — play trump first");
        }

        // 2. Regular doubles (NOT covering any off) — low to high
        if (regularDoubles.length > 0) {
          let lowestIdx = regularDoubles[0], lowestPip = Infinity;
          for (const idx of regularDoubles) {
            const pip = hand[idx][0];
            if (pip < lowestPip) { lowestPip = pip; lowestIdx = idx; }
          }
          return makeResult(lowestIdx, "Lead: covered-off strategy — regular double (low→high)");
        }

        // 3. Covering doubles — pick the one whose suit has fewest remaining tiles
        //    (most likely the off will walk after playing this double)
        if (coveringDoubleIdxs.size > 0) {
          let bestCoverIdx = -1, bestCoverScore = -Infinity;
          for (const dIdx of coveringDoubleIdxs) {
            const pip = hand[dIdx][0];
            const info = suitInfo[pip];
            // Prefer suits with fewer remaining tiles (off more likely to walk)
            let score = 0;
            if (info) {
              // Fewer tiles left = better (off more likely to be highest remaining)
              score = 100 - (info.tilesLeft * 10);
              // Check if the off would be the highest remaining after this double is played
              const offForThis = coveredOffs.find(co => co.coverDoubleIdx === dIdx);
              if (offForThis) {
                const offTile = offForThis.offTile;
                const offHighPip = Math.max(offTile[0], offTile[1]);
                const offLowPip = Math.min(offTile[0], offTile[1]);
                // Check if any higher tile in this suit is still unplayed (by anyone else)
                let isWalker = true;
                for (let otherPip = offHighPip; otherPip >= 0; otherPip--) {
                  if (otherPip === offLowPip) continue; // skip our own tile
                  if (otherPip === offHighPip) continue; // the double we're about to play
                  const otherTile = [Math.min(offHighPip, otherPip), Math.max(offHighPip, otherPip)];
                  if (!isPlayed(otherTile[0], otherTile[1])) {
                    isWalker = false;
                    break;
                  }
                }
                if (isWalker) score += 200; // huge bonus if off is guaranteed walker
              }
            }
            if (score > bestCoverScore) { bestCoverScore = score; bestCoverIdx = dIdx; }
          }
          if (bestCoverIdx >= 0) {
            return makeResult(bestCoverIdx, "Lead: covered-off strategy — covering double (pull suit)");
          }
        }

        // 4. Play covered off (should be a walker now)
        if (coveredOffs.length > 0) {
          // Pick the off whose suit has fewest remaining tiles (most likely walker)
          let bestOffIdx = coveredOffs[0].offIdx, bestOffScore = -Infinity;
          for (const co of coveredOffs) {
            const pip = co.coverPip;
            const info = suitInfo[pip];
            let score = 0;
            if (info) score = 100 - info.tilesLeft * 10;
            if (score > bestOffScore) { bestOffScore = score; bestOffIdx = co.offIdx; }
          }
          return makeResult(bestOffIdx, "Lead: covered-off strategy — play off (walker)");
        }

        // 5. Uncovered offs last (risky but no choice)
        if (uncoveredOffs.length > 0) {
          // Pick lowest value to minimize loss
          let lowIdx = uncoveredOffs[0], lowVal = Infinity;
          for (const idx of uncoveredOffs) {
            const val = hand[idx][0] + hand[idx][1];
            if (val < lowVal) { lowVal = val; lowIdx = idx; }
          }
          return makeResult(lowIdx, "Lead: covered-off strategy — uncovered off (risky)");
        }
      }
    }

    // ── PHASE A: TRUMP PULLING (before we have trump control) ──
    if(!weHaveTrumpControl){

      // P1: Lead trump double — guaranteed win, pulls opponents' trump
      if(trumpDoubles.length > 0){
        return makeResult(trumpDoubles[0], "Lead: trump double (pulls trumps)");
      }

      // P2: Lead trump IF we have the highest remaining
      // BUT respect last-trump protection
      // AND don't waste high trumps pulling partner's trumps
      // PICK LOWEST VALUE trump to avoid wasting count tiles (5-1 worth 5pts, etc.)
      if(otherTrumps.length > 0 && iHaveHighestTrump && !shouldSaveLastTrump && !partnersHoldRemainingTrumps){
        let bestIdx = otherTrumps[0], bestVal = Infinity;
        for(const idx of otherTrumps){
          const tile = hand[idx];
          const pipSum = tile[0] + tile[1];
          if(pipSum < bestVal){ bestVal = pipSum; bestIdx = idx; }
        }
        return makeResult(bestIdx, "Lead: low-value trump (pulling remaining trumps)");
      }

      // P3: Early game trump aggression — lead trump even without highest
      // if we have 2+ trumps, it's trick 0 or 1, and bid isn't safe yet
      // Skip if remaining trumps are only held by partners (don't pull partner trumps)
      // PICK LOWEST VALUE trump to avoid wasting count tiles
      if(otherTrumps.length >= 2 && trickNum <= 1 && !bidIsSafe && !partnersHoldRemainingTrumps){
        let bestIdx = otherTrumps[0], bestVal = Infinity;
        for(const idx of otherTrumps){
          const tile = hand[idx];
          const pipSum = tile[0] + tile[1];
          if(pipSum < bestVal){ bestVal = pipSum; bestIdx = idx; }
        }
        return makeResult(bestIdx, "Lead: early trump (forcing opponent trumps)");
      }

      // P4: Sacrifice low trump to get partner in the lead
      // When: partners hold remaining trumps, we have no non-trump doubles to guarantee wins,
      // and we have 2+ trumps (can afford to sacrifice one).
      // Lead our LOWEST trump — partner's higher trump beats it, partner gets the lead.
      // CRITICAL: Only do this if a partner's trump can actually BEAT our lowest trump.
      // If our lowest trump outranks all remaining trumps, we'd win our own trick (pointless).
      // Don't do this with only 1 trump (save it as get-back-in card).
      if(partnersHoldRemainingTrumps && nonTrumpDoubles.length === 0 && otherTrumps.length >= 2){
        // Find lowest non-double trump in our hand
        let lowIdx = otherTrumps[0], lowR = Infinity;
        for(const idx of otherTrumps){
          const r = getTrumpRankNum(hand[idx]);
          if(r < lowR){ lowR = r; lowIdx = idx; }
        }
        // Check: can any remaining trump (held by partner) beat our lowest?
        const highestPartnerTrump = trumpTilesRemaining.length > 0
          ? Math.max(...trumpTilesRemaining.map(getTrumpRankNum)) : -1;
        if(highestPartnerTrump > lowR){
          return makeResult(lowIdx, "Lead: low trump sacrifice (giving partner the lead)");
        }
        // Partner can't beat our lowest trump — skip sacrifice, fall through to non-trump leads
      }
    }

    // ── PHASE B: WE HAVE TRUMP CONTROL — play doubles, try partner-in-lead ──
    if(weHaveTrumpControl){

      // Don't lead more trumps — don't pull partner's trumps!
      // Lead non-trump doubles first (guaranteed wins since opponents can't trump)
      if(nonTrumpDoubles.length > 0){
        let bestIdx = nonTrumpDoubles[0], bestScore = -Infinity;
        for(const idx of nonTrumpDoubles){
          const pip = hand[idx][0];
          const info = suitInfo[pip];
          if(!info) continue;
          let score = 100 + info.countRemaining + pip;
          if(score > bestScore){ bestScore = score; bestIdx = idx; }
        }
        return makeResult(bestIdx, "Lead: double (trump control, safe win)");
      }

      // No more doubles — try to get PARTNER in the lead
      // Lead a suit where we have a LOW tile, hoping partner has a higher one
      // Prefer suits where the double hasn't been played (partner might have it)
      // Avoid suits where opponents are NOT void (they could win)
      if(nonTrumpSingles.length > 0){
        let bestIdx = nonTrumpSingles[0], bestScore = -Infinity;

        for(const idx of nonTrumpSingles){
          const tile = hand[idx];
          const pipSum = tile[0] + tile[1];
          const myCount = (pipSum === 5) ? 5 : (pipSum === 10) ? 10 : 0;
          const ledSuit = Math.max(tile[0], tile[1]);
          const info = suitInfo[ledSuit];
          let score = 0;

          if(!info){ score -= 50; } else {
            // If the double is unplayed and we don't have it, partner might!
            if(!info.winnerPlayed){
              // Check: do we have the double? If not, maybe partner does
              const weHaveDouble = hand.some(h => h[0] === ledSuit && h[1] === ledSuit);
              if(!weHaveDouble){
                score += 15; // bonus: partner might have the double and win this
              }
            }

            // Avoid suits where we know opponents are NOT void
            // (they can still play and might win)
            let oppCanPlay = false;
            for(let s = 0; s < gameState.player_count; s++){
              if(isSameTeam(s) || !gameState.active_players.includes(s)) continue;
              if(!voidIn[s].has(ledSuit)){ oppCanPlay = true; break; }
            }
            if(!oppCanPlay) score += 20; // great: opponents can't follow this suit

            // Since we have trump control, opponents can't trump in either
            score += 10; // base bonus for having trump control

            // Signal tracking: prefer suits partner is strong in, avoid opponent strength
            if(partnerSignal[ledSuit] > 0) score += Math.min(partnerSignal[ledSuit], 20);
            if(opponentSignal[ledSuit] > 10) score -= Math.min(opponentSignal[ledSuit], 15);

            // Penalty for leading count
            score -= myCount * 2;

            // Prefer lower tiles (let partner play higher)
            score -= pipSum;
          }

          if(score > bestScore){ bestScore = score; bestIdx = idx; }
        }
        return makeResult(bestIdx, "Lead: partner-in-lead (trump control)");
      }

      // Only trumps left — lead lowest trump
      if(otherTrumps.length > 0){
        let lowIdx = otherTrumps[0], lowVal = Infinity;
        for(const idx of otherTrumps){
          const val = hand[idx][0]+hand[idx][1];
          if(val < lowVal){ lowVal = val; lowIdx = idx; }
        }
        return makeResult(lowIdx, "Lead: low trump (only trumps left)");
      }
      if(trumpDoubles.length > 0) return makeResult(trumpDoubles[0], "Lead: trump double (only option)");
    }

    // ── PHASE C: NO TRUMP CONTROL, no more trump leads — play safe non-trumps ──

    // Lead non-trump doubles
    if(nonTrumpDoubles.length > 0){
      let bestIdx = nonTrumpDoubles[0], bestScore = -Infinity;
      for(const idx of nonTrumpDoubles){
        const pip = hand[idx][0];
        const info = suitInfo[pip];
        if(!info) continue;
        let score = 100 + info.countRemaining + pip;
        if(score > bestScore){ bestScore = score; bestIdx = idx; }
      }
      return makeResult(bestIdx, "Lead: double (controls suit)");
    }

    // ── FORCE BIDDER TRUMP WASTE (Defenders only) ──
    // Lead suits the bidder is void in to force trump expenditure
    if(!isBidderTeam && !bidIsSafe && nonTrumpSingles.length > 0){
      const bidderVoids = voidIn[bidderSeat] || new Set();
      if(bidderVoids.size > 0 && !trumpVoidConfirmed[bidderSeat]){
        // Bidder has voids AND still has trump — force them to use it
        let bestTapIdx = -1, bestTapScore = -Infinity;
        for(const idx of nonTrumpSingles){
          const tile = hand[idx];
          const pip = Math.max(tile[0], tile[1]);
          if(!bidderVoids.has(pip)) continue;
          const pipSum = tile[0] + tile[1];
          const myCount = (pipSum === 5 || pipSum === 10) ? pipSum : 0;
          // Prefer non-count, low-value tiles (minimize what bidder captures)
          let score = 50 - myCount * 3 - pipSum;
          // Doubles in bidder-void suits are guaranteed wins (bidder must trump to beat)
          if(tile[0] === tile[1]) score += 20;
          // Tap play: if we have only 1-2 tiles in this pip, dumping creates a void for us
          const myCount2 = hand.filter(h => h[0] === pip || h[1] === pip).length;
          if(myCount2 <= 2) score += 10;
          if(score > bestTapScore){ bestTapScore = score; bestTapIdx = idx; }
        }
        if(bestTapIdx >= 0){
          return makeResult(bestTapIdx, "Lead: force bidder trump waste (bidder void in suit)");
        }
      }
    }

    // ── ENDGAME COUNT HUNT (Bidder team) ──
    // When bidder needs count, lead count-rich doubles
    if(isBidderTeam && !bidIsSafe && preEndgame && nonTrumpDoubles.length > 0){
      let bestCountDbl = -1, bestCountVal = -Infinity;
      for(const idx of nonTrumpDoubles){
        const pip = hand[idx][0];
        const info = suitInfo[pip];
        if(!info) continue;
        let score = info.countRemaining * 3 + pip; // weight count heavily
        if(score > bestCountVal){ bestCountVal = score; bestCountDbl = idx; }
      }
      if(bestCountDbl >= 0 && bestCountVal > 5){
        return makeResult(bestCountDbl, "Lead: endgame count hunt (double in count-rich suit)");
      }
    }

    // ── COUNT DENIAL (Defender endgame) ──
    // In endgame, lead count-POOR suits to starve bidder
    if(!isBidderTeam && preEndgame && nonTrumpSingles.length > 0){
      let bestDenyIdx = -1, bestDenyScore = -Infinity;
      for(const idx of nonTrumpSingles){
        const tile = hand[idx];
        const pip = Math.max(tile[0], tile[1]);
        const info = suitInfo[pip];
        const pipSum = tile[0] + tile[1];
        const myCount = (pipSum === 5 || pipSum === 10) ? pipSum : 0;
        if(!info) continue;
        // Prefer suits with LOW remaining count (deny bidder points)
        let score = 50 - info.countRemaining * 5 - myCount * 3;
        if(score > bestDenyScore){ bestDenyScore = score; bestDenyIdx = idx; }
      }
      if(bestDenyIdx >= 0){
        return makeResult(bestDenyIdx, "Lead: count denial (lead count-poor suit)");
      }
    }

    // ── BID DOOMED DAMAGE CONTROL ──
    if(bidDoomed && nonTrumpDoubles.length > 0){
      // Just play safe doubles to minimize further losses
      let lowDbl = nonTrumpDoubles[0], lowPip = Infinity;
      for(const idx of nonTrumpDoubles){
        if(hand[idx][0] < lowPip){ lowPip = hand[idx][0]; lowDbl = idx; }
      }
      return makeResult(lowDbl, "Lead: bid doomed, safe double");
    }

    // Lead non-trump singles — DANGER SCORING
    if(nonTrumpSingles.length > 0){
      let bestIdx = nonTrumpSingles[0], bestScore = -Infinity;
      const _leadCandidates = [];

      for(const idx of nonTrumpSingles){
        const tile = hand[idx];
        const pipSum = tile[0] + tile[1];
        const myCount = (pipSum === 5) ? 5 : (pipSum === 10) ? 10 : 0;
        const ledSuit = Math.max(tile[0], tile[1]);
        const info = suitInfo[ledSuit];
        let score = 0;
        const _breakdown = {};

        if(!info){
          score -= 50;
          _breakdown.noInfo = -50;
        } else {
          if(!info.winnerPlayed){
            score -= 30;
            score -= info.winnerCount * 2;
            _breakdown.doubleNotOut = -30;
            _breakdown.doubleCountPenalty = -(info.winnerCount * 2);
          } else {
            score += 10;
            _breakdown.doubleOut = +10;
          }
          score -= myCount * 3;
          _breakdown.myCountPenalty = -(myCount * 3);
          if(!info.winnerPlayed){
            score -= info.countRemaining;
            _breakdown.suitCountRisk = -(info.countRemaining);
          } else {
            score += Math.floor(info.countRemaining * 0.5);
            _breakdown.suitCountBonus = Math.floor(info.countRemaining * 0.5);
          }
          score -= info.tilesLeft * 2;
          _breakdown.tilesLeftPenalty = -(info.tilesLeft * 2);

          // NEW: Check if opponents are void in this suit (they'll have to play off-suit or trump)
          let oppsVoid = 0;
          for(let s = 0; s < gameState.player_count; s++){
            if(isSameTeam(s) || !gameState.active_players.includes(s)) continue;
            if(voidIn[s].has(ledSuit)) oppsVoid++;
          }
          // If some opponents are void and might trump, that's dangerous
          if(oppsVoid > 0 && !opponentsVoidInTrump){ score -= oppsVoid * 10; _breakdown.oppVoidTrumpRisk = -(oppsVoid * 10); }
          // If opponents are void in this suit AND void in trump, they can't threaten
          if(oppsVoid > 0 && opponentsVoidInTrump){ score += 10; _breakdown.oppVoidSafe = +10; }
          _breakdown.oppsVoidInSuit = oppsVoid;
        }

        score -= ledSuit;
        _breakdown.pipPenalty = -ledSuit;
        score -= Math.floor(pipSum * 0.5);
        _breakdown.sumPenalty = -Math.floor(pipSum * 0.5);

        // ── Signal tracking: partner/opponent suit strength ──
        if(partnerSignal[ledSuit] > 0){
          const sigBonus = Math.min(partnerSignal[ledSuit], 20);
          score += sigBonus;
          _breakdown.partnerSignalBonus = sigBonus;
        }
        if(opponentSignal[ledSuit] > 10){
          const sigPenalty = Math.min(opponentSignal[ledSuit], 15);
          score -= sigPenalty;
          _breakdown.oppSignalPenalty = -sigPenalty;
        }

        // ── offTracker: Catcher protection (opponent) / Misdirection (partner) ──
        if (offTracker && offTracker.trumpMode === 'PIP') {
          const isBidderOpponent = isMoon ? (offTracker.bidderTeam !== p) : ((p % 2) !== offTracker.bidderTeam);
          const suspicion = getOffSuspicion();
          if (suspicion && suspicion.length > 0) {
            const topSuspect = suspicion[0];
            if (isBidderOpponent && topSuspect.suspicion >= 40) {
              // OPPONENT: Protect catcher tiles — don't lead tiles in the suspected off suit
              if (ledSuit === topSuspect.pip && tile[0] !== tile[1]) {
                score -= 40; // Heavy penalty: save this catcher tile
                _breakdown.catcherProtect = -40;
              }
              // OPPONENT: Prefer leading the suspected off suit's double to flush it
              if (ledSuit === topSuspect.pip && tile[0] === tile[1]) {
                score += 30; // Bonus: lead the double to flush the off
                _breakdown.flushDouble = 30;
              }
            } else if (!isBidderOpponent && topSuspect.suspicion >= 40) {
              // PARTNER: Misdirection — avoid leading the off suit to protect bidder
              // Lead low tiles in OTHER suits to create false signals
              if (ledSuit === topSuspect.pip) {
                score -= 25; // Penalty: don't expose the off suit
                _breakdown.partnerProtect = -25;
              }
            }
          }
        }

        _leadCandidates.push({
          tile: tile[0]+'-'+tile[1],
          suit: ledSuit,
          count: myCount,
          totalScore: score,
          breakdown: _breakdown
        });
        if(score > bestScore){ bestScore = score; bestIdx = idx; }
      }
      if(_dbg.enabled) _dbg.leadCandidates = _leadCandidates;
      return makeResult(bestIdx, "Lead: safest non-trump");
    }

    // Last resort: lead trump (even without highest)
    if(otherTrumps.length > 0){
      let lowIdx = otherTrumps[0], lowVal = Infinity;
      for(const idx of otherTrumps){
        const val = hand[idx][0]+hand[idx][1];
        if(val < lowVal){ lowVal = val; lowIdx = idx; }
      }
      return makeResult(lowIdx, "Lead: low trump (no safe option)");
    }

    return makeResult(legal[0], "Lead: fallback");
  }

  // ═══════════════════════════════════════════════════════════════════
  //  NORMAL GAME — FOLLOW LOGIC
  // ═══════════════════════════════════════════════════════════════════

  // ── Partner/teammate winning: throw count (but NEVER dump trumps if non-trump options exist) ──
  if(partnerWinning){
    // Separate legal tiles into trump and non-trump
    const pwNonTrumps = [];
    const pwTrumps = [];
    for(const idx of legal){
      if(gameState._is_trump_tile(hand[idx])) pwTrumps.push(idx);
      else pwNonTrumps.push(idx);
    }
    // Use non-trump tiles if available; only fall back to trumps if ALL tiles are trump
    const pwCandidates = pwNonTrumps.length > 0 ? pwNonTrumps : pwTrumps;

    let countIdx = -1, countVal = 0, lowIdx = pwCandidates[0], lowVal = Infinity;
    for(const idx of pwCandidates){
      const tile = hand[idx];
      const pipSum = tile[0] + tile[1];
      if(pipSum === 5 || pipSum === 10){
        if(pipSum > countVal){ countVal = pipSum; countIdx = idx; }
      }
      if(pipSum < lowVal){ lowVal = pipSum; lowIdx = idx; }
    }
    if(countIdx >= 0) return makeResult(countIdx, "Partner winning, throw count (" + countVal + "pts)");
    return makeResult(lowIdx, "Partner winning, play low");
  }

  // ── Follow suit: only play high if we can beat the current winner ──
  if(canFollowSuit){
    const winnerSeat = gameState._determine_trick_winner();
    let winnerRank = -1;
    let winnerIsTrump = false;
    for(const play of trick){
      if(!Array.isArray(play)) continue;
      if(play[0] === winnerSeat && play[1]){
        const wt = play[1];
        if(gameState._is_trump_tile(wt)){
          winnerIsTrump = true;
          winnerRank = getTrumpRankNum(wt);
        } else {
          const wr = gameState._suit_rank(wt, ledPip);
          winnerRank = wr[0] * 100 + wr[1];
        }
      }
    }

    let highIdx = -1, highRank = -1, lowIdx = -1, lowRank = Infinity;
    const _followCandidates = [];
    for(const idx of legal){
      const tile = hand[idx];
      if((tile[0] === ledPip || tile[1] === ledPip) && !gameState._is_trump_tile(tile)){
        const r = gameState._suit_rank(tile, ledPip);
        const rank = r[0] * 100 + r[1];
        _followCandidates.push({ tile: tile[0]+'-'+tile[1], rank: rank, isDouble: tile[0]===tile[1] });
        if(rank > highRank){ highRank = rank; highIdx = idx; }
        if(rank < lowRank){ lowRank = rank; lowIdx = idx; }
      }
    }

    if(_dbg.enabled){
      _dbg.followSuit = {
        ledPip: ledPip,
        currentWinnerSeat: winnerSeat,
        winnerRank: winnerRank,
        winnerIsTrump: winnerIsTrump,
        candidates: _followCandidates,
        highRank: highRank,
        lowRank: lowRank,
        canBeat: highRank > winnerRank
      };
    }

    if(winnerIsTrump){
      // offTracker: When forced to play low, prefer discarding non-catcher tiles
      if(lowIdx >= 0){
        if(offTracker && offTracker.trumpMode === 'PIP' && (p % 2) !== offTracker.bidderTeam){
          const suspicion = getOffSuspicion();
          if(suspicion && suspicion.length > 0 && suspicion[0].suspicion >= 40){
            // Find the lowest non-catcher tile in suit
            let safeLow = lowIdx, safeRank = Infinity;
            for(const idx of legal){
              const t = hand[idx];
              if((t[0] === ledPip || t[1] === ledPip) && !gameState._is_trump_tile(t)){
                const r = gameState._suit_rank(t, ledPip);
                const rank = r[0] * 100 + r[1];
                if(rank < safeRank && !isCatcherTile(t, gameState)){
                  safeRank = rank; safeLow = idx;
                }
              }
            }
            return makeResult(safeLow, "Cannot beat trump, play low (protect catchers)");
          }
        }
        return makeResult(lowIdx, "Cannot beat trump, play low on-suit");
      }
    }
    if(highIdx >= 0 && highRank > winnerRank){
      // Enhanced: 2nd-seat count protection
      // If we're 2nd to play (trick has 1 card), and our high tile is count,
      // and there are players after us who might beat us — duck instead
      const playersAfterUs = gameState.player_count - trick.length - 1;
      const highTile = hand[highIdx];
      const highTileCount = ((highTile[0]+highTile[1]) === 5 || (highTile[0]+highTile[1]) === 10)
        ? (highTile[0]+highTile[1]) : 0;

      if(trick.length === 1 && highTileCount > 0 && playersAfterUs >= 2 && !isBidderTeam){
        // 2nd seat with count tile, opponents still to play — duck to protect count
        // UNLESS we have the double (guaranteed winner) or all opponents are void
        const isDoublePlay = highTile[0] === highTile[1];
        let allOppsVoid = true;
        for(let s = 0; s < gameState.player_count; s++){
          if(isSameTeam(s) || s === p) continue;
          if(!gameState.active_players.includes(s)) continue;
          if(!voidIn[s].has(ledPip)){ allOppsVoid = false; break; }
        }
        if(!isDoublePlay && !allOppsVoid && lowIdx >= 0){
          return makeResult(lowIdx, "Following suit, duck (2nd seat count protection)");
        }
      }

      return makeResult(highIdx, "Following suit, play high to win");
    }
    if(lowIdx >= 0){
      // offTracker: When can't win, protect catchers
      if(offTracker && offTracker.trumpMode === 'PIP' && (p % 2) !== offTracker.bidderTeam){
        const suspicion = getOffSuspicion();
        if(suspicion && suspicion.length > 0 && suspicion[0].suspicion >= 40){
          let safeLow = lowIdx, safeRank = Infinity;
          for(const idx of legal){
            const t = hand[idx];
            if((t[0] === ledPip || t[1] === ledPip) && !gameState._is_trump_tile(t)){
              const r = gameState._suit_rank(t, ledPip);
              const rank = r[0] * 100 + r[1];
              if(rank < safeRank && !isCatcherTile(t, gameState)){
                safeRank = rank; safeLow = idx;
              }
            }
          }
          return makeResult(safeLow, "Cannot win suit, play low (protect catchers)");
        }
      }
      return makeResult(lowIdx, "Cannot win suit, play low");
    }
  }

  // ── Off-suit: trump in ──
  const canTrump = legalTiles.some(t => gameState._is_trump_tile(t));
  if(canTrump){
    let highestTrickTrump = -1;
    let opponentHasTrumpInTrick = false;
    let partnerHasTrumpInTrick = false;
    for(const play of trick){
      if(!Array.isArray(play)) continue;
      const [seat, t] = play;
      if(t && gameState._is_trump_tile(t)){
        const r = getTrumpRankNum(t);
        if(r > highestTrickTrump) highestTrickTrump = r;
        if(!isSameTeam(seat)) opponentHasTrumpInTrick = true;
        else if(seat !== p) partnerHasTrumpInTrick = true;
      }
    }

    // Find lowest winning trump and lowest trump overall
    let winTrumpIdx = -1, winTrumpRank = Infinity;
    let anyTrumpIdx = -1, anyTrumpRank = Infinity;
    const _trumpCandidates = [];
    for(const idx of legal){
      const tile = hand[idx];
      if(gameState._is_trump_tile(tile)){
        const r = getTrumpRankNum(tile);
        _trumpCandidates.push({ tile: tile[0]+'-'+tile[1], rank: r, canWin: r > highestTrickTrump });
        if(r < anyTrumpRank){ anyTrumpRank = r; anyTrumpIdx = idx; }
        if(r > highestTrickTrump && r < winTrumpRank){ winTrumpRank = r; winTrumpIdx = idx; }
      }
    }

    if(_dbg.enabled){
      _dbg.trumpIn = {
        highestTrickTrump: highestTrickTrump,
        oppHasTrump: opponentHasTrumpInTrick,
        partnerHasTrump: partnerHasTrumpInTrick,
        candidates: _trumpCandidates
      };
    }

    // If partner already trumped and is winning, DON'T over-trump — throw count or play low
    if(partnerHasTrumpInTrick && !opponentHasTrumpInTrick){
      // Partner's trump is winning — treat as partner winning
      let countIdx = -1, countVal = 0, lowIdx = legal[0], lowVal = Infinity;
      for(const idx of legal){
        const tile = hand[idx];
        const pipSum = tile[0] + tile[1];
        if(pipSum === 5 || pipSum === 10){
          if(pipSum > countVal){ countVal = pipSum; countIdx = idx; }
        }
        if(pipSum < lowVal){ lowVal = pipSum; lowIdx = idx; }
      }
      if(countIdx >= 0) return makeResult(countIdx, "Partner trumped, throw count (" + countVal + "pts)");
      return makeResult(lowIdx, "Partner trumped, play low");
    }

    if(winTrumpIdx >= 0){
      // Enhanced: over-trump risk — if there are players after us who might have
      // higher trumps, consider whether it's worth the trump expenditure
      const playersAfter = gameState.player_count - trick.length - 1;
      const trickCountValue = trick.reduce((sum, play) => {
        if(!Array.isArray(play)) return sum;
        const t = play[1];
        const ps = t[0] + t[1];
        return sum + ((ps === 5 || ps === 10) ? ps : 0);
      }, 0);

      // If trick has low/no count and there are 2+ opponents after us, conserve trump
      if(trickCountValue === 0 && playersAfter >= 2 && !endgame && !bidIsClose && trumpsInHand.length <= 2){
        // Low-value trick, save our trump for a better opportunity
        // Fall through to dump instead
        if(_dbg.enabled) _dbg.trumpConserve = { reason: 'low-value trick, conserving trump', trickCount: trickCountValue };
      } else {
        return makeResult(winTrumpIdx, "Trump in to win");
      }
    }
    if(anyTrumpIdx >= 0 && highestTrickTrump < 0){
      // No one has trumped yet — we'd win with any trump
      // Use lowest trump to conserve higher ones
      return makeResult(anyTrumpIdx, "Trump in to win (lowest)");
    }
    // Can't beat existing trump — fall through to dump
  }

  // ── Cannot win: enhanced dump (12-factor scoring) ──
  {
    let bestIdx = legal[0], bestScore = -Infinity;
    const _dumpCandidates = [];
    for(const idx of legal){
      const tile = hand[idx];
      const pipSum = tile[0] + tile[1];
      const myCount = (pipSum === 5) ? 5 : (pipSum === 10) ? 10 : 0;
      const tileIsTrump = gameState._is_trump_tile(tile);
      const tileIsDouble = tile[0] === tile[1];
      let score = 0;
      const _bd = {};

      // 1. Suit-voiding: prefer tiles that create a void (enables future trump-ins)
      const pA = tile[0], pB = tile[1];
      let cntA = 0, cntB = 0;
      for(const h of hand){
        if(h[0] === pA || h[1] === pA) cntA++;
        if(h[0] === pB || h[1] === pB) cntB++;
      }
      const minCnt = Math.min(cntA, cntB);
      if(minCnt <= 1){ score += 15; _bd.voidBonus = 15; }
      else if(minCnt <= 2){ score += 8; _bd.voidBonus = 8; }
      _bd.suitCounts = cntA+'|'+cntB;

      // 2. Don't give opponents our count
      score -= myCount * 3;
      _bd.countPenalty = -(myCount * 3);

      // 3. Prefer lower pip sum
      score -= Math.floor(pipSum * 0.5);
      _bd.sumPenalty = -Math.floor(pipSum * 0.5);

      // 4. Save trumps (especially the last one!)
      if(tileIsTrump){
        score -= 20;
        _bd.trumpPenalty = -20;
        if(isLastTrump){ score -= 30; _bd.lastTrumpPenalty = -30; }
      }

      // 5. Walker pair preservation: don't dump a tile whose suit-double we hold
      //    (the pair [double + off] can win 2 tricks later)
      if(!tileIsDouble && !tileIsTrump){
        const highPip = Math.max(pA, pB);
        const weHaveDouble = hand.some(h => h[0] === highPip && h[1] === highPip && !gameState._is_trump_tile(h));
        if(weHaveDouble){
          score -= 12; _bd.walkerPreserve = -12;
        }
      }

      // 6. Dead tile bonus: if all higher tiles in this suit are played, this tile
      //    is now a "walker" (guaranteed winner if led) — DON'T dump it
      if(!tileIsTrump && !tileIsDouble){
        const highPip = Math.max(pA, pB);
        const info = suitInfo[highPip];
        if(info && info.winnerPlayed && info.tilesLeft === 0){
          // This tile would walk if led — very valuable, don't dump
          score -= 15; _bd.walkerProtect = -15;
        }
      }

      // 7. Opponent signal awareness: avoid dumping in suits opponents are strong in
      //    (they might win future tricks in that suit)
      if(!tileIsTrump){
        const dumpPip = Math.max(pA, pB);
        if(opponentSignal[dumpPip] > 15){
          score += 5; _bd.oppStrongDump = 5; // GOOD to dump here (get rid of it)
        }
        if(partnerSignal[dumpPip] > 10){
          score -= 5; _bd.partnerStrongKeep = -5; // keep for partner's suit
        }
      }

      // 8. Endgame count denial: if defender in endgame, dump count-poor tiles
      //    to starve bidder of points
      if(endgame && !isBidderTeam && myCount === 0){
        score += 3; _bd.countDenial = 3;
      }

      // 9. Bidder urgency: if bid is close, defenders should be more aggressive
      //    about dumping non-valuable tiles quickly
      if(!isBidderTeam && setBidUrgency > 50){
        if(myCount === 0) score += 2; _bd.urgencyDump = 2;
      }

      _dumpCandidates.push({
        tile: tile[0]+'-'+tile[1],
        count: myCount,
        totalScore: score,
        breakdown: _bd
      });
      if(score > bestScore){ bestScore = score; bestIdx = idx; }
    }
    if(_dbg.enabled) _dbg.dumpCandidates = _dumpCandidates;
    return makeResult(bestIdx, "Cannot win, play low");
  }
}
