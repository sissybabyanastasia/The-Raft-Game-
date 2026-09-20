import type { ConstitutionClauseDef, ConstitutionClauseId } from '../types.js';

export const CONSTITUTION_CLAUSES: Record<ConstitutionClauseId, ConstitutionClauseDef> = {
  ledgerClause: {
    id: 'ledgerClause',
    title: 'The Ledger Clause',
    optionA: {
      label: 'Public Ledger',
      value: 'public',
      desc: 'Public Ledger visible to all castaways.',
    },
    optionB: {
      label: 'Private Ledger',
      value: 'private',
      desc: 'Private Ledger — only the Governor sees true totals.',
    },
  },
  captainClause: {
    id: 'captainClause',
    title: 'The Captain Clause',
    optionA: {
      label: 'Elected Term',
      value: 'elected',
      desc: 'Governor elected every 3 rounds.',
    },
    optionB: {
      label: 'Lifetime Term',
      value: 'lifetime',
      desc: 'Governor serves for whole game (no re-election).',
    },
  },
  voteClause: {
    id: 'voteClause',
    title: 'The Vote Clause',
    optionA: {
      label: 'Public Ballots',
      value: 'public',
      desc: 'All votes and ballots are made public.',
    },
    optionB: {
      label: 'Anonymous Ballots',
      value: 'anonymous',
      desc: 'All votes and ballots are anonymous.',
    },
  },
  propertyClause: {
    id: 'propertyClause',
    title: 'The Property Clause',
    optionA: {
      label: 'Protected Stash',
      value: 'protected',
      desc: 'Stash is protected (Bribe card is disabled).',
    },
    optionB: {
      label: 'Fair Game',
      value: 'fair_game',
      desc: 'Stash is fair game (Bribe card works normally).',
    },
  },
  laborClause: {
    id: 'laborClause',
    title: 'The Labor Clause',
    optionA: {
      label: 'Voluntary Labor',
      value: 'voluntary',
      desc: 'Labor is voluntary (0 Labor allowed without penalty).',
    },
    optionB: {
      label: 'Mandatory Labor',
      value: 'mandatory',
      desc: 'Labor is mandatory (players submitting 0 Labor lose 2 reputation).',
    },
  },
  blameClause: {
    id: 'blameClause',
    title: 'The Blame Clause',
    optionA: {
      label: 'Binding Blame',
      value: 'binding',
      desc: 'End-game Blame Vote carries permanent campaign penalty.',
    },
    optionB: {
      label: 'Ceremonial Blame',
      value: 'ceremonial',
      desc: 'Blame Vote is ceremonial (winner gains -3 rep, no lasting effect).',
    },
  },
};
