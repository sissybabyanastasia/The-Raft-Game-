import React, { useState, useMemo } from 'react';
import { Landmark, Vote, Award, CheckCircle2, User, AlertCircle, ArrowRight, Plus } from 'lucide-react';
import type { GameData, PlayerData, PrivatePlayerProfile, ElectionNominee } from '../types.js';

interface ElectionPhaseViewProps {
  game: GameData;
  players: PlayerData[];
  currentUserId: string;
  userProfile: PrivatePlayerProfile | null;
  isHost: boolean;
  onNominate: (promiseText: string) => Promise<void>;
  onVote: (targetNomineeId: string) => Promise<void>;
  onAdvanceStage: (force?: boolean) => Promise<void>;
  onResolveElection: () => Promise<void>;
  isLoading: boolean;
}

const PROMISE_PRESETS = [
  'I will deliver at least 2 Labor every single round.',
  'I will not embezzle a single timber from our raft.',
  'I will audit all slackers and protect honest workers.',
  'I will maintain order, tranquility, and public trust.',
];

export const ElectionPhaseView: React.FC<ElectionPhaseViewProps> = ({
  game,
  players,
  currentUserId,
  userProfile,
  isHost,
  onNominate,
  onVote,
  onAdvanceStage,
  onResolveElection,
  isLoading,
}) => {
  const election = game.activeElection;
  const stage = election?.stage || 'nomination';
  const serverNominees = election?.nominees || [];
  const votes = election?.votes || {};

  const [promiseInput, setPromiseInput] = useState('');
  const [selectedVoteNomineeId, setSelectedVoteNomineeId] = useState<string>('');
  const [localNominee, setLocalNominee] = useState<ElectionNominee | null>(null);
  const [showLateNomination, setShowLateNomination] = useState(false);

  const myPlayer = players.find((p) => p.id === currentUserId);
  const myStash = userProfile?.stash ?? myPlayer?.stash ?? 0;

  // 1. Gather all self-nominated candidates (server + immediate local registration)
  const allSelfNominated: ElectionNominee[] = useMemo(() => {
    const list = [...serverNominees];
    if (localNominee && !list.some((n) => n.playerId === localNominee.playerId)) {
      list.push(localNominee);
    }
    return list;
  }, [serverNominees, localNominee]);

  const alreadyNominated = allSelfNominated.some((n) => n.playerId === currentUserId);
  const myVote = votes[currentUserId] || selectedVoteNomineeId;

  // 2. Build ballot nominee list:
  // - Always include all self-nominated players
  // - If nominee list is empty (0 candidates), include all active colony players so list is never empty
  // - If nominee count is low (e.g. 1 candidate) in voting stage, also offer remaining colony members as write-ins
  //   so voters have choices and voting is always permitted
  const ballotNominees: ElectionNominee[] = useMemo(() => {
    if (allSelfNominated.length === 0) {
      return players.map((p) => ({
        playerId: p.id,
        playerName: p.displayName || 'A Castaway',
        promise: 'Colony service, order, and honest survival for Driftwood.',
        votesReceived: 0,
      }));
    }

    if (stage === 'vote' && allSelfNominated.length < 2 && players.length > 1) {
      const writeIns = players
        .filter((p) => !allSelfNominated.some((sn) => sn.playerId === p.id))
        .map((p) => ({
          playerId: p.id,
          playerName: p.displayName || 'A Castaway',
          promise: 'Colony write-in candidate.',
          votesReceived: 0,
        }));
      return [...allSelfNominated, ...writeIns];
    }

    return allSelfNominated;
  }, [allSelfNominated, players, stage]);

  const handleNominateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promiseInput.trim()) return;
    const text = promiseInput.trim();
    const immediateNom: ElectionNominee = {
      playerId: currentUserId,
      playerName: myPlayer?.displayName || 'You',
      promise: text,
      votesReceived: 0,
    };
    setLocalNominee(immediateNom);
    onNominate(text);
    setPromiseInput('');
    setShowLateNomination(false);
  };

  const handleVoteSubmit = (nomineeId: string) => {
    setSelectedVoteNomineeId(nomineeId);
    onVote(nomineeId);
  };

  const filingCost = myStash >= 1 ? 1 : 0;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 my-4 space-y-6 animate-fadeIn">
      <div className="wood-panel rounded-lg border border-[#23334d] p-6 sm:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1c283c]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-amber-950/50 border border-amber-800/60 flex items-center justify-center text-amber-400">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-amber-500 font-mono text-xs uppercase tracking-widest font-semibold">
                  Round {game.round}
                </span>
                <span className="text-slate-600 text-xs">/</span>
                <span className="text-slate-400 font-mono text-xs uppercase">Gubernatorial Election</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-100 mt-1">
                {stage === 'nomination'
                  ? 'Stage 1: Declaration of Candidacy'
                  : stage === 'campaign'
                  ? 'Stage 2: Campaign & Platform Review'
                  : 'Stage 3: The General Ballot'}
              </h1>
            </div>
          </div>

          <div className="bg-[#0a101b] border border-[#1b263b] px-4 py-2.5 rounded text-right font-mono">
            <div className="text-[10px] uppercase text-slate-500">Election Stage</div>
            <div className="text-sm font-bold text-amber-400 uppercase">
              {stage}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="my-4 p-3 rounded bg-[#090f19] border border-[#1b283d] text-xs font-mono text-slate-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            {stage === 'nomination' && (
              <span>
                Any castaway may file for Governor. If you have Stash, filing costs 1 Stash (refunded if you receive 0 votes); grassroots candidates file for 0 Stash.
              </span>
            )}
            {stage === 'campaign' && (
              <span>
                Review the campaign promises of all declared candidates. Candidates with measurable promises will gain or lose public reputation when evaluated at term end.
              </span>
            )}
            {stage === 'vote' && (
              <span>
                Cast your vote for Governor from the ballot below. All candidates and write-in nominees are eligible; deadlocks are resolved by public reputation.
              </span>
            )}
          </div>
        </div>

        {/* STAGE 1: NOMINATION FORM (OR LATE NOMINATION IN LATER STAGES) */}
        {(stage === 'nomination' || showLateNomination) && (
          <div className="mt-6 space-y-6">
            {!alreadyNominated ? (
              <form onSubmit={handleNominateSubmit} className="p-5 rounded-lg bg-[#0d1522] border border-[#22334b] space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif font-bold text-base text-slate-100">
                    File for the Gubernatorial Office
                  </h2>
                  <span className="text-xs font-mono text-amber-400">
                    Cost: {filingCost} Stash {myStash === 0 ? '(Grassroots filing)' : `(Your Stash: ${myStash})`}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Campaign Promise (Max 120 chars — evaluated by the GM at term end)
                  </label>
                  <input
                    id="campaign-promise-input"
                    type="text"
                    maxLength={120}
                    value={promiseInput}
                    onChange={(e) => setPromiseInput(e.target.value)}
                    placeholder="e.g., I will deliver at least 2 Labor every round..."
                    className="w-full px-3.5 py-2.5 rounded bg-[#070b13] border border-[#1c293d] focus:border-amber-500 text-slate-100 font-mono text-sm outline-none transition-colors"
                  />
                </div>

                {/* Presets */}
                <div>
                  <div className="text-[11px] font-mono text-slate-500 mb-1.5 uppercase">
                    Suggested Promises:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PROMISE_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPromiseInput(preset)}
                        className="text-left p-2 rounded bg-[#090e18] hover:bg-[#121c2c] border border-[#1a273b] text-xs font-mono text-slate-300 transition-colors"
                      >
                        "{preset}"
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  {stage !== 'nomination' && (
                    <button
                      type="button"
                      onClick={() => setShowLateNomination(false)}
                      className="px-3 py-1.5 rounded text-xs font-mono text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </button>
                  )}
                  <div className="ml-auto">
                    <button
                      id="submit-nomination-btn"
                      type="submit"
                      disabled={!promiseInput.trim() || isLoading}
                      className="px-5 py-2.5 rounded font-mono font-bold text-xs uppercase tracking-wider bg-amber-600 hover:bg-amber-500 text-slate-950 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                    >
                      <Award className="w-4 h-4" />
                      File Candidacy ({filingCost} Stash)
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-800/40 text-xs font-mono text-amber-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                <span>You have filed your candidacy for Governor. You are officially registered on the ballot.</span>
              </div>
            )}
          </div>
        )}

        {/* LATE NOMINATION TRIGGER (If not nominated and in campaign/vote stage) */}
        {stage !== 'nomination' && !alreadyNominated && !showLateNomination && (
          <div className="mt-4 p-3 rounded-lg bg-[#0d1624] border border-[#202e42] flex items-center justify-between gap-3">
            <div className="text-xs font-mono text-slate-300">
              You haven't declared your candidacy yet. Want to run for Governor?
            </div>
            <button
              id="open-late-nomination-btn"
              onClick={() => setShowLateNomination(true)}
              className="px-3 py-1.5 rounded font-mono font-bold text-xs bg-amber-600/80 hover:bg-amber-500 text-slate-950 transition-colors flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Self-Nominate Now
            </button>
          </div>
        )}

        {/* NOMINEES LIST ON BALLOT */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400">
              {stage === 'vote' ? 'Ballot Nominees' : 'Registered Candidates'} ({ballotNominees.length})
            </h2>
            {allSelfNominated.length === 0 && (
              <span className="text-[11px] font-mono text-amber-400">
                All colony members eligible
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            {ballotNominees.map((nom) => {
              const isMe = nom.playerId === currentUserId;
              const isSelfNominated = allSelfNominated.some((sn) => sn.playerId === nom.playerId);
              const isSelected = selectedVoteNomineeId === nom.playerId || myVote === nom.playerId;
              const voteCount = Object.values(votes).filter((v) => v === nom.playerId).length;

              return (
                <div
                  key={nom.playerId}
                  id={`nominee-card-${nom.playerId}`}
                  className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                    isSelected
                      ? 'bg-[#18263d] border-amber-500 ring-1 ring-amber-500/40'
                      : 'bg-[#0d1522] border-[#1d2b3e]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <User className="w-4 h-4 text-amber-400" />
                      <span className="font-serif font-bold text-slate-100 text-sm sm:text-base">
                        {nom.playerName}
                      </span>
                      {isMe && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800/40">
                          YOU
                        </span>
                      )}
                      {isSelfNominated ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700/40 font-semibold">
                          DECLARED CANDIDATE
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          BALLOT ELIGIBLE
                        </span>
                      )}
                      {allSelfNominated.length === 1 && isSelfNominated && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-800/40 font-bold">
                          UNOPPOSED CANDIDATE
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-slate-300 italic">
                      "{nom.promise}"
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {stage === 'vote' && (
                      <button
                        id={`vote-candidate-${nom.playerId}-btn`}
                        onClick={() => handleVoteSubmit(nom.playerId)}
                        disabled={isLoading}
                        className={`px-4 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider transition-colors ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 ring-1 ring-amber-400 font-extrabold shadow-md'
                            : 'bg-[#152236] hover:bg-[#1e2e48] border border-[#273852] text-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ Voted' : 'Vote'}
                      </button>
                    )}

                    <div className="text-xs font-mono text-slate-400 bg-[#080d16] px-2.5 py-1 rounded border border-[#1b2639]">
                      {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="mt-6 pt-6 border-t border-[#1c283c] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-mono text-slate-400">
            {stage === 'nomination' && 'Candidates file platform and promise.'}
            {stage === 'campaign' && 'Debate, negotiate, and prepare for voting.'}
            {stage === 'vote' && `${Object.keys(votes).length} ballots cast so far.`}
          </div>

          {isHost && (
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
              {stage !== 'vote' ? (
                <>
                  {stage === 'nomination' && serverNominees.length === 0 && (
                    <button
                      id="force-advance-election-stage-btn"
                      onClick={() => onAdvanceStage(true)}
                      disabled={isLoading}
                      className="px-3 py-1.5 rounded font-mono text-[10px] uppercase bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 transition-colors cursor-pointer"
                    >
                      Force Advance (No Nominees)
                    </button>
                  )}
                  <button
                    id="advance-election-stage-btn"
                    onClick={() => onAdvanceStage(false)}
                    disabled={isLoading}
                    className="px-5 py-2.5 rounded font-mono font-bold text-xs uppercase tracking-wider bg-[#ea580c] hover:bg-[#c2410c] text-white disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Advance to {stage === 'nomination' ? 'Campaign' : 'Voting'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <button
                  id="resolve-election-btn"
                  onClick={onResolveElection}
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded font-mono font-bold text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-lg cursor-pointer"
                >
                  <Vote className="w-4 h-4" />
                  Tally Ballots & Inaugurate
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
