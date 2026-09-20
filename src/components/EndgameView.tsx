import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Copy,
  Check,
  Clock,
  Skull,
  Anchor,
  AlertTriangle,
  RotateCcw,
  Shield,
  Award,
  ArrowRight,
  Lock,
  Unlock,
  Gavel,
  ChevronRight,
  Flame,
} from 'lucide-react';
import type { GameData, PlayerData, PrivatePlayerProfile, EndgameData } from '../types.js';

interface EndgameViewProps {
  game: GameData;
  players: PlayerData[];
  currentUserId: string;
  userProfile: PrivatePlayerProfile | null;
  onAdvanceStep: () => Promise<void>;
  onConfess: (text: string) => Promise<void>;
  onAdvanceReveal: () => Promise<void>;
  onBlameVote: (targetId: string) => Promise<void>;
  onResolveBlame: () => Promise<void>;
  onReset: () => void;
}

export const EndgameView: React.FC<EndgameViewProps> = ({
  game,
  players,
  currentUserId,
  userProfile,
  onAdvanceStep,
  onConfess,
  onAdvanceReveal,
  onBlameVote,
  onResolveBlame,
  onReset,
}) => {
  const endgame = game.endgame;
  const isHost = game.hostId === currentUserId;
  const currentPlayer = players.find(p => p.id === currentUserId);

  // Confession state
  const [confessionInput, setConfessionInput] = useState('');
  const [confessionSubmitted, setConfessionSubmitted] = useState(false);
  const [copiedDoc, setCopiedDoc] = useState(false);
  const [selectedBlameTarget, setSelectedBlameTarget] = useState<string>('');
  const [hasVotedBlame, setHasVotedBlame] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Time remaining for Step B (60s) or Step D (30s)
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  // Sync existing confession from server
  useEffect(() => {
    if (endgame?.confessions && endgame.confessions[currentUserId]) {
      setConfessionInput(endgame.confessions[currentUserId]);
      setConfessionSubmitted(true);
    }
  }, [endgame?.confessions, currentUserId]);

  // Sync blame vote
  useEffect(() => {
    if (endgame?.blameVotes) {
      const existing = endgame.blameVotes.find(v => v.voterId === currentUserId);
      if (existing) {
        setSelectedBlameTarget(existing.targetId);
        setHasVotedBlame(true);
      }
    }
  }, [endgame?.blameVotes, currentUserId]);

  // Timer countdown hook
  useEffect(() => {
    if (!endgame?.stepClosesAt) {
      setSecondsRemaining(null);
      return;
    }

    const updateTimer = () => {
      const diff = Math.max(0, Math.ceil((endgame.stepClosesAt! - Date.now()) / 1000));
      setSecondsRemaining(diff);

      // Auto-submit confession if timer reaches 0
      if (diff === 0 && endgame.step === 'confession' && !confessionSubmitted) {
        handleConfessionSubmit(true);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endgame?.stepClosesAt, endgame?.step, confessionSubmitted]);

  // Handle Confession Submit
  const handleConfessionSubmit = async (isAuto = false) => {
    if (confessionSubmitted && !isAuto) return;
    setIsSubmitting(true);
    try {
      const text = confessionInput.trim() || 'They said nothing.';
      await onConfess(text);
      setConfessionSubmitted(true);
    } catch (err) {
      console.error('Error submitting confession:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Blame Vote Submit
  const handleBlameVoteSubmit = async () => {
    if (!selectedBlameTarget || selectedBlameTarget === currentUserId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onBlameVote(selectedBlameTarget);
      setHasVotedBlame(true);
    } catch (err) {
      console.error('Error submitting blame vote:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download raw leaked document
  const handleDownloadDoc = () => {
    const text = endgame?.accounting?.rawDocumentText || 'THE RAFT - FINAL ACCOUNTING';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `THE_RAFT_SESSION_${game.id.substring(0, 8)}_ACCOUNTING.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy raw document to clipboard
  const handleCopyDoc = async () => {
    const text = endgame?.accounting?.rawDocumentText || '';
    try {
      await navigator.clipboard.writeText(text);
      setCopiedDoc(true);
      setTimeout(() => setCopiedDoc(false), 2500);
    } catch (err) {
      console.error('Failed to copy document:', err);
    }
  };

  // Compute current user blame vote weight
  let voterWeight = 1;
  if (game.mode === 'island') {
    if (!userProfile?.temptationAccepted) voterWeight += 1;
    if (!userProfile?.offerAccepted) voterWeight += 2;
  }

  if (!endgame) {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-200 flex items-center justify-center p-6 font-mono">
        <div className="text-center space-y-4">
          <div className="text-amber-500 text-sm animate-pulse uppercase tracking-widest">
            Compiling True Ledger...
          </div>
          <p className="text-xs text-slate-400">Summoning the island tribunal.</p>
        </div>
      </div>
    );
  }

  const currentRevealIdx = endgame.currentRevealIndex || 0;
  const currentReveal = endgame.reveals?.[currentRevealIdx];
  const totalReveals = endgame.reveals?.length || 0;

  return (
    <div id="endgame-view" className="min-h-screen bg-[#050811] text-slate-200 p-4 sm:p-8 font-mono selection:bg-red-950 selection:text-red-200">
      {/* Top Archival Header */}
      <div className="max-w-4xl mx-auto mb-8 border-b border-[#1c283d] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-amber-500 uppercase tracking-widest font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            Classified Archival File · Session {game.id.substring(0, 8)}
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-slate-100 tracking-tight mt-1">
            THE RECKONING
          </h1>
        </div>

        {/* Step Indicator Tracker */}
        <div className="flex items-center gap-1.5 text-xs bg-[#0b1220] p-1.5 rounded border border-[#1b2a40]">
          {(['accounting', 'confession', 'reveal', 'blame_vote', 'verdict'] as const).map((s, idx) => {
            const isCurrent = endgame.step === s;
            const isPassed =
              ['accounting', 'confession', 'reveal', 'blame_vote', 'verdict'].indexOf(endgame.step) > idx;
            return (
              <span
                key={s}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                  isCurrent
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : isPassed
                    ? 'text-slate-400 bg-[#142033]'
                    : 'text-slate-600'
                }`}
              >
                {s === 'accounting' && 'A. Ledger'}
                {s === 'confession' && 'B. Confess'}
                {s === 'reveal' && 'C. Reveal'}
                {s === 'blame_vote' && 'D. Blame'}
                {s === 'verdict' && 'E. Verdict'}
              </span>
            );
          })}
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* ======================================================== */}
        {/* STEP A: THE ACCOUNTING (PUBLIC, AUTOMATIC)              */}
        {/* ======================================================== */}
        {endgame.step === 'accounting' && (
          <div className="space-y-6">
            <div className="p-6 rounded-lg bg-[#090e1a] border border-[#203047] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b283d] pb-4">
                <div>
                  <div className="text-xs uppercase tracking-widest text-slate-400">Step A — Official Registry</div>
                  <h2 className="text-lg font-serif font-bold text-slate-100">The True Ledger Unsealed</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    id="copy-doc-btn"
                    onClick={handleCopyDoc}
                    className="px-3 py-1.5 rounded bg-[#121c2e] hover:bg-[#1a2840] text-slate-300 text-xs border border-[#253752] flex items-center gap-1.5 transition-colors"
                  >
                    {copiedDoc ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedDoc ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    id="download-doc-btn"
                    onClick={handleDownloadDoc}
                    className="px-3 py-1.5 rounded bg-[#121c2e] hover:bg-[#1a2840] text-slate-300 text-xs border border-[#253752] flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Download (.txt)</span>
                  </button>
                </div>
              </div>

              {/* Leaked Document Monospace Box */}
              <div className="p-4 sm:p-6 rounded bg-[#03060c] border border-[#172437] overflow-x-auto text-[11px] sm:text-xs text-slate-300 leading-relaxed font-mono whitespace-pre select-all shadow-inner">
                {endgame.accounting?.rawDocumentText}
              </div>

              {/* Embezzlement Callout if Present */}
              {endgame.accounting?.embezzlementRevealed && (endgame.accounting?.embezzlementRecords?.length || 0) > 0 && (
                <div className="p-4 rounded bg-red-950/30 border border-red-900/60 text-xs text-red-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-red-400">
                    <AlertTriangle className="w-4 h-4" />
                    UNSEALED EMBEZZLEMENT LOGS
                  </div>
                  <p className="text-slate-300">
                    Governor siphoning was proven during the expedition. All diverted timber has been logged above.
                  </p>
                </div>
              )}

              {/* Host Action to proceed */}
              <div className="pt-4 border-t border-[#1a263a] flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-slate-500 italic font-serif">
                  &ldquo;The wood never lies; only the names affixed to it.&rdquo;
                </span>
                <button
                  id="proceed-to-confessions-btn"
                  onClick={onAdvanceStep}
                  className="w-full sm:w-auto px-5 py-2.5 rounded font-bold text-xs uppercase tracking-wider bg-amber-600 hover:bg-amber-500 text-slate-950 flex items-center justify-center gap-2 transition-colors shadow-lg"
                >
                  Proceed to Confessions (Step B)
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP B: THE CONFESSION (PRIVATE, OPTIONAL, 60s)         */}
        {/* ======================================================== */}
        {endgame.step === 'confession' && (
          <div className="space-y-6">
            <div className="p-6 rounded-lg bg-[#090e1a] border border-[#203047] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b283d] pb-4">
                <div>
                  <div className="text-xs uppercase tracking-widest text-slate-400">Step B — Confidential Inscription</div>
                  <h2 className="text-lg font-serif font-bold text-slate-100">The Confession</h2>
                </div>
                {secondsRemaining !== null && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-red-950/40 border border-red-800/80 text-red-300 text-xs font-bold font-mono">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    <span>Window Closes In: {secondsRemaining}s</span>
                  </div>
                )}
              </div>

              <div className="p-4 rounded bg-[#060a14] border border-[#18263b] text-slate-300 text-xs leading-relaxed space-y-2">
                <p className="font-serif italic text-sm text-slate-200">
                  &ldquo;You have 60 seconds. Say something. It will be read aloud.&rdquo;
                </p>
                <p className="text-slate-400">
                  Max 200 characters. Once sealed, words cannot be altered or struck from the record. If you submit nothing,
                  the colony annals will record: <em className="text-slate-200">&ldquo;They said nothing.&rdquo;</em>
                </p>
              </div>

              {confessionSubmitted ? (
                <div className="p-5 rounded bg-emerald-950/30 border border-emerald-800 text-emerald-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <Check className="w-4 h-4" />
                    Confession Sealed Into Registry
                  </div>
                  <p className="text-slate-300 italic font-serif text-sm">
                    &ldquo;{confessionInput || 'They said nothing.'}&rdquo;
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Awaiting remaining castaways or timer conclusion before public reveal.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <textarea
                      id="confession-textarea"
                      rows={3}
                      maxLength={200}
                      value={confessionInput}
                      onChange={e => setConfessionInput(e.target.value)}
                      placeholder="Write your final testimony or defense..."
                      className="w-full p-3.5 rounded bg-[#04070f] border border-[#1f2f45] text-slate-200 text-sm font-sans focus:outline-none focus:border-amber-500 resize-none"
                    />
                    <div className="absolute right-3 bottom-3 text-[10px] text-slate-500 font-mono">
                      {confessionInput.length}/200
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-500">
                      Confessions recorded: {Object.keys(endgame.confessions || {}).length} / {players.length}
                    </span>
                    <button
                      id="seal-confession-btn"
                      onClick={() => handleConfessionSubmit(false)}
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded font-bold text-xs uppercase tracking-wider bg-amber-600 hover:bg-amber-500 text-slate-950 flex items-center gap-2 transition-colors shadow-lg disabled:opacity-50"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Seal Confession
                    </button>
                  </div>
                </div>
              )}

              {/* Host Advance Override */}
              <div className="pt-4 border-t border-[#1a263a] flex items-center justify-between text-xs text-slate-500">
                <span>
                  {Object.keys(endgame.confessions || {}).length} of {players.length} castaways submitted.
                </span>
                <button
                  id="advance-to-reveal-btn"
                  onClick={onAdvanceStep}
                  className="px-4 py-2 rounded bg-[#162234] hover:bg-[#20324c] text-slate-200 text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Begin Truth Reveal (Step C) →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP C: THE TRUTH REVEAL (PUBLIC, 3-SECOND BEATS)       */}
        {/* ======================================================== */}
        {endgame.step === 'reveal' && currentReveal && (
          <div className="space-y-6">
            <div className="p-6 rounded-lg bg-[#090e1a] border border-[#203047] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b283d] pb-4">
                <div>
                  <div className="text-xs uppercase tracking-widest text-slate-400">Step C — The Inquest</div>
                  <h2 className="text-lg font-serif font-bold text-slate-100">
                    The Truth Reveal
                  </h2>
                </div>
                <div className="px-3 py-1 rounded bg-[#121c2e] border border-[#22334b] text-amber-400 text-xs font-bold">
                  Castaway {currentRevealIdx + 1} of {totalReveals} · Reverse Contribution Order
                </div>
              </div>

              {/* The Revealed Player Card */}
              <div className="p-6 rounded bg-[#040812] border border-[#1b2a40] space-y-5 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#142033] pb-4">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">Target Subject</span>
                    <h3 className="text-2xl font-serif font-black text-slate-100">
                      {currentReveal.playerName}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Role Badge Unmasked */}
                    <span className="px-3 py-1 rounded bg-amber-950/60 border border-amber-600/80 text-amber-300 text-xs font-bold uppercase tracking-wider">
                      Role: {currentReveal.role.replace(/_/g, ' ')}
                    </span>

                    {/* Fate Badge */}
                    <span
                      className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                        currentReveal.seatStatus === 'ESCAPED'
                          ? 'bg-emerald-950/60 border border-emerald-600/80 text-emerald-300'
                          : currentReveal.seatStatus === 'DROWNED'
                          ? 'bg-red-950/60 border border-red-700 text-red-300'
                          : currentReveal.seatStatus === 'SOLO ESCAPE'
                          ? 'bg-purple-950/60 border border-purple-700 text-purple-300'
                          : 'bg-amber-950/40 border border-amber-800/80 text-amber-400'
                      }`}
                    >
                      {currentReveal.seatStatus}
                    </span>
                  </div>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded bg-[#0b1220] border border-[#19273c]">
                    <span className="text-[10px] text-slate-500 uppercase block">True Labor Delivered</span>
                    <span className="text-lg font-bold text-slate-100">{currentReveal.trueLabor}</span>
                  </div>
                  <div className="p-3 rounded bg-[#0b1220] border border-[#19273c]">
                    <span className="text-[10px] text-slate-500 uppercase block">Claimed in Ledger</span>
                    <span className="text-lg font-bold text-slate-300">{currentReveal.claimedLabor}</span>
                  </div>
                  <div className="p-3 rounded bg-[#0b1220] border border-[#19273c]">
                    <span className="text-[10px] text-slate-500 uppercase block">Cumulative Gap</span>
                    <span
                      className={`text-lg font-bold ${
                        currentReveal.gap > 0
                          ? 'text-red-400'
                          : currentReveal.gap < 0
                          ? 'text-emerald-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {currentReveal.gap > 0 ? `+${currentReveal.gap}` : currentReveal.gap}
                    </span>
                  </div>
                  <div className="p-3 rounded bg-[#0b1220] border border-[#19273c]">
                    <span className="text-[10px] text-slate-500 uppercase block">Final Stash & Rep</span>
                    <span className="text-base font-bold text-amber-400">
                      {currentReveal.stash} <span className="text-xs font-normal text-slate-400">Stash</span> ·{' '}
                      <span
                        className={
                          currentReveal.reputation > 0
                            ? 'text-emerald-400'
                            : currentReveal.reputation < 0
                            ? 'text-red-400'
                            : 'text-slate-400'
                        }
                      >
                        {currentReveal.reputation > 0 ? `+${currentReveal.reputation}` : currentReveal.reputation}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Confession Quote */}
                <div className="p-4 rounded bg-[#090f1d] border border-[#17253b] space-y-1">
                  <span className="text-[10px] uppercase tracking-widest text-slate-500 block">Their Confession</span>
                  <p className="text-sm font-serif italic text-slate-200">
                    &ldquo;{currentReveal.confession || 'They said nothing.'}&rdquo;
                  </p>
                </div>

                {/* Gemini Narration */}
                <div className="p-4 rounded bg-[#0e1628] border border-amber-900/40 text-amber-200 text-xs space-y-1.5">
                  <span className="text-[10px] uppercase tracking-widest text-amber-500 block font-bold">
                    Chronicle Record
                  </span>
                  <p className="font-serif italic text-sm leading-relaxed text-slate-100">
                    &ldquo;{currentReveal.narration}&rdquo;
                  </p>
                </div>
              </div>

              {/* Progress and Skip Beat Button */}
              <div className="pt-4 border-t border-[#1a263a] flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Revealing from lowest contributor to highest ({currentRevealIdx + 1} of {totalReveals}).
                </span>
                <button
                  id="advance-reveal-beat-btn"
                  onClick={onAdvanceReveal}
                  className="px-5 py-2.5 rounded font-bold text-xs uppercase tracking-wider bg-amber-600 hover:bg-amber-500 text-slate-950 flex items-center gap-2 transition-colors shadow-lg"
                >
                  {currentRevealIdx < totalReveals - 1 ? (
                    <>
                      Next Castaway
                      <ChevronRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Proceed to Blame Vote
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP D: THE BLAME VOTE (30s, WEIGHTED)                  */}
        {/* ======================================================== */}
        {endgame.step === 'blame_vote' && (
          <div className="space-y-6">
            <div className="p-6 rounded-lg bg-[#090e1a] border border-[#203047] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b283d] pb-4">
                <div>
                  <div className="text-xs uppercase tracking-widest text-red-400 font-bold">Step D — The Assembly</div>
                  <h2 className="text-2xl font-serif font-black text-slate-100 tracking-tight">Who Sank Us?</h2>
                </div>
                {secondsRemaining !== null && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-red-950/40 border border-red-800 text-red-300 text-xs font-bold font-mono">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    <span>Ballots Close In: {secondsRemaining}s</span>
                  </div>
                )}
              </div>

              <div className="p-4 rounded bg-[#080d19] border border-[#1b2a40] text-xs text-slate-300 space-y-1 leading-relaxed font-sans">
                <p>
                  Every participant gets one ballot. Drowned spectators, stranded castaways, and escaped survivors hold equal
                  standing. You cannot vote for yourself.
                </p>
                <div className="font-mono text-amber-400 font-bold text-[11px] pt-1">
                  Your Cast Vote Weight: {voterWeight}x{' '}
                  {game.mode === 'island' && (
                    <span className="text-slate-400 font-normal">
                      ({!userProfile?.temptationAccepted ? '+1 Resistance' : ''}{' '}
                      {!userProfile?.offerAccepted ? '+2 Refused Offer' : ''})
                    </span>
                  )}
                </div>
              </div>

              {hasVotedBlame ? (
                <div className="p-5 rounded bg-emerald-950/30 border border-emerald-800 text-emerald-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <Check className="w-4 h-4" />
                    Ballot Cast Against {players.find(p => p.id === selectedBlameTarget)?.displayName || 'Accused'} ({voterWeight}x Weight)
                  </div>
                  <p className="text-slate-400">
                    Awaiting ballot close or host resolution. Ties are broken by highest cumulative gap.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="text-xs text-slate-400 block font-mono">
                    Select the castaway who caused the vessel's destruction:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {players
                      .filter(p => p.id !== currentUserId)
                      .map(p => (
                        <label
                          key={p.id}
                          className={`p-3.5 rounded border flex items-center justify-between cursor-pointer transition-colors ${
                            selectedBlameTarget === p.id
                              ? 'bg-red-950/50 border-red-500 text-red-200 ring-1 ring-red-500'
                              : 'bg-[#050914] border-[#1a293f] text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="blameTarget"
                              value={p.id}
                              checked={selectedBlameTarget === p.id}
                              onChange={() => setSelectedBlameTarget(p.id)}
                              className="text-red-500 focus:ring-0"
                            />
                            <div>
                              <div className="font-serif font-bold text-sm text-slate-100">{p.displayName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                Gap: {endgame.accounting?.gaps?.[p.id] || 0} · Rep: {p.reputation}
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      id="cast-blame-vote-btn"
                      onClick={handleBlameVoteSubmit}
                      disabled={!selectedBlameTarget || isSubmitting}
                      className="px-6 py-2.5 rounded font-bold text-xs uppercase tracking-wider bg-red-700 hover:bg-red-600 text-white font-mono flex items-center gap-2 transition-colors shadow-lg disabled:opacity-50"
                    >
                      <Gavel className="w-3.5 h-3.5" />
                      Cast Blame Ballot ({voterWeight}x)
                    </button>
                  </div>
                </div>
              )}

              {/* Host Resolve Vote Button */}
              <div className="pt-4 border-t border-[#1a263a] flex items-center justify-between text-xs text-slate-500">
                <span>
                  Ballots Recorded: {endgame.blameVotes?.length || 0} / {players.length}
                </span>
                <button
                  id="tally-blame-verdict-btn"
                  onClick={onResolveBlame}
                  className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold uppercase tracking-wider transition-colors"
                >
                  Tally Ballots & Deliver Verdict →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP E: THE VERDICT & EPITAPH (THE FINALE)               */}
        {/* ======================================================== */}
        {endgame.step === 'verdict' && (
          <div className="space-y-8">
            {/* The Condemned Card */}
            <div className="p-6 sm:p-8 rounded-lg bg-[#090e1a] border border-red-900/60 relative overflow-hidden shadow-2xl space-y-6">
              {/* STAMPED GUILTY BADGE */}
              <div className="flex items-center justify-between border-b border-[#1f2d42] pb-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest">Colony Judgment</span>
                  <h2 className="text-xl font-serif font-bold text-slate-100">The Condemnation</h2>
                </div>

                <div className="px-4 py-1.5 rounded bg-red-900/80 border-2 border-red-500 text-red-100 font-mono text-sm font-black uppercase tracking-widest shadow-lg rotate-1 transform">
                  ★ GUILTY ★
                </div>
              </div>

              {/* The Guilty Name & Scarlet Mark */}
              <div className="text-center py-4 space-y-2">
                <div className="text-3xl sm:text-4xl font-serif font-black text-red-400 tracking-tight">
                  {endgame.guiltyNames ? endgame.guiltyNames.join(' & ') : endgame.guiltyName}
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {endgame.isTie ? 'Deadlocked Blame Ballot · Bound in Ruin' : 'Named by Majority Inquest & Audit Discrepancy'}
                </div>

                {game.constitution?.blameClause === 'binding' && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-red-950/80 border border-red-800 text-red-300 text-xs font-mono font-bold mt-2">
                    <Shield className="w-3.5 h-3.5" />
                    MARKED BY THE TABLE — PERMANENT DEFAMATION (-5 REPUTATION)
                  </div>
                )}
              </div>

              {/* Island Mode Sentence if Present */}
              {endgame.guiltySentence && (
                <div className="p-4 rounded bg-[#0c1221] border border-purple-900/60 text-purple-200 text-xs space-y-1">
                  <span className="text-[10px] uppercase tracking-widest text-purple-400 font-bold block">
                    Island Decree
                  </span>
                  <p className="font-serif italic text-sm text-purple-100 leading-relaxed">
                    &ldquo;{endgame.guiltySentence}&rdquo;
                  </p>
                </div>
              )}

              {/* Gemini Verdict */}
              <div className="p-5 rounded bg-[#050811] border border-[#1a283e] space-y-2 text-slate-300">
                <span className="text-[10px] uppercase tracking-widest text-amber-500 font-bold block">
                  Tribunal Finding
                </span>
                <p className="font-serif italic text-sm sm:text-base leading-relaxed text-slate-100">
                  &ldquo;{endgame.verdict}&rdquo;
                </p>
              </div>

              {/* Gemini Epitaph (The Final Monument) */}
              <div className="p-6 rounded bg-[#060b18] border border-amber-500/40 space-y-3 relative">
                <div className="text-xs uppercase tracking-widest text-amber-400 font-bold flex items-center gap-2">
                  <Anchor className="w-4 h-4" />
                  THE EPITAPH
                </div>
                <p className="font-serif text-base sm:text-lg italic leading-relaxed text-slate-100 selection:bg-amber-900">
                  &ldquo;{endgame.epitaph}&rdquo;
                </p>
              </div>
            </div>

            {/* Comprehensive Scorecard Roster */}
            <div className="p-6 rounded-lg bg-[#090e1a] border border-[#203047] space-y-4">
              <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                Final Session Scorecard
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left font-mono">
                  <thead>
                    <tr className="border-b border-[#1a283e] text-slate-500 uppercase text-[10px]">
                      <th className="py-2 pr-3">Castaway</th>
                      <th className="py-2 px-3">Role</th>
                      <th className="py-2 px-3">Fate</th>
                      <th className="py-2 px-3">Gap</th>
                      <th className="py-2 px-3">Stash</th>
                      <th className="py-2 pl-3">Reputation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#121c2c]">
                    {players.map(p => {
                      const reveal = endgame.reveals?.find(r => r.playerId === p.id);
                      const isGuilty = (endgame.guiltyIds || [endgame.guiltyId]).includes(p.id);
                      return (
                        <tr key={p.id} className={isGuilty ? 'bg-red-950/20' : ''}>
                          <td className="py-2.5 pr-3 font-serif font-bold text-slate-200">
                            {p.displayName} {isGuilty && <span className="text-red-400 font-mono text-[10px]">[GUILTY]</span>}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">{reveal?.role.replace(/_/g, ' ') || 'ORDINARY PERSON'}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                reveal?.seatStatus === 'ESCAPED'
                                  ? 'bg-emerald-950 text-emerald-400'
                                  : reveal?.seatStatus === 'DROWNED'
                                  ? 'bg-red-950 text-red-400'
                                  : 'bg-amber-950 text-amber-400'
                              }`}
                            >
                              {reveal?.seatStatus || 'LEFT BEHIND'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {endgame.accounting?.gaps?.[p.id] || 0}
                          </td>
                          <td className="py-2.5 px-3 text-amber-400 font-bold">{p.stash || 0}</td>
                          <td className="py-2.5 pl-3">
                            <span
                              className={
                                p.reputation > 0
                                  ? 'text-emerald-400 font-bold'
                                  : p.reputation < 0
                                  ? 'text-red-400 font-bold'
                                  : 'text-slate-400'
                              }
                            >
                              {p.reputation > 0 ? `+${p.reputation}` : p.reputation}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-[#1a283e] flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                id="download-final-ledger-btn"
                onClick={handleDownloadDoc}
                className="w-full sm:w-auto px-5 py-2.5 rounded bg-[#131d2e] hover:bg-[#1a2840] text-slate-200 text-xs border border-[#253752] flex items-center justify-center gap-2 transition-colors font-mono"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                Download True Ledger (.txt)
              </button>

              <button
                id="play-again-btn"
                onClick={onReset}
                className="w-full sm:w-auto px-6 py-2.5 rounded font-bold text-xs uppercase tracking-wider bg-[#ea580c] hover:bg-[#c2410c] text-white flex items-center justify-center gap-2 transition-colors shadow-lg font-mono"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Return to Shore (New Expedition)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
