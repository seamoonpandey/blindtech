export type Action = 'PROTECT' | 'BETRAY' | 'SACRIFICE' | 'QUIT' | 'FINAL_SACRIFICE' | 'REFUSE';

export interface PlayerState {
  id: string;
  name: string;
  hearts: number;
  isAlive: boolean;
  teammateId?: string;
}

export interface CycleAction {
  playerId: string;
  action: Action;
  targetId?: string; // For PROTECT, BETRAY, SACRIFICE
}

export interface CycleResult {
  updatedPlayers: PlayerState[];
  logs: string[];
  winnerId?: string;
}

export function resolveCycle(players: PlayerState[], actions: CycleAction[]): CycleResult {
  const updatedPlayers = players.map(p => ({ ...p }));
  const logs: string[] = [];

  const getPlayer = (id: string) => updatedPlayers.find(p => p.id === id);
  const getAction = (id: string) => actions.find(a => a.playerId === id);

  // 1. QUIT
  const quitters = actions.filter(a => a.action === 'QUIT');
  for (const q of quitters) {
    const player = getPlayer(q.playerId);
    if (!player || !player.isAlive) continue;

    logs.push(`${player.name} chose QUIT. Terminating team.`);
    player.isAlive = false;
    player.hearts = 0;

    if (player.teammateId) {
      const teammate = getPlayer(player.teammateId);
      if (teammate && teammate.isAlive) {
        logs.push(`${teammate.name} was dragged down by their partner.`);
        teammate.isAlive = false;
        teammate.hearts = 0;
      }
    }

    // Opponents gain 1 Heart each
    updatedPlayers.forEach(p => {
      if (p.isAlive && p.id !== player.id && p.id !== player.teammateId) {
        p.hearts += 1;
        logs.push(`${p.name} gained 1 Heart from the cowardice of others.`);
      }
    });
  }

  // 2. SACRIFICE
  const sacrifices = actions.filter(a => a.action === 'SACRIFICE');
  for (const s of sacrifices) {
    const player = getPlayer(s.playerId);
    if (!player || !player.isAlive) continue;

    if (!s.targetId || s.targetId !== player.teammateId) {
      logs.push(`${player.name} tried to SACRIFICE invalid target. Action failed.`);
      continue;
    }

    const teammate = getPlayer(s.targetId);
    if (!teammate || !teammate.isAlive) {
      logs.push(`${player.name} tried to SACRIFICE a dead teammate. Action failed.`);
      continue;
    }

    if (player.hearts < 2) {
      logs.push(`${player.name} lacked the Hearts to SACRIFICE their teammate.`);
      continue;
    }

    logs.push(`${player.name} SACRIFICED ${teammate.name}. Cold.`);
    player.hearts -= 2;
    teammate.isAlive = false;
    teammate.hearts = 0;
  }

  // 3. BETRAY & PROTECT RESOLUTION
  const betrays = actions.filter(a => a.action === 'BETRAY' && a.targetId);
  const protects = actions.filter(a => a.action === 'PROTECT' && a.targetId);

  // Check which players are protected
  const protectedPlayers = new Set<string>();
  for (const p of protects) {
    const protector = getPlayer(p.playerId);
    if (!protector || !protector.isAlive) continue;

    if (protector.hearts < 1) {
      logs.push(`${protector.name} lacked the Heart to PROTECT.`);
      continue;
    }

    protector.hearts -= 1;
    protectedPlayers.add(p.targetId!);
    logs.push(`${protector.name} is PROTECTING ${getPlayer(p.targetId!)?.name}.`);
  }

  // Handle Mutual BETRAY
  const processedBetrays = new Set<string>();
  for (const b of betrays) {
    if (processedBetrays.has(b.playerId)) continue;

    const attacker = getPlayer(b.playerId);
    const target = getPlayer(b.targetId!);
    if (!attacker || !attacker.isAlive || !target || !target.isAlive) continue;

    // Check if target is also betraying attacker (Mutual)
    const counterAction = getAction(target.id);
    if (counterAction && counterAction.action === 'BETRAY' && counterAction.targetId === attacker.id) {
      logs.push(`MUTUAL BETRAY between ${attacker.name} and ${target.name}. Both lose 1 Heart.`);
      attacker.hearts -= 1;
      target.hearts -= 1;
      processedBetrays.add(attacker.id);
      processedBetrays.add(target.id);
      continue;
    }

    // Check if target is protected
    if (protectedPlayers.has(target.id)) {
      logs.push(`${attacker.name} tried to BETRAY ${target.name}, but they were PROTECTED.`);
      processedBetrays.add(attacker.id);
      continue;
    }

    // Successful betrayal
    logs.push(`${attacker.name} BETRAYED ${target.name} and stole 1 Heart.`);
    attacker.hearts += 1;
    target.hearts -= 1;
    processedBetrays.add(attacker.id);
  }

  // 4. BLEED RULE
  updatedPlayers.forEach(p => {
    if (p.isAlive) {
      p.hearts -= 1;
      if (p.hearts <= 0) {
        logs.push(`${p.name} BLED OUT.`);
        p.isAlive = false;
        p.hearts = 0;
      }
    }
  });

  // 5. Final Eliminations check
  // (Already handled by bleeding out, but ensure we return correct state)

  // Winner check
  const alivePlayers = updatedPlayers.filter(p => p.isAlive);
  if (alivePlayers.length === 1) {
    return { updatedPlayers, logs, winnerId: alivePlayers[0].id };
  } else if (alivePlayers.length === 0) {
    return { updatedPlayers, logs, winnerId: undefined }; // No one survives
  }

  return { updatedPlayers, logs };
}

export function resolveFinalSacrifice(players: PlayerState[], choices: { playerId: string, choice: 'FINAL_SACRIFICE' | 'REFUSE' }[]): CycleResult {
  const updatedPlayers = players.map(p => ({ ...p }));
  const logs: string[] = [];

  const p1 = choices[0];
  const p2 = choices[1];

  if (p1.choice === 'FINAL_SACRIFICE' && p2.choice === 'REFUSE') {
    logs.push(`${getPlayerName(players, p1.playerId)} SACRIFICED. They WIN.`);
    return { updatedPlayers, logs, winnerId: p1.playerId };
  } else if (p2.choice === 'FINAL_SACRIFICE' && p1.choice === 'REFUSE') {
    logs.push(`${getPlayerName(players, p2.playerId)} SACRIFICED. They WIN.`);
    return { updatedPlayers, logs, winnerId: p2.playerId };
  } else if (p1.choice === 'FINAL_SACRIFICE' && p2.choice === 'FINAL_SACRIFICE') {
    logs.push(`BOTH SACRIFICED. NO WINNER.`);
    return { updatedPlayers, logs };
  } else {
    logs.push(`BOTH REFUSED. NO WINNER.`);
    return { updatedPlayers, logs };
  }
}

function getPlayerName(players: PlayerState[], id: string) {
  return players.find(p => p.id === id)?.name || 'Unknown';
}
