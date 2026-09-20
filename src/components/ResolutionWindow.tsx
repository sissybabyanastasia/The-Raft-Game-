import React, { useEffect, useState } from 'react';
import {
  Clock,
  Zap,
  Flame,
  Shield,
  Coins,
  Scissors,
  Skull,
  EyeOff,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import type {
  GameData,
  RoundData,
  PlayerData,
  PrivatePlayerProfile,
  SchemeCardId,
} from '../types.js';
import { SCHEME_CARDS } from '../lib/cards.js';
import { CardPlayModal } from './CardPlayModal.js';

interface ResolutionWindowProps {
  game: GameData;
  roundData: RoundData | null;
  players: PlayerData[];
  currentPlayer: PlayerData;
  profile: PrivatePlayerProfile | null;
  onPlayResolutionCard: (cardId: SchemeCardId, targetId?: string) => Promise<void>;
  onFinalize: () => Promise<void>;
  isLoading: boolean;
}

export const ResolutionWindow: React.FC<ResolutionWindowProps> = ({
  game,
  roundData,
  players,
  currentPlayer,
  profile,
  onPlayResolutionCard,
  onFinalize,
  isLoading,
}) => {
  const [timeLeftMs, setTimeLeftMs] = useState<number>(10000);
  const [selectedCardId, setSelectedCardId] = useState<SchemeCardId | null>(null);

  const closesAt = roundData?.resolutionWindowClosesAt || Date.now() + 10000;

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, closesAt - Date.now());
      setTimeLeftMs(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        // Trigger finalize if host or local fallback
        if (currentPlayer.isHost) {
          onFinalize();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [closesAt, currentPlayer.isHost, onFinalize]);

  const seconds = Math.ceil(timeLeftMs / 1000);
  const progressPercent = Math.max(0, Math.min(100, (timeLeftMs / 10000) * 100));

  // Find cards in hand that can be played during Resolution (bribe, sabotage, mutiny)
  const hand = profile?.hand || [];
  const resolutionCards = hand.filter((c) => {
    const def = SCHEME_CARDS[c];
    return def && def.timing === 'resolution';
  });

  const cardsPlayedThisRound = roundData?.cardsPlayed || [];
  const hasPlayedCardThisRound = cardsPlayedThisRound.some((c) => c.playerId === currentPlayer.id);

  const otherPlayers = players.filter((p) => p.id !== currentPlayer.id);

  return (
    <div
      id="resolution-window-container"
      className="w-full max-w-4xl mx-auto my-6 bg-[#0a101f] border border-[#273852] rounded-2xl shadow-2xl p-6 sm:p-8 font-mono text-slate-200 relative overflow-hidden"
    >
      {/* Background Ambience Glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-900/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Badge */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1b283d]">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest">
          <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
          <span>RESOLUTION WINDOW — THE DUSK RESOLUTION</span>
        </div>

        {/* Timer Display */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141e30] border border-[#2b3e5c] text-slate-100 font-mono">
          <Clock className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
          <span className="text-xs text-slate-400">Locking in:</span>
          <span className={`text-base font-black ${seconds <= 3 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
            {seconds}s
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#121b2a] h-2 rounded-full overflow-hidden my-4 border border-[#202f45]">
        <div
          className="h-full bg-gradient-to-r from-amber-500 via-purple-500 to-rose-500 transition-all duration-100 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Atmospheric Context */}
      <div className="my-4 p-4 rounded-xl bg-[#0f1728] border border-[#202f48] text-xs leading-relaxed text-slate-300">
        <p className="font-serif italic text-slate-400 mb-1">
          "All castaways have submitted their daily labor. As darkness covers the shoreline, clandestine bribes, sabotage, and mutinies may be executed before the ledger is certified."
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          Each player may execute at most 1 Scheme card per round. Actions played now resolve immediately in the overnight tally.
        </p>
      </div>

      {/* Card Play Section */}
      <div className="my-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Playable Resolution Schemes in Your Hand:
          </h3>
          {hasPlayedCardThisRound && (
            <span className="text-[11px] text-amber-400 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/80">
              Scheme already played this round
            </span>
          )}
        </div>

        {resolutionCards.length === 0 ? (
          <div className="p-6 rounded-xl bg-[#0d1424] border border-[#1b263b] text-center text-xs text-slate-500 italic">
            You hold no Resolution-phase Scheme cards (Sabotage, Bribe, Mutiny) in your hand. Awaiting morning ledger tally...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resolutionCards.map((cardId) => {
              const card = SCHEME_CARDS[cardId];
              if (!card) return null;
              const hasStash = (profile?.stash || 0) >= card.costStash;
              const canPlay = !hasPlayedCardThisRound && hasStash;

              return (
                <div
                  key={cardId}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    canPlay
                      ? 'bg-[#121c2e] border-amber-700/60 hover:border-amber-400 shadow-md'
                      : 'bg-[#0d1424] border-[#1f2d42] opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {cardId === 'sabotage' && <Scissors className="w-4 h-4 text-red-400" />}
                        {cardId === 'bribe' && <Coins className="w-4 h-4 text-amber-400" />}
                        {cardId === 'mutiny' && <Skull className="w-4 h-4 text-purple-400" />}
                        <span className="text-sm font-bold text-slate-100 font-serif">{card.name}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                        {card.costStash > 0 ? `${card.costStash} Stash` : 'Free'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-snug mb-3">{card.effect}</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#1e2a3c]">
                    <span className="text-[10px] text-slate-500 italic font-serif">"{card.flavor}"</span>
                    <button
                      type="button"
                      onClick={() => setSelectedCardId(cardId)}
                      disabled={!canPlay || isLoading}
                      className="px-3 py-1.5 rounded text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Execute
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Resolution Submissions Status */}
      <div className="pt-4 border-t border-[#1b283d] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <EyeOff className="w-4 h-4 text-slate-500" />
          <span>Cards played in Resolution are resolved secretly during overnight tallies.</span>
        </div>

        {currentPlayer.isHost && (
          <button
            type="button"
            onClick={onFinalize}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1b293e] hover:bg-[#253956] text-slate-200 text-xs transition-colors"
          >
            <span>Skip Timer & Tally Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Card Confirmation Modal */}
      <CardPlayModal
        cardId={selectedCardId}
        isOpen={Boolean(selectedCardId)}
        onClose={() => setSelectedCardId(null)}
        onConfirmPlay={onPlayResolutionCard}
        otherPlayers={otherPlayers}
        profile={profile}
        currentPhase="resolution"
        isLoading={isLoading}
      />
    </div>
  );
};
