# Scripts Cleanup Summary

**Date**: 2025-12-24  
**Task**: Clean up and organize project scripts

---

## 🗑️ Removed Scripts (Temporary/Debug)

The following scripts were removed from `/server` root as they were temporary development/testing scripts:

1. **check_teams.js** - Simple team count checker (replaced by better scripts)
2. **reset_final.js** - Round 6 specific reset (hardcoded player names)
3. **purge_lonely_players.js** - One-time cleanup script for teamless players
4. **rescue_r6.js** - Round 6 rescue script (temporary fix)
5. **reset_r5.js** - Round 5 specific reset
6. **deep_reset_r2.js** - Round 2 deep reset (superseded by reset-to-round.js)
7. **skip_to_r6.js** - Skip to Round 6 script (development shortcut)
8. **seed-teams.js** - Team seeding (superseded by reset-db.js and auto_build_teams.js)
9. **round6_helpers_temp.txt** - Temporary text file
10. **reset-to-round1.sql** - SQL file (superseded by JavaScript scripts)

---

## ✅ Organized Scripts

All useful scripts are now in `/server/scripts/` directory:

### Database Management (3)

- `clean-db.js` - Clean game data, keep users
- `reset-db.js` ⭐ - Complete reset with Round 2 state
- `reset-migrations.js` - Drop all tables (dangerous)
- `check-tables.js` - List all database tables

### Seeding & Setup (3)

- `seed-initial.js` ⭐ - Initial setup (40 players, 5 volunteers)
- `create-admin.js` - Create admin account
- `seed-players.js` - Add more test players

### Testing & Debugging (5)

- `check-users.js` - View all users and status
- `check-pool.js` - View lottery pool
- `check-taken.js` - Check taken lottery cards
- `find-player-card.js` - Find specific player card
- `test-ws.js` - Test WebSocket connection

### Game State Management (4)

- `reset-to-round.js` ⭐ - Reset to specific round (preserves previous data)
- `reset-team-test.js` - Reset team data
- `auto_build_teams.js` - Auto-create teams for testing

**Total**: 15 organized scripts + 1 README

---

## 📚 Documentation

Created comprehensive documentation at `/server/scripts/README.md` including:

- Purpose and usage for each script
- Command examples
- When to use each script
- Common workflows
- Safety warnings
- Production usage guidelines

---

## 🎯 Recommended Scripts for Common Tasks

### First-Time Setup

```bash
node scripts/seed-initial.js
node scripts/create-admin.js
```

### Quick Development Reset

```bash
node scripts/reset-db.js  # Resets to Round 2 finished
```

### Testing Specific Rounds

```bash
node scripts/reset-to-round.js 3  # Test Round 3
node scripts/reset-to-round.js 5  # Test Round 5
```

### Debugging

```bash
node scripts/check-users.js      # View all users
node scripts/check-tables.js     # View database schema
node scripts/test-ws.js          # Test WebSocket
```

---

## 📁 Final Structure

```
server/
├── scripts/
│   ├── README.md                 ⭐ Complete documentation
│   ├── reset-db.js              ⭐ Quick reset to Round 2
│   ├── reset-to-round.js        ⭐ Reset to any round
│   ├── seed-initial.js          ⭐ Initial setup
│   ├── create-admin.js
│   ├── auto_build_teams.js
│   ├── clean-db.js
│   ├── check-users.js
│   ├── check-pool.js
│   ├── check-tables.js
│   ├── check-taken.js
│   ├── find-player-card.js
│   ├── reset-migrations.js
│   ├── reset-team-test.js
│   ├── seed-players.js
│   └── test-ws.js
├── routes/
├── migrations/
├── db.js
├── index.js
└── package.json
```

---

_Clean code, clean scripts, clean mind._
