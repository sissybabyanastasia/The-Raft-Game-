import express, { Request, Response } from 'express';
import {
  createGameRoom,
  joinGameRoom,
  addDemoCastaway,
  startGame,
  submitAllocation,
  advanceToNextRound,
  executeRoleAction,
  playResolutionCard,
  discardCard,
  finalizeResolution,
  initiateLaunchPhase,
  advanceLaunchStep,
  submitLaunchVote,
  submitLaunchBuyout,
  submitLaunchSwim,
  playLaunchMutiny,
  toggleGameMode,
  submitFoundingVote,
  resolveFoundingPhase,
  nominateGovernor,
  advanceElectionStage,
  submitElectionVote,
  resolveElection,
  fileImpeachment,
  voteImpeachment,
  resolveImpeachment,
  pardonGovernor,
  emergencyVoteGovernor,
  appointCaptainSeat,
  triggerEndgame,
  advanceEndgameStep,
  submitEndgameConfession,
  advanceRevealBeat,
  submitBlameVote,
  resolveBlameVote,
} from './gameLogic.js';
import {
  generateGMNarration,
  generateEndgameAccountingNarration,
  generateEndgameVerdict,
  generateEndgameEpitaph,
} from './gemini.js';

export const apiRouter = express.Router();
apiRouter.use(express.json());

// Server-side Gemini GM narration endpoint
apiRouter.post('/gm/narrate', async (req: Request, res: Response) => {
  try {
    const { round, raftStage, claimedTotal, actualTotal, playerCount, stageProgressStatus, audits, roleActions, cardsPlayed } = req.body;
    const narration = await generateGMNarration({
      round: Number(round) || 1,
      raftStage: raftStage || 'frame',
      claimedTotal: Number(claimedTotal) || 0,
      actualTotal: Number(actualTotal) || 0,
      playerCount: Number(playerCount) || 3,
      stageProgressStatus,
      audits,
      roleActions,
      cardsPlayed,
    });
    res.json({ narration });
  } catch (error: any) {
    console.error('Error generating narration:', error);
    res.status(500).json({ error: error.message || 'Failed to generate narration' });
  }
});

// Create new game
apiRouter.post('/game/create', async (req: Request, res: Response) => {
  try {
    const { hostId, hostName, mode } = req.body;
    if (!hostId) {
      return res.status(400).json({ error: 'hostId is required' });
    }
    const result = await createGameRoom(hostId, hostName, mode || 'satire');
    res.json(result);
  } catch (error: any) {
    console.error('Create game error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Toggle Game Mode (Classic vs Satire)
apiRouter.post('/game/mode/toggle', async (req: Request, res: Response) => {
  try {
    const { gameId, hostId, mode } = req.body;
    if (!gameId || !hostId || !mode) {
      return res.status(400).json({ error: 'gameId, hostId, and mode are required' });
    }
    const result = await toggleGameMode(gameId, hostId, mode);
    res.json(result);
  } catch (error: any) {
    console.error('Toggle mode error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Join existing game
apiRouter.post('/game/join', async (req: Request, res: Response) => {
  try {
    const { roomCode, playerId, playerName } = req.body;
    if (!roomCode || !playerId) {
      return res.status(400).json({ error: 'roomCode and playerId are required' });
    }
    const result = await joinGameRoom(roomCode, playerId, playerName);
    res.json(result);
  } catch (error: any) {
    console.error('Join game error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Add demo bot castaway
apiRouter.post('/game/add-bot', async (req: Request, res: Response) => {
  try {
    const { gameId, botName } = req.body;
    if (!gameId) {
      return res.status(400).json({ error: 'gameId is required' });
    }
    const result = await addDemoCastaway(gameId, botName);
    res.json(result);
  } catch (error: any) {
    console.error('Add bot error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start game
apiRouter.post('/game/start', async (req: Request, res: Response) => {
  try {
    const { gameId, hostId } = req.body;
    if (!gameId || !hostId) {
      return res.status(400).json({ error: 'gameId and hostId are required' });
    }
    const result = await startGame(gameId, hostId);
    res.json(result);
  } catch (error: any) {
    console.error('Start game error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Submit secret allocation
apiRouter.post('/game/submit', async (req: Request, res: Response) => {
  try {
    const { gameId, playerId, allocation, claimedLabor } = req.body;
    if (!gameId || !playerId || !allocation) {
      return res.status(400).json({ error: 'Missing required submission payload' });
    }
    const result = await submitAllocation(gameId, playerId, allocation, Number(claimedLabor));
    res.json(result);
  } catch (error: any) {
    console.error('Submission error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Execute Role Action
apiRouter.post('/game/role-action', async (req: Request, res: Response) => {
  try {
    const { gameId, playerId, actionType, payload } = req.body;
    if (!gameId || !playerId || !actionType) {
      return res.status(400).json({ error: 'gameId, playerId, and actionType are required' });
    }
    const result = await executeRoleAction(gameId, playerId, actionType, payload);
    res.json(result);
  } catch (error: any) {
    console.error('Role action error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Play Resolution-phase Scheme card during the 10-second resolution window
apiRouter.post('/game/play-resolution-card', async (req: Request, res: Response) => {
  try {
    const { gameId, playerId, cardId, targetId } = req.body;
    if (!gameId || !playerId || !cardId) {
      return res.status(400).json({ error: 'gameId, playerId, and cardId are required' });
    }
    const result = await playResolutionCard(gameId, playerId, cardId, targetId);
    res.json(result);
  } catch (error: any) {
    console.error('Play resolution card error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Discard card from hand
apiRouter.post('/game/discard-card', async (req: Request, res: Response) => {
  try {
    const { gameId, playerId, cardId } = req.body;
    if (!gameId || !playerId || !cardId) {
      return res.status(400).json({ error: 'gameId, playerId, and cardId are required' });
    }
    const result = await discardCard(gameId, playerId, cardId);
    res.json(result);
  } catch (error: any) {
    console.error('Discard card error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Finalize Resolution (when 10-second timer closes)
apiRouter.post('/game/finalize-resolution', async (req: Request, res: Response) => {
  try {
    const { gameId, round } = req.body;
    if (!gameId || !round) {
      return res.status(400).json({ error: 'gameId and round are required' });
    }
    await finalizeResolution(gameId, Number(round));
    res.json({ success: true });
  } catch (error: any) {
    console.error('Finalize resolution error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Advance to next round
apiRouter.post('/game/advance', async (req: Request, res: Response) => {
  try {
    const { gameId, hostId } = req.body;
    if (!gameId || !hostId) {
      return res.status(400).json({ error: 'gameId and hostId are required' });
    }
    const result = await advanceToNextRound(gameId, hostId);
    res.json(result);
  } catch (error: any) {
    console.error('Advance round error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Launch Phase: Initiate Launch
apiRouter.post('/game/launch/initiate', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.body;
    if (!gameId) {
      return res.status(400).json({ error: 'gameId is required' });
    }
    const result = await initiateLaunchPhase(gameId);
    res.json(result);
  } catch (error: any) {
    console.error('Launch initiate error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Launch Phase: Advance Step (Roll Call -> Provisioner -> Vote -> Buyout -> Swim -> Done)
apiRouter.post('/game/launch/advance', async (req: Request, res: Response) => {
  try {
    const { gameId, hostId } = req.body;
    if (!gameId) {
      return res.status(400).json({ error: 'gameId is required' });
    }
    const result = await advanceLaunchStep(gameId, hostId);
    res.json(result);
  } catch (error: any) {
    console.error('Launch advance error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Launch Phase: Submit Vote (Step D)
apiRouter.post('/game/launch/vote', async (req: Request, res: Response) => {
  try {
    const { gameId, voterId, targetId } = req.body;
    if (!gameId || !voterId || !targetId) {
      return res.status(400).json({ error: 'gameId, voterId, and targetId are required' });
    }
    const result = await submitLaunchVote(gameId, voterId, targetId);
    res.json(result);
  } catch (error: any) {
    console.error('Launch vote error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Launch Phase: Submit Buyout (Step E)
apiRouter.post('/game/launch/buyout', async (req: Request, res: Response) => {
  try {
    const { gameId, playerId, amount } = req.body;
    if (!gameId || !playerId || amount === undefined) {
      return res.status(400).json({ error: 'gameId, playerId, and amount are required' });
    }
    const result = await submitLaunchBuyout(gameId, playerId, Number(amount));
    res.json(result);
  } catch (error: any) {
    console.error('Launch buyout error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Launch Phase: Submit Desperation Swim (Step F)
apiRouter.post('/game/launch/swim', async (req: Request, res: Response) => {
  try {
    const { gameId, playerId } = req.body;
    if (!gameId || !playerId) {
      return res.status(400).json({ error: 'gameId and playerId are required' });
    }
    const result = await submitLaunchSwim(gameId, playerId);
    res.json(result);
  } catch (error: any) {
    console.error('Launch swim error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Launch Phase: Play Mutiny Card
apiRouter.post('/game/launch/mutiny', async (req: Request, res: Response) => {
  try {
    const { gameId, playerId, targetSeatNumber } = req.body;
    if (!gameId || !playerId || targetSeatNumber === undefined) {
      return res.status(400).json({ error: 'gameId, playerId, and targetSeatNumber are required' });
    }
    const result = await playLaunchMutiny(gameId, playerId, Number(targetSeatNumber));
    res.json(result);
  } catch (error: any) {
    console.error('Launch mutiny error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Founding Phase: Vote on clause
apiRouter.post('/game/founding/vote', async (req: Request, res: Response) => {
  try {
    const { gameId, playerId, clauseId, choice } = req.body;
    if (!gameId || !playerId || !clauseId || !choice) {
      return res.status(400).json({ error: 'gameId, playerId, clauseId, and choice are required' });
    }
    const result = await submitFoundingVote(gameId, playerId, clauseId, choice);
    res.json(result);
  } catch (error: any) {
    console.error('Founding vote error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Founding Phase: Resolve & Ratify
apiRouter.post('/game/founding/resolve', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.body;
    if (!gameId) {
      return res.status(400).json({ error: 'gameId is required' });
    }
    const result = await resolveFoundingPhase(gameId);
    res.json(result);
  } catch (error: any) {
    console.error('Founding resolve error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Election Phase: Nominate Candidate
apiRouter.post('/game/election/nominate', async (req: Request, res: Response) => {
  try {
    const { gameId, playerId, promiseText } = req.body;
    if (!gameId || !playerId || !promiseText) {
      return res.status(400).json({ error: 'gameId, playerId, and promiseText are required' });
    }
    const result = await nominateGovernor(gameId, playerId, promiseText);
    res.json(result);
  } catch (error: any) {
    console.error('Election nominate error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Election Phase: Advance Stage
apiRouter.post('/game/election/advance', async (req: Request, res: Response) => {
  try {
    const { gameId, hostId } = req.body;
    if (!gameId || !hostId) {
      return res.status(400).json({ error: 'gameId and hostId are required' });
    }
    const result = await advanceElectionStage(gameId, hostId);
    res.json(result);
  } catch (error: any) {
    console.error('Election advance error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Election Phase: Submit Vote
apiRouter.post('/game/election/vote', async (req: Request, res: Response) => {
  try {
    const { gameId, voterId, targetNomineeId } = req.body;
    if (!gameId || !voterId || !targetNomineeId) {
      return res.status(400).json({ error: 'gameId, voterId, and targetNomineeId are required' });
    }
    const result = await submitElectionVote(gameId, voterId, targetNomineeId);
    res.json(result);
  } catch (error: any) {
    console.error('Election vote error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Election Phase: Resolve Election
apiRouter.post('/game/election/resolve', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.body;
    if (!gameId) {
      return res.status(400).json({ error: 'gameId is required' });
    }
    const result = await resolveElection(gameId);
    res.json(result);
  } catch (error: any) {
    console.error('Election resolve error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Impeachment: File Articles
apiRouter.post('/game/impeachment/file', async (req: Request, res: Response) => {
  try {
    const { gameId, filerId } = req.body;
    if (!gameId || !filerId) {
      return res.status(400).json({ error: 'gameId and filerId are required' });
    }
    const result = await fileImpeachment(gameId, filerId);
    res.json(result);
  } catch (error: any) {
    console.error('Impeachment file error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Impeachment: Vote
apiRouter.post('/game/impeachment/vote', async (req: Request, res: Response) => {
  try {
    const { gameId, voterId, inFavor } = req.body;
    if (!gameId || !voterId || inFavor === undefined) {
      return res.status(400).json({ error: 'gameId, voterId, and inFavor are required' });
    }
    const result = await voteImpeachment(gameId, voterId, Boolean(inFavor));
    res.json(result);
  } catch (error: any) {
    console.error('Impeachment vote error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Impeachment: Resolve Inquest
apiRouter.post('/game/impeachment/resolve', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.body;
    if (!gameId) {
      return res.status(400).json({ error: 'gameId is required' });
    }
    const result = await resolveImpeachment(gameId);
    res.json(result);
  } catch (error: any) {
    console.error('Impeachment resolve error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Governor Powers: Executive Pardon
apiRouter.post('/game/governor/pardon', async (req: Request, res: Response) => {
  try {
    const { gameId, governorId, targetPlayerId } = req.body;
    if (!gameId || !governorId || !targetPlayerId) {
      return res.status(400).json({ error: 'gameId, governorId, and targetPlayerId are required' });
    }
    const result = await pardonGovernor(gameId, governorId, targetPlayerId);
    res.json(result);
  } catch (error: any) {
    console.error('Governor pardon error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Governor Powers: Emergency Powers
apiRouter.post('/game/governor/emergency', async (req: Request, res: Response) => {
  try {
    const { gameId, governorId } = req.body;
    if (!gameId || !governorId) {
      return res.status(400).json({ error: 'gameId and governorId are required' });
    }
    const result = await emergencyVoteGovernor(gameId, governorId);
    res.json(result);
  } catch (error: any) {
    console.error('Governor emergency error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Governor Powers: Appoint Captain Seat
apiRouter.post('/game/governor/appoint', async (req: Request, res: Response) => {
  try {
    const { gameId, governorId, targetPlayerId } = req.body;
    if (!gameId || !governorId || !targetPlayerId) {
      return res.status(400).json({ error: 'gameId, governorId, and targetPlayerId are required' });
    }
    const result = await appointCaptainSeat(gameId, governorId, targetPlayerId);
    res.json(result);
  } catch (error: any) {
    console.error('Governor appoint seat error:', error);
    res.status(400).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// ROUND 7: ENDGAME API ENDPOINTS
// ---------------------------------------------------------

// Trigger Endgame sequence
apiRouter.post('/game/endgame/trigger', async (req: Request, res: Response) => {
  try {
    const { gameId, reason } = req.body;
    if (!gameId) {
      return res.status(400).json({ error: 'gameId is required' });
    }
    const result = await triggerEndgame(gameId, reason || 'manual');
    res.json(result);
  } catch (error: any) {
    console.error('Trigger endgame error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Advance Endgame step (Accounting -> Confession -> Reveal -> Blame Vote -> Verdict)
apiRouter.post('/game/endgame/advance', async (req: Request, res: Response) => {
  try {
    const { gameId, hostId } = req.body;
    if (!gameId) {
      return res.status(400).json({ error: 'gameId is required' });
    }
    const result = await advanceEndgameStep(gameId, hostId);
    res.json(result);
  } catch (error: any) {
    console.error('Advance endgame step error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Submit Confession (Step B)
apiRouter.post('/game/endgame/confess', async (req: Request, res: Response) => {
  try {
    const { gameId, playerId, text } = req.body;
    if (!gameId || !playerId) {
      return res.status(400).json({ error: 'gameId and playerId are required' });
    }
    const result = await submitEndgameConfession(gameId, playerId, text);
    res.json(result);
  } catch (error: any) {
    console.error('Endgame confession error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Advance Reveal Beat (Step C)
apiRouter.post('/game/endgame/reveal-next', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.body;
    if (!gameId) {
      return res.status(400).json({ error: 'gameId is required' });
    }
    const result = await advanceRevealBeat(gameId);
    res.json(result);
  } catch (error: any) {
    console.error('Endgame reveal next error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Submit Blame Vote (Step D)
apiRouter.post('/game/endgame/blame-vote', async (req: Request, res: Response) => {
  try {
    const { gameId, voterId, targetId } = req.body;
    if (!gameId || !voterId || !targetId) {
      return res.status(400).json({ error: 'gameId, voterId, and targetId are required' });
    }
    const result = await submitBlameVote(gameId, voterId, targetId);
    res.json(result);
  } catch (error: any) {
    console.error('Endgame blame vote error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Resolve Blame Vote / Generate Verdict (Step E)
apiRouter.post('/game/endgame/resolve-blame', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.body;
    if (!gameId) {
      return res.status(400).json({ error: 'gameId is required' });
    }
    const result = await resolveBlameVote(gameId);
    res.json(result);
  } catch (error: any) {
    console.error('Endgame resolve blame error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Gemini Endgame Narration directly (optional utility endpoint)
apiRouter.post('/gm/accounting', async (req: Request, res: Response) => {
  try {
    const { displayName, role, gap, trueLabor, claimedLabor, stash, reputation, fate, cardsPlayedCount, confession } = req.body;
    const narration = await generateEndgameAccountingNarration({
      displayName: displayName || 'Castaway',
      role: role || 'ORDINARY_PERSON',
      gap: Number(gap) || 0,
      trueLabor: Number(trueLabor) || 0,
      claimedLabor: Number(claimedLabor) || 0,
      stash: Number(stash) || 0,
      reputation: Number(reputation) || 0,
      fate: fate || 'LEFT BEHIND',
      cardsPlayedCount: Number(cardsPlayedCount) || 0,
      confession,
    });
    res.json({ narration });
  } catch (error: any) {
    console.error('Endgame accounting narration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Gemini Verdict directly (optional utility endpoint)
apiRouter.post('/gm/verdict', async (req: Request, res: Response) => {
  try {
    const { guiltyName, cumulativeGap, voteCount, blameClause, isTie, guiltyNames } = req.body;
    const verdict = await generateEndgameVerdict({
      guiltyName: guiltyName || 'Unknown',
      cumulativeGap: Number(cumulativeGap) || 0,
      voteCount: Number(voteCount) || 0,
      blameClause,
      isTie: Boolean(isTie),
      guiltyNames,
    });
    res.json({ verdict });
  } catch (error: any) {
    console.error('Endgame verdict error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Gemini Epitaph directly (optional utility endpoint)
apiRouter.post('/gm/epitaph', async (req: Request, res: Response) => {
  try {
    const { roundsPlayed, outcome, escapedCount, leftBehindCount, drownedCount, guiltyName, mode } = req.body;
    const epitaph = await generateEndgameEpitaph({
      roundsPlayed: Number(roundsPlayed) || 1,
      outcome: outcome || 'STRANDED',
      escapedCount: Number(escapedCount) || 0,
      leftBehindCount: Number(leftBehindCount) || 0,
      drownedCount: Number(drownedCount) || 0,
      guiltyName,
      mode,
    });
    res.json({ epitaph });
  } catch (error: any) {
    console.error('Endgame epitaph error:', error);
    res.status(500).json({ error: error.message });
  }
});

