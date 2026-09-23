import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Info,
  Layout,
  BatteryCharging,
  Hammer,
  Scroll,
  User,
  FolderArchive,
  ChevronRight,
  ChevronLeft,
  Layers,
  Shield,
  BookOpen,
  FileText,
  Sparkles,
} from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBoxId?: string;
}

export type BoxId =
  | 'top-bar'
  | 'governor-banner'
  | 'stat-reputation'
  | 'stat-energy'
  | 'stat-role'
  | 'raft-card'
  | 'console-scavenge'
  | 'console-ledger'
  | 'console-launch'
  | 'bottom-hand';

interface DisplayBoxInfo {
  id: BoxId;
  orderNumber: string;
  orderLabel: string;
  title: string;
  shortSummary: string;
  whatYouSee: string;
  howItWorks: string;
  criticalRule: string;
  badge: string;
  tagColor: string;
}

const DISPLAY_BOXES: DisplayBoxInfo[] = [
  {
    id: 'top-bar',
    orderNumber: '1',
    orderLabel: 'Order 1 · Pinned Top Nav Bar',
    title: 'Top Navigation & Island Control Bar',
    shortSummary: 'Session ID, Round Counter, Phase Indicator, and quick drawer buttons.',
    whatYouSee:
      'The island session code, current round clock (e.g. Day 3 of 8), active phase pill (Night / Dawn / Ledger / Launch), and 3 drawer triggers: 📖 Survival Guide, 📜 Constitution (Satire mode), and 📁 Confidential Dossier.',
    howItWorks:
      'Always pinned at the very top. Tap 📖 to reopen this guide at any point. Tap 📁 to view your secret role backstory, logs, and past audit inquiries.',
    criticalRule:
      'Keep an eye on the Round Counter! If rounds expire before the Raft is fully built, everyone is stranded on the beach.',
    badge: 'Navigation & Clock',
    tagColor: 'border-slate-600 bg-slate-800 text-slate-200',
  },
  {
    id: 'governor-banner',
    orderNumber: '2',
    orderLabel: 'Order 2 · Upper Center (Satire Mode)',
    title: "Governor's Executive Suite",
    shortSummary: 'Shows the elected Governor, their campaign promises, and impeachment status.',
    whatYouSee:
      'In Satire Mode, displays the incumbent Governor’s portrait, their campaign pledge, and executive power buttons (issue pardons, call emergency votes, or review communal reserves).',
    howItWorks:
      'The Governor possesses unique executive privileges but also the temptation to embezzle communal stash. Any non-governor can file Articles of Impeachment with 2 Stash to spark an immediate removal vote.',
    criticalRule:
      'If an impeachment vote succeeds, the Governor is stripped of rank and their hidden embezzlement is permanently disclosed in the public record.',
    badge: 'Satire Governance',
    tagColor: 'border-amber-600 bg-amber-950/60 text-amber-300',
  },
  {
    id: 'stat-reputation',
    orderNumber: '3A',
    orderLabel: 'Order 3 · Upper Grid (Left Column)',
    title: 'Public Identity & Reputation Display',
    shortSummary: 'Your public name and Reputation score (-5 to +35 Rep).',
    whatYouSee:
      'Your display name and your public Reputation score. Numbers are colored green (positive), slate (neutral 0), or red (negative/disgraced).',
    howItWorks:
      'Reputation is public social standing. Successful honest audits increase Rep (+3), while getting caught lying decimates it (-4). In elections, players with higher Rep attract more votes.',
    criticalRule:
      'Reputation directly translates into Launch Survival! In the democratic raft vote, your reputation scales your voting weight up to 12x power, and in the final Swims, high Rep determines who claims the last berths.',
    badge: 'Social Standing',
    tagColor: 'border-emerald-600 bg-emerald-950/60 text-emerald-300',
  },
  {
    id: 'stat-energy',
    orderNumber: '3B',
    orderLabel: 'Order 3 · Upper Grid (Middle Column)',
    title: 'Survival Energy & Stash Battery',
    shortSummary: 'Available daily Energy points, hoarded secret Stash, and Hand Card count.',
    whatYouSee:
      'Your daily Energy battery (5 Base points + any rest bonus), your secret Stash tokens (hidden from others), and your hand size counter (up to 5 cards max).',
    howItWorks:
      'During Night (Scavenge phase), you spend these energy points across True Labor, Stash, Scheme card draws, and Rest. Any energy allocated to Rest returns +1 bonus energy on the following day.',
    criticalRule:
      'Stash is your private life insurance. You need Stash to buy out raft berths at launch, pay card play fees (e.g. Mutiny costs 2 Stash), and score bonus endgame survival points.',
    badge: 'Resource Battery',
    tagColor: 'border-amber-500 bg-amber-950/60 text-amber-300',
  },
  {
    id: 'stat-role',
    orderNumber: '3C',
    orderLabel: 'Order 3 · Upper Grid (Right Column)',
    title: 'Secret Archetype & Ability HUD',
    shortSummary: 'Your hidden role identity and one-tap active ability trigger.',
    whatYouSee:
      'Your secret archetype (e.g. Prepper, Idealist, Broker, Ghost, Tyrant, Mayor, Influencer, Ordinary Person), your passive trait, and your interactive "Trigger Ability" button.',
    howItWorks:
      'Click the ability button to fire your secret role power (e.g., Prepper converts 2 Stash → 1 Labor; Broker skims stash; Ghost mimics another player’s action; Idealist forces audits).',
    criticalRule:
      'Only you can see your true role card! Keep your archetype confidential so competitors do not anticipate your abilities or audit your claims.',
    badge: 'Secret Identity',
    tagColor: 'border-purple-600 bg-purple-950/60 text-purple-300',
  },
  {
    id: 'raft-card',
    orderNumber: '4',
    orderLabel: 'Order 4 · Upper Center Construction Deck',
    title: 'Raft Construction Status & Island Chronicle',
    shortSummary: 'The physical progress bar across 4 stages, plus Island GM narration.',
    whatYouSee:
      'Current stage badge (Stage 1: Timber Frame → Stage 2: Upper Decking → Stage 3: Rigging & Canvas → Stage 4: Cured Provisions), the physical progress bar, required timber target, and the deadpan Island GM dispatch.',
    howItWorks:
      'Tracks how close the colony is to completing the escape craft. When a stage reaches 100%, the raft immediately advances to the next stage.',
    criticalRule:
      'CRITICAL: The Raft advances ONLY via True Physical Labor! Public ledger claims do NOT move the raft bar. If castaways hoard stash and lie about working, the raft will fail to launch and all will drown.',
    badge: 'Vessel Blueprint',
    tagColor: 'border-blue-600 bg-blue-950/60 text-blue-300',
  },
  {
    id: 'console-scavenge',
    orderNumber: '5A',
    orderLabel: 'Order 5 · Central Desk (Night / Scavenge Phase)',
    title: 'Night Allocation Console (The Work Desk)',
    shortSummary: 'Secret energy distribution, ink declaration slider, and audit inquests.',
    whatYouSee:
      'The 4 energy allocation steppers (True Labor, Stash, Scheme Draw, Rest), the "Declared Labor" ink slider (your public lie or truth), the Scheme Card attachment slot, and the Inquest Audit target selector.',
    howItWorks:
      'Distribute your 5 energy. Next, adjust the Declared Labor slider to choose what you report to the colony. Optionally attach an Action card from your hand or launch an audit on someone you suspect of slacking.',
    criticalRule:
      'If you launch an audit on someone, your own True Labor becomes 0 for that round because your night was spent investigating! Ensure you have an alibi.',
    badge: 'Night Allocation Desk',
    tagColor: 'border-amber-600 bg-amber-950/60 text-amber-200',
  },
  {
    id: 'console-ledger',
    orderNumber: '5B',
    orderLabel: 'Order 5 · Central Desk (Dawn / Ledger Phase)',
    title: 'The Morning Ledger Archive',
    shortSummary: 'The public parchment where all castaways see each other’s claimed labor.',
    whatYouSee:
      'The communal ledger sheet listing every castaway’s Claimed Labor, the public total pledged, divine truth seals (Saint cards), and audit results exposing liars or vindicating the innocent.',
    howItWorks:
      'Compare what the group publicly declared against how much the Raft Progress Bar actually moved! The difference between public claims and physical progress is the colony’s "Phantom Gap".',
    criticalRule:
      'Lying on the ledger is completely legal, but public audits will strip 4 Reputation if exposed. Truthful players can claim moral superiority; cunning hoarders quietly slip timber into their stash.',
    badge: 'Morning Ledger Sheet',
    tagColor: 'border-slate-500 bg-slate-900 text-slate-200',
  },
  {
    id: 'console-launch',
    orderNumber: '5C',
    orderLabel: 'Order 5 · Central Desk (Endgame / Launch Phase)',
    title: 'The Launch Sequence & Berth Assignment',
    shortSummary: 'The 4-step sequence deciding who boards the raft and who is left behind.',
    whatYouSee:
      'Step A (Provisioner’s Berth) → Step B (Democratic Vote) → Step C (Stash Buyout Auction) → Step D (High-Reputation Swims). Shows raft seat capacity (3 to 5 seats depending on castaway count).',
    howItWorks:
      'In Step A, the top contributor boards first. In Step B, unseated castaways vote for who deserves the seat (you can vote for yourself, with vote weight scaled up to 12x by high Rep!). In Step C, hoarders bid Stash. In Step D, remaining unseated swim based on Reputation.',
    criticalRule:
      'Anyone who possesses a Mutiny Scheme card (costs 2 Stash) can challenge and unseat any boarded passenger before departure, resetting the contest!',
    badge: 'Escape Sequence',
    tagColor: 'border-red-600 bg-red-950/60 text-red-300',
  },
  {
    id: 'bottom-hand',
    orderNumber: '6',
    orderLabel: 'Order 6 · Docked Bottom Drawer',
    title: 'Persistent Scheme Hand Drawer',
    shortSummary: 'Docked card tray containing your confidential Scheme and Action cards.',
    whatYouSee:
      'A compact drawer docked at the foot of your screen showing your held Scheme cards (Sabotage, Mutiny, Bribe, Saint, Blackmail, Whisper Campaign, Propaganda, Black Market).',
    howItWorks:
      'Tap the drawer or card tab to expand your hand. Click any card to read its full timing, cost, and tactical effect. Cards can be attached during Scavenge, triggered during Resolution dawn, or spent during Launch.',
    criticalRule:
      'You can hold a maximum of 5 cards. Each card is completely independent; playing one will only expend that single card. Discard unwanted cards to make room for fresh draws.',
    badge: 'Card Tray Drawer',
    tagColor: 'border-indigo-600 bg-indigo-950/60 text-indigo-300',
  },
];

export const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
  initialBoxId = 'top-bar',
}) => {
  const [activeTab, setActiveTab] = useState<'diagram' | 'energy' | 'rules'>('diagram');
  const [selectedBoxId, setSelectedBoxId] = useState<BoxId>((initialBoxId as BoxId) || 'top-bar');

  useEffect(() => {
    if (initialBoxId) {
      setSelectedBoxId(initialBoxId as BoxId);
      setActiveTab('diagram');
    }
  }, [initialBoxId, isOpen]);

  if (!isOpen) return null;

  const selectedBox = DISPLAY_BOXES.find(b => b.id === selectedBoxId) || DISPLAY_BOXES[0];
  const selectedIdx = DISPLAY_BOXES.findIndex(b => b.id === selectedBoxId);

  const handleNextBox = () => {
    const nextIdx = (selectedIdx + 1) % DISPLAY_BOXES.length;
    setSelectedBoxId(DISPLAY_BOXES[nextIdx].id);
  };

  const handlePrevBox = () => {
    const prevIdx = (selectedIdx - 1 + DISPLAY_BOXES.length) % DISPLAY_BOXES.length;
    setSelectedBoxId(DISPLAY_BOXES[prevIdx].id);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#0a0f1d] border border-[#23354d] rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-200 font-sans">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-[#1c2a3e] bg-[#0c1424]">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🪵</span>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-slate-100 flex items-center gap-2">
                Survival Guide & Field Manual
              </h2>
              <p className="text-[11px] font-mono text-slate-400">
                The Raft: Complete HUD Schematic & Colony Protocols
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors font-mono text-xs uppercase px-2 py-1 rounded bg-[#131d2e] border border-[#22354c]"
          >
            ✕ Close
          </button>
        </div>

        {/* Prominent Required Reading Disclaimer */}
        <div className="px-5 sm:px-6 pt-4 pb-2 bg-[#090e1b]">
          <div className="bg-gradient-to-r from-amber-950/60 via-amber-950/40 to-slate-900 border border-amber-500/50 rounded-lg p-3 sm:p-3.5 flex items-start gap-3 shadow-md">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-amber-400">
                  Castaway Notice
                </span>
                <span className="text-[10px] text-amber-500/80 font-mono">• Required Advisory</span>
              </div>
              <p className="text-sm font-serif font-bold text-amber-100 mt-0.5 tracking-wide">
                “This game requires reading to play. Please be advised.”
              </p>
              <p className="text-xs text-amber-200/80 mt-0.5 leading-relaxed">
                Survival in <em>The Raft</em> is driven by ink, declarations, audit evidence, and social deduction. Use the breakdown diagram below to understand the layout and order of every box on your screen.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 sm:px-6 pt-2 border-b border-[#1b283d] bg-[#090e1b]">
          <button
            onClick={() => setActiveTab('diagram')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'diagram'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            HUD & Displays Breakdown
          </button>
          <button
            onClick={() => setActiveTab('energy')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'energy'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BatteryCharging className="w-3.5 h-3.5" />
            Energy Allocation & Ledger
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'rules'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scroll className="w-3.5 h-3.5" />
            Roles & Survival Rules
          </button>
        </div>

        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-sm leading-relaxed">
          {/* TAB 1: HUD & SCREEN BREAKDOWN DIAGRAM */}
          {activeTab === 'diagram' && (
            <div className="space-y-6">
              {/* Orientation instructions */}
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  <span>Click any box or circular <strong>(i)</strong> in the schematic to inspect its purpose:</span>
                </div>
                <span className="hidden sm:inline text-slate-500">Boxes ordered from top-of-screen down</span>
              </div>

              {/* VISUAL SCHEMATIC WIREFRAME OF THE GAME SCREEN */}
              <div className="bg-[#080c17] border-2 border-[#1c2a3f] rounded-xl p-3 sm:p-4 shadow-inner space-y-3 font-mono">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest text-center pb-1 border-b border-[#141e2e]">
                  Screen Wireframe Schematic (Vertical Order of Appearance)
                </div>

                {/* WIREFRAME BOX 1: Top Navigation Bar */}
                <button
                  onClick={() => setSelectedBoxId('top-bar')}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                    selectedBoxId === 'top-bar'
                      ? 'bg-amber-950/40 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                      : 'bg-[#0f1726] border-[#22334a] hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold flex items-center justify-center border border-amber-500/40">
                      1
                    </span>
                    <span className="text-xs font-bold text-slate-200">
                      Top Navigation Bar
                    </span>
                    <span className="text-[10px] text-slate-400 hidden sm:inline">
                      (Room ID • Round Clock • Phase Pill • Survival Guide • Dossier)
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-amber-400">
                    <span className="w-5 h-5 rounded-full border border-amber-500/60 bg-amber-900/30 flex items-center justify-center font-bold">
                      i
                    </span>
                  </div>
                </button>

                {/* WIREFRAME BOX 2: Governor's Office (Satire Mode) */}
                <button
                  onClick={() => setSelectedBoxId('governor-banner')}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                    selectedBoxId === 'governor-banner'
                      ? 'bg-amber-950/40 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                      : 'bg-[#0f1726] border-[#22334a] hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold flex items-center justify-center border border-amber-500/40">
                      2
                    </span>
                    <span className="text-xs font-bold text-slate-200">
                      Governor's Executive Suite
                    </span>
                    <span className="text-[10px] text-amber-400/80">
                      [Satire Mode Only]
                    </span>
                    <span className="text-[10px] text-slate-400 hidden md:inline">
                      (Incumbent Governor • Campaign Pledge • Impeachment)
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-amber-400">
                    <span className="w-5 h-5 rounded-full border border-amber-500/60 bg-amber-900/30 flex items-center justify-center font-bold">
                      i
                    </span>
                  </div>
                </button>

                {/* WIREFRAME BOX 3: Upper 3-Column Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* 3A: Reputation */}
                  <button
                    onClick={() => setSelectedBoxId('stat-reputation')}
                    className={`text-left p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                      selectedBoxId === 'stat-reputation'
                        ? 'bg-emerald-950/40 border-emerald-400 shadow-md ring-1 ring-emerald-400/50'
                        : 'bg-[#0f1726] border-[#22334a] hover:border-slate-500'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center justify-center border border-emerald-500/40">
                          3A
                        </span>
                        <span className="text-[11px] font-bold text-slate-200 truncate">
                          Identity & Rep
                        </span>
                      </div>
                      <div className="text-[10px] text-emerald-400 mt-1">
                        Public Record (+/- Rep)
                      </div>
                    </div>
                    <span className="w-5 h-5 rounded-full border border-emerald-500/60 bg-emerald-900/30 flex items-center justify-center text-[11px] text-emerald-300 font-bold shrink-0">
                      i
                    </span>
                  </button>

                  {/* 3B: Energy & Stash Battery */}
                  <button
                    onClick={() => setSelectedBoxId('stat-energy')}
                    className={`text-left p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                      selectedBoxId === 'stat-energy'
                        ? 'bg-amber-950/40 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                        : 'bg-[#0f1726] border-[#22334a] hover:border-slate-500'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center justify-center border border-amber-500/40">
                          3B
                        </span>
                        <span className="text-[11px] font-bold text-slate-200 truncate">
                          Energy & Stash
                        </span>
                      </div>
                      <div className="text-[10px] text-amber-400 mt-1">
                        5 Pts Battery • Stash Hoard
                      </div>
                    </div>
                    <span className="w-5 h-5 rounded-full border border-amber-500/60 bg-amber-900/30 flex items-center justify-center text-[11px] text-amber-300 font-bold shrink-0">
                      i
                    </span>
                  </button>

                  {/* 3C: Role HUD */}
                  <button
                    onClick={() => setSelectedBoxId('stat-role')}
                    className={`text-left p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                      selectedBoxId === 'stat-role'
                        ? 'bg-purple-950/40 border-purple-400 shadow-md ring-1 ring-purple-400/50'
                        : 'bg-[#0f1726] border-[#22334a] hover:border-slate-500'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold flex items-center justify-center border border-purple-500/40">
                          3C
                        </span>
                        <span className="text-[11px] font-bold text-slate-200 truncate">
                          Role & Ability
                        </span>
                      </div>
                      <div className="text-[10px] text-purple-400 mt-1">
                        Secret Power Trigger
                      </div>
                    </div>
                    <span className="w-5 h-5 rounded-full border border-purple-500/60 bg-purple-900/30 flex items-center justify-center text-[11px] text-purple-300 font-bold shrink-0">
                      i
                    </span>
                  </button>
                </div>

                {/* WIREFRAME BOX 4: Raft Construction Status Card */}
                <button
                  onClick={() => setSelectedBoxId('raft-card')}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                    selectedBoxId === 'raft-card'
                      ? 'bg-blue-950/40 border-blue-400 shadow-md ring-1 ring-blue-400/50'
                      : 'bg-[#0f1726] border-[#22334a] hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-bold flex items-center justify-center border border-blue-500/40">
                      4
                    </span>
                    <span className="text-xs font-bold text-slate-200">
                      Raft Construction Yard & Island Chronicle
                    </span>
                    <span className="text-[10px] text-slate-400 hidden sm:inline">
                      (Frame → Deck → Sail → Provisions • GM Island Chronicle)
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-blue-400">
                    <span className="w-5 h-5 rounded-full border border-blue-500/60 bg-blue-900/30 flex items-center justify-center font-bold">
                      i
                    </span>
                  </div>
                </button>

                {/* WIREFRAME BOX 5: Central Phase Console */}
                <div className="space-y-1.5 p-2 rounded-lg bg-[#0a101d] border border-[#1d2a3f]">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center justify-center border border-amber-500/40">
                        5
                      </span>
                      <span className="font-bold text-slate-200 uppercase">
                        Central Phase Workspace (Changes by Round Phase)
                      </span>
                    </div>
                    <span className="text-slate-500">Pick Phase Sub-Display:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <button
                      onClick={() => setSelectedBoxId('console-scavenge')}
                      className={`text-left p-2 rounded border text-xs transition-all flex items-center justify-between ${
                        selectedBoxId === 'console-scavenge'
                          ? 'bg-amber-950/50 border-amber-400 text-amber-200 ring-1 ring-amber-400/50'
                          : 'bg-[#101726] border-[#22334a] text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div>
                        <div className="font-bold">5A. Night Allocation Desk</div>
                        <div className="text-[10px] text-slate-400">Sliders • Lies • Audits</div>
                      </div>
                      <span className="w-4 h-4 rounded-full border border-amber-500/60 text-amber-300 text-[10px] font-bold flex items-center justify-center">
                        i
                      </span>
                    </button>

                    <button
                      onClick={() => setSelectedBoxId('console-ledger')}
                      className={`text-left p-2 rounded border text-xs transition-all flex items-center justify-between ${
                        selectedBoxId === 'console-ledger'
                          ? 'bg-amber-950/50 border-amber-400 text-amber-200 ring-1 ring-amber-400/50'
                          : 'bg-[#101726] border-[#22334a] text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div>
                        <div className="font-bold">5B. Morning Ledger</div>
                        <div className="text-[10px] text-slate-400">Claims • Audit Results</div>
                      </div>
                      <span className="w-4 h-4 rounded-full border border-amber-500/60 text-amber-300 text-[10px] font-bold flex items-center justify-center">
                        i
                      </span>
                    </button>

                    <button
                      onClick={() => setSelectedBoxId('console-launch')}
                      className={`text-left p-2 rounded border text-xs transition-all flex items-center justify-between ${
                        selectedBoxId === 'console-launch'
                          ? 'bg-red-950/50 border-red-400 text-red-200 ring-1 ring-red-400/50'
                          : 'bg-[#101726] border-[#22334a] text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div>
                        <div className="font-bold">5C. Launch Sequence</div>
                        <div className="text-[10px] text-slate-400">Berths • Votes • Swims</div>
                      </div>
                      <span className="w-4 h-4 rounded-full border border-red-500/60 text-red-300 text-[10px] font-bold flex items-center justify-center">
                        i
                      </span>
                    </button>
                  </div>
                </div>

                {/* WIREFRAME BOX 6: Bottom Scheme Hand Drawer */}
                <button
                  onClick={() => setSelectedBoxId('bottom-hand')}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                    selectedBoxId === 'bottom-hand'
                      ? 'bg-indigo-950/40 border-indigo-400 shadow-md ring-1 ring-indigo-400/50'
                      : 'bg-[#0f1726] border-[#22334a] hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold flex items-center justify-center border border-indigo-500/40">
                      6
                    </span>
                    <span className="text-xs font-bold text-slate-200">
                      Bottom Scheme Hand Drawer
                    </span>
                    <span className="text-[10px] text-slate-400 hidden sm:inline">
                      (Docked Tray • Hand Cards • Timing & Stash Cost • Discards)
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-indigo-400">
                    <span className="w-5 h-5 rounded-full border border-indigo-500/60 bg-indigo-900/30 flex items-center justify-center font-bold">
                      i
                    </span>
                  </div>
                </button>
              </div>

              {/* DETAILED ACTIVE BOX INSPECTOR PANEL */}
              <div className="bg-[#0e1628] border-2 border-amber-500/40 rounded-xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#21324d] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${selectedBox.tagColor}`}>
                        {selectedBox.orderLabel}
                      </span>
                      <span className="text-xs font-mono text-amber-400 font-bold">
                        Box #{selectedBox.orderNumber}
                      </span>
                    </div>
                    <h3 className="text-lg font-serif font-bold text-slate-100 mt-1 flex items-center gap-2">
                      {selectedBox.title}
                    </h3>
                  </div>

                  {/* Previous / Next Navigation */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handlePrevBox}
                      className="px-2.5 py-1 text-xs font-mono rounded bg-[#16233a] hover:bg-[#203252] border border-[#2b3f5e] text-slate-300 flex items-center gap-1"
                      title="Previous Display"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>
                    <span className="text-xs font-mono text-slate-500">
                      {selectedIdx + 1} / {DISPLAY_BOXES.length}
                    </span>
                    <button
                      onClick={handleNextBox}
                      className="px-2.5 py-1 text-xs font-mono rounded bg-[#16233a] hover:bg-[#203252] border border-[#2b3f5e] text-slate-300 flex items-center gap-1"
                      title="Next Display"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 3 Detail Blocks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-lg bg-[#090f1d] border border-[#1b2b42] space-y-1.5">
                    <strong className="text-amber-300 font-mono uppercase tracking-wider block text-[11px] flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded-full border border-amber-400 text-amber-300 flex items-center justify-center text-[9px] font-bold">i</span>
                      What You See In This Box
                    </strong>
                    <p className="text-slate-300 leading-relaxed">
                      {selectedBox.whatYouSee}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#090f1d] border border-[#1b2b42] space-y-1.5">
                    <strong className="text-emerald-300 font-mono uppercase tracking-wider block text-[11px] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      How It Works & How To Use It
                    </strong>
                    <p className="text-slate-300 leading-relaxed">
                      {selectedBox.howItWorks}
                    </p>
                  </div>
                </div>

                {/* Critical Rule Highlight */}
                <div className="p-3.5 rounded-lg bg-red-950/30 border border-red-800/60 text-xs flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-red-400 block">
                      Critical Survival Law
                    </span>
                    <p className="text-red-200/90 leading-relaxed mt-0.5">
                      {selectedBox.criticalRule}
                    </p>
                  </div>
                </div>
              </div>

              {/* QUICK SCAN TABLE OF ALL BOXES IN ORDER */}
              <div className="space-y-3 pt-2">
                <h4 className="font-serif font-bold text-amber-400 text-sm uppercase tracking-wide border-b border-amber-900/30 pb-1 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Quick Scan: All HUD Displays In Order of Appearance
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
                  {DISPLAY_BOXES.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBoxId(b.id)}
                      className={`text-left p-3 rounded-lg border transition-all flex items-start justify-between gap-2 ${
                        selectedBoxId === b.id
                          ? 'bg-amber-950/40 border-amber-400 text-amber-200 ring-1 ring-amber-400/40'
                          : 'bg-[#0d1424] border-[#1d2d44] text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-slate-800 text-amber-300 text-[10px] font-bold flex items-center justify-center border border-slate-600">
                            {b.orderNumber}
                          </span>
                          <span className="font-bold text-slate-100">{b.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {b.shortSummary}
                        </p>
                      </div>
                      <span className="w-4 h-4 rounded-full border border-amber-500/60 text-amber-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        i
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ENERGY ALLOCATION & LEDGER TRANSLATION */}
          {activeTab === 'energy' && (
            <div className="space-y-6">
              <section className="space-y-3">
                <div className="flex items-center gap-2 border-b border-amber-900/30 pb-2">
                  <BatteryCharging className="w-5 h-5 text-amber-400" />
                  <h3 className="font-serif font-bold text-amber-400 text-base uppercase tracking-wide">
                    How Energy Allocation Translates to the Public Ledger
                  </h3>
                </div>

                <p className="text-slate-300 leading-relaxed">
                  Every round begins with the <strong>Scavenge Phase (Night)</strong>. You are granted <strong className="text-amber-300">5 Base Energy</strong> (plus 1 bonus point for every point you rested on the previous day). You privately distribute this energy across 4 distinct actions:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-lg bg-[#0e1726] border border-[#23354c] space-y-1">
                    <strong className="text-amber-300 font-mono text-xs block">
                      🔨 1. True Physical Labor
                    </strong>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Genuine timber chopping and lashing. <em>This is the ONLY energy that physically advances the Raft Progress Bar.</em> If everyone hoards energy in stash, progress stalls and everyone drowns.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#0e1726] border border-[#23354c] space-y-1">
                    <strong className="text-amber-300 font-mono text-xs block">
                      🔒 2. Secret Stash Hoarding
                    </strong>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Personal provisions and salvaged timber tucked away in secret (+1 Stash per point). Completely invisible to opponents on the morning ledger. Essential for launch seat buyouts!
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#0e1726] border border-[#23354c] space-y-1">
                    <strong className="text-amber-300 font-mono text-xs block">
                      ✨ 3. Scheme Card Draws & Audits
                    </strong>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Spend 2 Energy to draw a Scheme card from the deck, or focus energy to order an Inquest Audit on a competitor. (Note: launching an audit sets your True Labor to 0 for that round).
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#0e1726] border border-[#23354c] space-y-1">
                    <strong className="text-amber-300 font-mono text-xs block">
                      🌙 4. Rest & Recovery
                    </strong>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Sleeping through the night. Each point allocated to Rest yields +1 bonus Energy for the following day (e.g. 2 Rest points = 7 Energy tomorrow).
                    </p>
                  </div>
                </div>
              </section>

              {/* The Declaration & The Phantom Gap */}
              <section className="p-4 rounded-xl bg-[#0e182b] border border-[#253a57] space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <h4 className="font-serif font-bold text-amber-200 text-sm uppercase tracking-wide">
                    The Ink Declaration & The "Phantom Gap"
                  </h4>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Below your energy sliders sits the <strong className="text-amber-300 font-mono">Declared Labor Signature Slider</strong>. This is where you decide what the colony will read in the morning ledger:
                </p>

                <ul className="list-disc pl-5 space-y-2 text-xs text-slate-300">
                  <li>
                    <strong className="text-slate-100 font-mono">The Morning Ledger (Public):</strong> The ledger shows the <em>Claimed Labor</em> of each castaway. If you secretly spent 1 on Labor and 4 on Stash, you can slide your declaration to "4 Labor". The colony sees a grand public total of work promised.
                  </li>
                  <li>
                    <strong className="text-slate-100 font-mono">The Physical Discrepancy:</strong> The table sees a grand public total, but the Raft Progress Bar advances <em>ONLY by True Labor</em>. The difference between what the ledger claimed and what the raft gained is the <strong>Colony Gap</strong>.
                  </li>
                  <li>
                    <strong className="text-slate-100 font-mono">Inquest Audits:</strong> If a suspicious castaway audits you and your Claimed Labor &gt; True Labor, you are exposed as an embezzler (-4 Rep to you, +3 Rep to the auditor). If you were truthful, the paranoid auditor is disgraced (-3 Rep to auditor, +2 Rep to you).
                  </li>
                  <li>
                    <strong className="text-slate-100 font-mono">The Saint Card:</strong> Attaching the Saint card verifies your entry with an infallible "Divine Truth" stamp if True Labor &ge; Claimed Labor.
                  </li>
                </ul>
              </section>
            </div>
          )}

          {/* TAB 3: ROLES & SURVIVAL RULES */}
          {activeTab === 'rules' && (
            <div className="space-y-6">
              <section className="space-y-2">
                <h3 className="font-serif font-bold text-amber-400 text-base uppercase tracking-wide border-b border-amber-900/30 pb-1">
                  1. Core Survival Objective
                </h3>
                <p>
                  You are castaways stranded on an island, cooperating to build an escape raft before your rations run out or rounds expire.
                  However, survival is selective: <strong className="text-amber-200">only those who secure a seat on the raft can escape.</strong>
                </p>
                <p>
                  To win, you must cooperate to finish construction, while simultaneously accumulating private <strong className="text-amber-200">Stash</strong> (for buyout and score)
                  and <strong className="text-amber-200">Reputation</strong> (needed for swims and elections) to ensure your seat. Lies on the public Ledger are expected—and legal!
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif font-bold text-amber-400 text-base uppercase tracking-wide border-b border-amber-900/30 pb-1">
                  2. Secret Roles & Archetypes
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Roles are assigned secretly. You can pick your <strong className="text-amber-200">Preferred Role</strong> in the lobby (the server satisfies preferences randomly upon startup).
                </p>
                <div className="space-y-3 pt-1 text-xs">
                  <div>
                    <strong className="text-amber-200 font-serif">👦 The Ordinary Person:</strong> No active or passive abilities. The only genuinely honest castaway on the beach.
                  </div>
                  <div>
                    <strong className="text-amber-200 font-serif">🎒 The Prepper:</strong> Starts with +4 secret Stash. Active: Convert 2 Stash → 1 Labor without spending energy.
                  </div>
                  <div>
                    <strong className="text-amber-200 font-serif">💼 The Broker:</strong> Sees one random opponent's stash at game start. Active: Broker a deal to skim 1 Stash from two players.
                  </div>
                  <div>
                    <strong className="text-amber-200 font-serif">⚖️ The Idealist:</strong> Gains +2 Reputation when a construction stage advances. Active: Force an audit. (If target is honest, you lose 3 extra Rep).
                  </div>
                  <div>
                    <strong className="text-amber-200 font-serif">📣 The Influencer:</strong> Contributions grant +1 Reputation each round even if false. Active: Endorse a player, transferring 2 Reputation to them.
                  </div>
                  <div>
                    <strong className="text-amber-200 font-serif">👻 The Ghost:</strong> Ledger claims appear as blank ("—") and audits return no data. Active: Mimic another player's Scavenge action.
                  </div>
                  <div>
                    <strong className="text-amber-200 font-serif">👑 The Tyrant:</strong> Gains +2 Stash whenever a construction stage fails. Active: Veto a player's vote resolution.
                  </div>
                  <div>
                    <strong className="text-amber-200 font-serif">🗳️ The Mayor:</strong> Controls Ledger display (can nudge entries ±1 secretly). Active: Call an emergency vote skipping Scavenge.
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif font-bold text-amber-400 text-base uppercase tracking-wide border-b border-amber-900/30 pb-1">
                  3. The Satire Governance Ruleset
                </h3>
                <div className="space-y-2 text-xs">
                  <p>
                    In Satire Mode, players draft a constitutional charter during the <strong>Founding Phase</strong> choosing from 6 Clauses.
                  </p>
                  <p>
                    A <strong>Governor</strong> is elected through regular elections, making Campaign Promises. The Governor possesses the power to embezzle communal stash or issue pardons, but can be <strong>Impeached</strong> if non-Governor players file articles of impeachment with 2 Stash.
                  </p>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif font-bold text-amber-400 text-base uppercase tracking-wide border-b border-amber-900/30 pb-1">
                  4. The Endgame: Launch Phase
                </h3>
                <p className="text-xs">
                  Once construction is complete, the launch sequence determines who gets a seat:
                </p>
                <ul className="list-disc pl-5 mt-1 space-y-1 text-xs font-mono text-slate-400">
                  <li><strong>Step A (Provisioner):</strong> Top overall timber contributor secures Berth 1.</li>
                  <li><strong>Step B (Democratic Vote):</strong> Castaways vote for who takes Berth 2. You can vote for yourself, and high Reputation scales your vote weight up to 12x!</li>
                  <li><strong>Step C (Stash Buyout):</strong> Castaways bid accumulated secret Stash in an open auction for Berth 3.</li>
                  <li><strong>Step D (Swims):</strong> Castaways swim through the breakers; highest Reputation claims remaining berths.</li>
                  <li><strong>Mutiny Cards:</strong> Playing a Mutiny Scheme card (costs 2 Stash) can unseat any boarded passenger and reopen the contest!</li>
                </ul>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-[#1c2a3e] bg-[#0c1424] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
            <span className="w-3.5 h-3.5 rounded-full border border-amber-500/60 text-amber-300 flex items-center justify-center text-[9px] font-bold">i</span>
            <span>Tap circular (i) icons across the screen at any time for quick intel</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs uppercase shadow transition-colors"
          >
            Acknowledge Protocol
          </button>
        </div>
      </div>
    </div>
  );
};
