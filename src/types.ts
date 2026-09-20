export type RaftStage = 'frame' | 'deck' | 'sail' | 'provisions';

export interface RaftProgress {
  frame: number;
  deck: number;
  sail: number;
  provisions: number;
}

export type GameStatus = 'lobby' | 'active' | 'ended';
export type RoundPhase = 'founding' | 'election' | 'scavenge' | 'resolution' | 'ledger' | 'launch' | 'postlaunch' | 'endgame';
export type LaunchState = 'roll_call' | 'provisioner' | 'captain' | 'vote' | 'buyout' | 'swim' | 'done';
export type GameMode = 'classic' | 'satire' | 'island';

export type ConstitutionClauseId =
  | 'ledgerClause'
  | 'captainClause'
  | 'voteClause'
  | 'propertyClause'
  | 'laborClause'
  | 'blameClause';

export interface ConstitutionClauseDef {
  id: ConstitutionClauseId;
  title: string;
  optionA: { label: string; value: string; desc: string };
  optionB: { label: string; value: string; desc: string };
}

export interface Constitution {
  ledgerClause?: 'public' | 'private';
  captainClause?: 'elected' | 'lifetime';
  voteClause?: 'public' | 'anonymous';
  propertyClause?: 'protected' | 'fair_game';
  laborClause?: 'voluntary' | 'mandatory';
  blameClause?: 'binding' | 'ceremonial';
}

export interface FoundingData {
  drawnClauses: ConstitutionClauseId[];
  votes: Record<string, Record<string, 'A' | 'B'>>; // voterId -> clauseId -> 'A' | 'B'
  resolved: boolean;
}

export interface GovernorData {
  playerId: string;
  playerName: string;
  termStart: number;
  termLength: number;
  campaignPromise: string;
  parsedPromise?: any;
  parsedGoal?: {
    goal: string;
    measurable: boolean;
    type?: string;
    targetValue?: number;
  };
  promiseStatus?: 'tracking' | 'kept' | 'broken' | 'unmeasurable';
  pardonUsed: boolean;
  emergencyUsed: boolean;
  clauseProposed?: boolean;
  embezzledThisTerm?: number;
  history?: any[];
}

export interface EmbezzlementRecord {
  governorId: string;
  governorName: string;
  round: number;
  amount: number;
  source?: string;
  reason?: string;
  discovered?: boolean;
  revealed?: boolean;
  timestamp?: number;
}

export interface ElectionNominee {
  playerId: string;
  playerName: string;
  promise: string;
  parsedPromise?: any;
  votesReceived?: number;
}

export interface ElectionData {
  id?: string;
  round: number;
  stage: 'nomination' | 'campaign' | 'vote' | 'resolved';
  nominees: ElectionNominee[];
  votes: Record<string, string>; // voterId -> nomineePlayerId
  winnerId?: string;
  winnerName?: string;
  stageClosesAt?: number;
  resolvedAt?: any;
}

export interface ImpeachmentData {
  id?: string;
  round: number;
  filerId: string;
  filerName: string;
  governorId: string;
  governorName: string;
  costPaid?: number;
  votes: Record<string, boolean>; // voterId -> inFavor (true = impeach, false = acquit)
  resolved: boolean;
  outcome?: 'impeached' | 'survived';
  embezzledTotal?: number;
  resolvedAt?: any;
}

export interface RaftSeat {
  seatNumber: number;
  playerId: string;
  playerName: string;
  tier?: 'captain' | 'provisioner' | 'elected' | 'buyout' | 'swimmer';
  method?: 'captain' | 'provisioner' | 'vote' | 'buyout' | 'swim';
  source?: string;
  claimedAt?: number;
}

export interface LaunchVoteRecord {
  voterId: string;
  voterName: string;
  targetId: string;
  targetName: string;
  weight: number;
  voterReputation?: number;
  timestamp?: number;
}

export interface LaunchBuyoutRecord {
  playerId: string;
  playerName: string;
  amount: number;
  seatWon: boolean;
  seatNumber?: number;
  timestamp?: number;
}

export interface LaunchSwimRecord {
  playerId: string;
  playerName: string;
  roll: number;
  energyBonus: number;
  totalScore: number;
  seatWon: boolean;
  seatNumber?: number;
  survived?: boolean;
  timestamp?: number;
}

export interface LaunchMutinyRecord {
  targetSeat: number;
  unseatedPlayerId: string;
  unseatedPlayerName: string;
  playerId?: string;
  resolved: boolean;
  timestamp: number;
}

export interface LaunchData {
  state: LaunchState;
  totalSeats: number;
  seats: RaftSeat[];
  provisionerId?: string;
  provisionerName?: string;
  provisionerTieRolls?: Record<string, number>;
  votes: LaunchVoteRecord[];
  pendingVotes?: Record<string, { targetId: string; weight: number; voterName: string; submittedAt?: number; voterReputation?: number }>;
  voteTallies?: Record<string, number>;
  buyoutPrice: number;
  buyouts: LaunchBuyoutRecord[];
  swims: LaunchSwimRecord[];
  mutinies: LaunchMutinyRecord[];
  launchScene?: string;
  stepStartedAt?: number;
  stepClosesAt?: number;
  drownedPlayerIds?: string[];
}

export type SchemeCardId =
  | 'forged_ledger'
  | 'bribe'
  | 'whisper_campaign'
  | 'sabotage'
  | 'smokescreen'
  | 'saint'
  | 'ghost_write'
  | 'mutiny';

export interface SchemeCardDefinition {
  id: SchemeCardId;
  name: string;
  timing: 'scavenge' | 'resolution';
  costStash: number;
  costEnergy: number;
  effect: string;
  flavor: string;
  requiresTarget: boolean;
  isPublic: boolean;
}

export type Archetype =
  | 'ORDINARY'
  | 'PREPPER'
  | 'BROKER'
  | 'IDEALIST'
  | 'INFLUENCER'
  | 'GHOST'
  | 'TYRANT'
  | 'MAYOR';

export interface ArchetypeDetails {
  type: Archetype;
  name: string;
  tagline: string;
  flavorText: string;
  passiveTitle: string;
  passiveDesc: string;
  activeTitle: string;
  activeDesc: string;
  buttonLabel?: string;
  defaultUses?: number;
  cooldownRounds?: number;
}

export interface GameData {
  id: string;
  roomCode: string;
  status: GameStatus;
  mode?: GameMode;
  round: number;
  raftStage: RaftStage;
  raftProgress: RaftProgress;
  hostId: string;
  roundPhase: RoundPhase;
  gmNarration?: string;
  launchData?: LaunchData;
  seats?: RaftSeat[];
  provisionsContributions?: Record<string, number>;
  constitution?: Constitution;
  foundingData?: FoundingData | null;
  governor?: GovernorData | null;
  embezzlementLog?: EmbezzlementRecord[];
  activeElection?: ElectionData | null;
  activeImpeachment?: ImpeachmentData | null;
  lastImpeachedGovernorId?: string | null;
  impeachmentAttemptedThisTerm?: boolean;
  emergencyVoteActive?: boolean;
  endgame?: EndgameData | null;
  createdAt?: any;
}

export type EndgameStep = 'accounting' | 'confession' | 'reveal' | 'blame_vote' | 'verdict';
export type EndgameTriggerReason = 'launch' | 'offer_accepted' | 'attrition' | 'manual' | 'last_standing';

export interface EndgameAccounting {
  trueTotals: Record<string, number>;
  claimedTotals: Record<string, number>;
  gaps: Record<string, number>;
  roundContributions: Record<string, Record<string, { true: number; claimed: number; gap: number }>>;
  embezzlementRevealed: boolean;
  embezzlementRecords?: EmbezzlementRecord[];
  islandEvents: Array<{ round: number; event: string; targets: string[]; accepted?: boolean; details?: string }>;
  rawDocumentText?: string;
}

export interface EndgameRevealItem {
  playerId: string;
  playerName: string;
  order: number;
  role: Archetype;
  trueLabor: number;
  claimedLabor: number;
  gap: number;
  stash: number;
  reputation: number;
  cardsPlayedCount: number;
  temptationAccepted?: boolean;
  offerAccepted?: boolean;
  mutinyActedUpon?: boolean;
  confession?: string;
  seatStatus: 'ESCAPED' | 'LEFT BEHIND' | 'DROWNED' | 'SOLO ESCAPE';
  narration: string;
  revealedAt?: number;
}

export interface BlameVote {
  voterId: string;
  voterName: string;
  targetId: string;
  weight: number;
  timestamp?: number;
}

export interface EndgameData {
  step: EndgameStep;
  triggeredAt: number;
  triggerReason: EndgameTriggerReason;
  stepStartedAt?: number;
  stepClosesAt?: number;
  accounting: EndgameAccounting;
  confessions: Record<string, string>;
  reveals: EndgameRevealItem[];
  currentRevealIndex?: number;
  blameVotes: BlameVote[];
  guiltyId?: string;
  guiltyName?: string;
  guiltyIds?: string[];
  guiltyNames?: string[];
  isTie?: boolean;
  guiltySentence?: string;
  verdict?: string;
  epitaph?: string;
  resolvedAt?: number;
}

export interface PlayerScorecard {
  playerId: string;
  displayName: string;
  escaped: boolean;
  fate: 'escaped' | 'left_behind' | 'drowned' | 'solo_escape';
  cumulativeGap: number;
  finalReputation: number;
  finalStash: number;
  role: string;
  markedByTable: boolean;
  confession?: string;
}

export interface PlayerData {
  id: string;
  displayName: string;
  energy: number;
  reputation: number;
  connected: boolean;
  isHost: boolean;
  isBot?: boolean;
  stash?: number;
  role?: Archetype;
  handCount?: number;
  isDrowned?: boolean;
  isSeated?: boolean;
  isLeftBehind?: boolean;
  seatNumber?: number;
}

export interface PrivatePlayerProfile {
  role: Archetype;
  stash: number;
  activeCooldown: number;
  activeUses: number;
  roleRevealed: boolean;
  hand: SchemeCardId[];
  cardsPlayed: number;
  smokescreenActive: boolean;
  brokerInfo?: {
    targetName: string;
    targetStash: number;
  };
  queuedBribes?: { targetId: string }[];
  temptationAccepted?: boolean;
  offerAccepted?: boolean;
  mutinyActedUpon?: boolean;
}

export interface CardPlayRecord {
  playerId: string;
  playerName?: string;
  cardId: SchemeCardId;
  targetId?: string;
  targetName?: string;
  timing: 'scavenge' | 'resolution';
  resolved: boolean;
  outcome?: string;
  timestamp: number;
}

export interface AuditRecord {
  auditorId: string;
  auditorName: string;
  targetId: string;
  targetName: string;
  result: 'lie' | 'honest' | 'ghost' | 'no_data' | 'smokescreen_redirect';
  claimed?: number;
  actual?: number;
  repChanges: Record<string, number>;
  redirectedFromId?: string;
  redirectedFromName?: string;
  timestamp?: number;
}

export interface RoleActionRecord {
  playerId: string;
  playerName: string;
  action: string;
  payload?: any;
  resolved: boolean;
  description?: string;
}

export interface PlayerSubmission {
  claimed: number;
  actual: number;
  action: string;
  stash: number;
  scheme: number;
  rest: number;
  embezzle?: boolean;
  auditTargetId?: string | null;
  roleAction?: string | null;
  rolePayload?: any;
  playedCardId?: SchemeCardId | null;
  cardTargetId?: string | null;
  timestamp?: number;
}

export interface RoundData {
  submissions: Record<string, PlayerSubmission>;
  resolved: boolean;
  resolving?: boolean;
  submittedPlayerIds: string[];
  cardsPlayed?: CardPlayRecord[];
  resolutionWindowOpen?: boolean;
  resolutionWindowClosesAt?: number;
  audits?: AuditRecord[];
  roleActions?: RoleActionRecord[];
}

export interface LedgerData {
  entries: Record<string, number | string>; // playerId -> claimedAmount or '—'
  verifiedEntries?: Record<string, boolean>; // playerId -> true if Saint verified
  publicTotal: number;
  gmNarration?: string;
  stageProgressStatus?: string;
  audits?: AuditRecord[];
  roleActions?: RoleActionRecord[];
  repDeltas?: Record<string, number>;
  publicCardsPlayed?: { playerName: string; cardName: string; effect: string }[];
}

export interface PublicLogEntry {
  type: 'audit' | 'role_action' | 'narration' | 'card' | 'system';
  text: string;
  round: number;
  timestamp: any;
}

export interface PrivateLogEntry {
  id: string;
  text: string;
  round: number;
  timestamp: any;
}

export interface AllocationPayload {
  labor: number;
  stash: number;
  scheme: number;
  rest: number;
  claimedLabor: number;
  embezzle?: boolean;
  auditTargetId?: string | null;
  roleAction?: string | null;
  rolePayload?: any;
  playedCardId?: SchemeCardId | null;
  cardTargetId?: string | null;
}

