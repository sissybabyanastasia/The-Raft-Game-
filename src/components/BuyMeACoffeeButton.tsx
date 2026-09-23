import React, { useState } from 'react';
import { Coffee, ExternalLink, Settings, Check, Copy } from 'lucide-react';

interface BuyMeACoffeeButtonProps {
  className?: string;
  variant?: 'floating' | 'inline' | 'compact';
}

export const BuyMeACoffeeButton: React.FC<BuyMeACoffeeButtonProps> = ({
  className = '',
  variant = 'floating',
}) => {
  const envUsername = (import.meta as any).env?.VITE_BUYMEACOFFEE_USERNAME || '';
  const storedUsername = localStorage.getItem('raft_bmac_username') || '';
  // FIX-19: No default fallback to a nonexistent handle. If unset, render as unconfigured.
  const [username, setUsername] = useState<string>(storedUsername || envUsername || '');

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [tempUsername, setTempUsername] = useState(username);
  const [copied, setCopied] = useState(false);

  const cleanHandle = username.trim().replace(/^@/, '') || '';
  const coffeeUrl = `https://buymeacoffee.com/${cleanHandle}`;
  const isConfigured = username.trim().length > 0;

  const handleSaveUsername = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = tempUsername.trim().replace(/^@/, '');
    const finalVal = cleaned;
    setUsername(finalVal);
    localStorage.setItem('raft_bmac_username', finalVal);
    setIsPopoverOpen(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(coffeeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === 'inline') {
    return (
      <div className={`relative flex items-center gap-2 ${className}`}>
        {isConfigured ? (
          <a
            id="bmac-inline-button"
            href={coffeeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#FFDD00] hover:bg-[#FFE533] text-slate-950 font-bold text-xs shadow-md transition-transform hover:scale-105"
          >
            <img
              src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg"
              alt="Buy me a coffee"
              className="w-4 h-4"
            />
            <span>Buy me a coffee</span>
            <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
          </a>
        ) : (
          <button
            type="button"
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#FFDD00] hover:bg-[#FFE533] text-slate-950 font-bold text-xs shadow-md transition-transform hover:scale-105"
          >
            <img
              src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg"
              alt="Buy me a coffee"
              className="w-4 h-4"
            />
            <span>Set up support</span>
          </button>
        )}

        {isPopoverOpen && !isConfigured && (
          <div
            id="bmac-settings-popover-inline"
            className="absolute bottom-12 left-0 w-72 rounded-xl bg-[#0e1624] border border-amber-500/40 p-4 shadow-2xl shadow-black/80 space-y-3 text-slate-100 animate-fadeIn z-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coffee className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-serif font-bold text-slate-200">
                  Buy Me A Coffee
                </span>
              </div>
              <button
                onClick={() => setIsPopoverOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUsername} className="space-y-2">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Set Your Creator Handle:
              </label>
              <div className="flex gap-1.5">
                <input
                  id="bmac-handle-input-inline"
                  type="text"
                  value={tempUsername}
                  onChange={(e) => setTempUsername(e.target.value)}
                  placeholder="your_handle"
                  className="flex-1 bg-[#060a12] border border-[#23354d] rounded px-2.5 py-1 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 print:hidden ${className}`}>
      {/* Settings / Link popover */}
      {isPopoverOpen && (
        <div
          id="bmac-settings-popover"
          className="w-72 rounded-xl bg-[#0e1624] border border-amber-500/40 p-4 shadow-2xl shadow-black/80 space-y-3 text-slate-100 animate-fadeIn"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-serif font-bold text-slate-200">
                Buy Me A Coffee
              </span>
            </div>
            <button
              onClick={() => setIsPopoverOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          </div>

          <p className="text-[11px] text-slate-400 leading-snug">
            Current destination: <span className="font-mono text-amber-300">buymeacoffee.com/{cleanHandle}</span>
          </p>

          <form onSubmit={handleSaveUsername} className="space-y-2">
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Set Your Creator Handle:
            </label>
            <div className="flex gap-1.5">
              <input
                id="bmac-handle-input"
                type="text"
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value)}
                placeholder="your_handle"
                className="flex-1 bg-[#060a12] border border-[#23354d] rounded px-2.5 py-1 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold"
              >
                Save
              </button>
            </div>
          </form>

          <div className="flex items-center justify-between pt-2 border-t border-[#1e2d42] text-[11px]">
            <a
              href={coffeeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:underline flex items-center gap-1 font-mono"
            >
              Open Page <ExternalLink className="w-3 h-3" />
            </a>
            <button
              type="button"
              onClick={handleCopyLink}
              className="text-slate-400 hover:text-slate-200 flex items-center gap-1 font-mono"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Main Floating Button Badge (matching Aeon-Fall / Emberlight style) */}
      <div className="flex items-center gap-1.5 bg-[#FFDD00] hover:bg-[#FFE533] text-slate-950 rounded-full pl-3.5 pr-2 py-2 shadow-2xl shadow-amber-500/30 border border-amber-300/80 transition-transform active:scale-95 group">
        {isConfigured ? (
          <a
            id="floating-bmac-button"
            href={coffeeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-sans font-bold text-xs tracking-tight text-slate-950"
            title={`Support on Buy Me a Coffee (@${cleanHandle})`}
          >
            <img
              src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg"
              alt="Buy me a coffee"
              className="w-4 h-4 transition-transform group-hover:rotate-12"
            />
            <span className="font-semibold text-[13px]">Buy me a coffee</span>
          </a>
        ) : (
          <button
            type="button"
            onClick={() => setIsPopoverOpen(true)}
            className="flex items-center gap-2 font-sans font-bold text-xs tracking-tight text-slate-950"
            title="Configure your Buy Me a Coffee handle"
          >
            <img
              src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg"
              alt="Buy me a coffee"
              className="w-4 h-4"
            />
            <span className="font-semibold text-[13px]">Set up support</span>
          </button>
        )}

        {/* Small settings trigger for creator */}
        <button
          id="toggle-bmac-settings-btn"
          type="button"
          onClick={() => {
            setTempUsername(username);
            setIsPopoverOpen(!isPopoverOpen);
          }}
          className="p-1 rounded-full text-slate-800 hover:text-black hover:bg-black/10 transition-colors"
          title="Configure Coffee Handle"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
