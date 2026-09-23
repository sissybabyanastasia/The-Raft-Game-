import React, { useState } from 'react';
import { Scroll, CheckCircle, Vote, Award, ShieldAlert, ArrowRight, Check } from 'lucide-react';
import type { GameData, PlayerData, ConstitutionClauseId } from '../types.js';
import { CONSTITUTION_CLAUSES } from '../lib/constitution.js';
import { ConfirmSkipModal } from './ConfirmSkipModal.js';

interface FoundingPhaseViewProps {
  game: GameData;
  players: PlayerData[];
  currentUserId: string;
  isHost: boolean;
  onVoteClause: (clauseId: ConstitutionClauseId, choice: 'A' | 'B') => Promise<void>;
  onResolveFounding: () => Promise<void>;
  isLoading: boolean;
}

export const FoundingPhaseView: React.FC<FoundingPhaseViewProps> = ({
  game,
  players,
  currentUserId,
  isHost,
  onVoteClause,
  onResolveFounding,
  isLoading,
}) => {
  const founding = game.foundingData;
  const drawnClauses = founding?.drawnClauses || [];
  const myVotes = founding?.votes?.[currentUserId] || {};

  const [selectedChoices, setSelectedChoices] = useState<Record<string, 'A' | 'B'>>({});
  const [isConfirmSkipOpen, setIsConfirmSkipOpen] = useState<boolean>(false);

  const handleSelect = (clauseId: ConstitutionClauseId, choice: 'A' | 'B') => {
    setSelectedChoices((prev) => ({ ...prev, [clauseId]: choice }));
    onVoteClause(clauseId, choice);
  };

  const totalPlayers = players.length;
  const votersCount = Object.keys(founding?.votes || {}).length;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 my-4 space-y-6 animate-fadeIn">
      {/* Convention Header */}
      <div className="wood-panel rounded-lg border border-[#23334d] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1c283c]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-amber-950/50 border border-amber-800/60 flex items-center justify-center text-amber-400">
              <Scroll className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-amber-500 font-mono text-xs uppercase tracking-widest font-semibold">
                  Satire Mode
                </span>
                <span className="text-slate-600 text-xs">/</span>
                <span className="text-slate-400 font-mono text-xs uppercase">The Founding Convention</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-100 mt-1">
                Ratify the Constitution of the Isle
              </h1>
            </div>
          </div>

          <div className="bg-[#0a101b] border border-[#1b263b] px-4 py-2.5 rounded text-right">
            <div className="text-[10px] font-mono uppercase text-slate-500">Convention Ballots</div>
            <div className="text-sm font-mono font-bold text-amber-400">
              {votersCount} / {totalPlayers} Castaways Voted
            </div>
          </div>
        </div>

        <p className="text-xs font-mono text-slate-300 mt-4 leading-relaxed">
          Before a single timber is lashed, the castaways must establish their laws. Three clauses have been drawn from the archives. Cast your vote on each article to define the balance of power, property, and punishment.
        </p>

        {/* 3 Drawn Clauses */}
        <div className="mt-6 space-y-6">
          {drawnClauses.map((clauseId, idx) => {
            const def = CONSTITUTION_CLAUSES[clauseId];
            if (!def) return null;

            const myChoice = selectedChoices[clauseId] || myVotes[clauseId];

            return (
              <div
                key={clauseId}
                id={`founding-clause-card-${clauseId}`}
                className="p-5 rounded-lg bg-[#0d1522] border border-[#22334b] space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded bg-[#162235] border border-[#2b3e5c] flex items-center justify-center text-xs font-mono font-bold text-amber-400">
                      {idx + 1}
                    </span>
                    <h2 className="font-serif font-bold text-lg text-slate-100">
                      {def.title}
                    </h2>
                  </div>
                  {myChoice && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 flex items-center gap-1 font-bold">
                      <Check className="w-3 h-3" /> Voted: Option {myChoice}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Option A */}
                  <button
                    id={`vote-${clauseId}-A-btn`}
                    onClick={() => handleSelect(clauseId, 'A')}
                    disabled={isLoading}
                    className={`p-4 rounded-lg border text-left flex flex-col justify-between transition-all ${
                      myChoice === 'A'
                        ? 'bg-[#18263d] border-amber-500 shadow-md ring-1 ring-amber-500/50'
                        : 'bg-[#0a0f19] border-[#1d2b3f] hover:border-[#2f4362] hover:bg-[#10192a]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-serif font-bold text-sm text-slate-100">
                          Option A: {def.optionA.label}
                        </span>
                        {myChoice === 'A' && <CheckCircle className="w-4 h-4 text-amber-400" />}
                      </div>
                      <p className="text-xs font-mono text-slate-400 leading-relaxed">
                        {def.optionA.desc}
                      </p>
                    </div>
                    <div className="mt-3 text-[10px] font-mono text-slate-500 uppercase">
                      Click to vote Option A
                    </div>
                  </button>

                  {/* Option B */}
                  <button
                    id={`vote-${clauseId}-B-btn`}
                    onClick={() => handleSelect(clauseId, 'B')}
                    disabled={isLoading}
                    className={`p-4 rounded-lg border text-left flex flex-col justify-between transition-all ${
                      myChoice === 'B'
                        ? 'bg-[#18263d] border-amber-500 shadow-md ring-1 ring-amber-500/50'
                        : 'bg-[#0a0f19] border-[#1d2b3f] hover:border-[#2f4362] hover:bg-[#10192a]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-serif font-bold text-sm text-slate-100">
                          Option B: {def.optionB.label}
                        </span>
                        {myChoice === 'B' && <CheckCircle className="w-4 h-4 text-amber-400" />}
                      </div>
                      <p className="text-xs font-mono text-slate-400 leading-relaxed">
                        {def.optionB.desc}
                      </p>
                    </div>
                    <div className="mt-3 text-[10px] font-mono text-slate-500 uppercase">
                      Click to vote Option B
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Footer */}
        <div className="mt-6 pt-6 border-t border-[#1c283c] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-mono text-slate-400">
            {drawnClauses.every((c) => myVotes[c] || selectedChoices[c])
              ? '✓ All your constitutional votes have been recorded.'
              : 'Cast your ballot on all 3 clauses above.'}
          </div>

          {isHost && (
            <button
              id="ratify-constitution-btn"
              onClick={() => setIsConfirmSkipOpen(true)}
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-3 rounded font-mono font-bold text-sm tracking-wider uppercase bg-[#ea580c] hover:bg-[#c2410c] text-white disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
            >
              <Scroll className="w-4 h-4" />
              Ratify & Call First Election
            </button>
          )}
        </div>
      </div>

      {/* Shared Host Skip Timer Confirmation Modal */}
      <ConfirmSkipModal
        isOpen={isConfirmSkipOpen}
        onClose={() => setIsConfirmSkipOpen(false)}
        onConfirm={onResolveFounding}
        title="Ratify Constitution Early?"
        description="Are you sure you want to ratify the constitution now? Any active players who haven't finished voting on all clauses will have their choices randomized/defaulted."
        awaitingCount={(() => {
          const activeNonBots = players.filter((p: any) => !p.isBot && p.status !== 'marooned' && p.status !== 'abandoned');
          const votes = founding?.votes || {};
          return activeNonBots.filter(p => {
            const pVotes = votes[p.id];
            return !pVotes || Object.keys(pVotes).length < drawnClauses.length;
          }).length;
        })()}
        awaitingLabel="human players who haven't completed their constitutional ballots"
      />
    </div>
  );
};
