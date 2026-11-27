// The rules quiz: the house rules (EUCHRE_RULES.md) as short questions. The first option is the
// right answer; the quiz shuffles the options. `section` is the rules-page section that explains it.
// Keep these in step with EUCHRE_RULES.md when a rule changes.

export interface RulesQuestion {
  id: string;
  question: string;
  options: string[];
  explain: string;
  section: 'r-cards' | 'r-deal' | 'r-trump' | 'r-alone' | 'r-play' | 'r-score' | 'r-terms';
}

export const RULES_QUESTIONS: RulesQuestion[] = [
  // The cards
  { id: 'deck', section: 'r-cards', question: 'How many cards are in the pack?', options: ['25', '24', '32', '52'], explain: '9, 10, Jack, Queen, King and Ace in each of the four suits (24 cards), plus the Benny.' },
  { id: 'top', section: 'r-cards', question: 'Spades are trumps. Which is the highest card?', options: ['The Benny', 'J♠ (the Right Bower)', 'J♣ (the Left Bower)', 'A♠'], explain: 'The Benny is always the highest card and always a trump, whatever suit is trumps.' },
  { id: 'right', section: 'r-cards', question: 'Clubs are trumps. Which is the second-highest card?', options: ['J♣', 'J♠', 'A♣', 'K♣'], explain: 'The Jack of trumps is the Right Bower, second only to the Benny.' },
  { id: 'left-h', section: 'r-cards', question: 'Hearts are trumps. Which card is the Left Bower?', options: ['J♦', 'J♥', 'J♣', 'J♠'], explain: 'The Left Bower is the other Jack of the same colour as trumps. Hearts and diamonds are both red.' },
  { id: 'left-s', section: 'r-cards', question: 'Spades are trumps. Which card is the Left Bower?', options: ['J♣', 'J♠', 'J♥', 'J♦'], explain: 'Spades and clubs are both black, so the J♣ becomes the Left Bower.' },
  { id: 'left-suit', section: 'r-cards', question: 'Diamonds are trumps. For this hand, the J♥ counts as…', options: ['A diamond (a trump)', 'A heart', 'Both a heart and a diamond', 'Neither suit'], explain: 'The Left Bower changes suit for the whole hand: it is a trump, and not a heart at all.' },
  { id: 'follow-left', section: 'r-play', question: 'Spades are trumps. Clubs are led. Your only club is the J♣. Must you play it?', options: ['No: the J♣ is a spade this hand, so you have no clubs', 'Yes: you must follow suit with it', 'Only if a trump has already been played', 'Only if it would win the trick'], explain: 'With spades as trumps the J♣ is the Left Bower, a spade. You have no clubs, so you may play any card.' },
  { id: 'benny-follow', section: 'r-cards', question: 'Trumps are led and your only trump is the Benny. What must you do?', options: ['Play the Benny', 'Play any card', 'Play your lowest card', 'Pass the turn'], explain: 'The Benny is a trump, so you must follow suit with it.' },
  { id: 'trump-count', section: 'r-cards', question: 'How many cards are in the trump suit?', options: ['8', '6', '7', '9'], explain: 'The Benny, the Right Bower, the Left Bower, then Ace, King, Queen, 10 and 9 of trumps.' },
  { id: 'next-count', section: 'r-cards', question: 'Hearts are trumps. How many diamonds are left as an ordinary suit?', options: ['5', '6', '4', '7'], explain: 'The J♦ has become the Left Bower, so diamonds are down to A, K, Q, 10, 9.' },
  { id: 'plain-rank', section: 'r-cards', question: 'In a suit that is not trumps, which card is highest?', options: ['Ace', 'Jack', 'King', '10'], explain: 'Ordinary suits rank Ace, King, Queen, Jack, 10, 9. Jacks are only high in trumps.' },

  // The deal
  { id: 'hand-size', section: 'r-deal', question: 'How many cards does each player get?', options: ['5', '6', '4', '7'], explain: 'Everyone gets 5. The other 5 cards are the kitty, with the top one turned up.' },
  { id: 'discard', section: 'r-deal', question: 'The dealer picks up the upcard. What happens next?', options: ['The dealer discards one card face down', 'The dealer shows the discard to the table', 'The dealer passes a card to their partner', 'Nothing: the dealer plays with 6 cards'], explain: 'The dealer adds the upcard and discards one card face down. Nobody else sees it.' },
  { id: 'discard-secret', section: 'r-deal', question: 'May the dealer\'s partner see the dealer\'s discard?', options: ['No, nobody may', 'Yes, partners may', 'Only after the first trick', 'Only if they ask'], explain: 'The discard is secret from everyone, including the dealer\'s partner.' },
  { id: 'benny-up', section: 'r-deal', question: 'The Benny is the turned-up card. What happens?', options: ['The dealer names trumps before looking at their cards', 'The hand is thrown in', 'Everyone bids as normal', 'The player on the dealer\'s left names trumps'], explain: 'A blind shout: the dealer names any suit as trumps, then picks up their hand and the Benny and discards one card.' },
  { id: 'benny-alone', section: 'r-deal', question: 'The Benny is turned up. Who may go alone?', options: ['Only the dealer', 'Anyone', 'Only the dealer\'s partner', 'Nobody'], explain: 'Only the dealer may go alone, and nobody may defend alone that hand.' },

  // Making trumps
  { id: 'first-speak', section: 'r-trump', question: 'Who speaks first in round one?', options: ['The player on the dealer\'s left', 'The dealer', 'The dealer\'s partner', 'The player on the dealer\'s right'], explain: 'Bidding starts on the dealer\'s left and goes clockwise. The dealer speaks last.' },
  { id: 'up-down', section: 'r-trump', question: 'The dealer\'s partner orders up the card. What happens?', options: ['It is always a loner: Up and Down', 'The dealer picks up as normal', 'The dealer\'s partner swaps a card with the dealer', 'Nothing until the dealer agrees'], explain: 'Up and Down: trumps go up and the dealer goes down. The partner plays alone, unless the dealer takes over.' },
  { id: 'take-over', section: 'r-trump', question: 'Up and Down has been called. The dealer takes over. What happens?', options: ['The dealer picks up, discards and plays alone', 'Both partners play', 'The dealer plays alone without picking up', 'The hand is thrown in'], explain: 'The dealer drops their partner, picks up the upcard, discards face down and plays alone.' },
  { id: 'round2-banned', section: 'r-trump', question: 'Round two. Which suit can\'t be named as trumps?', options: ['The suit of the turned-down card', 'The suit of the same colour', 'Spades', 'Any suit can be named'], explain: 'Any suit except the one that was turned down.' },
  { id: 'all-pass', section: 'r-trump', question: 'Everyone passes in both rounds. What happens?', options: ['The hand is thrown in and the deal passes left', 'The dealer must name trumps', 'The upcard\'s suit becomes trumps', 'Everyone re-bids'], explain: 'There\'s no "stick the dealer" in our rules. The hand is thrown in with no score.' },

  // Going alone
  { id: 'alone-when', section: 'r-alone', question: 'You order it up without saying "alone". Can you decide to go alone later?', options: ['No: it must be said with the call', 'Yes, before the first lead', 'Yes, once you see the dealer\'s pick-up', 'Yes, at any time'], explain: 'You go alone in the same breath as your call, e.g. "Pick it up, alone".' },
  { id: 'partner-alone', section: 'r-alone', question: 'Your partner names hearts. You haven\'t had your turn yet this round. Can you go alone?', options: ['Yes: drop your partner and play alone, trumps stay hearts', 'No: only the maker can go alone', 'Only if your partner said "alone"', 'Only if you change trumps'], explain: 'The maker\'s partner may drop them and go alone on their own turn, whether or not the maker went alone.' },
  { id: 'defend-alone', section: 'r-alone', question: 'An opponent makes trumps. You haven\'t spoken this round. What extra option do you have?', options: ['Defend alone, dropping your partner', 'Change the trump suit', 'Ask for a redeal', 'Swap a card with your partner'], explain: 'A defender may defend alone, whether the makers are playing alone or together.' },
  { id: 'dealer-defend', section: 'r-alone', question: 'An opponent orders up and you, the dealer, defend alone. Do you pick up the upcard?', options: ['Yes, and you discard one', 'No, it stays in the kitty', 'Only if it is a trump', 'Your partner picks it up'], explain: 'A dealer defending alone still picks up the upcard and discards face down.' },
  { id: 'dropped-dealer', section: 'r-alone', question: 'You are the dealer and your partner defends alone, dropping you. Do you pick up the upcard?', options: ['No: a dropped dealer doesn\'t pick up', 'Yes, as usual', 'Yes, then hand it to your partner', 'Only in round one'], explain: 'Whenever the dealer is dropped, they turn in their cards and the upcard stays in the kitty.' },
  { id: 'second-defender', section: 'r-alone', question: 'The first defender defends alone. What can the second defender do on their turn?', options: ['Take over the lone defence', 'Nothing: they sit out', 'Name a new trump suit', 'Join in, so both defend'], explain: 'The second defender may take over and defend alone; the first then sits out.' },

  // Playing
  { id: 'first-lead', section: 'r-play', question: 'Who leads the first trick?', options: ['The player on the dealer\'s left', 'The dealer', 'Whoever made trumps', 'The dealer\'s partner'], explain: 'The player on the dealer\'s left leads, skipping anyone sitting out.' },
  { id: 'cant-follow', section: 'r-play', question: 'You can\'t follow the suit led. What may you play?', options: ['Any card, including a trump', 'Only a trump', 'Only your lowest card', 'Nothing: you miss the trick'], explain: 'If you can\'t follow suit, any card is allowed.' },
  { id: 'look-back', section: 'r-play', question: 'May you look back at a finished trick?', options: ['No, finished tricks are face down', 'Yes, at any time', 'Only the last trick', 'Only the makers may'], explain: 'Tricks are turned face down and can\'t be looked at again. (The app\'s "Last trick" button is a learning aid.)' },

  // Scoring
  { id: 'make-4', section: 'r-score', question: 'The makers, playing together, take 4 tricks. How many points?', options: ['1', '2', '3', '4'], explain: '3 or 4 tricks score 1 point.' },
  { id: 'march', section: 'r-score', question: 'The makers, playing together, take all 5 tricks. How many points?', options: ['2', '1', '3', '4'], explain: 'A march (all 5 tricks) scores 2.' },
  { id: 'loner-5', section: 'r-score', question: 'A loner takes all 5 tricks. How many points?', options: ['4', '2', '3', '5'], explain: 'A lone march scores 4.' },
  { id: 'loner-3', section: 'r-score', question: 'A loner takes 3 tricks. How many points?', options: ['1', '2', '0', '4'], explain: 'A loner taking 3 or 4 tricks scores 1, the same as a normal make.' },
  { id: 'euchre', section: 'r-score', question: 'The makers take only 2 tricks. What happens?', options: ['Euchred: 2 points to the defenders', '1 point to the makers', 'No score', '1 point to the defenders'], explain: 'Fewer than 3 tricks is a euchre, worth 2 to the defenders.' },
  { id: 'lone-euchre', section: 'r-score', question: 'A lone defender euchres the makers. How many points?', options: ['4 to the defenders', '2 to the defenders', '1 to the defenders', '3 to the defenders'], explain: 'A lone defender\'s euchre is worth 4.' },

  // Terms
  { id: 'next', section: 'r-terms', question: 'In round two, what does "next" mean?', options: ['The suit of the same colour as the turned-down card', 'The suit after the turned-down one, clockwise', 'Whatever the next player names', 'The opposite colour to the turned-down card'], explain: 'If a heart was turned down, next is diamonds (and the other way round); spades and clubs likewise.' },
  { id: 'hole', section: 'r-terms', question: 'What does "in the hole" mean?', options: ['Needing one point to win', 'Having no points yet', 'Being euchred twice in a row', 'Sitting out a loner'], explain: 'A team on 9 in a game to 10 is in the hole. "Die in the hole" means losing from there.' },
  { id: 'stopper', section: 'r-terms', question: 'What is a "stopper"?', options: ['A trick the defenders win to stop a march', 'A card that ends the bidding', 'A pass in round two', 'The dealer\'s discard'], explain: 'Winning one trick holds the makers to 1 point instead of 2 (or 4 against a loner).' },
];
