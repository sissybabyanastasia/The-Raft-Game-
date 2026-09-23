import React from 'react';
import { Anchor, ShieldAlert, Hammer, Waves } from 'lucide-react';
import type { RaftStage, RaftProgress } from '../types.js';
import { STAGE_REQUIREMENTS } from '../server/gameLogic.js';

interface RaftStatusCardProps {
  currentStage: RaftStage;
  progress: RaftProgress;
  vagueStatus?: string;
  onOpenGuide?: () => void;
}

const STAGE_LABELS: Record<RaftStage, { name: string; desc: string; icon: string }> = {
  frame: {
    name: 'Timber Frame',
    desc: 'Heavy drift logs lashed with salted cord',
    icon: 'Hammer',
  },
  deck: {
    name: 'Upper Decking',
    desc: 'Hewn pine planks to keep feet out of the swell',
    icon: 'Anchor',
  },
  sail: {
    name: 'Rigging & Canvas',
    desc: 'Torn canvas sewn against the wind',
    icon: 'Waves',
  },
  provisions: {
    name: 'Cured Provisions',
    desc: 'Dried fish and sealed freshwater casks',
    icon: 'ShieldAlert',
  },
};

export const RaftStatusCard: React.FC<RaftStatusCardProps> = ({
  currentStage,
  progress,
  vagueStatus,
  onOpenGuide,
}) => {
  const stages: RaftStage[] = ['frame', 'deck', 'sail', 'provisions'];
  const currentStageIndex = stages.indexOf(currentStage);

  return (
    <div id="raft-status-card" className="wood-panel rounded-lg p-5 border border-[#23334d]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#1b263b]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-amber-500 font-mono text-xs uppercase tracking-widest font-semibold">
              Construction Status
            </span>
            <span className="text-slate-600 text-xs">/</span>
            <span className="text-slate-400 font-mono text-xs uppercase">
              Stage {currentStageIndex + 1} of 4: {STAGE_LABELS[currentStage]?.name}
            </span>
            {onOpenGuide && (
              <button
                type="button"
                onClick={onOpenGuide}
                className="w-4 h-4 rounded-full border border-blue-500/60 bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 flex items-center justify-center text-[10px] font-mono font-bold transition-colors ml-1"
                title="Inspect Raft Construction HUD Details"
              >
                i
              </button>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-100 font-serif tracking-tight mt-0.5">
            The Escape Vessel
          </h2>
        </div>
        <div className="px-3 py-1.5 rounded bg-[#131c2e] border border-[#26354d] text-left sm:text-right">
          <p className="text-[11px] font-mono uppercase text-slate-400">Current Phase</p>
          <p className="text-sm font-mono font-bold text-amber-400 uppercase tracking-wide">
            {currentStage} Construction
          </p>
        </div>
      </div>

      {/* 4-Stage Stepper Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
        {stages.map((stage, idx) => {
          const isCurrent = stage === currentStage;
          const isPassed = idx < currentStageIndex;
          const isPending = idx > currentStageIndex;
          const info = STAGE_LABELS[stage];

          let stateBadge = 'Pending';
          let borderClass = 'border-[#1b2536] bg-[#0c121e] opacity-60';
          let titleColor = 'text-slate-500';

          if (isPassed) {
            stateBadge = 'Assembled';
            borderClass = 'border-emerald-900/60 bg-[#0d1c18]';
            titleColor = 'text-emerald-400';
          } else if (isCurrent) {
            stateBadge = 'Underway';
            borderClass = 'border-amber-700/80 bg-[#171e2e] ring-1 ring-amber-600/30';
            titleColor = 'text-amber-300';
          }

          return (
            <div
              key={stage}
              id={`stage-${stage}`}
              className={`p-3 rounded border ${borderClass} flex flex-col justify-between transition-all`}
            >
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                  <span className="text-slate-500">STAGE 0{idx + 1}</span>
                  <span
                    className={`font-semibold uppercase tracking-wider ${
                      isPassed ? 'text-emerald-500' : isCurrent ? 'text-amber-400' : 'text-slate-600'
                    }`}
                  >
                    {stateBadge}
                  </span>
                </div>
                <h3 className={`font-serif text-sm font-bold leading-tight ${titleColor}`}>
                  {info.name}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-relaxed font-sans">
                {info.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Vague Physical Assessment Note */}
      <div className="bg-[#090e18] border border-[#1b2536] rounded p-3 text-xs font-mono text-slate-400 flex items-start gap-2.5">
        <span className="text-amber-600 font-bold shrink-0">[OBSERVATION]</span>
        <p className="text-slate-300 italic">
          {vagueStatus || 'The rough frame rests upon the wet shale, awaiting timber and labor.'}
        </p>
      </div>
    </div>
  );
};
