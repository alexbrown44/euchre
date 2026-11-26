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
- `src/config.ts`: the app's name and limits (game length 10 to 21), in one place.

## Deploying

`render.yaml` at the repository root sets up a Render static site: build `cd app && npm ci && npm run build`,
publish `app/dist`.
