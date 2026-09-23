/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { db, ensureAnonymousAuth, signInWithGoogle } from './lib/firebase.js';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import type {
  GameData,
  PlayerData,
  RoundData,
  LedgerData,
  AllocationPayload,
  PrivatePlayerProfile,
  SchemeCardId,
  ConstitutionClauseId,
  EndgameTriggerReason,
} from './types.js';
import { GMBanner } from './components/GMBanner.js';
import { RaftStatusCard } from './components/RaftStatusCard.js';
import { LobbyView } from './components/LobbyView.js';
import { ScavengePhase } from './components/ScavengePhase.js';
import { ResolutionWindow } from './components/ResolutionWindow.js';
import { LedgerView } from './components/LedgerView.js';
import { EndgameView } from './components/EndgameView.js';
import { LaunchPhaseView } from './components/LaunchPhaseView.js';
import { RoleRevealModal } from './components/RoleRevealModal.js';
import { RoleHUDPanel } from './components/RoleHUDPanel.js';
import { SchemeHandDrawer } from './components/SchemeHandDrawer.js';
import { PrivateDossierDrawer } from './components/PrivateDossierDrawer.js';
import { ConstitutionDrawer } from './components/ConstitutionDrawer.js';
import { FoundingPhaseView } from './components/FoundingPhaseView.js';
import { ElectionPhaseView } from './components/ElectionPhaseView.js';
import { GovernorBanner } from './components/GovernorBanner.js';
import { ImpeachmentModal } from './components/ImpeachmentModal.js';
import { BuyMeACoffeeButton } from './components/BuyMeACoffeeButton.js';
import { TutorialModal } from './components/TutorialModal.js';
import { Anchor, LogOut, Lock, BatteryCharging, Scroll, Gavel } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState<string>(() => {
    return localStorage.getItem('raft_display_name') || '';
  });
  const [currentGameId, setCurrentGameId] = useState<string | null>(() => {
    return localStorage.getItem('raft_game_id') || null;
  });

  const [game, setGame] = useState<GameData | null>(null);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [myPrivateProfile, setMyPrivateProfile] = useState<PrivatePlayerProfile | null>(null);
  const [currentRoundData, setCurrentRoundData] = useState<RoundData | null>(null);
  const [currentLedgerData, setCurrentLedgerData] = useState<LedgerData | null>(null);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);
  const [isConstitutionOpen, setIsConstitutionOpen] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState<boolean>(false);
  const [selectedScavengeCard, setSelectedScavengeCard] = useState<SchemeCardId | null>(null);
  const [selectedScavengeCardIndex, setSelectedScavengeCardIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Auth
  useEffect(() => {
    ensureAnonymousAuth()
      .then((user) => {
        setCurrentUser(user);
        if (user?.displayName && !displayName) {
          handleSetDisplayName(user.displayName);
        }
      })
      .catch((err) => {
        console.warn('Firebase Auth fallback:', err);
      });
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const user = await signInWithGoogle();
      setCurrentUser(user);
      if (user.displayName) {
        handleSetDisplayName(user.displayName);
      }
    } catch (err: any) {
      console.warn('Google sign-in cancelled or failed:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google sign-in failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Sync display name with localStorage
  const handleSetDisplayName = (name: string) => {
    setDisplayName(name);
    localStorage.setItem('raft_display_name', name);
  };

  // Sync gameId with localStorage
  const setGameId = (id: string | null) => {
    setCurrentGameId(id);
    if (id) {
      localStorage.setItem('raft_game_id', id);
    } else {
      localStorage.removeItem('raft_game_id');
      setGame(null);
      setPlayers([]);
      setMyPrivateProfile(null);
      setCurrentRoundData(null);
      setCurrentLedgerData(null);
      setSelectedScavengeCard(null);
    }
  };

  // Real-time Firestore Listeners
  useEffect(() => {
    if (!currentGameId) return;

    // Listen to Game Doc
    const gameDocRef = doc(db, 'games', currentGameId);
    const unsubGame = onSnapshot(
      gameDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setGame(docSnap.data() as GameData);
        } else {
          setGameId(null);
        }
      },
      (err) => {
        console.error('Game doc listener error:', err);
      }
    );

    // Listen to Players Collection
    const playersColRef = collection(db, `games/${currentGameId}/players`);
    const unsubPlayers = onSnapshot(
      playersColRef,
      (colSnap) => {
        const playerList: PlayerData[] = colSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PlayerData, 'id'>),
        }));
        setPlayers(playerList);
      },
      (err) => {
        console.error('Players listener error:', err);
      }
    );

    return () => {
      unsubGame();
      unsubPlayers();
    };
  }, [currentGameId]);

  // Real-time Private Profile Listener (role, stash, broker intel, hand)
  useEffect(() => {
    if (!currentGameId || !currentUser?.uid) return;

    const privDocRef = doc(
      db,
      `games/${currentGameId}/players/${currentUser.uid}/private`,
      'profile'
    );
    const unsubPriv = onSnapshot(
      privDocRef,
      (snap) => {
        if (snap.exists()) {
          const prof = snap.data() as PrivatePlayerProfile;
          setMyPrivateProfile(prof);

          // If game is active and role has not been acknowledged, automatically show role modal
          if (!prof.roleRevealed) {
            setIsRoleModalOpen(true);
          }
        }
      },
      (err) => {
        console.error('Private profile listener error:', err);
      }
    );

    return () => {
      unsubPriv();
    };
  }, [currentGameId, currentUser?.uid]);

  // Real-time Round & Ledger Listeners
  useEffect(() => {
    if (!currentGameId || !game?.round) return;

    const roundNum = game.round.toString();

    // Listen to current Round doc
    const roundDocRef = doc(db, `games/${currentGameId}/rounds`, roundNum);
    const unsubRound = onSnapshot(roundDocRef, (snap) => {
      if (snap.exists()) {
        setCurrentRoundData(snap.data() as RoundData);
      } else {
        setCurrentRoundData(null);
      }
    });

    // Listen to current Ledger doc
    const ledgerDocRef = doc(db, `games/${currentGameId}/ledger`, roundNum);
    const unsubLedger = onSnapshot(ledgerDocRef, (snap) => {
      if (snap.exists()) {
        setCurrentLedgerData(snap.data() as LedgerData);
      } else {
        setCurrentLedgerData(null);
      }
    });

    return () => {
      unsubRound();
      unsubLedger();
    };
  }, [currentGameId, game?.round]);

  // Synchronize selectedScavengeCard from database current submission (for page reloads or external updates)
  useEffect(() => {
    if (currentRoundData && currentUser) {
      const mySub = currentRoundData.submissions?.[currentUser.uid];
      if (mySub && mySub.playedCardId) {
        setSelectedScavengeCard(mySub.playedCardId);
        if (typeof mySub.playedCardIndex === 'number') {
          setSelectedScavengeCardIndex(mySub.playedCardIndex);
        }
      } else {
        setSelectedScavengeCard(null);
        setSelectedScavengeCardIndex(null);
      }
    } else {
      setSelectedScavengeCard(null);
      setSelectedScavengeCardIndex(null);
    }
  }, [currentRoundData, currentUser?.uid]);

  const handleSelectScavengeCard = (cardId: SchemeCardId | null, cardIndex?: number | null) => {
    setSelectedScavengeCard(cardId);
    if (cardId === null) {
      setSelectedScavengeCardIndex(null);
    } else if (typeof cardIndex === 'number') {
      setSelectedScavengeCardIndex(cardIndex);
    } else if (myPrivateProfile?.hand) {
      const idx = myPrivateProfile.hand.indexOf(cardId);
      setSelectedScavengeCardIndex(idx >= 0 ? idx : null);
    }
  };

  // Handlers
  const handleCreateGame = async () => {
    if (!currentUser || !displayName.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: currentUser.uid,
          hostName: displayName.trim(),
          mode: 'satire',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create game');
      setGameId(data.gameId);
    } catch (err: any) {
      setError(err.message || 'Error establishing game');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMode = async (mode: 'classic' | 'satire') => {
    if (!currentGameId || !currentUser) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/game/mode/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          hostId: currentUser.uid,
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle mode');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGame = async (roomCode: string) => {
    if (!currentUser || !displayName.trim() || !roomCode.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: roomCode.trim().toUpperCase(),
          playerId: currentUser.uid,
          playerName: displayName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join game');
      setGameId(data.gameId);
    } catch (err: any) {
      setError(err.message || 'Error joining expedition');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPreferredRole = async (role: string) => {
    if (!currentUser || !currentGameId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/game/preferred-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          playerId: currentUser.uid,
          preferredRole: role,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to select preferred role');
    } catch (err: any) {
      setError(err.message || 'Error updating preferred role');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBot = async () => {
    if (!currentGameId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/game/add-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: currentGameId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add demo castaway');
    } catch (err: any) {
      setError(err.message || 'Error adding demo castaway');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!currentGameId || !currentUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          hostId: currentUser.uid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to commence construction');
    } catch (err: any) {
      setError(err.message || 'Error starting game');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAllocation = async (payload: AllocationPayload) => {
    if (!currentGameId || !currentUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/game/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          playerId: currentUser.uid,
          allocation: {
            labor: payload.labor,
            stash: payload.stash,
            scheme: payload.scheme,
            rest: payload.rest,
            embezzle: payload.embezzle,
            auditTargetId: payload.auditTargetId,
            roleAction: payload.roleAction,
            rolePayload: payload.rolePayload,
            playedCardId: payload.playedCardId,
            playedCardIndex:
              typeof payload.playedCardIndex === 'number'
                ? payload.playedCardIndex
                : selectedScavengeCardIndex ?? undefined,
            cardTargetId: payload.cardTargetId,
          },
          claimedLabor: payload.claimedLabor,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to seal submission');
      setSelectedScavengeCard(null);
      setSelectedScavengeCardIndex(null);
    } catch (err: any) {
      setError(err.message || 'Error submitting labor allocation');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayResolutionCard = async (cardId: SchemeCardId, targetId?: string) => {
    if (!currentGameId || !currentUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/game/play-resolution-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          playerId: currentUser.uid,
          cardId,
          targetId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to play resolution card');
      return data;
    } catch (err: any) {
      const msg = err.message || 'Error playing scheme card';
      // If the resolution window closed while deciding or card limit reached, avoid flashing global banner
      if (
        !msg.toLowerCase().includes('closed') &&
        !msg.toLowerCase().includes('tally') &&
        !msg.toLowerCase().includes('transition') &&
        !msg.toLowerCase().includes('at most 1') &&
        !msg.toLowerCase().includes('already played')
      ) {
        setError(msg);
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscardCard = async (cardId: SchemeCardId, cardIndex?: number) => {
    if (!currentGameId || !currentUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/game/discard-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          playerId: currentUser.uid,
          cardId,
          cardIndex,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to discard card');
      if (selectedScavengeCardIndex === cardIndex || selectedScavengeCard === cardId) {
        setSelectedScavengeCard(null);
        setSelectedScavengeCardIndex(null);
      }
      return data;
    } catch (err: any) {
      setError(err.message || 'Error discarding card');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalizeResolution = async () => {
    if (!currentGameId || !game?.round) return;
    try {
      await fetch('/api/game/finalize-resolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          round: game.round,
        }),
      });
    } catch (err: any) {
      console.warn('Finalize resolution error:', err);
    }
  };

  const handleAdvanceRound = async () => {
    if (!currentGameId || !currentUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/game/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          hostId: currentUser.uid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to advance expedition round');
    } catch (err: any) {
      setError(err.message || 'Error advancing round');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteRoleAction = async (actionType: string, payload?: any) => {
    if (!currentGameId || !currentUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/game/role-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          playerId: currentUser.uid,
          actionType,
          payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action execution failed');
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to execute archetype action');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Launch Phase Handlers
  const handleAdvanceLaunchStep = async () => {
    if (!currentGameId || !currentUser) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/game/launch/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          hostId: currentUser.uid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to advance launch step');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitLaunchVote = async (targetId: string) => {
    if (!currentGameId || !currentUser) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/game/launch/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          voterId: currentUser.uid,
          targetId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cast launch vote');
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitLaunchBuyout = async (amount: number) => {
    if (!currentGameId || !currentUser) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/game/launch/buyout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          playerId: currentUser.uid,
          amount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit buyout bid');
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitLaunchSwim = async () => {
    if (!currentGameId || !currentUser) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/game/launch/swim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          playerId: currentUser.uid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit swim attempt');
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayLaunchMutiny = async (targetSeatNumber: number) => {
    if (!currentGameId || !currentUser) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/game/launch/mutiny', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          playerId: currentUser.uid,
          targetSeatNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to play mutiny');
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Satire Mode Handlers
  const handleVoteFounding = async (clauseId: ConstitutionClauseId, choice: 'A' | 'B') => {
    if (!currentGameId || !currentUser) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/game/founding/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          playerId: currentUser.uid,
          clauseId,
          choice,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit clause vote');
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveFounding = async () => {
    if (!currentGameId) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/game/founding/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: currentGameId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resolve founding convention');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNominateGovernor = async (promiseText: string) => {
    if (!currentGameId || !currentUser) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/game/election/nominate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          playerId: currentUser.uid,
          promiseText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to file for Governor');
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdvanceElectionStage = async (force?: boolean) => {
    if (!currentGameId || !currentUser) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/game/election/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          hostId: currentUser.uid,
          force: !!force,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to advance election stage');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitElectionVote = async (targetNomineeId: string) => {
    if (!currentGameId || !currentUser) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/game/election/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          voterId: currentUser.uid,
          targetNomineeId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cast gubernatorial vote');
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveElection = async () => {
    if (!currentGameId) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/game/election/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: currentGameId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to tally election ballots');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileImpeachment = async () => {
    if (!currentGameId || !currentUser) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/game/impeachment/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          filerId: currentUser.uid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to file Articles of Impeachment');
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoteImpeachment = async (inFavor: boolean) => {
    if (!currentGameId || !currentUser) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/game/impeachment/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          voterId: currentUser.uid,
          inFavor,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record vote');
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveImpeachment = async () => {
    if (!currentGameId) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/game/impeachment/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: currentGameId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resolve impeachment trial');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGovernorPardon = async (targetPlayerId: string) => {
    if (!currentGameId || !currentUser) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/game/governor/pardon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          governorId: currentUser.uid,
          targetPlayerId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to execute pardon');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGovernorEmergency = async () => {
    if (!currentGameId || !currentUser) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/game/governor/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          governorId: currentUser.uid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to invoke emergency powers');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------
  // ROUND 7: ENDGAME HANDLERS
  // ---------------------------------------------------------

  const handleTriggerEndgame = async (reason: EndgameTriggerReason = 'manual') => {
    if (!currentGameId) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/game/endgame/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger endgame');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdvanceEndgameStep = async (force?: boolean) => {
    if (!currentGameId) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/game/endgame/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          hostId: currentUser?.uid,
          force: !!force,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to advance endgame');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitEndgameConfession = async (text: string) => {
    if (!currentGameId || !currentUser) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/game/endgame/confess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          playerId: currentUser.uid,
          text,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit confession');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdvanceRevealBeat = async () => {
    if (!currentGameId) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/game/endgame/reveal-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to advance reveal');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitBlameVote = async (targetId: string) => {
    if (!currentGameId || !currentUser) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/game/endgame/blame-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          voterId: currentUser.uid,
          targetId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit blame vote');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveBlameVote = async () => {
    if (!currentGameId) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/game/endgame/resolve-blame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resolve blame vote');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveGame = () => {
    setGameId(null);
  };

  const onLeaveRequest = () => {
    if (game && game.status === 'active') {
      setIsLeaveModalOpen(true);
    } else {
      handleLeaveGame();
    }
  };

  const handleConfirmLeaveAndBotify = async () => {
    if (!currentGameId || !currentUser) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/game/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameId,
          playerId: currentUser.uid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to leave game');
      setIsLeaveModalOpen(false);
      handleLeaveGame();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Find current player profile
  const myPlayer = players.find((p) => p.id === currentUser?.uid) || {
    id: currentUser?.uid || 'temp',
    displayName: displayName || 'Castaway',
    energy: 5,
    stash: myPrivateProfile?.stash || 0,
    reputation: 0,
    connected: true,
    isHost: game?.hostId === currentUser?.uid,
    handCount: myPrivateProfile?.hand?.length || 0,
  };

  const otherPlayers = players.filter((p) => p.id !== currentUser?.uid);

  const hasSubmittedThisRound =
    Boolean(currentRoundData?.submittedPlayerIds?.includes(currentUser?.uid)) ||
    Boolean(currentRoundData?.submissions?.[currentUser?.uid]);

  const hasPlayedSchemeThisRound = Boolean(
    currentUser && (
      currentRoundData?.cardsPlayed?.some((c) => c.playerId === currentUser.uid) ||
      Boolean(currentRoundData?.submissions?.[currentUser.uid]?.playedCardId)
    )
  );

  const submittedCount = currentRoundData?.submittedPlayerIds?.length || 0;
  const isHost = game?.hostId === currentUser?.uid;

  const currentPhase: 'scavenge' | 'resolution' | 'ledger' | 'launch' =
    game?.roundPhase === 'launch' || game?.roundPhase === 'postlaunch'
      ? 'launch'
      : (game?.roundPhase as 'scavenge' | 'resolution' | 'ledger') || 'scavenge';

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-200 flex flex-col font-serif pb-32">
      {/* Role Reveal Modal (Initial Secret Inscription) */}
      <RoleRevealModal
        isOpen={isRoleModalOpen && Boolean(myPrivateProfile)}
        onClose={() => {
          setIsRoleModalOpen(false);
          handleExecuteRoleAction('reveal_role').catch(() => {});
        }}
        profile={myPrivateProfile}
      />

      {/* Leave Game & Replace with AI Confirmation Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-xl bg-[#0d1421] border border-red-900/50 shadow-2xl overflow-hidden p-6 space-y-6">
            <div className="space-y-2 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-950/40 border border-red-800 text-red-400 mb-2">
                <LogOut className="w-6 h-6" />
              </div>
              <h2 className="font-serif font-bold text-lg text-slate-100 tracking-wide">
                Abandon the Expedition?
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                YOU ARE ABOUT TO LEAVE THE MATCH
              </p>
            </div>

            <div className="p-4 rounded-lg bg-red-950/10 border border-red-900/30 space-y-3">
              <p className="text-xs text-red-300 leading-relaxed font-mono">
                ⚠️ WARNING: IF YOU ABANDON DRIFTWOOD:
              </p>
              <ul className="text-[11px] text-slate-300 space-y-1.5 list-disc pl-4 font-sans leading-relaxed">
                <li>
                  You will be <strong className="text-red-200">permanently replaced by an AI Bot</strong> who will play your hand, stash, and secret alignment for the rest of the game.
                </li>
                <li>
                  If you are the Host, hosting credentials will automatically hand off to another active human player.
                </li>
                <li>
                  <strong className="text-red-200">You cannot return to this session.</strong> Once you disconnect, the tide washes your tracks away.
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsLeaveModalOpen(false)}
                className="px-4 py-2 rounded font-mono text-xs text-slate-400 hover:text-slate-200 hover:bg-[#152033] border border-transparent transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLeaveAndBotify}
                disabled={isLoading}
                className="px-5 py-2.5 rounded font-mono font-bold text-xs bg-red-700 hover:bg-red-600 active:bg-red-800 text-white transition-colors cursor-pointer flex items-center gap-1.5"
              >
                Confirm & Leave Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confidential Dossier & Private Logs Drawer */}
      <PrivateDossierDrawer
        gameId={currentGameId || ''}
        playerId={currentUser?.uid || ''}
        profile={myPrivateProfile}
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
      />

      {/* Constitution Drawer (Round 5 Satire Mode) */}
      <ConstitutionDrawer
        constitution={game?.constitution}
        isOpen={isConstitutionOpen}
        onClose={() => setIsConstitutionOpen(false)}
      />

      {/* Impeachment Trial Modal (Round 5 Satire Mode) */}
      {game && (
        <ImpeachmentModal
          game={game}
          players={players}
          currentUserId={currentUser?.uid || ''}
          isHost={isHost}
          onVote={handleVoteImpeachment}
          onResolve={handleResolveImpeachment}
          isLoading={isLoading}
        />
      )}

      {/* Top Game Master Narration Banner */}
      <GMBanner narration={game?.gmNarration} round={game?.round} />

      {/* Main Header / Nav */}
      <header
        id="app-header"
        className="w-full bg-[#0c1322] border-b border-[#1f2d42] px-4 sm:px-8 py-3.5 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#162238] border border-[#263750] flex items-center justify-center text-amber-500">
            <Anchor className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight font-serif text-slate-100 flex items-center gap-2">
              THE RAFT
              <span className="text-[10px] font-mono font-normal uppercase px-1.5 py-0.5 rounded bg-[#152033] border border-[#24344d] text-amber-400">
                {game?.mode === 'classic' ? 'Classic Mode' : 'Satire Mode • Constitution & Governor'}
              </span>
            </span>
          </div>
        </div>

        {currentGameId && game && (
          <div className="flex items-center gap-3">
            {/* Survival Walkthrough Guide Button */}
            <button
              id="open-guide-btn"
              onClick={() => setIsTutorialOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono bg-[#1c1d1a] hover:bg-[#2c2e28] border border-[#3e4235] text-amber-400 hover:text-amber-300 transition-colors shadow-sm"
              title="Open Survival Walkthrough Guide"
            >
              <span>📖</span>
              <span className="font-bold">Survival Guide</span>
            </button>

            {/* Constitution Drawer Button */}
            {game.constitution && (
              <button
                id="open-constitution-btn"
                onClick={() => setIsConstitutionOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono bg-[#1c1829] hover:bg-[#28213b] border border-amber-800/60 text-amber-300 transition-colors shadow-sm"
                title="View Isle Constitution"
              >
                <Scroll className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold">Constitution</span>
              </button>
            )}

            {/* Confidential Dossier Button */}
            <button
              id="open-dossier-btn"
              onClick={() => setIsDossierOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono bg-[#162238] hover:bg-[#203252] border border-[#2d4264] text-amber-400 hover:text-amber-300 transition-colors shadow-sm"
              title="Open Secret Dossier & Logs"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="font-bold">Dossier</span>
            </button>

            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-400">
              <span>Room: <strong className="text-slate-200">{game.roomCode}</strong></span>
              <span>•</span>
              <span>Phase: <strong className="text-amber-400 uppercase">{game.roundPhase}</strong></span>
            </div>

            {/* Host Emergency / Manual Reckoning Trigger */}
            {isHost && game.status === 'active' && game.roundPhase !== 'endgame' && (
              <button
                id="host-trigger-endgame-btn"
                onClick={() => handleTriggerEndgame('manual')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono bg-red-950/60 hover:bg-red-900/80 border border-red-800/80 text-red-300 transition-colors shadow-sm"
                title="Conclude expedition and invoke the Final Reckoning"
              >
                <Gavel className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden sm:inline font-bold">The Reckoning</span>
              </button>
            )}

            <button
              id="leave-room-btn"
              onClick={onLeaveRequest}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono bg-[#141d2d] hover:bg-[#1e2a3f] border border-[#27374e] text-slate-400 hover:text-slate-200 transition-colors"
              title="Leave Room"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Leave</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Content Body */}
      <div className="flex-1 flex flex-col">
        {!game || game.status === 'lobby' ? (
          <LobbyView
            currentUser={currentUser}
            displayName={displayName}
            setDisplayName={handleSetDisplayName}
            currentGame={game}
            players={players}
            onCreateGame={handleCreateGame}
            onJoinGame={handleJoinGame}
            onStartGame={handleStartGame}
            onAddBot={handleAddBot}
            onGoogleSignIn={handleGoogleSignIn}
            onToggleMode={handleToggleMode}
            onSelectPreferredRole={handleSelectPreferredRole}
            isLoading={isLoading}
            error={error}
            setError={setError}
          />
        ) : game.status === 'ended' || game.roundPhase === 'endgame' ? (
          <EndgameView
            game={game}
            players={players}
            currentUserId={currentUser?.uid || ''}
            userProfile={myPrivateProfile}
            onAdvanceStep={handleAdvanceEndgameStep}
            onConfess={handleSubmitEndgameConfession}
            onAdvanceReveal={handleAdvanceRevealBeat}
            onBlameVote={handleSubmitBlameVote}
            onResolveBlame={handleResolveBlameVote}
            onReset={handleLeaveGame}
          />
        ) : (
          <main className="w-full max-w-4xl mx-auto p-4 sm:p-6 my-4 space-y-6">
            {/* Round 5 Governor Office Banner */}
            {game.mode !== 'classic' && (
              <GovernorBanner
                game={game}
                players={players}
                currentUserId={currentUser?.uid || ''}
                userProfile={myPrivateProfile}
                onPardon={handleGovernorPardon}
                onEmergencyVote={handleGovernorEmergency}
                onFileImpeachment={handleFileImpeachment}
                onOpenConstitution={() => setIsConstitutionOpen(true)}
                isLoading={isLoading}
              />
            )}

            {/* Top HUD & Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Stat 1: Identity & Public Reputation */}
              <div className="p-3.5 rounded-lg bg-[#0e1626] border border-[#1e2c40] font-mono flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] uppercase text-slate-500 mb-1">
                  <span>Identity</span>
                  <span className="text-slate-400">Public Record</span>
                </div>
                <div className="font-serif font-bold text-slate-100 text-sm sm:text-base truncate">
                  {myPlayer.displayName}
                </div>
                <div className="flex items-center gap-1.5 text-xs mt-1.5">
                  <span className="text-slate-400 text-[11px]">Reputation:</span>
                  <span
                    className={`font-bold ${
                      myPlayer.reputation > 0
                        ? 'text-emerald-400'
                        : myPlayer.reputation < 0
                        ? 'text-red-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {myPlayer.reputation > 0 ? `+${myPlayer.reputation}` : myPlayer.reputation} Rep
                  </span>
                </div>
              </div>

              {/* Stat 2: Energy, Stash & Scheme Hand */}
              <div className="p-3.5 rounded-lg bg-[#0e1626] border border-[#1e2c40] font-mono flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] uppercase text-slate-500 mb-1">
                  <span className="flex items-center gap-1">
                    <BatteryCharging className="w-3 h-3 text-amber-500" />
                    Survival Energy
                  </span>
                  <span className="text-amber-600 font-bold">Stash / Schemes</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="font-bold text-amber-400 text-base sm:text-lg">
                    {myPlayer.energy || 5} <span className="text-xs font-normal text-slate-400">pts</span>
                  </div>
                  <div className="font-bold text-slate-200 text-xs">
                    {myPrivateProfile?.stash ?? myPlayer.stash ?? 0}{' '}
                    <span className="text-[10px] font-normal text-slate-400">Stash</span> •{' '}
                    <span className="text-amber-400 font-bold">{myPrivateProfile?.hand?.length || 0}/5</span>{' '}
                    <span className="text-[10px] font-normal text-slate-400">Cards</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  +1 Energy regained per Rest point allocated
                </div>
              </div>

              {/* Stat 3: Archetype HUD Panel */}
              <RoleHUDPanel
                profile={myPrivateProfile}
                onOpenDossier={() => setIsDossierOpen(true)}
                onTriggerActiveAbility={handleExecuteRoleAction}
                otherPlayers={otherPlayers}
              />
            </div>

            {/* Raft Construction Status Card */}
            <RaftStatusCard
              currentStage={game.raftStage}
              progress={game.raftProgress}
              vagueStatus={currentLedgerData?.stageProgressStatus || game.gmNarration}
            />

            {/* Phase Switcher */}
            {game.roundPhase === 'founding' ? (
              <FoundingPhaseView
                game={game}
                players={players}
                currentUserId={currentUser?.uid || ''}
                isHost={isHost}
                onVoteClause={handleVoteFounding}
                onResolveFounding={handleResolveFounding}
                isLoading={isLoading}
              />
            ) : game.roundPhase === 'election' ? (
              <ElectionPhaseView
                game={game}
                players={players}
                currentUserId={currentUser?.uid || ''}
                userProfile={myPrivateProfile}
                isHost={isHost}
                onNominate={handleNominateGovernor}
                onVote={handleSubmitElectionVote}
                onAdvanceStage={handleAdvanceElectionStage}
                onResolveElection={handleResolveElection}
                isLoading={isLoading}
              />
            ) : game.roundPhase === 'launch' || game.roundPhase === 'postlaunch' ? (
              <LaunchPhaseView
                game={game}
                players={players}
                currentUserId={currentUser?.uid || ''}
                userProfile={myPrivateProfile}
                onAdvanceStep={handleAdvanceLaunchStep}
                onSubmitVote={handleSubmitLaunchVote}
                onSubmitBuyout={handleSubmitLaunchBuyout}
                onSubmitSwim={handleSubmitLaunchSwim}
                onPlayMutiny={handlePlayLaunchMutiny}
                onEndGame={() => handleTriggerEndgame('launch')}
              />
            ) : game.roundPhase === 'resolution' ? (
              <ResolutionWindow
                game={game}
                roundData={currentRoundData}
                players={players}
                currentPlayer={myPlayer}
                profile={myPrivateProfile}
                onPlayResolutionCard={handlePlayResolutionCard}
                onFinalize={handleFinalizeResolution}
                isLoading={isLoading}
              />
            ) : game.roundPhase === 'scavenge' ? (
              <ScavengePhase
                player={myPlayer}
                profile={myPrivateProfile}
                otherPlayers={otherPlayers}
                roundNumber={game.round}
                raftStage={game.raftStage}
                totalCastaways={players.length}
                submittedCount={submittedCount}
                hasSubmitted={hasSubmittedThisRound}
                selectedScavengeCard={selectedScavengeCard}
                selectedScavengeCardIndex={selectedScavengeCardIndex}
                onSelectScavengeCard={handleSelectScavengeCard}
                onSubmitAllocation={handleSubmitAllocation}
                onExecuteRoleAction={handleExecuteRoleAction}
                isLoading={isLoading}
              />
            ) : (
              <LedgerView
                game={game}
                ledger={currentLedgerData}
                players={players}
                currentUserId={currentUser?.uid}
                isHost={isHost}
                onAdvanceRound={handleAdvanceRound}
                isLoading={isLoading}
              />
            )}
          </main>
        )}
      </div>

      {/* Persistent Bottom Scheme Hand Drawer (Active when game is ongoing) */}
      {game && game.status === 'active' && game.roundPhase !== 'founding' && game.roundPhase !== 'election' && (
        <div className="fixed bottom-0 left-0 right-0 z-40">
          <SchemeHandDrawer
            profile={myPrivateProfile}
            otherPlayers={otherPlayers}
            currentPhase={currentPhase}
            currentRound={game.round}
            raftStage={game.raftStage}
            hasPlayedCardThisRound={hasPlayedSchemeThisRound}
            onPlayCard={handlePlayResolutionCard}
            onDiscardCard={handleDiscardCard}
            selectedScavengeCard={selectedScavengeCard}
            selectedScavengeCardIndex={selectedScavengeCardIndex}
            onSelectScavengeCard={handleSelectScavengeCard}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Floating Buy Me a Coffee button (Aeon-Fall / Emberlight standard) */}
      <BuyMeACoffeeButton />

      {/* Shared Survival Walkthrough Modal */}
      <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
    </div>
  );
}
