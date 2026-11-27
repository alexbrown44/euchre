import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cardId, cardLabel, sameCard, SUIT_NAME, SUIT_SYMBOL, SUITS, type Card, type Suit } from '../../../engine/src/cards.ts';
import type { Seat } from '../../../engine/src/deal.ts';
import type { BidAction } from '../../../engine/src/bidding.ts';
import { applyBid, applyCard, botMove, clearTrick, nextHand, sayBid, tableView, turnOf, type TableState, type TableView } from '../game/table.ts';
import { makeBot } from '../game/bots.ts';
import { PACE, type Settings } from '../settings.ts';
import { CardView } from './CardView.tsx';
import { coachHint, hintKey, type Hint } from '../learn/coach.ts';
import { actionKey } from '../learn/bidding.ts';
import { SuitText } from '../learn/SuitText.tsx';

const ME: Seat = 0;

interface Props {
  initial: TableState;
  settings: Settings;
  onSave: (s: TableState) => void;
  onHome: () => void;
  onNewGame: () => void;
  /** Guided practice: show the coach's hint on your turn. */
  coach?: boolean;
  /** Guided practice: go to another page from the end of the game. */
  onGo?: (route: string) => void;
}

/** In guided practice: how often your move matched the guide's, and where it didn't. */
interface Tally {
  calls: number;
  callsMatched: number;
  cards: number;
  cardsMatched: number;
  /** "Hand 3: you said “Order it up”; the guide would pass." */
  differed: string[];
}
const NO_TALLY: Tally = { calls: 0, callsMatched: 0, cards: 0, cardsMatched: 0, differed: [] };
const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/** Where each seat sits on screen, seen from seat 0 at the bottom. Seats go clockwise. */
const POS = ['bottom', 'left', 'top', 'right'] as const;

export function Game({ initial, settings, onSave, onHome, onNewGame, coach, onGo }: Props) {
  const [s, setS] = useState<TableState>(initial);
  const [showLog, setShowLog] = useState(false);
  const [showLast, setShowLast] = useState(false);
  const bots = useMemo(() => [0, 1, 2, 3].map((i) => makeBot(settings.difficulty, initial.seed * 10 + i)), [settings.difficulty, initial.seed]);
  const pace = PACE[settings.speed];
  const v = tableView(s, ME);
  const hint = useMemo(() => (coach ? coachHint(s, ME) : null), [coach, s]);
  const [hintsOn, setHintsOn] = useState(true);
  /** The card the coach suggests: to play, or to discard after picking up. */
  const suggestCard = hint?.card ?? (hint?.bid?.type === 'discard' ? hint.bid.card : null);
  /** After your move: what the guide would have done instead, if different. */
  const [note, setNote] = useState<string | null>(null);
  const [tally, setTally] = useState<Tally>(NO_TALLY);
  /** Compare your move with the hint: `you` says what you did, for the list at the end. */
  const compare = (key: string, you: string) => {
    if (!hint) return;
    // A blind shout after the Benny is turned up has no right answer, so it isn't marked or counted.
    if (s.stage === 'bidding' && s.bidding.phase === 'bennyCall') return setNote(null);
    const same = key === hintKey(hint);
    setNote(same ? null : `The guide would have said: ${hint.what}.`);
    const card = !!hint.card;
    setTally((t) => ({
      calls: t.calls + (card ? 0 : 1),
      callsMatched: t.callsMatched + (!card && same ? 1 : 0),
      cards: t.cards + (card ? 1 : 0),
      cardsMatched: t.cardsMatched + (card && same ? 1 : 0),
      differed: same ? t.differed : [...t.differed, `Hand ${s.handNumber}: you ${you}; the guide would ${lowerFirst(hint.what)}.`],
    }));
  };

  useEffect(() => onSave(s), [s, onSave]);

  // When your hand changes order (it's re-sorted once trumps are made), slide each card from
  // where it was to its new place, so you can see where everything went.
  const handRef = useRef<HTMLDivElement>(null);
  const lastPos = useRef(new Map<string, number>());
  const handOrder = v.hand.map(cardId).join(',');
  useLayoutEffect(() => {
    const el = handRef.current;
    if (!el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const now = new Map<string, number>();
    el.querySelectorAll<HTMLElement>('[data-card]').forEach((card) => {
      const id = card.dataset.card!;
      const x = card.offsetLeft; // layout position, unaffected by a slide already running
      now.set(id, x);
      const was = lastPos.current.get(id);
      if (!reduce && was !== undefined && Math.abs(was - x) > 1) {
        card.animate([{ transform: `translateX(${was - x}px)` }, { transform: 'translateX(0)' }], { duration: 700, easing: 'ease-in-out' });
      }
    });
    lastPos.current = now;
  }, [handOrder]);

  // Bots move, and finished tricks clear, after a short pause.
  useEffect(() => {
    if (s.stage === 'trickEnd') {
      const t = setTimeout(() => setS(clearTrick(s)), pace.trick);
      return () => clearTimeout(t);
    }
    const turn = turnOf(s);
    if (turn !== null && turn !== ME) {
      const t = setTimeout(() => setS(botMove(s, bots[turn]!)), pace.bot);
      return () => clearTimeout(t);
    }
  }, [s, bots, pace]);

  const bid = (a: BidAction) => {
    compare(actionKey(a), a.type === 'discard' ? `discarded the ${cardLabel(a.card)}` : `said “${sayBid(s.bidding, ME, a)}”`);
    setS(applyBid(s, a));
  };
  const isLegal = (c: Card) => v.legalCards.some((x) => sameCard(x, c));
  const discarding = v.bidPhase === 'discard' && v.turn === ME;

  const onCard = (c: Card) => {
    if (discarding) bid({ type: 'discard', card: c });
    else if (isLegal(c)) {
      compare(cardId(c), `played the ${cardLabel(c)}`);
      setS(applyCard(s, c));
    }
  };

  return (
    <div className="game">
      <TopBar v={v} onHome={onHome} onLog={() => setShowLog(true)} onLast={() => setShowLast(true)} />

      <div className="felt">
        {[1, 2, 3].map((seat) => (
          <SeatPanel key={seat} v={v} seat={seat as Seat} />
        ))}
        <Centre v={v} onTap={() => s.stage === 'trickEnd' && setS(clearTrick(s))} />
      </div>

      <div className={`me-row ${v.dealer === ME ? 'seat-dealer' : ''}`}>
        <SeatBadges v={v} seat={ME} />
        <Status v={v} discarding={discarding} />
      </div>

      {coach && (hint || note) && <CoachStrip hint={hint} note={note} on={hintsOn} onToggle={() => setHintsOn((x) => !x)} />}

      <div ref={handRef} className={`hand ${v.hand.length > 5 ? 'hand-six' : ''}`}>
        {v.handHidden
          ? [0, 1, 2, 3, 4].map((i) => <CardView key={i} faceDown size="hand" />)
          : v.hand.map((c) => {
              const playable = discarding || isLegal(c);
              const waiting = v.stage === 'playing' && v.turn === ME;
              return (
                <CardView
                  key={cardId(c)}
                  card={c}
                  size="hand"
                  playable={playable}
                  dimmed={waiting && !playable}
                  highlight={hintsOn && !!suggestCard && cardId(suggestCard) === cardId(c)}
                  onClick={() => onCard(c)}
                />
              );
            })}
      </div>

      <BidControls v={v} onBid={bid} suggest={hintsOn && hint?.bid ? actionKey(hint.bid) : null} />

      {v.stage === 'handEnd' && v.summary && <HandEnd v={v} onNext={() => setS(nextHand(s))} />}
      {v.stage === 'gameOver' &&
        (coach && onGo ? (
          <PracticeOver v={v} tally={tally} onAgain={onNewGame} onLearn={onHome} onGo={onGo} />
        ) : (
          <GameOver v={v} onAgain={onNewGame} onHome={onHome} />
        ))}
      {showLog && <LogSheet v={v} onClose={() => setShowLog(false)} />}
      {showLast && <LastTrick v={v} onClose={() => setShowLast(false)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------

const seatName = (v: TableView, seat: Seat | null) => (seat === null ? '' : v.seats[seat]!.name);

function TopBar({ v, onHome, onLog, onLast }: { v: TableView; onHome: () => void; onLog: () => void; onLast: () => void }) {
  return (
    <header className="topbar">
      <button type="button" className="btn btn-ghost" onClick={onHome} aria-label="Menu">
        ☰
      </button>
      <div className="scores" aria-label="Score">
        <div className="score us">
          <span className="score-label">Us</span>
          <span className="score-num">{v.score[0]}</span>
        </div>
        <div className="score-target">to {v.target}</div>
        <div className="score them">
          <span className="score-label">Them</span>
          <span className="score-num">{v.score[1]}</span>
        </div>
        <TrumpBox v={v} onLog={onLog} />
      </div>
      <div className="topbar-actions">
        <button type="button" className="btn btn-ghost" onClick={onLast} disabled={!v.lastTrick}>
          Last trick
        </button>
        <button type="button" className="btn btn-ghost" onClick={onLog}>
          Calls
        </button>
      </div>
    </header>
  );
}

function SeatBadges({ v, seat }: { v: TableView; seat: Seat }) {
  const info = v.seats[seat]!;
  return (
    <span className="badges">
      {info.isDealer && <span className="chip chip-dealer">Dealer</span>}
      {info.isMaker && <span className="chip chip-maker">{v.upcard.kind === 'benny' ? 'Blind shout' : 'Called'}</span>}
      {info.alone && <span className="chip chip-alone">Alone</span>}
      {info.sittingOut && <span className="chip chip-out">Sitting out</span>}
    </span>
  );
}

function SeatPanel({ v, seat }: { v: TableView; seat: Seat }) {
  const info = v.seats[seat]!;
  const active = v.turn === seat;
  return (
    <div className={`seat seat-${POS[seat]} ${active ? 'seat-active' : ''} ${info.sittingOut ? 'seat-out' : ''} ${info.isDealer ? 'seat-dealer' : ''}`}>
      <div className="seat-name">
        {info.name}
        <SeatBadges v={v} seat={seat} />
      </div>
      <div className="seat-cards" aria-label={`${info.cards} cards`}>
        {Array.from({ length: info.cards }, (_, i) => (
          <CardView key={i} faceDown size="small" />
        ))}
      </div>
      {info.said && v.stage === 'bidding' && <div className="bubble">{info.said}</div>}
    </div>
  );
}

/** The trump suit, in the top bar beside the score, so it never looks attached to a seat. Tap for the calls. */
function TrumpBox({ v, onLog }: { v: TableView; onLog: () => void }) {
  const label = v.trump
    ? `${SUIT_NAME[v.trump]} are trumps, ${v.upcard.kind === 'benny' ? 'blind shout by' : 'called by'} ${seatName(v, v.maker)}. Show the calls.`
    : 'Trumps not made yet. Show the calls.';
  return (
    <button type="button" className={`score trump-box ${v.trump ? '' : 'trump-box-empty'}`} onClick={onLog} aria-label={label}>
      <span className="score-label">Trumps</span>
      <span className={`trump-box-sym ${v.trump ? `suit-${v.trump}` : ''}`}>{v.trump ? SUIT_SYMBOL[v.trump] : '–'}</span>
    </button>
  );
}

function Centre({ v, onTap }: { v: TableView; onTap: () => void }) {
  const playing = v.stage === 'playing' || v.stage === 'trickEnd';
  const over = v.stage === 'handEnd' || v.stage === 'gameOver';
  return (
    <div className="centre" onClick={onTap}>
      {over ? null : playing ? (
        <div className="trick">
          {v.trick.map((p) => (
            <div key={p.seat} className={`trick-card at-${POS[p.seat]} ${v.trickWinner === p.seat ? 'trick-winner' : ''}`}>
              <CardView card={p.card} size="table" />
            </div>
          ))}
          {v.stage === 'playing' && v.trick.length === 0 && v.turn !== null && <div className="trick-hint">{v.turn === ME ? 'Your lead' : `${seatName(v, v.turn)} to lead`}</div>}
          {v.trickWinner !== null && <div className="trick-hint trick-won">{v.trickWinner === ME ? 'You win the trick' : `${seatName(v, v.trickWinner)} wins the trick`}</div>}
          <div className="tricks-count">
            Tricks: Us {v.tricksWon[0]} · Them {v.tricksWon[1]}
          </div>
        </div>
      ) : (
        <div className="kitty">
          {v.upcardState === 'up' && <CardView card={v.upcard} size="table" />}
          {v.upcardState === 'turnedDown' && (
            <div className="turned-down">
              <CardView card={v.upcard} size="table" dimmed />
              <span>turned down</span>
            </div>
          )}
          {v.upcardState === 'pickedUp' && <div className="kitty-note">{seatName(v, v.dealer)} picked it up</div>}
        </div>
      )}
    </div>
  );
}

function Status({ v, discarding }: { v: TableView; discarding: boolean }) {
  let text = '';
  if (discarding) text = 'Tap a card to discard it face down.';
  else if (v.stage === 'bidding') {
    if (v.turn === ME) {
      if (v.bidPhase === 'bennyCall') text = 'The Benny is turned up: name trumps without looking at your cards.';
      else if (v.bidPhase === 'round1') text = `Round one: ${v.upcard.kind === 'suited' ? SUIT_NAME[v.upcard.suit] : ''} turned up.`;
      else if (v.bidPhase === 'round2') text = 'Round two: name a suit, or pass.';
      else if (v.bidPhase === 'afterCall') text = v.upcard.kind === 'benny' ? 'You have seen your cards. Go alone?' : 'Trump is made. Go alone?';
    } else if (v.turn !== null) text = `${seatName(v, v.turn)} is deciding…`;
  } else if (v.stage === 'playing') {
    if (v.seats[ME]!.sittingOut) text = 'You are sitting out this hand.';
    else text = v.turn === ME ? 'Your turn: tap a card to play it.' : `${seatName(v, v.turn)} is playing…`;
  }
  return <div className="status">{text}</div>;
}

function BidControls({ v, onBid, suggest }: { v: TableView; onBid: (a: BidAction) => void; suggest: string | null }) {
  const mark = (a: BidAction | undefined) => (a && suggest === actionKey(a) ? ' tut-suggest-btn' : '');
  const [alone, setAlone] = useState(false);
  useEffect(() => setAlone(false), [v.bidPhase, v.handNumber]);
  if (v.stage !== 'bidding' || v.turn !== ME || v.bidPhase === 'discard') return <div className="controls" />;

  const has = (pred: (a: BidAction) => boolean) => v.legalBids.find(pred);
  const pass = has((a) => a.type === 'pass');

  if (v.bidPhase === 'round1') {
    const up = has((a) => a.type === 'orderUp' && !a.alone);
    const upAlone = has((a) => a.type === 'orderUp' && a.alone);
    const isDealer = v.dealer === ME;
    const upAndDown = !up && !!upAlone; // the dealer's partner: ordering up is always alone
    return (
      <div className="controls">
        {pass && <button type="button" className={`btn${mark(pass)}`} onClick={() => onBid(pass)}>Pass</button>}
        {up && <button type="button" className={`btn btn-primary${mark(up)}`} onClick={() => onBid(up)}>{isDealer ? 'Pick it up' : 'Order it up'}</button>}
        {upAlone && (
          <button type="button" className={`btn btn-alone${mark(upAlone)}`} onClick={() => onBid(upAlone)}>
            {upAndDown ? 'Up and Down (alone)' : isDealer ? 'Pick up, alone' : 'Order up, alone'}
          </button>
        )}
      </div>
    );
  }

  if (v.bidPhase === 'round2' || v.bidPhase === 'bennyCall') {
    const suits = SUITS.filter((x) => v.bidPhase === 'bennyCall' || x !== v.bannedSuit);
    return (
      <div className="controls controls-suits">
        <div className="suit-buttons">
          {suits.map((suit: Suit) => (
            <button key={suit} type="button" className={`btn suit-btn suit-${suit} ${alone ? 'suit-btn-alone' : ''}${suggest?.startsWith(`name-${suit}`) ? ' tut-suggest-btn' : ''}`} onClick={() => onBid({ type: 'name', suit, alone })} aria-label={`Name ${SUIT_NAME[suit]}${alone ? ', alone' : ''}`}>
              <span className="suit-btn-sym">{SUIT_SYMBOL[suit]}</span>
              <span className="suit-btn-name">{SUIT_NAME[suit]}{alone ? ', alone' : ''}</span>
            </button>
          ))}
        </div>
        {v.bidPhase === 'bennyCall' ? (
          <div className="controls-hint">You can decide whether to go alone once you&apos;ve picked up your cards.</div>
        ) : (
          <>
            <div className="controls-hint">{alone ? 'Now tap a suit to call it and go alone.' : 'To go alone, tick "Go alone" first, then tap a suit.'}</div>
            <div className="controls-row">
              <label className="check">
                <input type="checkbox" checked={alone} onChange={(e) => setAlone(e.target.checked)} />
                Go alone
              </label>
              {pass && <button type="button" className={`btn${mark(pass)}`} onClick={() => onBid(pass)}>Pass</button>}
            </div>
          </>
        )}
      </div>
    );
  }

  if (v.bidPhase === 'afterCall') {
    const go = has((a) => a.type === 'goAlone');
    return (
      <div className="controls">
        {pass && <button type="button" className={`btn${mark(pass)}`} onClick={() => onBid(pass)}>{go ? 'No' : 'OK'}</button>}
        {go && <button type="button" className={`btn btn-alone${mark(go)}`} onClick={() => onBid(go)}>{v.goAloneLabel}</button>}
      </div>
    );
  }
  return <div className="controls" />;
}

function CoachStrip({ hint, note, on, onToggle }: { hint: Hint | null; note: string | null; on: boolean; onToggle: () => void }) {
  return (
    <section className="coach coach-live" aria-live="polite">
      <img className="coach-logo" src="/logo.svg" alt="" width={30} height={30} />
      <div className="coach-body">
        {note && (
          <p className="coach-note">
            <SuitText text={note} />
          </p>
        )}
        {hint && on && (
          <>
            <p>
              <strong>
                <SuitText text={`${hint.what}.`} />
              </strong>{' '}
              <SuitText text={hint.why[0] ?? ''} />
            </p>
            {hint.why.length > 1 && (
              <details className="coach-more">
                <summary>Why?</summary>
                {hint.why.slice(1).map((w) => (
                  <p key={w}>
                    <SuitText text={w} />
                  </p>
                ))}
              </details>
            )}
          </>
        )}
        {hint && (
          <button type="button" className="coach-toggle" onClick={onToggle}>
            {on ? 'Hide hints' : 'Show the hint'}
          </button>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Overlays

function Sheet({ title, children, onClose }: { title: string; children: ReactNode; onClose?: () => void }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
        {onClose && (
          <button type="button" className="btn sheet-close" onClick={onClose}>
            Close
          </button>
        )}
      </div>
    </div>
  );
}

const OUTCOME_HEADLINE = {
  made: 'Made it',
  march: 'March!',
  lonerMade: 'Loner made it',
  lonerMarch: 'Loner march!',
  euchre: 'Euchred!',
  loneDefenderEuchre: 'Euchred by a lone defender!',
} as const;

function HandEnd({ v, onNext }: { v: TableView; onNext: () => void }) {
  const sum = v.summary!;
  let title = 'Thrown in';
  let lines: string[] = ['Everyone passed twice. No score this hand, and the deal passes left.'];
  if (!sum.thrownIn && sum.contract && sum.result) {
    const c = sum.contract;
    const r = sum.result;
    title = OUTCOME_HEADLINE[r.outcome];
    const caller = seatName(v, c.maker);
    lines = [
      `${v.upcard.kind === 'benny' ? 'The Benny was turned up, so ' : ''}${caller} called ${SUIT_NAME[c.trump]} ${SUIT_SYMBOL[c.trump]}${v.upcard.kind === 'benny' ? ' blind' : ''}${c.makerLoner !== null ? ' and went alone' : ''}.`,
      ...(c.loneDefender !== null ? [`${seatName(v, c.loneDefender)} defended alone.`] : []),
      `The makers took ${sum.makerTricks} of 5 tricks.`,
      `${r.team === 0 ? 'Your team scores' : 'Their team scores'} ${r.points} point${r.points === 1 ? '' : 's'}.`,
    ];
  }
  const good = sum.result ? sum.result.team === 0 : null;
  return (
    <Sheet title={title}>
      <div className={`result ${good === true ? 'result-good' : good === false ? 'result-bad' : ''}`}>
        {lines.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>
      <p className="score-line">
        Score: Us <strong>{sum.scoreAfter[0]}</strong> · Them <strong>{sum.scoreAfter[1]}</strong> (to {v.target})
      </p>
      <button type="button" className="btn btn-primary" onClick={onNext} autoFocus>
        {v.winner !== null ? 'See the result' : 'Next hand'}
      </button>
    </Sheet>
  );
}

function GameOver({ v, onAgain, onHome }: { v: TableView; onAgain: () => void; onHome: () => void }) {
  const won = v.winner === 0;
  return (
    <Sheet title={won ? 'You win!' : 'They win'}>
      <p className="final-score">
        Us <strong>{v.score[0]}</strong> · Them <strong>{v.score[1]}</strong>
      </p>
      <p>{won ? 'You and your partner reached ' : 'The other team reached '}{v.target} first.</p>
      <div className="sheet-buttons">
        <button type="button" className="btn btn-primary" onClick={onAgain} autoFocus>
          Play again
        </button>
        <button type="button" className="btn" onClick={onHome}>
          Change settings
        </button>
      </div>
    </Sheet>
  );
}

const PRACTICE_NEXT = [
  { title: 'Play against the bots', blurb: 'A full game from the front page: pick Easy, Medium or Hard, and the length.', route: '' },
  { title: 'Would you call?', blurb: 'Real hands: order it up, name a suit, or pass?', route: 'quiz/bidding-beginner' },
  { title: 'The strategy guide', blurb: 'The rules of thumb behind every hint, with the evidence.', route: 'guide' },
];

/** The end of a guided practice game: how you played next to the guide, and where to go next. */
function PracticeOver({ v, tally, onAgain, onLearn, onGo }: { v: TableView; tally: Tally; onAgain: () => void; onLearn: () => void; onGo: (route: string) => void }) {
  const won = v.winner === 0;
  const total = tally.calls + tally.cards;
  const matched = tally.callsMatched + tally.cardsMatched;
  const share = total ? matched / total : 0;
  const verdict =
    share >= 0.85 ? "You're playing the way the guide does. Try a full game against Medium bots next."
    : share >= 0.6 ? 'A good game. Have a look at the moves where you went another way.'
    : 'Have a look at the moves where you went another way: each hint explains the rule behind it.';
  return (
    <Sheet title={won ? 'You win!' : 'They win'}>
      <p className="final-score">
        Us <strong>{v.score[0]}</strong> · Them <strong>{v.score[1]}</strong>
      </p>
      <p>{won ? 'You and your partner reached ' : 'The other team reached '}{v.target} first.</p>
      {total > 0 && (
        <div className="practice-tally">
          <p className="practice-tally-big">
            You made the guide&apos;s move <strong>{matched}</strong> times out of <strong>{total}</strong>
          </p>
          <p className="practice-tally-split">
            Calls {tally.callsMatched} of {tally.calls} · Cards {tally.cardsMatched} of {tally.cards}
          </p>
          <p>{verdict}</p>
          {tally.differed.length > 0 && (
            <details className="practice-differed">
              <summary>Where you went another way ({tally.differed.length})</summary>
              <ul>
                {tally.differed.map((d, i) => (
                  <li key={i}>
                    <SuitText text={d} />
                  </li>
                ))}
              </ul>
              <p className="practice-differed-note">Going another way isn&apos;t always wrong: some calls are close, and the guide plays the odds.</p>
            </details>
          )}
        </div>
      )}
      <p className="coach-end-title">Where next?</p>
      <div className="next-list next-list-one">
        <button type="button" className="next-item next-item-main" onClick={onAgain} autoFocus>
          <span className="next-item-title">Play another practice game</span>
          <span className="next-item-blurb">New cards, the same Easy bots, and the coach&apos;s hint on every turn.</span>
        </button>
        {PRACTICE_NEXT.map((n) => (
          <button key={n.title} type="button" className="next-item" onClick={() => onGo(n.route)}>
            <span className="next-item-title">{n.title}</span>
            <span className="next-item-blurb">{n.blurb}</span>
          </button>
        ))}
      </div>
      <div className="next-links">
        <button type="button" className="btn-link" onClick={onLearn}>
          Back to Learn &amp; improve
        </button>
      </div>
    </Sheet>
  );
}

function LogSheet({ v, onClose }: { v: TableView; onClose: () => void }) {
  return (
    <Sheet title={`Calls this hand (hand ${v.handNumber})`} onClose={onClose}>
      <p className="hint">
        Dealer: {seatName(v, v.dealer)}. Turned up: {v.upcard.kind === 'benny' ? 'the Benny' : `${v.upcard.rank}${SUIT_SYMBOL[v.upcard.suit]}`}.
        {v.myDiscard && ` You discarded ${v.myDiscard.kind === 'benny' ? 'the Benny' : `${v.myDiscard.rank}${SUIT_SYMBOL[v.myDiscard.suit]}`}.`}
      </p>
      {v.log.length === 0 ? <p>No calls yet.</p> : (
        <ol className="log">
          {v.log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ol>
      )}
    </Sheet>
  );
}

function LastTrick({ v, onClose }: { v: TableView; onClose: () => void }) {
  const t = v.lastTrick;
  return (
    <Sheet title="Last trick" onClose={onClose}>
      {t ? (
        <>
          <div className="last-trick">
            {t.plays.map((p) => (
              <div key={p.seat} className={`last-play ${t.winner === p.seat ? 'trick-winner' : ''}`}>
                <CardView card={p.card} size="table" />
                <span>{seatName(v, p.seat)}</span>
              </div>
            ))}
          </div>
          <p>{t.winner === ME ? 'You won it.' : `${seatName(v, t.winner)} won it.`}</p>
        </>
      ) : (
        <p>No tricks played yet this hand.</p>
      )}
    </Sheet>
  );
}
