# Blindtech – Multiplayer Elimination Game (Developer Design Document)

## Overview

This document defines the **game structure, rules, scoring logic, and elimination mechanics** for a multi‑round competitive game involving social strategy, luck, teamwork, logic, and technical skill.

- **Players**: N (dynamic, configurable)
- **Game Style**: Progressive elimination
- **Rounds**: 7 core rounds
- **Final Goal**: Reach the final round and win

---

## Core Concepts

- **Individual Identity**: Each player has a unique ID
- **Permanent Teams**: Formed in Round 2 and remain unchanged till game end
- **Silence Rule**: Some rounds strictly forbid speaking
- **Leaderboard**: Used after Round 1
- **Elimination**: Can be individual or team-based

---

## Round 1 – Popularity Hell

### Objective

Measure social perception using ranked mutual and non‑mutual selections.

### Mechanics

- Each player selects **any number (n)** of other players
- Selections must be **ranked** (Rank 1 = highest preference)

### Scoring

Let:

- **B1** = Base points for Rank 1
- **Bn** = Base points for Rank n = **10% of B1**
- Points scale linearly or exponentially between Rank 1 and Rank n (configurable)

#### Rules

1. If **X selects Y**:

   - Y receives base points based on the rank

2. If **X selects Y** AND **Y selects X** (mutual selection):

   - Y’s received points are multiplied by a **Mutual Multiplier (M)**
   - X’s received points are also multiplied by **M**

3. If selection is **not mutual**:

   - Selected player gets base points only
   - Selector gains **no points**

### Output

- Aggregate points for each player
- Generate a **logical leaderboard** sorted by total points

### End Condition

- Round completes when leaderboard is finalized

---

## Round 2 – Lottery & Pair

### Objective

Introduce randomness while **permanently forming teams** for the rest of the game.

### Mechanics

- Top **X players** from Round 1 leaderboard are **auto-safe**
- Remaining players enter the **lottery pool**

### Lottery Pool Composition

- **Real player names**: X
- **Fake entries**: TotalPlayers – 2X

### Rules

- Lottery is drawn randomly
- If a player draws a **real player name** → forms a **team (pair)**
- Teams formed in this round are **permanent and cannot be changed**
- If a player draws a **fake entry** → **eliminated**

### Team Persistence Rule (Global)

- Teams created in Round 2 remain **unchanged until the end of the game**
- All future rounds respect these fixed teams
- If one teammate is eliminated in later rounds, **team-based elimination rules apply**

### Output

- Permanent teams
- Eliminated players

---

## Round 3 – Scribble (2v2 – Physical)

### Objective

Test non-verbal communication and coordination in a **physical, offline setup**.

### Control

- This round is **not digital**
- Fully managed by **Admin and Volunteers**
- Digital mechanics may be designed later

### Team Formation

- Teams of **2 players**
- One player per team is designated as **Silent Player**

### Rules

- Silent player:

  - Cannot speak
  - Writes/draws a secret word (drawable)

- Active player:

  - Attempts to guess the word

### Gameplay

- Each team gets **2 minutes** per turn
- Teams play **one at a time**
- Total of **3 rounds** per team

### Scoring

- Each correct guess = 1 point
- Team with higher total score wins

### Elimination

- Losing team(s) eliminated (admin-defined)

---

## Round 4 – PARADOX TURN (Silent Team Strategy)

### Objective

Psychological disruption through **silent, individual decision-making inside teams**.

---

### Game Setup

1. Players are divided into **Team A** and **Team B** (2 players each)
2. Each team starts with:

   - **7 Momentum (M)**
   - **3 cards**: ATTACK, FORTIFY, CONVERGE
   - **1 Secret Pact** (face down)

3. Decide which team goes first
4. Each team selects a **fixed internal turn order** (Player 1 / Player 2)

**Critical Rule**:

- Teams **cannot communicate at all**
- **Only the referee may speak**
- Any communication → **instant win for opponent**

---

### Round Structure

- **6 total rounds** (3 Active turns per team)
- Teams alternate Active Team
- Within a team, players act **individually in fixed order**

---

### Turn Flow

#### Step 1 – Silent Card Selection

- Active player selects one card secretly
- Card placed face down

#### Step 2 – Reveal

- Referee reveals cards
- Player actions resolve **one by one** in order

#### Step 3 – Momentum Resolution

Momentum changes according to matrix:

| Team A \ Team B | ATTACK  | FORTIFY | CONVERGE |
| --------------- | ------- | ------- | -------- |
| ATTACK          | –2 / –2 | +2 / –1 | –3 / +1  |
| FORTIFY         | –1 / +1 | 0 / 0   | +1 / –1  |
| CONVERGE        | +1 / –3 | –1 / +1 | +2 / +2  |

- Momentum updated **after each player turn**

#### Step 4 – Secret Pact (Once Per Team)

Options:

1. Reduce –3 to –1
2. Copy opponent’s last card
3. Ignore one negative change

- If both teams reveal simultaneously → cancel

---

### End Conditions

| Condition               | Result       |
| ----------------------- | ------------ |
| Team ≥9 M & Opponent <9 | Win          |
| Both ≥9                 | Both win     |
| Both ≤6                 | Mutual loss  |
| Both 7–8                | Sudden Death |

---

### Sudden Death

- One final round
- No Secret Pacts
- Silent rules remain
- Higher Momentum wins

---

## Round 5 – Coding Round

### Objective

Test logical reasoning and technical skill.

### Mechanics

- Individual round
- One or more coding problems
- Time‑limited

### Evaluation

- Correctness
- Efficiency (optional)
- Partial scoring allowed

### Output

- Ranked performance
- Bottom performers eliminated

---

## Round 6 – Vote Out (Pigeon Round)

### Objective

Social manipulation and alliance testing.

### Structure

- Total of **3 voting cycles**
- **6 players eliminated in total**

### Voting Rules

- Every remaining player votes individually
- **Volunteers / observers** are also allowed to vote
- Player with the **highest votes** is eliminated

### Pigeon Rule (Partner Elimination)

- If a player is eliminated:

  - Their **linked partner** is also eliminated automatically

### Communication

- A **chat channel is enabled**
- Players can discuss, manipulate, and form alliances

---

## Round 7 – Game of Hearts

### Status

- **Completely secret**
- Rules, mechanics, and win conditions are intentionally undisclosed
- Players are only informed that **imposters exist**

### Known Information

- If all imposters are eliminated → remaining players advance to final round

---

## Final Notes

- Multipliers, thresholds, and elimination counts should be **configurable**
- Silence rules must be strictly enforced where applicable
- Transparency level varies per round intentionally

This document is intended to be used by:

- Game designers
- Backend developers
- Moderators / referees

---

**End of Document**
