# 🛠️ BLINDTECH: UTILITY SCRIPTS

This directory contains utility scripts for database management, testing, and development workflows.

---

## 📋 TABLE OF CONTENTS

- [Database Management](#-database-management)
- [Seeding & Setup](#-seeding--setup)
- [Testing & Debugging](#-testing--debugging)
- [Game State Management](#-game-state-management)

---

## 🗄️ DATABASE MANAGEMENT

### `clean-db.js`

**Purpose**: Clean up database by removing all game data while preserving users.

**Usage**:

```bash
node scripts/clean-db.js
```

**When to use**: When you need to reset all game progress but keep user accounts intact.

---

### `reset-db.js` ⭐

**Purpose**: Complete database reset with pre-configured Round 2 state.

**Creates**:

- 40 Players (player1@test.com through player40@test.com)
- 5 Volunteers (vol1@test.com through vol5@test.com)
- 11 Teams (already formed from Round 2)
- Lottery pool with taken/untaken cards
- 18 Eliminated players (9 selectors who picked quotes + 9 unpicked leaders)
- Game state set to Round 2 Finished (ready for Round 3)

**Default Password**: `password123` (for all users)

**Usage**:

```bash
node scripts/reset-db.js
```

**When to use**:

- Quick setup for testing Round 3+ without playing through Round 1-2
- Demo environment with pre-formed teams
- Development reset with realistic game state

**⚠️ WARNING**: This truncates all tables and rebuilds from scratch.

---

### `reset-migrations.js`

**Purpose**: Reset database migrations (dangerous - drops all data).

**Usage**:

```bash
node scripts/reset-migrations.js
```

**⚠️ WARNING**: This will drop all tables. Only use in development when you need to completely rebuild the schema.

---

### `check-tables.js`

**Purpose**: List all tables in the database.

**Usage**:

```bash
node scripts/check-tables.js
```

**When to use**: Quick verification of database schema after migrations.

---

## 🌱 SEEDING & SETUP

### `seed-initial.js`

**Purpose**: Seed the database with initial users and game state.

**Creates**:

- 5 Volunteers (admin1@test.com through vol5@test.com)
- 40 Players (player1@test.com through player40@test.com)
- Initial game state (Round 0, waiting)

**Default Password**: `password123` (for all users)

**Usage**:

```bash
node scripts/seed-initial.js
```

**When to use**: First-time setup or complete database reset.

---

### `create-admin.js`

**Purpose**: Create or update the main admin account.

**Creates**:

- Email: `admin@blindtech.exe`
- Password: `admin123`
- Role: `volunteer`

**Usage**:

```bash
node scripts/create-admin.js
```

**When to use**: When you need a dedicated admin account or forgot admin credentials.

---

### `seed-players.js`

**Purpose**: Seed additional players for testing.

**Usage**:

```bash
node scripts/seed-players.js
```

**When to use**: When you need more test players beyond the initial 40.

---

## 🧪 TESTING & DEBUGGING

### `check-users.js`

**Purpose**: Display all users in the database with their roles and elimination status.

**Usage**:

```bash
node scripts/check-users.js
```

**When to use**: Verify user accounts, check elimination status, or debug user-related issues.

---

### `check-pool.js`

**Purpose**: Display the lottery pool state (Round 2).

**Usage**:

```bash
node scripts/check-pool.js
```

**When to use**: Debug Round 2 lottery mechanics or verify card distribution.

---

### `check-taken.js`

**Purpose**: Check which lottery cards have been taken and by whom.

**Usage**:

```bash
node scripts/check-taken.js
```

**When to use**: Debug Round 2 card selection issues.

---

### `find-player-card.js`

**Purpose**: Find a specific player's card in the lottery pool.

**Usage**:

```bash
node scripts/find-player-card.js
```

**When to use**: Debug specific player card issues in Round 2.

---

### `test-ws.js`

**Purpose**: Test WebSocket connection to the server.

**Usage**:

```bash
node scripts/test-ws.js
```

**When to use**: Verify WebSocket functionality or debug connection issues.

---

## 🎮 GAME STATE MANAGEMENT

### `reset-to-round.js` ⭐

**Purpose**: Reset the game to a specific round while preserving previous round data.

**Features**:

- Resets game to the beginning of specified round (1-5)
- Preserves all data from previous rounds
- Clears data from current and future rounds
- Restores correct player elimination states

**Usage**:

```bash
node scripts/reset-to-round.js <round_number>
```

**Examples**:

```bash
# Reset to Round 2 (keeps Round 1 data)
node scripts/reset-to-round.js 2

# Reset to Round 3 (keeps Round 1-2 data)
node scripts/reset-to-round.js 3

# Reset to Round 5 (keeps Round 1-4 data)
node scripts/reset-to-round.js 5
```

**When to use**:

- Testing specific rounds without replaying earlier rounds
- Debugging round-specific issues
- Demonstrating specific game phases

**What it does per round**:

- **Round 1**: Resurrects all players, clears submissions
- **Round 2**: Resurrects all players, clears lottery pool and teams
- **Round 3**: Restores Round 2 survivors (those in teams)
- **Round 4**: Restores Round 3 survivors (teams with ≥2 positives)
- **Round 5**: Restores Round 4 survivors (teams with 'pass' result)

---

### `reset-team-test.js`

**Purpose**: Reset team-related data for testing.

**Usage**:

```bash
node scripts/reset-team-test.js
```

**When to use**: Quick reset of team formations during Round 2-5 testing.

---

### `purge-lonely-players.js`

**Purpose**: Eliminate players who don't have a team after Round 2.

**Features**:

- Identifies players not in any Round 2 team
- Automatically eliminates them
- Syncs with Round 6 (Hearts) if active
- Safe to run multiple times (idempotent)

**Usage**:

```bash
node scripts/purge-lonely-players.js
```

**When to use**:

- After Round 2 lottery when some players didn't get paired
- Clean up orphaned players before advancing to Round 3
- Fix team formation issues where players are stuck without partners

**What it does**:

1. Finds all active players NOT in any Round 2 team
2. Sets `is_eliminated = true` for those players
3. If Round 6 is active, removes them from `hearts_players` table
4. Shows detailed log of who was eliminated

**Example Output**:

```
--- SYSTEM SCAN: SEARCHING FOR UNIT-LESS PLAYERS ---
Found 3 players with no teammates. Commencing de-calibration...
[DE-CALIBRATED] Player 15 (uuid-here)
[DE-CALIBRATED] Player 23 (uuid-here)
[DE-CALIBRATED] Player 31 (uuid-here)

Purge complete.
```

---

### `auto_build_teams.js`

**Purpose**: Automatically build teams for testing (bypasses Round 2 lottery).

**Usage**:

```bash
node scripts/auto_build_teams.js
```

**When to use**:

- Skip Round 2 lottery mechanics during testing
- Quickly set up teams for Round 3+ testing
- Demo purposes when you need pre-formed teams

---

## 🔧 COMMON WORKFLOWS

### Fresh Start (Complete Reset)

```bash
# 1. Reset migrations (drops all tables)
node scripts/reset-migrations.js

# 2. Run migrations
cd server && npm run migrate up

# 3. Seed initial data
node scripts/seed-initial.js

# 4. Create admin account
node scripts/create-admin.js
```

### Testing Specific Round

```bash
# Example: Test Round 4
node scripts/reset-to-round.js 4

# Verify state
node scripts/check-users.js
```

### Quick Team Setup for Testing

```bash
# 1. Reset to Round 2
node scripts/reset-to-round.js 2

# 2. Auto-build teams
node scripts/auto_build_teams.js

# 3. Advance to Round 3
node scripts/reset-to-round.js 3
```

---

## 📝 NOTES

- **Environment Variables**: All scripts use `DATABASE_URL` from `.env` file
- **Default Connection**: Falls back to `postgres://postgres@localhost:5432/blindtech`
- **Safety**: Scripts that modify data will show confirmation messages
- **Transactions**: Most scripts use database transactions for safety

---

## ⚠️ SAFETY WARNINGS

### Destructive Scripts (Use with Caution)

- `reset-migrations.js` - Drops all tables
- `clean-db.js` - Removes all game data
- `reset-to-round.js` - Clears future round data

### Production Usage

**DO NOT** run these scripts on production databases. They are designed for:

- Local development
- Testing environments
- Staging servers

For production, use proper database migration tools and backup procedures.

---

_"Scripts are the silent architects of controlled chaos."_
