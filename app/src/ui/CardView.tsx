import type { Card } from '../../../engine/src/cards.ts';
import { cardId, SUIT_NAME, SUIT_SYMBOL } from '../../../engine/src/cards.ts';

const RANK_NAME: Record<string, string> = { '9': 'Nine', '10': 'Ten', J: 'Jack', Q: 'Queen', K: 'King', A: 'Ace' };

export type CardSize = 'hand' | 'table' | 'small';

interface Props {
  card?: Card;
  faceDown?: boolean;
  size?: CardSize;
  playable?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  label?: string;
  /** Let a card that can't be played still be tapped (the tutorial explains why it can't). */
  tapAlways?: boolean;
  /** Outline the card the coach suggests. */
  highlight?: boolean;
}

export function CardView({ card, faceDown, size = 'hand', playable, dimmed, onClick, label, tapAlways, highlight }: Props) {
  const cls = ['card', `card-${size}`];
  if (faceDown || !card) cls.push('card-back');
  if (playable) cls.push('card-playable');
  if (dimmed) cls.push('card-dimmed');
  if (highlight) cls.push('card-suggest');

  if (faceDown || !card) return <div className={cls.join(' ')} aria-label="face-down card" />;

  const content =
    card.kind === 'benny' ? (
      <>
        <span className="card-corner benny-corner">★</span>
        <BennyArt />
        <span className="card-benny-word">Benny</span>
      </>
    ) : (
      <>
        <span className="card-corner">
          {card.rank}
          <br />
          {SUIT_SYMBOL[card.suit]}
        </span>
        <span className="card-pip">{SUIT_SYMBOL[card.suit]}</span>
      </>
    );
  cls.push(card.kind === 'benny' ? 'card-benny' : `suit-${card.suit}`);
  const name = label ?? (card.kind === 'benny' ? 'Benny' : `${RANK_NAME[card.rank]} of ${SUIT_NAME[card.suit]}`);
  const id = cardId(card);

  if (onClick) {
    return (
      <button type="button" className={cls.join(' ')} onClick={onClick} disabled={!playable && !tapAlways} aria-label={name} data-card={id}>
        {content}
      </button>
    );
  }
  return (
    <div className={cls.join(' ')} aria-label={name} data-card={id}>
      {content}
    </div>
  );
}

/** The Benny's face: the chough from the logo, perched on the jester's cap. */
function BennyArt() {
  return (
    <svg className="benny-art" viewBox="20 3 80 95" aria-hidden="true">
      <g transform="translate(60 83) scale(1.35)">
        <path d="M-16 4C-20 -4 -24 -8 -27 -14C-17 -13 -10 -6 -6 4Z" fill="#e31b23" />
        <path d="M16 4C20 -4 24 -8 27 -14C17 -13 10 -6 6 4Z" fill="#e31b23" />
        <path d="M-7.5 4C-6 -8 -3 -14 0 -21C3 -14 6 -8 7.5 4Z" fill="#1a1a1a" />
        <rect x="-18" y="3" width="36" height="7" rx="2" fill="#e2b65a" stroke="#1a1a1a" strokeWidth="0.8" />
        <path d="M-12 6.5l1.6-2 1.6 2-1.6 2zM-1.6 6.5l1.6-2 1.6 2-1.6 2zM8.8 6.5l1.6-2 1.6 2-1.6 2z" fill="#e31b23" />
        <circle cx="-27" cy="-14" r="2.8" fill="#e2b65a" stroke="#1a1a1a" strokeWidth="0.8" />
        <circle cx="27" cy="-14" r="2.8" fill="#e2b65a" stroke="#1a1a1a" strokeWidth="0.8" />
        <circle cx="0" cy="-21" r="2.8" fill="#e2b65a" stroke="#1a1a1a" strokeWidth="0.8" />
      </g>
      <g transform="translate(14 -9) scale(0.66)">
        <path d="M45 79L37 97.5L43.5 99.5L58.5 80Z" fill="#1a1a1a" />
        <path d="M77 30.5C83 29.6 87.6 33 87.8 38.2C87.9 40.6 87.4 42.6 86.6 44.4C85.8 50 86.4 56 84 63C81 71 74.5 76.8 66 79L58 80.5L47 80.5C50 67 58 52 67.5 41.5C70 35 72.8 31.2 77 30.5Z" fill="#1a1a1a" />
        <path d="M70.5 44C78.5 50.5 78.8 63.5 71 72.5C63 81 52 89 40.5 97C45 82 55.5 60 70.5 44Z" fill="#2b2f33" />
        <path d="M86.6 36.9C94 37.4 100.4 43.6 104.6 56.8C99.6 47.6 94 42.8 86.4 41.4Z" fill="#e31b23" />
        <path d="M68 79L66.5 95.5M73.5 78L74.5 95.5" stroke="#e31b23" strokeWidth="2.8" strokeLinecap="round" fill="none" />
        <path d="M66.5 95.5L61 97.5M66.5 95.5L64 98.5M66.5 95.5L70.5 97.2M74.5 95.5L69.5 97.2M74.5 95.5L72.5 98.5M74.5 95.5L79.5 97.3" stroke="#e31b23" strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle cx="82.2" cy="36.4" r="1.25" fill="#fbfaf6" />
      </g>
    </svg>
  );
}
