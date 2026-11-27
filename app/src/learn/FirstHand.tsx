// "Your first hand": a guided deal. The coach explains each step; you make your own calls and
// play your own cards, and the coach steers you if you try something else.
import { useEffect, useMemo, useState } from 'react';
import { cardId, sortHand, SUIT_NAME, SUIT_SYMBOL, type Card, type Suit } from '../../../engine/src/cards.ts';
import type { Seat } from '../../../engine/src/deal.ts';
import type { BidAction } from '../../../engine/src/bidding.ts';
import { isLegalPlay, ledSuit } from '../../../engine/src/play.ts';
import { CardView } from '../ui/CardView.tsx';
import { actionKey } from './bidding.ts';
import { FIRST_DEAL, LESSONS, tableAt, type Show } from './firstHand.ts';
import { markDone } from './progress.ts';
import { SuitText } from './SuitText.tsx';

const NAMES = ['You', 'West', 'Partner', 'East'] as const;
const POS = ['bottom', 'left', 'top', 'right'] as const;
const ONE: Record<Suit, string> = { S: 'spade', H: 'heart', D: 'diamond', C: 'club' };
/** How long each other player takes, so you can follow the moves. */
const MOVE_MS = 850;

export function FirstHand({ onBack, onGo }: { onBack: () => void; onGo: (route: string) => void }) {
  const [step, setStep] = useState(0);
  const [applied, setApplied] = useState(0);
  const [wrong, setWrong] = useState<string | null>(null);
  const lesson = LESSONS[step]!;
  const before = lesson.before ?? [];
  const t = useMemo(() => tableAt(step, applied), [step, applied]);
  const busy = applied < before.length;
  const last = step === LESSONS.length - 1;
  const dealt = step >= 2;

  // The other players move one at a time, then the coach speaks.
  useEffect(() => {
    if (!busy) return;
    const id = setTimeout(() => setApplied((a) => a + 1), applied === 0 ? 450 : MOVE_MS);
    return () => clearTimeout(id);
  }, [busy, applied]);

  useEffect(() => {
    if (last) markDone('first-hand');
  }, [last]);

  const next = () => {
    if (last) return;
    setStep((s) => s + 1);
    setApplied(0);
    setWrong(null);
  };
  const restart = () => {
    setStep(0);
    setApplied(0);
    setWrong(null);
  };

  const you = busy ? undefined : lesson.you;
  const wantBid = you && 'bid' in you ? you : null;
  const wantCard = you && 'card' in you ? you : null;

  const onBid = (a: BidAction) => {
    if (!wantBid) return;
    if (actionKey(a) === actionKey(wantBid.bid)) next();
    else setWrong(wantBid.wrong);
  };
  const onCard = (c: Card) => {
    if (!wantCard || !t.play) return;
    if (cardId(c) === wantCard.card) return next();
    if (!isLegalPlay(t.play, c)) {
      const led = ledSuit(t.play)!;
      setWrong(`You have a ${ONE[led]}, so you must play one. That's the golden rule: follow suit whenever you can.`);
    } else setWrong(wantCard.wrong);
  };

  const trump = t.bidding.trump;
  const hand = sortHand(t.play ? t.play.hands[0]! : t.bidding.hands[0]!, trump);
  const cardsHeld = (seat: Seat) => (t.play ? t.play.hands[seat]!.length : t.bidding.hands[seat]!.length);
  const trick = t.play
    ? t.play.current.plays.length > 0
      ? { plays: t.play.current.plays, winner: null as Seat | null }
      : lesson.review && t.play.tricks.length > 0
        ? t.play.tricks[t.play.tricks.length - 1]!
        : null
    : null;

  // What each player last said, shown until the cards are played.
  const said = (seat: Seat): string | null => {
    if (t.play && (t.play.tricks.length > 0 || t.play.current.plays.length > 0)) return null;
    const ev = [...t.bidding.history].reverse().find((e) => e.seat === seat);
    if (!ev) return null;
    const a = ev.action;
    if (a.type === 'pass') return 'Pass';
    if (a.type === 'name') return SUIT_NAME[a.suit];
    if (a.type === 'orderUp') return 'Order it up';
    return null;
  };

  return (
    <div className="game tut">
      <header className="topbar">
        <button type="button" className="btn btn-ghost" onClick={onBack} aria-label="Back">
          ←
        </button>
        <div className="tut-title">
          <span>Your first hand</span>
          <span className="tut-progress">
            Step {step + 1} of {LESSONS.length}
          </span>
        </div>
        <div className={`score trump-box ${trump ? '' : 'trump-box-empty'}`} aria-label={trump ? `${SUIT_NAME[trump]} are trumps` : 'No trumps yet'}>
          <span className="score-label">Trumps</span>
          <span className={`trump-box-sym ${trump ? `suit-${trump}` : ''}`}>{trump ? SUIT_SYMBOL[trump] : '–'}</span>
        </div>
      </header>

      <div className="felt">
        {([1, 2, 3] as Seat[]).map((seat) => (
          <div key={seat} className={`seat seat-${POS[seat]} ${seat === FIRST_DEAL.dealer ? 'seat-dealer' : ''} ${(t.play ? t.play.turn : t.bidding.turn) === seat && busy ? 'seat-active' : ''}`}>
            <div className="seat-name">
              {NAMES[seat]}
              {seat === FIRST_DEAL.dealer && <span className="chip chip-dealer">Dealer</span>}
            </div>
            <div className="seat-cards">
              {dealt && Array.from({ length: cardsHeld(seat) }, (_, i) => <CardView key={i} faceDown size="small" />)}
            </div>
            {said(seat) && <div className="bubble">{said(seat)}</div>}
          </div>
        ))}
        <div className="centre">
          {t.play ? (
            <div className="trick">
              {trick?.plays.map((p) => (
                <div key={p.seat} className={`trick-card at-${POS[p.seat]} ${trick.winner === p.seat ? 'trick-winner' : ''}`}>
                  <CardView card={p.card} size="table" />
                </div>
              ))}
              {trick?.winner != null && (
                <div className="trick-hint trick-won">{trick.winner === 0 ? 'You win the trick' : `${NAMES[trick.winner]} wins the trick`}</div>
              )}
              {last && (
                <div className="tut-result">
                  <span className="tut-result-big">+1</span>
                  <span>point to your team</span>
                </div>
              )}
              <div className="tricks-count">
                Tricks: Us {t.play.tricksWon[0]} · Them {t.play.tricksWon[1]}
              </div>
            </div>
          ) : (
            dealt && (
              <div className="kitty">
                {t.bidding.phase === 'round1' ? (
                  <CardView card={FIRST_DEAL.upcard} size="table" />
                ) : (
                  <div className="turned-down">
                    <CardView card={FIRST_DEAL.upcard} size="table" dimmed />
                    <span>turned down</span>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>

      <section className="coach" aria-live="polite">
        <img className="coach-logo" src="/logo.svg" alt="" width={34} height={34} />
        <div className="coach-body">
          {busy ? (
            <p className="coach-wait">{NAMES[(t.play ? t.play.turn : t.bidding.turn) ?? 0]} is thinking…</p>
          ) : (
            <>
              <p>
                <SuitText text={lesson.say} />
              </p>
              {lesson.show && <Picture show={lesson.show} />}
              {wrong && (
                <p className="coach-wrong" role="alert">
                  <SuitText text={wrong} />
                </p>
              )}
              {!you && !last && (
                <button type="button" className="btn btn-primary coach-next" onClick={next}>
                  Next
                </button>
              )}
              {last && (
                <div className="coach-end">
                  <button type="button" className="btn btn-primary" onClick={() => onGo('quiz/rules')}>
                    Try the rules quiz
                  </button>
                  <button type="button" className="btn" onClick={() => onGo('rules')}>
                    Read the rules
                  </button>
                  <button type="button" className="btn" onClick={restart}>
                    Play it again
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <div className="hand">
        {dealt &&
          hand.map((c) => {
            const id = cardId(c);
            const legal = !!wantCard && !!t.play && isLegalPlay(t.play, c);
            return (
              <div key={id} className={wantCard?.card === id ? 'tut-suggest' : ''}>
                <CardView card={c} size="hand" playable={legal} dimmed={!!wantCard && !legal} tapAlways={!!wantCard} onClick={() => onCard(c)} />
              </div>
            );
          })}
      </div>

      <div className="controls">
        {wantBid && t.bidding.phase === 'round1' && (
          <>
            <button type="button" className={`btn ${actionKey(wantBid.bid) === 'pass' ? 'tut-suggest-btn' : ''}`} onClick={() => onBid({ type: 'pass' })}>
              Pass
            </button>
            <button type="button" className="btn" onClick={() => onBid({ type: 'orderUp', alone: false })}>
              Order it up
            </button>
          </>
        )}
        {wantBid && t.bidding.phase === 'round2' && (
          <div className="suit-buttons">
            {(['S', 'H', 'C'] as Suit[]).map((suit) => (
              <button
                key={suit}
                type="button"
                className={`btn suit-btn suit-${suit} ${actionKey(wantBid.bid) === `name-${suit}` ? 'tut-suggest-btn' : ''}`}
                onClick={() => onBid({ type: 'name', suit, alone: false })}
              >
                <span className="suit-btn-sym">{SUIT_SYMBOL[suit]}</span>
                <span className="suit-btn-name">{SUIT_NAME[suit]}</span>
              </button>
            ))}
            <button type="button" className="btn" onClick={() => onBid({ type: 'pass' })}>
              Pass
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Mini({ text, note, mine }: { text: string; note?: string; mine?: boolean }) {
  return (
    <span className={`mini ${mine ? 'mini-mine' : ''}`}>
      <span className="mini-card">
        <SuitText text={text} />
      </span>
      {note && <span className="mini-note">{note}</span>}
    </span>
  );
}

function Picture({ show }: { show: Show }) {
  if (show === 'pack') {
    return (
      <div className="minis" aria-label="The pack: 9 to Ace in each suit, and the Benny">
        {(['♠', '♥', '♦', '♣'] as const).map((s) => (
          <Mini key={s} text={`9–A ${s}`} note="6 cards" />
        ))}
        <Mini text="★" note="Benny" />
      </div>
    );
  }
  if (show === 'ladder-diamonds' || show === 'ladder-hearts') {
    const h = show === 'ladder-hearts';
    const [t, o] = h ? ['♥', '♦'] : ['♦', '♥'];
    const yours = new Set(h ? ['J♦', 'A♥', '9♥'] : ['J♦']);
    const ladder: [string, string?][] = [['★', 'Benny'], [`J${t}`, 'Right'], [`J${o}`, 'Left'], [`A${t}`], [`K${t}`], [`Q${t}`], [`10${t}`], [`9${t}`]];
    return (
      <>
        <div className="minis" aria-label={`Trumps from highest to lowest, with ${h ? 'hearts' : 'diamonds'} as trumps`}>
          {ladder.map(([text, note]) => (
            <Mini key={text} text={text} note={note} mine={yours.has(text)} />
          ))}
        </div>
        <p className="mini-key">Highest on the left. Gold edge: in your hand.</p>
      </>
    );
  }
  return (
    <table className="coach-score">
      <tbody>
        <tr><td>Makers take 3 or 4 tricks</td><td>1 point</td></tr>
        <tr><td>Makers take all 5 (a march)</td><td>2 points</td></tr>
        <tr><td>Makers take fewer than 3 (euchred)</td><td>2 to the other team</td></tr>
      </tbody>
    </table>
  );
}
