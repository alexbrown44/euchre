# Building a Euchre app with Claude: the full log

From a pub-league card game to a live web app, in 12 working days (12 to 28 November 2026).

**Live app:** https://euchre-00mw.onrender.com/
**Code:** https://github.com/alexbrown44/euchre (public)

---

## At a glance

| | |
|---|---|
| **Who** | Alex (the league player and product owner) working with Claude (in the Claude Code desktop app), which wrote the code, ran the experiments and drafted the documents |
| **When** | Planning from 12 Nov; first code commit 16 Nov; app live 26 Nov; latest change 28 Nov 2026 |
| **Commits** | 96, on 12 different days |
| **Code** | About 11,500 lines: game engine 1,900, experiments 3,850, app 4,450, tests 1,330 |
| **Writing** | House rules (200 lines), strategy findings (1,100 lines), strategy guide (540 lines, plus a PDF) |
| **Tests** | 91 engine tests and 20 app tests, all passing |
| **Experiments** | 19 strategy findings from 25 experiment scripts; millions of simulated hands |
| **The app** | Play against bots (3 strengths), learn the game (guided hand, practice game with a coach, calling quizzes, card-play puzzles), strategy guide, rules, About & feedback |

## The tools

| Tool | What it did |
|---|---|
| **Claude Code** (desktop app) | Wrote and ran all the code, experiments and documents; checked the app in a built-in browser |
| **TypeScript** on **Node 24** | The game engine and simulator, with no outside libraries |
| **React** and **Vite** | The web app, reusing the same engine in the browser |
| **Git** and **GitHub** | Version history; a commit at the end of each piece of work |
| **Render** | Hosting: every push to GitHub redeploys the app automatically |
| **Microsoft Edge** (headless) | Turned the strategy guide into a PDF, and the logo into app icons |

---

## Phase 0: The idea and the plan (12 Nov)

1. **The goal:** teach and promote Euchre in Alex's pub league on the Lizard Peninsula, Cornwall.
2. **The approach agreed:** first build a simulator that plays the league's exact rules, use it to test strategy, write a strategy guide from the results, and only then build the app.
3. **Why this order:** an app that teaches strategy needs strategy that has been tested under these house rules, not borrowed from American Euchre.

## Phase 1: Writing down the house rules (12 to 13 Nov)

4. **EUCHRE_RULES.md** written with Alex: the 25-card pack with the Joker (the **Benny**), the blind call when the Benny is turned up, **Up and Down** (the dealer's partner ordering up is always a loner), defending alone for 4 points, no "stick the dealer", and the scoring.
5. **Alex is the authority on the rules.** Each ruling was confirmed with Alex (for example who may take over a loner, and that a dropped dealer never picks up), then written into the rules document.
6. **Lesson:** settle the rules on paper before writing code. Every later rule question went back to this document.

## Phase 2: The game engine (16 Nov)

7. **Session 1:** the cards, their ranking (Benny, Right Bower, Left Bower, then Ace down), the deck and the deal.
8. **Session 2:** the bidding: both rounds, the blind call, Up and Down, going alone, taking over, defending alone, the dealer's pick-up and discard. Built as a state machine, with 41 tests.
9. **Session 3:** tricks, scoring and whole games. Each player only "sees" their own cards, so bots can't cheat. 66 tests: **the engine is complete.**

## Phase 3: Bots, and making them play like the league (16 to 17 Nov)

10. **Rule-based bots** that bid and play by simple rules. They play about a million hands a minute.
11. **Calibrated to real play:** Alex supplied how the league actually plays (ordering up in round one is rare; round two happens in about a third of hands; loners about 1 hand in 10; defending alone about 1 in 20). The bots were tuned until they matched.
12. **A stronger card player:** a **Monte Carlo bot** imagines many possible deals of the unseen cards and picks the best card. It beat the rule bots about 60% of games, and became the card player for the experiments.
13. **Lesson:** check that bots behave like real players before trusting what they "discover".

## Phase 4: Testing strategy, Findings 1 to 17 (16 to 25 Nov)

14. **The method:** play the **same hand** out each way (call or pass, alone or with partner, this card or that) and measure which scores more. Alex asked for the **gain of one choice over the other on the same hand**, never just raw averages, and for every loner result to show how hands end (all 5 tricks / 3 or 4 / euchred).
15. **The findings**, each written up in STRATEGY_FINDINGS.md and, where it helped, taught to the bots:
    - **F1** Round one: ordering up and picking up
    - **F2** Round two: naming trump, and "against colour"
    - **F3** After the call: defending alone, taking over, answering
    - **F4** When the dealer should go alone (the league's own rule of thumb held up)
    - **F5** The loner question settled with 12,000 Monte Carlo games
    - **F6** Calling by the score ("in the hole")
    - **F7** Where you sit changes what to do with a strong hand (Alex's seat theory confirmed)
    - **F8** Card play: opening leads, trumping in, "let it go"
    - **F9** The opening lead, and the player on the dealer's left
    - **F10** Making "next" needs 3 trumps (or 2 and an off-suit Ace)
    - **F11** The dealer's discard (the biggest single gain for the bots)
    - **F12** Findings 1 to 3 rechecked with the stronger card play
    - **F13** Card play in loner hands
    - **F14** Leads after the first trick, and throwing off against a loner
    - **F15 to F17** Worked examples of hands Alex brought: Q-10-9 as dealer; the Right Bower plus one; two Aces against one suit Ace high
16. **A bug caught and fixed:** two experiments averaged options that weren't available in every hand, which biased the results. Fixed, and Findings 8 and 13 corrected (the advice held; the gaps shrank).
17. **Ideas dropped on Alex's advice:** "pub-style" weak opponents (league players are strong), and separate tables for games to 15 or 20 (the endgame depends only on points needed).
18. **Lesson:** rare hands can't be judged by whole-game win rates; test them hand by hand.

## Phase 5: The strategy guide (22 to 25 Nov)

19. **STRATEGY_GUIDE.md** written from the findings: a one-page card, then calling by seat and round, loners, the discard, card play, playing to the score, worked examples, and "surprises".
20. **A PDF version**, styled for printing.
21. **Every rule given a plain reason**, marked as tested or "likely why (untested)".
22. **About 20 rounds of Alex's review:** seat errors fixed, "never" softened to "lost in every hand tested", "let it go" covering both cases, game-win chances shown as percentages, and a new opening section, "Your hand comes first".
23. **Lesson:** the expert's review turned correct numbers into advice a player can use at the table.

## Phase 6: Planning the app (22 to 25 Nov)

24. **Three modes agreed:** learn the game; play solo against bots with a choice of strength; play friends online.
25. **Decisions:** React with TypeScript, reusing the engine in the browser; phones and desktops equally; hosted on Render; Supabase only if needed; nicknames, no accounts; a neutral name for now.
26. **Build order:** table and solo play → learning layer → question bank → multiplayer → polish.

## Phase 7: Solo play, and going live (26 Nov)

27. **Solo play** against Easy, Medium and Hard bots, with a saved game you can resume.
28. **Deployed to Render:** live at euchre-00mw.onrender.com; every push redeploys. (A build failure fixed by pinning the Node version.)
29. **A day of fixes from Alex playing it:** slower bots; standard red and black suits; a "How to play: our rules" page; clear wording for a blind call; cards that slide when re-sorted; a large "Dealer" label and seat tint; trumps shown by the score; clearer "go alone" controls; dark-mode text fixes; game length from 5 to 21.

## Phase 8: Playing the app found rule gaps (26 to 27 Nov)

30. **The maker's partner may go alone** even when nobody else is: the engine hadn't allowed it. Rule fixed, then tested: **Finding 18** (go alone only with a hand that can march).
31. **After a turned-up Benny, the dealer decides on going alone after seeing their cards**, not blind. Alex spotted that the app asked too early. Engine, rules page, quiz and bots fixed.
32. **Finding 19** (240,000 hands): after a blind call, go alone with 4 or 5 trumps, or 3 with an off-suit Ace; the suit named makes no difference. Alex's tip added to the guide: players usually name the same suit for every blind call.
33. **Lesson:** using the real product surfaces questions the specification missed.

## Phase 9: Learn & improve (27 Nov)

34. **Two tracks**, for beginners and for seasoned players ("Learn" renamed "Learn & improve" so it reads as for both).
35. **The strategy guide inside the app**, and a **rules quiz** (39 questions).
36. **"Would you call?"**: real calling decisions, each measured by playing the hand out 300 ways. Starter and seasoned levels, 139 questions from 226 spots.
37. **Two views:** where the guide's rule of thumb and the simulator disagree, the quiz shows both and explains why they can differ (Alex's request).
38. **A fix:** "the guide's view" first came from the Medium bot, which sometimes contradicted the written guide. Replaced with the written guide's own rules.

## Phase 10: The logo (27 Nov)

39. **Ideas tried:** Cornish mining heritage (engine houses, beer mats), rejected by Alex.
40. **Chosen:** a **Cornish chough** (red beak and feet) perched on a **Joker card** with a jester's cap. Refined over several rounds: a real Joker card, not a card labelled "joker"; a slimmer, more chough-like beak; a true red, not brownish.
41. **Used for** the front page, browser tab and phone home-screen icon, and later the Benny card itself.
42. **Still open:** the app's name (a placeholder, "Euchre", for now).

## Phase 11: Teaching features (27 Nov)

43. **Your first hand:** one scripted deal in 19 steps, with a coach explaining each rule as it comes up; every move checked by the engine.
44. **Guided practice game:** a real game to 5 against Easy bots, with the coach's hint on every turn (calls from the written guide, card play from the Medium bot), the suggested card lifted and glowing, and "the guide would have said…" when you differ.
45. **The end of the practice game:** how often you made the guide's move, the moves where you went another way, and where to go next.
46. **"Where next?" endings** in place of dead ends (Alex: "these options are limiting").
47. **The Benny card redrawn** from the logo.
48. **New to Euchre reordered** as a progression: learn the game (rules, first hand, quiz) → play with a coach → make better calls.
49. **27 Benny questions** added to "Would you call?" (go alone, or keep your partner), each measured over 300 deals.

## Phase 12: About & feedback (28 Nov)

50. **An About & feedback page**, linked from the front page: built by Alex (linked to LinkedIn) using Claude, with a tap-to-email feedback button.

## Phase 13: Card-play puzzles (28 Nov)

51. **"What would you play?"**: puzzles from real hands. League bots deal and call; Monte Carlo bots play up to one of your turns with a real choice.
52. **Every card measured:** the hidden cards are dealt 300 ways, keeping only deals that fit the calls, who has run out of which suit, and the cards already played; the hand is then played out after each card. Spots where every card scores about the same are dropped.
53. **The bank:** 360 spots in 12 parallel batches (about 40 minutes), 186 puzzles kept: 79 starter (the guide's card is best and the wrong cards cost at least 0.4 points) and 107 seasoned. At most 12 of each kind (opening lead, later lead, trumping in, letting it go, loners...) per level, so no one situation dominates.
54. **The screen:** the contract, the tricks so far, the trick on the table; tap a card (cards you can't play are greyed). The answer shows each card's points, the guide's card with the coach's plain reason, a "Two views" box when they disagree, and a link to the guide section.
55. **Where it sits:** the starter level is a new stage in New to Euchre, "Play your cards well"; the seasoned level replaces "coming soon" in Sharpen your game.
56. **Fixes found while checking:** black suit symbols vanished in dark mode on the trick list; switching from one quiz level straight to the other kept the old question on screen (also fixed for "Would you call?").
57. **The logo on every page**, at Alex's request. First placed next to the back button; Alex preferred it on the right, so it now sits on the right of the green banner on Learn & improve and at the right-hand end of the header elsewhere (About already shows it in its card).
58. **A transparent version of the logo** (logo-mark.svg: the whole Joker card and chough, no green tile) for the green banner, after Alex noticed the tile's edges showing against a slightly different green.
59. **The transparent logo in the page headers too** (Alex's request). In dark mode the black chough vanished against the dark page, so the header logo gets a faint light outline there.

---

## How we worked: the pattern behind every step

- **Alex set the goal, the rules and the taste; Claude built, tested and explained.** Every rule question and every design choice went to Alex.
- **Small steps, each finished:** build → test → check it in the browser (phone size, dark mode) → commit → push → live in minutes.
- **Show, then refine:** most features took one or two rounds of Alex's screenshots and comments.
- **Evidence over opinion:** every strategy claim traces to a numbered finding, with how it was tested.
- **Plain language:** the guide, quizzes and coach explain *why*, not just *what*.

## Lessons for anyone building an app this way

1. Write the domain rules down first, with the expert, and treat them as the authority.
2. Get the core logic right and tested before any screens.
3. Calibrate simulations against real-world behaviour.
4. Measure the difference a choice makes on the same situation, not raw averages.
5. Put it in real users' hands early: playing it found two rule gaps the documents missed.
6. Use the expert's feedback on wording as much as on correctness.
7. Ship continuously: every change went live within minutes of being approved.

---

## Where we are now (28 Nov 2026)

**Done and live**
- Solo play against Easy, Medium and Hard bots, games of 5 to 21 points, resumable.
- Learn & improve: rules, Your first hand, rules quiz, guided practice game, "Would you call?" (starter and seasoned, now with Benny questions), "What would you play?" card-play puzzles (starter and seasoned), the strategy guide and its one-page card.
- The strategy guide with 19 findings, as a document and a PDF.
- Logo, icons, the Benny card, About & feedback.

**Waiting on Alex**
- The app's name (and then a domain).
- A review of BIDDING_QUIZ_REVIEW.md, the quiz questions where the guide and the simulator disagree. Possible re-tests flagged there: Up and Down with 3 trumps; round-two loners with 3 strong trumps.

## Next steps

1. **Coached play and hand review:** play the Hard bots, then see which decisions cost points.
2. **Your weak spots:** your accuracy by topic, so you know what to practise (the puzzles are already tagged by topic).
3. **More opening-lead puzzles:** they come up less often, so the bank has fewer of them; a targeted run could add more.
4. **Play with friends:** online games with a room code (a small server on Render holding each game; each player sees only their own cards).
5. **Name and domain:** once chosen, a one-line change in the app's settings.
6. **Spread the word in the league:** gather feedback through the About page, and keep testing new strategy ideas players bring.

---

## A suggested slide outline

1. **Title:** Building a Euchre app with AI: from pub rules to a live app in 12 days
2. **The problem:** a Cornish pub game with its own rules, and no app that plays them or teaches them
3. **The approach:** rules → engine → simulate → strategy guide → app
4. **Rules first:** writing the house rules with the expert
5. **The engine and bots:** a complete, tested game; bots tuned to play like the league
6. **Asking the computer:** same-hand experiments, 19 findings (one example: the Benny loner table)
7. **The guide:** numbers turned into table-ready advice, with reasons
8. **The app goes live:** solo play, deployed in a day; a day of fixes from real play
9. **Real use finds real gaps:** two rule fixes, two new findings
10. **Teaching:** first hand, coached practice game, calling quizzes and card-play puzzles with "two views"
11. **Brand:** the chough on the Joker
12. **How we worked:** the build → test → check → ship loop; who did what
13. **By the numbers:** 96 commits, 11,500 lines, 111 tests, 19 findings, 12 days
14. **Lessons**
15. **What's next:** hand review, weak spots, multiplayer, a name
