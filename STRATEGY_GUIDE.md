# Euchre Strategy Guide

*For the **Lizard Peninsula Euchre League**, under the house rules in [EUCHRE_RULES.md](EUCHRE_RULES.md).*

This guide turns hundreds of thousands of simulated hands into plain advice for the table. Every rule here was tested by playing the **same hand** out each way (call or pass, alone or with partner, this card or that) and measuring which choice scored more. Alongside each rule is an explanation of **why** it works, so you can apply the thinking to hands the guide doesn't cover. The full evidence is in [STRATEGY_FINDINGS.md](STRATEGY_FINDINGS.md); the finding number is given in brackets, like **(F7)**, if you want to check it.

---

## How to read this guide

### Two kinds of explanation
The simulations prove **what** works. They don't always show **why**. So each explanation is labelled:

- **Why:** the simulations showed this directly (for example, how often the opponents call after you pass), or it follows from the rules and scoring (for example, a loner only gains on a march).
- **Likely why (untested):** our best explanation. It makes sense at the table, but the simulations only measured that the rule works, not the reason. Treat these as reasoning, not proof.

### Terms
- **"Trumps"** always counts the Benny and the Left Bower as trumps.
- **Top trumps** means the **Benny, Right Bower and Left Bower**. **Big trumps** (used for the dealer's loner) also include the **Ace of trumps**.
- **The dealer's trump count includes the upcard.** "Dealer with 3 trumps" means the card picked up plus 2 of their own.
- **Next** is the suit of the same colour as the turned-down card. **Against colour** depends on your team: for the non-dealing team it's the opposite colour; for the dealing team it's next.
- **Off-suit** means any suit that isn't trump. An **off-suit Ace** is the Ace of one of those suits.
- **Void:** having no cards left in a suit. If you're void in the suit led, you can trump in.
- **Drawing** (or dragging): leading trump to make the other players use up their trumps.
- **Cashing** a card: leading your highest card in a suit, such as an Ace, hoping to win the trick with it. An off-suit Ace can't be beaten in its own suit, but it isn't sure to win: a player who is void in that suit can trump it.
- **Throwing off:** when you can't follow suit and don't trump, playing a card of another suit, which can't win.
- **Over-trumping:** playing a higher trump on a trick someone else has already trumped.

### The numbers
- **Gains are in points per hand**, compared with the alternative for the **same hand**. A gain of +0.3 means that, on average, the choice is worth about a third of a point more per hand. Over a night of play, choices worth 0.2 or more add up quickly.
- **The score is assumed level and not close to the end**, unless the "Playing to the score" section applies.

### Your hand comes first
Every number in this guide is an **average** over many hands that share the features the rule names, such as the number of trumps, whether you hold a top trump, or an off-suit Ace. Everything else about those hands was dealt at random. Your actual hand is one particular hand, so:
- **Count your hand first, then use the rule.** A rule like "next beats the opposite colour" compares the **same holding** in each suit: three trumps in next against three trumps in the opposite colour. It doesn't say "name next even when your cards are in the other suit". If you hold 2 cards of next and 4 of the opposite colour, those are different hands, and you should read each suit by its own row: 2 trumps usually means pass, 4 means name it.
- **Colour is a tie-breaker between suits.** Next against the opposite colour was worth about 0.4–0.5 points for the same holding. A whole extra trump or a top trump usually moves a hand from "pass" to "name it", which is a bigger difference. Seat and score are different: they change how strong a hand you need, and the guide's rules for each seat and score already build that in.
- **Details the rule doesn't mention still matter.** A rule tested on "3 trumps" includes good and bad 3-trump hands. If yours has extra strength the rule doesn't count (a second off-suit Ace, a void to trump into), it's better than the average and the number understates it; if it's weaker, the number flatters it. The worked examples (section 8) show how much shape alone can move the result.
- **Percentages describe the long run, not this hand.** "Made 59% of the time" means that across many similar hands you'd make about 6 in 10. It doesn't tell you which 6.

---

## The one-page card

### Round one
| Seat | Order up / pick up with… | Go alone with… |
|---|---|---|
| **Left of dealer** | Almost never. Pass with 3 trumps. | 4+ trumps including **two** top trumps, or any 5 trumps. **Benny + Right + Left: pass** (you name next in round two). |
| **Dealer's partner** | Up and Down with **4+ trumps** (always alone) | Same |
| **Right of dealer** | Almost never. Pass with 3, and with 4 if only one top trump. | 4+ trumps including **two** top trumps, or any 5 trumps. **Benny + Right + Left: go alone.** |
| **Dealer** | **3 trumps.** Also the **Right Bower + 1**, unless your outside cards are in three different suits. | See *The dealer's loner* below |

### Round two
| Who | Name a suit with… |
|---|---|
| **Non-dealing team** | **3 trumps in next**, or **2 in next plus an off-suit Ace**. The opposite colour needs 3 including a top trump. |
| **Dealer's partner** | **3 trumps, preferably the opposite colour.** Next only with 3 including a top trump. Pass with 2. |
| **Dealer, last to speak** | 3 trumps: next with an off-suit Ace; the opposite colour with a top trump, or with one outside suit and its Ace. **Pass with 2** and let it be thrown in. |

### The dealer's loner
Go alone with **3 big trumps and one outside suit holding its Ace**, the league rule. The data supports a little more: **3 trumps (2 big) with an outside Ace**, **4 trumps including a top trump**, and **any 5 trumps**. Without an outside Ace, 3 trumps should **pick up, not go alone** (with 3 big trumps it's a toss-up).

### After the call
- **Defend alone** against two makers with **3 trumps including a top trump**. Against a loner, the same.
- **Don't take over your partner's loner or lone defence, and don't answer a lone defender** (the maker's partner dropping the player who chose trump). These lost in every hand tested. Defending alone **against** a loner is different, and fine with the hand above.
- The dealer takes over Up and Down only with **4 trumps** after picking up.

### The discard
**Never throw a trump or an off-suit Ace** (except with 5 trumps, below). **Make a void if you can, even throwing a lone King. Otherwise throw your lowest card.** With 5 trumps and an Ace, it's a toss-up with your partner; alone, throw the Ace.

### Card play
- **Makers holding the top trump: draw with it.** Don't open with an off-suit Ace.
- **Defenders: lead an off-suit Ace, otherwise a low off-suit card. Don't lead trump.**
- **Trump in** whenever an opponent is winning and you can't follow.
- **Let it go, partner already winning:** if their card is the highest still out in that suit, including their off-suit Ace. If an opponent still to play could hold a higher card (one that isn't in your hand and hasn't been played), take the trick.
- **Let it go, partner still to play** (going low to save your best cards): only with a weak hand, such as a defender with 1 trump. With 2+ trumps, win it now.
- **Loner: draw with your highest trump until the defenders' trumps are gone.**
- **Against a lone defender: don't draw.** Lead off-suit.

### By the score
- **9–9:** call with almost anything. **Never go alone.**
- **We need 1 or 2:** never go alone. Needing 1, the dealer picks up with 2.
- **They need 1:** go alone more readily; name more freely in round two; the dealer always calls if it comes back round.

---

## 1. Round one: ordering up and picking up

### The big idea: ordering up hands the dealer a trump
When you order up from the dealer's left or right, the upcard goes into the **dealer's** hand, an opponent's, along with a discard to tidy their hand. Passing with a middling hand usually scores more. **(F1, F12)**

- **Why:** the rules give the upcard to the dealer, so ordering up strengthens an opponent by a trump and lets them throw away their worst card, often making a void so they can trump in.
- **Likely why (untested):** passing keeps two good chances open. If the dealer picks up, your trumps are sitting against them, ready to euchre. If they turn it down, your team may get to name a suit in round two.

### Left of dealer
- **3 trumps: pass.** Ordering up loses about 0.5–0.7 points against passing. **(F12)**
  - **Likely why (untested):** 3 trumps plus your partner's help is often not enough to take 3 tricks against a dealer who has just gained a trump. The same 3 trumps are much more valuable for euchring the dealer if they pick up.
- **4+ trumps with two top trumps: go alone** (+0.47 over passing). **(F12)**
  - **Likely why (untested):** holding two of the three top trumps plus two more, you can usually draw all the opponents' trumps yourself, and you lead first, so you start drawing at once. Your partner adds little to a hand that strong.
- **4 trumps with one top trump:** close. Passing is fine.
- **5 trumps: go alone.** Too rare to test from this seat; the reasoning is the same as for the dealer's right, below.
  - **Likely why (untested):** with only one of the top three, the opponents may hold the other two, which makes a march (the only way a loner gains) much less likely.
- **Benny + Right + Left: pass.** This is the league's seat theory, and it's right. Pass +2.19, alone +2.09, order up +1.42. **(F7)**
  - **Why:** after you pass, about 77% of the time the dealer turns it down and you name trump first in round two (worth +2.25). The other 23%, the dealer picks up into your three top trumps and you euchre them (+2.00). Naming **next** costs you nothing: the Benny is still trump, your Left Bower becomes the Right, and your Right becomes the Left.
- **Don't call lighter because you'll lead.** The opening lead is worth only about 0.03 points per hand to a maker. Your real advantage is **first say in round two**. **(F9)**
  - **Why:** the simulation replayed the same hands with someone else leading, and the result barely changed.
  - **Likely why (untested):** in Euchre, who holds the trumps decides most hands. Leading first only means you show a card first.

### Dealer's partner: Up and Down
- **4+ trumps: call Up and Down** (+0.9 over passing).
- **3 trumps: pass**, even with two top trumps. **(F1, F12)**
  - **Why:** under league rules Up and Down is **always alone**, and the dealer doesn't pick up, so the upcard goes to waste. You face two opponents with only your own five cards and no partner.
  - **Likely why (untested):** a 3-trump hand alone rarely takes all 5 tricks, so you take on the euchre risk of a loner for little chance of the 4-point reward.

### Right of dealer
- **3 trumps: pass** (ordering up loses 0.3–0.8).
  - **Likely why (untested):** the same as on the left: the dealer gains a trump and a discard. Your partner (on the dealer's left) leads the first trick, but the dealer, holding the extra trump, plays last to it and sees everyone's cards before choosing. The tests found passing even more clearly right from this seat than from the left; why is untested.
- **4 trumps with one top trump: pass**, but it's close. Ordering up was 0.11 worse than passing in the main test, and about even in another. **(F7, F9, F12)**
  - **Likely why (untested):** if the dealer picks up, your 4 trumps are sitting against them and you have a strong chance to euchre. If you order up instead, you face a dealer who now holds a trump and a discard, while the opponents may hold the two top trumps you're missing.
- **5 trumps: go alone.** Five-trump hands are too rare to have shown up in the tests from this seat, so this is reasoning.
  - **Likely why (untested):** there are only 8 trumps, so with 5 in your hand the opponents hold at most 3, including the upcard the dealer picks up. Only the top trumps you're missing can beat your best cards, so you're very hard to euchre, and you have a good chance of all 5. For the dealer, 5 trumps was always worth going alone. **(F4)**
- **4+ trumps with two top trumps: go alone** (+0.43). **(F12)**
  - **Likely why (untested):** a hand this strong wants to choose trump itself. From the right, if you pass, two other players name before you in round two (see the next point).
- **Benny + Right + Left: go alone** (+1.59). Passing is the **worst** choice here. **(F7)**
  - **Why:** after you pass from the right, you get to name trump yourself only about 9% of the time. About half the time someone else names first, and when they pick the other colour, your Bowers become ordinary Jacks. The dealer's left can afford to wait because round two reaches them first; the dealer's right can't.

### Dealer
- **2 trumps (the upcard + 1): usually pass.** It's close to break-even. **(F1, F12)**
  - **Likely why (untested):** 2 trumps is borderline for taking 3 tricks, and both opponents have passed with their own hands still unknown.
- **The Right Bower + 1 more trump: pick up**, unless your three outside cards are in three different suits. The gain is +0.08 to +0.55 depending on shape. **Never alone.** **(F16)**
  - **Why:** passing is worse. After you pass, the opponents name trump in round two more than half the time, and in their suit your Right Bower is no longer a top trump. In the other colour it's just a Jack.
  - **Fewer outside suits is better:** one suit scored more than two in most shapes (for example +0.55 against +0.43 with an Ace). Three suits, one card in each, wasn't tested; expect it to be about break-even or worse.
  - **Likely why (untested):** each outside suit is a place where the opponents can win a trick. With fewer suits, you run out of a suit sooner and can trump in.
  - **It's stronger when the Right is the card turned up** (by about 0.1–0.2), even though you end up with the same cards either way.
  - **Likely why (untested):** first, your partner knows for certain you hold the top trump, so they can play around it (lead trump to you, or let a trick go that you're bound to win). Second, when the Right is turned up, the other three passed **knowing** you'd get it. When a low trump is turned up, someone may have passed on a decent hand, hoping to euchre you.
  - **The weakest case:** you hold the Right, a low trump is turned up, and two outside suits with no Ace. Only just worth it (+0.08).
- **3 trumps: pick up** (+0.55 to +0.67), **whatever they are.** Even Q-10-9 of trumps is a pick-up in every shape (+0.30 to +0.82). **(F12, F15)**
  - **Why:** if you pass, the opponents name trump in round two about **4 times in 5**, and usually make it. Your three trumps are then wasted: the turned-down suit can't be named, so it can't be trump.
- **Holding the Benny makes passing more attractive.** With the Benny and only 2 trumps, pass. **(F1)**
  - **Why:** the Benny is trump whatever suit is named, so it keeps its full value in round two. You give up much less by passing.

### The dealer's loner
The league rule is **3 big trumps (Benny, Right, Left, Ace of trumps), one outside suit, preferably an Ace**. It holds up well. **(F4, F5)**

Go alone only if **both** are true:
1. you have a real chance of **all 5 tricks**, and
2. going alone **doesn't noticeably raise the euchre risk**.

- **Why:** this is the scoring. With your partner, 3–4 tricks scores 1 and a march 2. Alone, 3–4 tricks still scores 1 and a march 4. So a loner only gains on a march (2 extra points), and only costs when your partner would have saved you from a euchre.

| Dealer's hand after the discard | Do |
|---|---|
| 3 big trumps, one outside suit, **with the Ace** | **Alone, clearly** |
| 3 big trumps, outside card not an Ace | Toss-up |
| 3 trumps (2 big), with an outside Ace | Alone (the data goes a little further than the league rule) |
| 3 trumps (2 or fewer big), **no outside Ace** | **Pick up, not alone** |
| 4 trumps including a top trump | Alone |
| 4 trumps, no top trump | Pick up |
| 5 trumps | Always alone |

- **The outside Ace is the biggest single factor**, adding about 0.8–1.2 points to a loner.
  - **Why:** with 3 big trumps and an outside Ace, a loner takes all 5 tricks 45% of the time against 48% with a partner, so going alone keeps nearly every march and doubles what each is worth. Without the Ace, the march chance halves when you go alone and the euchre risk doubles.
  - **Likely why (untested):** once no one else has a trump left, an Ace in your side suit is a certain trick. The catch is knowing: some trumps may be sleeping in the kitty, so you can't always count them all out. Any other side card is a likely loser, and one lost trick ends the march.
- **One outside suit is better than two.**
  - **Likely why (untested):** with one side suit, there's only one place the defenders can win a trick. With two, there are two.
- **On a strong hand, your partner adds very little.**
  - **Why:** as above, 48% marches with partner against 45% alone on the league rule's hands.
- **The league rule is the safe line.** The extra loners the data allows gain a smaller +0.36 per hand, and still held up when the opponents defended well. **(F5)**
  - **Why:** most of those extra loners take 3–4 tricks and score the same 1 point. They gain because about 1 in 4 becomes a 4-point march, while euchres rise only slightly (5% to 8%).

---

## 2. Round two: naming trump

### Non-dealing team (left and right of dealer): make next, but with 3
- **Next is worth about 0.4 points more** than the opposite colour, for the same hand. **(F2, F10)**
  - **Likely why (untested):** the dealer turned that colour down, which hints their team is short in it. That's the old table wisdom, and the numbers fit it. Note also that the turned-down card itself is out of play.
- **3 trumps in next: name it**, even without a top trump (+0.39 to +0.71).
- **2 trumps in next: pass**, unless you hold an **off-suit Ace**, in which case it's about break-even and naming is fine. Without the Ace, naming loses about 0.3. **(F10)**
  - **Likely why (untested):** two trumps are usually worth about two tricks, and you need three. An off-suit Ace is a likely third trick. Without it, you're hoping your partner supplies a trick, when passing would give your partner the chance to name with their own hand.
- **The opposite colour needs 3 trumps including a top trump.** Never name it with 2 (−0.5 to −0.7).
  - **Likely why (untested):** you lose the colour advantage above, so you need a stronger hand to make up for it.
- **On the dealer's left, passing with 2 is fine.** **(F9)**
  - **Why:** your partner and the dealer's right still get a turn after you.
- **The Benny weakens the colour effect.** When the Benny is carrying your hand, colour matters about half as much. **(F2)**
  - **Likely why (untested):** the Benny is the top trump in every suit, so a hand built on it is strong whichever colour you name.

### Dealing team, dealer's partner: against colour (avoid next)
- **Prefer the opposite colour.** Next is worse in every hand tested. That's "against colour" for the dealing team, and the data backs the league wisdom. **(F2, F12)**
  - **Likely why (untested):** this is the mirror image of the non-dealing team. Your partner turned that colour down, which hints your team is short in it, and the opponents may be strong in it.
- **2 trumps: pass** in either colour.
- **3 trumps in the opposite colour: name it** (+0.29 with no top trump, +0.44 to +0.48 with one).
- **3 trumps in next: only with a top trump** (+0.12 to +0.32). With no top trump, pass.
- **4+ trumps: name it** in either colour.

### The dealer, last to speak
If it's come all the way round, passing means a **throw-in** (no score).
- **2 trumps: pass** and let it be thrown in. Naming on 2 loses about 0.25–0.9. **(F12)**
  - **Why:** a throw-in scores 0 for both teams, while naming on 2 trumps loses on average. Zero is the better result.
- **3 trumps with a top trump: name it** (+0.32 in the opposite colour). **(F12)**
- **3 weak trumps (like Q-10-9):** **(F15)**
  - **Next:** name it if you hold an **off-suit Ace** (+0.23 to +0.61). Otherwise pass.
  - **Opposite colour:** only with **one outside suit and its Ace** (+0.15). Otherwise pass.
  - **Likely why (untested):** three low trumps win tricks only after the higher trumps have gone. The Ace supplies a trick of its own, which is often the difference between 2 tricks and 3.
- **For the dealer, last to speak, next is better than the opposite colour**, the reverse of the dealer's partner's "against colour" rule. With Q-10-9, next beat the opposite colour by about 0.5 points in every shape tested. **(F15)**
  - **Why this only applies to the same holding:** the test put the same three cards (Q-10-9) in next or in the opposite colour. If your hand is clearly stronger in the opposite colour, with more trumps or a top trump there, check that suit against its own rule above (for example, 3 trumps with a top trump: name it). The preference for next settles only the case where the two suits are about equal.
  - **Why "avoid next" doesn't apply here:** that rule is a guess about the **dealer's** hand: turning the card down hints the dealer is short in that colour. The dealer's partner has to guess. The dealer doesn't: they can see they hold three trumps in next.
  - **Likely why (untested) next is actually better:** by the time it reaches the dealer, **both opponents have passed in round two**. The non-dealing team names next readily (with 3 trumps, or 2 and an Ace), so their passing suggests neither of them holds much in next. They need a stronger hand to name the opposite colour, so their passes say less about it, and one of them may still be strong there. In short, the opponents' passes have told you next is the safer suit.
- **Never go alone on a 3-trump hand.**

### Going alone in round two
**4+ trumps.** With 3, keep your partner. **(F2)**
- **Likely why (untested):** the same march test as the dealer's loner. You have no upcard and no discard to improve the hand, so you need the trumps in hand.

---

## 3. After trump is made: defending alone, taking over, answering

| Situation | Do it with… | Gain |
|---|---|---|
| **Defend alone against two makers** | **3 trumps including a top trump.** Clearly with 4. | +0.11 to +0.95; with 4, +1.05 to +1.85 |
| **Defend alone against a loner** | **3 trumps including a top trump** | +0.32 |
| **Take over your partner's loner** | **Don't** (lost in every hand tested) | −1.2 to −2.8 |
| **Dealer takes over Up and Down** | Only with **4 trumps** after picking up | (with 2–3, −0.4 to −2.4) |
| **Take over your partner's lone defence** | **Don't** (lost in every hand tested) | −2.55 |
| **Answer a lone defender** | **Don't** (lost in every hand tested) | −2.4 to −2.8 |

**(F3, F12)**

### Who drops first matters
These situations sound alike at the table but are very different:

| What happens | What it's called | Advice |
|---|---|---|
| A maker drops (goes alone), then a defender drops | **Defending alone against a loner** | ✔ With 3 trumps including a top trump |
| The makers call with partners, a defender drops, then the **maker's partner** drops in reply | **Answering a lone defender** | ✘ Don't |
| Your partner goes alone, and you drop them to go alone yourself | **Taking over a partner's loner** | ✘ Don't |
| Your partner defends alone, and you drop them to defend alone yourself | **Taking over a lone defence** | ✘ Don't |

**How firm is "don't"?** These lost in every hand tested, usually by 1–3 points. The tests mostly covered hands with 2–3 trumps. With a very strong hand (say 4 trumps including the Benny) one of them might occasionally pay, but those hands are too rare to measure. The one known exception is the dealer taking over Up and Down with 4 trumps, below.

- **Defending alone pays more often than you'd think.**
  - **Why:** without your partner you euchre less often (with 3 trumps including a top trump, about 29% instead of 47%), but each euchre is worth **4 instead of 2**. With 3 good trumps, the bigger prize outweighs the fewer euchres.
- **Defending alone against a loner needs the same strength.**
  - **Likely why (untested):** against a single opponent, your partner's cards help less, so dropping them costs less. But a loner is usually strong, so you still need 3 trumps with a top trump to stop them.
- **Don't take over your partner's loner.**
  - **Likely why (untested):** your partner only went alone on a very strong hand, and chose trump to suit it. Taking over throws that hand away and replaces it with yours, which wasn't strong enough for you to call.
- **The dealer takes over Up and Down only with 4 trumps.**
  - **Why:** if the dealer takes over, they pick up the upcard and discard, which the partner can't. With 4 trumps after picking up, that can make the dealer's hand the stronger one.
- **Don't take over your partner's lone defence.**
  - **Likely why (untested):** the same reason as a partner's loner. They chose to defend alone on a strong hand.
- **Don't answer a lone defender.**
  - **Why:** under league rules, the maker's partner who answers drops **their partner, the player who chose trump**. The hand built around that trump suit sits out, and a euchre still costs 4.
  - **Likely why (untested):** a lone defender holds strong trumps. Taking on that player with only half your team's cards, and without the hand that picked trump, plays into their hands.

---

## 4. The dealer's discard

**The priority: keep your trumps, then the off-suit Ace, then have as few outside suits as possible.** **(F11)**

1. **Never throw a trump.** It costs 0.4–0.7 points (up to 2.3 when alone).
   - **Likely why (untested):** a trump can win a trick in any suit. A low off-suit card almost never wins one.
2. **Don't throw a lone off-suit Ace** to make a void (−0.44; −1.75 when alone). **The exception: 5 trumps** (counting the upcard). Then the Ace is your only off-suit card, so it's the Ace or a trump; see the end of this section.
   - **Likely why (untested):** an Ace usually wins the first time its suit is led, unless someone is void and trumps it. That's a likely trick, worth more than the chance to trump in that a void would give.
3. **Make a void with any other lone card, even a King** (+0.13 to +0.39; +0.6 to +1.3 when alone).
   - **Likely why (untested):** a lone King wins only if the Ace is in the kitty or already played. A void lets you trump the suit the first time it's led, which is a trick you can count on as long as you have trumps.
4. **Otherwise throw your lowest card.**

**One outside suit, or more suits including an Ace?** Keep the Ace. It's worth about 0.2–0.35, more than the 0.2 gained from one fewer suit. With the Ace settled, fewer suits is better. **The best shape is trumps plus one outside suit holding its Ace**, which is exactly the league's dealer-loner shape.

**5 trumps and an off-suit Ace** (your six cards after picking up): you must throw the Ace or a trump. It's a toss-up with a partner. When alone, keep the fifth trump and throw the Ace (slightly better).
- **Likely why (untested):** with all five cards trumps, you can draw and win every trick yourself. With an Ace instead, a defender who is void in that suit can trump it.

---

## 5. Card play

### The makers' opening lead **(F8)**
- **Holding the top trump: draw with it.** It's the best lead every time, by about 0.1–0.3 points.
  - **Likely why (untested):** the top trump can't be beaten, so leading it wins a trick for certain and forces each opponent to play a trump if they have one. Every trump they lose is one that can't be used to trump your winners later.
- **Without the top trump:** drawing and **gone fishing** (a low trump) are about equally good.
  - **Likely why (untested):** either way you're pulling trumps; a low trump lets an opponent spend their top trump on a cheap card, leaving your high trumps stronger.
- **Don't open with your off-suit Ace.** It's never the best lead. Draw first and cash the Ace later.
  - **Likely why (untested):** early on, an opponent who is void in that suit can trump your Ace. Once the trumps are drawn, the Ace is safe.
- **The maker's partner, on lead, should lead trump.**
  - **Likely why (untested):** the maker usually holds the most trumps. Leading trump helps them draw.

### The defenders' opening lead **(F8)**
- **Lead an off-suit Ace if you have one.**
  - **Likely why (untested):** it's most likely to win early, before the makers can run out of the suit and trump it.
- **Otherwise lead a low off-suit card.**
- **Don't lead trump** (0.1–0.3 behind).
  - **Likely why (untested):** the makers hold more trumps. Leading trump does their drawing for them.
- **As a defender, the back hand beats the lead** when you hold trumps: you can over-trump or let it go. **(F9)**
  - **Likely why (untested):** playing last, you see every other card before you decide, so you never waste a trump.

### Later leads **(F14)**
- **Makers holding the top trump: keep drawing with it.**
  - **Likely why (untested):** the same as the opening lead: it's a sure trick that strips the defenders' trumps.
- **Makers without it: cash an off-suit winner** (an Ace, or a King once the Ace has gone). Don't lead a trump that can be beaten.
  - **Likely why (untested):** a trump that can be beaten may hand the lead to an opponent holding the higher one.
- **Defenders: cash an off-suit winner; otherwise lead low off-suit. Don't lead trump, even holding the top trump** (+1.40 cashing a winner against +0.95 drawing).
  - **Likely why (untested):** a defender's trumps are worth more for trumping in on the makers' winners than for drawing.
- **Don't go out of your way to lead back your partner's suit.** "Return your partner's lead" (leading the suit your partner led earlier) is a common habit, but it never beat the normal choices above. It was often only a little behind, so it isn't a mistake, just not a special play.
  - **Likely why (untested):** with only 5 cards each, your partner's lead tells you little. They may have led their Ace, which has already won its trick, or a lone card to make a void. Leading that suit back can mean leading into a suit the opponents can now trump, or one your partner has run out of.

### Trumping in **(F8)**
**Trump in when you can't follow and an opponent is winning.** It beat throwing off in every situation tested: by +0.4 to +1.0 when you're last or one opponent is still to play, and by +0.1 to +0.2 when two players are still to play.
- **Likely why (untested):** a trick you can win now is worth taking. The gain is smaller with two players still to play, because one of them may over-trump you.

### Let it go
**When your partner is already winning the trick:** **(F8)**
- **If their card is the highest still out in that suit** (you're last, or every higher card of that suit, and every higher trump, is in your hand or already played): **let it go.**
  - **This includes your partner's off-suit Ace.** The standard table rule is right: let it go, even though an opponent still to play might be out of the suit and trump it. That's how the test counted it ("can't be beaten" only looked for higher cards in the suit, not for trumping), and letting it go scored better (+1.13 against +0.91 for makers; +0.22 against −0.14 for defenders).
  - **Why:** the trick is probably already your team's, so a winning card from you would be wasted. Save it for a later trick.
  - **Likely why (untested) not to trump partner's Ace:** an opponent may not be void at all, and if they are, they may over-trump you anyway. Trumping costs you a trump for certain, to guard against a risk that often isn't there.
- **If an opponent still to play could hold a higher card, take the trick.** "Could hold" means a higher card you haven't seen: it's not in your hand and hasn't been played. This is the single most useful card-play rule for ordinary play. Two common cases:
  - Your partner's King is winning, the Ace hasn't appeared, and you're out of the suit: **trump it.**
  - Your partner's low trump is winning and a higher trump is still out: **over-trump with a higher one of yours.**
  - **Why:** if you don't take it, an opponent may win it with the higher card. Taking it makes the trick much more likely to be yours.
- **If you hold the higher card yourself, let it go.** Your partner's King with the Ace in your hand is as good as the Ace: no opponent can beat it in that suit. Playing your Ace on it doesn't make the trick any safer. It only changes which of you leads next, and it uses up a winner you could take a later trick with. (The test counted this case as "let it go".)

**When you play before your partner** and could win the trick now: **(F8)**
- **With 2+ trumps, win it now.**
  - **Likely why (untested):** with a strong hand you'll still have winners later, so there's nothing to save.
- **Only with a weak hand**, especially a defender with 1 trump, is going low as good or slightly better.
  - **Likely why (untested):** your one good card is precious. Leaving the trick to your partner keeps it for a trick only you can win.

**A word of warning:** gone fishing and going low only pay if the rest of the hand is played well. **(F8)**
- **Why:** bots using those two tactics with simpler play for the rest of the hand **lost** games. The plain rules (draw with the top trump, take a trick your partner could lose) worked even for the simple bots.

---

## 6. Loner hands

### When you're the loner **(F13)**
- **Draw with your highest trump on every lead until the defenders' trumps are gone**, even when you don't hold the top trump. It was best in all 17 situations tested, usually by 0.3–0.7.
  - **Likely why (untested):** you need every trick, and any defender who runs out of a suit will trump your side cards. Drawing removes those trumps first.
- **Then cash your off-suit Ace.** Leading it early costs 0.3–0.6.
  - **Likely why (untested):** with your partner out, one of only two defenders just has to be void in that suit to trump your Ace and end the march.
- **Don't go fishing.**
  - **Why:** gone fishing relies on your partner winning the trick, and you have no partner.

### Defending against a loner **(F13, F14)**
- **Lead off-suit, never trump** (trump costs 0.3–1.0). Which off-suit card hardly matters; lead the Ace if you have one.
  - **Likely why (untested):** a trump lead does the loner's drawing for them. An off-suit lead makes them use a trump, or risk losing the trick.
- **Always trump in** if you can't follow and the loner is winning. On the first trick, last to play, it's worth **+1.5**.
  - **Why:** one trick for your team stops the march, so the loner scores 1 point instead of 4.
- **Partner winning:** let it go if their card is safe; take it if the loner, still to play, could beat it.
  - **Why:** the same reasoning as in ordinary play.
- **When you can't follow suit and aren't trumping in, which card should you throw away?** It hardly matters: every choice scored within about 0.03 points of the others. So **throw your lowest card.**
- **One small exception, near the end of the hand (the 3rd or 4th trick):** if your partner led a suit earlier in the hand, **throw away a card of that suit**, and keep your cards in the other suits. It's worth about 0.1 points when it applies.
  - **Likely why (untested):** you only need to win **one** trick to stop the loner's march. To win it, one of you needs a card that can beat the loner's card in whatever suit they lead. Your partner leading a suit suggests they're strong in it, so your cards in that suit are spare. Keep your cards in the other suits. Then, whichever suit the loner leads, one of you is more likely to have a card that can win it.

### Makers against a lone defender: don't draw **(F13)**
This is **the opposite of normal play**.
- **Lead off-suit**, the Ace or a low card (about equally good). **Drawing was the worst or second-worst first lead every time**, 0.3–1.0 behind.
  - **Likely why (untested):** a lone defender usually holds 3+ good trumps. Drawing trump feeds them tricks with those trumps. Leading off-suit makes them spend their trumps on your side suits, where your partner may be able to over-trump.
- **Exception:** down to **one trump and it's the top trump**? Cash it.
  - **Likely why (untested):** it can't be beaten, so it's a sure trick, and it pulls one of the lone defender's trumps without giving them a chance to win.

### The lone defender's own leads **(F13)**
- **Lead an off-suit Ace if you have one.**
- **Otherwise a low off-suit card.** A low trump is the worst lead.
  - **Likely why (untested):** your trumps are your weapons for trumping the makers' winners. Leading them wastes them, and the makers hold more trumps than you.

---

## 7. Playing to the score **(F6)**

Near the end of a game, what matters is **winning the game**, not points. These rules work for any game total (10, 15 or 20): what counts is how many points each team still **needs**. "9–9 in a game to 10" is the same as "14–14 in a game to 15".

| Position | Calling | Going alone |
|---|---|---|
| **Neither close** | As this guide | As this guide |
| **We need 2** | About the same, slightly stricter | **Don't.** A march with your partner already wins. |
| **We need 1** ("in the hole") | **Dealer picks up with 2 trumps.** Left and right of dealer still need 4 to order up. | **Never.** |
| **They need 1** | Dealer picks up with **3+** (2 is close). **Name more freely in round two** (even with 1–2 trumps from the dealer's left). If it comes back round, **the dealer always calls.** | **More readily.** |
| **Both need 1** (9–9) | **Call with almost anything**, especially as dealer and in round two. | **Never.** |

- **Why going alone is pointless when you need 1 or 2:** 1 point (or a 2-point march with your partner) already wins the game. Going alone can't win it any more surely, and only adds euchre risk.
- **Why call with almost anything at 9–9:** whoever makes trump wins the game with any 3 tricks. If you pass, you give the opponents that chance.
- **Why the dealer is looser in the hole:** when one point wins, making the hand ends the game, so a borderline pick-up is worth more than usual.
  - **Likely why (untested) the left and right still need 4:** ordering up still hands the dealer a trump, and a euchre would put the opponents back in the game.
- **Why go alone more when they need 1:** you need big points to catch up before they get their one.
- **"If the opposition is in the hole, the dealer should always call":** half right.
  - **In round one: pick up with 3+ trumps; pass with 1; 2 trumps is close.** The table below shows how the hand ends each way, and the notes under it explain why the table alone isn't the whole story.
  - **In round two, if it comes back to you, always call.** **Why:** a throw-in keeps the score the same **and gives them the next deal**. At 9–9, the team dealing next wins about 61% of the time.

**They need 1, you're dealing, everyone has passed to you in round one: how this hand ends**

| Dealer's trumps (with the upcard) | Pick up: you make it | Pick up: euchred (they win) | Pass: they win this hand | Pass: your team scores |
|---:|---:|---:|---:|---:|
| 1 | 37% | **63%** | 67% | 33% |
| 2 | 59% | 41% | 65% | 35% |
| 3 | **81%** | 19% | 62% | 38% |
| 4+ | **96%** | 4% | 59% | 41% |

After a pass, "your team scores" means you euchred them or your partner named trump in round two and made it; the test didn't split the two. Whichever way this hand goes, **the next deal is the opponents'**.

- **What the table says:** on this hand alone, picking up always looks better, even with 1 trump. If you pick up, they win the hand 63% of the time; if you pass, 67%.
- **Why the game test still says pass with 1 trump:** getting through this hand isn't enough. They still need only 1, and they deal next, so what matters is **how many points you score**. A 1-trump pick-up that's made almost always scores just 1 point. When whole games were played out, picking up lost about **3%** of your game-winning chance with 1 trump and about **1%** with 2, but gained about **2%** with 3. **(F6)**
- **Likely why (untested) a pass can score more:** after a pass, your team's score can be a 2-point euchre or a march by your partner, so it may be bigger on average. The test didn't record how many points were scored, so this is a likely reason, not a measured one.
- **Why the table is the whole story when you need 1 yourself:** any score wins you the game, so the size of the score doesn't matter. Pick up even with 1 trump. At 9–9 this is the "call with almost anything" rule above.

- **Never defend alone** when an ordinary euchre already wins the game.
  - **Why:** the extra 2 points of a lone-defence euchre are worth nothing, and euchres happen less often without your partner.

---

## 8. Worked examples

### Dealer with Q-10-9 of trumps (counting the upcard) **(F15)**
Everyone has passed to you in round one. Two outside cards.

| Outside cards | Round one: pick up | Round two, last to speak: next | Round two: opposite colour |
|---|---:|---:|---:|
| **One suit, with its Ace** | **+0.82 ✔** | **+0.61 ✔** | **+0.15 ✔** |
| One suit, no Ace | **+0.63 ✔** | +0.06 (break-even) | −0.69 ✘ |
| Two suits, one an Ace | **+0.58 ✔** | **+0.23 ✔** | −0.34 ✘ |
| Two suits, no Ace | **+0.30 ✔** | −0.42 ✘ | −1.04 ✘ |

**Round one: always pick up, never alone.** Even two suits and no Ace, euchred half the time, beats passing.
- **Why:** if you pass, the opponents name trump about 4 times in 5 and usually make it, and your three trumps can't be trump in round two.

**Round two: name next with an off-suit Ace; the opposite colour only with one outside suit and its Ace.**
- **Likely why (untested):** low trumps need help to reach 3 tricks, and an Ace is the most reliable help. Next is better than the opposite colour here because both opponents passed in round two, when the non-dealing team would usually make next on a decent hand. So they're probably weak in next.

### Dealer with the Right Bower plus one trump **(F16)**
Everyone has passed to you in round one. Three outside cards.

| Outside cards | Right Bower turned up | You hold the Right, other trump turned up |
|---|---:|---:|
| One suit, with its Ace | **+0.55** | **+0.36** |
| One suit, no Ace | **+0.45** | **+0.42** |
| Two suits, one an Ace | **+0.43** | **+0.28** |
| Two suits, no Ace | **+0.31** | **+0.08** |
| Three suits | *not tested: expect break-even or worse* | |

**Pick it up, never alone**, unless your outside cards are in three different suits. You'll be euchred about a third of the time, but passing is worse. The second trump's rank hardly matters.
- **Why:** after a pass, the opponents often name a suit where your Right Bower is no longer a top trump.
- **Likely why (untested) fewer suits is better:** fewer places for the opponents to win tricks, and you can trump in sooner.
- **Likely why (untested) the turned-up Right is better:** your partner knows you hold it and can play around it, and the opponents passed knowing you'd have it, so their hands are probably weaker. The one-suit, no-Ace hand scoring slightly above the one-suit-with-Ace hand in the second column (+0.42 against +0.36) is within the random noise of the test; the Ace helped everywhere else.

### Benny + Right + Left, by seat **(F7)**

| Seat | Pass | Order up | Alone | Do |
|---|---:|---:|---:|---|
| **Left of dealer** | **+2.19** | +1.42 | +2.09 | **Pass**, then name next in round two |
| **Right of dealer** | +1.08 | +1.27 | **+1.59** | **Go alone** |

- **Why:** from the left, after you pass, 77% of the time you name trump in round two and 23% of the time the dealer picks up and you euchre them. Both are excellent. From the right, you get to name only about 9% of the time; half the time someone else names first, often in the other colour, where your Bowers are just Jacks.

---

## 9. Surprises: what the tests overturned or sharpened

- **Ordering up with 3 trumps is a mistake from the left or right of the dealer.** It feels strong, but it hands the dealer a trump and a discard.
- **The opening lead is barely an advantage.** About 0.03 points per hand. The dealer's left gains from first say in round two, not from leading.
- **"Make next" still needs 3 trumps** (or 2 and an off-suit Ace). Next is clearly better than the opposite colour, but 2 bare trumps rarely make 3 tricks.
- **The dealer, last to speak in round two, should make next**, the reverse of the dealing team's usual "against colour". "Avoid next" is a guess about the dealer's hand, and the dealer can see their own. Both opponents passing on next also suggests they're weak in it. With Q-10-9, next beat the opposite colour by about 0.5 points in every shape tested.
- **Don't open with your off-suit Ace as a maker.** Draw first, so nobody can trump it.
- **Make a void with a lone King.** Most players keep it; a void that lets you trump in is worth more.
- **Q-10-9 is a pick-up for the dealer**, in every shape. Passing is worse, because the opponents usually take over in round two.
- **Against a lone defender, don't draw trump.** It's the opposite of every other hand: their trumps are strong, so make them spend those trumps on your side suits.
- **The league's dealer-loner rule is a sound, safe version** of the data. It could go alone a little more with an outside Ace.
- **Defending alone with 3 trumps and a top trump pays,** against two makers or a loner, because each euchre is worth 4.
- **Answering a lone defender, or taking over a partner's loner, lost in every hand tested.** Answering drops the very player who chose trump. (Defending alone *against* a loner is a different situation, and often right.)

---

## 10. How we know, and the limits

**How it was tested.** A rules engine plays the league's game exactly: the 25-card deck with the Benny, Up and Down, blind calls on a turned-up Benny, defending alone for 4, and no stick-the-dealer. Computer players were tuned so the game *looks* like league play (round two in about a third of hands, loners about 1 in 10, defending alone about 1 in 20, ordering up from the left or right rare). Then, at every decision, the same position was played out every possible way, with a strong card-playing method (it imagines many possible deals of the unseen cards, consistent with everything seen so far, and picks the best card). The difference in score is what each choice is worth.

**How sure are the numbers?** Most rules rest on tens of thousands of hands, and the guide only gives advice where the difference is outside statistical noise. Where a choice is close, it says so ("toss-up", "about equal"). Bots that follow these rules beat bots that don't over hundreds of thousands of games.

**How sure are the explanations?** The ones marked **Why** were measured or follow from the scoring. The ones marked **Likely why (untested)** are reasoning: they fit the results and the table experience, but another explanation could be the real one. Any of them can be tested if it matters.

**The limits.**
- **Bots, not people.** The computer players are strong but not perfect, and real opponents bid and read the table in ways bots don't.
- **Table reading isn't modelled.** Signals, habits and knowing your opponents can change the right call.
- **Small gains need consistency.** Many rules are worth 0.1–0.4 points per hand. That's a lot over an evening, but it won't show in a single hand.
- **Subtle tactics need good follow-up.** Gone fishing and going low only pay if the rest of the hand is played well.

**Got a theory from the league?** It can be tested the same way: fix the hand, deal the rest at random many times, and play it out each way. See "Testing a new strategy idea" in [STRATEGY_FINDINGS.md](STRATEGY_FINDINGS.md).
