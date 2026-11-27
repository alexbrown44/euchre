// "Your first hand": one fixed deal, played step by step with a coach explaining each rule as it
// comes up. The cards were chosen so the hand shows, in order: the pack and the Benny, the trump
// order and both Bowers, passing in round one, naming "next" in round two, following suit, the
// Benny winning, trumping in, and the score. Every move goes through the engine, so the hand is
// played by exactly the house rules (app/test/firstHand.test.ts checks the whole script).

import { parseCard, type Card } from '../../../engine/src/cards.ts';
import type { Deal, Seat } from '../../../engine/src/deal.ts';
import { applyBidAction, contractOf, startBidding, type BidAction, type BiddingState } from '../../../engine/src/bidding.ts';
import { applyPlay, startPlay, type PlayState } from '../../../engine/src/play.ts';

const cards = (s: string): Card[] => s.split(' ').map(parseCard);

/** You are seat 0, West (your left) 1, Partner 2, East (your right) 3. East deals, so you speak and lead first. */
export const FIRST_DEAL: Deal = {
  dealer: 3,
  hands: [
    cards('JD AH 9H AS 10C'), // You
    cards('BENNY QH 9S JC 9C'), // West
    cards('JH QS KC 9D AD'), // Partner
    cards('10H KS 10S AC KD'), // East
  ],
  kitty: cards('10D JS KH QD QC'),
  upcard: parseCard('10D'),
};

export type Move = { seat: Seat; bid: BidAction } | { seat: Seat; card: string };

/** A picture shown with the coach's words. */
export type Show = 'pack' | 'ladder-diamonds' | 'ladder-hearts' | 'scoring';

export interface Lesson {
  /** The other players' moves, made one at a time before the coach speaks. */
  before?: Move[];
  /** What the coach says. */
  say: string;
  show?: Show;
  /** Show the trick that has just finished. */
  review?: boolean;
  /** What you're asked to do to go on (otherwise a Next button). */
  you?: { bid: BidAction; label: string; wrong: string } | { card: string; wrong: string };
}

const pass = (seat: Seat): Move => ({ seat, bid: { type: 'pass' } });
const play = (seat: Seat, card: string): Move => ({ seat, card });

export const LESSONS: Lesson[] = [
  {
    say: 'Welcome to your first hand. You\'ll play one real deal, and I\'ll explain each step as it happens. Euchre uses 25 cards: the 9, 10, Jack, Queen, King and Ace of each suit, plus one Joker, which we call the Benny.',
    show: 'pack',
  },
  {
    say: 'There are four players in two teams. Your partner sits opposite you; West and East are your opponents. You win and lose tricks as a team.',
  },
  {
    say: 'East is the dealer. Everyone gets 5 cards, and the 5 left over make the kitty. The top card of the kitty is turned face up: the 10♦. It\'s offered as the trump suit.',
  },
  {
    say: 'Trumps beat every other suit. The Benny is always the highest card. Next come two Jacks: the Jack of trumps (the Right Bower), then the other Jack of the same colour (the Left Bower), which counts as a trump. Then the Ace, King, Queen, 10 and 9. If diamonds were trumps, it would go like this:',
    show: 'ladder-diamonds',
  },
  {
    say: 'Now the calling. Starting on the dealer\'s left (that\'s you), each player either orders up the 10♦, making diamonds trumps, or passes. Your J♦ would be the Right Bower, but it would be your only trump. That\'s not enough: pass.',
    you: { bid: { type: 'pass' }, label: 'Pass', wrong: 'With just one diamond, you\'d be relying on the others for most of the tricks. Pass this time.' },
  },
  {
    before: [pass(1), pass(2), pass(3)],
    say: 'Everyone passed, so the dealer turned the 10♦ face down: diamonds can\'t be trumps now. In round two, each player may name any other suit as trumps, or pass. You speak first again.',
  },
  {
    say: 'Look at hearts. You hold the A♥ and 9♥, and with hearts as trumps your J♦ becomes the Left Bower, because it\'s the same colour. That\'s 3 trumps. Hearts is also "next" (the same colour as the turned-down card), a good call for your team. Name hearts.',
    show: 'ladder-hearts',
    you: { bid: { type: 'name', suit: 'H', alone: false }, label: 'Hearts', wrong: 'You\'d have only one or two trumps in that suit. Hearts gives you three: name hearts.' },
  },
  {
    before: [pass(1), pass(2), pass(3)],
    say: 'Hearts are trumps. Your team are the makers: you need at least 3 of the 5 tricks. West and East are the defenders, trying to stop you. Your trumps are now sorted to the left of your hand.',
    show: 'scoring',
  },
  {
    say: 'The player on the dealer\'s left leads the first trick: you. Leading a trump makes the others play their trumps too. Lead your J♦, the Left Bower; remember, it counts as a heart now.',
    you: { card: 'JD', wrong: 'That\'s allowed, but for this hand, lead the J♦.' },
  },
  {
    before: [play(1, 'BENNY'), play(2, 'JH'), play(3, '10H')],
    review: true,
    say: 'A heart was led, so everyone had to play a heart if they had one. West played the Benny, the highest card in the game, and wins the trick. Your partner had to play their J♥, the Right Bower: when you can follow suit, you must.',
  },
  {
    before: [play(1, '9S'), play(2, 'QS'), play(3, 'KS')],
    say: 'The winner of a trick leads the next one, so West led the 9♠. You must follow suit, and your only spade is the A♠. You play last, so you can see it wins.',
    you: { card: 'AS', wrong: 'That\'s allowed, but play the A♠ here.' },
  },
  {
    review: true,
    say: 'Your A♠ wins. Tricks: you 1, them 1. You won, so you lead next.',
  },
  {
    say: 'The Benny and both Bowers have been played, so your A♥ is now the highest trump left. Lead it, and the opponents must play their trumps.',
    you: { card: 'AH', wrong: 'That\'s allowed, but your A♥ is the best card in your hand right now. Lead it.' },
  },
  {
    before: [play(1, 'QH'), play(2, '9D'), play(3, '10S')],
    review: true,
    say: 'West had to play a heart. Your partner and East had none, so they could play any card, and threw away cards they didn\'t need. You win: 2 tricks to 1.',
  },
  {
    say: 'One more trick wins the hand. Keep your last trump, the 9♥, for later, and lead the 10♣.',
    you: { card: '10C', wrong: 'That\'s allowed, but if you keep the 9♥, you can use it to win a trick later. Lead the 10♣.' },
  },
  {
    before: [play(1, 'JC'), play(2, 'KC'), play(3, 'AC')],
    review: true,
    say: 'East wins with the A♣. Notice the J♣ was just an ordinary Jack: with hearts as trumps, only the red Jacks are Bowers.',
  },
  {
    before: [play(3, 'KD')],
    say: 'East leads the K♦. You have no diamonds, so you may play any card, including a trump. A trump beats every card of the other suits: trump in with your 9♥.',
    you: { card: '9H', wrong: 'Play your 9♥.' },
  },
  {
    before: [play(1, '9C'), play(2, 'AD')],
    review: true,
    say: 'Your little 9♥ beats even the A♦, because it\'s a trump. That\'s your third trick.',
  },
  {
    say: 'Your team made 3 tricks, so you score 1 point. Taking all 5 (a "march") would have scored 2. If the makers take fewer than 3, they\'re "euchred" and the other team scores 2. Players can also go alone, playing without their partner for a bigger prize; you\'ll meet that in the rules. The first team to the agreed total, often 10, wins the game.',
  },
];

/** The table after the first `step` lessons, plus `applied` of the next lesson's moves before the coach speaks. */
export interface TutorialTable {
  bidding: BiddingState;
  play: PlayState | null;
}

export function applyMove(t: TutorialTable, m: Move): TutorialTable {
  if ('bid' in m) {
    if (t.bidding.turn !== m.seat) throw new Error(`firstHand: seat ${m.seat} bid out of turn`);
    const bidding = applyBidAction(t.bidding, m.bid);
    const play = bidding.phase === 'done' ? startPlay(contractOf(bidding), bidding.deal.dealer) : null;
    return { bidding, play };
  }
  if (!t.play || t.play.turn !== m.seat) throw new Error(`firstHand: seat ${m.seat} played out of turn`);
  return { ...t, play: applyPlay(t.play, parseCard(m.card)) };
}

/** Your move in a lesson, as a Move. */
export function yourMove(l: Lesson): Move | null {
  if (!l.you) return null;
  return 'bid' in l.you ? { seat: 0, bid: l.you.bid } : { seat: 0, card: l.you.card };
}

/** Replay the script up to lesson `step`, with `applied` of its `before` moves made. */
export function tableAt(step: number, applied: number): TutorialTable {
  let t: TutorialTable = { bidding: startBidding(FIRST_DEAL), play: null };
  for (let i = 0; i <= step && i < LESSONS.length; i++) {
    const l = LESSONS[i]!;
    const moves = l.before ?? [];
    for (const m of i < step ? moves : moves.slice(0, applied)) t = applyMove(t, m);
    const mine = yourMove(l);
    if (i < step && mine) t = applyMove(t, mine);
  }
  return t;
}

