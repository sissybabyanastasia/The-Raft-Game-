import React from 'react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0b111e] border border-[#23354d] rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1c2a3e] bg-[#0d1726]">
          <div className="flex items-center gap-2">
            <span className="text-lg">🪵</span>
            <h2 className="text-lg font-serif font-bold text-slate-100">
              The Raft: Survival Walkthrough Guide
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors font-mono text-xs uppercase"
          >
            ✕ Close
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm leading-relaxed text-slate-300 font-sans">
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
            <div className="space-y-3 pt-1">
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

          <section className="space-y-3">
            <h3 className="font-serif font-bold text-amber-400 text-base uppercase tracking-wide border-b border-amber-900/30 pb-1">
              3. Energy Allocation & Public Ledger Translation
            </h3>
            <div className="space-y-3">
              <div>
                <strong className="text-slate-100 block font-serif">A. Secret Night Allocation (5 Base Energy)</strong>
                <p className="text-slate-400 text-xs">
                  Each day, you receive energy (base 5 points, plus bonus energy if you rested yesterday). You secretly divide it among 4 actions:
                </p>
                <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-300 font-mono text-xs">
                  <li><strong className="text-amber-300">🔨 Labor (True):</strong> Genuine physical work. <em>This is the ONLY energy that physically advances the Raft.</em> (If you launch an audit on someone, your true labor becomes 0 for that round).</li>
                  <li><strong className="text-amber-300">🔒 Stash:</strong> Diverts energy into personal provisions (+1 Stash per point). 100% hidden from the public Ledger. Needed for launch buyouts, cards, and endgame score.</li>
                  <li><strong className="text-amber-300">✨ Scheme & Audit:</strong> Spend 2 Energy to draw a Scheme card, or focus energy to launch a formal inquest audit on a fellow castaway.</li>
                  <li><strong className="text-amber-300">🌙 Rest:</strong> Sleeping to recover +1 bonus Energy for the following day. Kept confidential.</li>
                </ul>
              </div>

              <div className="p-3 rounded bg-[#0e1726] border border-[#22354c] space-y-1.5">
                <strong className="text-amber-300 block font-serif text-sm">B. How Allocation Translates to the Morning Ledger</strong>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Alongside your secret allocation, you sign a <strong className="text-amber-200">Declared Labor</strong> amount in ink. This declaration is what appears publicly in the morning Ledger:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400 font-mono text-xs">
                  <li><strong className="text-slate-200">The Public Record:</strong> The Ledger lists each player's <em>Claimed Labor</em> and sums them into a <em>Public Total Pledged</em>. Your Stash, Scheme draws, and Rest are never revealed.</li>
                  <li><strong className="text-slate-200">The Phantom Gap:</strong> If you claim 4 Labor but secretly hoarded 4 Stash, you created 4 "phantom" units. The table sees a grand total, but the Raft Progress Bar advances <strong>ONLY by True Labor</strong>! If too many castaways lie, construction stalls and fails despite high public claims.</li>
                  <li><strong className="text-slate-200">Audits:</strong> If someone audits you and you exaggerated your claim, you are exposed as a liar (-4 Reputation to you, +3 to the auditor). If you were truthful, the auditor is disgraced (-3 Reputation to auditor, +2 to you).</li>
                  <li><strong className="text-slate-200">The Saint Card:</strong> If you attach the Saint card and your True Labor &ge; Claimed Labor, your entry receives an infallible "Divine Truth" verification stamp on the Ledger!</li>
                </ul>
              </div>

              <div>
                <strong className="text-slate-100 block font-serif">C. Resolution Phase & Final Reckoning</strong>
                <p className="text-slate-400 text-xs">
                  At dawn, Resolution cards (Mutiny, Sabotage, Bribe) execute, audits publish their findings, and true labor is tallied. At the end of the game, the secret archives are unsealed during <strong className="text-amber-200">The Reckoning</strong>, exposing every castaway's total lifetime gap for all to judge!
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-serif font-bold text-amber-400 text-base uppercase tracking-wide border-b border-amber-900/30 pb-1">
              4. The Satire Governance Ruleset
            </h3>
            <div className="space-y-2">
              <p>
                In Satire Mode, players draft a constitutional charter during the **Founding Phase** choosing from 6 Clauses.
              </p>
              <p>
                A **Governor** is elected through regular elections, making Campaign Promises. The Governor possesses the power to embezzle communal stash or issue pardons, but can be **Impeached** if non-Governor players file articles of impeachment with 2 Stash.
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-serif font-bold text-amber-400 text-base uppercase tracking-wide border-b border-amber-900/30 pb-1">
              5. The Endgame: Launch Phase
            </h3>
            <p>
              Once construction is complete, the launch sequence determines who gets a seat:
            </p>
            <ul className="list-disc pl-5 mt-1 space-y-1 text-xs font-mono text-slate-400">
              <li>Buyouts: Bid accumulated Stash to secure a seat.</li>
              <li>Elections: Vote to award seats to deserving players.</li>
              <li>Swims: Swim for remaining seats using high Reputation.</li>
              <li>Mutinies: Play a Mutiny scheme card (cost: 2 Stash) to unseat someone and contest their seat anew!</li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1c2a3e] bg-[#0d1726] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs uppercase"
          >
            Acknowledge Protocol
          </button>
        </div>
      </div>
    </div>
  );
};
