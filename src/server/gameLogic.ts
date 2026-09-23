import { db } from '../lib/firebase.js';
import {
  doc,
  getDoc,
  setDoc as firestoreSetDoc,
  updateDoc as firestoreUpdateDoc,
  collection,
  getDocs,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';

/**
 * Strips all `undefined` values from an object or array recursively so that Firestore
 * will never throw `Unsupported field value: undefined`.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as any;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (
    typeof (data as any).toMillis === 'function' ||
    (data as any)._methodName ||
    data.constructor?.name === 'Timestamp' ||
    data.constructor?.name?.includes('FieldValue')
  ) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as any;
  }
  const cleaned: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleaned[key] = sanitizeForFirestore(value);
    }
  }
  return cleaned;
}

const setDoc: typeof firestoreSetDoc = ((ref: any, data: any, options?: any) => {
  const sanitized = sanitizeForFirestore(data);
  return options !== undefined ? firestoreSetDoc(ref, sanitized, options) : firestoreSetDoc(ref, sanitized);
}) as any;

const updateDoc: typeof firestoreUpdateDoc = ((ref: any, ...args: any[]) => {
  if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
    return firestoreUpdateDoc(ref, sanitizeForFirestore(args[0]));
  }
  return (firestoreUpdateDoc as any)(ref, ...args);
}) as any;
import {
  generateGMNarration,
  generateLaunchNarration,
  generateLaunchScene,
  parseCampaignPromise,
  generateElectionNarration,
  generateImpeachmentNarration,
  generatePromiseEvaluationNarration,
  generateEndgameAccountingNarration,
  generateEndgameVerdict,
  generateEndgameEpitaph,
  generateIslandGuiltySentence,
} from './gemini.js';
import { ARCHETYPES, getRosterForPlayerCount } from '../lib/archetypes.js';
import { SCHEME_CARDS, createShuffledDeck } from '../lib/cards.js';
import { CONSTITUTION_CLAUSES } from '../lib/constitution.js';
import type {
  RaftStage,
  RaftProgress,
  Archetype,
  SchemeCardId,
  CardPlayRecord,
  AuditRecord,
  RoleActionRecord,
  PrivatePlayerProfile,
  LaunchData,
  RaftSeat,
  LaunchVoteRecord,
  LaunchBuyoutRecord,
  LaunchSwimRecord,
  LaunchMutinyRecord,
  Constitution,
  ConstitutionClauseId,
  FoundingData,
  GovernorData,
  ElectionData,
  ElectionNominee,
  ImpeachmentData,
  EmbezzlementRecord,
  GameMode,
  EndgameData,
  EndgameStep,
  EndgameTriggerReason,
  EndgameAccounting,
  EndgameRevealItem,
  BlameVote,
  PlayerScorecard,
} from '../types.js';

export const STAGE_REQUIREMENTS: Record<RaftStage, number> = {
  frame: 12,
  deck: 18,
  sail: 14,
  provisions: 10,
};

export const STAGE_ORDER: RaftStage[] = ['frame', 'deck', 'sail', 'provisions'];

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function getVagueProgressDescription(actualLabor: number): string {
  if (actualLabor === 0) {
    return 'The wood rests motionless in the surf; no progress was discernible.';
  } else if (actualLabor <= 3) {
    return 'A faint shudder in the timber; minimal headway was noted upon the shoreline.';
  } else if (actualLabor <= 7) {
    return 'The raft creaks forward, lashing taut beneath quiet collective strain.';
  } else if (actualLabor <= 12) {
    return 'Substantial logs were bound into the frame against the darkening swells.';
  } else {
    return 'An uncharacteristic wave of industry advanced the vessel appreciably.';
  }
}

// Helper: draw cards from game deck with automatic reshuffle
async function drawCardsFromDeck(
  gameId: string,
  count: number
): Promise<{ drawn: SchemeCardId[]; reshuffled: boolean }> {
  const deckRef = doc(db, `games/${gameId}/deck`, 'state');
  const deckSnap = await getDoc(deckRef);

  let remaining: SchemeCardId[] = [];
  let discarded: SchemeCardId[] = [];

  if (deckSnap.exists()) {
    const data = deckSnap.data();
    remaining = [...(data.remaining || [])];
    discarded = [...(data.discarded || [])];
  } else {
    remaining = createShuffledDeck(3);
    discarded = [];
  }

  const drawn: SchemeCardId[] = [];
  let reshuffled = false;

  for (let i = 0; i < count; i++) {
    if (remaining.length === 0) {
      if (discarded.length > 0) {
        // Reshuffle discard pile
        remaining = [...discarded].sort(() => Math.random() - 0.5);
        discarded = [];
        reshuffled = true;
      } else {
        // Generate new deck if all depleted
        remaining = createShuffledDeck(2);
        reshuffled = true;
      }
    }
    if (remaining.length > 0) {
      const card = remaining.pop()!;
      drawn.push(card);
    }
  }

  await setDoc(deckRef, { remaining, discarded });
  return { drawn, reshuffled };
}

// Helper: add cards to discard pile
async function addCardsToDiscard(gameId: string, cardIds: SchemeCardId[]) {
  if (!cardIds.length) return;
  const deckRef = doc(db, `games/${gameId}/deck`, 'state');
  const deckSnap = await getDoc(deckRef);
  let discarded: SchemeCardId[] = [];
  let remaining: SchemeCardId[] = [];
  if (deckSnap.exists()) {
    const data = deckSnap.data();
    remaining = data.remaining || [];
    discarded = [...(data.discarded || []), ...cardIds];
  } else {
    discarded = [...cardIds];
  }
  await setDoc(deckRef, { remaining, discarded });
}

// Helper: add private log entry
async function addPrivateLog(gameId: string, playerId: string, text: string, round: number) {
  try {
    const logCol = collection(db, `games/${gameId}/privateLog/${playerId}/entries`);
    await addDoc(logCol, {
      text,
      round,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('Failed to add private log:', err);
  }
}

export async function createGameRoom(hostId: string, hostName: string, mode: GameMode = 'satire') {
  const roomCode = generateRoomCode();
  const gameId = roomCode;

  const initialProgress: RaftProgress = {
    frame: 0,
    deck: 0,
    sail: 0,
    provisions: 0,
  };

  const gameRef = doc(db, 'games', gameId);
  await setDoc(gameRef, {
    id: gameId,
    roomCode,
    status: 'lobby',
    mode,
    round: 1,
    raftStage: 'frame',
    raftProgress: initialProgress,
    hostId,
    roundPhase: 'scavenge',
    gmNarration: 'Castaways wash ashore, calculating how little they might contribute without notice.',
    createdAt: serverTimestamp(),
  });

  // Public player document
  const playerRef = doc(db, `games/${gameId}/players`, hostId);
  await setDoc(playerRef, {
    id: hostId,
    displayName: hostName || 'Castaway #1',
    energy: 5,
    reputation: 0,
    connected: true,
    isHost: true,
    isBot: false,
    handCount: 0,
  });

  // Private player profile
  const privateRef = doc(db, `games/${gameId}/players/${hostId}/private`, 'profile');
  await setDoc(privateRef, {
    role: 'ORDINARY',
    stash: 0,
    activeCooldown: 0,
    activeUses: 0,
    roleRevealed: false,
    hand: [],
    cardsPlayed: 0,
    smokescreenActive: false,
  });

  return { gameId, roomCode };
}

export async function toggleGameMode(gameId: string, hostId: string, mode: GameMode) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();
  if (gameData.hostId !== hostId) throw new Error('Only the host can toggle game mode.');
  await updateDoc(gameRef, { mode });
  return { success: true, mode };
}

export async function joinGameRoom(roomCode: string, playerId: string, playerName: string) {
  const normalizedCode = roomCode.trim().toUpperCase();
  const gameRef = doc(db, 'games', normalizedCode);
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) {
    throw new Error(`Game with code "${normalizedCode}" was not found.`);
  }

  const gameData = gameSnap.data();
  if (gameData.status !== 'lobby') {
    throw new Error('This game is already underway or concluded.');
  }

  const playersRef = collection(db, `games/${normalizedCode}/players`);
  const playersSnap = await getDocs(playersRef);
  if (playersSnap.size >= 8) {
    throw new Error('This raft can support a maximum of 8 castaways.');
  }

  // Public player profile
  const playerRef = doc(db, `games/${normalizedCode}/players`, playerId);
  await setDoc(playerRef, {
    id: playerId,
    displayName: playerName || `Castaway #${playersSnap.size + 1}`,
    energy: 5,
    reputation: 0,
    connected: true,
    isHost: false,
    isBot: false,
    handCount: 0,
  });

  // Private player profile
  const privateRef = doc(db, `games/${normalizedCode}/players/${playerId}/private`, 'profile');
  await setDoc(privateRef, {
    role: 'ORDINARY',
    stash: 0,
    activeCooldown: 0,
    activeUses: 0,
    roleRevealed: false,
    hand: [],
    cardsPlayed: 0,
    smokescreenActive: false,
  });

  return { gameId: normalizedCode, roomCode: normalizedCode };
}

export async function addDemoCastaway(gameId: string, botName?: string) {
  const botNames = ['Ezekiel', 'Barnaby', 'Silas', 'Cordelia', 'Thaddeus', 'Miriam', 'Orville', 'Agnes'];
  const playersRef = collection(db, `games/${gameId}/players`);
  const playersSnap = await getDocs(playersRef);
  const existingNames = new Set(playersSnap.docs.map((d) => d.data().displayName));

  const chosenName = botName || botNames.find((n) => !existingNames.has(n)) || `Drifter ${playersSnap.size + 1}`;
  const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const playerRef = doc(db, `games/${gameId}/players`, botId);
  await setDoc(playerRef, {
    id: botId,
    displayName: chosenName,
    energy: 5,
    reputation: 0,
    connected: true,
    isHost: false,
    isBot: true,
    handCount: 0,
  });

  const privateRef = doc(db, `games/${gameId}/players/${botId}/private`, 'profile');
  await setDoc(privateRef, {
    role: 'ORDINARY',
    stash: 0,
    activeCooldown: 0,
    activeUses: 0,
    roleRevealed: true,
    hand: [],
    cardsPlayed: 0,
    smokescreenActive: false,
  });

  return { botId, displayName: chosenName };
}

export async function startGame(gameId: string, hostId: string) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) {
    throw new Error('Game not found.');
  }
  const gameData = gameSnap.data();
  if (gameData.hostId !== hostId) {
    throw new Error('Only the expedition leader may signal the start.');
  }

  const playersRef = collection(db, `games/${gameId}/players`);
  const playersSnap = await getDocs(playersRef);
  const playerCount = playersSnap.size;
  if (playerCount < 3) {
    throw new Error('At least 3 castaways are required to commence construction.');
  }

  // 1. Archetype Assignment based on player count
  const availableRoster = getRosterForPlayerCount(playerCount);
  const shuffledRoster = [...availableRoster].sort(() => Math.random() - 0.5);

  const playersList = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Initialize shared deck of Scheme cards (3 copies of all 8 cards)
  const initialDeck = createShuffledDeck(3);
  const deckRef = doc(db, `games/${gameId}/deck`, 'state');
  await setDoc(deckRef, {
    remaining: initialDeck,
    discarded: [],
  });

  // Assign roles and initial 2 Scheme cards for each player
  const assignedRoles: Record<string, { role: Archetype; stash: number; activeUses: number }> = {};
  for (let i = 0; i < playersList.length; i++) {
    const p = playersList[i];
    const role = shuffledRoster[i % shuffledRoster.length];
    const initialStash = role === 'PREPPER' ? 4 : 0;
    const activeUses = ARCHETYPES[role]?.defaultUses ?? 0;
    assignedRoles[p.id] = { role, stash: initialStash, activeUses };
  }

  for (const p of playersList) {
    const roleInfo = assignedRoles[p.id];
    let brokerInfo: { targetName: string; targetStash: number } | undefined = undefined;

    if (roleInfo.role === 'BROKER') {
      const otherPlayers = playersList.filter((o) => o.id !== p.id);
      if (otherPlayers.length > 0) {
        const randomOpponent = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
        const opponentData = assignedRoles[randomOpponent.id];
        brokerInfo = {
          targetName: (randomOpponent as any).displayName || 'A Castaway',
          targetStash: opponentData.stash,
        };
      }
    }

    // Draw 2 initial cards from deck
    const { drawn } = await drawCardsFromDeck(gameId, 2);

    const privateRef = doc(db, `games/${gameId}/players/${p.id}/private`, 'profile');
    await setDoc(privateRef, {
      role: roleInfo.role,
      stash: roleInfo.stash,
      activeCooldown: 0,
      activeUses: roleInfo.activeUses,
      roleRevealed: false,
      hand: drawn,
      cardsPlayed: 0,
      smokescreenActive: false,
      ...(brokerInfo ? { brokerInfo } : {}),
    });

    // Update public player doc
    const publicPlayerRef = doc(db, `games/${gameId}/players`, p.id);
    await updateDoc(publicPlayerRef, {
      energy: 5,
      reputation: 0,
      handCount: drawn.length,
    });

    await addPrivateLog(
      gameId,
      p.id,
      `Expedition commenced. You drew 2 secret Scheme cards: ${drawn.map((c) => SCHEME_CARDS[c]?.name || c).join(', ')}.`,
      1
    );
  }

  // Update game state
  const isSatire = (gameData.mode !== 'classic');
  if (isSatire) {
    const ALL_CLAUSES: ConstitutionClauseId[] = [
      'ledgerClause',
      'captainClause',
      'voteClause',
      'propertyClause',
      'laborClause',
      'blameClause',
    ];
    const drawnClauses = [...ALL_CLAUSES].sort(() => Math.random() - 0.5).slice(0, 3);
    const foundingData: FoundingData = {
      drawnClauses,
      votes: {},
      resolved: false,
    };

    // Pre-populate bot votes
    for (const p of playersList) {
      if ((p as any).isBot) {
        foundingData.votes[p.id] = {
          [drawnClauses[0]]: Math.random() > 0.5 ? 'A' : 'B',
          [drawnClauses[1]]: Math.random() > 0.5 ? 'A' : 'B',
          [drawnClauses[2]]: Math.random() > 0.5 ? 'A' : 'B',
        };
      }
    }

    await updateDoc(gameRef, {
      status: 'active',
      round: 1,
      roundPhase: 'founding',
      foundingData,
      gmNarration: 'The Founding Convention convenes. Castaways assemble to ratify the Constitution of the Isle.',
    });
  } else {
    await updateDoc(gameRef, {
      status: 'active',
      round: 1,
      roundPhase: 'scavenge',
      gmNarration: 'Round 1 begins. Identities are sealed in salt and secrecy; suspicion is free.',
    });
  }

  // Init Round 1 doc
  const roundRef = doc(db, `games/${gameId}/rounds`, '1');
  await setDoc(roundRef, {
    submissions: {},
    stage: 'scavenge',
    resolved: false,
    submittedPlayerIds: [],
    cardsPlayed: [],
    resolutionWindowOpen: false,
    audits: [],
    roleActions: [],
  });

  // Log game start
  const logRef = collection(db, `games/${gameId}/publicLog`);
  await addDoc(logRef, {
    type: 'narration',
    text: 'Expedition commenced. Secret roles and initial Scheme cards dealt.',
    round: 1,
    timestamp: serverTimestamp(),
  });

  return { success: true };
}

export async function submitAllocation(
  gameId: string,
  playerId: string,
  allocation: {
    labor: number;
    stash: number;
    scheme: number;
    rest: number;
    auditTargetId?: string | null;
    roleAction?: string | null;
    rolePayload?: any;
    playedCardId?: SchemeCardId | null;
    cardTargetId?: string | null;
  },
  claimedLabor: number
) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();

  if (gameData.status !== 'active') throw new Error('Game is not currently active.');
  if (gameData.roundPhase !== 'scavenge') throw new Error('Not currently in Scavenge phase.');

  const currentRound = gameData.round || 1;
  const playerRef = doc(db, `games/${gameId}/players`, playerId);
  const playerSnap = await getDoc(playerRef);
  if (!playerSnap.exists()) throw new Error('Player not found.');
  const playerData = playerSnap.data();

  const totalSpent =
    (allocation.labor || 0) + (allocation.stash || 0) + (allocation.scheme || 0) + (allocation.rest || 0);
  if (totalSpent !== playerData.energy) {
    throw new Error(`Total energy allocated (${totalSpent}) must equal current energy (${playerData.energy}).`);
  }

  let actualLabor = Math.max(0, allocation.labor || 0);
  if (allocation.auditTargetId) {
    if ((allocation.scheme || 0) < 1) {
      throw new Error('An audit inquiry requires allocating at least 1 energy point to Scheme.');
    }
    actualLabor = 0;
  }

  // Validate and handle Scavenge Card Play (if any)
  const privRef = doc(db, `games/${gameId}/players/${playerId}/private`, 'profile');
  const privSnap = await getDoc(privRef);
  const profile = privSnap.exists()
    ? (privSnap.data() as PrivatePlayerProfile)
    : { hand: [], stash: 0, cardsPlayed: 0, role: 'ORDINARY' as Archetype, activeCooldown: 0, activeUses: 0, roleRevealed: false, smokescreenActive: false };

  let playedCardId: SchemeCardId | null = allocation.playedCardId || null;
  let cardTargetId: string | null = allocation.cardTargetId || null;

  if (playedCardId) {
    const cardDef = SCHEME_CARDS[playedCardId];
    if (!cardDef) throw new Error(`Unknown Scheme card: ${playedCardId}`);
    if (cardDef.timing !== 'scavenge') {
      throw new Error(`${cardDef.name} can only be played during the Resolution window.`);
    }
    if (!profile.hand.includes(playedCardId)) {
      throw new Error(`You do not hold ${cardDef.name} in your hand.`);
    }

    // Balance rule for Saint: True labor >= Claimed labor
    if (playedCardId === 'saint' && actualLabor < claimedLabor) {
      throw new Error('Saint card may only be played if your true Labor is greater than or equal to your claimed Labor.');
    }

    // Remove card from player hand and add to discard
    const newHand = [...profile.hand];
    const cardIndex = newHand.indexOf(playedCardId);
    if (cardIndex >= 0) newHand.splice(cardIndex, 1);

    await updateDoc(privRef, {
      hand: newHand,
      cardsPlayed: (profile.cardsPlayed || 0) + 1,
    });
    await updateDoc(playerRef, {
      handCount: newHand.length,
    });
    await addCardsToDiscard(gameId, [playedCardId]);

    await addPrivateLog(gameId, playerId, `You played ${cardDef.name} during Scavenge.`, currentRound);
  }

  const roundRef = doc(db, `games/${gameId}/rounds`, currentRound.toString());
  const roundSnap = await getDoc(roundRef);
  const roundData = roundSnap.exists()
    ? roundSnap.data()
    : { submissions: {}, submittedPlayerIds: [], cardsPlayed: [] };

  const submissions = roundData.submissions || {};
  const submittedPlayerIds: string[] = Array.from(
    new Set([...(roundData.submittedPlayerIds || []), playerId])
  );

  const cardsPlayed: CardPlayRecord[] = roundData.cardsPlayed ? [...roundData.cardsPlayed] : [];
  if (playedCardId) {
    const playRecord: CardPlayRecord = {
      playerId,
      playerName: playerData.displayName,
      cardId: playedCardId,
      timing: 'scavenge',
      resolved: false,
      timestamp: Date.now(),
    };
    if (cardTargetId) {
      playRecord.targetId = cardTargetId;
    }
    if (!cardsPlayed.some((c) => c.playerId === playerId && c.cardId === playedCardId)) {
      cardsPlayed.push(playRecord);
    }
  }

  // Fetch all players for game context and bot checks
  const playersRef = collection(db, `games/${gameId}/players`);
  const allPlayersSnap = await getDocs(playersRef);
  const allPlayers: any[] = allPlayersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Preserve any scavenge cards played across all submissions in this round
  for (const [subPlayerId, subRaw] of Object.entries(submissions)) {
    const sub = subRaw as any;
    if (
      sub &&
      sub.playedCardId &&
      !cardsPlayed.some((c) => c.playerId === subPlayerId && c.cardId === sub.playedCardId)
    ) {
      cardsPlayed.push({
        playerId: subPlayerId,
        playerName: (allPlayers.find((p) => p.id === subPlayerId)?.displayName) || 'Castaway',
        cardId: sub.playedCardId,
        targetId: sub.cardTargetId || undefined,
        timing: 'scavenge',
        resolved: false,
        timestamp: sub.timestamp || Date.now(),
      });
    }
  }

  submissions[playerId] = {
    claimed: Math.max(0, claimedLabor),
    actual: actualLabor,
    action: allocation.auditTargetId ? 'audit' : 'labor',
    stash: Math.max(0, allocation.stash || 0),
    scheme: Math.max(0, allocation.scheme || 0),
    rest: Math.max(0, allocation.rest || 0),
    auditTargetId: allocation.auditTargetId || null,
    roleAction: allocation.roleAction || null,
    rolePayload: allocation.rolePayload || null,
    playedCardId: playedCardId || null,
    cardTargetId: cardTargetId || null,
    timestamp: Date.now(),
  };

  await setDoc(
    roundRef,
    {
      submissions,
      resolved: false,
      submittedPlayerIds,
      cardsPlayed,
    },
    { merge: true }
  );

  // Auto-submit for bots if any
  for (const p of allPlayers) {
    if (p.isBot && !submittedPlayerIds.includes(p.id)) {
      const botEnergy = p.energy || 5;
      const botActualLabor = Math.floor(Math.random() * (botEnergy + 1));
      const remaining = botEnergy - botActualLabor;
      const botStash = Math.floor(Math.random() * (remaining + 1));
      const botRest = remaining - botStash;
      const botClaimed = Math.min(5, Math.max(botActualLabor, botActualLabor + Math.floor(Math.random() * 3)));

      submissions[p.id] = {
        claimed: botClaimed,
        actual: botActualLabor,
        action: 'labor',
        stash: botStash,
        scheme: 0,
        rest: botRest,
        auditTargetId: null,
        timestamp: Date.now(),
      };
      if (!submittedPlayerIds.includes(p.id)) {
        submittedPlayerIds.push(p.id);
      }
    }
  }

  await setDoc(
    roundRef,
    {
      submissions,
      resolved: false,
      submittedPlayerIds,
      cardsPlayed,
    },
    { merge: true }
  );

  // If everyone has submitted their Scavenge allocation:
  // Transition into the 75-second Resolution Window (3x standing timer for multi-device testing)!
  if (submittedPlayerIds.length >= allPlayers.length) {
    const RESOLUTION_WINDOW_MS = 75000; // 75 seconds (3x standing timer) for castaways to review schemes & targets
    const resolutionClosesAt = Date.now() + RESOLUTION_WINDOW_MS;

    await updateDoc(roundRef, {
      resolutionWindowOpen: true,
      resolutionWindowClosesAt: resolutionClosesAt,
    });

    await updateDoc(gameRef, {
      roundPhase: 'resolution',
      gmNarration: 'The scavenge closes; a tense silence falls over the shore as clandestine bargains stir in the dusk...',
    });

    // Schedule automatic resolution after 77 seconds
    setTimeout(async () => {
      try {
        await finalizeResolution(gameId, currentRound);
      } catch (err) {
        console.error('Auto resolution error:', err);
      }
    }, RESOLUTION_WINDOW_MS + 2000);
  }

  return {
    success: true,
    submittedCount: submittedPlayerIds.length,
    totalPlayers: allPlayers.length,
    roundPhase: submittedPlayerIds.length >= allPlayers.length ? 'resolution' : 'scavenge',
  };
}

// Play Resolution Card during 10-second Resolution Window
export async function playResolutionCard(
  gameId: string,
  playerId: string,
  cardId: SchemeCardId,
  targetId?: string
) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();

  if (gameData.status !== 'active') throw new Error('Game is not currently active.');
  if (gameData.roundPhase !== 'resolution') {
    throw new Error('The resolution window has closed and the round has transitioned.');
  }

  const currentRound = gameData.round || 1;
  const roundRef = doc(db, `games/${gameId}/rounds`, currentRound.toString());
  const roundSnap = await getDoc(roundRef);
  if (!roundSnap.exists()) throw new Error('Round data not found.');
  const roundData = roundSnap.data();

  // If the round has already finished resolving or is in active certification
  if (roundData.resolved || roundData.resolving) {
    throw new Error('The resolution window has closed and the overnight tally is underway.');
  }

  // Enforce server-side timer with generous 8-second grace period for network latency and multi-device testing
  if (roundData.resolutionWindowClosesAt && Date.now() > roundData.resolutionWindowClosesAt + 8000) {
    throw new Error('The resolution window has closed.');
  }

  // Enforce 1 card per round rule
  const existingPlays: CardPlayRecord[] = roundData.cardsPlayed || [];
  const playerPlayedThisRound =
    existingPlays.some((c) => c.playerId === playerId) ||
    Boolean(roundData.submissions?.[playerId]?.playedCardId);
  if (playerPlayedThisRound) {
    throw new Error('A player may play at most 1 Scheme card per round.');
  }

  const cardDef = SCHEME_CARDS[cardId];
  if (!cardDef) throw new Error(`Unknown Scheme card: ${cardId}`);
  if (cardDef.timing !== 'resolution') {
    throw new Error(`${cardDef.name} can only be played during Scavenge.`);
  }

  const privRef = doc(db, `games/${gameId}/players/${playerId}/private`, 'profile');
  const privSnap = await getDoc(privRef);
  if (!privSnap.exists()) throw new Error('Private profile not found.');
  const profile = privSnap.data() as PrivatePlayerProfile;

  if (!profile.hand.includes(cardId)) {
    throw new Error(`You do not hold ${cardDef.name} in your hand.`);
  }

  // Check specific card costs & conditions
  if (cardId === 'bribe') {
    if (profile.stash < 3) {
      throw new Error('Bribe requires at least 3 hoarded Stash to play.');
    }
    if (!targetId) {
      throw new Error('Bribe requires selecting a target castaway.');
    }
    await updateDoc(privRef, { stash: profile.stash - 3 });
  } else if (cardId === 'mutiny') {
    if (gameData.round < 4) {
      throw new Error('Mutiny cannot be played until raft seat assignments begin in Round 4.');
    }
    if (profile.stash < 2) {
      throw new Error('Mutiny requires at least 2 hoarded Stash to play.');
    }
    await updateDoc(privRef, { stash: profile.stash - 2 });
  }

  // Remove card from hand and discard
  const newHand = [...profile.hand];
  const cardIndex = newHand.indexOf(cardId);
  if (cardIndex >= 0) newHand.splice(cardIndex, 1);

  await updateDoc(privRef, {
    hand: newHand,
    cardsPlayed: (profile.cardsPlayed || 0) + 1,
  });

  const playerRef = doc(db, `games/${gameId}/players`, playerId);
  const playerSnap = await getDoc(playerRef);
  const playerName = playerSnap.data()?.displayName || 'Castaway';

  await updateDoc(playerRef, { handCount: newHand.length });
  await addCardsToDiscard(gameId, [cardId]);

  const resPlayRecord: CardPlayRecord = {
    playerId,
    playerName,
    cardId,
    timing: 'resolution',
    resolved: false,
    timestamp: Date.now(),
  };
  if (targetId) {
    resPlayRecord.targetId = targetId;
  }
  existingPlays.push(resPlayRecord);

  await updateDoc(roundRef, { cardsPlayed: existingPlays });
  await addPrivateLog(gameId, playerId, `You played ${cardDef.name} during the Resolution window.`, currentRound);

  return { success: true, cardName: cardDef.name };
}

// Discard card from hand (e.g. hand limit management)
export async function discardCard(gameId: string, playerId: string, cardId: SchemeCardId) {
  const privRef = doc(db, `games/${gameId}/players/${playerId}/private`, 'profile');
  const privSnap = await getDoc(privRef);
  if (!privSnap.exists()) throw new Error('Player profile not found.');
  const profile = privSnap.data() as PrivatePlayerProfile;

  if (!profile.hand.includes(cardId)) {
    throw new Error('Card not found in hand.');
  }

  const newHand = [...profile.hand];
  const idx = newHand.indexOf(cardId);
  if (idx >= 0) newHand.splice(idx, 1);

  await updateDoc(privRef, { hand: newHand });

  const playerRef = doc(db, `games/${gameId}/players`, playerId);
  await updateDoc(playerRef, { handCount: newHand.length });

  await addCardsToDiscard(gameId, [cardId]);
  await addPrivateLog(gameId, playerId, `You discarded ${SCHEME_CARDS[cardId]?.name || cardId}.`, 0);

  return { success: true, hand: newHand };
}

// Finalize Resolution after the resolution timer closes
export async function finalizeResolution(gameId: string, roundNumber: number) {
  const roundRef = doc(db, `games/${gameId}/rounds`, roundNumber.toString());
  const roundSnap = await getDoc(roundRef);
  if (!roundSnap.exists()) return;
  const roundData = roundSnap.data();

  if (roundData.resolved || roundData.resolving) return; // Already resolved or currently resolving

  // Mark as resolving and close window immediately to block race condition
  await updateDoc(roundRef, { resolutionWindowOpen: false, resolving: true });

  try {
    const gameRef = doc(db, 'games', gameId);
    const gameSnap = await getDoc(gameRef);
    if (!gameSnap.exists()) return;
    const gameData = gameSnap.data();

    const playersRef = collection(db, `games/${gameId}/players`);
    const allPlayersSnap = await getDocs(playersRef);
    const allPlayers: any[] = allPlayersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Re-read latest cardsPlayed in case a card was committed right before locking
    const latestRoundSnap = await getDoc(roundRef);
    const latestCardsPlayed: CardPlayRecord[] = latestRoundSnap.exists()
      ? (latestRoundSnap.data().cardsPlayed || [])
      : (roundData.cardsPlayed || []);

    await resolveRound(gameId, roundNumber, roundData.submissions || {}, allPlayers, gameData, latestCardsPlayed);
  } catch (error: any) {
    // FIX-04: Wrap resolveRound() in try/catch. On any error, reset roundData.resolving = false and resolutionWindowOpen = true with a 15s extension
    console.error(`FIX-04: Error resolving round ${roundNumber} in game ${gameId}:`, error);
    await updateDoc(roundRef, {
      resolving: false,
      resolutionWindowOpen: true,
      closesAt: Date.now() + 15000,
    }).catch((dbErr) => console.error('Failed to reset resolving status on round database entry:', dbErr));
    throw error;
  }
}

export async function resolveRound(
  gameId: string,
  roundNumber: number,
  submissions: Record<string, any>,
  allPlayers: any[],
  gameData: any,
  cardsPlayed: CardPlayRecord[] = []
) {
  // Load private profiles for all players
  const privateProfiles: Record<string, PrivatePlayerProfile> = {};
  for (const player of allPlayers) {
    const privRef = doc(db, `games/${gameId}/players/${player.id}/private`, 'profile');
    const privSnap = await getDoc(privRef);
    if (privSnap.exists()) {
      privateProfiles[player.id] = privSnap.data() as PrivatePlayerProfile;
    } else {
      privateProfiles[player.id] = {
        role: 'ORDINARY',
        stash: 0,
        activeCooldown: 0,
        activeUses: 0,
        roleRevealed: false,
        hand: [],
        cardsPlayed: 0,
        smokescreenActive: false,
      };
    }
  }

  const verifiedEntries: Record<string, boolean> = {};
  const repChanges: Record<string, number> = {};
  const publicCardsPlayed: { playerName: string; cardName: string; effect: string }[] = [];
  const audits: AuditRecord[] = [];
  const roleActions: RoleActionRecord[] = [];
  const publicLogCol = collection(db, `games/${gameId}/publicLog`);

  // ==========================================
  // RESOLUTION ORDER (SERVER-SIDE MANDATE)
  // ==========================================

  // Step 1: Ghost Write — overwrite claimed number for this round
  for (const play of cardsPlayed) {
    if (play.cardId === 'ghost_write' && play.targetId) {
      const targetSub = submissions[play.targetId];
      if (targetSub && submissions[play.playerId]) {
        submissions[play.playerId].claimed = targetSub.claimed || 0;
        play.resolved = true;
        play.outcome = `Copied claimed labor of ${targetSub.claimed} from target.`;
      }
    }
  }

  // Step 2: Forged Ledger — apply +2 to claimed Labor (capped +2 per card)
  for (const play of cardsPlayed) {
    if (play.cardId === 'forged_ledger' && submissions[play.playerId]) {
      submissions[play.playerId].claimed = (submissions[play.playerId].claimed || 0) + 2;
      play.resolved = true;
      play.outcome = 'Added +2 to claimed labor.';
    }
  }

  // Step 3: Saint — replace claimed with true, mark verified, +5 reputation
  for (const play of cardsPlayed) {
    if (play.cardId === 'saint' && submissions[play.playerId]) {
      const sub = submissions[play.playerId];
      if (sub.actual >= sub.claimed) {
        sub.claimed = sub.actual;
        verifiedEntries[play.playerId] = true;
        repChanges[play.playerId] = (repChanges[play.playerId] || 0) + 5;
        play.resolved = true;
        play.outcome = 'Verified actual labor and gained +5 reputation.';

        const pName = play.playerName || 'A Castaway';
        publicCardsPlayed.push({
          playerName: pName,
          cardName: 'Saint',
          effect: `Revealed ${sub.actual} true Labor (+5 Rep, Verified)`,
        });

        await addDoc(publicLogCol, {
          type: 'card',
          text: `SAINT PROCLAMATION: ${pName} publicly verified ${sub.actual} true physical Labor (+5 Reputation).`,
          round: roundNumber,
          timestamp: serverTimestamp(),
        });
      }
    }
  }

  // Step 4: Whisper Campaign — apply -3 reputation to target (private to target)
  for (const play of cardsPlayed) {
    if (play.cardId === 'whisper_campaign' && play.targetId) {
      repChanges[play.targetId] = (repChanges[play.targetId] || 0) - 3;
      play.resolved = true;
      play.outcome = 'Target reputation reduced by 3.';

      await addPrivateLog(
        gameId,
        play.targetId,
        'Your reputation has fallen by 3. You don’t know why.',
        roundNumber
      );
    }
  }

  // Step 5: Sabotage — subtract 2 from true Labor total per Sabotage card
  let sabotageDeduction = 0;
  for (const play of cardsPlayed) {
    if (play.cardId === 'sabotage') {
      sabotageDeduction += 2;
      play.resolved = true;
      play.outcome = 'Removed 2 Labor from raft true total.';
    }
  }

  // Step 6: Smokescreen — flag the player as audit-shielded
  const smokescreenShielded: Record<string, boolean> = {};
  for (const play of cardsPlayed) {
    if (play.cardId === 'smokescreen') {
      smokescreenShielded[play.playerId] = true;
      play.resolved = true;
      play.outcome = 'Audit shield active for this round.';
    }
  }

  // Step 7: Bribe — queue vote manipulation for next vote resolution (Round 4+)
  for (const play of cardsPlayed) {
    if (play.cardId === 'bribe' && play.targetId) {
      play.resolved = true;
      play.outcome = 'Vote manipulation queued for target.';

      await addPrivateLog(
        gameId,
        play.targetId,
        'A secret parcel of stash was placed in your gear. Your vote on the next resolution has been compromised.',
        roundNumber
      );
    }
  }

  // Step 8: Compute Public Ledger Total (sum of claimed values, including forgeries)
  let publicTotal = 0;
  const ledgerEntries: Record<string, number | string> = {};

  for (const player of allPlayers) {
    const sub = submissions[player.id] || { claimed: 0, actual: 0, stash: 0, rest: 0, scheme: 0 };
    const profile = privateProfiles[player.id];

    // Ghost passive: Ledger entry is always blank ("—")
    if (profile.role === 'GHOST') {
      ledgerEntries[player.id] = '—';
    } else {
      const claimVal = sub.claimed || 0;
      publicTotal += claimVal;
      ledgerEntries[player.id] = claimVal;
    }

    // Influencer Passive: Claimed contributions grant +1 reputation even if false
    if (profile.role === 'INFLUENCER' && (sub.claimed || 0) > 0) {
      repChanges[player.id] = (repChanges[player.id] || 0) + 1;
    }
  }

  // Step 9: Compute True Raft Progress (sum of actuals, minus Sabotage)
  let rawActualTotal = 0;
  for (const player of allPlayers) {
    const sub = submissions[player.id] || { claimed: 0, actual: 0 };
    rawActualTotal += sub.actual || 0;
  }
  const trueActualTotal = Math.max(0, rawActualTotal - sabotageDeduction);

  // Step 10: Resolve Audits (checking Smokescreen shields first)
  for (const player of allPlayers) {
    const sub = submissions[player.id];
    if (sub?.auditTargetId && sub.auditTargetId !== player.id) {
      let targetId = sub.auditTargetId;
      let targetPlayer = allPlayers.find((p) => p.id === targetId);
      const auditorProfile = privateProfiles[player.id];

      // Check Smokescreen deflection
      let wasRedirected = false;
      let originalTargetName = '';
      if (smokescreenShielded[targetId]) {
        wasRedirected = true;
        originalTargetName = targetPlayer?.displayName || 'A Castaway';

        // Notify shielded player privately
        await addPrivateLog(
          gameId,
          targetId,
          'Your name was cleared. Someone else paid the price.',
          roundNumber
        );

        // Pick random other player (not auditor and not shielded player)
        const eligibleTargets = allPlayers.filter((p) => p.id !== player.id && p.id !== targetId);
        if (eligibleTargets.length > 0) {
          const redirectedPlayer = eligibleTargets[Math.floor(Math.random() * eligibleTargets.length)];
          targetId = redirectedPlayer.id;
          targetPlayer = redirectedPlayer;

          await addPrivateLog(
            gameId,
            redirectedPlayer.id,
            'An inquiry aimed elsewhere was deflected in the smoke directly onto your records.',
            roundNumber
          );
        }
      }

      if (targetPlayer && auditorProfile) {
        const targetProfile = privateProfiles[targetId];
        const targetSub = submissions[targetId] || { claimed: 0, actual: 0 };
        const targetClaimed = targetSub.claimed || 0;
        const targetActual = targetSub.actual || 0;

        const auditRepDelta: Record<string, number> = {};

        if (targetProfile.role === 'GHOST') {
          // GHOST: audit returns no data. Auditor loses 1 rep. Ghost unrevealed.
          const auditorPenalty = -1;
          auditRepDelta[player.id] = auditorPenalty;
          repChanges[player.id] = (repChanges[player.id] || 0) + auditorPenalty;

          if (auditorProfile.role === 'IDEALIST') {
            repChanges[player.id] = (repChanges[player.id] || 0) - 3;
            auditRepDelta[player.id] = (auditRepDelta[player.id] || 0) - 3;
          }

          const noDataAudit: AuditRecord = {
            auditorId: player.id,
            auditorName: player.displayName,
            targetId: targetPlayer.id,
            targetName: targetPlayer.displayName,
            result: 'no_data',
            repChanges: auditRepDelta,
            timestamp: Date.now(),
          };
          if (wasRedirected) {
            noDataAudit.redirectedFromId = sub.auditTargetId || '';
            noDataAudit.redirectedFromName = originalTargetName || '';
          }
          audits.push(noDataAudit);
        } else if (targetClaimed > targetActual) {
          // LIAR CAUGHT!
          const targetPenalty = -4;
          const auditorReward = 3;

          auditRepDelta[targetId] = targetPenalty;
          auditRepDelta[player.id] = auditorReward;

          repChanges[targetId] = (repChanges[targetId] || 0) + targetPenalty;
          repChanges[player.id] = (repChanges[player.id] || 0) + auditorReward;

          const lieAudit: AuditRecord = {
            auditorId: player.id,
            auditorName: player.displayName,
            targetId: targetPlayer.id,
            targetName: targetPlayer.displayName,
            result: 'lie',
            claimed: targetClaimed,
            actual: targetActual,
            repChanges: auditRepDelta,
            timestamp: Date.now(),
          };
          if (wasRedirected) {
            lieAudit.redirectedFromId = sub.auditTargetId || '';
            lieAudit.redirectedFromName = originalTargetName || '';
          }
          audits.push(lieAudit);
        } else {
          // HONEST PLAYER FALSELY AUDITED!
          const auditorPenalty = -3;
          const targetReward = 2;

          auditRepDelta[player.id] = auditorPenalty;
          auditRepDelta[targetId] = targetReward;

          repChanges[player.id] = (repChanges[player.id] || 0) + auditorPenalty;
          repChanges[targetId] = (repChanges[targetId] || 0) + targetReward;

          if (auditorProfile.role === 'IDEALIST') {
            repChanges[player.id] = (repChanges[player.id] || 0) - 3;
            auditRepDelta[player.id] = (auditRepDelta[player.id] || 0) - 3;
          }

          const honestAudit: AuditRecord = {
            auditorId: player.id,
            auditorName: player.displayName,
            targetId: targetPlayer.id,
            targetName: targetPlayer.displayName,
            result: 'honest',
            repChanges: auditRepDelta,
            timestamp: Date.now(),
          };
          if (wasRedirected) {
            honestAudit.redirectedFromId = sub.auditTargetId || '';
            honestAudit.redirectedFromName = originalTargetName || '';
          }
          audits.push(honestAudit);
        }
      }
    }
  }

  // Step 10.5: Track Provisions contributions
  const currentStage: RaftStage = gameData.raftStage || 'frame';
  const provisionsContributions: Record<string, number> = {
    ...(gameData.provisionsContributions || {}),
  };
  if (currentStage === 'provisions') {
    for (const player of allPlayers) {
      const sub = submissions[player.id];
      if (sub && sub.actual > 0) {
        provisionsContributions[player.id] = (provisionsContributions[player.id] || 0) + sub.actual;
      }
    }
  }

  // Step 11: Advance Raft Stage with Mandatory Order, Carryover & Sabotage Revert
  const progress: RaftProgress = {
    frame: gameData.raftProgress?.frame || 0,
    deck: gameData.raftProgress?.deck || 0,
    sail: gameData.raftProgress?.sail || 0,
    provisions: gameData.raftProgress?.provisions || 0,
  };

  const netLabor = rawActualTotal - sabotageDeduction;

  let didStageAdvance = false;
  let newStage = currentStage;
  let isLaunchReady = false;

  if (netLabor > 0) {
    let remainingLabor = netLabor;
    let currentIdx = STAGE_ORDER.indexOf(currentStage);

    while (remainingLabor > 0 && currentIdx < STAGE_ORDER.length) {
      const st = STAGE_ORDER[currentIdx];
      const req = STAGE_REQUIREMENTS[st];
      const currProg = progress[st] || 0;
      const needed = req - currProg;

      if (remainingLabor >= needed) {
        progress[st] = req;
        remainingLabor -= needed;
        didStageAdvance = true;

        const stageName = st.charAt(0).toUpperCase() + st.slice(1);
        await addDoc(publicLogCol, {
          type: 'system',
          text: `The ${stageName} is finished.`,
          round: roundNumber,
          timestamp: serverTimestamp(),
        });

        if (st === 'provisions') {
          isLaunchReady = true;
          break;
        } else {
          currentIdx++;
          newStage = STAGE_ORDER[currentIdx];
        }
      } else {
        progress[st] = currProg + remainingLabor;
        remainingLabor = 0;
      }
    }
  } else if (netLabor < 0) {
    // Sabotage damage exceeds delivered labor this round
    let damage = Math.abs(netLabor);
    let currentIdx = STAGE_ORDER.indexOf(currentStage);

    while (damage > 0 && currentIdx >= 0) {
      const st = STAGE_ORDER[currentIdx];
      const currProg = progress[st] || 0;

      if (currProg > 0) {
        const deduction = Math.min(currProg, damage);
        progress[st] = currProg - deduction;
        damage -= deduction;

        if (currProg >= STAGE_REQUIREMENTS[st] && progress[st] < STAGE_REQUIREMENTS[st]) {
          const stageName = st.charAt(0).toUpperCase() + st.slice(1);
          await addDoc(publicLogCol, {
            type: 'system',
            text: `The ${stageName} splits. The work is undone.`,
            round: roundNumber,
            timestamp: serverTimestamp(),
          });
          newStage = st;
        }
      } else if (currentIdx > 0) {
        currentIdx--;
        const prevSt = STAGE_ORDER[currentIdx];
        const prevProg = progress[prevSt] || 0;
        const deduction = Math.min(prevProg, damage);
        progress[prevSt] = prevProg - deduction;
        damage -= deduction;

        const stageName = prevSt.charAt(0).toUpperCase() + prevSt.slice(1);
        await addDoc(publicLogCol, {
          type: 'system',
          text: `The ${stageName} splits. The work is undone.`,
          round: roundNumber,
          timestamp: serverTimestamp(),
        });
        newStage = prevSt;
      } else {
        break;
      }
    }
  }

  if (progress.provisions >= STAGE_REQUIREMENTS.provisions) {
    isLaunchReady = true;
  }

  // Role Passives linked to Stage Advance / Failure
  for (const player of allPlayers) {
    const profile = privateProfiles[player.id];
    if (didStageAdvance) {
      if (profile.role === 'IDEALIST') {
        repChanges[player.id] = (repChanges[player.id] || 0) + 2;
      }
    } else {
      if (profile.role === 'TYRANT') {
        profile.stash = (profile.stash || 0) + 2;
      }
    }
  }

  // Step 12: Draw 1 Scheme card for each player for next round (max hand 5)
  let deckReshuffleAnnounced = false;
  for (const player of allPlayers) {
    const profile = privateProfiles[player.id];
    const currentHand = profile.hand || [];

    if (currentHand.length < 5) {
      const { drawn, reshuffled } = await drawCardsFromDeck(gameId, 1);
      if (reshuffled && !deckReshuffleAnnounced) {
        deckReshuffleAnnounced = true;
        await addDoc(publicLogCol, {
          type: 'system',
          text: 'The deck is exhausted. Old schemes return.',
          round: roundNumber,
          timestamp: serverTimestamp(),
        });
      }
      if (drawn.length > 0) {
        profile.hand = [...currentHand, ...drawn];
        await addPrivateLog(
          gameId,
          player.id,
          `You drew ${SCHEME_CARDS[drawn[0]]?.name || drawn[0]} for the upcoming round.`,
          roundNumber + 1
        );
      }
    }
  }

  // Persist updated stats (Public Player docs and Private profile docs)
  for (const player of allPlayers) {
    const sub = submissions[player.id] || { claimed: 0, actual: 0, stash: 0, rest: 0, scheme: 0 };
    const profile = privateProfiles[player.id];

    const newStash = (profile.stash || 0) + (sub.stash || 0);
    const newEnergy = 5 + (sub.rest || 0);
    const repDelta = repChanges[player.id] || 0;
    const newReputation = (player.reputation || 0) + repDelta;

    const playerDocRef = doc(db, `games/${gameId}/players`, player.id);
    await updateDoc(playerDocRef, {
      energy: newEnergy,
      reputation: newReputation,
      handCount: profile.hand.length,
    });

    const privRef = doc(db, `games/${gameId}/players/${player.id}/private`, 'profile');
    await updateDoc(privRef, {
      stash: newStash,
      hand: profile.hand,
      smokescreenActive: false,
      activeCooldown: Math.max(0, (profile.activeCooldown || 0) - 1),
    });
  }

  const vagueDescription = getVagueProgressDescription(trueActualTotal);

  // Generate GM Narration via Gemini (with Cards and Audits context)
  const gmNarration = await generateGMNarration({
    round: roundNumber,
    raftStage: currentStage,
    claimedTotal: publicTotal,
    actualTotal: trueActualTotal,
    playerCount: allPlayers.length,
    stageProgressStatus: vagueDescription,
    audits,
    roleActions,
    cardsPlayed,
  });

  // Write to Public Ledger doc
  const ledgerRef = doc(db, `games/${gameId}/ledger`, roundNumber.toString());
  await setDoc(ledgerRef, {
    entries: ledgerEntries,
    verifiedEntries,
    publicTotal,
    gmNarration,
    stageProgressStatus: vagueDescription,
    roundNumber,
    audits,
    roleActions,
    repDeltas: repChanges,
    publicCardsPlayed,
  });

  // Write Public Log Entries for Audits
  for (const audit of audits) {
    let logText = '';
    const redirNote = audit.redirectedFromName ? ` (diverted from ${audit.redirectedFromName})` : '';
    if (audit.result === 'lie') {
      logText = `AUDIT INQUEST: ${audit.auditorName} inspected ${audit.targetName}'s output${redirNote}. DECEIT EXPOSED — Claimed ${audit.claimed} units, delivered ${audit.actual}.`;
    } else if (audit.result === 'no_data') {
      logText = `AUDIT INQUEST: ${audit.auditorName} scrutinized ${audit.targetName}${redirNote}. Manifest search returned no conclusive records.`;
    } else {
      logText = `AUDIT INQUEST: ${audit.auditorName} challenged ${audit.targetName}${redirNote}. Accusation unfounded; ${audit.targetName} delivered true labor.`;
    }
    await addDoc(publicLogCol, {
      type: 'audit',
      text: logText,
      round: roundNumber,
      timestamp: serverTimestamp(),
    });
  }

  await addDoc(publicLogCol, {
    type: 'narration',
    text: gmNarration,
    round: roundNumber,
    timestamp: serverTimestamp(),
  });

  // Mark round resolved
  const roundRef = doc(db, `games/${gameId}/rounds`, roundNumber.toString());
  await updateDoc(roundRef, {
    resolved: true,
    resolutionWindowOpen: false,
    audits,
    roleActions,
    cardsPlayed,
  });

  // If Provisions stage is complete, initialize Launch Phase!
  const totalSeats = Math.min(4, Math.max(2, Math.ceil(allPlayers.length / 2)));
  let launchData: LaunchData | undefined = undefined;

  if (isLaunchReady) {
    launchData = {
      state: 'roll_call',
      totalSeats,
      seats: [],
      votes: [],
      buyoutPrice: 5,
      buyouts: [],
      swims: [],
      mutinies: [],
      stepStartedAt: Date.now(),
      drownedPlayerIds: [],
    };

    await addDoc(publicLogCol, {
      type: 'system',
      text: `[ THE RAFT — LAUNCH-READY ] SEATS AVAILABLE: ${totalSeats}. The Launch Phase begins.`,
      round: roundNumber,
      timestamp: serverTimestamp(),
    });
  }

  // Update game document
  const gameRef = doc(db, 'games', gameId);
  await updateDoc(gameRef, {
    roundPhase: isLaunchReady ? 'launch' : 'ledger',
    raftProgress: progress,
    raftStage: newStage,
    gmNarration,
    provisionsContributions,
    ...(launchData ? { launchData, seats: [] } : {}),
  });

  return { publicTotal, gmNarration, stageProgressStatus: vagueDescription, audits, isLaunchReady };
}

export async function advanceToNextRound(gameId: string, hostId: string) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();

  if (gameData.roundPhase !== 'ledger' && gameData.roundPhase !== 'launch') {
    throw new Error('Can only advance round after ledger review.');
  }

  // Check if raft is launch-ready
  if (
    (gameData.raftProgress?.provisions || 0) >= STAGE_REQUIREMENTS.provisions ||
    gameData.roundPhase === 'launch'
  ) {
    return initiateLaunchPhase(gameId);
  }

  const nextRound = (gameData.round || 1) + 1;

  // Round 12 begins without a completed raft (Island wins by attrition)
  if (nextRound >= 12) {
    return triggerEndgame(gameId, 'attrition');
  }

  await updateDoc(gameRef, {
    round: nextRound,
    roundPhase: 'scavenge',
    gmNarration: `Round ${nextRound} begins. Eyes dart between the ledger, the audit logs, and the grey tide.`,
  });

  // Create next round doc
  const roundRef = doc(db, `games/${gameId}/rounds`, nextRound.toString());
  await setDoc(roundRef, {
    submissions: {},
    resolved: false,
    submittedPlayerIds: [],
    cardsPlayed: [],
    resolutionWindowOpen: false,
    audits: [],
    roleActions: [],
  });

  return { status: 'active', round: nextRound };
}

// ---------------------------------------------------------
// ROUND 4: THE LAUNCH PHASE STATE MACHINE & SEAT ASSIGNMENT
// ---------------------------------------------------------

export async function initiateLaunchPhase(gameId: string) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');

  const playersRef = collection(db, `games/${gameId}/players`);
  const playersSnap = await getDocs(playersRef);
  const allPlayers = playersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const totalSeats = Math.min(4, Math.max(2, Math.ceil(allPlayers.length / 2)));

  const launchData: LaunchData = {
    state: 'roll_call',
    totalSeats,
    seats: [],
    votes: [],
    buyoutPrice: 5,
    buyouts: [],
    swims: [],
    mutinies: [],
    stepStartedAt: Date.now(),
    drownedPlayerIds: [],
  };

  const publicLogCol = collection(db, `games/${gameId}/publicLog`);
  await addDoc(publicLogCol, {
    type: 'system',
    text: `[ THE RAFT — LAUNCH-READY ] SEATS AVAILABLE: ${totalSeats}. The Launch Phase begins.`,
    round: gameSnap.data()?.round || 1,
    timestamp: serverTimestamp(),
  });

  await updateDoc(gameRef, {
    roundPhase: 'launch',
    launchData,
    seats: [],
  });

  return { status: 'launch', launchData };
}

// Advance Launch Steps (Roll Call -> Provisioner -> Vote -> Buyout -> Swim -> Done)
export async function advanceLaunchStep(gameId: string, hostId?: string) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();

  const launchData: LaunchData = gameData.launchData || {
    state: 'roll_call',
    totalSeats: 2,
    seats: [],
    votes: [],
    buyoutPrice: 5,
    buyouts: [],
    swims: [],
    mutinies: [],
    stepStartedAt: Date.now(),
    drownedPlayerIds: [],
  };

  const playersRef = collection(db, `games/${gameId}/players`);
  const playersSnap = await getDocs(playersRef);
  const allPlayers = playersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  const publicLogCol = collection(db, `games/${gameId}/publicLog`);
  const roundNum = gameData.round || 1;

  // STEP A -> STEP B (Provisioner's Claim)
  if (launchData.state === 'roll_call') {
    launchData.state = 'provisioner';

    // Step B: The Provisioner's Claim
    // Find player with highest verified true labor on provisions
    const provContribs = gameData.provisionsContributions || {};
    let highestVal = -1;
    let candidates: any[] = [];

    for (const player of allPlayers) {
      const contrib = provContribs[player.id] || 0;
      if (contrib > highestVal) {
        highestVal = contrib;
        candidates = [player];
      } else if (contrib === highestVal) {
        candidates.push(player);
      }
    }

    if (candidates.length === 0) {
      candidates = [...allPlayers];
    }

    let winner = candidates[0];
    let tieNotes = '';

    if (candidates.length > 1) {
      // Tie breaker: private d6 roll
      let bestRoll = -1;
      let winningCand = candidates[0];
      for (const cand of candidates) {
        const roll = Math.floor(Math.random() * 6) + 1;
        if (roll > bestRoll) {
          bestRoll = roll;
          winningCand = cand;
        }
      }
      winner = winningCand;

      // Tied losers receive +2 reputation for graciousness
      for (const loser of candidates) {
        if (loser.id !== winner.id) {
          const lRef = doc(db, `games/${gameId}/players`, loser.id);
          await updateDoc(lRef, {
            reputation: (loser.reputation || 0) + 2,
          });
          await addPrivateLog(
            gameId,
            loser.id,
            `You tied for Provisioner's Claim and yielded gracefully (+2 Reputation).`,
            roundNum
          );
        }
      }
      tieNotes = ` (Won tiebreaker d6 roll).`;
    }

    const seat1: RaftSeat = {
      seatNumber: 1,
      playerId: winner.id,
      playerName: winner.displayName,
      method: 'provisioner',
    };

    launchData.seats = [seat1];
    launchData.state = 'vote'; // Step C (Captain) skipped, directly opens Step D (Vote)
    launchData.stepStartedAt = Date.now();

    const winnerRef = doc(db, `games/${gameId}/players`, winner.id);
    await updateDoc(winnerRef, {
      isSeated: true,
      seatNumber: 1,
    });

    await addDoc(publicLogCol, {
      type: 'launch',
      text: `${winner.displayName} built the provisions. They board first into Seat 1.${tieNotes}`,
      round: roundNum,
      timestamp: serverTimestamp(),
    });

    const gmText = await generateLaunchNarration({
      step: 'provisioner',
      details: `${winner.displayName} claimed Seat 1 with ${highestVal} provisions labor.`,
    });

    await addDoc(publicLogCol, {
      type: 'narration',
      text: gmText,
      round: roundNum,
      timestamp: serverTimestamp(),
    });

    await updateDoc(gameRef, {
      launchData,
      seats: launchData.seats,
      gmNarration: gmText,
    });

    return { success: true, launchData };
  }

  // STEP D -> RESOLVE VOTE
  if (launchData.state === 'vote') {
    const totalSeats = launchData.totalSeats;
    const currentSeats = launchData.seats || [];
    const remainingSeatsCount = totalSeats - currentSeats.length;

    if (remainingSeatsCount <= 0) {
      // All seats already filled
      launchData.state = 'done';
      return finalizeLaunch(gameId, gameData, launchData, allPlayers);
    }

    const seatedIds = new Set(currentSeats.map(s => s.playerId));
    const unseatedPlayers = allPlayers.filter(p => !seatedIds.has(p.id) && !p.isDrowned);

    // Tally votes
    const pendingVotes = launchData.pendingVotes || {};
    const voteTallies: Record<string, { totalWeight: number; voterNames: string[] }> = {};
    const recordedVotes: LaunchVoteRecord[] = [];

    for (const p of unseatedPlayers) {
      voteTallies[p.id] = { totalWeight: 0, voterNames: [] };
    }

    for (const voter of unseatedPlayers) {
      const vote = pendingVotes[voter.id];
      if (vote && vote.targetId && vote.targetId !== voter.id && !seatedIds.has(vote.targetId)) {
        const voterRep = voter.reputation || 0;
        let weight = 1;
        if (voterRep < 0) weight = 0;
        else if (voterRep === 0) weight = 1;
        else if (voterRep <= 3) weight = 2;
        else if (voterRep <= 6) weight = 3;
        else weight = 4;

        if (voteTallies[vote.targetId]) {
          voteTallies[vote.targetId].totalWeight += weight;
          voteTallies[vote.targetId].voterNames.push(voter.displayName);
        }

        const targetPlayer = allPlayers.find(pl => pl.id === vote.targetId);
        recordedVotes.push({
          voterId: voter.id,
          voterName: voter.displayName,
          targetId: vote.targetId,
          targetName: targetPlayer?.displayName || 'Unknown',
          voterReputation: voterRep,
          weight,
        });
      }
    }

    launchData.votes = recordedVotes;

    // Rank candidates by weighted votes
    const ranked = unseatedPlayers.map(p => ({
      player: p,
      score: voteTallies[p.id]?.totalWeight || 0,
      rep: p.reputation || 0,
    }));

    ranked.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.rep - a.rep;
    });

    const isTotalDeadlock = ranked.length > 0 && ranked.every(r => r.score === ranked[0].score && r.score === 0);

    if (isTotalDeadlock) {
      await addDoc(publicLogCol, {
        type: 'launch',
        text: 'The vote ended in a dead silence with zero consensus. Remaining seats open to stash buyout.',
        round: roundNum,
        timestamp: serverTimestamp(),
      });
      launchData.state = 'buyout';
      launchData.buyoutPrice = 5;
      launchData.stepStartedAt = Date.now();
    } else {
      // Assign available seats to top vote-getters
      const winners = ranked.slice(0, remainingSeatsCount).filter(r => r.score > 0);

      for (const w of winners) {
        const nextSeatNumber = launchData.seats.length + 1;
        const newSeat: RaftSeat = {
          seatNumber: nextSeatNumber,
          playerId: w.player.id,
          playerName: w.player.displayName,
          method: 'vote',
        };
        launchData.seats.push(newSeat);

        const pRef = doc(db, `games/${gameId}/players`, w.player.id);
        await updateDoc(pRef, {
          isSeated: true,
          seatNumber: nextSeatNumber,
        });

        await addDoc(publicLogCol, {
          type: 'launch',
          text: `${w.player.displayName} was voted into Seat ${nextSeatNumber} (${w.score} weighted votes).`,
          round: roundNum,
          timestamp: serverTimestamp(),
        });
      }

      const gmText = await generateLaunchNarration({
        step: 'vote',
        details: `Voted into seats: ${winners.map(w => w.player.displayName).join(', ') || 'None'}.`,
      });

      await addDoc(publicLogCol, {
        type: 'narration',
        text: gmText,
        round: roundNum,
        timestamp: serverTimestamp(),
      });

      if (launchData.seats.length >= totalSeats) {
        launchData.state = 'done';
        launchData.resolving = false;
        return finalizeLaunch(gameId, gameData, launchData, allPlayers);
      } else {
        launchData.state = 'buyout';
        launchData.buyoutPrice = 5;
        launchData.stepStartedAt = Date.now();
      }
    }

    launchData.resolving = false;
    await updateDoc(gameRef, {
      launchData,
      seats: launchData.seats,
    });

    return { success: true, launchData };
  }

  // STEP E -> RESOLVE BUYOUT
  if (launchData.state === 'buyout') {
    const totalSeats = launchData.totalSeats;
    const currentSeats = launchData.seats || [];
    const remainingSeatsCount = totalSeats - currentSeats.length;

    if (remainingSeatsCount <= 0) {
      launchData.state = 'done';
      return finalizeLaunch(gameId, gameData, launchData, allPlayers);
    }

    const buyouts = launchData.buyouts || [];
    const seatedIds = new Set(currentSeats.map(s => s.playerId));
    const validBids = buyouts.filter(b => !seatedIds.has(b.playerId) && b.amount >= (launchData.buyoutPrice || 5));

    validBids.sort((a, b) => b.amount - a.amount);

    if (validBids.length > 0) {
      const winnerBid = validBids[0];
      const nextSeatNumber = launchData.seats.length + 1;

      // Deduct stash from winner
      const winnerPrivRef = doc(db, `games/${gameId}/players/${winnerBid.playerId}/private`, 'profile');
      const wSnap = await getDoc(winnerPrivRef);
      if (wSnap.exists()) {
        const currStash = wSnap.data()?.stash || 0;
        await updateDoc(winnerPrivRef, {
          stash: Math.max(0, currStash - winnerBid.amount),
        });
      }

      const seat: RaftSeat = {
        seatNumber: nextSeatNumber,
        playerId: winnerBid.playerId,
        playerName: winnerBid.playerName,
        method: 'buyout',
      };
      launchData.seats.push(seat);

      const pRef = doc(db, `games/${gameId}/players`, winnerBid.playerId);
      await updateDoc(pRef, {
        isSeated: true,
        seatNumber: nextSeatNumber,
      });

      await addDoc(publicLogCol, {
        type: 'launch',
        text: `${winnerBid.playerName} bought Seat ${nextSeatNumber} for ${winnerBid.amount} Stash.`,
        round: roundNum,
        timestamp: serverTimestamp(),
      });

      const gmText = await generateLaunchNarration({
        step: 'buyout',
        details: `${winnerBid.playerName} purchased Seat ${nextSeatNumber} for ${winnerBid.amount} stash.`,
      });

      await addDoc(publicLogCol, {
        type: 'narration',
        text: gmText,
        round: roundNum,
        timestamp: serverTimestamp(),
      });

      // Escalate price for next buyout
      const nextPrice = launchData.buyoutPrice === 5 ? 8 : 12;
      launchData.buyoutPrice = nextPrice;

      if (launchData.seats.length >= totalSeats) {
        launchData.state = 'done';
        return finalizeLaunch(gameId, gameData, launchData, allPlayers);
      } else {
        // Can open swim phase for final seat
        launchData.state = 'swim';
        launchData.stepStartedAt = Date.now();
      }
    } else {
      await addDoc(publicLogCol, {
        type: 'launch',
        text: 'No stash buyouts were tendered. The final contested berth falls to the Desperation Swim.',
        round: roundNum,
        timestamp: serverTimestamp(),
      });
      launchData.state = 'swim';
      launchData.stepStartedAt = Date.now();
    }

    await updateDoc(gameRef, {
      launchData,
      seats: launchData.seats,
    });

    return { success: true, launchData };
  }

  // STEP F -> RESOLVE SWIM
  if (launchData.state === 'swim') {
    const totalSeats = launchData.totalSeats;
    const currentSeats = launchData.seats || [];
    const seatedIds = new Set(currentSeats.map(s => s.playerId));
    const unseated = allPlayers.filter(p => !seatedIds.has(p.id) && !p.isDrowned);

    if (unseated.length === 0 || currentSeats.length >= totalSeats) {
      launchData.state = 'done';
      return finalizeLaunch(gameId, gameData, launchData, allPlayers);
    }

    // Swimmers roll: d6 + floor(energy / 2)
    const swimResults: LaunchSwimRecord[] = [];
    for (const swimmer of unseated) {
      const roll = Math.floor(Math.random() * 6) + 1;
      const energyBonus = Math.floor((swimmer.energy || 0) / 2);
      const totalScore = roll + energyBonus;

      swimResults.push({
        playerId: swimmer.id,
        playerName: swimmer.displayName,
        roll,
        energyBonus,
        totalScore,
        seatWon: false,
        survived: false,
      });
    }

    swimResults.sort((a, b) => b.totalScore - a.totalScore);

    const winner = swimResults[0];
    winner.seatWon = true;
    winner.survived = true;

    const nextSeatNumber = launchData.seats.length + 1;
    const seat: RaftSeat = {
      seatNumber: nextSeatNumber,
      playerId: winner.playerId,
      playerName: winner.playerName,
      method: 'swim',
    };
    launchData.seats.push(seat);

    // Winner gets +3 Reputation
    const winRef = doc(db, `games/${gameId}/players`, winner.playerId);
    const winPlayer = allPlayers.find(p => p.id === winner.playerId);
    await updateDoc(winRef, {
      isSeated: true,
      seatNumber: nextSeatNumber,
      reputation: (winPlayer?.reputation || 0) + 3,
    });

    await addDoc(publicLogCol, {
      type: 'launch',
      text: `${winner.playerName} braved the breakers (Check: ${winner.totalScore}) and claimed Seat ${nextSeatNumber} as The Swimmer (+3 Reputation)!`,
      round: roundNum,
      timestamp: serverTimestamp(),
    });

    // All other swimmers drown!
    const drownedIds: string[] = [];
    for (let i = 1; i < swimResults.length; i++) {
      const loser = swimResults[i];
      drownedIds.push(loser.playerId);
      const lRef = doc(db, `games/${gameId}/players`, loser.playerId);
      await updateDoc(lRef, {
        isDrowned: true,
        isLeftBehind: false,
      });

      await addDoc(publicLogCol, {
        type: 'launch',
        text: `${loser.playerName} was swept under the dark tide (Check: ${loser.totalScore}) and drowned.`,
        round: roundNum,
        timestamp: serverTimestamp(),
      });
    }

    launchData.swims = swimResults;
    launchData.drownedPlayerIds = drownedIds;
    launchData.state = 'done';

    const gmText = await generateLaunchNarration({
      step: 'swim',
      details: `${winner.playerName} swam aboard while others were lost in the breakers.`,
    });

    await addDoc(publicLogCol, {
      type: 'narration',
      text: gmText,
      round: roundNum,
      timestamp: serverTimestamp(),
    });

    return finalizeLaunch(gameId, gameData, launchData, allPlayers);
  }

  if (launchData.state === 'done') {
    return finalizeLaunch(gameId, gameData, launchData, allPlayers);
  }

  return { success: true };
}

// Finalize Launch and generate closing scene
async function finalizeLaunch(
  gameId: string,
  gameData: any,
  launchData: LaunchData,
  allPlayers: any[]
) {
  const seatedIds = new Set((launchData.seats || []).map(s => s.playerId));
  const drownedIds = new Set(launchData.drownedPlayerIds || []);

  const seatedNames: string[] = [];
  const leftBehindNames: string[] = [];
  const drownedNames: string[] = [];

  for (const p of allPlayers) {
    if (seatedIds.has(p.id)) {
      seatedNames.push(p.displayName);
    } else if (drownedIds.has(p.id) || p.isDrowned) {
      drownedNames.push(p.displayName);
    } else {
      leftBehindNames.push(p.displayName);
      const pRef = doc(db, `games/${gameId}/players`, p.id);
      await updateDoc(pRef, {
        isLeftBehind: true,
      });
    }
  }

  const launchScene = await generateLaunchScene({
    seatedPlayers: seatedNames,
    leftBehindPlayers: leftBehindNames,
    drownedPlayers: drownedNames,
    totalSeats: launchData.totalSeats,
  });

  launchData.launchScene = launchScene;
  launchData.state = 'done';

  const publicLogCol = collection(db, `games/${gameId}/publicLog`);
  await addDoc(publicLogCol, {
    type: 'system',
    text: `[ THE RAFT HAS DEPARTED ] Survivors: ${seatedNames.join(', ') || 'None'}. Left Behind: ${leftBehindNames.join(', ') || 'None'}. Drowned: ${drownedNames.join(', ') || 'None'}.`,
    round: gameData.round || 1,
    timestamp: serverTimestamp(),
  });

  await addDoc(publicLogCol, {
    type: 'narration',
    text: launchScene,
    round: gameData.round || 1,
    timestamp: serverTimestamp(),
  });

  const gameRef = doc(db, 'games', gameId);
  await updateDoc(gameRef, {
    roundPhase: 'postlaunch',
    status: 'ended',
    launchData,
    seats: launchData.seats,
    gmNarration: launchScene,
  });

  return { success: true, launchData, launchScene };
}

// Player submits vote during Step D
export async function submitLaunchVote(gameId: string, voterId: string, targetId: string) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();

  if (gameData.roundPhase !== 'launch' || gameData.launchData?.state !== 'vote') {
    throw new Error('Voting is not currently active.');
  }

  if (voterId === targetId) {
    throw new Error('You cannot vote for yourself.');
  }

  const launchData: LaunchData = gameData.launchData;
  const currentSeats = launchData.seats || [];
  if (currentSeats.some(s => s.playerId === targetId)) {
    throw new Error('Target player is already seated on the raft.');
  }
  if (currentSeats.some(s => s.playerId === voterId)) {
    throw new Error('Seated survivors may not vote.');
  }

  const voterRef = doc(db, `games/${gameId}/players`, voterId);
  const voterSnap = await getDoc(voterRef);
  const voterName = voterSnap.data()?.displayName || 'Unknown';
  const voterRep = voterSnap.data()?.reputation || 0;

  let weight = 1;
  if (voterRep < 0) weight = 0;
  else if (voterRep === 0) weight = 1;
  else if (voterRep <= 3) weight = 2;
  else if (voterRep <= 6) weight = 3;
  else weight = 4;

  const pendingVotes = launchData.pendingVotes || {};
  pendingVotes[voterId] = {
    targetId,
    voterName,
    weight,
    voterReputation: voterRep,
    submittedAt: Date.now(),
  };

  launchData.pendingVotes = pendingVotes;

  await updateDoc(gameRef, {
    launchData,
  });

  // Check if all unseated active players have voted
  const playersRef = collection(db, `games/${gameId}/players`);
  const playersSnap = await getDocs(playersRef);
  const seatedIds = new Set(currentSeats.map(s => s.playerId));

  // FIX-05: auto-tally only when (a) every unseated non-bot player has voted AND (b) host has not manually advanced. Add launchData.resolving flag.
  const launchDataFreshSnap = await getDoc(gameRef);
  const latestGameData = launchDataFreshSnap.data();
  if (latestGameData && latestGameData.launchData?.state === 'vote' && !latestGameData.launchData?.resolving) {
    const freshLaunchData = latestGameData.launchData;
    const latestPendingVotes = freshLaunchData.pendingVotes || {};

    const unseatedNonBots = playersSnap.docs.filter(d => {
      const pData = d.data();
      return !seatedIds.has(d.id) && !pData?.isDrowned && !pData?.isBot;
    });

    if (unseatedNonBots.length > 0 && unseatedNonBots.every(p => latestPendingVotes[p.id])) {
      freshLaunchData.resolving = true;
      await updateDoc(gameRef, { launchData: freshLaunchData });

      try {
        await advanceLaunchStep(gameId);
      } catch (err) {
        console.error('FIX-05 Error auto-advancing launch vote:', err);
        const errorRefreshSnap = await getDoc(gameRef);
        const errorLaunchData = errorRefreshSnap.data()?.launchData;
        if (errorLaunchData) {
          errorLaunchData.resolving = false;
          await updateDoc(gameRef, { launchData: errorLaunchData });
        }
      }
    }
  }

  return { success: true };
}

// Player submits buyout bid during Step E
export async function submitLaunchBuyout(gameId: string, playerId: string, amount: number) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();

  if (gameData.roundPhase !== 'launch' || gameData.launchData?.state !== 'buyout') {
    throw new Error('Buyout is not currently active.');
  }

  const launchData: LaunchData = gameData.launchData;
  const minPrice = launchData.buyoutPrice || 5;
  if (amount < minPrice) {
    throw new Error(`Minimum buyout price is ${minPrice} Stash.`);
  }

  const privRef = doc(db, `games/${gameId}/players/${playerId}/private`, 'profile');
  const privSnap = await getDoc(privRef);
  const stash = privSnap.data()?.stash || 0;
  if (stash < amount) {
    throw new Error(`Insufficient Stash. You have ${stash}, bid is ${amount}.`);
  }

  const playerRef = doc(db, `games/${gameId}/players`, playerId);
  const playerSnap = await getDoc(playerRef);
  const playerName = playerSnap.data()?.displayName || 'Unknown';

  const buyouts = launchData.buyouts || [];
  buyouts.push({
    playerId,
    playerName,
    amount,
    seatWon: false,
    timestamp: Date.now(),
  });

  launchData.buyouts = buyouts;

  await updateDoc(gameRef, {
    launchData,
  });

  return { success: true };
}

// Player submits Desperation Swim check during Step F
export async function submitLaunchSwim(gameId: string, playerId: string) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();

  if (gameData.roundPhase !== 'launch' || gameData.launchData?.state !== 'swim') {
    throw new Error('Swim check is not currently active.');
  }

  return advanceLaunchStep(gameId);
}

// Player plays Mutiny Card during Launch Phase
export async function playLaunchMutiny(gameId: string, playerId: string, targetSeatNumber: number) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();

  if (gameData.roundPhase !== 'launch') {
    throw new Error('Mutiny can only be played during the Launch Phase.');
  }

  const launchData: LaunchData = gameData.launchData || {
    state: 'roll_call',
    totalSeats: 2,
    seats: [],
    votes: [],
    buyoutPrice: 5,
    buyouts: [],
    swims: [],
    mutinies: [],
    stepStartedAt: Date.now(),
    drownedPlayerIds: [],
  };

  if (launchData.mutinies && launchData.mutinies.length > 0) {
    throw new Error('Only one Mutiny may be played per Launch Phase.');
  }

  const privRef = doc(db, `games/${gameId}/players/${playerId}/private`, 'profile');
  const privSnap = await getDoc(privRef);
  if (!privSnap.exists()) throw new Error('Player profile not found.');
  const profile = privSnap.data() as PrivatePlayerProfile;

  if (!profile.hand || !profile.hand.includes('mutiny')) {
    throw new Error('You do not hold the Mutiny Scheme card.');
  }

  if ((profile.stash || 0) < 2) {
    throw new Error('Mutiny requires 2 Stash to orchestrate.');
  }

  // Find target seat
  const seatIndex = (launchData.seats || []).findIndex(s => s.seatNumber === targetSeatNumber);
  if (seatIndex === -1) {
    throw new Error(`Seat ${targetSeatNumber} is not currently occupied.`);
  }

  const unseatedPlayer = launchData.seats[seatIndex];

  // Unseat player
  launchData.seats.splice(seatIndex, 1);

  const targetPlayerRef = doc(db, `games/${gameId}/players`, unseatedPlayer.playerId);
  await updateDoc(targetPlayerRef, {
    isSeated: false,
    seatNumber: null,
  });

  // Deduct 2 stash and discard card
  const newHand = profile.hand.filter(c => c !== 'mutiny');
  await updateDoc(privRef, {
    stash: profile.stash - 2,
    hand: newHand,
  });

  // Record Mutiny anonymously
  const mutinyRecord: LaunchMutinyRecord = {
    playerId,
    targetSeat: targetSeatNumber,
    unseatedPlayerId: unseatedPlayer.playerId,
    unseatedPlayerName: unseatedPlayer.playerName,
    resolved: true,
    timestamp: Date.now(),
  };
  launchData.mutinies = [mutinyRecord];
  launchData.state = 'vote'; // Re-opens vote for the seat!
  launchData.pendingVotes = {};
  launchData.stepStartedAt = Date.now();

  const publicLogCol = collection(db, `games/${gameId}/publicLog`);
  await addDoc(publicLogCol, {
    type: 'launch',
    text: `A mutiny was called against Seat ${targetSeatNumber}! ${unseatedPlayer.playerName} was dragged off the timber. The seat is contested anew by vote.`,
    round: gameData.round || 1,
    timestamp: serverTimestamp(),
  });

  await addPrivateLog(
    gameId,
    playerId,
    `You orchestrate a covert Mutiny against Seat ${targetSeatNumber} (-2 Stash).`,
    gameData.round || 1
  );

  await updateDoc(gameRef, {
    launchData,
    seats: launchData.seats,
  });

  return { success: true, message: `Mutiny executed against Seat ${targetSeatNumber}.` };
}

// Active Archetype Abilities Handler
export async function executeRoleAction(
  gameId: string,
  playerId: string,
  actionType: string,
  payload: any
) {
  const privRef = doc(db, `games/${gameId}/players/${playerId}/private`, 'profile');
  const privSnap = await getDoc(privRef);
  if (!privSnap.exists()) throw new Error('Player private profile not found.');
  const profile = privSnap.data() as PrivatePlayerProfile;

  const playerRef = doc(db, `games/${gameId}/players`, playerId);
  const playerSnap = await getDoc(playerRef);
  const playerData = playerSnap.data();

  if (actionType === 'prepper_stash') {
    if (profile.role !== 'PREPPER') throw new Error('Only the Prepper may convert stash supplies.');
    if (profile.stash < 2) throw new Error('At least 2 Stash is required to convert.');

    await updateDoc(privRef, {
      stash: profile.stash - 2,
    });

    return { success: true, message: 'Converted 2 Stash into 1 emergency Labor.' };
  }

  if (actionType === 'endorse') {
    if (profile.role !== 'INFLUENCER') throw new Error('Only the Influencer may endorse.');
    const targetId = payload?.targetId;
    if (!targetId) throw new Error('Target player required for endorsement.');

    const targetRef = doc(db, `games/${gameId}/players`, targetId);
    const targetSnap = await getDoc(targetRef);
    if (!targetSnap.exists()) throw new Error('Target castaway not found.');

    await updateDoc(playerRef, {
      reputation: (playerData?.reputation || 0) - 2,
    });
    await updateDoc(targetRef, {
      reputation: (targetSnap.data()?.reputation || 0) + 2,
    });

    const publicLogCol = collection(db, `games/${gameId}/publicLog`);
    await addDoc(publicLogCol, {
      type: 'role_action',
      text: `${playerData?.displayName} loudly and publicly endorsed ${targetSnap.data()?.displayName} (+2 Reputation transferred).`,
      timestamp: serverTimestamp(),
    });

    return { success: true, message: `Endorsed ${targetSnap.data()?.displayName} with +2 Reputation.` };
  }

  if (actionType === 'broker_deal') {
    if (profile.role !== 'BROKER') throw new Error('Only the Broker may broker deals.');
    const targetIdA = payload?.targetIdA;
    const targetIdB = payload?.targetIdB;
    if (!targetIdA || !targetIdB) throw new Error('Two players required for brokerage.');

    let skimmed = 0;
    for (const tid of [targetIdA, targetIdB]) {
      const tPrivRef = doc(db, `games/${gameId}/players/${tid}/private`, 'profile');
      const tSnap = await getDoc(tPrivRef);
      if (tSnap.exists()) {
        const tData = tSnap.data();
        if (tData.stash >= 1) {
          await updateDoc(tPrivRef, { stash: tData.stash - 1 });
          skimmed += 1;
        }
      }
    }

    await updateDoc(privRef, { stash: profile.stash + skimmed });
    return { success: true, message: `Deal brokered. Skimmed +${skimmed} Stash.` };
  }

  if (actionType === 'reveal_role') {
    await updateDoc(privRef, { roleRevealed: true });
    return { success: true };
  }

  return { success: true };
}

// ----------------------------------------------------
// ROUND 5 — SATIRE MODE: FOUNDING CONVENTION & CONSTITUTION
// ----------------------------------------------------

export async function submitFoundingVote(
  gameId: string,
  playerId: string,
  clauseId: ConstitutionClauseId,
  choice: 'A' | 'B'
) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();
  if (gameData.roundPhase !== 'founding') throw new Error('Not in Founding Phase.');

  const foundingData = gameData.foundingData || { drawnClauses: [], votes: {}, resolved: false };
  const playerVotes = foundingData.votes?.[playerId] || {};
  playerVotes[clauseId] = choice;

  foundingData.votes = {
    ...(foundingData.votes || {}),
    [playerId]: playerVotes,
  };

  await updateDoc(gameRef, { foundingData });
  return { success: true, votes: playerVotes };
}

export async function resolveFoundingPhase(gameId: string) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();

  const foundingData = gameData.foundingData;
  if (!foundingData) throw new Error('No founding data.');

  const drawn = foundingData.drawnClauses || [];
  const votes = foundingData.votes || {};

  const constitution: Constitution = {
    ledgerClause: 'public',
    captainClause: 'elected',
    voteClause: 'public',
    propertyClause: 'fair_game',
    laborClause: 'voluntary',
    blameClause: 'ceremonial',
  };

  const ratifiedSummary: string[] = [];

  for (const cid of drawn) {
    const def = CONSTITUTION_CLAUSES[cid as ConstitutionClauseId];
    if (!def) continue;

    let countA = 0;
    let countB = 0;

    for (const pId of Object.keys(votes)) {
      const v = votes[pId]?.[cid];
      if (v === 'A') countA++;
      else if (v === 'B') countB++;
    }

    const winningChoice: 'A' | 'B' = countA >= countB ? 'A' : 'B';
    const winningVal = winningChoice === 'A' ? def.optionA.value : def.optionB.value;
    const winningLabel = winningChoice === 'A' ? def.optionA.label : def.optionB.label;

    (constitution as any)[cid] = winningVal;
    ratifiedSummary.push(`${def.title}: ${winningLabel}`);
  }

  foundingData.resolved = true;

  const activeElection: ElectionData = {
    round: 1,
    stage: 'nomination',
    nominees: [],
    votes: {},
    stageClosesAt: Date.now() + 75000,
  };

  const publicLogCol = collection(db, `games/${gameId}/publicLog`);
  await addDoc(publicLogCol, {
    type: 'system',
    text: `CONSTITUTION RATIFIED: ${ratifiedSummary.join(' | ')}. The Gubernatorial Election is called!`,
    round: 1,
    timestamp: serverTimestamp(),
  });

  await updateDoc(gameRef, {
    constitution,
    foundingData,
    roundPhase: 'election',
    activeElection,
    gmNarration: 'The ink on the Constitution is wet; ambitious castaways now vie for the Governorship.',
  });

  return { success: true, constitution };
}

// ----------------------------------------------------
// ROUND 5 — SATIRE MODE: ELECTIONS & CAMPAIGN PROMISES
// ----------------------------------------------------

export async function nominateGovernor(
  gameId: string,
  playerId: string,
  promiseText: string
) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();

  if (gameData.roundPhase !== 'election') throw new Error('Not currently in Election Phase.');
  const election = gameData.activeElection as ElectionData;
  if (!election) throw new Error('No active election.');
  if (election.stage === 'resolved') throw new Error('Election has already concluded.');

  const privRef = doc(db, `games/${gameId}/players/${playerId}/private`, 'profile');
  const privSnap = await getDoc(privRef);
  const profile = privSnap.exists() ? privSnap.data() : { stash: 0 };
  const currentStash = profile.stash || 0;

  // Deduct 1 stash filing fee if available; permit grassroots filing if 0 stash
  if (currentStash > 0) {
    await updateDoc(privRef, { stash: currentStash - 1 });
  }

  const playerRef = doc(db, `games/${gameId}/players`, playerId);
  const playerSnap = await getDoc(playerRef);
  const playerName = playerSnap.data()?.displayName || 'A Castaway';

  const cleanPromise = promiseText.slice(0, 120);
  const parsedPromise = await parseCampaignPromise(cleanPromise);

  const cleanParsedPromise: any = {
    goal: parsedPromise.goal || 'unmeasurable',
    measurable: !!parsedPromise.measurable,
    type: parsedPromise.type || 'unmeasurable',
  };
  if (typeof parsedPromise.targetValue === 'number' && !isNaN(parsedPromise.targetValue)) {
    cleanParsedPromise.targetValue = parsedPromise.targetValue;
  }

  const newNominee: ElectionNominee = {
    playerId,
    playerName,
    promise: cleanPromise,
    parsedPromise: cleanParsedPromise,
    votesReceived: 0,
  };

  const nominees = [...(election.nominees || []).filter((n) => n.playerId !== playerId), newNominee];
  election.nominees = nominees;

  await updateDoc(gameRef, { activeElection: election });
  return { success: true, nominee: newNominee };
}

export async function advanceElectionStage(gameId: string, hostId: string, force: boolean = false) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();

  if (gameData.hostId !== hostId) throw new Error('Only the host can advance election stage.');
  const election = gameData.activeElection as ElectionData;
  if (!election) throw new Error('No active election.');

  const playersRef = collection(db, `games/${gameId}/players`);
  const playersSnap = await getDocs(playersRef);
  const playersList = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (election.stage === 'nomination') {
    // FIX-01: refuse to advance from 'nomination' → 'campaign' unless at least one nominee exists OR host passes force: true
    const nominees = election.nominees || [];
    if (nominees.length === 0 && !force) {
      throw new Error('No candidates have registered for the election yet. Awaiting nominees.');
    }
    election.stage = 'campaign';
    await updateDoc(gameRef, {
      activeElection: election,
      gmNarration: 'Candidates have made their sworn promises; the campaign floor is open to debate.',
    });
  } else if (election.stage === 'campaign') {
    // FIX-01: refuse to advance from 'campaign' → 'vote' unless nominees.length >= 1
    const nominees = election.nominees || [];
    if (nominees.length === 0) {
      throw new Error('The ballot is empty. At least one candidate must register to open voting.');
    }
    election.stage = 'vote';

    // If nominee list is empty when opening ballots, auto-populate all players so ballot is not empty
    let nomineesList = election.nominees ? [...election.nominees] : [];
    if (nomineesList.length === 0) {
      nomineesList = playersList.map((p) => ({
        playerId: p.id,
        playerName: (p as any).displayName || 'A Castaway',
        promise: 'Colony service, order, and honest labor.',
        parsedPromise: {
          goal: 'unmeasurable',
          measurable: false,
          type: 'unmeasurable',
        },
        votesReceived: 0,
      }));
      election.nominees = nomineesList;
    }

    // Auto-cast ballots for bots upon opening the ballot so that participation is visible
    if (nomineesList.length > 0) {
      const votes = { ...(election.votes || {}) };
      for (const p of playersList) {
        if ((p as any).isBot && !votes[p.id]) {
          const pick = nomineesList[Math.floor(Math.random() * nomineesList.length)];
          votes[p.id] = pick.playerId;
        }
      }
      election.votes = votes;
    }

    await updateDoc(gameRef, {
      activeElection: election,
      gmNarration: 'The ballots are distributed. Castaways must choose their Governor.',
    });
  }

  return { success: true, stage: election.stage };
}

export async function submitElectionVote(
  gameId: string,
  voterId: string,
  targetNomineeId: string
) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();

  if (gameData.roundPhase !== 'election') throw new Error('Not in Election Phase.');
  const election = gameData.activeElection as ElectionData;
  if (!election) throw new Error('No active election.');
  if (election.stage !== 'vote') throw new Error('Voting is not open yet.');

  // Validate target nominee is registered on the ballot or dynamically register as eligible candidate
  let nomineeExists = election.nominees?.some((n) => n.playerId === targetNomineeId);
  if (!nomineeExists) {
    const playersRef = collection(db, `games/${gameId}/players`);
    const playersSnap = await getDocs(playersRef);
    const targetPlayer = playersSnap.docs.find((d) => d.id === targetNomineeId);
    if (targetPlayer) {
      const pData = targetPlayer.data();
      const newNom: ElectionNominee = {
        playerId: targetNomineeId,
        playerName: pData.displayName || 'A Castaway',
        promise: 'Colony write-in candidate.',
        votesReceived: 0,
      };
      election.nominees = [...(election.nominees || []), newNom];
      nomineeExists = true;
    }
  }

  if (!nomineeExists) {
    throw new Error('Selected candidate is not on the ballot.');
  }

  const votes = { ...(election.votes || {}), [voterId]: targetNomineeId };
  election.votes = votes;

  await updateDoc(gameRef, { activeElection: election });
  return { success: true };
}

export async function resolveElection(gameId: string) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();

  const election = gameData.activeElection as ElectionData;
  if (!election) throw new Error('No active election.');

  const nominees = election.nominees || [];
  const votes = election.votes || {};

  const playersRef = collection(db, `games/${gameId}/players`);
  const playersSnap = await getDocs(playersRef);
  const playersList = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // FIX-02: Require that the number of non-bot votes cast is >= ceil(activePlayerCount / 2).
  // Do not silently auto-vote for bots to reach quorum.
  const activeNonBots = playersList.filter((p: any) => !p.isBot && p.status !== 'marooned' && p.status !== 'abandoned');
  const activeNonBotCount = activeNonBots.length;
  const nonBotVotesCast = Object.keys(votes).filter((voterId) => {
    const voter = playersList.find((p) => p.id === voterId);
    return voter && !(voter as any).isBot;
  }).length;

  const quorumRequired = Math.ceil(activeNonBotCount / 2);
  if (nonBotVotesCast < quorumRequired) {
    throw new Error('Not enough ballots cast to resolve the election.');
  }

  // Auto-vote for bots if needed
  for (const p of playersList) {
    if ((p as any).isBot && !votes[p.id]) {
      if (nominees.length > 0) {
        const pick = nominees[Math.floor(Math.random() * nominees.length)];
        votes[p.id] = pick.playerId;
      }
    }
  }

  // Tally votes
  const voteCounts: Record<string, number> = {};
  for (const nom of nominees) {
    voteCounts[nom.playerId] = 0;
  }
  for (const vTarget of Object.values(votes)) {
    if (voteCounts[vTarget] !== undefined) {
      voteCounts[vTarget] += 1;
    } else {
      voteCounts[vTarget] = 1;
      const targetP = playersList.find((p) => p.id === vTarget);
      nominees.push({
        playerId: vTarget,
        playerName: (targetP as any)?.displayName || 'A Castaway',
        promise: 'Colony write-in candidate.',
        votesReceived: 1,
      });
    }
  }

  // Refund candidates with 0 votes
  for (const nom of nominees) {
    if (voteCounts[nom.playerId] === 0) {
      const privRef = doc(db, `games/${gameId}/players/${nom.playerId}/private`, 'profile');
      const privSnap = await getDoc(privRef);
      if (privSnap.exists()) {
        const data = privSnap.data();
        await updateDoc(privRef, { stash: data.stash + 1 });
      }
    }
  }

  let winner: ElectionNominee | null = null;
  let maxVotes = -1;

  for (const nom of nominees) {
    const c = voteCounts[nom.playerId];
    if (c > maxVotes) {
      maxVotes = c;
      winner = nom;
    } else if (c === maxVotes && winner) {
      // Tie breaker: highest reputation
      const currentWinnerRep = (playersList.find((p) => p.id === winner!.playerId) as any)?.reputation || 0;
      const challengerRep = (playersList.find((p) => p.id === nom.playerId) as any)?.reputation || 0;
      if (challengerRep > currentWinnerRep) {
        winner = nom;
      }
    }
  }

  // If no candidates, pick the player with highest reputation
  if (!winner) {
    const sorted = [...playersList].sort((a: any, b: any) => (b.reputation || 0) - (a.reputation || 0));
    const fallback = sorted[0];
    winner = {
      playerId: fallback.id,
      playerName: (fallback as any).displayName || 'A Castaway',
      promise: 'I will maintain order.',
      parsedPromise: {
        goal: 'unmeasurable',
        measurable: false,
        type: 'unmeasurable',
      },
      votesReceived: 0,
    };
  }

  const governorData: GovernorData = {
    playerId: winner.playerId,
    playerName: winner.playerName,
    termStart: gameData.round || 1,
    termLength: 3,
    campaignPromise: winner.promise,
    parsedPromise: winner.parsedPromise || {
      goal: 'unmeasurable',
      measurable: false,
      type: 'unmeasurable',
    },
    pardonUsed: false,
    emergencyUsed: false,
    history: [],
  };

  const electionNarration = await generateElectionNarration({
    winnerName: winner.playerName,
    promise: winner.promise,
    voteCount: maxVotes > 0 ? maxVotes : 1,
    totalVoters: Object.keys(votes).length,
  });

  const publicLogCol = collection(db, `games/${gameId}/publicLog`);
  await addDoc(publicLogCol, {
    type: 'election',
    text: `INAUGURATION: ${winner.playerName} is declared Governor of the Isle. Mandate: "${winner.promise}".`,
    round: gameData.round || 1,
    timestamp: serverTimestamp(),
  });

  await updateDoc(gameRef, {
    governor: governorData,
    activeElection: null,
    roundPhase: 'scavenge',
    gmNarration: electionNarration,
  });

  return { success: true, governor: governorData };
}

// ----------------------------------------------------
// ROUND 5 — SATIRE MODE: IMPEACHMENT & GOVERNOR POWERS
// ----------------------------------------------------

export async function fileImpeachment(
  gameId: string,
  filerId: string
) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();

  if (!gameData.governor) throw new Error('There is no Governor in office.');
  if (gameData.governor.playerId === filerId) throw new Error('The Governor cannot impeach themselves.');
  if (gameData.impeachmentAttemptedThisTerm) throw new Error('Only one impeachment trial is allowed per Gubernatorial term.');

  const privRef = doc(db, `games/${gameId}/players/${filerId}/private`, 'profile');
  const privSnap = await getDoc(privRef);
  if (!privSnap.exists()) throw new Error('Player profile not found.');
  const profile = privSnap.data();

  if (profile.stash < 2) throw new Error('Filing Articles of Impeachment costs 2 Stash.');

  // Deduct 2 stash from filer
  await updateDoc(privRef, { stash: profile.stash - 2 });

  const filerRef = doc(db, `games/${gameId}/players`, filerId);
  const filerSnap = await getDoc(filerRef);
  const filerName = filerSnap.data()?.displayName || 'A Castaway';

  const activeImpeachment: ImpeachmentData = {
    filerId,
    filerName,
    governorId: gameData.governor.playerId,
    governorName: gameData.governor.playerName,
    round: gameData.round || 1,
    costPaid: 2,
    votes: { [filerId]: true }, // Filer auto-votes yes
    resolved: false,
  };

  const publicLogCol = collection(db, `games/${gameId}/publicLog`);
  await addDoc(publicLogCol, {
    type: 'impeachment',
    text: `ARTICLES OF IMPEACHMENT FILED: ${filerName} charges Governor ${gameData.governor.playerName} with high treason and embezzlement!`,
    round: gameData.round || 1,
    timestamp: serverTimestamp(),
  });

  await updateDoc(gameRef, {
    activeImpeachment,
    impeachmentAttemptedThisTerm: true,
    gmNarration: `The gavel strikes. ${filerName} has filed Articles of Impeachment against Governor ${gameData.governor.playerName}.`,
  });

  return { success: true, impeachment: activeImpeachment };
}

export async function voteImpeachment(
  gameId: string,
  voterId: string,
  inFavor: boolean
) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();

  const impeachment = gameData.activeImpeachment as ImpeachmentData;
  if (!impeachment || impeachment.resolved) throw new Error('No active impeachment inquiry.');

  if (voterId === impeachment.governorId) {
    throw new Error('The Governor cannot vote on their own impeachment.');
  }

  const votes = { ...(impeachment.votes || {}), [voterId]: inFavor };
  impeachment.votes = votes;

  await updateDoc(gameRef, { activeImpeachment: impeachment });
  return { success: true };
}

export async function resolveImpeachment(gameId: string) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();

  const impeachment = gameData.activeImpeachment as ImpeachmentData;
  if (!impeachment) throw new Error('No active impeachment.');

  const votes = impeachment.votes || {};
  const playersRef = collection(db, `games/${gameId}/players`);
  const playersSnap = await getDocs(playersRef);
  const playersList = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Auto-vote for bots
  for (const p of playersList) {
    if ((p as any).isBot && p.id !== impeachment.governorId && votes[p.id] === undefined) {
      votes[p.id] = Math.random() > 0.5;
    }
  }

  let inFavorCount = 0;
  let againstCount = 0;

  for (const v of Object.values(votes)) {
    if (v === true) inFavorCount++;
    else againstCount++;
  }

  const impeached = inFavorCount > againstCount;
  impeachment.resolved = true;
  impeachment.outcome = impeached ? 'impeached' : 'survived';

  const govRef = doc(db, `games/${gameId}/players`, impeachment.governorId);
  const govSnap = await getDoc(govRef);
  const filerRef = doc(db, `games/${gameId}/players`, impeachment.filerId);
  const filerSnap = await getDoc(filerRef);

  const publicLogCol = collection(db, `games/${gameId}/publicLog`);

  let narrationText = '';

  if (impeached) {
    // Governor loses 5 reputation, stripped of office
    if (govSnap.exists()) {
      await updateDoc(govRef, {
        reputation: (govSnap.data().reputation || 0) - 5,
      });
    }

    // Reveal secret embezzlement log to all!
    const embRef = collection(db, `games/${gameId}/embezzlementLog`);
    const embSnap = await getDocs(embRef);
    let totalEmbezzled = 0;
    embSnap.docs.forEach((d) => {
      const eData = d.data();
      if (eData.governorId === impeachment.governorId) {
        totalEmbezzled += eData.amount || 0;
      }
    });

    await addDoc(publicLogCol, {
      type: 'impeachment',
      text: `IMPEACHMENT CARRIED: Governor ${impeachment.governorName} was removed from office (-5 Rep). Embezzlement investigation discovered ${totalEmbezzled} stolen logs!`,
      round: gameData.round || 1,
      timestamp: serverTimestamp(),
    });

    narrationText = await generateImpeachmentNarration({
      governorName: impeachment.governorName,
      filerName: impeachment.filerName,
      impeached: true,
      votesFor: inFavorCount,
      votesAgainst: againstCount,
      totalEmbezzled,
    });

    // Strip office and trigger immediate election next round
    await updateDoc(gameRef, {
      governor: null,
      activeImpeachment: impeachment,
      gmNarration: narrationText,
    });
  } else {
    // Coup failed: Governor gains 3 rep, Filer loses 4 rep
    if (govSnap.exists()) {
      await updateDoc(govRef, {
        reputation: (govSnap.data().reputation || 0) + 3,
      });
    }
    if (filerSnap.exists()) {
      await updateDoc(filerRef, {
        reputation: (filerSnap.data().reputation || 0) - 4,
      });
    }

    await addDoc(publicLogCol, {
      type: 'impeachment',
      text: `IMPEACHMENT FAILED: Governor ${impeachment.governorName} was acquitted (+3 Rep). ${impeachment.filerName} is condemned for sedition (-4 Rep).`,
      round: gameData.round || 1,
      timestamp: serverTimestamp(),
    });

    narrationText = await generateImpeachmentNarration({
      governorName: impeachment.governorName,
      filerName: impeachment.filerName,
      impeached: false,
      votesFor: inFavorCount,
      votesAgainst: againstCount,
    });

    await updateDoc(gameRef, {
      activeImpeachment: impeachment,
      gmNarration: narrationText,
    });
  }

  return { success: true, outcome: impeachment.outcome };
}

export async function pardonGovernor(
  gameId: string,
  governorId: string,
  targetPlayerId: string
) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();

  const governor = gameData.governor as GovernorData;
  if (!governor || governor.playerId !== governorId) {
    throw new Error('Only the seated Governor can issue an Executive Pardon.');
  }
  if (governor.pardonUsed) throw new Error('Executive Pardon has already been used this term.');

  const privRef = doc(db, `games/${gameId}/players/${governorId}/private`, 'profile');
  const privSnap = await getDoc(privRef);
  if (!privSnap.exists()) throw new Error('Profile not found.');
  const profile = privSnap.data();

  if (profile.stash < 3) throw new Error('Executive Pardon costs 3 Stash.');

  await updateDoc(privRef, { stash: profile.stash - 3 });

  const targetRef = doc(db, `games/${gameId}/players`, targetPlayerId);
  const targetSnap = await getDoc(targetRef);
  if (!targetSnap.exists()) throw new Error('Target player not found.');

  await updateDoc(targetRef, {
    reputation: (targetSnap.data().reputation || 0) + 3,
  });

  governor.pardonUsed = true;

  const publicLogCol = collection(db, `games/${gameId}/publicLog`);
  await addDoc(publicLogCol, {
    type: 'governor_action',
    text: `EXECUTIVE PARDON: Governor ${governor.playerName} pardons ${targetSnap.data().displayName} (+3 Reputation restored).`,
    round: gameData.round || 1,
    timestamp: serverTimestamp(),
  });

  await updateDoc(gameRef, { governor });
  return { success: true, message: `Pardoned ${targetSnap.data().displayName}.` };
}

export async function emergencyVoteGovernor(
  gameId: string,
  governorId: string
) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();

  const governor = gameData.governor as GovernorData;
  if (!governor || governor.playerId !== governorId) {
    throw new Error('Only the seated Governor can invoke Emergency Powers.');
  }
  if (governor.emergencyUsed) throw new Error('Emergency Powers have already been invoked.');

  governor.emergencyUsed = true;

  const publicLogCol = collection(db, `games/${gameId}/publicLog`);
  await addDoc(publicLogCol, {
    type: 'governor_action',
    text: `EMERGENCY POWERS INVOKED: Governor ${governor.playerName} declares a State of Maritime Crisis.`,
    round: gameData.round || 1,
    timestamp: serverTimestamp(),
  });

  await updateDoc(gameRef, { governor });
  return { success: true, message: 'Emergency powers invoked.' };
}

export async function appointCaptainSeat(
  gameId: string,
  governorId: string,
  targetPlayerId: string
) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();

  if (gameData.governor?.playerId !== governorId) {
    throw new Error('Only the Governor may appoint the Captain\'s Seat.');
  }

  const launchData = gameData.launchData as LaunchData;
  if (!launchData || launchData.state !== 'captain') {
    throw new Error('Not currently in the Captain\'s Appointment step.');
  }

  const targetRef = doc(db, `games/${gameId}/players`, targetPlayerId);
  const targetSnap = await getDoc(targetRef);
  if (!targetSnap.exists()) throw new Error('Target player not found.');

  const seatNumber = (launchData.seats?.length || 0) + 1;
  const newSeat: RaftSeat = {
    seatNumber,
    playerId: targetPlayerId,
    playerName: targetSnap.data().displayName,
    tier: 'captain',
    source: `Appointed by Governor ${gameData.governor.playerName}`,
    claimedAt: Date.now(),
  };

  launchData.seats = [...(launchData.seats || []), newSeat];

  const publicLogCol = collection(db, `games/${gameId}/publicLog`);
  await addDoc(publicLogCol, {
    type: 'launch',
    text: `[ SEAT ${seatNumber} APPOINTED ] Governor ${gameData.governor.playerName} awards Seat ${seatNumber} to ${targetSnap.data().displayName}!`,
    round: gameData.round || 1,
    timestamp: serverTimestamp(),
  });

  await updateDoc(gameRef, {
    launchData,
    seats: launchData.seats,
  });

  return { success: true, seat: newSeat };
}

// ---------------------------------------------------------
// ROUND 7: THE ENDGAME IMPLEMENTATION
// ---------------------------------------------------------

/**
 * Builds the cold, leaked government file ASCII True Ledger
 */
function buildLeakedDocumentText(params: {
  gameId: string;
  roundsPlayed: number;
  outcome: string;
  players: any[];
  roundContributions: Record<string, Record<string, { true: number; claimed: number; gap: number }>>;
  trueTotals: Record<string, number>;
  claimedTotals: Record<string, number>;
  gaps: Record<string, number>;
  embezzlementRevealed: boolean;
  embezzlementRecords: EmbezzlementRecord[];
  islandEvents: Array<{ round: number; event: string; targets: string[]; accepted?: boolean; details?: string }>;
}): string {
  const pad = (str: string, len: number) => (str || '').padEnd(len, ' ').substring(0, len);
  const rpad = (str: string, len: number) => (str || '').padStart(len, ' ').substring(0, len);

  let doc = '';
  doc += '═══════════════════════════════════════════════════\n';
  doc += '              THE RAFT — FINAL ACCOUNTING\n';
  doc += `              Session: ${params.gameId}\n`;
  doc += `              Rounds played: ${params.roundsPlayed}\n`;
  doc += `              Outcome: ${params.outcome}\n`;
  doc += '═══════════════════════════════════════════════════\n\n';

  doc += 'ROUND-BY-ROUND LEDGER\n';
  doc += '─────────────────────\n';
  doc += `${pad('CASTAWAY', 20)} | ${rpad('TRUE', 8)} | ${rpad('CLAIM', 8)} | ${rpad('GAP', 8)}\n`;
  doc += '---------------------------------------------------\n';

  for (const p of params.players) {
    const t = params.trueTotals[p.id] || 0;
    const c = params.claimedTotals[p.id] || 0;
    const g = params.gaps[p.id] || 0;
    doc += `${pad(p.displayName, 20)} | ${rpad(t.toString(), 8)} | ${rpad(c.toString(), 8)} | ${rpad(g > 0 ? `+${g}` : g.toString(), 8)}\n`;
  }
  doc += '\n';

  doc += 'PER-ROUND AUDIT TRAIL\n';
  doc += '─────────────────────\n';
  for (let r = 1; r <= params.roundsPlayed; r++) {
    const roundData = params.roundContributions[r.toString()] || {};
    doc += `[ ROUND ${r} ]\n`;
    for (const p of params.players) {
      const sub = roundData[p.id] || { true: 0, claimed: 0, gap: 0 };
      doc += `  - ${pad(p.displayName, 16)}: True ${sub.true} | Claimed ${sub.claimed} (Gap: ${sub.gap >= 0 ? `+${sub.gap}` : sub.gap})\n`;
    }
  }
  doc += '\n';

  if (params.embezzlementRevealed && params.embezzlementRecords.length > 0) {
    doc += 'EMBEZZLEMENT REGISTRY (UNSEALED)\n';
    doc += '────────────────────────────────\n';
    for (const rec of params.embezzlementRecords) {
      doc += `  - Round ${rec.round}: Governor ${rec.governorName} skimmed ${rec.amount} Stash (${rec.reason || 'General Surcharge'})\n`;
    }
    doc += '\n';
  } else if (!params.embezzlementRevealed && params.embezzlementRecords.length > 0) {
    doc += 'EMBEZZLEMENT REGISTRY: [SEALED BY EXECUTIVE PRIVILEGE]\n\n';
  }

  if (params.islandEvents.length > 0) {
    doc += 'ISLAND PRESSURE & ANOMALIES\n';
    doc += '───────────────────────────\n';
    for (const ev of params.islandEvents) {
      doc += `  - Round ${ev.round}: ${ev.event} (Targeted: ${ev.targets.join(', ') || 'Colony'})\n`;
    }
    doc += '\n';
  }

  doc += '═══════════════════════════════════════════════════\n';
  doc += 'END OF ARCHIVAL RECORD. ENTERED INTO PERMANENCE.\n';
  doc += '═══════════════════════════════════════════════════\n';

  return doc;
}

/**
 * Triggers the Endgame sequence
 */
export async function triggerEndgame(
  gameId: string,
  triggerReason: EndgameTriggerReason = 'manual'
) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();

  // Fetch all players
  const playersCol = collection(db, `games/${gameId}/players`);
  const playersSnap = await getDocs(playersCol);
  const players = playersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

  // Fetch private profiles for true stashes and roles
  const privateProfiles: Record<string, PrivatePlayerProfile> = {};
  for (const p of players) {
    const privRef = doc(db, `games/${gameId}/players/${p.id}/private`, 'profile');
    const privSnap = await getDoc(privRef);
    if (privSnap.exists()) {
      privateProfiles[p.id] = privSnap.data() as PrivatePlayerProfile;
    }
  }

  // Compile round by round true vs claimed labor
  const totalRounds = Math.max(1, gameData.round || 1);
  const trueTotals: Record<string, number> = {};
  const claimedTotals: Record<string, number> = {};
  const gaps: Record<string, number> = {};
  const roundContributions: Record<string, Record<string, { true: number; claimed: number; gap: number }>> = {};
  const cardsPlayedCount: Record<string, number> = {};

  for (const p of players) {
    trueTotals[p.id] = 0;
    claimedTotals[p.id] = 0;
    gaps[p.id] = 0;
    cardsPlayedCount[p.id] = 0;
  }

  for (let r = 1; r <= totalRounds; r++) {
    roundContributions[r.toString()] = {};
    const roundRef = doc(db, `games/${gameId}/rounds`, r.toString());
    const roundSnap = await getDoc(roundRef);
    if (roundSnap.exists()) {
      const rData = roundSnap.data();
      const submissions = rData.submissions || {};
      const cardsPlayed = rData.cardsPlayed || [];

      for (const card of cardsPlayed) {
        if (card.playerId && cardsPlayedCount[card.playerId] !== undefined) {
          cardsPlayedCount[card.playerId] += 1;
        }
      }

      for (const p of players) {
        const sub = submissions[p.id];
        const trueL = sub ? (sub.labor || 0) : 0;
        const claimedL = sub ? (sub.claimedLabor !== undefined ? sub.claimedLabor : sub.labor || 0) : 0;
        const gap = claimedL - trueL;

        roundContributions[r.toString()][p.id] = { true: trueL, claimed: claimedL, gap };
        trueTotals[p.id] = (trueTotals[p.id] || 0) + trueL;
        claimedTotals[p.id] = (claimedTotals[p.id] || 0) + claimedL;
        gaps[p.id] = (gaps[p.id] || 0) + gap;
      }
    }
  }

  const impeachmentSucceeded = Boolean(gameData.lastImpeachedGovernorId);
  const embezzlementRecords: EmbezzlementRecord[] = gameData.embezzlementLog || [];

  // Island events from publicLog
  const publicLogCol = collection(db, `games/${gameId}/publicLog`);
  const logSnap = await getDocs(publicLogCol);
  const islandEvents: Array<{ round: number; event: string; targets: string[]; accepted?: boolean; details?: string }> = [];

  for (const d of logSnap.docs) {
    const data = d.data();
    if (data.type === 'island' || data.type === 'island_turn' || data.type === 'offer' || data.type === 'temptation') {
      islandEvents.push({
        round: data.round || 1,
        event: data.text || 'Island Event',
        targets: data.targets || [],
        accepted: data.accepted,
        details: data.details,
      });
    }
  }

  // Determine fates
  const launchData: LaunchData | undefined = gameData.launchData;
  const seatedIds = new Set((launchData?.seats || []).map(s => s.playerId));
  const drownedIds = new Set(launchData?.drownedPlayerIds || []);

  const playerFates: Record<string, 'ESCAPED' | 'LEFT BEHIND' | 'DROWNED' | 'SOLO ESCAPE'> = {};
  for (const p of players) {
    if (seatedIds.has(p.id)) {
      playerFates[p.id] = 'ESCAPED';
    } else if (drownedIds.has(p.id) || p.isDrowned) {
      playerFates[p.id] = 'DROWNED';
    } else if (p.soloEscape || (triggerReason === 'offer_accepted' && p.acceptedOffer)) {
      playerFates[p.id] = 'SOLO ESCAPE';
    } else {
      playerFates[p.id] = 'LEFT BEHIND';
    }
  }

  // Sort players in reverse contribution order (lowest true Labor first)
  const sortedPlayers = [...players].sort((a, b) => {
    const laborDiff = (trueTotals[a.id] || 0) - (trueTotals[b.id] || 0);
    if (laborDiff !== 0) return laborDiff;
    return (gaps[b.id] || 0) - (gaps[a.id] || 0);
  });

  // Generate reveals with Gemini narration
  const reveals: EndgameRevealItem[] = [];
  for (let idx = 0; idx < sortedPlayers.length; idx++) {
    const p = sortedPlayers[idx];
    const prof = privateProfiles[p.id];
    const role = prof?.role || 'ORDINARY_PERSON';
    const trueL = trueTotals[p.id] || 0;
    const claimL = claimedTotals[p.id] || 0;
    const gap = gaps[p.id] || 0;
    const stash = prof?.stash ?? p.stash ?? 0;
    const rep = p.reputation || 0;
    const fate = playerFates[p.id] || 'LEFT BEHIND';
    const cardsPlayed = cardsPlayedCount[p.id] || 0;

    let narration = '';
    try {
      narration = await generateEndgameAccountingNarration({
        displayName: p.displayName,
        role,
        gap,
        trueLabor: trueL,
        claimedLabor: claimL,
        stash,
        reputation: rep,
        fate,
        cardsPlayedCount: cardsPlayed,
      });
    } catch {
      narration = `${p.displayName} withheld ${gap} labor beneath an assumed guise, concluding their passage as ${fate}.`;
    }

    reveals.push({
      playerId: p.id,
      playerName: p.displayName,
      order: idx,
      role,
      trueLabor: trueL,
      claimedLabor: claimL,
      gap,
      stash,
      reputation: rep,
      cardsPlayedCount: cardsPlayed,
      seatStatus: fate,
      narration,
    });
  }

  let outcomeStr = 'STRANDED';
  if (triggerReason === 'launch' || (launchData?.seats && launchData.seats.length > 0)) {
    outcomeStr = 'ESCAPED';
  } else if (triggerReason === 'offer_accepted') {
    outcomeStr = 'SOLO';
  } else if (triggerReason === 'attrition') {
    outcomeStr = 'ATTRITION';
  }

  const rawDocumentText = buildLeakedDocumentText({
    gameId,
    roundsPlayed: totalRounds,
    outcome: outcomeStr,
    players,
    roundContributions,
    trueTotals,
    claimedTotals,
    gaps,
    embezzlementRevealed: impeachmentSucceeded,
    embezzlementRecords,
    islandEvents,
  });

  const accounting: EndgameAccounting = {
    trueTotals,
    claimedTotals,
    gaps,
    roundContributions,
    embezzlementRevealed: impeachmentSucceeded,
    embezzlementRecords,
    islandEvents,
    rawDocumentText,
  };

  const endgameData: EndgameData = {
    step: 'accounting',
    triggeredAt: Date.now(),
    triggerReason,
    accounting,
    confessions: {},
    reveals,
    currentRevealIndex: 0,
    blameVotes: [],
  };

  // Write initial scorecards
  for (const p of players) {
    const scRef = doc(db, `games/${gameId}/scorecard`, p.id);
    const prof = privateProfiles[p.id];
    const scorecard: PlayerScorecard = {
      playerId: p.id,
      displayName: p.displayName,
      escaped: playerFates[p.id] === 'ESCAPED' || playerFates[p.id] === 'SOLO ESCAPE',
      fate: playerFates[p.id].toLowerCase().replace(' ', '_') as any,
      cumulativeGap: gaps[p.id] || 0,
      finalReputation: p.reputation || 0,
      finalStash: prof?.stash ?? p.stash ?? 0,
      role: prof?.role || 'ORDINARY_PERSON',
      markedByTable: false,
    };
    await setDoc(scRef, scorecard);
  }

  await addDoc(publicLogCol, {
    type: 'endgame',
    text: `[ THE RECKONING COMMENCES ] The island closes the ledger. Reason: ${triggerReason}.`,
    round: totalRounds,
    timestamp: serverTimestamp(),
  });

  await updateDoc(gameRef, {
    roundPhase: 'endgame',
    status: 'ended',
    endgame: endgameData,
  });

  return { success: true, endgame: endgameData };
}

/**
 * Submit private confession (Step B)
 */
export async function submitEndgameConfession(
  gameId: string,
  playerId: string,
  rawText: string
) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();

  const endgame = gameData.endgame as EndgameData;
  if (!endgame || endgame.step !== 'confession') {
    throw new Error('Confessions are not currently open.');
  }

  const text = (rawText || '').trim().substring(0, 200) || 'They said nothing.';
  endgame.confessions = {
    ...(endgame.confessions || {}),
    [playerId]: text,
  };

  // Update confession in reveals if present
  if (endgame.reveals) {
    for (const r of endgame.reveals) {
      if (r.playerId === playerId) {
        r.confession = text;
      }
    }
  }

  // Update scorecard
  const scRef = doc(db, `games/${gameId}/scorecard`, playerId);
  await updateDoc(scRef, { confession: text }).catch(() => {});

  await updateDoc(gameRef, { endgame });
  return { success: true, text };
}

/**
 * Advance reveal beat in Step C
 */
export async function advanceRevealBeat(gameId: string) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();

  const endgame = gameData.endgame as EndgameData;
  if (!endgame || endgame.step !== 'reveal') {
    throw new Error('Not currently in Truth Reveal step.');
  }

  const currIdx = endgame.currentRevealIndex || 0;
  const totalReveals = endgame.reveals?.length || 0;

  if (currIdx < totalReveals - 1) {
    endgame.currentRevealIndex = currIdx + 1;
    await updateDoc(gameRef, { endgame });
    return { success: true, step: 'reveal', currentRevealIndex: endgame.currentRevealIndex };
  } else {
    // All reveals finished! Advance to Blame Vote (or direct to Verdict if solo)
    if (totalReveals <= 1) {
      return resolveBlameVote(gameId);
    } else {
      endgame.step = 'blame_vote';
      endgame.stepStartedAt = Date.now();
      endgame.stepClosesAt = Date.now() + 90000;
      await updateDoc(gameRef, { endgame });
      return { success: true, step: 'blame_vote' };
    }
  }
}

/**
 * Submit blame vote in Step D
 */
export async function submitBlameVote(
  gameId: string,
  voterId: string,
  targetId: string
) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();

  const endgame = gameData.endgame as EndgameData;
  if (!endgame || endgame.step !== 'blame_vote') {
    throw new Error('Blame voting is not currently active.');
  }

  if (voterId === targetId) {
    throw new Error('You cannot cast a blame ballot for yourself.');
  }

  const voterRef = doc(db, `games/${gameId}/players`, voterId);
  const voterSnap = await getDoc(voterRef);
  const voterName = voterSnap.data()?.displayName || 'Unknown';

  // Determine voter weight:
  // Classic/Satire: 1
  // Island Mode: +1 for no temptation, +2 for no offer
  let weight = 1;
  if (gameData.mode === 'island') {
    const voterPrivRef = doc(db, `games/${gameId}/players/${voterId}/private`, 'profile');
    const vPrivSnap = await getDoc(voterPrivRef);
    const vProf = vPrivSnap.data() as PrivatePlayerProfile | undefined;
    if (vProf && !vProf.temptationAccepted) {
      weight += 1;
    }
    if (vProf && !vProf.offerAccepted) {
      weight += 2;
    }
  }

  const existingVotes = endgame.blameVotes || [];
  const otherVotes = existingVotes.filter(v => v.voterId !== voterId);
  const newVote: BlameVote = {
    voterId,
    voterName,
    targetId,
    weight,
    timestamp: Date.now(),
  };

  endgame.blameVotes = [...otherVotes, newVote];
  await updateDoc(gameRef, { endgame });

  return { success: true, vote: newVote };
}

/**
 * Resolve Blame Vote & Generate Verdict / Epitaph (Step E)
 */
export async function resolveBlameVote(gameId: string) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();

  const endgame = gameData.endgame as EndgameData;
  if (!endgame) throw new Error('Endgame data not found.');

  const playersCol = collection(db, `games/${gameId}/players`);
  const playersSnap = await getDocs(playersCol);
  const players = playersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
  const playerMap = new Map(players.map(p => [p.id, p]));

  const blameVotes = endgame.blameVotes || [];
  const tally: Record<string, number> = {};

  for (const v of blameVotes) {
    tally[v.targetId] = (tally[v.targetId] || 0) + (v.weight || 1);
  }

  // If solo mode or no votes, default to highest liar
  let maxScore = -1;
  let topCandidates: string[] = [];

  for (const p of players) {
    const score = tally[p.id] || 0;
    if (score > maxScore) {
      maxScore = score;
      topCandidates = [p.id];
    } else if (score === maxScore && maxScore > 0) {
      topCandidates.push(p.id);
    }
  }

  // Tie-breaker: highest cumulative gap
  if (topCandidates.length > 1) {
    let highestGap = -Infinity;
    let gapWinners: string[] = [];
    for (const cid of topCandidates) {
      const g = endgame.accounting?.gaps?.[cid] || 0;
      if (g > highestGap) {
        highestGap = g;
        gapWinners = [cid];
      } else if (g === highestGap) {
        gapWinners.push(cid);
      }
    }
    topCandidates = gapWinners;
  }

  // If still empty (e.g. 0 votes), take player with highest gap
  if (topCandidates.length === 0) {
    const sortedByGap = [...players].sort((a, b) => (endgame.accounting?.gaps?.[b.id] || 0) - (endgame.accounting?.gaps?.[a.id] || 0));
    topCandidates = [sortedByGap[0]?.id || players[0].id];
  }

  const primaryGuiltyId = topCandidates[0];
  const primaryGuiltyPlayer = playerMap.get(primaryGuiltyId);
  const guiltyName = primaryGuiltyPlayer?.displayName || 'Unknown';
  const guiltyNames = topCandidates.map(id => playerMap.get(id)?.displayName || id);
  const isTie = topCandidates.length > 1;

  const cumulativeGap = endgame.accounting?.gaps?.[primaryGuiltyId] || 0;
  const constitution = gameData.constitution as Constitution | undefined;
  const isBinding = constitution?.blameClause === 'binding';

  // Apply reputation penalty & scorecard mark
  for (const cid of topCandidates) {
    const p = playerMap.get(cid);
    if (p) {
      const pRef = doc(db, `games/${gameId}/players`, cid);
      await updateDoc(pRef, {
        reputation: (p.reputation || 0) - 5,
      });

      const scRef = doc(db, `games/${gameId}/scorecard`, cid);
      await updateDoc(scRef, {
        finalReputation: (p.reputation || 0) - 5,
        markedByTable: isBinding,
      }).catch(() => {});
    }
  }

  // Generate Verdict (Gemini Call 2)
  let verdictText = '';
  try {
    verdictText = await generateEndgameVerdict({
      guiltyName,
      cumulativeGap,
      voteCount: tally[primaryGuiltyId] || 0,
      blameClause: constitution?.blameClause,
      isTie,
      guiltyNames,
    });
  } catch {
    verdictText = `The table concluded its inquiry with the singular naming of ${guiltyName}. Their cumulative omission of ${cumulativeGap} labor was judged irreconcilable with the expedition. The finding is entered permanently into the record.`;
  }

  // Generate Epitaph (Gemini Call 3)
  const seatedCount = (gameData.launchData?.seats || []).length;
  const drownedCount = (gameData.launchData?.drownedPlayerIds || []).length;
  const leftBehindCount = Math.max(0, players.length - seatedCount - drownedCount);

  let epitaphText = '';
  try {
    epitaphText = await generateEndgameEpitaph({
      roundsPlayed: gameData.round || 1,
      outcome: seatedCount > 0 ? 'ESCAPED' : 'STRANDED',
      escapedCount: seatedCount,
      leftBehindCount,
      drownedCount,
      guiltyName,
      mode: gameData.mode,
    });
  } catch {
    epitaphText = `The Colony of Driftwood dissolved upon the shoreline after ${gameData.round || 1} rounds of negotiated survival. They built what could be agreed upon, and abandoned what could not. The cold ocean makes no distinction between the honest and the clever.`;
  }

  // Island Mode sentence
  let guiltySentence: string | undefined;
  if (gameData.mode === 'island') {
    try {
      guiltySentence = await generateIslandGuiltySentence({ guiltyName });
    } catch {
      guiltySentence = `The island seals the passage of ${guiltyName}, leaving their name to wash against the cold rock forever.`;
    }
  }

  endgame.step = 'verdict';
  endgame.guiltyId = primaryGuiltyId;
  endgame.guiltyName = guiltyName;
  endgame.guiltyIds = topCandidates;
  endgame.guiltyNames = guiltyNames;
  endgame.isTie = isTie;
  endgame.guiltySentence = guiltySentence;
  endgame.verdict = verdictText;
  endgame.epitaph = epitaphText;
  endgame.resolvedAt = Date.now();

  const publicLogCol = collection(db, `games/${gameId}/publicLog`);
  await addDoc(publicLogCol, {
    type: 'verdict',
    text: `[ THE VERDICT RENDERED ] The table has declared ${guiltyNames.join(' & ')} GUILTY.`,
    round: gameData.round || 1,
    timestamp: serverTimestamp(),
  });

  await updateDoc(gameRef, {
    endgame,
  });

  return { success: true, endgame };
}

/**
 * Advance Endgame step (Accounting -> Confession -> Reveal -> Blame Vote -> Verdict)
 */
export async function advanceEndgameStep(gameId: string, hostId?: string, force: boolean = false) {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const gameData = gameSnap.data();

  const endgame = gameData.endgame as EndgameData;
  if (!endgame) throw new Error('No endgame state found.');

  if (endgame.step === 'accounting') {
    endgame.step = 'confession';
    endgame.stepStartedAt = Date.now();
    endgame.stepClosesAt = Date.now() + 180000;
    await updateDoc(gameRef, { endgame });
    return { success: true, step: 'confession' };
  }

  if (endgame.step === 'confession') {
    const playersCol = collection(db, `games/${gameId}/players`);
    const playersSnap = await getDocs(playersCol);
    const playersList = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // FIX-03: If fewer than half of non-bot players have submitted a confession, refuse unless force is true
    const nonBots = playersList.filter((p: any) => !p.isBot && p.status !== 'marooned' && p.status !== 'abandoned');
    const totalNonBots = nonBots.length;
    const currentConfessions = endgame.confessions || {};
    const submissionsByNonBots = nonBots.filter((p: any) => currentConfessions[p.id] && currentConfessions[p.id] !== 'They said nothing.').length;

    const confessionQuorum = Math.ceil(totalNonBots / 2);
    if (submissionsByNonBots < confessionQuorum && !force) {
      throw new Error('Not enough players have submitted confessions yet. Awaiting participants.');
    }

    // Fill in default confessions for those who submitted nothing
    for (const d of playersSnap.docs) {
      if (!endgame.confessions[d.id]) {
        endgame.confessions[d.id] = 'They said nothing.';
      }
    }

    if (endgame.reveals) {
      for (const r of endgame.reveals) {
        r.confession = endgame.confessions[r.playerId] || 'They said nothing.';
      }
    }

    // Unseal embezzlement log in Step C as per specification
    if (endgame.accounting) {
      endgame.accounting.embezzlementRevealed = true;
    }

    endgame.step = 'reveal';
    endgame.currentRevealIndex = 0;
    await updateDoc(gameRef, { endgame });
    return { success: true, step: 'reveal' };
  }

  if (endgame.step === 'reveal') {
    if (endgame.reveals && endgame.reveals.length <= 1) {
      return resolveBlameVote(gameId);
    } else {
      endgame.step = 'blame_vote';
      endgame.stepStartedAt = Date.now();
      endgame.stepClosesAt = Date.now() + 90000;
      await updateDoc(gameRef, { endgame });
      return { success: true, step: 'blame_vote' };
    }
  }

  if (endgame.step === 'blame_vote') {
    return resolveBlameVote(gameId);
  }

  return { success: true, step: endgame.step };
}

