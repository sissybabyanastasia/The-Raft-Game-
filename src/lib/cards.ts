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
    minStage: 1,
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
    minStage: 3,
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
    minStage: 1,
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
    minStage: 1,
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
    minStage: 1,
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
    minStage: 1,
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
    minStage: 2,
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
    minStage: 4,
  },
  propaganda: {
    id: 'propaganda',
    name: 'Propaganda',
    timing: 'scavenge',
    costStash: 0,
    costEnergy: 0,
    effect: 'Launch a campaign of self-aggrandizement. Gain +3 reputation publicly.',
    flavor: 'A well-crafted story makes a lazy afternoon look like heroic watchkeeping.',
    requiresTarget: false,
    isPublic: true,
    minStage: 1,
  },
  blackmail: {
    id: 'blackmail',
    name: 'Blackmail',
    timing: 'resolution',
    costStash: 1,
    costEnergy: 0,
    effect: 'Expose a dark secret. Steal 1 Stash from target player. If they have none, they lose 3 reputation instead.',
    flavor: 'The only thing worse than a wet hammock is a leaked ledger entry.',
    requiresTarget: true,
    isPublic: false,
    minStage: 2,
  },
  black_market: {
    id: 'black_market',
    name: 'Black Market',
    timing: 'scavenge',
    costStash: 1,
    costEnergy: 0,
    effect: 'Barter with secretive contacts. Instantly draw 2 new Scheme cards.',
    flavor: 'A stash coin passed in the shadow of the palm trees buys many favors.',
    requiresTarget: false,
    isPublic: false,
    minStage: 1,
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
  'propaganda',
  'blackmail',
  'black_market',
];

export const STAGE_CARDS: Record<number, SchemeCardId[]> = {
  1: [
    'forged_ledger',
    'whisper_campaign',
    'propaganda',
    'smokescreen',
    'saint',
    'sabotage',
    'black_market',
  ],
  2: [
    'forged_ledger',
    'whisper_campaign',
    'propaganda',
    'smokescreen',
    'saint',
    'sabotage',
    'black_market',
    'ghost_write',
    'blackmail',
  ],
  3: [
    'forged_ledger',
    'whisper_campaign',
    'propaganda',
    'smokescreen',
    'saint',
    'sabotage',
    'black_market',
    'ghost_write',
    'blackmail',
    'bribe',
  ],
  4: [
    'forged_ledger',
    'whisper_campaign',
    'propaganda',
    'smokescreen',
    'saint',
    'sabotage',
    'black_market',
    'ghost_write',
    'blackmail',
    'bribe',
    'mutiny',
  ],
};

export function createShuffledDeck(stage: number = 1, cardCopies = 3): SchemeCardId[] {
  const allowedPool = STAGE_CARDS[Math.min(4, Math.max(1, stage))] || STAGE_CARDS[1];
  const deck: SchemeCardId[] = [];
  for (let i = 0; i < cardCopies; i++) {
    deck.push(...allowedPool);
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
