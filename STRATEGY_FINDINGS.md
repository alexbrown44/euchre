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
- Who reaches round two depends on how the earlier players bid in round one. These bots rarely order up from the dealer's left or right (see Finding 1), whereas league players may order up more often.
- Same caveats as Finding 1: bot card play is simple, and the score was always 0-0.
- Full tables are produced by `npm run exp:round-two` in the `results/` folder.

---

## Still to test
- Defending alone, taking over a loner, and answering a lone defender.
- Score-aware calling ("die in the hole") and different winning totals (10, 15, 20).
- Card play: **drawing**, **gone fishing**, **let it go**, **trumping in**, and the value of **the lead** and **back hand**.
- The dealer's discard: keep an off-suit Ace or a fifth trump?
