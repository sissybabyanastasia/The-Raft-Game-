import React, { useState } from 'react';
import {
  Anchor,
  Users,
  Coins,
  Waves,
  Skull,
  Award,
  ChevronRight,
  Sparkles,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
} from 'lucide-react';
import type { GameData, PlayerData, PrivatePlayerProfile, RaftSeat } from '../types.js';
import { ConfirmSkipModal } from './ConfirmSkipModal.js';

interface LaunchPhaseViewProps {
  game: GameData;
  players: PlayerData[];
  currentUserId: string;
  userProfile: PrivatePlayerProfile | null;
  onAdvanceStep: () => Promise<void>;
  onSubmitVote: (targetId: string) => Promise<void>;
  onSubmitBuyout: (amount: number) => Promise<void>;
  onSubmitSwim: () => Promise<void>;
  onPlayMutiny: (targetSeatNumber: number) => Promise<void>;
  onEndGame: () => void;
}

export const LaunchPhaseView: React.FC<LaunchPhaseViewProps> = ({
  game,
  players,
  currentUserId,
  userProfile,
  onAdvanceStep,
  onSubmitVote,
  onSubmitBuyout,
  onSubmitSwim,
  onPlayMutiny,
  onEndGame,
}) => {
  const launchData = game.launchData || {
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

  const isHost = game.hostId === currentUserId;
  const currentPlayer = players.find(p => p.id === currentUserId);
  const isCurrentSeated = (launchData.seats || []).some(s => s.playerId === currentUserId);
  const isCurrentDrowned = (launchData.drownedPlayerIds || []).includes(currentUserId) || currentPlayer?.isDrowned;

  // Local interactive states
  const [selectedVoteTarget, setSelectedVoteTarget] = useState<string>('');
  const [buyoutBid, setBuyoutBid] = useState<number>(launchData.buyoutPrice || 5);
  const [mutinyTargetSeat, setMutinyTargetSeat] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showMutinyModal, setShowMutinyModal] = useState<boolean>(false);
  const [forceResolveEnabled, setForceResolveEnabled] = useState<boolean>(false);
  const [isConfirmSkipOpen, setIsConfirmSkipOpen] = useState<boolean>(false);

  const hasMutinyCard = userProfile?.hand?.includes('mutiny');
  const userStash = userProfile?.stash || 0;
  const userRep = currentPlayer?.reputation || 0;

  // Voter Weight calculation
  let voterWeight = 1;
  if (userRep < 0) voterWeight = 0;
  else if (userRep === 0) voterWeight = 1;
  else if (userRep <= 3) voterWeight = 2;
  else if (userRep <= 6) voterWeight = 3;
  else voterWeight = 4;

  const seatedIds = new Set((launchData.seats || []).map(s => s.playerId));
  const unseatedPlayers = players.filter(p => !seatedIds.has(p.id) && !p.isDrowned);
  const userHasVoted = launchData.pendingVotes && !!launchData.pendingVotes[currentUserId];

  const handleVoteSubmit = async () => {
    if (!selectedVoteTarget) return;
    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await onSubmitVote(selectedVoteTarget);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit vote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuyoutSubmit = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await onSubmitBuyout(buyoutBid);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit buyout bid');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwimSubmit = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await onSubmitSwim();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to attempt swim');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMutinySubmit = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await onPlayMutiny(mutinyTargetSeat);
      setShowMutinyModal(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to orchestrate mutiny');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdvance = async () => {
    setIsConfirmSkipOpen(true);
  };

  const executeAdvance = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await onAdvanceStep();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to advance step');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="launch-phase-container" className="max-w-4xl mx-auto space-y-6">
      {/* Launch Banner */}
      <div className="wood-panel rounded-lg border border-[#3b4c68] p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#23334d]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-xs uppercase tracking-widest font-bold border border-amber-500/30">
                Phase 4 — The Launch
              </span>
              <span className="text-slate-500 font-mono text-xs">/</span>
              <span className="text-slate-400 font-mono text-xs uppercase">
                {launchData.state.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-black text-slate-100 mt-1 tracking-tight">
              Seat Assignment on the Escape Timber
            </h1>
          </div>

          <div className="px-4 py-2 rounded bg-[#0f1726] border border-[#26374f] text-right">
            <span className="text-[11px] font-mono uppercase text-slate-400">Seats Available</span>
            <p className="text-xl font-mono font-bold text-amber-400">
              {launchData.seats?.length || 0} / {launchData.totalSeats}
            </p>
          </div>
        </div>

        {/* GM Oblique Scene Narration */}
        {game.gmNarration && (
          <div className="my-4 p-4 rounded bg-[#0a101d] border border-[#1e2d42] flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-500 font-bold block mb-0.5">
                Game Master Record
              </span>
              <p className="text-sm font-serif italic text-slate-200 leading-relaxed">
                &ldquo;{game.gmNarration}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Raft Seats Visualizer */}
        <div className="my-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
              <Anchor className="w-4 h-4 text-amber-500" />
              Vessel Passenger Manifest
            </h3>
            {isCurrentSeated && (
              <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-600 text-emerald-400 text-xs font-mono font-bold">
                ✓ YOU ARE SEATED
              </span>
            )}
            {isCurrentDrowned && (
              <span className="px-2 py-0.5 rounded bg-red-950 border border-red-600 text-red-400 text-xs font-mono font-bold">
                ☠ DROWNED IN BREAKERS
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: launchData.totalSeats }).map((_, idx) => {
              const seatNum = idx + 1;
              const seat = (launchData.seats || []).find(s => s.seatNumber === seatNum);
              const isFilled = !!seat;
              const isYou = seat?.playerId === currentUserId;

              let methodLabel = 'Unassigned';
              if (seatNum === 1) methodLabel = "Provisioner's Claim";
              else if (seat?.method === 'vote') methodLabel = 'Democratic Vote';
              else if (seat?.method === 'buyout') methodLabel = 'Stash Buyout';
              else if (seat?.method === 'swim') methodLabel = 'Desperation Swim';

              return (
                <div
                  key={seatNum}
                  id={`raft-seat-${seatNum}`}
                  className={`p-3.5 rounded border transition-all ${
                    isFilled
                      ? isYou
                        ? 'bg-emerald-950/40 border-emerald-600/80 ring-1 ring-emerald-500/40'
                        : 'bg-[#121c2e] border-amber-600/60'
                      : 'bg-[#0b111c] border-[#1d2a3c] border-dashed'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono mb-2">
                    <span className="text-slate-400 font-bold">SEAT 0{seatNum}</span>
                    <span
                      className={`uppercase text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                        isFilled ? 'bg-amber-950 text-amber-400 border border-amber-800/60' : 'text-slate-600'
                      }`}
                    >
                      {seat?.method || (seatNum === 1 ? 'Provisioner' : 'Contested')}
                    </span>
                  </div>

                  <div className="min-h-[48px] flex flex-col justify-center">
                    {isFilled ? (
                      <div>
                        <p className="font-serif font-bold text-slate-100 text-sm truncate flex items-center gap-1.5">
                          {seat.playerName}
                          {isYou && <span className="text-emerald-400 font-mono text-xs">(YOU)</span>}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{methodLabel}</p>
                      </div>
                    ) : (
                      <div className="text-slate-600 text-xs font-mono italic">[ Empty Berth ]</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mutiny Button if player holds card */}
        {hasMutinyCard && userStash >= 2 && launchData.seats?.length > 0 && launchData.state !== 'done' && (
          <div className="mb-6 p-3 rounded bg-red-950/30 border border-red-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-400" />
              <span className="text-xs font-mono text-red-200">
                You hold the <strong className="text-red-400 uppercase">Mutiny</strong> Scheme Card (Cost: 2 Stash).
              </span>
            </div>
            <button
              id="open-mutiny-btn"
              onClick={() => setShowMutinyModal(true)}
              className="px-3 py-1.5 rounded bg-red-800 hover:bg-red-700 text-white font-mono text-xs font-bold transition-colors shadow"
            >
              Orchestrate Mutiny
            </button>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded bg-red-950/60 border border-red-700 text-red-300 text-xs font-mono">
            {errorMessage}
          </div>
        )}

        {/* STEP-BY-STEP INTERACTIVE WORKFLOW */}

        {/* STEP A: ROLL CALL */}
        {launchData.state === 'roll_call' && (
          <div className="p-5 rounded bg-[#0d1424] border border-[#213045] space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
              <Users className="w-4 h-4" />
              Step A — Roll Call & Available Berths
            </div>
            <p className="text-sm text-slate-300 font-sans leading-relaxed">
              The raft is complete, but space upon the lashed timbers is limited to{' '}
              <strong className="text-amber-400 font-mono">{launchData.totalSeats} seats</strong> for{' '}
              <strong className="text-slate-200 font-mono">{players.length} castaways</strong>. Seat assignment
              follows the strict survival hierarchy:
            </p>
            <ol className="text-xs font-mono text-slate-400 space-y-1.5 list-decimal list-inside bg-[#080d17] p-3.5 rounded border border-[#192436]">
              <li>
                <strong className="text-slate-200">Provisioner&apos;s Claim:</strong> Highest verified labor on
                Provisions takes Seat 1.
              </li>
              <li>
                <strong className="text-slate-200">Democratic Vote:</strong> Reputation-weighted secret vote fills
                contested seats.
              </li>
              <li>
                <strong className="text-slate-200">Stash Buyout:</strong> Escalating stash auctions (5, 8, 12 Stash)
                for remaining berths.
              </li>
              <li>
                <strong className="text-slate-200">Desperation Swim:</strong> A final check (d6 + energy/2) for the
                last seat. The losers drown.
              </li>
            </ol>
            <div className="pt-2 flex justify-end">
              <button
                id="advance-to-provisioner-btn"
                onClick={handleAdvance}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded font-bold text-xs uppercase tracking-wider bg-amber-600 hover:bg-amber-500 text-slate-950 flex items-center gap-2 font-mono transition-colors shadow-lg"
              >
                Proceed to Provisioner&apos;s Claim
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP B: PROVISIONER'S CLAIM */}
        {launchData.state === 'provisioner' && (
          <div className="p-5 rounded bg-[#0d1424] border border-[#213045] space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
              <Award className="w-4 h-4" />
              Step B — The Provisioner&apos;s Claim
            </div>
            <p className="text-sm text-slate-300 font-sans leading-relaxed">
              Seat 1 is claimed by the castaway who contributed the highest verified true labor to the Provisions
              stage.
            </p>
            <div className="pt-2 flex justify-end">
              <button
                id="proceed-to-vote-btn"
                onClick={handleAdvance}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded font-bold text-xs uppercase tracking-wider bg-amber-600 hover:bg-amber-500 text-slate-950 flex items-center gap-2 font-mono transition-colors shadow-lg"
              >
                Proceed to Democratic Vote
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP D: REPUTATION-WEIGHTED VOTE */}
        {launchData.state === 'vote' && (
          <div className="p-5 rounded bg-[#0d1424] border border-[#213045] space-y-4">
            <div className="flex items-center justify-between border-b border-[#1b263b] pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
                <Users className="w-4 h-4" />
                Step D — The Reputation-Weighted Vote
              </div>
              <div className="text-xs font-mono text-slate-400">
                Your Vote Weight:{' '}
                <span className="font-bold text-amber-400">
                  {voterWeight}x ({userRep > 0 ? `+${userRep}` : userRep} Rep)
                </span>
              </div>
            </div>

            {isCurrentSeated ? (
              <div className="p-4 rounded bg-[#0a111e] border border-[#1b273b] text-slate-400 font-mono text-xs">
                You are already seated aboard the vessel. Your vote is voided; watch the unseated decide who joins.
              </div>
            ) : userHasVoted ? (
              <div className="p-4 rounded bg-emerald-950/30 border border-emerald-800 text-emerald-300 font-mono text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Your ballot has been cast with {voterWeight}x weighted votes. Waiting for all castaways or host resolution...
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-300 font-mono">
                  Select one unseated castaway to vote into the next available berth (you may not vote for yourself):
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {unseatedPlayers
                    .filter(p => p.id !== currentUserId)
                    .map(player => (
                      <label
                        key={player.id}
                        className={`p-3 rounded border flex items-center justify-between cursor-pointer transition-colors ${
                          selectedVoteTarget === player.id
                            ? 'bg-amber-950/50 border-amber-500 text-amber-200 ring-1 ring-amber-500'
                            : 'bg-[#0a111e] border-[#1e2d42] text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="voteTarget"
                            value={player.id}
                            checked={selectedVoteTarget === player.id}
                            onChange={() => setSelectedVoteTarget(player.id)}
                            className="text-amber-500 focus:ring-0"
                          />
                          <span className="font-serif font-bold text-sm">{player.displayName}</span>
                        </div>
                        <span className="font-mono text-xs text-slate-400">
                          {player.reputation > 0 ? `+${player.reputation}` : player.reputation} Rep
                        </span>
                      </label>
                    ))}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    id="submit-launch-vote-btn"
                    onClick={handleVoteSubmit}
                    disabled={!selectedVoteTarget || isSubmitting}
                    className="px-5 py-2.5 rounded font-bold text-xs uppercase tracking-wider bg-amber-600 hover:bg-amber-500 text-slate-950 disabled:opacity-50 font-mono transition-colors shadow-lg"
                  >
                    Submit Ballot ({voterWeight}x Weight)
                  </button>
                </div>
              </div>
            )}

            {/* Host Resolve Vote Button */}
            {(isHost || userHasVoted) && (() => {
              const unseatedNonBots = unseatedPlayers.filter(p => !p.isBot);
              const unseatedNonBotVotes = unseatedNonBots.filter(p => launchData.pendingVotes && !!launchData.pendingVotes[p.id]).length;
              const allUnseatedNonBotsVoted = unseatedNonBots.every(p => launchData.pendingVotes && !!launchData.pendingVotes[p.id]);

              return (
                <div className="pt-3 border-t border-[#1b263b] flex flex-col sm:flex-row gap-3 justify-between items-center text-xs font-mono text-slate-500 w-full">
                  <div className="flex flex-col gap-0.5">
                    <span>
                      Human Voters: {unseatedNonBotVotes} / {unseatedNonBots.length} ({allUnseatedNonBotsVoted ? 'Complete' : 'Awaiting'})
                    </span>
                    <span className="text-[10px] text-slate-600">
                      Total Votes Cast: {Object.keys(launchData.pendingVotes || {}).length} / {unseatedPlayers.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {isHost && (
                      <div className="flex items-center gap-1.5 bg-[#0a111e]/80 px-2 py-1.5 rounded border border-[#1b2d42]">
                        <input
                          type="checkbox"
                          id="bmac-force-resolve-checkbox"
                          checked={forceResolveEnabled}
                          onChange={(e) => setForceResolveEnabled(e.target.checked)}
                          className="rounded border-[#23354d] text-amber-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                        />
                        <label htmlFor="bmac-force-resolve-checkbox" className="text-[10px] text-slate-300 font-bold uppercase tracking-wide cursor-pointer select-none">
                          Force Resolve
                        </label>
                      </div>
                    )}

                    <button
                      id="force-resolve-vote-btn"
                      onClick={handleAdvance}
                      disabled={isSubmitting || (!allUnseatedNonBotsVoted && !forceResolveEnabled)}
                      className={`px-3 py-1.5 rounded font-mono text-xs transition-colors ${
                        (!allUnseatedNonBotsVoted && !forceResolveEnabled)
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md'
                      }`}
                    >
                      Tally & Resolve Votes
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* STEP E: STASH BUYOUT */}
        {launchData.state === 'buyout' && (
          <div className="p-5 rounded bg-[#0d1424] border border-[#213045] space-y-4">
            <div className="flex items-center justify-between border-b border-[#1b263b] pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
                <Coins className="w-4 h-4" />
                Step E — The Stash Buyout
              </div>
              <div className="text-xs font-mono text-slate-400">
                Minimum Bid: <span className="font-bold text-amber-400">{launchData.buyoutPrice || 5} Stash</span>
              </div>
            </div>

            <p className="text-xs font-sans text-slate-300">
              Unseated castaways may barter their hoarded secret stash to purchase the next open berth. The highest
              bidder claims the seat.
            </p>

            {!isCurrentSeated && !isCurrentDrowned && (
              <div className="bg-[#090f1a] p-4 rounded border border-[#1b273b] space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Your Available Stash:</span>
                  <span className="font-bold text-amber-400">{userStash} Stash</span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={launchData.buyoutPrice || 5}
                    max={userStash}
                    value={buyoutBid}
                    onChange={e => setBuyoutBid(Math.max(launchData.buyoutPrice || 5, Number(e.target.value)))}
                    className="w-24 px-3 py-2 rounded bg-[#0e1624] border border-[#24344d] text-slate-100 font-mono text-sm"
                  />
                  <button
                    id="submit-buyout-bid-btn"
                    onClick={handleBuyoutSubmit}
                    disabled={userStash < (launchData.buyoutPrice || 5) || isSubmitting}
                    className="px-4 py-2 rounded font-bold text-xs uppercase tracking-wider bg-amber-600 hover:bg-amber-500 text-slate-950 disabled:opacity-50 font-mono transition-colors shadow"
                  >
                    Submit Buyout Bid ({buyoutBid} Stash)
                  </button>
                </div>
              </div>
            )}

            {/* Bids Live Log */}
            {launchData.buyouts && launchData.buyouts.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Tendered Bids</span>
                {launchData.buyouts.map((b, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs font-mono text-slate-300 py-1 border-b border-[#141d2c]">
                    <span>{b.playerName}</span>
                    <span className="text-amber-400 font-bold">{b.amount} Stash</span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                id="resolve-buyout-btn"
                onClick={handleAdvance}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded font-bold text-xs uppercase tracking-wider bg-amber-600 hover:bg-amber-500 text-slate-950 font-mono transition-colors shadow-lg"
              >
                Resolve Buyout Auction
              </button>
            </div>
          </div>
        )}

        {/* STEP F: DESPERATION SWIM */}
        {launchData.state === 'swim' && (
          <div className="p-5 rounded bg-[#0d1424] border border-[#213045] space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
              <Waves className="w-4 h-4" />
              Step F — The Desperation Swim
            </div>
            <p className="text-sm text-slate-300 font-sans leading-relaxed">
              Only one berth remains upon the floating timber. All remaining unseated castaways plunge into the freezing
              breakers in a final gamble:
            </p>
            <div className="p-3.5 rounded bg-[#080e18] border border-[#182335] text-xs font-mono text-slate-400 space-y-1">
              <div>• Roll: <strong className="text-slate-200">1d6 + ⌊ Energy / 2 ⌋</strong></div>
              <div>• Winner: Secures the final seat as <strong className="text-amber-400 font-bold">The Swimmer (+3 Rep)</strong>.</div>
              <div>• Losers: <strong className="text-red-400 font-bold">Drown in the surf.</strong></div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                id="resolve-swim-btn"
                onClick={handleSwimSubmit}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded font-bold text-xs uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white font-mono flex items-center gap-2 transition-colors shadow-lg"
              >
                <Waves className="w-4 h-4" />
                Attempt the Desperation Swim
              </button>
            </div>
          </div>
        )}

        {/* STEP G: THE LAUNCH (DONE) */}
        {launchData.state === 'done' && (
          <div className="p-5 rounded bg-[#0d1424] border border-[#213045] space-y-5">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider">
              <Anchor className="w-4 h-4" />
              Step G — The Raft Departs
            </div>

            {launchData.launchScene && (
              <div className="p-4 rounded bg-[#080e1a] border border-[#1c2a3e]">
                <p className="text-sm font-serif italic text-slate-200 leading-relaxed">
                  &ldquo;{launchData.launchScene}&rdquo;
                </p>
              </div>
            )}

            {/* Survivor / Stranded Roster */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 rounded bg-[#0c1626] border border-emerald-900/60">
                <span className="text-emerald-400 font-bold uppercase block mb-1">Seated Survivors</span>
                <ul className="space-y-1 text-slate-300">
                  {launchData.seats?.map(s => (
                    <li key={s.seatNumber} className="flex items-center justify-between">
                      <span>{s.playerName}</span>
                      <span className="text-[10px] text-slate-500">Seat {s.seatNumber}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded bg-[#0c1626] border border-amber-900/60">
                <span className="text-amber-400 font-bold uppercase block mb-1">Left On Strand</span>
                <ul className="space-y-1 text-slate-300">
                  {players
                    .filter(p => !seatedIds.has(p.id) && !(launchData.drownedPlayerIds || []).includes(p.id))
                    .map(p => (
                      <li key={p.id}>{p.displayName}</li>
                    ))}
                  {players.filter(p => !seatedIds.has(p.id) && !(launchData.drownedPlayerIds || []).includes(p.id)).length === 0 && (
                    <li className="text-slate-600 italic">None</li>
                  )}
                </ul>
              </div>

              <div className="p-3 rounded bg-[#0c1626] border border-red-900/60">
                <span className="text-red-400 font-bold uppercase block mb-1">Drowned</span>
                <ul className="space-y-1 text-slate-300">
                  {players
                    .filter(p => (launchData.drownedPlayerIds || []).includes(p.id) || p.isDrowned)
                    .map(p => (
                      <li key={p.id} className="text-red-300">{p.displayName}</li>
                    ))}
                  {players.filter(p => (launchData.drownedPlayerIds || []).includes(p.id) || p.isDrowned).length === 0 && (
                    <li className="text-slate-600 italic">None</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                id="view-endgame-summary-btn"
                onClick={onEndGame}
                className="px-5 py-2.5 rounded font-bold text-xs uppercase tracking-wider bg-amber-600 hover:bg-amber-500 text-slate-950 font-mono flex items-center gap-2 transition-colors shadow-lg"
              >
                View Final Reckoning
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mutiny Modal */}
      {showMutinyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="wood-panel rounded-lg border border-red-800/80 p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400 font-mono text-xs font-bold uppercase tracking-wider">
              <AlertTriangle className="w-5 h-5" />
              Covert Mutiny Scheme
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Spend <strong className="text-amber-400 font-mono">2 Stash</strong> to orchestrate an anonymous mutiny
              against an occupied seat. The occupant is dragged off the raft, and the seat is re-opened for voting.
            </p>

            <div className="space-y-2 font-mono text-xs">
              <label className="text-slate-400 block">Select Occupied Target Seat:</label>
              <div className="space-y-1.5">
                {(launchData.seats || []).map(s => (
                  <label
                    key={s.seatNumber}
                    className={`p-2.5 rounded border flex items-center justify-between cursor-pointer ${
                      mutinyTargetSeat === s.seatNumber
                        ? 'bg-red-950/60 border-red-500 text-red-200'
                        : 'bg-[#090f1b] border-[#1e2a3c] text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="mutinySeat"
                        value={s.seatNumber}
                        checked={mutinyTargetSeat === s.seatNumber}
                        onChange={() => setMutinyTargetSeat(s.seatNumber)}
                      />
                      <span>Seat {s.seatNumber}: <strong className="text-slate-200">{s.playerName}</strong></span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                id="cancel-mutiny-btn"
                onClick={() => setShowMutinyModal(false)}
                className="px-3 py-1.5 rounded bg-[#162132] text-slate-300 text-xs font-mono"
              >
                Cancel
              </button>
              <button
                id="confirm-mutiny-btn"
                onClick={handleMutinySubmit}
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded bg-red-700 hover:bg-red-600 text-white font-mono text-xs font-bold transition-colors"
              >
                Execute Mutiny (-2 Stash)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared Host Skip Timer Confirmation Modal */}
      <ConfirmSkipModal
        isOpen={isConfirmSkipOpen}
        onClose={() => setIsConfirmSkipOpen(false)}
        onConfirm={executeAdvance}
        title="Advance Launch Step?"
        description="Are you sure you want to end this launch step early? Active players still voting or managing their survival will lose their remaining time."
        awaitingCount={(() => {
          const unseatedPlayers = players.filter((p: any) => p.status !== 'marooned' && p.status !== 'abandoned' && !(launchData.seats || []).some((s: any) => s.playerId === p.id));
          const unseatedNonBots = unseatedPlayers.filter(p => !p.isBot);
          if (launchData.state === 'vote') {
            const unseatedNonBotVotes = unseatedNonBots.filter(p => launchData.pendingVotes && !!launchData.pendingVotes[p.id]).length;
            return unseatedNonBots.length - unseatedNonBotVotes;
          } else if (launchData.state === 'buyout') {
            const bidPlayerIds = new Set((launchData.buyouts || []).map(b => b.playerId));
            return unseatedNonBots.filter(p => !bidPlayerIds.has(p.id)).length;
          }
          return unseatedNonBots.length;
        })()}
        awaitingLabel={launchData.state === 'vote' ? "human players who haven't cast their roll-call vote" : launchData.state === 'buyout' ? "human players who haven't submitted a buyout bid" : "human players eligible to act"}
      />
    </div>
  );
};
