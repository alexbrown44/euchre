# Euchre Engine

Rules engine for Euchre as played in the Lizard Peninsula Euchre League. The rules it follows are in [../EUCHRE_RULES.md](../EUCHRE_RULES.md).

Needs **Node.js 24+**. There's nothing to install: Node runs the TypeScript files directly.

```bash
npm test                      # run all tests
npm run sample                # print 3 sample deals
npm run bidding               # walk through 9 scripted bidding examples
npm run game                  # a full game by random players, first 2 hands trick by trick
npm run exp:order-up          # round-one experiment (~90s for 200,000 deals), writes results/order-up.md
npm run exp:round-two         # round-two experiment (~95s for 1,000,000 deals), writes results/round-two.md
npm run exp:alone             # after-call experiment (~150s for 2,000,000 deals), writes results/alone-after-call.md
npm run exp:dealer-alone      # dealer go-alone by hand shape (~130s for 1,000,000 deals)
npm run exp:mc-loners         # loner rules with Monte Carlo card play for everyone (~0.3s per game)
npm run exp:mc-dealer-alone   # gain from going alone vs keeping partner, same hand, Monte Carlo play
npm run exp:win-chance        # win-chance table from every score, game to 10 (~4 min)
npm run exp:score-aware       # score-aware calling, judged by chance of winning the game (needs the table)
npm run exp:seat              # strong hands on the dealer's left vs right, Monte Carlo play (run chunks in parallel for big samples)
npm run exp:card-play         # card-play tactics (opening lead, trumping in, let it go), Monte Carlo play
npm run exp:head-to-head      # two bot settings play each other, e.g. -- 20000 10 round2 round1
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
| `src/bots/ruleBot.ts` | Rule-based bot: bids by hand strength with adjustable thresholds, plays with common table habits |
| `src/bots/evaluate.ts` | Hand strength, hand features, choosing the dealer's discard |
| `src/bots/monteCarlo.ts` | Monte Carlo bot: imagines possible deals of the hidden cards and plays each card out to pick the best |
| `src/bots/knowledge.ts` | What a player can work out from cards seen (unseen cards, boss cards, who's winning) |
| `experiments/` | Simulation experiments; findings are written up in [../STRATEGY_FINDINGS.md](../STRATEGY_FINDINGS.md) |
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
- [x] Session 4: rule-based bots, round-one (order up) experiment, bots retuned from it
- [x] Session 5: round-two experiment (naming trump, next vs against colour), bots retuned
- [x] Session 6: after-call experiment (defending alone, taking over, answering); bots calibrated to league loner and lone-defence rates
- [x] Session 7: Monte Carlo bot (card play), used to test the dealer-loner question
- [x] Session 8: win-chance table and score-aware calling experiment
- [x] Sessions 8-9: score-aware and seat-aware bots, card-play experiments (Finding 8)
- [x] Session 10: Finding 8 rules taught to bots (takeIt only); lead and seat experiment (Finding 9)
- [x] Session 11: round-two next rule (Finding 10), taught to bots
- [x] Session 11b: dealer discard rule (Finding 11), taught to bots
- [x] Session 11c: Findings 1-3 rechecked with Monte Carlo play (Finding 12)
- [x] Session 11d: loner card play (Finding 13), taught to bots
- [x] Session 11e: later leads and loner throw-offs (Finding 14); fixed averaging bug in card-play and loner-play (Findings 8 and 13 corrected)
- [x] Session 12: league hand tests, dealer with Q-10-9 (Finding 15) and Right Bower + 1 (Finding 16)
- [x] Session 13: strategy guide for league players (`../STRATEGY_GUIDE.md`), built from Findings 1–16
- [x] Session 14: dealer with 3 trumps, two Aces vs one suit Ace high (Finding 17)
- [x] Session 15: web app started (`../app`): solo play against Easy, Medium and Hard bots, game to 10-21
- [ ] Next: learning mode (hints, tutorial, quizzes), then online play with friends
