# Euchre Engine

Rules engine for Euchre as played in the Lizard Peninsula Euchre League. The rules it follows are in [../EUCHRE_RULES.md](../EUCHRE_RULES.md).

Needs **Node.js 24+**. There's nothing to install: Node runs the TypeScript files directly.

```bash
npm test                      # run all tests
npm run sample                # print 3 sample deals
npm run bidding               # walk through 9 scripted bidding examples
npm run game                  # a full game by random players, first 2 hands trick by trick
node scripts/sample-deals.ts 5 123   # 5 deals using seed 123
```

## Layout

| File | What it does |
|---|---|
| `src/cards.ts` | Cards, the Benny, bowers, trump and plain-suit ranking, trick winner |
| `src/deck.ts` | The 25-card deck |
| `src/deal.ts` | Seats and teams, choosing the first dealer, dealing 3-2 / 2-3, kitty and upcard |
| `src/bidding.ts` | Making trump: both rounds, turned-up Benny, Up and Down, going alone, taking over, defending alone, dealer pick-up and discard |
| `src/play.ts` | Playing tricks: following suit (Benny and Left Bower count as trump), skipping players sitting out, trick winners |
| `src/scoring.ts` | Points for every outcome, including loners and lone defenders |
| `src/game.ts` | Full hands and games to an agreed total; "agents" (bots or people) only see what that player could see at the table |
| `src/rng.ts` | Seeded shuffling, so any deal can be replayed exactly |
| `test/` | Automated tests for the rules above |
| `scripts/sample-deals.ts` | Prints deals for a human to check |
| `scripts/sample-bidding.ts` | Prints scripted bidding examples in table language |
| `scripts/sample-game.ts` | Prints a full game played by random players |

Seats are numbered 0–3 clockwise (South, West, North, East). Partners sit opposite: South/North vs West/East.

## Progress

- [x] Session 1: cards, card order, deck, dealing
- [x] Session 2: bidding (both rounds, turned-up Benny, Up and Down, going alone, taking over, defending alone)
- [x] Session 3: playing tricks (legal cards, sitting-out players), scoring, full games
- [ ] Session 4+: bots and simulations
