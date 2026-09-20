import React, { useState } from 'react';
import { Crown, Shield, Award, AlertTriangle, Scale, Scroll, UserCheck, Flame } from 'lucide-react';
import type { GameData, PlayerData, PrivatePlayerProfile, GovernorData } from '../types.js';

interface GovernorBannerProps {
  game: GameData;
  players: PlayerData[];
  currentUserId: string;
  userProfile: PrivatePlayerProfile | null;
  onPardon: (targetPlayerId: string) => Promise<void>;
  onEmergencyVote: () => Promise<void>;
  onFileImpeachment: () => Promise<void>;
  onOpenConstitution: () => void;
  isLoading: boolean;
}

export const GovernorBanner: React.FC<GovernorBannerProps> = ({
  game,
  players,
  currentUserId,
  userProfile,
  onPardon,
  onEmergencyVote,
  onFileImpeachment,
  onOpenConstitution,
  isLoading,
}) => {
  const governor = game.governor;
  const isGovernor = governor?.playerId === currentUserId;
  const myStash = userProfile?.stash ?? 0;

  const [pardonTargetId, setPardonTargetId] = useState('');
  const [showPardonMenu, setShowPardonMenu] = useState(false);

  if (!governor && game.mode !== 'satire') return null;

  const handlePardonSubmit = () => {
    if (!pardonTargetId) return;
    onPardon(pardonTargetId);
    setShowPardonMenu(false);
    setPardonTargetId('');
  };

  const otherPlayers = players.filter((p) => p.id !== currentUserId);

  return (
    <div className="w-full bg-[#0d1626] border border-[#21324c] rounded-lg p-4 font-mono animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Governor info */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded bg-amber-950/60 border border-amber-800/60 flex items-center justify-center text-amber-400 shrink-0">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-amber-500 font-bold">
                Governor of the Isle
              </span>
              {governor ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800/40">
                  Term: R{governor.termStart}–R{governor.termStart + (governor.termLength || 3) - 1}
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-800/40">
                  Vacant (Interregnum)
                </span>
              )}
            </div>

            <div className="font-serif font-bold text-slate-100 text-sm sm:text-base mt-0.5 flex items-center gap-2">
              {governor ? governor.playerName : 'No Governor in Office'}
              {isGovernor && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800/40">
                  YOU
                </span>
              )}
            </div>

            {governor?.campaignPromise && (
              <p className="text-xs text-slate-300 mt-1 italic">
                Mandate: "{governor.campaignPromise}"
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="view-constitution-btn"
            onClick={onOpenConstitution}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-[#142033] hover:bg-[#1d2d46] border border-[#273b57] text-slate-200 transition-colors"
          >
            <Scroll className="w-3.5 h-3.5 text-amber-400" />
            <span>Constitution</span>
          </button>

          {/* Governor Executive Powers */}
          {isGovernor && governor && (
            <>
              {!governor.pardonUsed && (
                <div className="relative">
                  <button
                    id="open-pardon-menu-btn"
                    onClick={() => setShowPardonMenu(!showPardonMenu)}
                    disabled={myStash < 3 || isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 disabled:opacity-40 transition-colors"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Pardon (3 Stash)</span>
                  </button>

                  {showPardonMenu && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-[#0a101b] border border-[#23354e] rounded-lg p-3 shadow-2xl z-50 space-y-2">
                      <div className="text-[11px] text-slate-400">
                        Grant Executive Pardon (+3 Rep to target):
                      </div>
                      <select
                        id="pardon-target-select"
                        value={pardonTargetId}
                        onChange={(e) => setPardonTargetId(e.target.value)}
                        className="w-full px-2 py-1.5 rounded bg-[#070b13] border border-[#1e2e44] text-xs text-slate-200"
                      >
                        <option value="">Select castaway...</option>
                        {otherPlayers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.displayName} ({p.reputation} Rep)
                          </option>
                        ))}
                      </select>
                      <button
                        id="confirm-pardon-btn"
                        onClick={handlePardonSubmit}
                        disabled={!pardonTargetId || isLoading}
                        className="w-full py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold uppercase transition-colors"
                      >
                        Issue Decree
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!governor.emergencyUsed && (
                <button
                  id="invoke-emergency-btn"
                  onClick={onEmergencyVote}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-red-950/40 hover:bg-red-900/50 border border-red-800/50 text-red-300 transition-colors"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Emergency Powers</span>
                </button>
              )}
            </>
          )}

          {/* Non-Governor: Impeachment */}
          {!isGovernor && governor && game.roundPhase === 'scavenge' && !game.impeachmentAttemptedThisTerm && (
            <button
              id="file-impeachment-btn"
              onClick={onFileImpeachment}
              disabled={myStash < 2 || isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 disabled:opacity-40 transition-colors"
              title="File Articles of Impeachment (Cost: 2 Stash)"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Impeach (2 Stash)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
