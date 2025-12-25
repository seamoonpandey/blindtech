# 📖 BLINDTECH: THE DEFINITIVE GAME MANUAL

> _"The system is as consistent as its participants are volatile."_

This manual serves as the primary source of truth for the **Blindtech** trials. It detail the mechanics, governing laws, and mathematical foundations of each round.

---

## 🖤 LORE: THE DE-CALIBRATION

Blindtech is an iterative filtration process designed to identify "Resonant Units." Participants enter as individuals, but survival requires navigating complex social structures and absolute silence. Those who fail to maintain their Pulse (Hearts/Momentum) are "De-calibrated"—purged from the active trial.

---

## 🦾 THE TRIALS (ROUND-BY-ROUND)

### I. POPULARITY HELL (Social Calibration)

**Objective:** Evaluation of social hierarchy and mutual perception.

- **Scoring Structure**:
  - **Base Max ($B_1$):** 100 points (Rank 1).
  - **Base Min ($B_n$):** 10 points (floor for ranking).
  - **Calculation**: For $n$ selections, points scale linearly: $Score = B_1 - (Rank - 1) \times \frac{B_1 - B_n}{n - 1}$.
  - **Mutual Multiplier ($M=2$)**: Points are doubled if two participants rank each other.

### II. THE LOTTERY (The Selection)

**Objective:** Randomized filtration and Unit formation.

- **Leaders**: The top tier of the Round 1 leaderboard is granted "Leader" status and initial safety.
- **The Draw**: Non-leaders (Selectors) draw from a pool containing Leaders and "System Fragments" (Dystopian Quotes).
  - **Leader Draw**: Forms a **Permanent Team**. Both are safe.
  - **Fragment Draw**: Instant termination for the Selector.

### III. PHYSICAL SCRIBBLE (Sync Trial)

**Objective:** Non-verbal synchronization.

- **Protocol**: 2v2 physical duels overseen by System Moderators. One partner (The Scribe) communicates a concept to the other (The Interpreter) without speech.
- **Victory Condition**: Reaching the "Calibration Threshold" (3 correct interpretations) before the opponent.

### IV. THE LOGIC GATES (Technical Filter)

**Objective:** Evaluation of technical logic and technical proficiency.

- **Challenge**: Real-time algorithmic problems.
- **Criteria**: Solutions are evaluated on correctness and logic density. Failure results in unit deletion.

### V. THE PARADOX TURN (Strategic Abyss)

**Objective:** Coordination under absolute silence using limited data.

- **Initial State**: Teams start with **15 Momentum**.
- **The Matrix**:
  - **ATTACK vs ATTACK**: -1 / -1
  - **ATTACK vs FORTIFY**: +2 / -1
  - **ATTACK vs CONVERGE**: -2 / +2
  - **FORTIFY vs CONVERGE**: +1 / -1
  - **CONVERGE vs CONVERGE**: +3 / +3 (**Mutual Resonance**)
- **Instant Death**: Reaching 0 Momentum results in immediate termination.

### VI. THE PIGEON ROUND (Variable Elimination)

**Objective:** Tactical player elimination through voting and unit-level collateral damage.

- **Voting Phase**: Active players must nominate a target for elimination.
- **The Pigeon Rule**: If a player is eliminated via the vote, their **unit partner** is also automatically terminated.
- **Protocol**:
  - Sub-rounds continue until only **two units (four players)** remain.
  - Failure to vote within the deadline results in immediate termination of the unit.

### VII. THE GAME OF HEARTS (Final Survival)

**Trigger:** Activates only when the game is manually slimmed down to the final units (typically two units / four players).
**Nature:** Cycle-based attrition game focused on betrayal, pressure, and irreversible choice.
**Communication:** Physical table talk only. The engine does not manage chat, persuasion, or timing.

---

## 1. CORE MECHANICS

### 1.1 Hearts

* Every player starts this round with **3 Hearts**
* A player is eliminated when their Hearts reach **0**

---

### 1.2 The Bleed

* At the end of every cycle, **each living player loses 1 Heart**
* This represents inevitable decay and pressure

---

### 1.3 The Feed

* If a player **successfully steals a Heart using BETRAY** during a cycle:

  * That player **does not suffer The Bleed** for that cycle

---

### 1.4 Rule of Two (Pre-Final Only)

* Before the final duel:

  * If a cycle would result in **all players being eliminated**, the system revives the **two players who had the highest Hearts before elimination**
  * Revived players return with **1 Heart**
* **This rule does NOT apply once the Final Duel begins**

---

## 2. ACTIONS (CHOSEN SIMULTANEOUSLY EACH CYCLE)

| Action        | Target        | Cost     | Effect                                                                    |
| ------------- | ------------- | -------- | ------------------------------------------------------------------------- |
| **BETRAY**    | Opponent      | 0        | Steal 1 Heart from target. If successful, you avoid The Bleed this cycle. |
| **PROTECT**   | Self or Other | 1 Heart  | Blocks one BETRAY against the target for this cycle.                      |
| **SACRIFICE** | Teammate      | 2 Hearts | Instantly eliminates your teammate. Cannot be blocked or reversed.        |
| **QUIT**      | N/A           | Death    | Eliminates yourself and your teammate. All opponents gain +1 Heart.       |

---

## 3. INTERACTION RULES

### 3.1 Critical Collision

* If two players **BETRAY each other in the same cycle**:

  * No Hearts are stolen
  * Both players lose:

    * **1 Heart from the clash**
    * **1 Heart from The Bleed**
  * Total loss: **–2 Hearts each**

---

### 3.2 Shielded Theft

* If a player attempts to BETRAY a **PROTECTED** target:

  * The BETRAY fails
  * No Heart is stolen
  * The attacker **still suffers The Bleed**

---

### 3.3 Coward’s Tax

* QUIT is the **only action that increases the total Heart pool**
* It does so by demanding total self-destruction

---

## 4. CYCLE RESOLUTION ORDER

1. QUIT
2. SACRIFICE
3. BETRAY
4. PROTECT
5. Apply The Feed (if applicable)
6. Apply The Bleed
7. Eliminate players at 0 Hearts
8. Check for Final Duel or Rule of Two (if applicable)

---

## 5. FINAL DUEL — *Last Sacrifice*

### 5.1 Trigger

* When **exactly two players remain alive**, the game enters the **Final Duel**

---

### 5.2 State Changes

* Both remaining players’ Hearts are set to **1**
* **The Bleed is suspended**
* **Rule of Two is disabled**
* Actions are chosen **simultaneously and secretly**

---

### 5.3 Allowed Actions (Final Duel Only)

* **SACRIFICE**
* **REFUSE** (PROTECT counts as REFUSE)
* **BETRAY**
* **QUIT**

---

### 5.4 Final Duel Resolution

| Player A  | Player B  | Outcome                                |
| --------- | --------- | -------------------------------------- |
| SACRIFICE | REFUSE    | **A wins**                             |
| REFUSE    | SACRIFICE | **B wins**                             |
| SACRIFICE | SACRIFICE | **No winner**                          |
| REFUSE    | REFUSE    | **Final Bleed → both die → no winner** |
| BETRAY    | Any       | **BETRAYER loses immediately**         |
| QUIT      | Any       | **QUITTER loses immediately**          |

---

### 5.5 Final Bleed

* If the Final Duel does not resolve:

  * A **single Final Bleed** is applied
  * Both players lose 1 Heart
  * If both reach 0 → **No Winner**

There are **no further cycles**.

---

## 6. WIN CONDITIONS

A player wins only by:

1. Being the **sole survivor** before the Final Duel
2. Being the **only player to choose SACRIFICE** in the Final Duel
3. Surviving when the opponent **BETRAYS or QUITS** in the Final Duel

If none of the above occur → **No Winner**

---

## 7. DESIGN INTENT (NON-MECHANICAL)

* Early rounds reward betrayal
* This round punishes certainty
* The final victory requires **risk without guarantee**
* The system does not save the players anymore

---

## ⚖️ GLOBAL LAWS

1. **The Pigeon Rule**: In specific rounds, the termination of one unit member results in a high probability of the partner's termination.
2. **Absolute Silence**: When "Silence Mode" is engaged, all out-of-band communication results in instant disqualification.
3. **Referee Authority**: System Administrators have final jurisdiction over all state transitions.

---

_“May your logic be sound, and your heart be heavy.”_
