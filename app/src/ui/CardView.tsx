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
        <span className="card-corner">★</span>
        <span className="card-pip benny-pip">★</span>
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
