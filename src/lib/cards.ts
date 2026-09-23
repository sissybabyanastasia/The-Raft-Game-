import type { SchemeCardId, SchemeCardDefinition } from '../types.js';

export const SCHEME_CARDS: Record<SchemeCardId, SchemeCardDefinition> = {
  forged_ledger: {
    id: 'forged_ledger',
    name: 'Forged Ledger',
    timing: 'scavenge',
    costStash: 0,
    costEnergy: 0,
    effect: 'Change your claimed Labor by +2 for this round. Cannot exceed +2 total per round.',
    flavor: 'A drop of seawater blurs a 1 into a 3 with remarkable legibility.',
    requiresTarget: false,
    isPublic: false,
  },
  bribe: {
    id: 'bribe',
    name: 'Bribe',
    timing: 'resolution',
    costStash: 3,
    costEnergy: 0,
    effect: "Force one target player's vote to match yours on the next vote resolution. Revealed to target only.",
    flavor: 'Tinned peaches speak louder than moral imperatives.',
    requiresTarget: true,
    isPublic: false,
  },
  whisper_campaign: {
    id: 'whisper_campaign',
    name: 'Whisper Campaign',
    timing: 'scavenge',
    costStash: 0,
    costEnergy: 0,
    effect: "Reduce one target player's reputation by 3. Resolution is private — target does not know who played it.",
    flavor: 'A quiet rumor planted behind the drying rack grows teeth by sunset.',
    requiresTarget: true,
    isPublic: false,
  },
  sabotage: {
    id: 'sabotage',
    name: 'Sabotage',
    timing: 'resolution',
    costStash: 0,
    costEnergy: 0,
    effect: "Remove 2 Labor from the raft's true total this round. The public Ledger is unchanged.",
    flavor: 'A notched lashing gives way under the second breaker.',
    requiresTarget: false,
    isPublic: false,
  },
  smokescreen: {
    id: 'smokescreen',
    name: 'Smokescreen',
    timing: 'scavenge',
    costStash: 0,
    costEnergy: 0,
    effect: 'Redirect the next audit aimed at you to a random other player. If un-audited, the card is wasted.',
    flavor: "Pointing dramatically at another man's shadow is timeless survival craft.",
    requiresTarget: false,
    isPublic: false,
  },
  saint: {
    id: 'saint',
    name: 'Saint',
    timing: 'scavenge',
    costStash: 0,
    costEnergy: 0,
    effect: 'Publicly reveal true Labor >= claimed Labor. Gain +5 reputation and mark entry verified.',
    flavor: 'True martyrdom requires an audience and meticulous documentation.',
    requiresTarget: false,
    isPublic: true,
  },
  ghost_write: {
    id: 'ghost_write',
    name: 'Ghost Write',
    timing: 'scavenge',
    costStash: 0,
    costEnergy: 0,
    effect: "Copy another player's Ledger entry as your own claimed number for this round.",
    flavor: 'If Silas claimed four logs, then surely you carried four as well.',
    requiresTarget: true,
    isPublic: false,
  },
  mutiny: {
    id: 'mutiny',
    name: 'Mutiny',
    timing: 'resolution',
    costStash: 2,
    costEnergy: 0,
    effect: 'Force a re-vote on one filled raft seat (only active once seat assignment begins in Round 4+).',
    flavor: 'A boat with too many captains needs a very sudden change of heading.',
    requiresTarget: false,
    isPublic: false,
  },
};

export const ALL_SCHEME_CARD_IDS: SchemeCardId[] = [
  'forged_ledger',
  'bribe',
  'whisper_campaign',
  'sabotage',
  'smokescreen',
  'saint',
  'ghost_write',
  'mutiny',
];

export function createShuffledDeck(cardCopies = 3): SchemeCardId[] {
  const deck: SchemeCardId[] = [];
  for (let i = 0; i < cardCopies; i++) {
    deck.push(...ALL_SCHEME_CARD_IDS);
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// FIX-12: Single source of truth for Saint eligibility.
export function canPlaySaint(params: {
  trueLabor: number;
  claimedLabor: number;
}): boolean {
  return params.trueLabor >= params.claimedLabor;
}
