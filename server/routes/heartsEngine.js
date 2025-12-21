function resolveCycle(players, actions) {
  const updatedPlayers = players.map(p => ({ ...p, hearts: parseInt(p.hearts), is_alive: !!p.is_alive }));
  const logs = [];

  const getPlayer = (id) => updatedPlayers.find(p => p.id === id || p.user_id === id);
  const getAction = (id) => actions.find(a => a.playerId === id || a.user_id === id);

  // 1. QUIT
  const quitters = actions.filter(a => a.action === 'QUIT');
  for (const q of quitters) {
    const player = getPlayer(q.playerId || q.user_id);
    if (!player || !player.is_alive) continue;

    logs.push(`${player.name} chose QUIT. Terminating team.`);
    player.is_alive = false;
    player.hearts = 0;

    if (player.teammate_id) {
      const teammate = getPlayer(player.teammate_id);
      if (teammate && teammate.is_alive) {
        logs.push(`${teammate.name} was dragged down by their partner.`);
        teammate.is_alive = false;
        teammate.hearts = 0;
      }
    }

    // Opponents gain 1 Heart each
    updatedPlayers.forEach(p => {
      if (p.is_alive && p.user_id !== player.user_id && p.user_id !== player.teammate_id) {
        p.hearts += 1;
        logs.push(`${p.name} gained 1 Heart from the cowardice of others.`);
      }
    });
  }

  // 2. SACRIFICE
  const sacrifices = actions.filter(a => a.action === 'SACRIFICE');
  for (const s of sacrifices) {
    const player = getPlayer(s.playerId || s.user_id);
    if (!player || !player.is_alive) continue;

    const targetId = s.targetId || s.target_id;
    if (!targetId || targetId !== player.teammate_id) {
      logs.push(`${player.name} tried to SACRIFICE invalid target. Action failed.`);
      continue;
    }

    const teammate = getPlayer(targetId);
    if (!teammate || !teammate.is_alive) {
      logs.push(`${player.name} tried to SACRIFICE a dead teammate. Action failed.`);
      continue;
    }

    if (player.hearts < 2) {
      logs.push(`${player.name} lacked the Hearts to SACRIFICE their teammate.`);
      continue;
    }

    logs.push(`${player.name} SACRIFICED ${teammate.name}. Cold.`);
    player.hearts -= 2;
    teammate.is_alive = false;
    teammate.hearts = 0;
  }

  // 3. BETRAY & PROTECT RESOLUTION
  const betrays = actions.filter(a => a.action === 'BETRAY' && (a.targetId || a.target_id));
  const protects = actions.filter(a => a.action === 'PROTECT' && (a.targetId || a.target_id));

  // Check which players are protected
  const protectedPlayers = new Set();
  for (const p of protects) {
    const protector = getPlayer(p.playerId || p.user_id);
    if (!protector || !protector.is_alive) continue;

    if (protector.hearts < 1) {
      logs.push(`${protector.name} lacked the Heart to PROTECT.`);
      continue;
    }

    protector.hearts -= 1;
    const targetId = p.targetId || p.target_id;
    protectedPlayers.add(targetId);
    logs.push(`${protector.name} is PROTECTING ${getPlayer(targetId)?.name}.`);
  }

  // Handle Mutual BETRAY
  const processedBetrays = new Set();
  for (const b of betrays) {
    const attackerId = b.playerId || b.user_id;
    if (processedBetrays.has(attackerId)) continue;

    const attacker = getPlayer(attackerId);
    const targetId = b.targetId || b.target_id;
    const target = getPlayer(targetId);
    if (!attacker || !attacker.is_alive || !target || !target.is_alive) continue;

    // Check if target is also betraying attacker (Mutual)
    const counterAction = getAction(target.user_id);
    if (counterAction && counterAction.action === 'BETRAY' && (counterAction.targetId === attacker.user_id || counterAction.target_id === attacker.user_id)) {
      logs.push(`MUTUAL BETRAY between ${attacker.name} and ${target.name}. Both lose 1 Heart.`);
      attacker.hearts -= 1;
      target.hearts -= 1;
      processedBetrays.add(attacker.user_id);
      processedBetrays.add(target.user_id);
      continue;
    }

    // Check if target is protected
    if (protectedPlayers.has(target.user_id)) {
      logs.push(`${attacker.name} tried to BETRAY ${target.name}, but they were PROTECTED.`);
      processedBetrays.add(attacker.user_id);
      continue;
    }

    // Successful betrayal
    logs.push(`${attacker.name} BETRAYED ${target.name} and stole 1 Heart.`);
    attacker.hearts += 1;
    target.hearts -= 1;
    processedBetrays.add(attacker.user_id);
  }

  // 4. BLEED RULE
  updatedPlayers.forEach(p => {
    if (p.is_alive) {
      p.hearts -= 1;
      if (p.hearts <= 0) {
        logs.push(`${p.name} BLED OUT.`);
        p.is_alive = false;
        p.hearts = 0;
      }
    }
  });

  // Winner check
  const alivePlayers = updatedPlayers.filter(p => p.is_alive);
  if (alivePlayers.length === 1) {
    return { updatedPlayers, logs, winnerId: alivePlayers[0].user_id };
  } else if (alivePlayers.length === 0) {
    return { updatedPlayers, logs, winnerId: null }; 
  }

  return { updatedPlayers, logs };
}

function resolveFinalSacrifice(players, choices) {
  const updatedPlayers = players.map(p => ({ ...p }));
  const logs = [];

  const p1 = choices[0];
  const p2 = choices[1];

  const getPlayerName = (id) => players.find(p => p.user_id === id)?.name || 'Unknown';

  if (p1.choice === 'FINAL_SACRIFICE' && p2.choice === 'REFUSE') {
    logs.push(`${getPlayerName(p1.playerId)} SACRIFICED. They WIN.`);
    return { updatedPlayers, logs, winnerId: p1.playerId };
  } else if (p2.choice === 'FINAL_SACRIFICE' && p1.choice === 'REFUSE') {
    logs.push(`${getPlayerName(p2.playerId)} SACRIFICED. They WIN.`);
    return { updatedPlayers, logs, winnerId: p2.playerId };
  } else if (p1.choice === 'FINAL_SACRIFICE' && p2.choice === 'FINAL_SACRIFICE') {
    logs.push(`BOTH SACRIFICED. NO WINNER.`);
    return { updatedPlayers, logs };
  } else {
    logs.push(`BOTH REFUSED. NO WINNER.`);
    return { updatedPlayers, logs };
  }
}

module.exports = {
  resolveCycle,
  resolveFinalSacrifice
};
