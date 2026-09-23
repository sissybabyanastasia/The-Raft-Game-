import React from 'react';
import { ARCHETYPES } from '../lib/archetypes.js';
import type { PrivatePlayerProfile, PlayerData } from '../types.js';
import { Shield, Zap, Eye, BookOpen } from 'lucide-react';

interface RoleHUDPanelProps {
  profile: PrivatePlayerProfile | null;
  onOpenDossier: () => void;
  onTriggerActiveAbility?: (actionType: string, payload?: any) => void;
  otherPlayers: PlayerData[];
  onOpenGuide?: () => void;
}

export const RoleHUDPanel: React.FC<RoleHUDPanelProps> = ({
  profile,
  onOpenDossier,
  onTriggerActiveAbility,
  otherPlayers,
  onOpenGuide,
}) => {
  if (!profile) return null;

  const roleKey = profile.role || 'ORDINARY';
  const archetype = ARCHETYPES[roleKey] || ARCHETYPES.ORDINARY;

  return (
    <div
      id="role-hud-panel"
      className="p-3.5 rounded-lg bg-[#0e1626] border border-[#22334d] font-mono shadow-md flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber-500 font-bold">
            <Shield className="w-3.5 h-3.5" />
            <span>Private Archetype</span>
            {onOpenGuide && (
              <button
                type="button"
                onClick={onOpenGuide}
                className="w-3.5 h-3.5 rounded-full border border-purple-500/60 bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 flex items-center justify-center text-[9px] font-mono font-bold transition-colors ml-0.5"
                title="Inspect Archetypes & Roles HUD Details"
              >
                i
              </button>
            )}
          </div>

          <button
            onClick={onOpenDossier}
            className="text-[10px] text-slate-400 hover:text-amber-400 underline flex items-center gap-1"
            title="Read full role dossier"
          >
            <BookOpen className="w-3 h-3" />
            <span>Dossier</span>
          </button>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="font-serif font-bold text-slate-100 text-sm sm:text-base">
            {archetype.name}
          </span>
          <span className="text-[10px] text-slate-400 font-sans">
            {profile.stash} Stash
          </span>
        </div>

        {/* Passive description */}
        <div className="text-[11px] text-slate-400 font-sans mt-1 line-clamp-2">
          <strong className="text-slate-300 font-mono text-[10px]">Passive:</strong> {archetype.passiveDesc}
        </div>
      </div>

      {/* Broker Surveillance Note if applicable */}
      {profile.role === 'BROKER' && profile.brokerInfo && (
        <div className="mt-2 text-[10px] text-amber-400/90 bg-[#070b13] p-1.5 rounded border border-amber-900/40">
          Intel: {profile.brokerInfo.targetName} holds {profile.brokerInfo.targetStash} Stash.
        </div>
      )}
    </div>
  );
};
