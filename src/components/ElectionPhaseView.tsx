import React, { useState } from 'react';
import { Landmark, Vote, Award, CheckCircle2, User, Sparkles, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import type { GameData, PlayerData, PrivatePlayerProfile, ElectionNominee } from '../types.js';

interface ElectionPhaseViewProps {
  game: GameData;
  players: PlayerData[];
  currentUserId: string;
  userProfile: PrivatePlayerProfile | null;
  isHost: boolean;
  onNominate: (promiseText: string) => Promise<void>;
  onVote: (targetNomineeId: string) => Promise<void>;
  onAdvanceStage: () => Promise<void>;
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
  const nominees = election?.nominees || [];
  const votes = election?.votes || {};

  const [promiseInput, setPromiseInput] = useState('');
  const [selectedVoteNomineeId, setSelectedVoteNomineeId] = useState<string>('');

  const myPlayer = players.find((p) => p.id === currentUserId);
  const myStash = userProfile?.stash ?? 0;
  const alreadyNominated = nominees.some((n) => n.playerId === currentUserId);
  const myVote = votes[currentUserId];

  const handleNominateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promiseInput.trim()) return;
    onNominate(promiseInput.trim());
    setPromiseInput('');
  };

  const handleVoteSubmit = (nomineeId: string) => {
    setSelectedVoteNomineeId(nomineeId);
    onVote(nomineeId);
  };

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
                Any castaway with at least <strong>1 Stash</strong> may file for Governor. If you receive 0 votes at the ballot, your 1 Stash is refunded in full.
              </span>
            )}
            {stage === 'campaign' && (
              <span>
                Review the campaign promises of all candidates. Candidates with measurable promises will gain or lose public reputation when evaluated at term end.
              </span>
            )}
            {stage === 'vote' && (
              <span>
                Cast your vote for Governor. You <strong>cannot vote for yourself</strong>. In the event of a tie, highest reputation breaks the deadlock.
              </span>
            )}
          </div>
        </div>

        {/* STAGE 1: NOMINATION FORM */}
        {stage === 'nomination' && (
          <div className="mt-6 space-y-6">
            {!alreadyNominated ? (
              <form onSubmit={handleNominateSubmit} className="p-5 rounded-lg bg-[#0d1522] border border-[#22334b] space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif font-bold text-base text-slate-100">
                    File for the Gubernatorial Office
                  </h2>
                  <span className="text-xs font-mono text-amber-400">
                    Cost: 1 Stash (Your Stash: {myStash})
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

                <div className="flex justify-end pt-2">
                  <button
                    id="submit-nomination-btn"
                    type="submit"
                    disabled={!promiseInput.trim() || myStash < 1 || isLoading}
                    className="px-5 py-2.5 rounded font-mono font-bold text-xs uppercase tracking-wider bg-amber-600 hover:bg-amber-500 text-slate-950 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                  >
                    <Award className="w-4 h-4" />
                    File Candidacy (1 Stash)
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-800/40 text-xs font-mono text-amber-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                <span>You have filed your candidacy for Governor. Awaiting close of nominations.</span>
              </div>
            )}
          </div>
        )}

        {/* NOMINEES LIST (Visible in all stages) */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Registered Candidates ({nominees.length})
            </h2>
          </div>

          {nominees.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-slate-500 border border-dashed border-[#1e2a3c] rounded">
              No castaways have filed for office yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {nominees.map((nom) => {
                const isMe = nom.playerId === currentUserId;
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
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-amber-400" />
                        <span className="font-serif font-bold text-slate-100 text-sm sm:text-base">
                          {nom.playerName}
                        </span>
                        {isMe && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800/40">
                            YOU
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-slate-300 italic">
                        "{nom.promise}"
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {stage === 'vote' && !isMe && (
                        <button
                          id={`vote-candidate-${nom.playerId}-btn`}
                          onClick={() => handleVoteSubmit(nom.playerId)}
                          disabled={isLoading}
                          className={`px-4 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider transition-colors ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-[#152236] hover:bg-[#1e2e48] border border-[#273852] text-slate-200'
                          }`}
                        >
                          {isSelected ? '✓ Voted' : 'Vote'}
                        </button>
                      )}

                      {stage === 'vote' && isMe && (
                        <span className="text-[11px] font-mono text-slate-500 italic">
                          (Cannot vote for self)
                        </span>
                      )}

                      {isHost && (
                        <div className="text-xs font-mono text-slate-400 bg-[#080d16] px-2.5 py-1 rounded border border-[#1b2639]">
                          {voteCount} votes
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="mt-6 pt-6 border-t border-[#1c283c] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-mono text-slate-400">
            {stage === 'nomination' && 'Candidates file platform and promise.'}
            {stage === 'campaign' && 'Debate, negotiate, and prepare for voting.'}
            {stage === 'vote' && `${Object.keys(votes).length} ballots cast so far.`}
          </div>

          {isHost && (
            <div className="flex items-center gap-2">
              {stage !== 'vote' ? (
                <button
                  id="advance-election-stage-btn"
                  onClick={onAdvanceStage}
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded font-mono font-bold text-xs uppercase tracking-wider bg-[#ea580c] hover:bg-[#c2410c] text-white disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  <span>Advance to {stage === 'nomination' ? 'Campaign' : 'Voting'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  id="resolve-election-btn"
                  onClick={onResolveElection}
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded font-mono font-bold text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-lg"
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
