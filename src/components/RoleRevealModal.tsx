import React from 'react';
import { ARCHETYPES } from '../lib/archetypes.js';
import type { Archetype, PrivatePlayerProfile } from '../types.js';
import { Shield, Sparkles, Eye, Zap, AlertTriangle, ArrowRight, X } from 'lucide-react';

interface RoleRevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PrivatePlayerProfile | null;
}

export const RoleRevealModal: React.FC<RoleRevealModalProps> = ({
  isOpen,
  onClose,
  profile,
}) => {
  if (!isOpen || !profile) return null;

  const roleKey = profile.role || 'ORDINARY';
  const archetype = ARCHETYPES[roleKey] || ARCHETYPES.ORDINARY;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        id="role-reveal-modal"
        className="w-full max-w-lg bg-[#0c1322] border-2 border-amber-600/80 rounded-xl shadow-2xl p-6 sm:p-8 font-mono relative overflow-hidden"
      >
        {/* Subtle decorative stamp background */}
        <div className="absolute top-2 right-3 opacity-10 pointer-events-none text-slate-100 font-serif font-black text-6xl select-none">
          TOP SECRET
        </div>

        {/* Close button if revisiting */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-[#162033] hover:bg-[#20304a] text-slate-400 hover:text-slate-200 transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Dossier Header */}
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-amber-500 font-bold mb-1">
          <Shield className="w-4 h-4 text-amber-500" />
          <span>Confidential Island Dossier • Private Identity</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-serif font-black text-slate-100 tracking-tight">
          {archetype.name}
        </h1>
        <p className="text-xs text-amber-400/90 font-sans italic mt-0.5">
          {archetype.tagline}
        </p>

        {/* Flavor Quote */}
        <div className="my-4 p-3.5 rounded bg-[#060a12] border-l-2 border-amber-600 font-serif italic text-sm text-slate-300 leading-relaxed">
          {archetype.flavorText}
        </div>

        {/* Abilities Grid */}
        <div className="space-y-3.5 my-5">
          {/* Passive Ability */}
          <div className="p-3.5 rounded bg-[#101828] border border-[#202f47]">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
              <Eye className="w-3.5 h-3.5 text-amber-500" />
              <span>Passive: {archetype.passiveTitle}</span>
            </div>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              {archetype.passiveDesc}
            </p>
          </div>

          {/* Active Ability */}
          <div className="p-3.5 rounded bg-[#101828] border border-[#202f47]">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
              <Zap className="w-3.5 h-3.5 text-sky-400" />
              <span>Active: {archetype.activeTitle}</span>
            </div>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              {archetype.activeDesc}
            </p>
          </div>

          {/* Broker Special Secret Intelligence */}
          {profile.role === 'BROKER' && profile.brokerInfo && (
            <div className="p-3 rounded bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300">
              <span className="font-bold block uppercase tracking-wider mb-0.5">
                Market Intel (Passive):
              </span>
              <span>
                You secretly inspected <strong>{profile.brokerInfo.targetName}</strong>&apos;s pockets. They currently hold{' '}
                <strong>{profile.brokerInfo.targetStash} secret Stash</strong>.
              </span>
            </div>
          )}

          {/* Prepper starting stash note */}
          {profile.role === 'PREPPER' && (
            <div className="p-2.5 rounded bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300">
              <span>You began the expedition with <strong>4 hoarded Stash</strong> in your pack.</span>
            </div>
          )}
        </div>

        {/* Security Warning */}
        <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-slate-500" />
          <span>This assignment is private. Other castaways see you only as an ordinary survivor.</span>
        </div>

        {/* Dismiss / Begin Button */}
        <button
          id="begin-role-btn"
          onClick={onClose}
          className="w-full py-3.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-900 font-mono font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all"
        >
          <span>Acknowledge & Begin</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
