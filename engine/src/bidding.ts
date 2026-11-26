// Making trump: both rounds, the turned-up Benny, Up and Down, going alone,
// taking over, defending alone, and the dealer's pick-up and discard.
// See ../../EUCHRE_RULES.md sections 4, 5 and 6.
//
// The bidding is a state machine. Every state says whose turn it is and which
// actions are legal; applyBidAction returns a new state (the old one is unchanged),
// which makes it easy for bots to try "what if" moves.

import { SUITS, cardId, sameCard, SUIT_NAME, type Card, type Suit } from './cards.ts';
import { leftOf, partnerOf, teamOf, type Deal, type Seat, type Team } from './deal.ts';

export type BidAction =
  /** Pass, or (after trump is made) decline to go alone. */
  | { type: 'pass' }
  /** Round one: make the upcard's suit trump. For the dealer this is "pick it up". */
  | { type: 'orderUp'; alone: boolean }
  /** Round two (or a turned-up Benny): name a suit as trump. */
  | { type: 'name'; suit: Suit; alone: boolean }
  /** After trump is made: take over a partner's loner, defend alone, or answer a lone defender. */
  | { type: 'goAlone' }
  /** The dealer discards one card face down after picking up. */
  | { type: 'discard'; card: Card };

export type BidPhase =
  | 'round1'    // order up or pass
  | 'round2'    // name a suit or pass
  | 'bennyCall' // Benny turned up: the dealer names trump blind
  | 'afterCall' // trump is made; players who haven't spoken may go alone / defend alone
  | 'discard'   // dealer picked up and must discard
  | 'done'      // bidding finished, ready to play
  | 'thrownIn'; // everyone passed twice: redeal, deal passes left

export interface BidEvent {
  readonly seat: Seat;
  readonly phase: BidPhase;
  readonly action: BidAction;
}

export interface BiddingState {
  readonly deal: Deal;
  readonly phase: BidPhase;
  /** Whose turn it is, or null when bidding is over. */
  readonly turn: Seat | null;
  /** Seats still to have their turn in the afterCall phase (turn === pending[0]). */
  readonly pending: readonly Seat[];
  readonly trump: Suit | null;
  /** The player who made trump. */
  readonly maker: Seat | null;
  /** The makers' lone player, if the makers are playing alone. */
  readonly makerLoner: Seat | null;
  /** The defenders' lone player, if a defender is defending alone. */
  readonly loneDefender: Seat | null;
  /** The dealer will pick up (or has picked up) the upcard / Benny. */
  readonly dealerPicksUp: boolean;
  /** Current hands. The dealer's hand has 6 cards during the discard phase. */
  readonly hands: readonly (readonly Card[])[];
  /** The dealer's face-down discard, once made. */
  readonly discard: Card | null;
  readonly history: readonly BidEvent[];
}

export function startBidding(deal: Deal): BiddingState {
  const benny = deal.upcard.kind === 'benny';
  return {
    deal,
    phase: benny ? 'bennyCall' : 'round1',
    turn: benny ? deal.dealer : leftOf(deal.dealer),
    pending: [],
    trump: null,
    maker: null,
    makerLoner: null,
    loneDefender: null,
    dealerPicksUp: false,
    hands: deal.hands.map((h) => [...h]),
    discard: null,
    history: [],
  };
}

/** The suit that can't be named in round two (the turned-down upcard's suit). */
export function turnedDownSuit(state: BiddingState): Suit | null {
  return state.deal.upcard.kind === 'suited' ? state.deal.upcard.suit : null;
}

export function makerTeam(state: BiddingState): Team | null {
  return state.maker === null ? null : teamOf(state.maker);
}

/** Players laying their cards face down for this hand. */
export function sittingOut(state: Pick<BiddingState, 'makerLoner' | 'loneDefender'>): Seat[] {
  const out: Seat[] = [];
  if (state.makerLoner !== null) out.push(partnerOf(state.makerLoner));
  if (state.loneDefender !== null) out.push(partnerOf(state.loneDefender));
  return out;
}

export function isPlaying(state: Pick<BiddingState, 'makerLoner' | 'loneDefender'>, seat: Seat): boolean {
  return !sittingOut(state).includes(seat);
}

export function legalBidActions(state: BiddingState): BidAction[] {
  const seat = state.turn;
  if (seat === null) return [];
  const dealer = state.deal.dealer;
  const both = [false, true];

  switch (state.phase) {
    case 'round1':
      // The dealer's partner ordering up is always a loner ("Up and Down").
      if (seat === partnerOf(dealer)) return [{ type: 'pass' }, { type: 'orderUp', alone: true }];
      return [{ type: 'pass' }, ...both.map((alone) => ({ type: 'orderUp' as const, alone }))];

    case 'round2': {
      const banned = turnedDownSuit(state);
      const names = SUITS.filter((s) => s !== banned).flatMap((suit) =>
        both.map((alone) => ({ type: 'name' as const, suit, alone })));
      return [{ type: 'pass' }, ...names];
    }

    case 'bennyCall':
      // The dealer must name a suit (blind). No pass.
      return SUITS.flatMap((suit) => both.map((alone) => ({ type: 'name' as const, suit, alone })));

    case 'afterCall':
      return canGoAloneAfterCall(state, seat) ? [{ type: 'pass' }, { type: 'goAlone' }] : [{ type: 'pass' }];

    case 'discard':
      return state.hands[dealer]!.map((card) => ({ type: 'discard' as const, card }));

    case 'done':
    case 'thrownIn':
      return [];
  }
}

function canGoAloneAfterCall(_state: BiddingState, _seat: Seat): boolean {
  // Anyone who still has a turn may go alone (league ruling, 26 Nov 2026):
  // - a defender: defend alone, or take over their partner's lone defence;
  // - the maker's partner: drop the maker and play alone, whether or not the maker went alone
  //   and whether or not a defender is defending alone.
  return true;
}

function sameAction(a: BidAction, b: BidAction): boolean {
  switch (a.type) {
    case 'pass':
    case 'goAlone':
      return a.type === b.type;
    case 'orderUp':
      return b.type === 'orderUp' && a.alone === b.alone;
    case 'name':
      return b.type === 'name' && a.suit === b.suit && a.alone === b.alone;
    case 'discard':
      return b.type === 'discard' && sameCard(a.card, b.card);
  }
}

export function isLegalBidAction(state: BiddingState, action: BidAction): boolean {
  return legalBidActions(state).some((a) => sameAction(a, action));
}

/** Seats after the maker, clockwise, up to and including the dealer. */
function seatsStillToSpeak(maker: Seat, dealer: Seat): Seat[] {
  const out: Seat[] = [];
  for (let s = maker; s !== dealer; ) {
    s = leftOf(s);
    out.push(s);
  }
  return out;
}

export function applyBidAction(state: BiddingState, action: BidAction): BiddingState {
  if (!isLegalBidAction(state, action)) {
    throw new Error(`Illegal bid action ${describeBidAction(action)} in phase ${state.phase} for seat ${state.turn}`);
  }
  const seat = state.turn!;
  const dealer = state.deal.dealer;
  const s: BiddingState = { ...state, history: [...state.history, { seat, phase: state.phase, action }] };

  switch (action.type) {
    case 'pass':
      if (state.phase === 'afterCall') return continueAfterCall(s, state.pending.slice(1));
      if (seat !== dealer) return { ...s, turn: leftOf(seat) };
      if (state.phase === 'round1') return { ...s, phase: 'round2', turn: leftOf(dealer) };
      return { ...s, phase: 'thrownIn', turn: null };

    case 'orderUp': {
      const up = state.deal.upcard;
      if (up.kind !== 'suited') throw new Error('unreachable: Benny cannot be ordered up');
      return makeTrump(s, seat, up.suit, action.alone, true);
    }

    case 'name':
      return makeTrump(s, seat, action.suit, action.alone, state.phase === 'bennyCall');

    case 'goAlone': {
      const next = teamOf(seat) === makerTeam(state) ? { ...s, makerLoner: seat } : { ...s, loneDefender: seat };
      return continueAfterCall(next, state.pending.slice(1));
    }

    case 'discard': {
      const hand = state.hands[dealer]!;
      const i = hand.findIndex((c) => sameCard(c, action.card));
      const hands = state.hands.map((h, idx) => (idx === dealer ? [...hand.slice(0, i), ...hand.slice(i + 1)] : h));
      return { ...s, phase: 'done', turn: null, hands, discard: hand[i]! };
    }
  }
}

function makeTrump(s: BiddingState, seat: Seat, trump: Suit, alone: boolean, dealerPicksUp: boolean): BiddingState {
  const made: BiddingState = {
    ...s,
    trump,
    maker: seat,
    makerLoner: alone ? seat : null,
    dealerPicksUp,
  };
  // With a turned-up Benny no one else may go alone, so the call ends here.
  const stillToSpeak = s.phase === 'bennyCall' ? [] : seatsStillToSpeak(seat, s.deal.dealer);
  return continueAfterCall(made, stillToSpeak);
}

/** Give the next player still to speak their turn, or finish the call. */
function continueAfterCall(s: BiddingState, stillToSpeak: readonly Seat[]): BiddingState {
  if (stillToSpeak.length > 0) return { ...s, phase: 'afterCall', pending: stillToSpeak, turn: stillToSpeak[0]! };
  return finishCall({ ...s, pending: [] });
}

function finishCall(s: BiddingState): BiddingState {
  const dealer = s.deal.dealer;
  // A dealer who is sitting out does not pick up (e.g. Up and Down when the dealer doesn't take over).
  const picksUp = s.dealerPicksUp && isPlaying(s, dealer);
  if (!picksUp) return { ...s, phase: 'done', turn: null, dealerPicksUp: false };
  const hands = s.hands.map((h, idx) => (idx === dealer ? [...h, s.deal.upcard] : h));
  return { ...s, phase: 'discard', turn: dealer, dealerPicksUp: true, hands };
}

// ---------------------------------------------------------------------------
// Result of a finished call

export interface Contract {
  trump: Suit;
  maker: Seat;
  makerTeam: Team;
  makerLoner: Seat | null;
  loneDefender: Seat | null;
  sittingOut: Seat[];
  dealerPickedUp: boolean;
  discard: Card | null;
  /** Hands to play the hand with (5 cards each; players sitting out still hold theirs face down). */
  hands: Card[][];
}

export function contractOf(state: BiddingState): Contract {
  if (state.phase !== 'done') throw new Error(`contractOf: bidding is not finished (phase ${state.phase})`);
  return {
    trump: state.trump!,
    maker: state.maker!,
    makerTeam: teamOf(state.maker!),
    makerLoner: state.makerLoner,
    loneDefender: state.loneDefender,
    sittingOut: sittingOut(state),
    dealerPickedUp: state.dealerPicksUp,
    discard: state.discard,
    hands: state.hands.map((h) => [...h]),
  };
}

// ---------------------------------------------------------------------------
// Describing actions in table language

export function describeBidAction(action: BidAction, ctx?: { seat: Seat; state: BiddingState }): string {
  switch (action.type) {
    case 'pass':
      return 'pass';
    case 'orderUp': {
      if (ctx && ctx.seat === partnerOf(ctx.state.deal.dealer)) return '"Up and Down" (orders up, dealer dropped)';
      if (ctx && ctx.seat === ctx.state.deal.dealer) return action.alone ? 'picks it up, alone ("Drop")' : 'picks it up';
      return action.alone ? 'orders it up, alone ("Drop")' : 'orders it up';
    }
    case 'name':
      return `names ${SUIT_NAME[action.suit]}${action.alone ? ', alone ("Drop")' : ''}`;
    case 'goAlone': {
      if (!ctx) return 'goes alone ("Drop")';
      const { seat, state } = ctx;
      if (teamOf(seat) === makerTeam(state)) {
        if (state.makerLoner === partnerOf(seat)) return 'takes over the loner ("Drop")';
        if (state.loneDefender !== null) return 'answers the lone defender, goes alone ("Drop")';
        return 'drops their partner and goes alone ("Drop")';
      }
      return state.loneDefender === partnerOf(seat)
        ? 'takes over the lone defence ("Drop")'
        : 'defends alone ("Drop")';
    }
    case 'discard':
      return ctx ? 'discards one card face down' : `discards ${cardId(action.card)}`;
  }
}

/** A short line for a transcript, e.g. "West: orders it up". Call with the state *before* the action. */
export function describeBidTurn(state: BiddingState, action: BidAction): string {
  const seat = state.turn!;
  return describeBidAction(action, { seat, state });
}
