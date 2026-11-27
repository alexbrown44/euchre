# Euchre web app

React + TypeScript (Vite). It uses the rules engine and bots in `../engine` directly, so the
house rules (EUCHRE_RULES.md) are exactly the ones the simulator was built on.

## Run it

```
cd app
npm install
npm run dev      # http://localhost:5173
npm test         # plays whole games through the table logic with bots
npm run build    # production build in app/dist
```

## How it fits together

- `src/game/table.ts`: one game from first deal to the winning point, as plain data and pure
  functions. `tableView(state, seat)` gives one player only what they may see. The future
  multiplayer server will hold the same `TableState` and send each player their `TableView`.
- `src/game/bots.ts`: Easy, Medium and Hard bots, built from the simulator's bots.
- `src/ui/`: the screens. The table only ever reads a `TableView`.
- `src/config.ts`: the app's name and limits (game length 5 to 21), in one place.
- `src/learn/`: Learn mode, with two tracks ("New to Euchre" and "Sharpen your game").
  - `Guide.tsx` shows STRATEGY_GUIDE.md, parsed by `guideHtml.ts` (keep in step with `tools/guide-to-html.mjs`).
  - `rulesQuiz.ts` holds the rules questions; keep them in step with EUCHRE_RULES.md.
  - `data/bidding-bank.json` holds the "Would you call?" questions, measured by the simulator (below).
  - `progress.ts` keeps quiz scores in the browser.

## Rebuilding the bidding quiz

```
cd engine
node experiments/quiz-bank.ts run 15 100 250 16 0.75   # spots, batch number, redeals, worlds, share in round two; run several batches in parallel
node experiments/quiz-bank.ts combine results/quiz-bank-from*.json
cd ../app
node scripts/build-bidding-bank.ts ../engine/results/quiz-bank-all.json
```

The answer marked "the guide's rule of thumb" is `guideChoice` in `src/learn/bidding.ts`, which follows the written guide; keep it in step with STRATEGY_GUIDE.md. The last step writes `src/learn/data/bidding-bank.json` and `BIDDING_QUIZ_REVIEW.md` (every question, for a person to check).

## Deploying

`render.yaml` at the repository root sets up a Render static site: build `cd app && npm ci && npm run build`,
publish `app/dist`.
