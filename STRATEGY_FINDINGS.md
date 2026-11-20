# Strategy Findings

*From computer simulations of the **Lizard Peninsula Euchre League** rules (see [EUCHRE_RULES.md](EUCHRE_RULES.md)).*

These findings come from bots playing hundreds of thousands of hands under league rules. They are **evidence, not gospel**: the bots are decent but not expert, and real opponents bid differently. Each finding says how strong the evidence is.

---

## Finding 1: Round one, ordering up and picking up

*Experiment run 16 Nov 2026. 200,000 deals and about 640,000 decisions, run twice (the second time with bots retuned from the first run's results).*

### How it was tested
Each time a player had to decide in round one, the same hand was played out every way they could have called it: **pass**, **order up**, or **go alone**. Everything else stayed the same, so any difference in points comes from that one decision. The tables show the **average net points per hand** for that player's team (their points minus the opponents'). A score of 0-0 was assumed.

"Trumps" counts the Benny and the Left Bower. For the dealer, trumps are counted **after** picking up and discarding, so they **include the card picked up**: "2 trumps" means the upcard plus 1 of the dealer's own. This applies to every dealer trump count in these findings.

### The short version

| Your seat | Pass unless you have… | Go alone with… |
|---|---|---|
| **Left of dealer** | 4 trumps (rarely worth just ordering up) | 4 trumps, including two of Benny / Right / Left |
| **Dealer's partner** (Up and Down) | 4 trumps | Up and Down is always alone |
| **Right of dealer** | Almost never order up, even with 4 trumps | Very rarely |
| **Dealer** | 3 trumps after picking up | 4 trumps, or 3 including the Benny |

### What's behind it

**1. Ordering the dealer up costs more than people think.** Ordering up from the dealer's left or right hands the dealer an extra trump. The bots did better **passing** with 3 trumps from either seat: about +0.6 net points by passing versus about 0 by ordering up. Passing keeps two good chances open: euchring the dealer's team if they call, or naming your own suit in round two.

| Left of dealer, by trumps | Pass | Order up | Alone |
|---|---:|---:|---:|
| 2 trumps | −0.05 | −0.90 | −1.74 |
| 3 trumps | **+0.56** | −0.01 | −0.41 |
| 4 trumps | +1.03 | +0.90 | **+1.08** |

From the **right of the dealer** it's even stronger. Passing beat ordering up even with 4 trumps (+1.25 versus +0.85).

This matches league experience: ordering up in round one is rare at the table.

**2. The dealer should pick up with 3 trumps and go alone with 4.** The dealer is the one seat where picking up pays, because the upcard goes into *their* hand.

| Dealer, trumps after pick-up | Pass | Pick it up | Alone |
|---|---:|---:|---:|
| 2 | −0.13 | −0.17 | −1.11 |
| 3 | −0.07 | **+0.56** | +0.30 |
| 4 | −0.02 | +1.18 | **+1.53** |
| 5 | −0.03 | +1.67 | **+3.03** |

With 2 trumps it's a toss-up, close enough that the score or a good off-suit Ace should decide it.

**3. Up and Down needs 4 trumps.** Because the dealer's partner always plays alone when they order up, 3 trumps isn't enough. Even 3 trumps with two top trumps came out behind passing.

| Dealer's partner, by trumps | Pass | Up and Down |
|---|---:|---:|
| 3 | **+0.79** | −0.05 |
| 4 | +0.96 | **+1.29** |

**4. Holding the Benny makes passing in round one more attractive.** The Benny is trump whatever suit is named, so it never loses value if you pass. A dealer holding the Benny with 2 trumps did much better passing (+0.90) than picking up (+0.17). Their team still had round two to come, with a guaranteed top trump in any suit.

**5. A trap: passing with a monster hand.** Holding the Benny, Right **and** Left Bower on the dealer's left, passing (+2.04) beat ordering up (+1.33) and going alone (+1.66). The opponents often call into the hand, and you euchre them, sometimes defending alone for 4. ⚠️ This depends on opponents calling freely, as the bots do. Against cautious opponents it could backfire.

### How much this matters
Bots retuned with these findings won **60.8%** of games against the original bots (20,000 games to 10, sides swapped every game, ±0.7%). Round-one bidding alone made that difference.

### Caveats
- **Bots, not people.** The bots' card play is simple: they draw trump with the boss, lead off-aces, let it go when their partner's winning, and win cheaply. Better play would shift some numbers.
- **Score not considered yet.** Everything assumes 0-0. Near the end of a game, for example when you're "in the hole", the right call can be different.
- **The bots' dealer was looser than this advice.** These runs used bots whose dealer picked up from a strength of about 4 (roughly 2 trumps). Later tests showed the exact threshold barely matters in games (see the note in Finding 2), so the bots now pick up from 5.5, closer to league play.
- **Groups with fewer than 300 hands aren't shown.** Rows marked "(close)" in the full results are within statistical noise.
- Full tables are produced by `npm run exp:order-up` in the `results/` folder (not saved in git).

---

## Finding 2: Round two, naming trump, and "against colour"

*Experiment run 16 Nov 2026 (run 2). 1,000,000 deals, with about 395,000 round-two decisions. The bots were calibrated so round two comes up in about **a third of hands** (33.6%), matching the league's estimate of 30–35%.*

### How it was tested
Whenever a player had a turn in round two, the same hand was played out **7 ways**: pass, or each of the three suits they could name, with or without going alone. As before, numbers are **average net points per hand** for that player's team.

"Same colour" means the suit of the same colour as the turned-down card ("next"). In league terms, **against colour** means:
- for the **non-dealing team**: naming the **opposite** colour
- for the **dealing team**: naming the **same** colour

### The short version

| Your seat | Name a suit with… | Go alone with… |
|---|---|---|
| **Left of dealer** | 3 trumps, preferably in **next**. 2 trumps in next is a toss-up. | 4 trumps |
| **Dealer's partner** | 3 trumps in an **opposite-colour** suit. Avoid next unless you have 4. | 4 trumps |
| **Right of dealer** | 3 trumps in **next**; 3 in an opposite-colour suit is a toss-up | 4 trumps (close to just naming it) |
| **Dealer** | Too few hands reached the dealer to say (see the note below) | |

By the time round two reaches the right of the dealer or the dealer, both players before them have passed twice, which tells you something about their hands. Those seats get the turn less often, so their numbers are less certain.

### 1. "Make next" is right for the non-dealing team

Hold the hand the same (same number of trumps and top trumps) and compare naming next with naming an opposite-colour suit. For the **left of the dealer**, next is worth about **+0.3 to +0.6 net points more per hand**:

| Left of dealer, naming the suit vs passing | Next | Opposite colour (against colour) |
|---|---:|---:|
| 2 trumps, 1 top trump | **+0.13** | −0.31 |
| 3 trumps, 1 top trump | **+0.57** | +0.09 |
| 4 trumps, 2 top trumps | **+1.56** | +0.99 |

With 3 trumps, naming next beats passing comfortably. With 3 trumps in an opposite-colour suit it's only slightly better than passing.

### 2. For the dealing team it's the reverse: avoid next

For the **dealer's partner**, naming the **same** colour (against colour for the dealing team) costs about **0.2 to 0.9 net points per hand** compared with the same hand in an opposite-colour suit:

| Dealer's partner, naming the suit vs passing | Opposite colour | Next (against colour) |
|---|---:|---:|
| 2 trumps, 1 top trump | **+0.11** | −0.29 |
| 3 trumps, 0 top trumps | **+0.39** | −0.39 |
| 3 trumps, 1 top trump | **+0.60** | +0.02 |
| 4 trumps, 1 top trump | **+1.40** | +0.75 |

**Why:** the dealer turned the card down, which hints that the dealing team is short in that colour. The data backs up the table wisdom in your glossary: *"if the upcard was turned down, the dealer's team is weak in that colour."* So "against colour" is a real risk for both teams.

### 3. The Benny weakens the colour effect
When your trumps include the Benny, the advantage of following colour roughly halves (about +0.2 to +0.3 instead of +0.4 to +0.6 for the left of the dealer). The Benny is trump whatever suit you name, so colour matters less when it's carrying your hand.

### How much this matters in a game
- Bots using these round-two thresholds beat bots without them **50.9%** of the time (20,000 games to 10, ±0.7%).
- The colour rule **on its own** won 50.3% (40,000 games, ±0.5%), which is within noise over whole games. It's clearly right hand by hand, but it only changes the call when two suits are close in strength.

### Note: run 1 was skewed, and why
The first run of this experiment (also 16 Nov) used bots whose dealer picked up **74%** of hands, so round two came up in only about **15%** of hands. That's far less than at the league. Tests showed how loosely the dealer picks up makes almost no difference to winning games (anywhere from strength 4 to 6.5 wins about 50%), so the bots were recalibrated to pick up from 5.5. That brings round two to about a third of hands. Run 2 confirmed the colour findings but corrected one point: **2 trumps in next from the dealer's left** looked like a call in run 1, but is really a toss-up.

### Caveats
- Who reaches round two depends on how the earlier players bid in round one. These bots rarely order up from the dealer's left or right (see Finding 1), and league players confirm that's rare at the table too.
- Same caveats as Finding 1: bot card play is simple, and the score was always 0-0.
- Full tables are produced by `npm run exp:round-two` in the `results/` folder.

---

## Finding 3: Going alone after the call (defending alone, taking over, answering)

*Experiment run 16 Nov 2026, three times. Run 3 used 2,000,000 deals and about 1.6 million decisions, with bots calibrated to the league: makers go alone in about **1 hand in 10**, someone defends alone in about 1 in 20, and round two comes up in about a third of hands. All three runs agreed closely, including runs with loners at 1 in 3 and 1 in 7.*

### How it was tested
Whenever a player had an after-the-call turn where going alone was allowed, the hand was played out both ways from that exact point: **pass** or **"Drop"**. Numbers are average **net points per hand** for that player's team. The "euchre" columns show how often the makers were euchred. A dealer who picks up the upcard is judged on their hand after picking up and discarding.

### The short version

| Situation | Worth it with… |
|---|---|
| **Defend alone against two makers** | 3 trumps including a top trump (Benny, Right or Left). Clearly with 4. |
| **Defend alone against a loner** | Only with 3 trumps including the Benny, or 4 trumps including a top trump |
| **Take over your partner's loner** | Almost never. Even 3 trumps with two top trumps loses about a point. |
| **Dealer takes over Up and Down** | Only with 4 trumps after picking up |
| **Take over your partner's lone defence** | Almost never (rare exception: 3 trumps with a top trump) |
| **Answer a lone defender** | Never. It costs 2–3 points per hand. |

### 1. Defending alone against two makers pays more often than you'd think

Defending alone makes a euchre less likely, because your partner's cards are gone, but a euchre is then worth **4 instead of 2**. With 3 decent trumps the trade is worth it:

| Defender's hand (in trump) | Pass | Defend alone | Euchre if pass | Euchre if alone |
|---|---:|---:|---:|---:|
| 2 trumps, 1 top | −0.21 | −0.71 | 27% | 7% |
| 3 trumps, no top | +0.03 | −0.28 | 35% | 15% |
| 3 trumps, 1 top | +0.41 | +0.43 | 47% | 29% |
| 3 trumps, 2 top incl. Benny | +1.21 | **+2.10** | 74% | 62% |
| 4 trumps, 1 top | +0.94 | **+1.89** | 65% | 58% |

Bots using these thresholds defend alone in about 1 hand in 20, the same as at the league.

### 2. Defending alone against a loner needs more
Against a single opponent, your partner's help matters less, but the loner is usually strong. Only **3 trumps including the Benny** (+0.40 versus +0.12) or **4 trumps including a top trump** (+0.80 versus −0.04) came out ahead. The rarer loners are, the stronger they tend to be, so the bar is high.

### 3. Don't drop a partner who has already gone alone

| Taking over partner's loner | Pass (let partner play) | Take over |
|---|---:|---:|
| 2 trumps, 1 top | +1.77 | −0.67 |
| 3 trumps, 1 top | +1.81 | +0.91 |
| 3 trumps, 1 top incl. Benny | +1.86 | +0.71 |

Your partner only went alone with a strong hand. Dropping them throws that hand away and replaces it with yours. The one exception is the **dealer in Up and Down with 4 trumps after picking up** (+2.42 versus +2.02). The dealer gets the upcard and a discard, so their hand can genuinely be better.

**Answering a lone defender** is worse still: with 2 trumps it costs about 3 points per hand. The lone defender is strong, and halving your own team only helps them.

### How much this matters in a game
Bots using these after-call settings beat bots without them **50.7%** of the time (40,000 games to 10, ±0.5%). It's a small edge, because these situations don't come up often.

### Open question: should dealers go alone more?
Finding 1 suggested a dealer should go alone from about **3 trumps with a top trump** after picking up. Bots that do that go alone in about **1 hand in 3**, far more than the league's estimate of 1 in 10 to 1 in 12. Cutting loners to league levels (1 in 10) cost the bots about **2.5% of games**. There are two possible explanations:
- **League players could profitably go alone more often**, or
- **the bots defend badly against loners**, which makes loners look better than they are.

There is evidence for the second. Against a loner, a defender with a very strong hand sometimes euchred the loner **more often alone than with their partner** (85% versus 49% with 3 trumps including Benny and another top trump). That suggests the bot partners get in each other's way. (Seen in runs 1 and 2; too few such hands in run 3 to show.) A stronger bot (Monte Carlo, which plays out possible hands before each card) would settle this.

### Caveats
- Same caveats as Findings 1 and 2: bots, not people, and the score was always 0-0.
- Some situations are rare, so rows with fewer than 300 hands aren't shown.
- Full tables are produced by `npm run exp:alone` in the `results/` folder.

---

## Finding 4: When the dealer should go alone (testing the league rule)

*Experiment run 16 Nov 2026. 1,000,000 deals, with 429,000 dealer decisions holding 3+ trumps after picking up. Bots calibrated to the league (loners about 1 in 10).*

**The league rule of thumb:** the dealer should go alone with **at least 3 big trumps and only one suit outside, preferably an Ace.** Here, "big trumps" means the Benny, Right, Left and Ace of trumps. Hands were grouped by their shape **after picking up and discarding**, and each was played out three ways: pass, pick up, and pick up alone.

### The rule holds up

| Dealer's hand after the discard | Pick up | Alone | Alone march | Verdict |
|---|---:|---:|---:|---|
| 3 trumps, all big, outside **Ace** | +1.44 | **+2.27** | 45% | Alone, clearly |
| 3 trumps, all big, outside card not an Ace | +1.13 | +1.10 | 11% | Toss-up |
| 4 trumps, 3 big, outside Ace | +1.68 | **+3.19** | 73% | Alone, clearly |
| 4 trumps, 3 big, no outside Ace | +1.40 | **+1.72** | 24% | Alone |

"Preferably an Ace" is exactly right. With 3 trumps, the outside Ace is what turns a toss-up into a clear loner.

### Where the data goes further

| Dealer's hand after the discard | Pick up | Alone | Verdict |
|---|---:|---:|---|
| 3 trumps, 2 big, one outside suit, Ace | +1.10 | **+1.38** | Alone |
| 3 trumps, 2 big, two outside suits, Ace | +0.93 | **+1.14** | Alone |
| 3 trumps, 2 big, no outside Ace | +0.82 | +0.55 | Pick up |
| 4 trumps, 1 big, outside Ace | +1.12 | **+1.60** | Alone |
| 4 trumps, 2 big, outside Ace | +1.42 | **+2.45** | Alone |
| 4 trumps, 2 big, no outside Ace | +1.11 | +1.18 | Alone (narrowly) |
| 5 trumps, any | | | **Always alone** |

- **The outside Ace is the single biggest factor.** In every group it adds about 0.8 to 1.2 points to going alone.
- **One outside suit is better than two,** as the rule says. Two outside suits with an Ace still favour going alone.
- With **3 trumps and no outside Ace**, picking up is better however good the trumps are.

### How to read this
The league rule is a **safe, solid version** of what the data shows. The data suggests going alone a bit more often when you hold an outside Ace. That matches the open question in Finding 3. The same caveat applies: the bots may defend badly against loners, which would flatter going alone. Against good human defenders, the league rule may be just right.

### The two tests: a real chance of all 5, and no extra euchre risk
Going alone only gains when you take **all 5 tricks** (4 points instead of 2). Taking 3 or 4 scores 1 point either way. It costs when it turns a made hand into a **euchre**. So go alone when **both** of these are true:
1. you have a decent chance of all 5, and
2. going alone doesn't noticeably raise the risk of being euchred.

The average points above already weigh both, but here is how the hands actually end:

| Dealer's hand after the discard | All 5: partner → alone | Euchred: partner → alone | Average points: partner → alone |
|---|---|---|---|
| 3 big trumps, 1 outside suit, **Ace** | 48% → **45%** | 1% → **3%** | +1.44 → **+2.27** |
| 3 big trumps, 1 outside suit, no Ace | 22% → 11% | 3% → 7% | +1.13 → +1.10 |
| 3 trumps (2 big), 1 outside suit, Ace | 27% → 21% | 5% → 9% | +1.10 → +1.38 |
| 4 trumps (1 big), 1 outside suit, Ace | 28% → 25% | 5% → 5% | +1.12 → +1.60 |
| 3 trumps (2 big), no outside Ace | 13% → 5% | 10% → 20% | +0.82 → +0.55 |

- **On a strong hand, your partner adds very little.** With 3 big trumps and an outside Ace, the chance of all 5 is 48% with partner and 45% alone. Going alone keeps nearly all the march chances and doubles what they're worth.
- **The outside Ace keeps both tests passing.** Without it, the chance of all 5 halves when you go alone, and the euchre risk doubles.
- **Weaker loners mostly score 1 point.** On a hand like 3 trumps with 2 big trumps and an Ace, about 70% of loners end with 3–4 tricks, scoring the same 1 point as with a partner. Going alone edges ahead only because about 1 in 5 becomes a 4-point march, against a small rise in euchres. That's a thin edge, and it's exactly where weak bot defence against loners would flatter the result.

**So the league rule is the safe line:** it goes alone only when both tests pass comfortably. The data rule also takes the borderline hands.

### Teaching the bots to think in hand shape
Bots were given each rule for the dealer's loner and played 40,000 games head to head (±0.5%). Everything else used the league-calibrated settings.

| Dealer's loner rule | Loners overall | Dealer loners | Result |
|---|---:|---:|---|
| Strength score (previous bots) | 1 in 10 | 0.9% of hands | baseline |
| **League rule** (3 big trumps, one outside suit) | 1 in 8 | 3.6% | Beats the strength score **51.0%** |
| **Data rule** (the "go alone" rows above) | 1 in 4 | 16.3% | Beats the strength score 52.8%, and the league rule **52.3%** |

- **The league rule is a real improvement** on a plain strength score, at a loner rate close to the league's own.
- **The data rule wins more against bots,** but by going alone in a quarter of hands. That's far more than at the league, and it's exactly the open question from Finding 3. Against good human defenders, the league rule may well be the better one.
- For the strongest bots, deciding the dealer's loner by shape played as well as the old approach (50.1%) with fewer loners. It's now their default.

Full table: `npm run exp:dealer-alone`, written to the `results/` folder.

---

## Finding 5: The Monte Carlo bot, and the loner question revisited

*Experiments run 17 Nov 2026.*

### A much stronger card player
The **Monte Carlo bot** imagines many possible deals of the cards it can't see (20 per decision), consistent with everything it has seen: its own hand, the cards played, who has shown out of a suit, and whether the dealer picked up. For each imagined deal it plays out every card it could play, then picks the one that scored best on average. It never peeks at hidden cards.

With **the same bidding**, Monte Carlo card play beat the rule bots' card play in **59.7%** of games (1,500 games to 10, ±2.5%). The rule bots' simple card play was the biggest weakness in Findings 1–4.

### Do extra loners still pay when everyone defends well?
Findings 3 and 4 left an open question: the bots did better going alone more often than the league does, but was that only because rule bots defend loners badly? To test it, **all card play** was done by the Monte Carlo bot, and only the dealer's loner rule differed (everything else used the league-calibrated settings). The main comparison ran **12,000 games** to 10, in four chunks of 3,000.

| Bidding | Goes alone (of its contracts) | Result vs league rule |
|---|---:|---|
| **League rule** (3 big trumps, one outside suit) | 12% | baseline |
| Data rule (Finding 4) | 25% | **51.7% (±0.9%)** |

All four chunks favoured the data rule (51.6%, 52.9%, 51.3%, 50.8%). A separate 3,000-game run with an even more loner-happy setting (dealer alone from strength 8) gave 51.7% (±1.8%).

### The gain from going alone, compared with keeping your partner
The question that matters is not how many points a loner scores, but **how many more it scores than the same hand would with your partner**. So the same dealer hands were played out both ways, with Monte Carlo card play throughout (60,000 deals):

| Dealer's hand | Hands | With partner: all 5 / 3–4 / euchred | Alone: all 5 / 3–4 / euchred | Points with partner | Points alone | **Gain from going alone** |
|---|---:|---|---|---:|---:|---:|
| **League rule says alone** | 2,139 | 54% / 45% / 1% | 46% / 51% / 3% | +1.51 | +2.27 | **+0.76** (±0.06) |
| **Only the data rule says alone** | 7,908 | 34% / 61% / 5% | 27% / 65% / 8% | +1.20 | +1.56 | **+0.36** (±0.03) |
| Neither rule (keep partner) | 2,338 | 12% / 63% / 26% | 4% / 48% / 48% | +0.35 | −0.33 | **−0.68** (±0.07) |

- **The league rule's loners gain +0.76 points per hand** over keeping partner.
- **The extra loners gain +0.36 per hand:** smaller, but clearly real. With partner these hands take all 5 about a third of the time (2 points); alone about a quarter of the time (4 points). Euchres rise only from 5% to 8%.
- **Hands neither rule picks lose 0.68 per hand** by going alone, so keeping your partner is clearly right there.
- **Small gains on many hands add up.** The extra loners are about 3.7 times as common as the league rule's, which is why they move the game win rate.
- **Good defence did not wipe out the extra loners.** With strong card play on both sides, the data rule still won (51.7%, compared with 52.3% under rule-bot play). So "the bots just defend badly" is **not** the explanation.

**Answer:** the league rule is sound, but **a little too cautious**. Going alone with more hands wins slightly more games: in particular **3 trumps (2 big) with an outside Ace**, and **4 trumps (2 big) even without one**. The extra loners mostly score 1 point, as you'd expect, but enough of them become 4-point marches to make them worth it.

One caution remains: this is bots against bots. Bidding is still rule-based (only the card play is Monte Carlo), and real opponents may defend loners differently.

Full results: `npm run exp:mc-loners -- 3000 league-v3-shape league-rule 20 <firstGame>` for each chunk, then `node experiments/mc-loners-combine.ts results/*-from*.json`.

---

## Finding 6: Calling by the score ("in the hole")

*Experiment run 17 Nov 2026. 600,000 deals in games to 10, with league-calibrated rule bots.*

### Why points stop mattering
Near the end of a game, what matters is **winning the game**, not points. On 9 in a game to 10, a 4-point loner is worth no more than 1 point, and a euchre can hand the opponents the game. So this experiment judges every choice by **how much it changes your chance of winning the game**.

First, a **win-chance table** was built by playing 2,000 games from every score (0–9 against 0–9), with each team dealing next. Two things stand out:
- **At 9–9, the team dealing next wins about 61% of the time.** The dealer's edge is large at the end.
- At 9 against 5, you win about 92% of the time. At 5 against 9, about 9%.

Then every calling decision was played out every way (pass / call / call alone), and the win chance after each outcome was compared. Situations are from the deciding team's point of view: **neither close** (both on 0–7), **we need 2** (on 8), **we need 1** (on 9, "in the hole"), **they need 1**, and **both need 1** (9–9).

Numbers below are **percentage points of game-winning chance** gained by calling instead of passing, or by going alone instead of keeping your partner. Bold = outside statistical noise. Dealer trump counts **include the card picked up** ("2 trumps" = the upcard plus 1 of their own).

### 1. At 9–9, call with almost anything, and never go alone

| 9–9, round one | Gain from calling vs passing | Gain from going alone vs keeping partner |
|---|---:|---:|
| Dealer, **1 trump** after picking up | **+4.7** | **−32.6** |
| Dealer, 2 trumps | **+24.1** | **−31.0** |
| Dealer, 3 trumps | **+42.6** | **−11.5** |
| Left of dealer, 3 trumps | **+10.0** | **−15.5** |
| Left of dealer, 2 trumps | **+2.6** | **−31.6** |

In round two at 9–9, naming your best suit gains **+20 to +49 points** of winning chance, **even with a single trump**. Whoever makes trump first wins with any 3 tricks, so passing hands the opponents the chance. Going alone adds nothing (one point wins) and only adds euchre risk. This confirms your glossary entry: *"both teams have a stronger incentive to call trump."*

### 2. In the hole (we need 1): call a bit more freely, never go alone

- **Dealer: pick up with 2 trumps** (+1.7). Normally that's slightly negative (−1.2).
- **Left/right of dealer:** still don't order up lightly. Even 3 trumps loses (−3.7). You need 4.
- **Going alone is never worth it** when one point wins: −0.1 to −9 points of winning chance in every case.

### 3. Needing 2 (on 8): don't go alone
A march with your partner (2 points) already wins the game, so going alone only adds risk. It was negative in every group, for example the dealer with 4+ trumps: −1.4. Calling thresholds are about the same as usual, slightly stricter, because a euchre hurts more.

### 4. When they need 1: be bolder
- **Going alone is worth more:** you need big points to catch up. Dealer with 4+ trumps: **+5.3** for going alone. Round two with 4+ trumps from the dealer's left: **+3.4**.
- **Round two: name more freely.** From the dealer's left, naming with only 1–2 trumps gains about **+2.0**. If you pass, the opponents may call, and one more point wins it for them.
- Round one ordering up from the dealer's left or right is still not worth it.

### Testing a league theory: "if the opposition is in the hole, the dealer should always call"
Tested on 1.5 million deals with the opponents on 9 and our team on 0–8, our player dealing.

**Round one: only with 3+ trumps.** Picking up a weak hand risks a euchre, which hands them the game:

| Dealer's trumps after picking up | Win chance if pass | If pick up | Gain from picking up |
|---:|---:|---:|---:|
| 1 | 8.1% | 5.2% | **−2.9** |
| 2 | 9.4% | 8.3% | **−1.0** |
| 3 | 10.5% | 12.1% | **+1.7** |
| 4+ | 11.6% | 16.7% | **+5.2** |

**Round two: yes, call.** If everyone passes and it comes back to the dealer, calling beats a throw-in. A throw-in keeps the score where it is **and gives the opponents the next deal**, which is the dealer's edge, for the team that only needs one point:

| Dealer's trumps in their best suit | Win chance if thrown in | If call | Gain from calling |
|---:|---:|---:|---:|
| 2 | 9.6% | 12.0% | **+2.5** |
| 3 | 9.2% | 15.1% | **+6.0** |
| 4+ | 9.3% | 19.6% | **+10.4** |

**As a whole policy,** "the dealer always calls in both rounds" did slightly worse than normal play: about −0.7 points of win chance on average, over 5,000 games from each score (us 0–8, them 9). It wasn't better at any score. The weak round-one pick-ups cost more than the round-two calls gain.

**How often does "always pick up" survive?** Over about 358,000 hands where it came round to the dealer in round one with the opponents on 9:

| Dealer's trumps after picking up | Always pick up: we make it | Always pick up: euchred (they win) | If pass: they win on this hand | If pass: we score |
|---|---:|---:|---:|---:|
| 1 | 37% | 63% | 67% | 33% |
| 2 | 59% | 41% | 65% | 35% |
| 3 | 81% | 19% | 62% | 38% |
| 4+ | 96% | 4% | 59% | 41% |
| **All hands** | **69%** | **31%** | **63%** | **37%** |

So the dealer who always picks up **stays in the game about twice as often** (69% against 37%). Yet the chance of winning the game barely changes, because:
- **After picking up and making it,** you usually score just 1 point. They still need only 1, and **they deal next**.
- **When you pass and survive,** it's usually because you **euchred them for +2**, which leaves you much closer to winning.

For example, at 5–9 with 2 trumps: picking up survives 59% of the time but leaves you on 6 against their deal (about a 12% chance of winning from there). Passing survives 35% of the time but leaves you on 7 (about 20%). These come out nearly even.

**Refined rule:** when the opponents are in the hole, the dealer picks up in round one **only with 3+ trumps**, but **always calls if it comes back round in round two** (2+ trumps in the best suit, which is almost every hand).

*Caveat:* with these bots, round two almost never reaches the dealer (0.01% of hands), because someone names first. The round-two numbers come from a setup where the other three pass with plausibly weak hands (no suit of strength 5+), not from natural play.

### 5. Neither close
Matches Finding 1: the dealer picks up with 3 trumps, the left and right rarely order up, and going alone pays with 4 trumps.

### Summary table: what changes with the score

| Score | Calling | Going alone |
|---|---|---|
| Neither close | As Findings 1–2 | As Findings 3–5 |
| We need 2 | About the same | **Don't**: a march with partner wins |
| We need 1 (in the hole) | Dealer a bit looser (2 trumps) | **Never** |
| They need 1 | Round two looser | **More often**: you need the points |
| Both need 1 (9–9) | **Call with almost anything**, especially the dealer and in round two | **Never** |

### Teaching the bots to call by the score
The bots were given these rules as an on/off option:
- **Both need 1:** the dealer always picks up; the left of the dealer orders up with 2+ trumps, the right with 3+; always name in round two; never go alone.
- **We need 1:** the dealer picks up with 2+ trumps (including the upcard); never go alone.
- **We need 2:** never go alone.
- **They need 1:** the dealer picks up only with 3+ trumps and goes alone with 4+; name more freely in round two; the dealer always calls if it comes back round.
- **Never defend alone** when a normal euchre already wins the game.

Head to head against identical bots that ignore the score (same deals, sides swapped):

| Bot settings | Full games (100,000) | Games starting from 7–9 each (60,000) |
|---|---:|---:|
| League-calibrated, league loner rule | **50.9%** (±0.3) | **51.8%** (±0.4) |
| Strongest (shape rule) | **50.8%** (±0.3) | **51.9%** (±0.4) |

Calling by the score wins about **1 extra game in 100** overall, and about **2 in 100** in games that are already close. The gain is small over a whole game because the score only matters in the last few hands. Score-aware calling is now on by default for the strongest bots.

### Caveats
- Rule bots and rule-bot card play.
- Games to 10 only. Games to 15 or 20 will have the same pattern near the end, but the table needs rebuilding for each target.
- Full tables: `npm run exp:win-chance`, then `npm run exp:score-aware`, written to the `results/` folder.

---

## Finding 7: Where you sit changes what to do with a strong hand

*Experiment run 18 Nov 2026. 250,000 deals; about 23,000 strong-hand decisions (including 2,000 with the Benny, Right and Left). Monte Carlo card play for all four players, league-calibrated bidding.*

**League theory:** with the Benny, Right and Left on the **dealer's left** you can pass, because you have first call in round two if the dealer doesn't pick up. On the **dealer's right** you should order up, or in round two your partner or the dealer's partner may call another suit.

Each strong hand (in the upcard's suit) was played out three ways from the player's round-one turn. Numbers are average net points per hand.

| Hand (in the upcard's suit) | Seat | Pass | Order up | Alone | Best |
|---|---|---:|---:|---:|---|
| **Benny + Right + Left** | **Left of dealer** | **+2.19** | +1.42 | +2.09 | **Pass** |
| **Benny + Right + Left** | **Right of dealer** | +1.08 | +1.27 | **+1.59** | **Go alone** |
| 4+ trumps | Left of dealer | +0.85 | +0.93 | **+1.10** | Go alone |
| 4+ trumps | Right of dealer | +0.85 | +0.88 | +0.78 | Toss-up |
| 3 trumps, 2 top trumps | Left of dealer | **+1.05** | +0.57 | +0.43 | Pass |
| 3 trumps, 2 top trumps | Right of dealer | **+0.88** | +0.53 | −0.05 | Pass |

**The theory is confirmed.** On the left, passing is best. On the right, passing is the **worst** choice, and going alone is best.

### Why: what happens after you pass with the Benny, Right and Left

| From the dealer's **left** | How often | Points |
|---|---:|---:|
| Round 2: **you** name trump | 77% | +2.25 |
| Dealer picks up, and you euchre them | 23% | +2.00 |

| From the dealer's **right** | How often | Points |
|---|---:|---:|
| Round 2: your **partner** names the other colour | 36% | +0.66 |
| Dealer picks up, and you euchre them | 20% | +2.00 |
| Round 2: your partner names the same colour | 18% | +1.51 |
| Round 2: an **opponent** names the other colour | 17% | −0.11 |
| Round 2: you get to name | 9% | +1.97 |

- **From the left, every outcome is excellent.** Either the dealer picks up into your hand and you euchre them, or you name trump first in round two.
- **Naming next keeps all three top trumps.** In the same-colour suit, the Benny is still trump, your Left Bower becomes the Right Bower, and your Right Bower becomes the Left. So passing costs you nothing.
- **From the right,** half the time someone else names trump in round two. When it's the other colour, your bowers become ordinary Jacks.

### Other seat effects
- **4 trumps:** going alone pays on the dealer's left (+0.25 over passing). On the right it's a toss-up.
- **3 trumps with 2 top trumps:** pass from either seat, but passing is worth more from the left (+1.05 against +0.88), again because of first call in round two.
- **General principle:** the dealer's left can **afford to wait**, because round two comes to them first. The dealer's right **can't**: if they pass, two other players get to name before them in round two.

### Teaching the bots
The bots now use a seat-aware rule in round one:
- **Dealer's left:** pass with the Benny, Right and Left; go alone with 4+ trumps.
- **Dealer's right:** go alone with the Benny, Right and Left; otherwise as normal.

Head to head over **400,000 games** (rule-bot card play), seat-aware bots won **50.1%** (±0.2%), too small a difference to measure. That's expected: these hands are rare (the Benny, Right and Left in the upcard's suit turns up for a given player in about 0.4% of deals). So even a gain of nearly a point per hand adds up to perhaps 1 extra game in 300–500. The hand-by-hand evidence above is solid, so the rule is on by default for the strongest bots.

Full results: `npm run exp:seat`, written to the `results/` folder.

---

## Finding 8: Card play (opening lead, trumping in, let it go)

*Experiments run 18 Nov 2026. 160,000 hands bid and played by Monte Carlo bots; about 250,000 card decisions. Whenever a tactic applied, the hand was played out from that exact card each way (all four players Monte Carlo). Numbers are average net points per hand for the deciding player's team. Only four-handed hands (no loners). Gaps under about 0.05 are within noise.*

### 1. Opening lead by the makers: draw with the top trump; never open with an off-suit Ace

| Makers' leader holds… | Highest trump (draw) | Low trump (gone fishing) | Low off-suit | Off-suit Ace |
|---|---:|---:|---:|---:|
| 2 trumps, **including the top trump** | **+0.59** | +0.44 | +0.50 | +0.36 |
| 3+ trumps, **including the top trump** | **+1.07** | +0.77 | +0.95 | +0.38 |
| 2 trumps, not the top trump | +0.25 | **+0.28** | +0.20 | +0.22 |
| 3+ trumps, not the top trump | +0.78 | **+0.79** | +0.67 | +0.29 |

- **Holding the top trump outstanding: draw with it.** That's clearly the best lead.
- **Without it, gone fishing and drawing are equally good.** The difference is within noise.
- **An off-suit Ace is the makers' worst opening lead,** especially with 3+ trumps (about +0.3 against +1.0). Draw trump first and cash the Ace later.
- The **maker's partner** leading with one trump should lead it (+0.78, against +0.50 for low off-suit).

### 2. Opening lead by the defenders: lead an off-suit Ace if you have one; don't lead trump

| Defender's leader holds… | Off-suit Ace | Low off-suit | Low trump |
|---|---:|---:|---:|
| 1 trump, an off-suit Ace | **−0.75** | −0.82 | −0.85 |
| 2 trumps, an off-suit Ace | **−0.11** | −0.19 | −0.35 |
| 1 trump, no off-suit Ace | | **−1.00** | −1.13 |
| 2 trumps, no off-suit Ace | | **−0.40** | −0.70 |

### 3. Trumping in: almost always trump in
When you're out of the suit led and an opponent is winning, trumping in beat throwing off in **every** situation tested:
- **Last to play, or one opponent still to play:** better by about **+0.4 to +1.0**.
- **Two players still to play:** a smaller gain, about **+0.1 to +0.2**, because someone may still over-trump.

### 4. Let it go, when your partner is already winning: only if their card is safe

| Situation | Let it go | Take it |
|---|---:|---:|
| You're last to play (makers) | **+0.81** | +0.42 |
| You're last to play (defenders) | **+0.39** | −0.16 |
| Opponent still to play, partner's card **can't** be beaten (makers) | **+1.13** | +0.91 |
| Opponent still to play, partner's card **can't** be beaten (defenders) | **+0.22** | −0.14 |
| Opponent still to play, partner's card **could** be beaten (makers) | +0.78 | **+1.00** |
| Opponent still to play, partner's card **could** be beaten (defenders) | −0.18 | **+0.10** |

**Let it go when your partner's card is safe. Take the trick when an opponent still to play could beat it.**

### 5. Let it go, when your partner plays after you: only with a weak hand
You play before your partner and could win the trick now, but go low to save your better cards for later tricks:

| Your side, and your trumps | Win it now | Go low (leave it to partner) |
|---|---:|---:|
| Makers, 3+ trumps | **+0.76 to +1.09** | +0.56 to +0.79 |
| Makers, 2 trumps | **+0.42 to +0.95** | +0.23 to +0.72 |
| Makers, 1 trump | **+0.18 to +0.54** | −0.08 to +0.24 |
| Defenders, 2–3 trumps | **−0.24 to +0.25** | −0.38 to +0.10 |
| Defenders, **1 trump**, your winner can't be beaten | −0.50 | **−0.42** |
| Defenders, **1 trump**, your winner could be beaten (suit led) | −0.74 | **−0.68** |

- **With 2+ trumps, win it now.** It's better by about 0.2–0.3 points. If your hand is strong overall, you don't need to save anything.
- **With a weak hand, especially as a defender with 1 trump,** going low is as good or slightly better. You keep your one good card for a later trick.
- Overall it's a **narrow tactic**: in most situations, take a trick you can win.

### Teaching the bots: some tactics need good follow-up play
Each of the three new card-play rules was given to the rule bots on its own and tested over 100,000 games:

| Rule added | Win rate vs bots without it |
|---|---:|
| **Take the trick when an opponent still to play could beat your partner's card** | **51.3%** (±0.3) ✅ |
| Weak defender (1 trump or none) goes low, leaving it to partner | 49.4% (±0.3) ❌ |
| Makers open with a low trump when not holding the top trump (gone fishing) | 48.8% (±0.3) ❌ |

The tactics in sections 1 and 5 were measured with **strong play for the rest of the hand**. With the rule bots' simpler play for the remaining tricks, they backfire. For example, gone fishing gives away the lead cheaply, and only pays if the following tricks are played well. The lesson applies to people too: **the subtler tactics need good follow-up play.** The plain rule, taking a trick your partner could lose, works even for a simple player. The bots now use only that one.

### Caveats
- These test one card choice at a time, with strong (Monte Carlo) play for everything else.
- Loner hands were left out; they need their own tests.
- Full tables: `npm run exp:card-play`, written to the `results/` folder.

---

## Finding 9: The opening lead, and the player on the dealer's left

*Experiment run 19 Nov 2026. 120,000 deals. Monte Carlo card play for all four players, league-calibrated bidding. Part A: about 99,000 four-handed hands, each played out four times. Part B: about 120,000 call-or-pass decisions.*

**Question:** the player on the dealer's left always leads the first trick. Can they take advantage of that, beyond passing with the Benny, Right and Left (Finding 7)?

### Part A: leading the first trick is worth very little in itself
Each hand was played out with the same cards and trump, changing **only who leads the first trick**. Numbers are the change in net points for the left player's team if they had **not** led (bold = outside noise).

| Left player is… | Hands | Leads (normal) | Plays second | Plays third (partner leads) | Plays last (back hand) |
|---|---:|---:|---:|---:|---:|
| **Maker** | 25,347 | +0.54 | **−0.03** | −0.01 | −0.00 |
| Maker's partner | 2,345 | +0.75 | **+0.10** | **+0.08** | −0.00 |
| Maker's partner, **no trumps** | 526 | +0.44 | **+0.33** | **+0.24** | **+0.12** |
| **Defender** | 71,312 | −0.60 | **+0.03** | **+0.07** | **+0.04** |
| Defender, 2 trumps | 23,288 | −0.33 | +0.00 | **+0.11** | **+0.09** |
| Defender, **3+ trumps** | 5,965 | +0.49 | **+0.10** | **+0.14** | **+0.18** |

- **For a maker, the opening lead is worth only about 0.03 points per hand.** Holding the trumps matters; who leads hardly does. It's **not a reason to call on a weaker hand.**
- **For a defender, leading is a slight disadvantage.** A defender with trumps would rather sit **behind** the makers (back hand), so they can over-trump or let it go. The gain is +0.18 for a defender with 3+ trumps playing last.
- The left player is a **defender in about 70%** of hands, so most of the time the lead isn't helping them at all.
- **Worst case:** the maker's partner on the left with **no trumps**. They have to lead from nothing, and would be +0.33 better off playing second.

### Part B: calling by seat, the same hand on the left and the right
Call against pass for the same hand shape. If the left player's team makes trump, the left player leads. If the right player's team makes it, the left player (an opponent) leads.

**Round one (order up, keep partner), trumps in the upcard's suit:**

| Hand | Left: call vs pass | Right: call vs pass | Left minus right |
|---|---:|---:|---:|
| 2 trumps (any) | **−1.11** | **−0.93 to −1.17** | small |
| 3 trumps, no or 1 top trump | **−0.52 to −0.76** | **−0.62 to −0.82** | +0.07 to +0.10 |
| 3 trumps, **2+ top trumps** | **−0.54** | **−0.28** | **−0.27** |
| 4+ trumps, 1 top trump | **+0.29** | +0.06 | +0.23 (noise) |
| 4+ trumps, **2+ top trumps** | −0.04 | **+0.32** | **−0.37** |

*(Top trumps = the Benny, Right and Left.)*

- **Ordering up with 2–3 trumps loses from either seat,** which confirms Finding 1.
- **The seat difference is in the strong hands, and it goes against calling from the left.** With 2 or more top trumps, ordering up is worth 0.27–0.37 **less** from the left than from the right. This is the Finding 7 effect: the left player gets first say in round two, so they can afford to pass. The right player can't.
- **4+ trumps with 2+ top trumps:** on the right, order up (+0.32). On the left, ordering up gains nothing over passing. (Finding 7 shows going alone is better still from the left.)

**Round two (name your best suit, keep partner):**

| Hand | Left of dealer (speaks first) | Right of dealer (speaks third) |
|---|---:|---:|
| 2 trumps, 1 top trump | **−0.20** | −0.11 |
| 3 trumps, 1 top trump | **+0.27** | **+0.55** |
| 3 trumps, 2+ top trumps | **+0.42** | **+0.37** |

- **On the left, name with 3 trumps including a top trump. Pass with 2.** Your partner and the right of dealer still get a chance.
- The right of dealer rarely gets a 3-trump chance in round two (about 300 hands each), but when they do, naming pays well, because passing usually means a throw-in.

### The short version
- **The opening lead is not much of an advantage in itself:** about 0.03 points per hand for a maker. Don't call lighter because you'll lead.
- **The left seat's real advantage is first say in round two.** With strong hands (2+ top trumps), pass more readily in round one from the left than from the right. Finding 7 is the extreme case of this.
- **As a defender, the back hand beats the lead** when you hold trumps.

No bot change was needed: the seat-aware rules from Finding 7 already cover the hands where this matters. (Finding 10 follows up the round-two result.)

### Caveats
- With strong players everywhere, the lead may matter less than at the pub, where an early lead can set the tone. The test can't measure that.
- Only four-handed hands; loners leave out a player and change who leads.
- Full tables: `npm run exp:lead`, written to the `results/` folder.

---

## Finding 10: Making next needs 3 trumps (or 2 and an off-suit Ace)

*Experiment run 20 Nov 2026. 240,000 deals; about 130,000 round-two decisions by the non-dealing team. Every suit the player could name with 2+ trumps was played out against passing, from the same position. Monte Carlo card play for all four players, league-calibrated bidding.*

**Question:** Finding 2 says the non-dealing team should make next. Finding 9 says the dealer's left should pass in round two with only 2 trumps. Which wins when the 2 trumps are in next?

### Both are right: next is much better, but 2 trumps still isn't enough
Gain from naming the suit (partner kept) instead of passing, for the player on the **dealer's left**. Bold = outside noise.

| Trumps in the suit | Top trumps | **Next** | Opposite colour |
|---|---|---:|---:|
| 2 | none | **−0.23** | **−0.67** |
| 2 | 1 | **−0.20** | **−0.60** |
| 2 | 2+ | **−0.18** | **−0.53** |
| 3+ | none | **+0.39** | +0.04 |
| 3+ | 1 | **+0.50** | **+0.14** |
| 3+ | 2+ | **+0.71** | **+0.30** |

*(Top trumps = the Benny, Right and Left in that suit.)*

- **Next is worth about 0.4 points more than the opposite colour** for every hand shape. Finding 2 holds strongly.
- **But with only 2 trumps, even next loses** (about −0.2). Passing is better, because your partner and the dealer's right still get a turn.
- **With 3 trumps, make next** even without a top trump (+0.39). The opposite colour needs a top trump to pay.

### The off-suit Ace tips the 2-trump hands

| 2 trumps in next, top trumps | With an off-suit Ace | Without |
|---|---:|---:|
| none | −0.11 | **−0.36** |
| 1 | −0.09 | **−0.32** |
| 2+ | +0.04 | **−0.31** |

- **2 trumps in next plus an off-suit Ace is about break-even.** Naming is fine.
- **2 trumps in next with no off-suit Ace: pass** (about −0.3).
- In the opposite colour, 2 trumps loses even with an Ace (−0.40 to −0.57).

The dealer's right (speaking third) shows the same pattern, from fewer hands: 2 trumps loses (−0.2 to −0.5), and 3 trumps in next pays well (+0.79 to +0.88).

### The rule
**Non-dealing team in round two: make next with 3 trumps, or with 2 trumps and an off-suit Ace. Don't name the opposite colour with only 2 trumps.**

### Teaching the bots
The bots were naming next with only 2 trumps about 80% of the time. That's a common hand: a left-of-dealer player holds 2 trumps in next in round two in about 1 deal in 8. With the new rule, the bots won **50.5%** (±0.2%) over **200,000 games**. It's a small gain but a real one, unlike the rare-hand rules of Finding 7. It's now on by default for the strongest bots.

### Caveats
- At the pub, "make next" with 2 trumps may be the common habit. The test assumes the passing player's partner and the dealer's right call sensibly after them.
- Full tables: `npm run exp:next`, written to the `results/` folder.

---

## Testing a new strategy idea

New ideas from league play can be tested at any time, the same way as Findings 4–7:
1. **Hand by hand:** play the same hands both ways (the idea against the alternative) with Monte Carlo card play, and measure the **gain over the alternative**, not just the points scored.
2. **What happens next:** where useful, break down how hands end, or what follows a pass, to see *why* the idea works or doesn't.
3. **Teach the bots** if it holds up, and check the effect over whole games. Rare situations won't show up in game results, so step 1 is the real test.

---

## Still to test
- **Re-check Findings 1–4 with Monte Carlo card play,** since the rule bots' card play was their main weakness.
- Build win-chance tables for games to 15 and 20, and check the score rules there.
- Card play: later leads (not just the first trick), and play in loner hands.
- The dealer's discard: keep an off-suit Ace or a fifth trump?
