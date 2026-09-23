import React, { useState } from 'react';
import {
  Hammer,
  Lock,
  EyeOff,
  Sparkles,
  Moon,
  Send,
  AlertCircle,
  Search,
  UserCheck,
  Shield,
  Zap,
  Layers,
  X,
  Feather,
  Radio,
  FileSpreadsheet,
  Wind,
  ShieldCheck,
  Info,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import type { PlayerData, AllocationPayload, PrivatePlayerProfile, SchemeCardId, RaftStage } from '../types.js';
import { getRaftStageNumber } from '../types.js';
import { ARCHETYPES } from '../lib/archetypes.js';
import { SCHEME_CARDS, canPlaySaint } from '../lib/cards.js';

interface ScavengePhaseProps {
  player: PlayerData;
  profile: PrivatePlayerProfile | null;
  otherPlayers: PlayerData[];
  roundNumber: number;
  raftStage?: RaftStage;
  totalCastaways: number;
  submittedCount: number;
  hasSubmitted: boolean;
  selectedScavengeCard: SchemeCardId | null;
  selectedScavengeCardIndex?: number | null;
  onSelectScavengeCard: (cardId: SchemeCardId | null, cardIndex?: number | null) => void;
  onSubmitAllocation: (allocation: AllocationPayload) => Promise<void>;
  onExecuteRoleAction?: (actionType: string, payload?: any) => Promise<any>;
  isLoading: boolean;
}

export const ScavengePhase: React.FC<ScavengePhaseProps> = ({
  player,
  profile,
  otherPlayers,
  roundNumber,
  raftStage,
  totalCastaways,
  submittedCount,
  hasSubmitted,
  selectedScavengeCard,
  selectedScavengeCardIndex,
  onSelectScavengeCard,
  onSubmitAllocation,
  onExecuteRoleAction,
  isLoading,
}) => {
  const currentEnergy = player.energy || 5;

  const [labor, setLabor] = useState(2);
  const [stash, setStash] = useState(2);
  const [scheme, setScheme] = useState(0);
  const [rest, setRest] = useState(1);
  const [claimedLabor, setClaimedLabor] = useState(3);
  const [auditTargetId, setAuditTargetId] = useState<string>('');
  const [cardTargetId, setCardTargetId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [showLedgerGuide, setShowLedgerGuide] = useState<boolean>(false);

  // Active ability modal states
  const [selectedEndorseTarget, setSelectedEndorseTarget] = useState<string>('');
  const [brokerTargetA, setBrokerTargetA] = useState<string>('');
  const [brokerTargetB, setBrokerTargetB] = useState<string>('');
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const roleKey = profile?.role || 'ORDINARY';
  const archetype = ARCHETYPES[roleKey] || ARCHETYPES.ORDINARY;

  const totalAllocated = labor + stash + scheme + rest;
  const remainingEnergy = currentEnergy - totalAllocated;

  const activeCardDef = selectedScavengeCard ? SCHEME_CARDS[selectedScavengeCard] : null;

  const adjustAction = (
    action: 'labor' | 'stash' | 'scheme' | 'rest',
    delta: number
  ) => {
    setErrorMsg(null);
    if (delta > 0 && remainingEnergy <= 0) return;

    if (action === 'labor') {
      const nextVal = Math.max(0, labor + delta);
      setLabor(nextVal);
    } else if (action === 'stash') {
      const nextVal = Math.max(0, stash + delta);
      setStash(nextVal);
    } else if (action === 'scheme') {
      const nextVal = Math.max(0, scheme + delta);
      setScheme(nextVal);
      if (nextVal === 0) {
        setAuditTargetId('');
      }
    } else if (action === 'rest') {
      const nextVal = Math.max(0, rest + delta);
      setRest(nextVal);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // FIX-07: Auto-heal stale audit target instead of letting the server reject.
    if (auditTargetId && scheme < 1) {
      setAuditTargetId('');
      setErrorMsg('Audit target cleared — you must allocate at least 1 Scheme point to audit.');
      return;
    }

    if (totalAllocated !== currentEnergy) {
      setErrorMsg(`You must allocate exactly all ${currentEnergy} energy points.`);
      return;
    }
    if (claimedLabor < 0) {
      setErrorMsg('Claimed labor cannot be negative.');
      return;
    }

    if (selectedScavengeCard) {
      const currentStage = getRaftStageNumber(raftStage, roundNumber);
      if (activeCardDef?.minStage && currentStage < activeCardDef.minStage) {
        setErrorMsg(`${activeCardDef.name} cannot be played until Stage ${activeCardDef.minStage}.`);
        return;
      }
      if (activeCardDef?.requiresTarget && !cardTargetId) {
        setErrorMsg(`Scheme card "${activeCardDef.name}" requires selecting a target castaway.`);
        return;
      }
      if (selectedScavengeCard === 'saint') {
        const trueLabor = auditTargetId ? 0 : labor;
        if (!canPlaySaint({ trueLabor, claimedLabor })) {
          setErrorMsg('Saint card requires true physical Labor to be greater than or equal to claimed Labor.');
          return;
        }
      }
    }

    try {
      await onSubmitAllocation({
        labor,
        stash,
        scheme,
        rest,
        claimedLabor,
        auditTargetId: auditTargetId || null,
        playedCardId: selectedScavengeCard || null,
        playedCardIndex: selectedScavengeCardIndex ?? null,
        cardTargetId: cardTargetId || null,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit allocation.');
    }
  };

  // Prepper stash conversion active ability
  const handlePrepperStashConvert = async () => {
    if (!onExecuteRoleAction) return;
    try {
      setErrorMsg(null);
      const res = await onExecuteRoleAction('prepper_stash');
      setActionSuccessMsg(res?.message || 'Converted 2 Stash into 1 Labor!');
      // Adjust local labor allocation
      setLabor(l => l + 1);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to convert stash.');
    }
  };

  // Influencer endorsement active ability
  const handleEndorse = async () => {
    if (!onExecuteRoleAction || !selectedEndorseTarget) return;
    try {
      setErrorMsg(null);
      const res = await onExecuteRoleAction('endorse', { targetId: selectedEndorseTarget });
      setActionSuccessMsg(res?.message || 'Endorsement broadcasted!');
      setActiveModal(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to endorse player.');
    }
  };

  // Broker deal active ability
  const handleBrokerDeal = async () => {
    if (!onExecuteRoleAction || !brokerTargetA || !brokerTargetB) return;
    if (brokerTargetA === brokerTargetB) {
      setErrorMsg('Broker must select two distinct castaways.');
      return;
    }
    try {
      setErrorMsg(null);
      const res = await onExecuteRoleAction('broker_deal', {
        targetIdA: brokerTargetA,
        targetIdB: brokerTargetB,
      });
      setActionSuccessMsg(res?.message || 'Deal brokered successfully.');
      setActiveModal(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to broker deal.');
    }
  };

  if (hasSubmitted) {
    return (
      <div id="submission-locked-card" className="wood-panel rounded-lg border border-[#23334d] p-6 sm:p-8 text-center my-6">
        <div className="w-12 h-12 rounded-full bg-[#131e30] border border-[#2a3c57] flex items-center justify-center mx-auto mb-4 text-amber-500">
          <Lock className="w-6 h-6" />
        </div>
        <div className="inline-block px-3 py-0.5 rounded bg-emerald-950/60 border border-emerald-900 text-emerald-400 font-mono text-xs uppercase tracking-wider mb-2 font-bold">
          Allocation Inscribed & Attested
        </div>
        <h2 className="text-2xl font-serif font-bold text-slate-100">
          Your Secret Work Is Sealed
        </h2>
        <p className="text-xs sm:text-sm font-mono text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
          Your physical exertions, hoarded stash, and audit inquiries are locked. Once all castaways complete their allocations, the official public ledger will be resolved.
        </p>

        <div className="mt-6 p-4 rounded bg-[#0b111c] border border-[#1d2a3e] max-w-sm mx-auto">
          <div className="text-xs font-mono text-slate-400 mb-1">Awaiting Fellow Castaways</div>
          <div className="text-xl font-mono font-bold text-amber-400">
            {submittedCount} / {totalCastaways} Inscriptions Received
          </div>
          <div className="w-full bg-[#162133] h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-amber-500 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, (submittedCount / Math.max(1, totalCastaways)) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="scavenge-phase-form" className="wood-panel rounded-lg border border-[#23334d] p-5 sm:p-7 my-6">
      {/* Phase Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#1c283c]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-amber-500 font-mono text-xs uppercase tracking-widest font-semibold">
              Round {roundNumber} Scavenge Phase
            </span>
            <span className="text-slate-600 text-xs">/</span>
            <span className="text-slate-400 font-mono text-xs uppercase">Secret Allocation & Audits</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-100 tracking-tight mt-0.5">
            Survival Distribution
          </h2>
        </div>

        {/* Energy Budget Pill */}
        <div className="flex items-center gap-3 bg-[#0d1422] border border-[#223147] px-4 py-2 rounded">
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">Available Energy</span>
            <span
              className={`text-sm font-mono font-bold ${
                remainingEnergy === 0
                  ? 'text-emerald-400'
                  : remainingEnergy < 0
                  ? 'text-red-400'
                  : 'text-amber-400'
              }`}
            >
              {remainingEnergy} / {currentEnergy} Unspent
            </span>
          </div>
        </div>
      </div>

      {/* Success banner if role action executed */}
      {actionSuccessMsg && (
        <div className="mt-4 p-3 rounded bg-emerald-950/60 border border-emerald-800 text-xs font-mono text-emerald-300 flex items-center justify-between">
          <span>{actionSuccessMsg}</span>
          <button onClick={() => setActionSuccessMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Archetype Quick Action Banner (if active ability exists) */}
      {archetype.buttonLabel && (
        <div className="mt-4 p-3.5 rounded bg-[#10192a] border border-[#233550] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#18263e] border border-[#2d4365] flex items-center justify-center text-sky-400">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-slate-200">
                Archetype Ability: {archetype.activeTitle}
              </div>
              <div className="text-[11px] text-slate-400 font-sans">
                {archetype.activeDesc}
              </div>
            </div>
          </div>

          <div>
            {roleKey === 'PREPPER' && (
              <button
                type="button"
                id="prepper-stash-btn"
                onClick={handlePrepperStashConvert}
                disabled={(profile?.stash || 0) < 2 || isLoading}
                className="w-full sm:w-auto px-3.5 py-1.5 rounded font-mono font-bold text-xs uppercase tracking-wider bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white transition-colors"
              >
                Use Prepper Stash (Cost: 2 Stash)
              </button>
            )}

            {roleKey === 'INFLUENCER' && (
              <button
                type="button"
                id="influencer-endorse-btn"
                onClick={() => setActiveModal('endorse')}
                disabled={isLoading}
                className="w-full sm:w-auto px-3.5 py-1.5 rounded font-mono font-bold text-xs uppercase tracking-wider bg-amber-600 hover:bg-amber-500 text-slate-950 transition-colors"
              >
                Endorse Castaway (-2 Rep)
              </button>
            )}

            {roleKey === 'BROKER' && (
              <button
                type="button"
                id="broker-deal-btn"
                onClick={() => setActiveModal('broker')}
                disabled={isLoading}
                className="w-full sm:w-auto px-3.5 py-1.5 rounded font-mono font-bold text-xs uppercase tracking-wider bg-sky-700 hover:bg-sky-600 text-white transition-colors"
              >
                Broker Deal (Skim Stash)
              </button>
            )}

            {roleKey === 'IDEALIST' && (
              <button
                type="button"
                id="idealist-audit-btn"
                onClick={() => {
                  setScheme(s => (s === 0 ? 1 : s));
                  if (otherPlayers.length > 0 && !auditTargetId) {
                    setAuditTargetId(otherPlayers[0].id);
                  }
                }}
                className="w-full sm:w-auto px-3.5 py-1.5 rounded font-mono font-bold text-xs uppercase tracking-wider bg-indigo-700 hover:bg-indigo-600 text-white transition-colors"
              >
                Demand Audit (Focus Scheme)
              </button>
            )}

            {roleKey === 'GHOST' && (
              <button
                type="button"
                onClick={() => setActionSuccessMsg('Ghost Mimicry: Your ledger entry remains blank regardless of actions.')}
                className="w-full sm:w-auto px-3.5 py-1.5 rounded font-mono font-bold text-xs uppercase tracking-wider bg-slate-700 hover:bg-slate-600 text-white transition-colors"
              >
                Mirror Action
              </button>
            )}

            {roleKey === 'TYRANT' && (
              <button
                type="button"
                onClick={() => setActionSuccessMsg('Tyrant Veto active for future resolutions.')}
                className="w-full sm:w-auto px-3.5 py-1.5 rounded font-mono font-bold text-xs uppercase tracking-wider bg-red-800 hover:bg-red-700 text-white transition-colors"
              >
                Executive Veto
              </button>
            )}

            {roleKey === 'MAYOR' && (
              <button
                type="button"
                onClick={() => setActionSuccessMsg('Mayor Ledger Oversight active.')}
                className="w-full sm:w-auto px-3.5 py-1.5 rounded font-mono font-bold text-xs uppercase tracking-wider bg-amber-700 hover:bg-amber-600 text-white transition-colors"
              >
                Emergency Vote
              </button>
            )}
          </div>
        </div>
      )}

      {/* Endorse Modal */}
      {activeModal === 'endorse' && (
        <div className="mt-4 p-4 rounded bg-[#090f1a] border border-amber-800/80 font-mono text-xs">
          <div className="font-bold text-amber-400 mb-2">Select Castaway to Publicly Endorse:</div>
          <select
            value={selectedEndorseTarget}
            onChange={(e) => setSelectedEndorseTarget(e.target.value)}
            className="w-full p-2 rounded bg-[#060a12] border border-[#2b3d57] text-slate-200 mb-3"
          >
            <option value="">-- Choose Castaway --</option>
            {otherPlayers.map((op) => (
              <option key={op.id} value={op.id}>
                {op.displayName} ({op.reputation} Rep)
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleEndorse}
              disabled={!selectedEndorseTarget}
              className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 font-bold text-slate-900 disabled:opacity-40"
            >
              Transfer 2 Reputation
            </button>
            <button
              onClick={() => setActiveModal(null)}
              className="px-3 py-2 rounded bg-[#162133] text-slate-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Broker Deal Modal */}
      {activeModal === 'broker' && (
        <div className="mt-4 p-4 rounded bg-[#090f1a] border border-sky-800/80 font-mono text-xs">
          <div className="font-bold text-sky-400 mb-2">Select Two Castaways to Broker Trade Between:</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            <select
              value={brokerTargetA}
              onChange={(e) => setBrokerTargetA(e.target.value)}
              className="p-2 rounded bg-[#060a12] border border-[#2b3d57] text-slate-200"
            >
              <option value="">-- Party A --</option>
              {otherPlayers.map((op) => (
                <option key={op.id} value={op.id}>{op.displayName}</option>
              ))}
            </select>
            <select
              value={brokerTargetB}
              onChange={(e) => setBrokerTargetB(e.target.value)}
              className="p-2 rounded bg-[#060a12] border border-[#2b3d57] text-slate-200"
            >
              <option value="">-- Party B --</option>
              {otherPlayers.map((op) => (
                <option key={op.id} value={op.id}>{op.displayName}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleBrokerDeal}
              disabled={!brokerTargetA || !brokerTargetB || brokerTargetA === brokerTargetB}
              className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 font-bold text-white disabled:opacity-40"
            >
              Execute Broker Deal
            </button>
            <button
              onClick={() => setActiveModal(null)}
              className="px-3 py-2 rounded bg-[#162133] text-slate-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Energy Allocation & Ledger Translation Explainer */}
      <div className="mt-5 rounded-lg border border-[#23354f] bg-[#0c1322] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowLedgerGuide(!showLedgerGuide)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#121c2e] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
              <Info className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wide">
                How Energy Allocation Translates to the Morning Ledger
              </span>
              <p className="text-[11px] text-slate-400">
                Understanding Secret Energy vs. Public Claims & The Raft Reality
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 shrink-0">
            <span>{showLedgerGuide ? 'Hide Guide' : 'Show Explanation'}</span>
            {showLedgerGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showLedgerGuide && (
          <div className="px-5 py-4 border-t border-[#1d2c42] bg-[#080d17] space-y-4 text-xs font-sans text-slate-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded bg-[#0f1726] border border-[#22334a] space-y-1.5">
                <div className="flex items-center gap-2 text-slate-100 font-bold font-serif text-sm">
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                  <span>1. Secret Energy Allocation (Night)</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Your energy points are spent in total secrecy. No one else can see your breakdown:
                </p>
                <ul className="space-y-1 text-[11px] text-slate-300 pl-1">
                  <li><strong className="text-amber-300">🔨 Labor (True):</strong> The only energy that genuinely builds the raft. (Becomes 0 if auditing someone).</li>
                  <li><strong className="text-amber-300">🔒 Stash:</strong> Hidden food/supplies hoarded for yourself. Never shown on the Ledger.</li>
                  <li><strong className="text-amber-300">✨ Scheme:</strong> Draw secret cards (2 energy = 1 card) or launch a formal audit inquest.</li>
                  <li><strong className="text-amber-300">🌙 Rest:</strong> Sleeping to wake up with +1 bonus Energy for the next day.</li>
                </ul>
              </div>

              <div className="p-3 rounded bg-[#0f1726] border border-[#22334a] space-y-1.5">
                <div className="flex items-center gap-2 text-slate-100 font-bold font-serif text-sm">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>2. Declared Labor on the Ledger (Morning)</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  The <strong className="text-amber-300">Declared Labor</strong> you write below is the ONLY thing published to the table on the public Ledger:
                </p>
                <ul className="space-y-1 text-[11px] text-slate-300 pl-1">
                  <li><strong className="text-emerald-300">Truthful Claim:</strong> Claim = True Labor. You are safe from audits (+2 Rep if anyone falsely audits you!).</li>
                  <li><strong className="text-amber-300">Exaggerated Claim:</strong> Claim &gt; True Labor. Creates a "Phantom Gap". You look heroic on paper, but risk -4 Rep if audited.</li>
                  <li><strong className="text-rose-300">The Raft Reality:</strong> The Raft ONLY advances by TRUE labor. If everyone claims 5 but hoarded stash, the Ledger total looks huge, but the raft will stall and fail!</li>
                </ul>
              </div>
            </div>

            <div className="p-3 rounded bg-[#131d2e] border border-amber-900/40 text-[11px] text-amber-200/90 leading-relaxed flex items-start gap-2.5">
              <span className="text-base">💡</span>
              <div>
                <strong className="font-bold text-amber-300">Audits & The Final Reckoning:</strong> Fellow castaways who allocate Scheme points can audit your claim. If they catch you lying, you lose 4 Reputation and they gain 3! Furthermore, at the end of the game, the true historical ledger is unmasked during The Reckoning trial to expose the biggest liars and embezzlers.
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Secret Actions Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <EyeOff className="w-3.5 h-3.5 text-slate-500" />
              1. Allocate Energy Across Actions (Hidden from others)
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Action 1: Labor */}
            <div className={`p-3.5 rounded border transition-colors flex items-center justify-between ${
              auditTargetId ? 'bg-[#090e18] border-[#182333] opacity-60' : 'bg-[#0b121e] border-[#1e2c40]'
            }`}>
              <div>
                <div className="flex items-center gap-2">
                  <Hammer className="w-4 h-4 text-amber-500" />
                  <span className="font-serif font-bold text-sm text-slate-100">Labor</span>
                  {auditTargetId && (
                    <span className="text-[9px] font-mono px-1 rounded bg-amber-950 text-amber-400">
                      0 during audit
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                  {auditTargetId
                    ? 'Conducting an audit inquiry means you deliver 0 actual labor this round.'
                    : 'Contributes genuine timber towards raft construction.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="labor-minus-btn"
                  onClick={() => adjustAction('labor', -1)}
                  disabled={labor <= 0 || !!auditTargetId}
                  className="w-8 h-8 rounded bg-[#162133] hover:bg-[#1e2d45] border border-[#283952] text-slate-200 font-mono font-bold disabled:opacity-30"
                >
                  -
                </button>
                <span className="w-7 text-center font-mono font-bold text-amber-400 text-sm">
                  {auditTargetId ? 0 : labor}
                </span>
                <button
                  type="button"
                  id="labor-plus-btn"
                  onClick={() => adjustAction('labor', 1)}
                  disabled={remainingEnergy <= 0 || !!auditTargetId}
                  className="w-8 h-8 rounded bg-[#162133] hover:bg-[#1e2d45] border border-[#283952] text-slate-200 font-mono font-bold disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action 2: Stash */}
            <div className="p-3.5 rounded bg-[#0b121e] border border-[#1e2c40] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span className="font-serif font-bold text-sm text-slate-100">Stash</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                  Secretly hoard provisions (+1 Stash per energy point).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="stash-minus-btn"
                  onClick={() => adjustAction('stash', -1)}
                  disabled={stash <= 0}
                  className="w-8 h-8 rounded bg-[#162133] hover:bg-[#1e2d45] border border-[#283952] text-slate-200 font-mono font-bold disabled:opacity-30"
                >
                  -
                </button>
                <span className="w-7 text-center font-mono font-bold text-amber-400 text-sm">
                  {stash}
                </span>
                <button
                  type="button"
                  id="stash-plus-btn"
                  onClick={() => adjustAction('stash', 1)}
                  disabled={remainingEnergy <= 0}
                  className="w-8 h-8 rounded bg-[#162133] hover:bg-[#1e2d45] border border-[#283952] text-slate-200 font-mono font-bold disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action 3: Scheme (AUDIT SYSTEM ACTIVATED) */}
            <div className="p-3.5 rounded bg-[#0b121e] border border-amber-800/50 flex flex-col justify-between gap-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="font-serif font-bold text-sm text-slate-100">Scheme & Audit</span>
                    <span className="text-[9px] font-mono px-1 rounded bg-amber-950 text-amber-300 font-semibold border border-amber-800/40">
                      Audit Action
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                    Allocate ≥1 point to launch a formal Audit on a fellow castaway.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="scheme-minus-btn"
                    onClick={() => adjustAction('scheme', -1)}
                    disabled={scheme <= 0}
                    className="w-8 h-8 rounded bg-[#162133] hover:bg-[#1e2d45] border border-[#283952] text-slate-200 font-mono font-bold disabled:opacity-30"
                  >
                    -
                  </button>
                  <span className="w-7 text-center font-mono font-bold text-amber-400 text-sm">
                    {scheme}
                  </span>
                  <button
                    type="button"
                    id="scheme-plus-btn"
                    onClick={() => adjustAction('scheme', 1)}
                    disabled={remainingEnergy <= 0}
                    className="w-8 h-8 rounded bg-[#162133] hover:bg-[#1e2d45] border border-[#283952] text-slate-200 font-mono font-bold disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Target Selector if Scheme >= 1 */}
              {scheme >= 1 && (
                <div className="pt-2 border-t border-[#1e2c40] space-y-1.5">
                  <label
                    htmlFor="audit-target-select"
                    className="text-[11px] font-mono uppercase tracking-wider text-amber-300 flex items-center gap-1.5 font-bold"
                  >
                    <Search className="w-3 h-3 text-amber-400" />
                    Target Castaway for Inquest:
                  </label>
                  <select
                    id="audit-target-select"
                    value={auditTargetId}
                    onChange={(e) => setAuditTargetId(e.target.value)}
                    className="w-full p-2 rounded bg-[#060a12] border border-amber-900/80 text-xs font-mono text-amber-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- No Audit Target (Passive Scheme) --</option>
                    {otherPlayers.map((op) => (
                      <option key={op.id} value={op.id}>
                        Audit {op.displayName} (Rep: {op.reputation})
                      </option>
                    ))}
                  </select>
                  {auditTargetId && (
                    <div className="text-[10px] text-amber-400/80 font-sans leading-tight">
                      ⚔️ If {otherPlayers.find(p => p.id === auditTargetId)?.displayName || 'target'} lied:
                      Target -4 Rep, You +3 Rep (revealed publicly). If honest: You -3 Rep, Target +2 Rep.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action 4: Rest */}
            <div className="p-3.5 rounded bg-[#0b121e] border border-[#1e2c40] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-sky-400" />
                  <span className="font-serif font-bold text-sm text-slate-100">Rest</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                  Sleep in the dunes to regain +1 Energy for next round.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="rest-minus-btn"
                  onClick={() => adjustAction('rest', -1)}
                  disabled={rest <= 0}
                  className="w-8 h-8 rounded bg-[#162133] hover:bg-[#1e2d45] border border-[#283952] text-slate-200 font-mono font-bold disabled:opacity-30"
                >
                  -
                </button>
                <span className="w-7 text-center font-mono font-bold text-sky-400 text-sm">
                  {rest}
                </span>
                <button
                  type="button"
                  id="rest-plus-btn"
                  onClick={() => adjustAction('rest', 1)}
                  disabled={remainingEnergy <= 0}
                  className="w-8 h-8 rounded bg-[#162133] hover:bg-[#1e2d45] border border-[#283952] text-slate-200 font-mono font-bold disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Public Ledger Declaration */}
        <div className="p-4 rounded bg-[#0a101b] border border-[#223147]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <label
                htmlFor="claimed-labor-input"
                className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold block"
              >
                2. Declared Labor for Public Ledger
              </label>
              <p className="text-[11px] font-sans text-slate-400">
                This exact figure will be published to the entire crew. You may claim any number.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500">
                True Labor: {auditTargetId ? 0 : labor}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="claimed-labor-input"
              type="number"
              min={0}
              max={10}
              value={claimedLabor}
              onChange={(e) => setClaimedLabor(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-24 px-3 py-2 rounded bg-[#060a12] border border-amber-900/80 text-amber-300 font-mono font-bold text-lg text-center focus:outline-none focus:border-amber-500"
            />
            <div className="text-xs font-mono text-slate-400">
              {claimedLabor === (auditTargetId ? 0 : labor) ? (
                <span className="text-slate-400">Honest claim matching actual labor.</span>
              ) : claimedLabor > (auditTargetId ? 0 : labor) ? (
                <span className="text-amber-500 font-semibold">
                  Exaggerating by +{claimedLabor - (auditTargetId ? 0 : labor)} phantom labor.
                </span>
              ) : (
                <span className="text-slate-500">Understating contribution.</span>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Live Ledger Translation Breakdown */}
        <div className="p-4 rounded-lg bg-[#080e19] border border-[#1f2f45] font-mono text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1c293d]">
            <span className="text-[11px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              Live Ledger Translation Summary
            </span>
            <span className="text-[10px] text-slate-500">How your choices translate at morning tally</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Secret Reality */}
            <div className="space-y-1.5 text-[11px] p-2.5 rounded bg-[#0b121f] border border-[#1a2638]">
              <div className="text-slate-400 uppercase text-[10px] tracking-wider font-bold border-b border-[#182333] pb-1 flex items-center justify-between">
                <span>1. Secret Physical Reality</span>
                <span className="text-emerald-400 font-mono">True Output</span>
              </div>
              <div className="text-slate-300 flex justify-between">
                <span>Raft Construction (True Labor):</span>
                <span className="font-bold text-emerald-400">+{auditTargetId ? 0 : labor} timber</span>
              </div>
              <div className="text-slate-300 flex justify-between">
                <span>Secret Personal Stash:</span>
                <span className="font-bold text-amber-400">+{stash} provisions</span>
              </div>
              <div className="text-slate-300 flex justify-between">
                <span>Schemes / Inquest Focus:</span>
                <span className="font-bold text-indigo-300">
                  {auditTargetId ? '1 Inquest Audit' : scheme >= 2 ? `${Math.floor(scheme / 2)} Card Draw` : scheme === 1 ? '1 Focus (No Target)' : 'None'}
                </span>
              </div>
              <div className="text-slate-300 flex justify-between">
                <span>Next Day Energy Recovery:</span>
                <span className="font-bold text-sky-300">+{rest} Energy</span>
              </div>
            </div>

            {/* Public Ledger */}
            <div className="space-y-1.5 text-[11px] p-2.5 rounded bg-[#0b121f] border border-[#1a2638]">
              <div className="text-slate-400 uppercase text-[10px] tracking-wider font-bold border-b border-[#182333] pb-1 flex items-center justify-between">
                <span>2. Morning Public Ledger</span>
                <span className="text-amber-400 font-mono">Published Inscription</span>
              </div>
              <div className="text-slate-300 flex justify-between">
                <span>Inscribed Claim:</span>
                <span className="font-bold text-amber-300">"{claimedLabor}" Signed in Ink</span>
              </div>
              <div className="text-slate-300 flex justify-between">
                <span>Discrepancy (The Gap):</span>
                <span className={claimedLabor === (auditTargetId ? 0 : labor) ? 'font-bold text-emerald-400' : claimedLabor > (auditTargetId ? 0 : labor) ? 'font-bold text-amber-400' : 'text-slate-400'}>
                  {claimedLabor === (auditTargetId ? 0 : labor)
                    ? '0 (100% Honest)'
                    : claimedLabor > (auditTargetId ? 0 : labor)
                    ? `+${claimedLabor - (auditTargetId ? 0 : labor)} Phantom Labor`
                    : `${claimedLabor - (auditTargetId ? 0 : labor)} Understated`}
                </span>
              </div>
              <div className="text-slate-300 flex justify-between">
                <span>Audit Risk:</span>
                <span className={claimedLabor > (auditTargetId ? 0 : labor) ? 'font-bold text-red-400' : 'font-bold text-emerald-400'}>
                  {claimedLabor > (auditTargetId ? 0 : labor) ? '⚠️ High Risk (-4 Rep if caught)' : '🛡️ Safe (+2 Rep if audited)'}
                </span>
              </div>
              <div className="text-slate-400 text-[10px] pt-0.5 border-t border-[#182333]">
                {claimedLabor > (auditTargetId ? 0 : labor) ? (
                  <span className="text-amber-400/90 font-sans">
                    ⚠️ The public sees {claimedLabor} units, but the Raft ONLY receives {auditTargetId ? 0 : labor} true timber!
                  </span>
                ) : (
                  <span className="text-emerald-400/90 font-sans">
                    ✓ The Raft will advance by your full contribution of {auditTargetId ? 0 : labor} timber.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Attached Scheme Card (Optional) */}
        <div className="p-4 rounded bg-[#0a101b] border border-[#223147]">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold block">
                3. Attached Scheme Card (Optional)
              </span>
              <p className="text-[11px] font-sans text-slate-400">
                You may play 1 Scavenge scheme from your hand alongside your allocation.
              </p>
            </div>
            {selectedScavengeCard && (
              <button
                type="button"
                onClick={() => onSelectScavengeCard(null, null)}
                className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Remove Scheme
              </button>
            )}
          </div>

          {activeCardDef ? (
            <div className="p-3.5 rounded-lg bg-[#121c2d] border border-amber-600/60 mt-2 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span className="font-serif font-bold text-slate-100 text-sm">
                    {activeCardDef.name}
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  SCAVENGE SCHEME
                </span>
              </div>
              <p className="text-xs text-slate-300 font-sans">{activeCardDef.effect}</p>

              {activeCardDef.requiresTarget && (
                <div className="pt-2 border-t border-[#1e2d42] space-y-1">
                  <label className="text-[11px] text-amber-300 uppercase font-bold block">
                    Select Target for {activeCardDef.name}:
                  </label>
                  <select
                    value={cardTargetId}
                    onChange={(e) => setCardTargetId(e.target.value)}
                    className="w-full p-2 rounded bg-[#060a12] border border-[#2b3e5a] text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Choose Target Castaway --</option>
                    {otherPlayers.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.displayName} (Rep: {op.reputation})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-[#0d1422] border border-[#1d293d] text-xs text-slate-500 italic mt-1">
              No scheme attached. You can click 'Attach' on any Scavenge scheme in your bottom hand drawer.
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 rounded bg-red-950/40 border border-red-900/60 text-xs font-mono text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs font-mono text-slate-500">
            {remainingEnergy !== 0 ? (
              <span className="text-amber-500/80">
                Allocate remaining {remainingEnergy} energy to submit.
              </span>
            ) : (
              <span>Ready for inscription.</span>
            )}
          </div>

          <button
            type="submit"
            id="submit-allocation-btn"
            disabled={remainingEnergy !== 0 || isLoading}
            className="px-6 py-3 rounded font-mono font-bold text-xs uppercase tracking-wider bg-[#ea580c] hover:bg-[#c2410c] text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            Seal & Inscribe Allocation
          </button>
        </div>
      </form>
    </div>
  );
};
