# Round 5: The Paradox - Digital Implementation mechanics

The Paradox is a strategic, team-based coordination game designed to test trust and intuition under a strict communication blackout.

## Core Setup

- **Initial Momentum:** Each team starts with **15 Momentum Points**.
- **Total Duration:** 9 sub-rounds (Odd number).
- **Instant Death:** If a team's momentum hits **0 or less**, they are instantly **eliminated**.
- **Teammates' Roles (Alternating Turns):**
  - **Turn 1 (The Choice):** Both teammates see the controls. The first one to select a card becomes **Player 1** for the rest of the game.
  - **Subsequent Turns:** Players alternate every single turn (1 -> 2 -> 1 -> 2...).
- **Strict Silence:** Players are forbidden from communicating with their partner. Any breach results in instant disqualification.

## Move Matrix

In each sub-round, both teams simultaneously select one of three cards. The interaction determines the momentum change for each team.

| Your Card       | vs Opponent's Card | Result (You / They) | Description                  |
| :-------------- | :----------------- | :------------------ | :--------------------------- |
| **🗡️ ATTACK**   | **🗡️ ATTACK**      | -1 / -1             | Mutual damage                |
| **🗡️ ATTACK**   | **🛡️ FORTIFY**     | +2 / -1             | You bypass their shield      |
| **🗡️ ATTACK**   | **🤝 CONVERGE**    | -2 / +2             | They absorb your energy      |
| **🛡️ FORTIFY**  | **🗡️ ATTACK**      | -1 / +2             | They breakthrough            |
| **🛡️ FORTIFY**  | **🛡️ FORTIFY**     | 0 / 0               | Stale standoff               |
| **🛡️ FORTIFY**  | **🤝 CONVERGE**    | +1 / -1             | You regain focus             |
| **🤝 CONVERGE** | **🗡️ ATTACK**      | +2 / -2             | You exploit their aggression |
| **🤝 CONVERGE** | **🛡️ FORTIFY**     | -1 / +1             | You lose focus               |
| **🤝 CONVERGE** | **🤝 CONVERGE**    | +3 / +3             | **Mutual Resonance**         |

## Secret Pacts (Special Abilities)

Each team may use **one** Secret Pact per match. Once used, it cannot be used again.

1. **🛡️ Reduce Penalty**: Converts any momentum loss of 2 or more into a mere -1.
2. **🚫 Ignore Negative**: Cancels out any momentum loss for that specific sub-round (result becomes 0 if it was negative).
3. **👥 Copy Previous**: Automatically plays the card that the opponent used in the _previous_ sub-round.

## Victory & Elimination

- **Instant Death Check:** Performed every sub-round. Momentum <= 0 = ELIMINATION.
- **End Game Check:**
  - The team with the highest momentum after 9 sub-rounds is the **Winner**.
  - The losing team is **Eliminated**.
  - If momentum is tied, **Both Teams Survive** provided they both have positive momentum.

---

## ♻️ Card Exhaustion System

Each player has a **hand of 3 cards**:

- 🗡️ Attack
- 🛡️ Fortify
- 🤝 Converge

Whenever a player uses a card:
➡️ It becomes **exhausted**
➡️ Removed from their hand **next sub-round**

Once **all 3** are exhausted:
➡️ Hand **refreshes**
➡️ All are usable again

So the pattern becomes:

```
Round 1: All 3 available
Round 2: Remaining 2 available
Round 3: Last card forced
Round 4: All 3 restored
...repeat...
```

This gives:

- **Guaranteed variety** every cycle
- **Forced reveals** → opponent can track what's left
- **Mind games** based on predictable limitations

---

## 🧠 Strategic Impact

| Before                | Now                          |
| --------------------- | ---------------------------- |
| Infinite repeats      | Forced rotation              |
| Meta = Converge abuse | Timing Converge matters      |
| Pure bluff            | Memory + prediction + bluff  |
| No planning horizon   | 3-turn cycles create tactics |

Teams now think:

> "They used Attack already… next turn they likely Fortify or Converge — can we exploit?"

---

## ⚔️ Improved Move Matrix? (Optional tweak)

We can make the **third turn** of each cycle **stronger**:

| Third-turn effect                                          |
| ---------------------------------------------------------- |
| If card is forced, values are **amplified by +1 momentum** |

This makes **card management** matter even more — choosing what ends up forced.

Example:
If your last card = Attack → risk but high reward
If last card = Converge → big payoff if mutual
If last card = Fortify → safety but no swing

---

## ✨ Optional Enhancements with Exhaustion

Pick any that sound good:

| Feature                            | What it adds                                   |
| ---------------------------------- | ---------------------------------------------- |
| **Exhaust Track visible**          | Opponent can count what you have left          |
| **Secret refresh** (once per game) | Skip exhaustion cycle to bluff                 |
| **Discard manipulation**           | Some ability to rearrange what becomes last    |
| **Team sync refresh**              | Both refresh early only if they play same card |

---

## 🧩 Compatibility with existing mechanics

- Momentum system — **unchanged**
- Secret Pacts — still usable
- Alternating players — stays intact
- Silence rule — becomes **more intense** since tracking matters
