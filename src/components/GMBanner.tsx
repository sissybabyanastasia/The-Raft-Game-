import React from 'react';
import { Skull, Compass } from 'lucide-react';

interface GMBannerProps {
  narration?: string;
  round?: number;
}

export const GMBanner: React.FC<GMBannerProps> = ({ narration, round }) => {
  if (!narration) return null;

  return (
    <aside
      id="gm-narration-banner"
      aria-label="Game Master Dispatch"
      className="w-full bg-[#0d131f] border-b border-[#222f44] py-3 px-4 sm:px-8 flex items-center justify-between gap-4 text-xs sm:text-sm font-mono tracking-tight text-slate-300"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-950/60 text-amber-500 font-bold border border-amber-900/50 uppercase tracking-widest text-[10px] shrink-0">
          <Compass className="w-3 h-3 text-amber-500" />
          GM Dispatch
        </span>
        <p className="truncate italic text-slate-200 font-normal">
          &ldquo;{narration}&rdquo;
        </p>
      </div>
      {round && (
        <span className="text-[11px] text-slate-500 uppercase tracking-wider shrink-0 hidden md:inline-block">
          Day {round} Log
        </span>
      )}
    </aside>
  );
};
