import React from 'react';
import { Scale, AlertTriangle, User, Check, X, ShieldAlert, FileText, Gavel } from 'lucide-react';
import type { GameData, PlayerData, ImpeachmentData } from '../types.js';

interface ImpeachmentModalProps {
  game: GameData;
  players: PlayerData[];
  currentUserId: string;
  isHost: boolean;
  onVote: (inFavor: boolean) => Promise<void>;
  onResolve: () => Promise<void>;
  isLoading: boolean;
}

export const ImpeachmentModal: React.FC<ImpeachmentModalProps> = ({
  game,
  players,
  currentUserId,
  isHost,
  onVote,
  onResolve,
  isLoading,
}) => {
  const impeachment = game.activeImpeachment;
  if (!impeachment) return null;

  const isGovernor = currentUserId === impeachment.governorId;
  const isFiler = currentUserId === impeachment.filerId;
  const myVote = impeachment.votes?.[currentUserId];
  const votes = impeachment.votes || {};

  const inFavorVotes = Object.values(votes).filter((v) => v === true).length;
  const againstVotes = Object.values(votes).filter((v) => v === false).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn font-mono">
      <div className="relative w-full max-w-lg bg-[#0c1322] border border-red-900/60 rounded-lg shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-[#1c293d]">
          <div className="w-10 h-10 rounded bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-400 shrink-0">
            <Gavel className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase text-red-400 font-bold tracking-wider">
              Constitutional Inquest
            </div>
            <h2 className="text-xl font-serif font-bold text-slate-100">
              Articles of Impeachment
            </h2>
          </div>
        </div>

        {/* Narrative Box */}
        <div className="p-4 rounded-lg bg-[#080d17] border border-[#1b273b] space-y-2 text-xs text-slate-300">
          <div className="flex items-center justify-between text-slate-400">
            <span>Filer: <strong className="text-amber-400">{impeachment.filerName}</strong> (Cost: 2 Stash)</span>
            <span>Target: <strong className="text-red-400">{impeachment.governorName}</strong></span>
          </div>
          <p className="italic text-slate-400">
            "The Governor stands accused of high negligence, embezzlement, and betrayal of the survival pact."
          </p>
        </div>

        {/* Stakes Warning */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
          <div className="p-2.5 rounded bg-[#0b101c] border border-red-900/30">
            <span className="text-red-300 font-bold block mb-1">If Impeached:</span>
            Governor loses -5 Rep, is stripped of office, and secret embezzlement records are exposed to all.
          </div>
          <div className="p-2.5 rounded bg-[#0b101c] border border-emerald-900/30">
            <span className="text-emerald-300 font-bold block mb-1">If Acquitted:</span>
            Governor gains +3 Rep (surviving a coup), Filer loses -4 Rep for reckless sedition.
          </div>
        </div>

        {/* Voting UI */}
        {!impeachment.resolved && (
          <div className="space-y-3 pt-2 border-t border-[#1c293d]">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Castaway Ballots ({Object.keys(votes).length} cast)</span>
              <span className="text-slate-300">
                Favor: <strong className="text-red-400">{inFavorVotes}</strong> | Oppose: <strong className="text-emerald-400">{againstVotes}</strong>
              </span>
            </div>

            {isGovernor ? (
              <div className="p-3 rounded bg-[#090f1a] border border-[#1d2b3f] text-center text-xs text-slate-400 italic">
                You are on trial. The Governor is constitutionally barred from voting in their own impeachment.
              </div>
            ) : myVote !== undefined ? (
              <div className="p-3 rounded bg-[#090f1a] border border-[#1d2b3f] text-center text-xs text-slate-300 flex items-center justify-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>You voted: <strong className="text-amber-400">{myVote ? 'IMPEACH (Yes)' : 'ACQUIT (No)'}</strong></span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  id="vote-impeach-yes-btn"
                  onClick={() => onVote(true)}
                  disabled={isLoading}
                  className="py-3 px-4 rounded bg-red-950/60 hover:bg-red-900/80 border border-red-800/60 text-red-200 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Impeach & Remove
                </button>
                <button
                  id="vote-impeach-no-btn"
                  onClick={() => onVote(false)}
                  disabled={isLoading}
                  className="py-3 px-4 rounded bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/60 text-emerald-200 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Acquit Governor
                </button>
              </div>
            )}
          </div>
        )}

        {/* Resolved view */}
        {impeachment.resolved && (
          <div className="p-4 rounded bg-[#070c14] border border-[#1b263b] text-center text-xs space-y-1">
            <div className="font-bold text-sm text-slate-100 uppercase tracking-wider">
              Outcome: {impeachment.outcome === 'impeached' ? 'IMPEACHED & REMOVED' : 'ACQUITTED & SURVIVED'}
            </div>
            <p className="text-slate-400">
              {impeachment.outcome === 'impeached'
                ? `${impeachment.governorName} was removed from office.`
                : `${impeachment.governorName} retains the Governorship.`}
            </p>
          </div>
        )}

        {/* Host Resolve Control */}
        {isHost && !impeachment.resolved && (
          <div className="pt-2 flex justify-end">
            <button
              id="resolve-impeachment-btn"
              onClick={onResolve}
              disabled={isLoading}
              className="px-5 py-2.5 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Resolve Inquest
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
