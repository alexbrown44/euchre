// The coach for the guided practice game: on your turn, what the strategy guide would do, and why.
//
// Calls come from the guide's written rules (guideChoice, the same rules the bidding quiz shows as
// "the guide's view"). Card play comes from the Medium bot, which plays by the guide's card-play
// rules; the reason is worked out from the cards on the table, in plain words.

import {
  cardId, cardLabel, effectiveSuit, isTrump, sameCard, SUIT_NAME, trickWinnerIndex, trumpRank, type Card,
} from '../../../engine/src/cards.ts';
import { newDeck } from '../../../engine/src/deck.ts';
import type { Seat } from '../../../engine/src/deal.ts';
import { partnerOf, teamOf } from '../../../engine/src/deal.ts';
import type { BidAction } from '../../../engine/src/bidding.ts';
import { legalPlays } from '../../../engine/src/play.ts';
import { bidView, playView } from '../../../engine/src/game.ts';
import { DEFAULT_PARAMS, ruleBot } from '../../../engine/src/bots/ruleBot.ts';
import type { TableState } from '../game/table.ts';
import { actionKey, describeHand, guideChoice, guideRule, type BankQuestion } from './bidding.ts';

export interface Hint {
  /** The suggested call, or the suggested card. */
  bid?: BidAction;
  card?: Card;
  /** "Pass", "Play the A♥", ... */
  what: string;
  /** Why, in a sentence or two. */
  why: string[];
}

const guideBot = ruleBot(DEFAULT_PARAMS, 'Coach');

/** What the guide would do on your turn, or null when it isn't your turn. */
export function coachHint(s: TableState, me: Seat): Hint | null {
  if (s.stage === 'bidding' && s.bidding.turn === me) return bidHint(s, me);
  if (s.stage === 'playing' && s.play?.turn === me) return cardHint(s, me);
  return null;
}

/** Key for comparing your move with the hint. */
export const hintKey = (h: Hint): string => (h.card ? cardId(h.card) : h.bid ? actionKey(h.bid) : '');

function bidWords(a: BidAction, dealer: boolean, upAndDown: boolean): string {
  switch (a.type) {
    case 'pass':
      return 'Pass';
    case 'orderUp':
      if (upAndDown) return 'Call Up and Down (you play alone)';
      return `${dealer ? 'Pick it up' : 'Order it up'}${a.alone ? ', and go alone' : ''}`;
    case 'name':
      return `Name ${SUIT_NAME[a.suit].toLowerCase()}${a.alone ? ', and go alone' : ''}`;
    case 'goAlone':
      return 'Go alone';
    case 'discard':
      return `Discard the ${cardLabel(a.card)}`;
  }
}

function bidHint(s: TableState, me: Seat): Hint {
  const b = s.bidding;
  const dealer = b.deal.dealer;
  const view = bidView(b, me, s.score, s.target);

  if (b.phase === 'round1' || b.phase === 'round2') {
    const q: BankQuestion = {
      id: 'live', level: 'beginner', dealer, seat: me, phase: b.phase,
      hand: b.hands[me]!.map(cardId), upcard: cardId(b.deal.upcard),
      history: b.history.map((e) => ({ seat: e.seat, action: e.action })),
      options: [], guide: { type: 'pass' }, samples: 0,
    };
    const choice = guideChoice(q);
    const why = [...describeHand(q), `The guide: ${guideRule(q)}`];
    if (s.score[0] >= s.target - 2 || s.score[1] >= s.target - 2) {
      why.push('Near the end of a game the score can change the best call; see "Playing to the score" in the guide.');
    }
    return { bid: choice, what: bidWords(choice, me === dealer, b.phase === 'round1' && me === partnerOf(dealer) && choice.type !== 'pass'), why };
  }

  if (b.phase === 'bennyCall') {
    const choice = guideBot.bid(view);
    return {
      bid: choice,
      what: bidWords(choice, true, false),
      why: ['The Benny was turned up, so you must name trumps before looking at your cards. With nothing to go on, any suit is as good as another.'],
    };
  }

  if (b.phase === 'discard') {
    const choice = guideBot.bid(view);
    const card = choice.type === 'discard' ? choice.card : null;
    const why: string[] = [];
    if (card && b.trump) {
      const suit = effectiveSuit(card, b.trump);
      const sameSuit = b.hands[me]!.filter((c) => effectiveSuit(c, b.trump) === suit).length;
      why.push(sameSuit === 1
        ? `It's your only ${SUIT_NAME[suit!].toLowerCase().slice(0, -1)}, so throwing it leaves you void: if that suit is led, you can trump it.`
        : 'It\'s your weakest card.');
      why.push('The guide: never throw away a trump or an off-suit Ace.');
    }
    return { bid: choice, what: bidWords(choice, true, false), why };
  }

  // After trump is made: go alone / defend alone, or not.
  const choice = guideBot.bid(view);
  if (b.deal.upcard.kind === 'benny' && b.maker === me) {
    return {
      bid: choice,
      what: choice.type === 'pass' ? 'Keep your partner' : 'Go alone',
      why: [
        choice.type === 'pass'
          ? 'Not enough to go alone. After a blind call, go alone with 4 or 5 trumps, or 3 trumps with an off-suit Ace (or the Benny and both Bowers).'
          : 'After a blind call, go alone with 4 or 5 trumps, or 3 trumps with an off-suit Ace (or the Benny and both Bowers). This hand has it.',
        'See "The Benny turned up" in the guide.',
      ],
    };
  }
  const ours = teamOf(me) === teamOf(b.maker!);
  return {
    bid: choice,
    what: choice.type === 'pass' ? 'Say no' : 'Go alone',
    why: choice.type === 'pass'
      ? [ours ? 'Going alone pays only when you can take all 5 tricks on your own. Keep your partner.' : 'Defending alone needs a hand strong enough to stop the makers without your partner. Keep your partner.']
      : ['Your hand is strong enough to play without your partner; see "After trump is made" in the guide.'],
  };
}

function cardHint(s: TableState, me: Seat): Hint {
  const p = s.play!;
  const trump = p.trump;
  const legal = legalPlays(p);
  const card = guideBot.play(playView(p, me, s.score, s.target, s.bidding.deal.upcard));
  const what = `Play the ${cardLabel(card)}`;
  const plays = p.current.plays;
  const led = plays.length ? effectiveSuit(plays[0]!.card, trump) : null;
  const makers = teamOf(me) === p.contract.makerTeam;
  const why: string[] = [];

  // Trumps you can't see: not yet played and not in your hand.
  const seen = [...p.tricks.flatMap((t) => t.plays.map((x) => x.card)), ...plays.map((x) => x.card), ...p.hands[me]!];
  const unseenTrumps = newDeck().filter((c) => isTrump(c, trump) && !seen.some((x) => sameCard(x, c)));
  const topTrumpLeft = isTrump(card, trump) && unseenTrumps.every((c) => trumpRank(c, trump) < trumpRank(card, trump));

  if (legal.length === 1) {
    why.push(led && effectiveSuit(card, trump) === led ? 'It\'s your only card in the suit led, and you must follow suit.' : 'It\'s the only card you can play.');
    return { card, what, why };
  }

  if (!led) {
    if (isTrump(card, trump)) {
      why.push(makers ? 'Your team made trumps, so lead trumps to draw out the defenders\' trumps.' : 'Leading a trump here takes out the makers\' trumps.');
      if (topTrumpLeft) why.push(`The ${cardLabel(card)} is the highest trump still out, so it can't be beaten.`);
    } else if (card.kind === 'suited' && card.rank === 'A') {
      why.push(`Cash your Ace of ${SUIT_NAME[card.suit].toLowerCase()} while it can still win, before someone runs out of that suit and trumps it.`);
    } else {
      why.push('Lead a low card in another suit and keep your winners for later.');
    }
    return { card, what, why };
  }

  const winningNow = plays[trickWinnerIndex(plays.map((x) => x.card), trump)]!.seat;
  const partnerWinning = winningNow === partnerOf(me);
  const wouldWin = trickWinnerIndex([...plays.map((x) => x.card), card], trump) === plays.length;
  const ledName = SUIT_NAME[led].toLowerCase();

  if (effectiveSuit(card, trump) === led) {
    if (wouldWin) why.push(partnerWinning ? 'Take the trick: an opponent still to play could beat your partner\'s card.' : 'You can win this trick, so take it.');
    else if (partnerWinning) why.push('Your partner is winning the trick: let it go, and keep your better cards.');
    else why.push(`You must follow suit with a ${ledName.slice(0, -1)}, and you can't win this one, so play your lowest.`);
  } else if (isTrump(card, trump)) {
    why.push(`You have no ${ledName}, so you may trump in. ${wouldWin ? 'A trump wins the trick.' : ''}`.trim());
  } else {
    why.push(partnerWinning
      ? `You have no ${ledName} and your partner is winning: throw away a card you don't need.`
      : `You have no ${ledName} and can't win this trick: throw away your least useful card.`);
  }
  return { card, what, why };
}
