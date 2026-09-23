import React, { useState } from 'react';
import {
  Sparkles,
  ChevronUp,
  ChevronDown,
  Coins,
  EyeOff,
  Trash2,
  Play,
  Layers,
  AlertCircle,
  FileSpreadsheet,
  Skull,
  Radio,
  Scissors,
  Wind,
  ShieldCheck,
  Feather,
  Flame,
} from 'lucide-react';
import type { SchemeCardId, SchemeCardDefinition, PrivatePlayerProfile, PlayerData } from '../types.js';
import { SCHEME_CARDS } from '../lib/cards.js';
import { CardPlayModal } from './CardPlayModal.js';

interface SchemeHandDrawerProps {
  profile: PrivatePlayerProfile | null;
  otherPlayers: PlayerData[];
  currentPhase: 'scavenge' | 'resolution' | 'ledger';
  currentLabor?: number;
  currentClaimedLabor?: number;
  hasPlayedCardThisRound?: boolean;
  onPlayCard: (cardId: SchemeCardId, targetId?: string) => Promise<void>;
  onDiscardCard: (cardId: SchemeCardId) => Promise<void>;
  selectedScavengeCard: SchemeCardId | null;
  onSelectScavengeCard: (cardId: SchemeCardId | null) => void;
  isLoading: boolean;
}

const CARD_ICONS: Record<SchemeCardId, React.ReactNode> = {
  forged_ledger: <FileSpreadsheet className="w-4 h-4 text-emerald-400" />,
  bribe: <Coins className="w-4 h-4 text-amber-400" />,
  whisper_campaign: <Radio className="w-4 h-4 text-rose-400" />,
  sabotage: <Scissors className="w-4 h-4 text-red-500" />,
  smokescreen: <Wind className="w-4 h-4 text-sky-400" />,
  saint: <ShieldCheck className="w-4 h-4 text-yellow-300" />,
  ghost_write: <Feather className="w-4 h-4 text-indigo-400" />,
  mutiny: <Skull className="w-4 h-4 text-purple-400" />,
};

const CARD_THEMES: Record<SchemeCardId, { border: string; bg: string; badge: string }> = {
  forged_ledger: {
    border: 'border-emerald-800/60 hover:border-emerald-500',
    bg: 'bg-emerald-950/30',
    badge: 'bg-emerald-900/60 text-emerald-300 border-emerald-700',
  },
  bribe: {
    border: 'border-amber-800/60 hover:border-amber-500',
    bg: 'bg-amber-950/30',
    badge: 'bg-amber-900/60 text-amber-300 border-amber-700',
  },
  whisper_campaign: {
    border: 'border-rose-800/60 hover:border-rose-500',
    bg: 'bg-rose-950/30',
    badge: 'bg-rose-900/60 text-rose-300 border-rose-700',
  },
  sabotage: {
    border: 'border-red-800/60 hover:border-red-500',
    bg: 'bg-red-950/30',
    badge: 'bg-red-900/60 text-red-300 border-red-700',
  },
  smokescreen: {
    border: 'border-sky-800/60 hover:border-sky-500',
    bg: 'bg-sky-950/30',
    badge: 'bg-sky-900/60 text-sky-300 border-sky-700',
  },
  saint: {
    border: 'border-yellow-700/60 hover:border-yellow-400',
    bg: 'bg-yellow-950/30',
    badge: 'bg-yellow-900/60 text-yellow-200 border-yellow-600',
  },
  ghost_write: {
    border: 'border-indigo-800/60 hover:border-indigo-500',
    bg: 'bg-indigo-950/30',
    badge: 'bg-indigo-900/60 text-indigo-300 border-indigo-700',
  },
  mutiny: {
    border: 'border-purple-800/60 hover:border-purple-500',
    bg: 'bg-purple-950/30',
    badge: 'bg-purple-900/60 text-purple-300 border-purple-700',
  },
};

export const SchemeHandDrawer: React.FC<SchemeHandDrawerProps> = ({
  profile,
  otherPlayers,
  currentPhase,
  currentLabor = 0,
  currentClaimedLabor = 0,
  hasPlayedCardThisRound = false,
  onPlayCard,
  onDiscardCard,
  selectedScavengeCard,
  onSelectScavengeCard,
  isLoading,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [modalCardId, setModalCardId] = useState<SchemeCardId | null>(null);

  const hand: SchemeCardId[] = profile?.hand || [];
  const stash: number = profile?.stash || 0;

  const handleCardClick = (cardId: SchemeCardId) => {
    const card = SCHEME_CARDS[cardId];
    if (!card) return;

    if (currentPhase === 'scavenge') {
      if (card.timing === 'scavenge') {
        // Toggle selection for Scavenge submission
        if (selectedScavengeCard === cardId) {
          onSelectScavengeCard(null);
        } else {
          onSelectScavengeCard(cardId);
        }
      } else {
        // Open modal to show information
        setModalCardId(cardId);
      }
    } else if (currentPhase === 'resolution') {
      if (card.timing === 'resolution') {
        setModalCardId(cardId);
      } else {
        setModalCardId(cardId);
      }
    } else {
      setModalCardId(cardId);
    }
  };

  return (
    <>
      <div
        id="scheme-hand-drawer"
        className="w-full bg-[#0a0f1c]/95 border-t border-[#1d293d] backdrop-blur-md transition-all duration-300 shadow-2xl font-mono"
      >
        {/* Drawer Header Bar */}
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between border-b border-[#162032]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-amber-400 transition-colors"
            >
              <Layers className="w-4 h-4 text-amber-500" />
              <span>YOUR SCHEME HAND</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded bg-[#162338] text-amber-400 border border-[#273a57]">
                {hand.length} / 5
              </span>
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>

            {hand.length > 5 && (
              <span className="text-[10px] text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Exceeds max 5! Discard excess.
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-300 font-bold">{stash}</span>
              <span className="text-[10px] text-slate-500">Stash</span>
            </div>

            <div className="text-[10px] text-slate-500 hidden sm:block">
              {currentPhase === 'scavenge' && 'Play Scavenge schemes with your allocation'}
              {currentPhase === 'resolution' && 'Resolution Window open (Play Resolution schemes)'}
              {currentPhase === 'ledger' && 'Ledger Review (Cards held for next dawn)'}
            </div>
          </div>
        </div>

        {/* Card Row */}
        {isExpanded && (
          <div className="max-w-6xl mx-auto px-4 py-3 overflow-x-auto">
            {hand.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 italic">
                Your hand is currently empty. Scheme cards are drawn at the beginning of each day.
              </div>
            ) : (
              <div className="flex items-stretch gap-3 pb-1 min-w-max">
                {hand.map((cardId, index) => {
                  const card = SCHEME_CARDS[cardId];
                  if (!card) return null;
                  const theme = CARD_THEMES[cardId] || CARD_THEMES.forged_ledger;
                  const isSelectedForScavenge = selectedScavengeCard === cardId;
                  const isPlayableNow =
                    (card.timing === 'scavenge' && currentPhase === 'scavenge') ||
                    (card.timing === 'resolution' && currentPhase === 'resolution');
                  const canAfford = stash >= card.costStash;

                  return (
                    <div
                      key={`${cardId}-${index}`}
                      className={`w-64 shrink-0 rounded-xl p-3 border transition-all relative flex flex-col justify-between ${
                        theme.bg
                      } ${theme.border} ${
                        isSelectedForScavenge
                          ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-500/20 bg-amber-950/40'
                          : 'shadow-md'
                      }`}
                    >
                      {/* Card Top */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            {CARD_ICONS[cardId]}
                            <span className="text-xs font-bold font-serif text-slate-100 truncate">
                              {card.name}
                            </span>
                          </div>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold ${
                              card.timing === 'scavenge'
                                ? 'bg-blue-950/80 text-blue-300 border-blue-700'
                                : 'bg-purple-950/80 text-purple-300 border-purple-700'
                            }`}
                          >
                            {card.timing}
                          </span>
                        </div>

                        {/* Flavor line */}
                        <p className="text-[10px] italic text-amber-300/70 font-serif leading-tight mb-2 line-clamp-1">
                          "{card.flavor}"
                        </p>

                        {/* Effect Description */}
                        <p className="text-[11px] text-slate-300 leading-snug line-clamp-3 mb-2">
                          {card.effect}
                        </p>
                      </div>

                      {/* Card Bottom Meta & Actions */}
                      <div className="pt-2 border-t border-slate-700/40 flex items-center justify-between gap-2 mt-auto">
                        <div className="text-[10px] text-slate-400">
                          {card.costStash > 0 ? (
                            <span className={canAfford ? 'text-amber-400 font-bold' : 'text-red-400'}>
                              {card.costStash} Stash
                            </span>
                          ) : (
                            <span className="text-slate-400">Free</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onDiscardCard(cardId)}
                            title="Discard this scheme"
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors text-[10px]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* FIX-08: Show timing badge for out-of-phase cards instead of just "Inspect". */}
                          {!isPlayableNow ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                card.timing === 'scavenge'
                                  ? 'bg-blue-950/80 text-blue-300 border-blue-700'
                                  : 'bg-purple-950/80 text-purple-300 border-purple-700'
                              }`}
                              title={`This card can only be played during the ${card.timing} phase.`}
                            >
                              {card.timing === 'scavenge' ? 'Playable: Scavenge' : 'Playable: Resolution'}
                            </span>
                          ) : currentPhase === 'scavenge' ? (
                            <button
                              type="button"
                              onClick={() => handleCardClick(cardId)}
                              className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                                isSelectedForScavenge
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-[#1e2d44] text-slate-200 hover:bg-[#283b58]'
                              }`}
                            >
                              {isSelectedForScavenge ? 'Selected' : 'Attach'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setModalCardId(cardId)}
                              disabled={!canAfford || isLoading || hasPlayedCardThisRound}
                              className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                                hasPlayedCardThisRound
                                  ? 'bg-[#192436] text-slate-400 opacity-50 cursor-not-allowed'
                                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed'
                              }`}
                            >
                              {hasPlayedCardThisRound ? 'Played' : 'Play Now'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Confirmation Modal */}
      <CardPlayModal
        cardId={modalCardId}
        isOpen={Boolean(modalCardId)}
        onClose={() => setModalCardId(null)}
        onConfirmPlay={onPlayCard}
        otherPlayers={otherPlayers}
        profile={profile}
        currentPhase={currentPhase}
        currentLabor={currentLabor}
        currentClaimedLabor={currentClaimedLabor}
        hasPlayedCardThisRound={hasPlayedCardThisRound}
        isLoading={isLoading}
      />
    </>
  );
};
