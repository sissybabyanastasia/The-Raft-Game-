import { GoogleGenAI } from '@google/genai';
import type { AuditRecord, RoleActionRecord, CardPlayRecord, LaunchData } from '../types.js';

const BASE_GM_INSTRUCTION = `You are the Game Master of THE RAFT, a satirical survival game about collective failure and hidden greed. You narrate events in one vivid, deadpan sentence. You never reveal hidden information. You never break character. You never explain mechanics. You describe consequence. When an election occurs, narrate it as a scene of quiet desperation. When a Governor embezzles, narrate it obliquely — as a smell of something burning, a number that doesn't add up. When a promise breaks, narrate the betrayal without naming the promise. When an impeachment succeeds, narrate the fall like a state funeral. When an impeachment fails, narrate the survivor's smugness. During the Launch Phase, narrate each step as a scene: the Provisioner's boarding, the vote's quiet cruelty, the buyout's transactional shame, the swimmer's last gamble. Never name a Scheme card. Never explain a mechanic. Describe the human moment.`;

/**
 * Resilient Gemini API invocation with automatic model failover and silent procedural fallback.
 * Tries 'gemini-3.8-flash' first, then 'gemini-3.1-flash-lite' if quota/rate-limits are reached.
 * Never throws or logs unhandled errors into the console when quota is exhausted.
 */
async function callGeminiSafe(params: {
  contents: string;
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: string;
}): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: {
            systemInstruction: params.systemInstruction,
            temperature: params.temperature ?? 0.7,
            responseMimeType: params.responseMimeType,
          },
        });
        const text = response.text?.trim();
        if (text) {
          return text;
        }
      } catch (err: any) {
        const msg = err?.message || String(err);
        const isQuota =
          msg.includes('429') ||
          msg.includes('quota') ||
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('rate');
        if (isQuota) {
          // If first model reached rate/quota limit, failover to secondary model
          continue;
        }
        break;
      }
    }
  } catch {
    // Return null to serve procedural fallback cleanly
  }
  return null;
}

export async function parseCampaignPromise(promise: string): Promise<{
  goal: string;
  measurable: boolean;
  type?: 'labor' | 'no_embezzle' | 'reputation' | 'unmeasurable';
  targetValue?: number;
}> {
  const cleanPromise = (promise || '').trim();
  if (!cleanPromise) {
    return { goal: 'unmeasurable', measurable: false, type: 'unmeasurable' };
  }

  const fallbackRuleBased = (): {
    goal: string;
    measurable: boolean;
    type: 'labor' | 'no_embezzle' | 'reputation' | 'unmeasurable';
    targetValue?: number;
  } => {
    const lower = cleanPromise.toLowerCase();
    if (lower.includes('not embezzle') || lower.includes('no embezzle') || lower.includes('honest')) {
      return { goal: 'zero embezzlements this term', measurable: true, type: 'no_embezzle', targetValue: 0 };
    }
    if (lower.includes('labor') || lower.includes('build') || lower.includes('work') || lower.includes('contribute')) {
      return { goal: 'contribute >=2 Labor per round', measurable: true, type: 'labor', targetValue: 2 };
    }
    return { goal: 'unmeasurable', measurable: false, type: 'unmeasurable' };
  };

  const rawJson = await callGeminiSafe({
    contents: `Analyze this satirical politician campaign promise from a survival game: "${cleanPromise}".
Classify if this promise is objectively measurable in the game, and categorize it into one of:
1. "no_embezzle" (e.g., promises not to steal, embezzle, or cheat the raft) -> goal: "zero embezzlements this term", measurable: true
2. "labor" (e.g., promises to build raft, provide labor, contribute X amount) -> goal: "contribute >=2 Labor per round", measurable: true
3. "unmeasurable" (e.g., "make the island great again", "protect the weak", vague rhetoric, meaningless slogans) -> goal: "unmeasurable", measurable: false

Respond in pure JSON with keys: goal (string), measurable (boolean), type ("labor" | "no_embezzle" | "unmeasurable"), targetValue (optional number).`,
    responseMimeType: 'application/json',
    temperature: 0.2,
  });

  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      const result: {
        goal: string;
        measurable: boolean;
        type: 'labor' | 'no_embezzle' | 'reputation' | 'unmeasurable';
        targetValue?: number;
      } = {
        goal: parsed.goal || 'unmeasurable',
        measurable: Boolean(parsed.measurable),
        type: parsed.type || 'unmeasurable',
      };
      if (typeof parsed.targetValue === 'number' && !isNaN(parsed.targetValue)) {
        result.targetValue = parsed.targetValue;
      }
      return result;
    } catch {
      // Fall through to deterministic rules
    }
  }

  return fallbackRuleBased();
}

export async function generateElectionNarration(params: {
  winnerName: string;
  promise: string;
  voteCount?: number;
  totalVoters?: number;
}): Promise<string> {
  const fallback = `${params.winnerName} accepts the mandate with a solemn bow as the remaining castaways study the shoreline.`;
  const text = await callGeminiSafe({
    contents: `A newly elected Governor (${params.winnerName}) has taken office on the desolate island after promising: "${params.promise}". Write exactly ONE deadpan, vivid sentence describing their quiet ascension. Do not mention game mechanics.`,
    systemInstruction: BASE_GM_INSTRUCTION,
    temperature: 0.7,
  });

  return text ? text.replace(/^["']|["']$/g, '') : fallback;
}

export async function generateImpeachmentNarration(params: {
  outcome?: 'impeached' | 'survived';
  governorName: string;
  filerName: string;
  embezzledAmount?: number;
  impeached?: boolean;
  votesFor?: number;
  votesAgainst?: number;
  totalEmbezzled?: number;
}): Promise<string> {
  const isImpeached = params.outcome === 'impeached' || params.impeached === true;
  const stolenAmount = params.embezzledAmount || params.totalEmbezzled;
  const fallback = isImpeached
    ? `${params.governorName} was stripped of authority in disgrace, leaving their hoarded timber exposed to the tide.`
    : `${params.governorName} survived the vote with cold composure, casting a chilling glance back toward ${params.filerName}.`;

  const prompt = isImpeached
    ? `Governor ${params.governorName} has been successfully impeached after accusations brought by ${params.filerName}. ${stolenAmount ? `They secretly stole ${stolenAmount} timber from the raft.` : ''} Write ONE deadpan sentence describing their public fall like a somber state funeral.`
    : `Governor ${params.governorName} survived an attempted coup and impeachment vote filed by ${params.filerName}. Write ONE deadpan sentence describing the Governor's smug composure and the filer's public humiliation.`;

  const text = await callGeminiSafe({
    contents: prompt,
    systemInstruction: BASE_GM_INSTRUCTION,
    temperature: 0.7,
  });

  return text ? text.replace(/^["']|["']$/g, '') : fallback;
}

export async function generatePromiseEvaluationNarration(params: {
  governorName: string;
  promise: string;
  status: 'kept' | 'broken' | 'unmeasurable';
}): Promise<string> {
  let fallback = `${params.governorName}'s record stands recorded in damp ink.`;
  if (params.status === 'kept') {
    fallback = `${params.governorName} leaves office with rare dignity, having fulfilled their public oath.`;
  } else if (params.status === 'broken') {
    fallback = `The lofty commitments of ${params.governorName} washed out with the morning tide, leaving bitter silence behind.`;
  }

  const prompt = `Governor ${params.governorName}'s term has ended. Their original campaign promise was: "${params.promise}". Status of promise: ${params.status}. Write ONE deadpan satirical sentence describing this legacy without reciting the literal wording of the promise.`;

  const text = await callGeminiSafe({
    contents: prompt,
    systemInstruction: BASE_GM_INSTRUCTION,
    temperature: 0.7,
  });

  return text ? text.replace(/^["']|["']$/g, '') : fallback;
}

export async function generateGMNarration(params: {
  round: number;
  raftStage: string;
  claimedTotal: number;
  actualTotal: number;
  playerCount: number;
  stageProgressStatus?: string;
  audits?: AuditRecord[];
  roleActions?: RoleActionRecord[];
  cardsPlayed?: CardPlayRecord[];
  launchData?: Partial<LaunchData>;
}): Promise<string> {
  const discrepancy = params.claimedTotal - params.actualTotal;
  let contextHint = '';
  if (params.actualTotal === 0) {
    contextHint = 'Nobody put in any actual labor despite whatever was claimed in the ledger; the raft did not move an inch.';
  } else if (discrepancy >= 4) {
    contextHint = 'A stark discrepancy between grand public claims and meager real progress; heavy hoarding, sabotage, and deceit are taking place.';
  } else if (discrepancy > 0) {
    contextHint = 'Some claimed labor failed to materialize in physical timber; castaways harbor quiet doubts.';
  } else {
    contextHint = 'Castaways contributed what they claimed, yet the sea remains cold and survival feels precarious.';
  }

  let auditContext = '';
  if (params.audits && params.audits.length > 0) {
    const auditCount = params.audits.length;
    const hasLie = params.audits.some(a => a.result === 'lie');
    const hasGhost = params.audits.some(a => a.result === 'ghost' || a.result === 'no_data');
    if (hasLie) {
      auditContext = ` An inquest or search was conducted upon the beach; sharp accusations and sour glances hung over the tide (${auditCount} audit occurred).`;
    } else if (hasGhost) {
      auditContext = ` An inquiry into the manifest returned only silence and shifting dunes (${auditCount} audit occurred).`;
    } else {
      auditContext = ` Bitter finger-pointing and bureaucratic harassment caused friction in the camp (${auditCount} audit occurred).`;
    }
  }

  let cardContext = '';
  if (params.cardsPlayed && params.cardsPlayed.length > 0) {
    const cardTypes = params.cardsPlayed.map(c => c.cardId);
    if (cardTypes.includes('sabotage')) {
      cardContext += ' A covert act of sabotage was executed, weakening structural lashings.';
    }
    if (cardTypes.includes('whisper_campaign')) {
      cardContext += ' Malicious rumors and poisonous gossip were circulated in shadows.';
    }
    if (cardTypes.includes('smokescreen')) {
      cardContext += ' Misdirection and blame-shifting created smoke and false accusations.';
    }
    if (cardTypes.includes('forged_ledger')) {
      cardContext += ' Numbers on damp parchment appear freshly smudged and altered.';
    }
    if (cardTypes.includes('saint')) {
      cardContext += ' A castaway made a dramatic, ostentatious display of sacrifice and virtue.';
    }
    if (cardTypes.includes('bribe')) {
      cardContext += ' Clandestine barter and muffled promises exchanged hands.';
    }
    if (cardTypes.includes('propaganda')) {
      cardContext += ' Shameless, self-congratulatory posturing filled the camp.';
    }
    if (cardTypes.includes('blackmail')) {
      cardContext += ' Devious leverage was applied, forcing secret transactions and stolen hush-money.';
    }
    if (cardTypes.includes('black_market')) {
      cardContext += ' Shady trades of goods and contraband occurred behind the palm trees.';
    }
  }

  const prompt = `Current Round: ${params.round}. Raft Stage: ${params.raftStage}. Active Castaways: ${params.playerCount}. Total Public Claimed Labor: ${params.claimedTotal}. True Physical Labor: ${params.actualTotal}. Context: ${contextHint}.${auditContext}${cardContext} Write exactly ONE deadpan, vivid sentence describing what occurred this round on the desolate shore.`;

  const fallback = (() => {
    if (params.cardsPlayed && params.cardsPlayed.some(c => c.cardId === 'sabotage')) {
      return "A strange, hollow thud sounded from the keel as the tide rose, though everyone insisted the binding was secure.";
    }
    if (params.cardsPlayed && params.cardsPlayed.some(c => c.cardId === 'whisper_campaign')) {
      return "A sour whisper took root behind the salvage pile, lingering longer than the scent of decaying kelp.";
    }
    if (params.audits && params.audits.length > 0) {
      const auditFallbacks = [
        "A scent of vinegar and burnt ledger paper drifts across the sand as accusations linger unwashed in the surf.",
        "The castaways inspect one another's calloused palms with narrow eyes while the raft bobs indifferently in the grey tide.",
        "Gossip travels faster than timber along the high water line, leaving reputations as frayed as the hemp lashings.",
      ];
      return auditFallbacks[(params.round - 1) % auditFallbacks.length];
    }
    const fallbackList = [
      "The logs creak into place with agonizing reluctance, bearing faint resemblance to the declarations in the ledger.",
      "A collective sigh drifts into the surf as three castaways nurse splintered palms in suspicious silence.",
      "The timber holds together by little more than damp hemp rope and unspoken mutual distrust.",
      "The ledger records brisk industriousness, though the raft has merely shifted two inches in the mud.",
      "Another evening descends upon the beach with empty promises drying faster than the timber."
    ];
    return fallbackList[(params.round - 1) % fallbackList.length];
  })();

  const text = await callGeminiSafe({
    contents: prompt,
    systemInstruction: BASE_GM_INSTRUCTION,
    temperature: 0.7,
  });

  return text ? text.replace(/^["']|["']$/g, '') : fallback;
}

export async function generateLaunchNarration(params: {
  step: string;
  details: string;
}): Promise<string> {
  const fallback = (() => {
    if (params.step === 'provisioner') {
      return "The one who hoarded the grain steps aboard first, stepping squarely across the wet sand without turning back.";
    }
    if (params.step === 'vote') {
      return "Names were spoken aloud with downcast eyes, bartering loyalty for the safety of a dry plank.";
    }
    if (params.step === 'buyout') {
      return "Glittering salvage traded hands on the waterline, proving once again that salvation has a fixed market price.";
    }
    if (params.step === 'swim') {
      return "A desperate plunge into the churning foam decided the final berth before the timber pulled away.";
    }
    return "The vessel rocks gently in the surf as the passenger manifest is sealed.";
  })();

  const text = await callGeminiSafe({
    contents: `Launch Step: ${params.step}. Scene details: ${params.details}. Write exactly ONE deadpan, vivid sentence describing this human moment of survival and betrayal.`,
    systemInstruction: BASE_GM_INSTRUCTION,
    temperature: 0.7,
  });

  return text ? text.replace(/^["']|["']$/g, '') : fallback;
}

export async function generateLaunchScene(params: {
  seatedPlayers: string[];
  leftBehindPlayers: string[];
  drownedPlayers: string[];
  totalSeats: number;
}): Promise<string> {
  const fallback = `The lashed timbers groan as the tide catches the keel, pulling the few survivors past the reef and into the gray open water. From the spray-soaked gunwale, the shore shrinks to a dark sliver of rock and silence. On the wet sand, those left behind stand shoulder-to-shoulder, watching the sail catch the wind and leave them to the approaching winter.`;

  const prompt = `The raft has launched into the open ocean. Seated survivors on board: ${params.seatedPlayers.join(', ') || 'Nobody'}. Castaways left standing on the shore: ${params.leftBehindPlayers.join(', ') || 'None'}. Drowned swimmers: ${params.drownedPlayers.join(', ') || 'None'}. Write a closing scene of exactly 2 to 3 sentences describing the departure of the vessel and the view from shore, ending with a line about the shore and who remains on it. Do not name any game mechanics or Scheme cards.`;

  const text = await callGeminiSafe({
    contents: prompt,
    systemInstruction: BASE_GM_INSTRUCTION,
    temperature: 0.7,
  });

  return text ? text.replace(/^["']|["']$/g, '') : fallback;
}

// ---------------------------------------------------------
// ROUND 7: THE ENDGAME GEMINI GENERATORS
// ---------------------------------------------------------

/**
 * Call 1 — Per-player narration
 * Tone: dry, historical, without pity. Summarizing their game.
 */
export async function generateEndgameAccountingNarration(params: {
  displayName: string;
  role: string;
  gap: number;
  trueLabor: number;
  claimedLabor: number;
  stash: number;
  reputation: number;
  fate: string; // ESCAPED, LEFT BEHIND, DROWNED, SOLO ESCAPE
  cardsPlayedCount: number;
  confession?: string;
}): Promise<string> {
  const fallback = params.fate === 'ESCAPED'
    ? `${params.displayName}, acting as ${params.role}, claimed a cumulative gap of ${params.gap} and took a seat across the swell while the timber held.`
    : params.fate === 'DROWNED'
    ? `The ${params.role} accumulated a ledger discrepancy of ${params.gap} before slipping under the breakers in the final scramble.`
    : params.fate === 'SOLO ESCAPE'
    ? `${params.displayName} abandoned the colony with ${params.stash} stash in hand, leaving their fellow castaways to reckon with an empty berth.`
    : `${params.displayName} stood on the strand as the vessel departed, their true labor of ${params.trueLabor} overshadowed by the ${params.gap} units they withheld.`;

  const prompt = `Castaway Name: ${params.displayName}
True Role: ${params.role}
True Labor Delivered: ${params.trueLabor}
Claimed Labor In Ledger: ${params.claimedLabor}
Cumulative Lie (Gap): ${params.gap}
Secret Stash: ${params.stash}
Final Public Reputation: ${params.reputation}
Cards Played: ${params.cardsPlayedCount}
Final Fate: ${params.fate}
${params.confession ? `Their Confession: "${params.confession}"` : 'Confession: They said nothing.'}

Write exactly ONE sentence — dry, historical, without pity — summarizing this castaway's game. Reference their role, their gap, and their fate. Never moralize. Never explain. Describe.`;

  const text = await callGeminiSafe({
    contents: prompt,
    systemInstruction: `You are the chronicler of THE RAFT's final session. For each player, write ONE sentence — dry, historical, without pity — summarizing their game. Reference their role, their gap, and their fate. Never moralize. Never explain. Describe.`,
    temperature: 0.6,
  });

  return text ? text.replace(/^["']|["']$/g, '') : fallback;
}

/**
 * Call 2 — The Verdict
 * Tone: historical tribunal, conclusive, quiet, without cruelty. 2–3 sentences.
 */
export async function generateEndgameVerdict(params: {
  guiltyName: string;
  cumulativeGap: number;
  voteCount: number;
  blameClause?: string;
  isTie?: boolean;
  guiltyNames?: string[];
}): Promise<string> {
  const fallback = params.isTie && params.guiltyNames && params.guiltyNames.length > 1
    ? `The assembly divided its accusation evenly between ${params.guiltyNames.join(' and ')}, finding equal measures of withheld labor and calculated silence. In the absence of a singular scapegoat, the record binds them both to the vessel's failure. Their names remain affixed to the ruin of the expedition.`
    : `By majority tally and the testimony of the unseated, ${params.guiltyName} was singled out as the architect of the colony's ruin. The discrepancy between their claims and their actual toil exceeded the fragile tolerance of the group. The vote concluded without appeal.`;

  const prompt = params.isTie && params.guiltyNames && params.guiltyNames.length > 1
    ? `The blame vote deadlocked between ${params.guiltyNames.join(' and ')}. Both are condemned by the table with tied votes and equal ledger duplicity. Write 2–3 sentences in the tone of a historical judgment — conclusive, quiet, without cruelty. You are not punishing. You are recording. The last sentence should land like a stamp.`
    : `The table has cast ${params.voteCount} weighted blame votes naming ${params.guiltyName} as The Guilty. Their cumulative ledger gap across all rounds was ${params.cumulativeGap}. ${params.blameClause === 'binding' ? 'The Constitutional Blame Clause was BINDING, marking them permanently.' : 'The condemnation is recorded into the colony annals.'} Write 2–3 sentences in the tone of a historical judgment — conclusive, quiet, without cruelty. You are not punishing. You are recording. The last sentence should land like a stamp.`;

  const text = await callGeminiSafe({
    contents: prompt,
    systemInstruction: `You are the tribunal of THE RAFT. The table has named a Guilty. Write 2–3 sentences in the tone of a historical judgment — conclusive, quiet, without cruelty. You are not punishing. You are recording. The last sentence should land like a stamp.`,
    temperature: 0.6,
  });

  return text ? text.replace(/^["']|["']$/g, '') : fallback;
}

/**
 * Call 3 — The Epitaph
 * Tone: mock-historical, dry, elegiac, in the style of a failed-state obituary. Exactly 3 sentences.
 * First sentence: what happened.
 * Second sentence: what it meant.
 * Third sentence: what remains.
 */
export async function generateEndgameEpitaph(params: {
  roundsPlayed: number;
  outcome: string; // ESCAPED, STRANDED, SOLO, ATTRITION
  escapedCount: number;
  leftBehindCount: number;
  drownedCount: number;
  guiltyName?: string;
  mode?: string;
}): Promise<string> {
  const fallback = params.outcome === 'ESCAPED'
    ? `The Colony of Driftwood endured ${params.roundsPlayed} rounds of calculated promises until three lashed logs cleared the breakers with ${params.escapedCount} aboard. Survival was bought not by harmony, but by a meticulously budgeted ration of deceit. The tide washed clean the strand, leaving only an illegible ledger and the sound of receding water.`
    : `Twelve rounds elapsed upon the sand without a seaworthy vessel ever tasting deep water. The colony exhaustively audited its members until starvation superseded the constitution. The island did not object; it never does.`;

  const prompt = `Rounds Played: ${params.roundsPlayed}
Outcome: ${params.outcome}
Escaped Survivors: ${params.escapedCount}
Left Standing on Strand: ${params.leftBehindCount}
Swimmers Drowned: ${params.drownedCount}
Condemned Guilty: ${params.guiltyName || 'None'}
Game Mode: ${params.mode || 'satire'}

Write the session's epitaph in EXACTLY THREE SENTENCES.
First sentence: what happened.
Second sentence: what it meant.
Third sentence: what remains.
Tone: mock-historical, dry, elegiac, in the style of a failed-state obituary. Never moralize. Never explain. The last sentence is the final word of the game — it should be quotable.`;

  const text = await callGeminiSafe({
    contents: prompt,
    systemInstruction: `You are the closing voice of THE RAFT. Write the session's epitaph in exactly 3 sentences. First sentence: what happened. Second sentence: what it meant. Third sentence: what remains. Tone: mock-historical, dry, elegiac, in the style of a failed-state obituary. Never moralize. Never explain. The last sentence is the final word of the game — it should be quotable.`,
    temperature: 0.7,
  });

  return text ? text.replace(/^["']|["']$/g, '') : fallback;
}

/**
 * Island Mode: Guilty Sentence
 * Fictional, poetic, cuts.
 */
export async function generateIslandGuiltySentence(params: {
  guiltyName: string;
}): Promise<string> {
  const prompt = `Player ${params.guiltyName} was condemned in Island Mode. Write a single poetic sentence pronouncing their fictional sentence from the island itself. It should cut deeply without melodrama.`;
  const fallback = `For ${params.guiltyName}, the island reserves no storm or wave—only an eternity of watching empty rafts float safely past the reef just beyond reach.`;

  const text = await callGeminiSafe({
    contents: prompt,
    systemInstruction: BASE_GM_INSTRUCTION,
    temperature: 0.7,
  });

  return text ? text.replace(/^["']|["']$/g, '') : fallback;
}
