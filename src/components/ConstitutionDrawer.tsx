import React from 'react';
import { X, Scroll, Scale, Shield, Landmark, BookOpen, CheckCircle2 } from 'lucide-react';
import type { Constitution, ConstitutionClauseId } from '../types.js';
import { CONSTITUTION_CLAUSES } from '../lib/constitution.js';

interface ConstitutionDrawerProps {
  constitution?: Constitution;
  isOpen: boolean;
  onClose: () => void;
}

export const ConstitutionDrawer: React.FC<ConstitutionDrawerProps> = ({
  constitution,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const clausesList = Object.keys(CONSTITUTION_CLAUSES) as ConstitutionClauseId[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#0c121e] border border-[#263750] rounded-lg shadow-2xl p-6 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1c293d]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-amber-950/40 border border-amber-800/40 text-amber-400">
              <Scroll className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-xl text-slate-100 flex items-center gap-2">
                The Constitution of the Isle
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Ratified covenants establishing the political order of the castaways.
              </p>
            </div>
          </div>
          <button
            id="close-constitution-btn"
            onClick={onClose}
            className="p-1.5 rounded bg-[#131d2c] hover:bg-[#1d2a3f] border border-[#223146] text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {!constitution ? (
            <div className="p-6 text-center text-xs font-mono text-slate-500 border border-dashed border-[#1e2a3c] rounded">
              The Constitution has not yet been ratified by the Founding Convention.
            </div>
          ) : (
            clausesList.map((clauseId) => {
              const def = CONSTITUTION_CLAUSES[clauseId];
              const activeVal = constitution[clauseId];
              const isOptionA = activeVal === def.optionA.value;
              const activeOption = isOptionA ? def.optionA : def.optionB;

              return (
                <div
                  key={clauseId}
                  id={`constitution-clause-${clauseId}`}
                  className="p-4 rounded-lg bg-[#0e1726] border border-[#213149] flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-amber-400" />
                      <span className="font-serif font-bold text-slate-200 text-sm">
                        {def.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 uppercase font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-amber-400" />
                      {activeOption.label}
                    </span>
                  </div>

                  <p className="text-xs font-mono text-slate-300 bg-[#070b13] p-2.5 rounded border border-[#172233]">
                    {activeOption.desc}
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-1 text-[11px] font-mono text-slate-500">
                    <div className={`p-1.5 rounded border ${isOptionA ? 'border-amber-700/40 bg-amber-950/10 text-slate-300' : 'border-transparent text-slate-600 line-through'}`}>
                      A: {def.optionA.label}
                    </div>
                    <div className={`p-1.5 rounded border ${!isOptionA ? 'border-amber-700/40 bg-amber-950/10 text-slate-300' : 'border-transparent text-slate-600 line-through'}`}>
                      B: {def.optionB.label}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#1c293d] flex justify-end">
          <button
            id="dismiss-constitution-btn"
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-mono bg-[#162235] hover:bg-[#20304a] border border-[#293c58] text-slate-300 transition-colors"
          >
            Close Constitution
          </button>
        </div>
      </div>
    </div>
  );
};
