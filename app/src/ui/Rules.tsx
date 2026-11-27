// The house rules this app plays, in plain language. Source: EUCHRE_RULES.md at the repository root.
// Keep the two in step when a rule changes.
import { useEffect, type ReactNode } from 'react';

const S = ({ s }: { s: '♠' | '♥' | '♦' | '♣' }) => <span className={s === '♥' || s === '♦' ? 'rs-red' : 'rs-black'}>{s}</span>;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="rules-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function Rules({ section, onBack }: { section?: string | null; onBack: () => void }) {
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // Opened at a section (e.g. "Read the rule" in the quiz): jump straight there.
  useEffect(() => {
    if (section) document.getElementById(section)?.scrollIntoView({ block: 'start' });
  }, [section]);
  return (
    <main className="rules">
      <header className="rules-bar">
        <button type="button" className="btn btn-small rules-back" onClick={onBack} aria-label="Back">
          ←
        </button>
        <h1>How to play: our rules</h1>
      </header>

      <p className="rules-lead">
        Euchre is a trick-taking game for <strong>4 players in 2 partnerships</strong>, with partners sitting opposite. This
        app plays the pub-league version from Cornwall, with the Joker (the <strong>Benny</strong>) as the top trump. If
        you know Euchre from elsewhere, start with what's different.
      </p>

      <aside className="rules-key">
        <h2>What's different in this version</h2>
        <ul>
          <li>
            <strong>The Benny (Joker) is the highest card</strong>, and always a trump, whichever suit is trumps.
          </li>
          <li>
            <strong>Benny turned up: a blind shout.</strong> If the Benny is the turned-up card, the dealer names trumps{' '}
            <strong>before looking at their own cards</strong>. There's no bidding. Only the dealer may go alone, and they decide that after picking up their cards.
          </li>
          <li>
            <strong>Up and Down.</strong> If the dealer's partner orders the card up, it's always a loner. The dealer is
            dropped, unless the dealer takes over and plays alone instead.
          </li>
          <li>
            <strong>No "stick the dealer".</strong> If everyone passes twice, the hand is thrown in and the deal moves on.
          </li>
          <li>
            <strong>Defending alone.</strong> A defender may drop their partner and play alone. Euchre the makers that way
            and it's worth <strong>4 points</strong>.
          </li>
          <li>
            <strong>Turns carry on after trumps are made.</strong> Anyone who hasn't yet spoken in that round may still go
            alone: defend alone, take over, or drop the partner who called.
          </li>
          <li>
            <strong>The dealer's discard is secret</strong>, even from their partner.
          </li>
          <li>
            <strong>Game length is agreed before you start.</strong> This app lets you choose anything from 5 to 21.
          </li>
        </ul>
      </aside>

      <nav className="rules-toc" aria-label="Sections">
        <button type="button" onClick={() => go('r-cards')}>Cards</button>
        <button type="button" onClick={() => go('r-deal')}>The deal</button>
        <button type="button" onClick={() => go('r-trump')}>Making trumps</button>
        <button type="button" onClick={() => go('r-alone')}>Going alone</button>
        <button type="button" onClick={() => go('r-play')}>Playing</button>
        <button type="button" onClick={() => go('r-score')}>Scoring</button>
        <button type="button" onClick={() => go('r-terms')}>Terms</button>
      </nav>

      <Section id="r-cards" title="The cards">
        <p>
          <strong>25 cards:</strong> 9, 10, Jack, Queen, King and Ace in each suit, plus the Benny.
        </p>
        <h3>Trumps, highest to lowest</h3>
        <ol>
          <li><strong>The Benny</strong> (the Joker)</li>
          <li><strong>Right Bower:</strong> the Jack of trumps</li>
          <li><strong>Left Bower:</strong> the other Jack of the same colour</li>
          <li>Ace, King, Queen, 10, 9 of trumps</li>
        </ol>
        <p>The trump suit has 8 cards.</p>
        <div className="rules-table-wrap">
          <table className="rules-table">
            <thead>
              <tr><th>Trumps</th><th>Right Bower</th><th>Left Bower</th></tr>
            </thead>
            <tbody>
              <tr><td><S s="♠" /> Spades</td><td>J<S s="♠" /></td><td>J<S s="♣" /></td></tr>
              <tr><td><S s="♣" /> Clubs</td><td>J<S s="♣" /></td><td>J<S s="♠" /></td></tr>
              <tr><td><S s="♥" /> Hearts</td><td>J<S s="♥" /></td><td>J<S s="♦" /></td></tr>
              <tr><td><S s="♦" /> Diamonds</td><td>J<S s="♦" /></td><td>J<S s="♥" /></td></tr>
            </tbody>
          </table>
        </div>
        <p className="rules-note">
          <strong>The Left Bower changes suit.</strong> For the whole hand it counts as a trump, not as its printed suit.
          If hearts are trumps, the J<S s="♦" /> is a heart. The <strong>Benny</strong> is always a trump too: if trumps
          are led and the Benny is your only trump, you must play it.
        </p>
        <p>
          <strong>Other suits</strong> rank Ace, King, Queen, Jack, 10, 9. The suit of the same colour as trumps has only 5
          cards, because its Jack has become the Left Bower.
        </p>
      </Section>

      <Section id="r-deal" title="The deal">
        <ul>
          <li>Everyone gets <strong>5 cards</strong>. The deal passes to the left after every hand.</li>
          <li>
            The other 5 cards are the <strong>kitty</strong>. Its top card is turned face up: the <strong>upcard</strong>.
          </li>
          <li>
            Whenever the dealer picks up the upcard, they <strong>discard one card face down</strong>. Nobody else sees it,
            and the rest of the kitty stays face down.
          </li>
        </ul>
        <h3>If the Benny is turned up: the blind shout</h3>
        <ul>
          <li>
            The Benny has no suit, so it can't be ordered up. Instead the <strong>dealer names any suit as trumps, blind</strong>,
            before looking at their own cards.
          </li>
          <li>Then the dealer picks up their hand and the Benny, looks at all six cards, and discards one face down.</li>
          <li>The dealer's team are the makers. <strong>Only the dealer</strong> may go alone, and nobody may defend alone. The dealer decides whether to go alone <strong>after</strong> picking up their cards, so that choice is never blind.</li>
        </ul>
      </Section>

      <Section id="r-trump" title="Making trumps">
        <h3>Round one: order it up, or pass</h3>
        <ul>
          <li>Starting on the dealer's left, each player passes or <strong>orders up</strong> the upcard, making its suit trumps.</li>
          <li>The dealer speaks last, and can <strong>pick it up</strong> or pass.</li>
          <li>If an opponent orders it up, or the dealer takes it, the dealer adds it to their hand and discards one card.</li>
          <li>
            <strong>Up and Down:</strong> if the <strong>dealer's partner</strong> orders it up, it's always a loner. The
            partner plays alone and the dealer is dropped without picking up, <strong>unless the dealer takes over</strong>:
            then the dealer picks up, discards, and plays alone instead.
          </li>
        </ul>
        <h3>Round two: name a suit</h3>
        <ul>
          <li>If everyone passes, the upcard is turned down. Going round again from the dealer's left, each player may pass or <strong>name any other suit</strong> as trumps.</li>
          <li>If everyone passes again, the hand is <strong>thrown in</strong>: no score, and the deal moves on.</li>
        </ul>
        <p>
          The team that chose trumps are the <strong>makers</strong>; the other team are the <strong>defenders</strong>.
        </p>
      </Section>

      <Section id="r-alone" title="Going alone">
        <ul>
          <li>
            <strong>When you make trumps</strong>, you can go alone in the same breath ("Spades, alone"). You can't decide
            to go alone later. Your partner lays their cards face down and sits out.
          </li>
          <li>
            <strong>Turns carry on after the call.</strong> Everyone who hasn't yet spoken in that round still gets a turn,
            but only to go alone or pass. The dealer has the final say.
          </li>
          <li>
            <strong>The maker's partner</strong> may drop the player who called and go alone, whether or not they went
            alone. Trumps stay as called.
          </li>
          <li>
            <strong>Defending alone:</strong> a defender may drop their partner and play alone against the makers, whether
            the makers are playing alone or together. If the first defender does, the second may take over on their turn.
          </li>
          <li>
            <strong>Dealer defending alone</strong> after an opponent orders up still picks up the upcard and discards.
          </li>
          <li>
            <strong>A dropped dealer</strong> (by Up and Down, or by their partner defending alone) doesn't pick up the upcard.
          </li>
        </ul>
      </Section>

      <Section id="r-play" title="Playing the hand">
        <ul>
          <li>The player on the dealer's left leads first. Players sitting out are skipped.</li>
          <li>
            <strong>Follow suit if you can.</strong> Remember the Left Bower and the Benny are trumps. If you can't follow,
            play anything, including a trump.
          </li>
          <li>The highest trump wins the trick; if there's no trump, the highest card of the suit led wins.</li>
          <li>The winner of a trick leads the next. A hand is 5 tricks.</li>
          <li>Finished tricks are turned face down and can't be looked back at. (The app's "Last trick" button is a learning aid.)</li>
        </ul>
      </Section>

      <Section id="r-score" title="Scoring">
        <div className="rules-table-wrap">
          <table className="rules-table">
            <thead>
              <tr><th>What happened</th><th>Points</th></tr>
            </thead>
            <tbody>
              <tr><td>Makers take 3 or 4 tricks</td><td>1 to the makers</td></tr>
              <tr><td>Makers take all 5 (a <strong>march</strong>)</td><td>2 to the makers</td></tr>
              <tr><td>A loner takes 3 or 4 tricks</td><td>1 to the makers</td></tr>
              <tr><td>A loner takes all 5</td><td><strong>4</strong> to the makers</td></tr>
              <tr><td>Makers take fewer than 3 (<strong>euchred</strong>)</td><td>2 to the defenders</td></tr>
              <tr><td>A <strong>lone defender</strong> euchres the makers</td><td><strong>4</strong> to the defenders</td></tr>
            </tbody>
          </table>
        </div>
        <p>The first team to reach the agreed total wins.</p>
      </Section>

      <Section id="r-terms" title="Words you'll hear at the table">
        <dl className="rules-terms">
          <dt>Drop</dt><dd>Drop your partner to go alone. They lay their cards down and sit out.</dd>
          <dt>Up and Down</dt><dd>The dealer's partner ordering up: trumps go <em>up</em>, the dealer goes <em>down</em>.</dd>
          <dt>Next</dt><dd>In round two, the suit of the same colour as the turned-down card.</dd>
          <dt>Against colour</dt><dd>Naming the colour your team "shouldn't": next for the dealer's team, the other colour for the non-dealing team.</dd>
          <dt>March</dt><dd>Taking all 5 tricks.</dd>
          <dt>Stopper</dt><dd>A trick the defenders win to stop a march.</dd>
          <dt>In the hole</dt><dd>Needing one point to win. "Die in the hole": lose from there.</dd>
          <dt>Whitewash</dt><dd>Losing without scoring a point.</dd>
          <dt>Let it go</dt><dd>Not trying to win a trick, so your partner can win it and you keep your strong card.</dd>
          <dt>Drawing / drag</dt><dd>Leading trumps to pull the opponents' trumps out.</dd>
          <dt>Gone fishing</dt><dd>A maker leading a low trump while holding higher ones, to drag out the opponents' trumps.</dd>
          <dt>Sleeping</dt><dd>A card left in the kitty: "The Benny was sleeping."</dd>
        </dl>
      </Section>

      <button type="button" className="btn btn-primary rules-done" onClick={onBack}>
        Back
      </button>
    </main>
  );
}
