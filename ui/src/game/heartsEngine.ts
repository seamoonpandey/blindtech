export type Action = 'PROTECT' | 'BETRAY' | 'SACRIFICE' | 'QUIT';

export interface PlayerState {
  id: string;
  name: string;
  hearts: number;
  isAlive: boolean;
  teammateId?: string;
  [key: string]: any;
}

export interface CycleAction {
  playerId?: string;
  user_id?: string;
  action: Action;
  targetId?: string; 
  target_id?: string;
}

export interface CycleResult {
  updatedPlayers: PlayerState[];
  logs: string[];
  winnerId?: string;
}

export function resolveCycle(players: PlayerState[], actions: CycleAction[]): CycleResult {
  const updatedPlayers = players.map(p => ({ ...p, hearts: Number(p.hearts), isAlive: !!p.isAlive }));
  const logs: string[] = [];

  const getPid = (p: any): string => {
    const raw = p.id || p.user_id || p.playerId;
    return raw ? String(raw).toLowerCase() : '';
  };
  const getPlayer = (id: string) => {
    const sid = String(id).toLowerCase();
    return updatedPlayers.find(p => getPid(p) === sid);
  };
  const getAction = (id: string) => {
    const sid = String(id).toLowerCase();
    return actions.find(a => getPid(a) === sid);
  };

  const aliveAtStart = updatedPlayers.filter(p => p.isAlive);
  const isFinalTwo = aliveAtStart.length === 2;

  if (isFinalTwo) {
    logs.push("THE FINAL DUEL. HEARTS BALANCED TO ONE. BLEED SUSPENDED.");
    updatedPlayers.forEach(p => {
      if (p.isAlive) p.hearts = 1;
    });
  }

  const fedPlayers = new Set<string>();

  // 1. QUIT
  const quitters = actions.filter(a => a.action === 'QUIT');
  for (const q of quitters) {
    const attackerId = getPid(q);
    if (!attackerId) continue;
    const player = getPlayer(attackerId);
    if (!player || !player.isAlive) continue;

    logs.push(`${player.name} chose QUIT. Terminating team.`);
    player.isAlive = false;
    player.hearts = 0;

    const teammateId = player.teammateId;
    if (teammateId) {
      const teammate = getPlayer(teammateId);
      if (teammate && teammate.isAlive) {
        logs.push(`${teammate.name} was dragged down by their partner.`);
        teammate.isAlive = false;
        teammate.hearts = 0;
      }
    }

    // Opponents gain 1 Heart each
    updatedPlayers.forEach(p => {
      const pid = getPid(p);
      if (p.isAlive && pid !== attackerId && pid !== teammateId) {
        p.hearts += 1;
        logs.push(`${p.name} gained 1 Heart from the cowardice of others.`);
      }
    });
  }

  // 2. SACRIFICE
  const sacrifices = actions.filter(a => a.action === 'SACRIFICE');
  for (const s of sacrifices) {
    const attackerId = getPid(s);
    if (!attackerId) continue;
    const player = getPlayer(attackerId);
    if (!player || !player.isAlive) continue;

    const targetId = s.targetId || s.target_id;
    if (!targetId || targetId !== player.teammateId) {
      logs.push(`${player.name} tried to SACRIFICE invalid target. Action failed.`);
      continue;
    }

    const teammate = getPlayer(targetId);
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
  const betrays = actions.filter(a => a.action === 'BETRAY' && (a.targetId || a.target_id));
  const protects = actions.filter(a => a.action === 'PROTECT' && (a.targetId || a.target_id));

  // Check which players are protected
  const protectedPlayers = new Set<string>();
  for (const p of protects) {
    const attackerId = getPid(p);
    if (!attackerId) continue;
    const protector = getPlayer(attackerId);
    if (!protector || !protector.isAlive) continue;

    if (protector.hearts < 1 && !isFinalTwo) {
      logs.push(`${protector.name} lacked the Heart to PROTECT.`);
      continue;
    }

    if (!isFinalTwo) protector.hearts -= 1;
    const targetIdRaw = p.targetId || p.target_id;
    const targetId = targetIdRaw ? String(targetIdRaw).toLowerCase() : '';
    if (targetId) {
      protectedPlayers.add(targetId);
      logs.push(`${protector.name} is PROTECTING ${getPlayer(targetId)?.name}.`);
    }
  }

  // Handle Mutual BETRAY
  const processedBetrays = new Set<string>();
  for (const b of betrays) {
    const attackerId = getPid(b);
    if (!attackerId || processedBetrays.has(attackerId)) continue;

    const attacker = getPlayer(attackerId);
    const targetIdRaw = b.targetId || b.target_id;
    const targetId = targetIdRaw ? String(targetIdRaw).toLowerCase() : '';
    const target = getPlayer(targetId);
    
    if (!attacker || !attacker.isAlive || !target || !target.isAlive) continue;

    const counterAction = getAction(targetId);
    const counterTargetIdRaw = counterAction ? (counterAction.targetId || counterAction.target_id) : null;
    const normalizedCounterTargetId = counterTargetIdRaw ? String(counterTargetIdRaw).toLowerCase() : null;

    if (counterAction && counterAction.action === 'BETRAY' && normalizedCounterTargetId === attackerId) {
      logs.push(`CRITICAL COLLISION: ${attacker.name} and ${target.name} betrayed each other! Mutual damage: Both lose 1 Heart (plus 1 to Bleed).`);
      attacker.hearts -= 1;
      target.hearts -= 1;
      processedBetrays.add(attackerId);
      processedBetrays.add(targetId);
      continue;
    }

    if (protectedPlayers.has(targetId)) {
      logs.push(`${attacker.name} tried to BETRAY ${target.name}, but they were PROTECTED.`);
      processedBetrays.add(attackerId);
      continue;
    }

    // Successful betrayal
    logs.push(`${attacker.name} BETRAYED ${target.name} and stole 1 Heart. Feed successful: Bleed prevented for ${attacker.name}.`);
    attacker.hearts += 1;
    target.hearts -= 1;
    fedPlayers.add(attackerId);
    processedBetrays.add(attackerId);
    logs.push(`DEBUG: ${attacker.name} (+1 stolen) now has ${attacker.hearts}, ${target.name} (-1 stolen) now has ${target.hearts}`);
  }

  // 4. BLEED RULE (Suspended in Final Two or for Fed Players)
  if (!isFinalTwo) {
    updatedPlayers.forEach(p => {
      if (p.isAlive) {
        const pid = getPid(p);
        if (fedPlayers.has(pid)) {
           logs.push(`FEED STATUS: ${p.name} is satiated. Skipping bleed.`);
        } else {
           logs.push(`FEED STATUS: ${p.name} is hungry. Bleeding 1 Heart.`);
           p.hearts -= 1;
           if (p.hearts <= 0) {
             logs.push(`${p.name} BLED OUT.`);
             p.isAlive = false;
             p.hearts = 0;
           } else {
             logs.push(`${p.name} now has ${p.hearts} Heart(s).`);
           }
        }
      }
    });
  }

  const aliveFinal = updatedPlayers.filter(p => p.isAlive);
  if (aliveFinal.length === 1) {
    return { updatedPlayers, logs, winnerId: getPid(aliveFinal[0]) };
  } else if (aliveFinal.length === 0) {
    return { updatedPlayers, logs };
  }

  return { updatedPlayers, logs };
}
