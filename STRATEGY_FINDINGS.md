# Strategy Findings

*From computer simulations of the **Lizard Peninsula Euchre League** rules (see [EUCHRE_RULES.md](EUCHRE_RULES.md)).*

These findings come from bots playing hundreds of thousands of hands under league rules. They are **evidence, not gospel**: the bots are decent but not expert, and real opponents bid differently. Each finding says how strong the evidence is.

---

## Finding 1: Round one, ordering up and picking up

*Experiment run 16 Nov 2026. 200,000 deals and about 640,000 decisions, run twice (the second time with bots retuned from the first run's results).*

### How it was tested
Each time a player had to decide in round one, the same hand was played out every way they could have called it: **pass**, **order up**, or **go alone**. Everything else stayed the same, so any difference in points comes from that one decision. The tables show the **average net points per hand** for that player's team (their points minus the opponents'). A score of 0-0 was assumed.

"Trumps" counts the Benny and the Left Bower. For the dealer, trumps are counted **after** picking up and discarding.

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

## Still to test
- **Re-check Findings 1–4 with Monte Carlo card play,** since the rule bots' card play was their main weakness.
- Score-aware calling ("die in the hole") and different winning totals (10, 15, 20).
- Card play: **drawing**, **gone fishing**, **let it go**, **trumping in**, and the value of **the lead** and **back hand**.
- The dealer's discard: keep an off-suit Ace or a fifth trump?
