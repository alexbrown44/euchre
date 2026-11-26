import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { sameCard, SUIT_NAME, SUIT_SYMBOL, SUITS, type Card, type Suit } from '../../../engine/src/cards.ts';
import type { Seat } from '../../../engine/src/deal.ts';
import type { BidAction } from '../../../engine/src/bidding.ts';
import { applyBid, applyCard, botMove, clearTrick, nextHand, tableView, turnOf, type TableState, type TableView } from '../game/table.ts';
import { makeBot } from '../game/bots.ts';
import { PACE, type Settings } from '../settings.ts';
import { CardView } from './CardView.tsx';

const ME: Seat = 0;

interface Props {
  initial: TableState;
  settings: Settings;
  onSave: (s: TableState) => void;
  onHome: () => void;
  onNewGame: () => void;
}

/** Where each seat sits on screen, seen from seat 0 at the bottom. Seats go clockwise. */
const POS = ['bottom', 'left', 'top', 'right'] as const;

export function Game({ initial, settings, onSave, onHome, onNewGame }: Props) {
  const [s, setS] = useState<TableState>(initial);
  const [showLog, setShowLog] = useState(false);
  const [showLast, setShowLast] = useState(false);
  const bots = useMemo(() => [0, 1, 2, 3].map((i) => makeBot(settings.difficulty, initial.seed * 10 + i)), [settings.difficulty, initial.seed]);
  const pace = PACE[settings.speed];
  const v = tableView(s, ME);

  useEffect(() => onSave(s), [s, onSave]);

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

  const bid = (a: BidAction) => setS(applyBid(s, a));
  const isLegal = (c: Card) => v.legalCards.some((x) => sameCard(x, c));
  const discarding = v.bidPhase === 'discard' && v.turn === ME;

  const onCard = (c: Card) => {
    if (discarding) bid({ type: 'discard', card: c });
    else if (isLegal(c)) setS(applyCard(s, c));
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

      <div className="me-row">
        <SeatBadges v={v} seat={ME} />
        <Status v={v} discarding={discarding} />
      </div>

      <div className={`hand ${v.hand.length > 5 ? 'hand-six' : ''}`}>
        {v.handHidden
          ? [0, 1, 2, 3, 4].map((i) => <CardView key={i} faceDown size="hand" />)
          : v.hand.map((c) => {
              const playable = discarding || isLegal(c);
              const waiting = v.stage === 'playing' && v.turn === ME;
              return (
                <CardView
                  key={c.kind === 'benny' ? 'B' : c.rank + c.suit}
                  card={c}
                  size="hand"
                  playable={playable}
                  dimmed={waiting && !playable}
                  onClick={() => onCard(c)}
                />
              );
            })}
      </div>

      <BidControls v={v} onBid={bid} />

      {v.stage === 'handEnd' && v.summary && <HandEnd v={v} onNext={() => setS(nextHand(s))} />}
      {v.stage === 'gameOver' && <GameOver v={v} onAgain={onNewGame} onHome={onHome} />}
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
      {info.isDealer && <span className="chip chip-dealer" title="Dealer">D</span>}
      {info.isMaker && <span className="chip chip-maker">Called</span>}
      {info.alone && <span className="chip chip-alone">Alone</span>}
      {info.sittingOut && <span className="chip chip-out">Sitting out</span>}
    </span>
  );
}

function SeatPanel({ v, seat }: { v: TableView; seat: Seat }) {
  const info = v.seats[seat]!;
  const active = v.turn === seat;
  return (
    <div className={`seat seat-${POS[seat]} ${active ? 'seat-active' : ''} ${info.sittingOut ? 'seat-out' : ''}`}>
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

function TrumpBadge({ v }: { v: TableView }) {
  if (!v.trump) return null;
  const who = seatName(v, v.maker);
  const extra = v.makerLoner !== null ? ', alone' : '';
  const def = v.loneDefender !== null ? ` · ${seatName(v, v.loneDefender)} defends alone` : '';
  return (
    <div className="trump-badge">
      <span className={`trump-suit suit-${v.trump}`}>{SUIT_SYMBOL[v.trump]}</span>
      <span>
        <strong>{SUIT_NAME[v.trump]}</strong> are trumps
        <br />
        <small>
          called by {who}
          {extra}
          {def}
        </small>
      </span>
    </div>
  );
}

function Centre({ v, onTap }: { v: TableView; onTap: () => void }) {
  const playing = v.stage === 'playing' || v.stage === 'trickEnd';
  const over = v.stage === 'handEnd' || v.stage === 'gameOver';
  return (
    <div className="centre" onClick={onTap}>
      <TrumpBadge v={v} />
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
      else if (v.bidPhase === 'afterCall') text = 'Trump is made. Go alone?';
    } else if (v.turn !== null) text = `${seatName(v, v.turn)} is deciding…`;
  } else if (v.stage === 'playing') {
    if (v.seats[ME]!.sittingOut) text = 'You are sitting out this hand.';
    else text = v.turn === ME ? 'Your turn: tap a card to play it.' : `${seatName(v, v.turn)} is playing…`;
  }
  return <div className="status">{text}</div>;
}

function BidControls({ v, onBid }: { v: TableView; onBid: (a: BidAction) => void }) {
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
        {pass && <button type="button" className="btn" onClick={() => onBid(pass)}>Pass</button>}
        {up && <button type="button" className="btn btn-primary" onClick={() => onBid(up)}>{isDealer ? 'Pick it up' : 'Order it up'}</button>}
        {upAlone && (
          <button type="button" className="btn btn-alone" onClick={() => onBid(upAlone)}>
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
            <button key={suit} type="button" className={`btn suit-btn suit-${suit}`} onClick={() => onBid({ type: 'name', suit, alone })} aria-label={`Name ${SUIT_NAME[suit]}${alone ? ', alone' : ''}`}>
              <span className="suit-btn-sym">{SUIT_SYMBOL[suit]}</span>
              <span className="suit-btn-name">{SUIT_NAME[suit]}</span>
            </button>
          ))}
        </div>
        <div className="controls-row">
          <label className="check">
            <input type="checkbox" checked={alone} onChange={(e) => setAlone(e.target.checked)} />
            Go alone
          </label>
          {pass && <button type="button" className="btn" onClick={() => onBid(pass)}>Pass</button>}
        </div>
      </div>
    );
  }

  if (v.bidPhase === 'afterCall') {
    const go = has((a) => a.type === 'goAlone');
    return (
      <div className="controls">
        {pass && <button type="button" className="btn" onClick={() => onBid(pass)}>{go ? 'No' : 'OK'}</button>}
        {go && <button type="button" className="btn btn-alone" onClick={() => onBid(go)}>{v.goAloneLabel}</button>}
      </div>
    );
  }
  return <div className="controls" />;
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
      `${caller} called ${SUIT_NAME[c.trump]} ${SUIT_SYMBOL[c.trump]}${c.makerLoner !== null ? ' and went alone' : ''}.`,
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
