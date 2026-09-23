import React from 'react';

interface ConfirmSkipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  awaitingCount: number;
  awaitingLabel?: string;
}

export const ConfirmSkipModal: React.FC<ConfirmSkipModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Skip Timer & Advance?",
  description = "Are you sure you want to advance? Rushing ahead might cut off players still making decisions.",
  awaitingCount,
  awaitingLabel = "players still completing actions",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0b121f] border border-amber-900/40 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-amber-950/20 px-6 py-4 border-b border-amber-900/30 flex items-center gap-2">
          <span className="text-amber-500 text-lg">⚠️</span>
          <h3 className="font-serif font-bold text-amber-400 text-sm uppercase tracking-wider">
            {title}
          </h3>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-slate-300 text-xs leading-relaxed">
            {description}
          </p>

          <div className="bg-[#0f192b] border border-[#1b2f4a] rounded-lg p-4 flex items-start gap-3">
            <span className="text-lg">⏳</span>
            <div>
              <div className="font-mono text-xs font-bold text-slate-200">
                Awaiting Decisions:
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {awaitingCount > 0 ? (
                  <>
                    <strong className="text-amber-400">{awaitingCount}</strong> {awaitingLabel}.
                  </>
                ) : (
                  <span className="text-emerald-400 font-bold">✓ All players have submitted!</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#070b13] px-6 py-4 border-t border-[#162235] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded font-mono text-[11px] uppercase tracking-wide bg-slate-900 hover:bg-slate-800 text-slate-400 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 rounded font-mono text-[11px] font-bold uppercase tracking-wide bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
          >
            Yes, Rush Ahead
          </button>
        </div>
      </div>
    </div>
  );
};
