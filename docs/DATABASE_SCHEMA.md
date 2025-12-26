# 🗄️ BLINDTECH: DATABASE SCHEMA

Complete database schema documentation with entity-relationship diagrams.

---

## 📊 ENTITY-RELATIONSHIP DIAGRAM

```mermaid
erDiagram
    users ||--o{ submissions : "submits"
    users ||--o{ lottery_pool : "takes_card"
    users ||--o{ teams : "forms_team_as_user1"
    users ||--o{ teams : "forms_team_as_user2"
    users ||--o{ round3_matches : "volunteers_for"
    users ||--o{ round4_sessions : "volunteers_for"
    users ||--o{ round5_games : "volunteers_for"
    users ||--o{ round5_turns : "plays_turn"
    users ||--o{ hearts_players : "participates_in_hearts"

    teams ||--o{ round3_matches : "competes_as_team1"
    teams ||--o{ round3_matches : "competes_as_team2"
    teams ||--o{ round4_sessions : "has_session"
    teams ||--o{ round5_games : "competes_as_team_a"
    teams ||--o{ round5_games : "competes_as_team_b"

    round5_games ||--o{ round5_turns : "has_turns"

    users {
        uuid id PK
        text name
        text email UK
        text password_hash
        text role "player|volunteer"
        boolean is_eliminated
        boolean has_used_safety
        timestamp created_at
    }

    game_state {
        integer id PK "always 1"
        integer current_round
        text status "waiting|active|finished"
        timestamp updated_at
    }

    submissions {
        uuid id PK
        uuid user_id FK
        integer round
        jsonb payload
        timestamp created_at
    }

    lottery_pool {
        uuid id PK
        jsonb content
        boolean is_taken
        uuid taken_by FK
    }

    teams {
        uuid id PK
        uuid user1_id FK
        uuid user2_id FK
        integer round_formed
        varchar name
    }

    round3_matches {
        uuid id PK
        uuid team1_id FK
        uuid team2_id FK
        uuid volunteer_id FK
        jsonb team1_scores
        jsonb team2_scores
        integer current_subround
        varchar status "waiting|active|finished"
        timestamp created_at
    }

    round4_sessions {
        uuid id PK
        uuid team_id FK
        uuid volunteer_id FK
        varchar status
        varchar result "pass|fail"
        timestamp created_at
    }

    round5_games {
        uuid id PK
        uuid team_a_id FK
        uuid team_b_id FK
        uuid volunteer_id FK
        integer team_a_momentum
        integer team_b_momentum
        boolean team_a_pact_used
        boolean team_b_pact_used
        jsonb team_a_exhausted_cards "Card Exhaustion System"
        jsonb team_b_exhausted_cards "Card Exhaustion System"
        integer current_round
        varchar active_team "A|B"
        jsonb team_a_turn_order
        jsonb team_b_turn_order
        varchar status "waiting|active|sudden_death|finished"
        varchar result "team_a_win|team_b_win|both_win|both_lose"
        boolean is_sudden_death
        timestamp created_at
    }

    round5_turns {
        uuid id PK
        uuid game_id FK
        integer round_number
        uuid player_id FK
        varchar team "A|B"
        varchar card_selected "ATTACK|FORTIFY|CONVERGE"
        boolean is_revealed
        varchar pact_used
        timestamp created_at
    }

    hearts_game_state {
        integer id PK "always 1"
        integer current_cycle
        text status "waiting|acting|resolving|finished"
        uuid winner_id FK
    }

    hearts_players {
        uuid user_id PK FK
        uuid teammate_id FK
        integer hearts
        boolean is_alive
        text current_action "PROTECT|BETRAY|SACRIFICE|QUIT|FINAL_SACRIFICE|REFUSE"
        uuid target_id FK
    }
```

---

## 📋 TABLE DETAILS

### **Core Tables**

#### `users`

**Purpose**: All participants (players and volunteers/admins)

| Column          | Type      | Constraints      | Description             |
| --------------- | --------- | ---------------- | ----------------------- |
| id              | UUID      | PK               | Auto-generated UUID     |
| name            | TEXT      | NOT NULL         | Display name            |
| email           | TEXT      | NOT NULL, UNIQUE | Login email             |
| password_hash   | TEXT      | NOT NULL         | Bcrypt hashed password  |
| role            | TEXT      | NOT NULL, CHECK  | 'player' or 'volunteer' |
| is_eliminated   | BOOLEAN   | DEFAULT false    | Elimination status      |
| has_used_safety | BOOLEAN   | DEFAULT false    | Round 6 safety token    |
| created_at      | TIMESTAMP | DEFAULT now()    | Account creation time   |

**Indexes**:

- Primary key on `id`
- Unique index on `email`

---

#### `game_state`

**Purpose**: Global game state (singleton table)

| Column        | Type      | Constraints                 | Description                     |
| ------------- | --------- | --------------------------- | ------------------------------- |
| id            | INTEGER   | PK                          | Always 1 (singleton)            |
| current_round | INTEGER   | NOT NULL, DEFAULT 0         | Current round (0-6)             |
| status        | TEXT      | NOT NULL, DEFAULT 'waiting' | 'waiting', 'active', 'finished' |
| updated_at    | TIMESTAMP | DEFAULT now()               | Last update time                |

**Note**: Only one row exists with `id = 1`

---

### **Round 1: Popularity Contest**

#### `submissions`

**Purpose**: Player rankings submitted in Round 1

| Column     | Type      | Constraints          | Description                |
| ---------- | --------- | -------------------- | -------------------------- |
| id         | UUID      | PK                   | Submission ID              |
| user_id    | UUID      | FK → users, NOT NULL | Who submitted              |
| round      | INTEGER   | NOT NULL             | Round number (always 1)    |
| payload    | JSONB     | NOT NULL             | Array of {target_id, rank} |
| created_at | TIMESTAMP | DEFAULT now()        | Submission time            |

**Constraints**:

- Unique constraint on `(user_id, round)`
- Foreign key: `user_id` → `users(id)` ON DELETE CASCADE

---

### **Round 2: The Lottery**

#### `lottery_pool`

**Purpose**: Cards in the lottery pool (player cards and elimination quotes)

| Column   | Type    | Constraints      | Description                   |
| -------- | ------- | ---------------- | ----------------------------- |
| id       | UUID    | PK               | Card ID                       |
| content  | JSONB   | NOT NULL         | {type: 'player'/'quote', ...} |
| is_taken | BOOLEAN | DEFAULT false    | Whether card is taken         |
| taken_by | UUID    | FK → users, NULL | Who took this card            |

**Content Structure**:

- Player card: `{type: 'player', id: uuid, name: string}`
- Quote card: `{type: 'quote', text: string}`

---

#### `teams`

**Purpose**: Formed teams (pacts)

| Column       | Type         | Constraints          | Description                   |
| ------------ | ------------ | -------------------- | ----------------------------- |
| id           | UUID         | PK                   | Team ID                       |
| user1_id     | UUID         | FK → users, NOT NULL | First team member             |
| user2_id     | UUID         | FK → users, NOT NULL | Second team member            |
| round_formed | INTEGER      | NOT NULL             | Round when formed (usually 2) |
| name         | VARCHAR(255) | NULL                 | Team name                     |

**Foreign Keys**:

- `user1_id` → `users(id)`
- `user2_id` → `users(id)`

---

### **Round 3: The Trials**

#### `round3_matches`

**Purpose**: Team vs Team matches with volunteer judges

| Column           | Type        | Constraints       | Description                     |
| ---------------- | ----------- | ----------------- | ------------------------------- |
| id               | UUID        | PK                | Match ID                        |
| team1_id         | UUID        | FK → teams, NULL  | First team                      |
| team2_id         | UUID        | FK → teams, NULL  | Second team                     |
| volunteer_id     | UUID        | FK → users, NULL  | Judge volunteer                 |
| team1_scores     | JSONB       | DEFAULT []        | Array of boolean scores         |
| team2_scores     | JSONB       | DEFAULT []        | Array of boolean scores         |
| current_subround | INTEGER     | DEFAULT 1         | Current question (1-3)          |
| status           | VARCHAR(20) | DEFAULT 'waiting' | 'waiting', 'active', 'finished' |
| created_at       | TIMESTAMP   | DEFAULT now()     | Match creation time             |

**Scoring**: Teams need ≥2 positive scores to survive

---

### **Round 4: Coding Club**

#### `round4_sessions`

**Purpose**: Team coding sessions with volunteer oversight

| Column       | Type        | Constraints          | Description          |
| ------------ | ----------- | -------------------- | -------------------- |
| id           | UUID        | PK                   | Session ID           |
| team_id      | UUID        | FK → teams, NOT NULL | Team in session      |
| volunteer_id | UUID        | FK → users, NULL     | Overseeing volunteer |
| status       | VARCHAR(20) | DEFAULT 'waiting'    | Session status       |
| result       | VARCHAR(10) | NULL                 | 'pass' or 'fail'     |
| created_at   | TIMESTAMP   | DEFAULT now()        | Session start time   |

---

### **Round 5: The Paradox**

#### `round5_games`

**Purpose**: 2v2 team battles with momentum mechanics

| Column            | Type        | Constraints          | Description            |
| ----------------- | ----------- | -------------------- | ---------------------- |
| id                | UUID        | PK                   | Game ID                |
| team_a_id         | UUID        | FK → teams, NOT NULL | Team A                 |
| team_b_id         | UUID        | FK → teams, NULL     | Team B (null = bye)    |
| volunteer_id      | UUID        | FK → users, NULL     | Game master            |
| team_a_momentum   | INTEGER     | DEFAULT 7            | Team A momentum (0-14) |
| team_b_momentum   | INTEGER     | DEFAULT 7            | Team B momentum (0-14) |
| team_a_pact_used  | BOOLEAN     | DEFAULT false        | Pact token used        |
| team_b_pact_used  | BOOLEAN     | DEFAULT false        | Pact token used        |
| current_round     | INTEGER     | DEFAULT 1            | Current round (1-7)    |
| active_team       | VARCHAR(1)  | DEFAULT 'A'          | 'A' or 'B'             |
| team_a_turn_order | JSONB       | NOT NULL             | [userId1, userId2]     |
| team_b_turn_order | JSONB       | NULL                 | [userId1, userId2]     |
| status            | VARCHAR(20) | DEFAULT 'waiting'    | Game status            |
| result            | VARCHAR(20) | NULL                 | Win/loss outcome       |
| is_sudden_death   | BOOLEAN     | DEFAULT false        | Sudden death flag      |
| created_at        | TIMESTAMP   | DEFAULT now()        | Game creation time     |

**Status Values**: 'waiting', 'active', 'sudden_death', 'finished'  
**Result Values**: 'team_a_win', 'team_b_win', 'both_win', 'both_lose'

---

#### `round5_turns`

**Purpose**: Individual card plays in Round 5 games

| Column        | Type        | Constraints                 | Description              |
| ------------- | ----------- | --------------------------- | ------------------------ |
| id            | UUID        | PK                          | Turn ID                  |
| game_id       | UUID        | FK → round5_games, NOT NULL | Parent game              |
| round_number  | INTEGER     | NOT NULL                    | Round number (1-7)       |
| player_id     | UUID        | FK → users, NOT NULL        | Player who played        |
| team          | VARCHAR(1)  | NOT NULL                    | 'A' or 'B'               |
| card_selected | VARCHAR(10) | NOT NULL                    | Card type                |
| is_revealed   | BOOLEAN     | DEFAULT false               | Whether card is revealed |
| pact_used     | VARCHAR(50) | NULL                        | Pact ability used        |
| created_at    | TIMESTAMP   | DEFAULT now()               | Turn timestamp           |

**Card Types**: 'ATTACK', 'FORTIFY', 'CONVERGE'  
**Pact Abilities**: 'reduce_penalty', 'copy_opponent', 'ignore_negative'

**Foreign Keys**:

- `game_id` → `round5_games(id)` ON DELETE CASCADE

---

### **Round 6: Game of Hearts (Final Round)**

#### `hearts_game_state`

**Purpose**: Global state for the final round (singleton)

| Column        | Type    | Constraints                 | Description            |
| ------------- | ------- | --------------------------- | ---------------------- |
| id            | INTEGER | PK                          | Always 1 (singleton)   |
| current_cycle | INTEGER | NOT NULL, DEFAULT 1         | Current action cycle   |
| status        | TEXT    | NOT NULL, DEFAULT 'waiting' | Game phase             |
| winner_id     | UUID    | FK → users, NULL            | Winner (when finished) |

**Status Values**: 'waiting', 'acting', 'resolving', 'finished'

---

#### `hearts_players`

**Purpose**: Player state in Game of Hearts

| Column         | Type    | Constraints            | Description           |
| -------------- | ------- | ---------------------- | --------------------- |
| user_id        | UUID    | PK, FK → users         | Player ID             |
| teammate_id    | UUID    | FK → users, NULL       | Pact partner          |
| hearts         | INTEGER | NOT NULL, DEFAULT 3    | Heart count (0-3)     |
| is_alive       | BOOLEAN | NOT NULL, DEFAULT true | Alive status          |
| current_action | TEXT    | NULL                   | Current action choice |
| target_id      | UUID    | FK → users, NULL       | Action target         |

**Action Types**:

- 'PROTECT' - Protect teammate
- 'BETRAY' - Steal heart from target
- 'SACRIFICE' - Give heart to teammate
- 'QUIT' - Leave game
- 'FINAL_SACRIFICE' - Final round sacrifice
- 'REFUSE' - Final round refusal

**Foreign Keys**:

- `user_id` → `users(id)`
- `teammate_id` → `users(id)`
- `target_id` → `users(id)`

---

## 🔗 RELATIONSHIPS

### One-to-Many Relationships

1. **users → submissions**: One user can have multiple submissions (different rounds)
2. **users → lottery_pool**: One user can take multiple lottery cards
3. **users → teams**: One user can be in multiple teams (as user1 or user2)
4. **teams → round3_matches**: One team can participate in multiple matches
5. **teams → round4_sessions**: One team has one session
6. **teams → round5_games**: One team can participate in multiple games
7. **round5_games → round5_turns**: One game has multiple turns

### One-to-One Relationships

1. **users → hearts_players**: One user has one hearts player record
2. **game_state**: Singleton (only one row)
3. **hearts_game_state**: Singleton (only one row)

---

## 📐 CONSTRAINTS & INDEXES

### Unique Constraints

- `users.email` - Unique email addresses
- `submissions(user_id, round)` - One submission per user per round

### Check Constraints

- `users.role` - Must be 'player' or 'volunteer'

### Foreign Key Cascades

- `submissions.user_id` → ON DELETE CASCADE
- `round5_turns.game_id` → ON DELETE CASCADE
- `lottery_pool.taken_by` → ON DELETE SET NULL

---

## 🎯 ROUND PROGRESSION

```
Round 0 (Waiting)
    ↓
Round 1: Popularity Contest
    → submissions table populated
    ↓
Round 2: The Lottery
    → lottery_pool created
    → teams formed
    → users.is_eliminated updated
    ↓
Round 3: The Trials
    → round3_matches created
    → teams eliminated based on scores
    ↓
Round 4: Coding Club
    → round4_sessions created
    → teams eliminated based on result
    ↓
Round 5: The Paradox
    → round5_games created
    → round5_turns recorded
    → teams eliminated based on momentum
    ↓
Round 6: Game of Hearts
    → hearts_game_state initialized
    → hearts_players created
    → cycles until one winner
```

---

## 💾 DATA FLOW EXAMPLES

### Round 2: Team Formation

```sql
-- 1. Player picks a card
UPDATE lottery_pool
SET is_taken = true, taken_by = $player_id
WHERE id = $card_id;

-- 2. If player card, create team
INSERT INTO teams (user1_id, user2_id, round_formed, name)
VALUES ($selector_id, $leader_id, 2, $team_name);

-- 3. If quote card, eliminate player
UPDATE users
SET is_eliminated = true
WHERE id = $player_id;
```

### Round 5: Card Play

```sql
-- 1. Player selects card
INSERT INTO round5_turns (game_id, round_number, player_id, team, card_selected)
VALUES ($game_id, $round, $player_id, $team, $card);

-- 2. Reveal and resolve
UPDATE round5_turns
SET is_revealed = true
WHERE game_id = $game_id AND round_number = $round;

-- 3. Update momentum
UPDATE round5_games
SET team_a_momentum = $new_momentum
WHERE id = $game_id;
```

### Round 6: Heart Action

```sql
-- 1. Player submits action
UPDATE hearts_players
SET current_action = 'BETRAY', target_id = $target
WHERE user_id = $player_id;

-- 2. Resolve cycle (engine logic)
-- 3. Update hearts and alive status
UPDATE hearts_players
SET hearts = hearts - 1, is_alive = (hearts > 0)
WHERE user_id = $affected_player;
```

---

## 🔍 USEFUL QUERIES

### Get Active Players

```sql
SELECT * FROM users
WHERE role = 'player' AND is_eliminated = false;
```

### Get All Teams

```sql
SELECT t.*,
       u1.name as player1_name,
       u2.name as player2_name
FROM teams t
JOIN users u1 ON t.user1_id = u1.id
JOIN users u2 ON t.user2_id = u2.id
WHERE t.round_formed = 2;
```

### Get Round 5 Game State

```sql
SELECT g.*,
       ta.name as team_a_name,
       tb.name as team_b_name
FROM round5_games g
JOIN teams ta ON g.team_a_id = ta.id
LEFT JOIN teams tb ON g.team_b_id = tb.id
WHERE g.status != 'finished';
```

### Get Hearts Leaderboard

```sql
SELECT u.name, hp.hearts, hp.is_alive
FROM hearts_players hp
JOIN users u ON hp.user_id = u.id
WHERE hp.is_alive = true
ORDER BY hp.hearts DESC;
```

---

_"In the database, every relationship tells a story of survival."_

**Last Updated**: 2025-12-24  
**Schema Version**: 1.0
