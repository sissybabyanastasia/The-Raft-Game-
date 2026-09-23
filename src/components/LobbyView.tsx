import React, { useState } from 'react';
import { Users, Plus, Play, Copy, Check, ArrowRight, Shield, Anchor, LogIn, UserCheck } from 'lucide-react';
import type { GameData, PlayerData } from '../types.js';
import { BuyMeACoffeeButton } from './BuyMeACoffeeButton.js';
import { TutorialModal } from './TutorialModal.js';

interface LobbyViewProps {
  currentUser: any;
  displayName: string;
  setDisplayName: (name: string) => void;
  currentGame: GameData | null;
  players: PlayerData[];
  onCreateGame: () => Promise<void>;
  onJoinGame: (code: string) => Promise<void>;
  onStartGame: () => Promise<void>;
  onAddBot: () => Promise<void>;
  onGoogleSignIn?: () => Promise<void>;
  onToggleMode?: (mode: 'classic' | 'satire') => void;
  onSelectPreferredRole?: (role: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  currentUser,
  displayName,
  setDisplayName,
  currentGame,
  players,
  onCreateGame,
  onJoinGame,
  onStartGame,
  onAddBot,
  onGoogleSignIn,
  onToggleMode,
  onSelectPreferredRole,
  isLoading,
  error,
  setError,
}) => {
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const isHost = currentGame && currentUser && currentGame.hostId === currentUser.uid;
  // FIX-17: Explicit upper bound so the button is disabled when the room is full.
  const canStart = players.length >= 3 && players.length <= 8 && !isLoading;

  const handleCopyCode = () => {
    if (!currentGame) return;
    navigator.clipboard.writeText(currentGame.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (currentGame) {
    return (
      <main className="w-full max-w-4xl mx-auto p-4 sm:p-6 my-6">
        {/* Game Lobby Roster */}
        <div className="wood-panel rounded-lg border border-[#23334d] p-6 sm:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1c283c]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-amber-500 font-mono text-xs uppercase tracking-widest font-semibold">
                  Assembly Point
                </span>
                <span className="text-slate-600 text-xs">/</span>
                <span className="text-slate-400 font-mono text-xs uppercase">Room Code</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <h1 className="text-3xl sm:text-4xl font-mono font-bold text-slate-100 tracking-wider">
                  {currentGame.roomCode}
                </h1>
                <button
                  id="copy-room-code-btn"
                  onClick={handleCopyCode}
                  className="p-2 rounded bg-[#131c2e] hover:bg-[#1a253a] border border-[#273852] text-slate-300 transition-colors"
                  title="Copy Room Code"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-[#0a101b] border border-[#1b263b] px-4 py-2.5 rounded">
              <Users className="w-4 h-4 text-slate-400" />
              <div className="text-right">
                <div className="text-[10px] font-mono uppercase text-slate-500">Castaways Present</div>
                <div className="text-sm font-mono font-bold text-slate-200">
                  {players.length} / 8 <span className="text-xs font-normal text-slate-500">(Min 3)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Reading Required Advisory Banner */}
          <div className="my-4 p-3 rounded-lg bg-amber-950/40 border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm">
            <div className="flex items-center gap-2.5 text-amber-200">
              <span className="w-5 h-5 rounded-full border border-amber-500/60 bg-amber-900/40 text-amber-300 flex items-center justify-center font-bold text-[10px] font-mono shrink-0">
                !
              </span>
              <div>
                <span className="text-xs font-serif font-bold text-amber-100 tracking-wide block sm:inline mr-2">
                  “This game requires reading to play. Please be advised.”
                </span>
                <span className="text-[11px] text-amber-300/80 font-sans">
                  Review the HUD breakdown and survival manual before commencing.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsTutorialOpen(true)}
              className="text-xs font-mono text-amber-400 hover:text-amber-300 underline underline-offset-2 shrink-0 self-start sm:self-auto font-bold flex items-center gap-1"
            >
              <span>📖 Open Guide</span>
              <span>→</span>
            </button>
          </div>

          {/* Mode Selector */}
          <div className="my-5 p-4 rounded bg-[#0b121e] border border-[#1d2a3e]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-amber-500 font-bold">
                Game Mode Ruleset
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {isHost ? 'Host controls the game mode' : 'Chosen by host'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                id="mode-satire-btn"
                type="button"
                disabled={!isHost || isLoading}
                onClick={() => onToggleMode && onToggleMode('satire')}
                className={`p-3 rounded text-left border transition-all ${
                  currentGame.mode !== 'classic'
                    ? 'bg-[#152238] border-amber-500/70 shadow-sm'
                    : 'bg-[#0e1624] border-[#1d2a3d] opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-slate-100 text-sm flex items-center gap-2">
                    🏛️ Satire Mode
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase">
                      Recommended
                    </span>
                  </span>
                  {currentGame.mode !== 'classic' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </div>
                <p className="text-[11px] font-mono text-slate-400 mt-1 leading-relaxed">
                  The Founding Phase, 6 Constitutional clauses, Gubernatorial Elections, Campaign Promises, Embezzlement, and Impeachment trials.
                </p>
              </button>

              <button
                id="mode-classic-btn"
                type="button"
                disabled={!isHost || isLoading}
                onClick={() => onToggleMode && onToggleMode('classic')}
                className={`p-3 rounded text-left border transition-all ${
                  currentGame.mode === 'classic'
                    ? 'bg-[#152238] border-amber-500/70 shadow-sm'
                    : 'bg-[#0e1624] border-[#1d2a3d] opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-slate-100 text-sm">
                    🪵 Classic Mode
                  </span>
                  {currentGame.mode === 'classic' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  )}
                </div>
                <p className="text-[11px] font-mono text-slate-400 mt-1 leading-relaxed">
                  Pure social deduction survival. No Constitution, no Governor, no elections. Clean survival mechanics.
                </p>
              </button>
            </div>
          </div>

          {/* Castaway Roster */}
          <div className="my-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Registered Castaways
              </h2>
              {isHost && players.length < 8 && (
                <button
                  id="add-demo-castaway-btn"
                  onClick={onAddBot}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono bg-[#162133] hover:bg-[#1e2d45] border border-[#2b3c55] text-amber-400 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Demo Castaway
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {players.map((p, idx) => {
                const isMe = p.id === currentUser?.uid;
                return (
                  <div
                    key={p.id}
                    id={`player-card-${p.id}`}
                    className={`p-3.5 rounded border flex items-center justify-between ${
                      isMe
                        ? 'bg-[#152033] border-amber-800/60'
                        : 'bg-[#0e1624] border-[#1d2b3e]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded bg-[#0a101c] border border-[#223147] flex items-center justify-center font-mono text-xs font-bold text-slate-400">
                        0{idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-slate-200 text-sm">
                            {p.displayName}
                          </span>
                          {isMe && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-950/80 text-amber-400 border border-amber-800/40 rounded">
                              YOU
                            </span>
                          )}
                        </div>
                         <div className="text-[11px] font-mono text-slate-500">
                          Status: Ready in Camp • Base Energy: 5
                        </div>
                        {isMe && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <label htmlFor="pref-role-select" className="text-[10px] font-mono text-slate-400">
                              Pref:
                            </label>
                            <select
                              id="pref-role-select"
                              value={(p as any).preferredRole || ''}
                              onChange={(e) => onSelectPreferredRole?.(e.target.value)}
                              className="bg-[#0b101a] border border-[#23354d] rounded px-1.5 py-0.5 text-[10px] font-serif text-amber-300 focus:outline-none focus:border-amber-500"
                            >
                              <option value="">Random / Any</option>
                              <option value="ORDINARY">Ordinary Person</option>
                              <option value="PREPPER">The Prepper</option>
                              <option value="BROKER">The Broker</option>
                              <option value="IDEALIST">The Idealist</option>
                              <option value="INFLUENCER">The Influencer</option>
                              <option value="GHOST">The Ghost</option>
                              <option value="TYRANT">The Tyrant</option>
                              <option value="MAYOR">The Mayor</option>
                            </select>
                          </div>
                        )}
                        {!isMe && (p as any).preferredRole && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="text-[9px] font-mono text-amber-400/80 bg-amber-950/20 px-1 py-0.5 rounded border border-amber-900/30">
                              Pref: {(p as any).preferredRole}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      {p.isHost ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase font-semibold">
                          Host
                        </span>
                      ) : p.isBot ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#101928] text-slate-400 border border-[#1f2d42] uppercase">
                          Demo
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 uppercase">
                          Joined
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {players.length < 3 && (
              <div className="mt-4 p-3 rounded bg-amber-950/20 border border-amber-900/40 text-xs font-mono text-amber-300/80 flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  Waiting for at least 3 castaways. Share the room code <strong className="text-amber-300">{currentGame.roomCode}</strong> or add demo castaways to test.
                </span>
              </div>
            )}
          </div>

          {/* Error Banner in Active Lobby */}
          {error && (
            <div className="mt-4 p-3 rounded bg-red-950/60 border border-red-800/80 text-xs font-mono text-red-200 flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-300 hover:text-white text-sm px-2 py-0.5 rounded bg-red-900/40 hover:bg-red-800/60"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-6 border-t border-[#1c283c] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs font-mono text-slate-500">
              {isHost
                ? canStart
                  ? 'All conditions met. You may commence construction.'
                  : `Need ${3 - players.length} more castaway${3 - players.length === 1 ? '' : 's'} to start.`
                : 'Awaiting the Expedition Host to begin...'}
            </div>

            {isHost && (
              <button
                id="start-game-btn"
                onClick={onStartGame}
                disabled={!canStart || isLoading || players.length > 8}
                className="w-full sm:w-auto px-6 py-3 rounded font-mono font-bold text-sm tracking-wider uppercase bg-[#ea580c] hover:bg-[#c2410c] text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg transition-colors"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-white" />
                )}
                {isLoading ? 'Commencing...' : 'Commence Construction'}
              </button>
            )}
          </div>
        </div>

        {/* Survival Briefing Card */}
        <div className="mt-6 p-4 rounded border border-[#1b273b] bg-[#0c121e] text-xs font-mono text-slate-400 space-y-2">
          <p className="text-slate-300 font-bold uppercase tracking-wider">
            Expedition Protocol:
          </p>
          <p className="leading-relaxed">
            • Each round, every castaway secretly allocates 5 Energy between Labor, Stash, Scheme, and Rest.
          </p>
          <p className="leading-relaxed">
            • You then sign a declared Labor contribution onto the public Ledger. You may claim whatever number you choose.
          </p>
          <p className="leading-relaxed">
            • The group must produce genuine timber to assemble the raft before rations expire.
          </p>
        </div>
        <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
      </main>
    );
  }

  // Initial Entry Screen (Create or Join)
  return (
    <main className="w-full max-w-xl mx-auto p-4 sm:p-6 my-8">
      <div className="wood-panel rounded-lg border border-[#23334d] p-6 sm:p-8">
        {/* Title Header */}
        <div className="text-center pb-6 border-b border-[#1b263b]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#101826] border border-[#223147] text-amber-500 font-mono text-xs uppercase tracking-widest font-semibold mb-3">
            <Anchor className="w-3.5 h-3.5" />
            Social Deduction Survival
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif font-black text-slate-100 tracking-tight">
            THE RAFT
          </h1>
          <p className="text-xs sm:text-sm font-mono text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
            Castaways cooperating to build an escape craft while hoarding resources and lying upon the public ledger.
          </p>
          <div className="mt-3 px-3 py-1.5 rounded-full bg-amber-950/40 border border-amber-500/40 inline-flex items-center gap-2 text-xs font-serif text-amber-200">
            <span className="w-4 h-4 rounded-full border border-amber-400 text-amber-300 flex items-center justify-center font-bold text-[9px] font-mono">!</span>
            <span>“This game requires reading to play. Please be advised.”</span>
          </div>
          <div className="mt-4">
            <button
              id="tutorial-walkthrough-btn"
              type="button"
              onClick={() => setIsTutorialOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold uppercase transition-all shadow-md shadow-amber-950/20 active:scale-95"
            >
              📖 Open Thorough Survival Walkthrough Guide
            </button>
          </div>
        </div>

        {/* Name Input & Account */}
        <div className="my-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="display-name-input"
                className="block text-xs font-mono uppercase tracking-wider text-slate-300"
              >
                Castaway Identity / Name
              </label>

              {currentUser && !currentUser.isAnonymous && currentUser.email ? (
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{currentUser.email}</span>
                </span>
              ) : onGoogleSignIn ? (
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  disabled={isLoading}
                  className="text-[11px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In with Google</span>
                </button>
              ) : null}
            </div>
            <input
              id="display-name-input"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Barnaby, Captain Vance, Silas"
              maxLength={24}
              className="w-full px-4 py-3 rounded bg-[#090f1a] border border-[#24354c] text-slate-100 font-serif text-base focus:outline-none focus:border-amber-600 transition-colors placeholder:text-slate-600"
            />
          </div>

          {error && (
            <div className="p-3 rounded bg-red-950/40 border border-red-900/60 text-xs font-mono text-red-300">
              {error}
            </div>
          )}

          {/* Action Grid: Create Game vs Join Game */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            {/* Create Game Card */}
            <div className="p-4 rounded bg-[#0e1624] border border-[#1e2d42] flex flex-col justify-between">
              <div>
                <h2 className="font-serif font-bold text-slate-200 text-base mb-1">
                  Establish Expedition
                </h2>
                <p className="text-xs font-mono text-slate-500 mb-4 leading-normal">
                  Generate a new 6-character room code and assemble your crew.
                </p>
              </div>
              <button
                id="create-game-btn"
                onClick={onCreateGame}
                disabled={isLoading || !displayName.trim()}
                className="w-full py-2.5 px-4 rounded font-mono font-bold text-xs uppercase tracking-wider bg-[#ea580c] hover:bg-[#c2410c] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Create Game
              </button>
            </div>

            {/* Join Game Card */}
            <div className="p-4 rounded bg-[#0e1624] border border-[#1e2d42] flex flex-col justify-between">
              <div>
                <h2 className="font-serif font-bold text-slate-200 text-base mb-1">
                  Join Existing Raft
                </h2>
                <input
                  id="room-code-input"
                  type="text"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder="ROOM CODE (6-char)"
                  maxLength={6}
                  className="w-full px-3 py-2 rounded bg-[#080d17] border border-[#24354c] text-slate-100 font-mono text-xs uppercase tracking-widest focus:outline-none focus:border-amber-600 mb-4 placeholder:text-slate-600"
                />
              </div>
              <button
                id="join-game-btn"
                onClick={() => onJoinGame(roomCodeInput)}
                disabled={isLoading || !displayName.trim() || roomCodeInput.trim().length < 4}
                className="w-full py-2.5 px-4 rounded font-mono font-bold text-xs uppercase tracking-wider bg-[#1b293e] hover:bg-[#253752] border border-[#2f4362] text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
              >
                Join Game
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note and Support */}
        <div className="pt-4 border-t border-[#192435] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-slate-500">
          <span>The raft accommodates 3 to 8 castaways. Lies are recorded permanently in ink.</span>
          <BuyMeACoffeeButton variant="inline" />
        </div>
        <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
      </div>
    </main>
  );
};
