import React, { useEffect, useState } from 'react';
import {
  Shield,
  FileText,
  X,
  Coins,
  Sparkles,
  EyeOff,
  Bell,
  Radio,
  Wind,
  Lock,
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import type { PrivatePlayerProfile, Archetype } from '../types.js';
import { ARCHETYPES } from '../lib/archetypes.js';

interface PrivateDossierDrawerProps {
  gameId: string;
  playerId: string;
  profile: PrivatePlayerProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

interface PrivateLogEntry {
  id: string;
  text: string;
  round: number;
  timestamp: number;
}

export const PrivateDossierDrawer: React.FC<PrivateDossierDrawerProps> = ({
  gameId,
  playerId,
  profile,
  isOpen,
  onClose,
}) => {
  const [logs, setLogs] = useState<PrivateLogEntry[]>([]);

  useEffect(() => {
    if (!gameId || !playerId || !isOpen) return;

    const logRef = collection(db, `games/${gameId}/privateLog/${playerId}/entries`);
    const q = query(logRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(logRef, (snap) => {
      const entries: PrivateLogEntry[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      entries.sort((a, b) => b.timestamp - a.timestamp);
      setLogs(entries);
    });

    return () => unsubscribe();
  }, [gameId, playerId, isOpen]);

  if (!isOpen) return null;

  const roleDef = profile ? ARCHETYPES[profile.role] : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 font-mono">
      <div
        id="private-dossier-drawer"
        className="w-full max-w-md bg-[#090e1a] border-l border-[#1f2d42] h-full overflow-y-auto p-6 flex flex-col justify-between shadow-2xl text-slate-200"
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#1b273b]">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-widest">
              <Lock className="w-4 h-4 text-amber-500" />
              <span>CONFIDENTIAL DOSSIER</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#152132] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Player Role Card */}
          {roleDef && profile && (
            <div className="my-5 p-4 rounded-xl bg-[#101726] border border-[#23334d]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Assigned Identity
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
                  TOP SECRET
                </span>
              </div>
              <h3 className="text-xl font-bold font-serif text-slate-100">{roleDef.name}</h3>
              <p className="text-xs italic text-amber-400/80 font-serif my-1">{roleDef.flavorText}</p>
              <div className="my-2 pt-2 border-t border-[#1a273b] text-xs text-slate-300">
                <strong className="text-amber-400">Passive:</strong> {roleDef.passiveDesc}
              </div>

              {profile.brokerInfo && (
                <div className="mt-2 p-2.5 rounded bg-[#162236] border border-[#2b3d5b] text-xs text-slate-200">
                  <strong className="text-amber-400 block mb-0.5">BROKER SURVEILLANCE:</strong>
                  Target <span className="font-bold text-slate-100">{profile.brokerInfo.targetName}</span> started with{' '}
                  <span className="font-bold text-amber-400">{profile.brokerInfo.targetStash} Stash</span>.
                </div>
              )}
            </div>
          )}

          {/* Stash & Stats */}
          <div className="grid grid-cols-2 gap-3 my-4">
            <div className="p-3 rounded-lg bg-[#111928] border border-[#1e2a3c]">
              <span className="text-[10px] text-slate-400 uppercase block">Hoarded Stash</span>
              <div className="text-xl font-black text-amber-400 mt-0.5 flex items-center gap-1.5">
                <Coins className="w-4 h-4" />
                {profile?.stash || 0}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#111928] border border-[#1e2a3c]">
              <span className="text-[10px] text-slate-400 uppercase block">Schemes In Hand</span>
              <div className="text-xl font-black text-slate-200 mt-0.5">
                {profile?.hand?.length || 0} / 5
              </div>
            </div>
          </div>

          {/* Confidential Log / Dispatches */}
          <div className="my-5">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Private Intelligence Dispatches
              </h4>
            </div>

            {logs.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#0d1424] border border-[#192436] text-center text-xs text-slate-500 italic">
                No secret intelligence or whisper campaigns recorded yet.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg bg-[#101827] border border-[#202f45] text-xs leading-relaxed"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span>{log.round ? `Round ${log.round}` : 'System'}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-slate-200 font-sans">{log.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="pt-4 border-t border-[#182335] text-[11px] text-slate-500 text-center">
          Information in this dossier is strictly confidential to your player session.
        </div>
      </div>
    </div>
  );
};
