/**
 * bracketEngine.js
 * Algoritma generator bracket turnamen Single Elimination fleksibel (~36 tim)
 * Aturan:
 * - BO1 untuk semua babak penyisihan hingga Semifinal
 * - BO3 khusus Final Juara 1 & 2
 * - Dukungan auto-byes bila jumlah tim bukan perpangkatan 2 (misal 36 tim)
 */

function generateBracket(teams) {
  if (!teams || teams.length === 0) return { rounds: [], totalMatches: 0 };

  // Sort teams by seed ascending
  const sortedTeams = [...teams].sort((a, b) => (a.seed || 999) - (b.seed || 999));
  const numTeams = sortedTeams.length;

  // Ukuran bracket standar terdekat yang merupakan 2^n >= numTeams
  // Untuk 36 tim: bracketSize = 64
  let bracketSize = 2;
  while (bracketSize < numTeams) {
    bracketSize *= 2;
  }

  // Jumlah babak = log2(bracketSize)
  const totalRounds = Math.log2(bracketSize);

  // Byes count = bracketSize - numTeams. Misal untuk 36 tim: 64 - 36 = 28 Byes.
  // Babak 1 (Round of 64) ada (36 - 28) = 8 tim yang bertanding dalam 4 match.
  // 28 tim sisanya langsung bye ke Round of 32.

  const rounds = [];
  let matchCounter = 1;

  // Nama-nama round standar
  function getRoundName(roundIndex, totalRounds) {
    const roundsLeft = totalRounds - roundIndex;
    if (roundsLeft === 1) return 'Grand Final';
    if (roundsLeft === 2) return 'Semifinals';
    if (roundsLeft === 3) return 'Quarterfinals';
    if (roundsLeft === 4) return 'Round of 16';
    if (roundsLeft === 5) return 'Round of 32';
    if (roundsLeft === 6) return 'Round of 64';
    return `Babak ${roundIndex + 1}`;
  }

  // Buat slot tim ber-seed untuk Round 1 (standar tournament seeding distribution)
  function getSeedingSlots(size) {
    let slots = [1, 2];
    while (slots.length < size) {
      const nextSize = slots.length * 2;
      const nextSlots = [];
      for (let i = 0; i < slots.length; i++) {
        nextSlots.push(slots[i]);
        nextSlots.push(nextSize + 1 - slots[i]);
      }
      slots = nextSlots;
    }
    return slots;
  }

  const seedingSlots = getSeedingSlots(bracketSize);
  
  // Mapping slot ke tim atau BYE
  const slotMap = {};
  for (let i = 0; i < bracketSize; i++) {
    const seedNum = seedingSlots[i];
    if (seedNum <= numTeams) {
      slotMap[i] = sortedTeams[seedNum - 1];
    } else {
      slotMap[i] = null; // BYE
    }
  }

  // Generate Match untuk Round 1
  const r1Matches = [];
  const numMatchesR1 = bracketSize / 2;

  for (let i = 0; i < numMatchesR1; i++) {
    const teamA = slotMap[i * 2];
    const teamB = slotMap[i * 2 + 1];

    let winner = null;
    let status = 'SCHEDULED';
    let isByeMatch = false;

    // Handle BYE logic
    if (teamA && !teamB) {
      winner = teamA;
      status = 'COMPLETED';
      isByeMatch = true;
    } else if (!teamA && teamB) {
      winner = teamB;
      status = 'COMPLETED';
      isByeMatch = true;
    } else if (!teamA && !teamB) {
      status = 'COMPLETED';
      isByeMatch = true;
    }

    r1Matches.push({
      id: `R1-M${i + 1}`,
      matchNumber: matchCounter++,
      roundIndex: 0,
      roundName: getRoundName(0, totalRounds),
      format: totalRounds === 1 ? 'BO3' : 'BO1',
      teamLeft: teamA || null,
      teamRight: teamB || null,
      scoreLeft: winner && winner === teamA ? 1 : 0,
      scoreRight: winner && winner === teamB ? 1 : 0,
      winner: winner,
      status: status,
      isBye: isByeMatch
    });
  }

  rounds.push({
    roundIndex: 0,
    roundName: getRoundName(0, totalRounds),
    matches: r1Matches
  });

  // Generate subsequent rounds
  for (let r = 1; r < totalRounds; r++) {
    const prevRoundMatches = rounds[r - 1].matches;
    const currentRoundMatches = [];
    const numMatchesInRound = prevRoundMatches.length / 2;
    const isFinal = r === totalRounds - 1;

    for (let i = 0; i < numMatchesInRound; i++) {
      const parentA = prevRoundMatches[i * 2];
      const parentB = prevRoundMatches[i * 2 + 1];

      const teamA = parentA.winner || null;
      const teamB = parentB.winner || null;

      let winner = null;
      let status = 'PENDING';
      let isByeMatch = false;

      // Check if both parents are bye and resolved
      if (teamA && !teamB && parentB.isBye) {
        // Auto-advance if opponent was never existent
        winner = teamA;
        status = 'COMPLETED';
        isByeMatch = true;
      }

      currentRoundMatches.push({
        id: `R${r + 1}-M${i + 1}`,
        matchNumber: matchCounter++,
        roundIndex: r,
        roundName: getRoundName(r, totalRounds),
        format: isFinal ? 'BO3' : 'BO1', // BO1 penyisihan & Semifinal, BO3 Final
        teamLeft: teamA,
        teamRight: teamB,
        scoreLeft: 0,
        scoreRight: 0,
        winner: winner,
        status: status,
        isBye: isByeMatch,
        parentMatchIds: [parentA.id, parentB.id]
      });
    }

    rounds.push({
      roundIndex: r,
      roundName: getRoundName(r, totalRounds),
      matches: currentRoundMatches
    });
  }

  // Temukan playable matches (bukan BYE murni)
  const playableMatches = [];
  rounds.forEach(round => {
    round.matches.forEach(m => {
      if (!m.isBye) {
        playableMatches.push(m);
      }
    });
  });

  return {
    rounds,
    totalRounds,
    playableMatches,
    totalPlayableMatches: playableMatches.length
  };
}

/**
 * Propagate Winner saat hasil pertandingan dimasukkan / diupdate
 */
function updateMatchResult(rounds, matchId, winnerSide) {
  // Find match
  let targetMatch = null;
  let targetRoundIdx = -1;
  let targetMatchIdx = -1;

  for (let r = 0; r < rounds.length; r++) {
    for (let m = 0; m < rounds[r].matches.length; m++) {
      if (rounds[r].matches[m].id === matchId) {
        targetMatch = rounds[r].matches[m];
        targetRoundIdx = r;
        targetMatchIdx = m;
        break;
      }
    }
    if (targetMatch) break;
  }

  if (!targetMatch) return null;

  // Set scores & winner
  const isFinal = targetMatch.format === 'BO3';
  const winScore = isFinal ? 2 : 1;

  if (winnerSide === 'left') {
    targetMatch.scoreLeft = winScore;
    targetMatch.scoreRight = 0;
    targetMatch.winner = targetMatch.teamLeft;
    targetMatch.status = 'COMPLETED';
  } else if (winnerSide === 'right') {
    targetMatch.scoreLeft = 0;
    targetMatch.scoreRight = winScore;
    targetMatch.winner = targetMatch.teamRight;
    targetMatch.status = 'COMPLETED';
  } else if (winnerSide === 'reset') {
    targetMatch.scoreLeft = 0;
    targetMatch.scoreRight = 0;
    targetMatch.winner = null;
    targetMatch.status = 'SCHEDULED';
  }

  // Advance winner to next round
  if (targetRoundIdx + 1 < rounds.length) {
    const nextRound = rounds[targetRoundIdx + 1];
    const nextMatchIdx = Math.floor(targetMatchIdx / 2);
    const isLeftSideInNext = targetMatchIdx % 2 === 0;

    if (nextRound && nextRound.matches[nextMatchIdx]) {
      const nextMatch = nextRound.matches[nextMatchIdx];
      if (isLeftSideInNext) {
        nextMatch.teamLeft = targetMatch.winner;
      } else {
        nextMatch.teamRight = targetMatch.winner;
      }
      
      // Update status jika kedua tim sudah siap
      if (nextMatch.teamLeft && nextMatch.teamRight && nextMatch.status === 'PENDING') {
        nextMatch.status = 'SCHEDULED';
      }
    }
  }

  return targetMatch;
}

module.exports = {
  generateBracket,
  updateMatchResult
};
