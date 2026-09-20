import React from 'react';
import {
  ArrowRight,
  FileText,
  Compass,
  AlertTriangle,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Shield,
  Star,
  Sparkles,
  Wind,
  ShieldCheck,
} from 'lucide-react';
import type { LedgerData, PlayerData, GameData } from '../types.js';

interface LedgerViewProps {
  game: GameData;
  ledger: LedgerData | null;
  players: PlayerData[];
  currentUserId: string;
  isHost: boolean;
  onAdvanceRound: () => Promise<void>;
  isLoading: boolean;
}

export const LedgerView: React.FC<LedgerViewProps> = ({
  game,
  ledger,
  players,
  currentUserId,
  isHost,
  onAdvanceRound,
  isLoading,
}) => {
  const currentRound = game.round || 1;
  const isFinalRound = currentRound >= 3;

  const entries = ledger?.entries || {};
  const verifiedEntries = ledger?.verifiedEntries || {};
  const audits = ledger?.audits || [];
  const repDeltas = ledger?.repDeltas || {};
  const publicCardsPlayed = ledger?.publicCardsPlayed || [];
  const publicTotal = ledger?.publicTotal ?? 0;

  return (
    <div id="public-ledger-view" className="space-y-6 my-6">
      {/* Bureaucratic Document Card */}
      <div className="ledger-document rounded-lg p-6 sm:p-8 font-mono">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#28374d]">
          <div>
            <div className="flex items-center gap-2 text-xs text-amber-500 font-bold uppercase tracking-widest">
              <FileText className="w-3.5 h-3.5" />
              Department of Maritime Survival & Salvage
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-black text-slate-100 mt-1">
              Public Ledger & Inquest Inscription
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Official Log for Day 0{currentRound} • Stage: {game.raftStage.toUpperCase()}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="ink-stamp text-xs">
              RECORDED & AUDITED
            </div>
          </div>
        </div>

        {/* Public Scheme Proclamations (e.g. Saint) */}
        {publicCardsPlayed.length > 0 && (
          <div className="my-5 p-3.5 rounded-lg bg-amber-950/40 border border-amber-800/80">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Public Scheme Proclamations</span>
            </div>
            <div className="space-y-1.5">
              {publicCardsPlayed.map((pc, idx) => (
                <div key={idx} className="text-xs text-slate-200 flex items-center gap-2">
                  <span className="font-bold text-amber-300 font-serif">{pc.playerName}</span>
                  <span className="text-slate-400">invoked</span>
                  <span className="px-1.5 py-0.2 rounded bg-yellow-950 text-yellow-300 border border-yellow-800 text-[10px] font-bold">
                    {pc.cardName}
                  </span>
                  <span className="text-slate-400">— {pc.effect}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Public Claim Table */}
        <div className="my-6 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#28374d] text-slate-400 text-xs uppercase tracking-wider">
                <th className="py-2.5 px-3">Castaway</th>
                <th className="py-2.5 px-3 text-center">Declared Labor</th>
                <th className="py-2.5 px-3 text-center">Reputation Score</th>
                <th className="py-2.5 px-3 text-right">Attestation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2a3b] text-sm">
              {players.map((p) => {
                const claimed = entries[p.id];
                const isMe = p.id === currentUserId;
                const repDelta = repDeltas[p.id];
                const isSaintVerified = verifiedEntries[p.id];

                return (
                  <tr
                    key={p.id}
                    id={`ledger-row-${p.id}`}
                    className={`hover:bg-[#161f2e] transition-colors ${
                      isMe ? 'bg-[#182333]/80' : ''
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-slate-200">
                          {p.displayName}
                        </span>
                        {isMe && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800/40">
                            YOU
                          </span>
                        )}
                        {p.isHost && (
                          <span className="text-[10px] text-slate-500">[LEADER]</span>
                        )}
                      </div>
                    </td>

                    {/* Claimed Labor Column */}
                    <td className="py-3 px-3 text-center font-bold text-amber-400">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>
                          {claimed !== undefined ? (
                            typeof claimed === 'number' ? `${claimed} units` : claimed
                          ) : (
                            '—'
                          )}
                        </span>
                        {isSaintVerified && (
                          <span className="px-1.5 py-0.2 rounded bg-yellow-900/60 border border-yellow-700 text-yellow-300 text-[10px] flex items-center gap-1 font-bold">
                            <ShieldCheck className="w-3 h-3" /> SAINT VERIFIED
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Reputation Column */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5 font-mono text-xs">
                        <span
                          className={`font-bold ${
                            p.reputation > 0
                              ? 'text-emerald-400'
                              : p.reputation < 0
                              ? 'text-red-400'
                              : 'text-slate-300'
                          }`}
                        >
                          {p.reputation > 0 ? `+${p.reputation}` : p.reputation} Rep
                        </span>

                        {repDelta !== undefined && repDelta !== 0 && (
                          <span
                            className={`text-[10px] px-1 rounded font-bold ${
                              repDelta > 0
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-red-950 text-red-300 border border-red-800'
                            }`}
                          >
                            {repDelta > 0 ? `+${repDelta}` : repDelta}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right text-xs text-slate-400">
                      {claimed === '—' ? (
                        <span className="text-slate-500 italic">Unrecorded</span>
                      ) : isSaintVerified ? (
                        <span className="text-yellow-400 font-bold">Divine Truth</span>
                      ) : (
                        <span className="text-emerald-500 font-semibold">Signed in Ink</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#324560] bg-[#0c121e]">
                <td className="py-3 px-3 font-bold text-slate-200 uppercase tracking-wider text-xs">
                  Public Claim Total
                </td>
                <td className="py-3 px-3 text-center font-bold text-amber-400 text-base">
                  {publicTotal} Units Pledged
                </td>
                <td colSpan={2} className="py-3 px-3 text-right text-xs text-slate-500">
                  {players.length} Castaways
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Audit Inquest Results Board */}
        {audits.length > 0 && (
          <div className="my-6 p-4 rounded-lg bg-[#070b13] border border-amber-900/60 font-mono">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-400 mb-3">
              <Search className="w-4 h-4 text-amber-400" />
              <span>Inquest Board & Formal Audits</span>
            </div>

            <div className="space-y-3">
              {audits.map((audit, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded border text-xs leading-relaxed ${
                    audit.result === 'lie'
                      ? 'bg-red-950/40 border-red-800/80 text-red-200'
                      : audit.result === 'no_data'
                      ? 'bg-slate-900/60 border-slate-700 text-slate-300'
                      : 'bg-emerald-950/30 border-emerald-900 text-emerald-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-2">
                      {audit.result === 'lie' && (
                        <span className="px-2 py-0.5 rounded bg-red-900/80 text-white font-bold text-[10px] tracking-wider uppercase">
                          Deceit Exposed
                        </span>
                      )}
                      {audit.result === 'honest' && (
                        <span className="px-2 py-0.5 rounded bg-emerald-900/80 text-white font-bold text-[10px] tracking-wider uppercase">
                          Unfounded Accusation
                        </span>
                      )}
                      {audit.result === 'no_data' && (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-bold text-[10px] tracking-wider uppercase">
                          No Manifest Records
                        </span>
                      )}

                      <span className="font-bold text-slate-100">
                        {audit.auditorName} audited {audit.targetName}
                        {audit.redirectedFromName && (
                          <span className="text-sky-300 text-[10px] font-mono ml-1">
                            [Diverted from {audit.redirectedFromName}]
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono">
                      {audit.result === 'lie' && (
                        <span className="text-amber-400 font-bold">
                          Claimed: {audit.claimed} • True Labor: {audit.actual}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-300 font-sans text-xs">
                    {audit.result === 'lie' && (
                      <>
                        <strong>{audit.auditorName}</strong> exposed <strong>{audit.targetName}</strong>!{' '}
                        {audit.targetName} fabricated {((audit.claimed || 0) - (audit.actual || 0))} units of phantom labor.{' '}
                        <span className="text-red-400 font-bold font-mono">
                          {audit.targetName} lost 4 Reputation
                        </span>
                        , and{' '}
                        <span className="text-emerald-400 font-bold font-mono">
                          {audit.auditorName} gained 3 Reputation
                        </span>
                        .
                      </>
                    )}
                    {audit.result === 'honest' && (
                      <>
                        <strong>{audit.targetName}</strong> delivered genuine labor matching their declaration.{' '}
                        <strong>{audit.auditorName}</strong> wasted the expedition&apos;s time with a baseless inquest.{' '}
                        <span className="text-red-400 font-bold font-mono">
                          {audit.auditorName} lost 3 Reputation
                        </span>
                        , while{' '}
                        <span className="text-emerald-400 font-bold font-mono">
                          {audit.targetName} gained 2 Reputation
                        </span>
                        .
                      </>
                    )}
                    {audit.result === 'no_data' && (
                      <>
                        Audit inquiry into <strong>{audit.targetName}</strong> returned no conclusive logs in the beach manifest.{' '}
                        <span className="text-red-400 font-bold font-mono">
                          {audit.auditorName} lost 1 Reputation
                        </span>
                        {' '}for unverified search proceedings.
                      </>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Physical Raft Assessment (Vague description only, never reveals true numbers) */}
        <div className="p-4 rounded bg-[#0b101b] border border-[#23334a] space-y-3">
          <div className="flex items-start gap-2.5">
            <Compass className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                Tide & Timber Inspection (Confidential)
              </div>
              <p className="text-sm text-slate-200 italic font-serif mt-0.5">
                &ldquo;{ledger?.stageProgressStatus || game.gmNarration || 'The raft creaks forward against the darkening swells.'}&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* GM Deadpan Narration Box */}
        {game.gmNarration && (
          <div className="mt-4 p-4 rounded bg-[#162030] border-l-2 border-amber-600 text-xs text-slate-300">
            <span className="font-bold text-amber-500 uppercase tracking-widest block mb-1">
              Game Master Dispatch:
            </span>
            <p className="italic font-serif text-sm text-slate-100 leading-relaxed">
              &ldquo;{game.gmNarration}&rdquo;
            </p>
          </div>
        )}

        {/* Advance Control */}
        <div className="mt-6 pt-6 border-t border-[#23334a] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            {isHost ? (
              <span>
                As Expedition Host, you may signal progression to{' '}
                {isFinalRound ? 'the Final Expedition Resolution' : `Day 0${currentRound + 1}`}.
              </span>
            ) : (
              <span>Waiting for Expedition Host to advance the expedition...</span>
            )}
          </div>

          {isHost && (
            <button
              id="advance-round-btn"
              onClick={onAdvanceRound}
              disabled={isLoading}
              className="px-6 py-3 rounded font-bold text-xs uppercase tracking-wider bg-[#ea580c] hover:bg-[#c2410c] text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg transition-colors"
            >
              {isFinalRound ? (
                <>
                  <span>Conclude Expedition (Day 3 Climax)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Proceed to Day 0{currentRound + 1} Scavenge</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
