import React, { useState } from 'react';
import {
  X,
  Sparkles,
  AlertTriangle,
  User,
  Shield,
  EyeOff,
  Flame,
  FileSpreadsheet,
  Coins,
  ArrowRight,
} from 'lucide-react';
import type { SchemeCardId, SchemeCardDefinition, PlayerData, PrivatePlayerProfile } from '../types.js';
import { SCHEME_CARDS, canPlaySaint } from '../lib/cards.js';

interface CardPlayModalProps {
  cardId: SchemeCardId | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmPlay: (cardId: SchemeCardId, targetId?: string) => Promise<void>;
  otherPlayers: PlayerData[];
  profile: PrivatePlayerProfile | null;
  currentPhase: 'scavenge' | 'resolution' | 'ledger';
  currentLabor?: number;
  currentClaimedLabor?: number;
  isWindowActive?: boolean;
  hasPlayedCardThisRound?: boolean;
  isLoading: boolean;
}

export const CardPlayModal: React.FC<CardPlayModalProps> = ({
  cardId,
  isOpen,
  onClose,
  onConfirmPlay,
  otherPlayers,
  profile,
  currentPhase,
  currentLabor = 0,
  currentClaimedLabor = 0,
  isWindowActive = true,
  hasPlayedCardThisRound = false,
  isLoading,
}) => {
  if (!isOpen || !cardId) return null;

  const card = SCHEME_CARDS[cardId];
  if (!card) return null;

  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const playerStash = profile?.stash || 0;
  const hasEnoughStash = playerStash >= card.costStash;
  const isPhaseValid =
    (card.timing === 'scavenge' && currentPhase === 'scavenge') ||
    (card.timing === 'resolution' && currentPhase === 'resolution' && isWindowActive);

  // Saint validation
  const isSaintValid = cardId !== 'saint' || canPlaySaint({
    trueLabor: currentLabor,
    claimedLabor: currentClaimedLabor,
  });

  const handleConfirm = async () => {
    if (isSubmitting || isLoading) return;
    setError(null);

    if (hasPlayedCardThisRound) {
      setError('You have already played a Scheme card for this round.');
      return;
    }
    if (currentPhase === 'resolution' && !isWindowActive) {
      setError('The resolution window has closed. The overnight tally is underway.');
      setTimeout(() => onClose(), 1500);
      return;
    }
    if (!isPhaseValid) {
      setError(`This card must be played during the ${card.timing.toUpperCase()} phase.`);
      return;
    }
    if (!hasEnoughStash) {
      setError(`Insufficient stash. You need ${card.costStash} stash to play this card.`);
      return;
    }
    if (card.requiresTarget && !selectedTargetId) {
      setError('Please select a target castaway for this scheme.');
      return;
    }
    if (cardId === 'saint' && !isSaintValid) {
      setError('Saint card requires your true physical Labor to be greater than or equal to your claimed Labor.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmPlay(cardId, selectedTargetId || undefined);
      onClose();
    } catch (err: any) {
      const errMsg = err.message || 'Failed to play card.';
      if (
        errMsg.toLowerCase().includes('at most 1') ||
        errMsg.toLowerCase().includes('already played')
      ) {
        setError('A Scheme card has already been registered for you this round.');
        setTimeout(() => onClose(), 1600);
      } else if (
        errMsg.toLowerCase().includes('closed') ||
        errMsg.toLowerCase().includes('tally') ||
        errMsg.toLowerCase().includes('transition')
      ) {
        setError('The resolution window has closed. The overnight tally is underway.');
        setTimeout(() => onClose(), 1600);
      } else {
        setError(errMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        id="card-play-modal"
        className="w-full max-w-md bg-[#0c1322] border border-[#2b3d56] rounded-xl shadow-2xl p-6 relative font-mono text-slate-200"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1.5 rounded-md hover:bg-[#182438] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge & Title */}
        <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Scheme Inscription</span>
          <span className="text-slate-600">•</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] ${
              card.timing === 'scavenge'
                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                : 'bg-purple-950 text-purple-300 border border-purple-800'
            }`}
          >
            {card.timing.toUpperCase()} PHASE
          </span>
        </div>

        <h2 className="text-2xl font-serif font-black text-slate-100 tracking-tight mt-1">
          {card.name}
        </h2>

        {/* Flavor text */}
        <p className="text-xs italic text-amber-400/80 font-serif my-2.5 pl-3 border-l-2 border-amber-500/40">
          "{card.flavor}"
        </p>

        {/* Cost & Visibility */}
        <div className="flex items-center gap-3 my-3 text-xs">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#131d2e] border border-[#22334a]">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Cost:</span>
            <span className={`font-bold ${hasEnoughStash ? 'text-slate-200' : 'text-red-400'}`}>
              {card.costStash > 0 ? `${card.costStash} Stash` : 'Free'}
            </span>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#131d2e] border border-[#22334a]">
            {card.isPublic ? (
              <span className="text-amber-400 flex items-center gap-1 font-bold">
                <Sparkles className="w-3 h-3" /> Publicly Proclaimed
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                <EyeOff className="w-3 h-3 text-slate-500" /> Strictly Secret
              </span>
            )}
          </div>
        </div>

        {/* Effect Card */}
        <div className="p-3.5 rounded-lg bg-[#141d2d] border border-[#25364e] my-4 text-xs leading-relaxed text-slate-300">
          <strong className="text-amber-400 block mb-1 font-sans">RULE EFFECT:</strong>
          {card.effect}
        </div>

        {/* Target Selector if required */}
        {card.requiresTarget && (
          <div className="my-4 space-y-1.5">
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
              Select Target Castaway:
            </label>
            <select
              value={selectedTargetId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
              className="w-full bg-[#121b2a] border border-[#293c56] rounded-md px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="">— Choose Castaway —</option>
              {otherPlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName} (Rep: {p.reputation})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Saint validation warning */}
        {cardId === 'saint' && !isSaintValid && (
          <div className="p-2.5 rounded bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center gap-2 my-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>
              Your true physical Labor ({currentLabor}) is less than your claimed Labor ({currentClaimedLabor}). Saint requires true ≥ claimed.
            </span>
          </div>
        )}

        {/* Has Already Played Card This Round Warning */}
        {hasPlayedCardThisRound && (
          <div className="p-2.5 rounded bg-amber-950/60 border border-amber-800/80 text-amber-300 text-xs flex items-center gap-2 my-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>You have already played a Scheme card for this round. Island rules permit at most 1 Scheme card per castaway each round.</span>
          </div>
        )}

        {/* Window Closed Warning */}
        {currentPhase === 'resolution' && !isWindowActive && (
          <div className="p-2.5 rounded bg-amber-950/60 border border-amber-800/80 text-amber-300 text-xs flex items-center gap-2 my-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>The resolution window has closed. The overnight tally is underway.</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-2.5 rounded bg-red-950/60 border border-red-800 text-red-300 text-xs my-3">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#1e2a3c]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-[#162030] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={
              isSubmitting ||
              isLoading ||
              hasPlayedCardThisRound ||
              !isPhaseValid ||
              !hasEnoughStash ||
              (cardId === 'saint' && !isSaintValid)
            }
            className="flex items-center gap-2 px-5 py-2 rounded text-xs font-bold font-mono bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
          >
            {hasPlayedCardThisRound
              ? '1 Card Max (Played)'
              : isSubmitting || isLoading
              ? 'Executing...'
              : 'Confirm & Play Scheme'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
