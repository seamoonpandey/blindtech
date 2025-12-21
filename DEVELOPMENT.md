# 🛠️ BLINDTECH: DEVELOPMENT GUIDE

Technical specifications for the **Blindtech** platform. This document defines the architecture, environment protocols, and setup procedures for development.

---

## 🏗️ ARCHITECTURE OVERVIEW

Blindtech is a full-stack real-time application:

- **Core Strategy**: Individual and team-based state management via PostgreSQL.
- **Backend API**: Node.js utilizing **Fastify** for HTTP routing and native **WebSockets** for game state synchronization.
- **Frontend**: **Vite**-powered React application with TypeScript.

---

## ⚙️ ENVIRONMENT SETUP

### 1. PREREQUISITES

- Node.js v18+
- PostgreSQL v14+

### 2. DATABASE CONFIGURATION

Initialize a PostgreSQL instance and apply the schema:

```bash
# Example
createdb blindtech
cd server
npm install
npm run migrate up
```

### 3. SERVER CONFIGURATION

Create a `.env` in `/server`:

```env
DATABASE_URL=postgres://[user]:[password]@localhost:5432/blindtech
JWT_SECRET=[secure_key]
PORT=3000
```

### 4. CLIENT CONFIGURATION

```bash
cd ui
npm install
npm run dev
```

---

## 📡 WEBSOCKET SPECIFICATION

Real-time synchronization follows a strict event-driven protocol:

### Outbound (Client -> Server)

- `auth`: Initial handshake with JWT.
- `start_round`: Trigger round state transition.
- `r[N]_submit_action`: Round-specific logic submission (e.g., `r6_submit_action`).

### Inbound (Server -> Client)

- `init`: Full state hydration.
- `state_update`: Global state delta.
- `round[N]_update`: Specific sub-engine state updates.

---

## 🛠️ MAINTENANCE & TOOLING

- **Database Migrations**: Managed via `node-pg-migrate`.
- **Seeding**: Use `npm run reset-zero` to re-initialize a fresh development environment.
- **State Simulation**: Root scripts like `skip_to_r6.js` are available to bypass early rounds for gameplay testing.

---

_“The system is only as reliable as its infrastructure.”_
