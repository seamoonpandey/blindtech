function resolveCycle(players, actions) {
  const updatedPlayers = players.map(p => ({ 
    ...p, 
    hearts: parseInt(p.hearts), 
    is_alive: !!p.is_alive 
  }));
  const logs = [];

  const getPid = (p) => {
    const raw = p.user_id || p.id || p.playerId;
    return raw ? String(raw).toLowerCase() : null;
  };
  const getPlayer = (id) => {
    const sid = String(id).toLowerCase();
    return updatedPlayers.find(p => getPid(p) === sid);
  };
  const getAction = (id) => {
    const sid = String(id).toLowerCase();
    return actions.find(a => getPid(a) === sid);
  };

  const aliveAtStart = updatedPlayers.filter(p => p.is_alive);
  const isFinalTwo = aliveAtStart.length === 2;

  if (isFinalTwo) {
    logs.push("THE FINAL DUEL. HEARTS BALANCED TO ONE. BLEED SUSPENDED.");
    updatedPlayers.forEach(p => {
      if (p.is_alive) p.hearts = 1;
    });
  }

  const fedPlayers = new Set();

  // 1. QUIT
  const quitters = actions.filter(a => a.action === 'QUIT');
  for (const q of quitters) {
    const attackerId = getPid(q);
    const player = getPlayer(attackerId);
    if (!player || !player.is_alive) continue;

    logs.push(`${player.name} chose QUIT. Terminating team.`);
    player.is_alive = false;
    player.hearts = 0;

    const teammateId = player.teammate_id;
    if (teammateId) {
      const teammate = getPlayer(teammateId);
      if (teammate && teammate.is_alive) {
        logs.push(`${teammate.name} was dragged down by their partner.`);
        teammate.is_alive = false;
        teammate.hearts = 0;
      }
    }

    updatedPlayers.forEach(p => {
      const pid = getPid(p);
      if (p.is_alive && pid !== attackerId && pid !== String(teammateId)) {
        p.hearts += 1;
        logs.push(`${p.name} gained 1 Heart from the cowardice of others.`);
      }
    });
  }

  // 2. SACRIFICE
  const sacrifices = actions.filter(a => a.action === 'SACRIFICE');
  for (const s of sacrifices) {
    const attackerId = getPid(s);
    const player = getPlayer(attackerId);
    if (!player || !player.is_alive) continue;

    const targetId = s.targetId || s.target_id;
    if (!targetId || String(targetId) !== String(player.teammate_id)) {
      logs.push(`${player.name} tried to SACRIFICE invalid target or partner already dead.`);
      continue;
    }

    const teammate = getPlayer(targetId);
    if (!teammate || !teammate.is_alive) {
      logs.push(`${player.name} tried to SACRIFICE a dead teammate.`);
      continue;
    }

    if (player.hearts < 2) {
      logs.push(`${player.name} lacked the Hearts to SACRIFICE their teammate.`);
      continue;
    }

    logs.push(`${player.name} SACRIFICED ${teammate.name}.`);
    player.hearts -= 2;
    teammate.is_alive = false;
    teammate.hearts = 0;
  }

  // 3. BETRAY & PROTECT
  const betrays = actions.filter(a => a.action === 'BETRAY' && (a.targetId || a.target_id));
  const protects = actions.filter(a => a.action === 'PROTECT' && (a.targetId || a.target_id));

  const protectedPlayers = new Set();
  for (const p of protects) {
    const attackerId = getPid(p);
    const protector = getPlayer(attackerId);
    if (!protector || !protector.is_alive) continue;

    if (protector.hearts < 1 && !isFinalTwo) {
      logs.push(`${protector.name} lacked the Heart to PROTECT.`);
      continue;
    }

    if (!isFinalTwo) protector.hearts -= 1;
    const targetId = String(p.targetId || p.target_id);
    protectedPlayers.add(targetId);
    logs.push(`${protector.name} is PROTECTING ${getPlayer(targetId)?.name}.`);
  }

  const processedBetrays = new Set();
  for (const b of betrays) {
    const attackerId = getPid(b);
    if (processedBetrays.has(attackerId)) continue;

    const attacker = getPlayer(attackerId);
    const targetId = String(b.targetId || b.target_id);
    const target = getPlayer(targetId);
    if (!attacker || !attacker.is_alive || !target || !target.is_alive) continue;

    const counterAction = getAction(targetId);
    if (counterAction && counterAction.action === 'BETRAY' && String(counterAction.targetId || counterAction.target_id) === attackerId) {
      logs.push(`CRITICAL COLLISION: ${attacker.name} and ${target.name} betrayed each other! Both lose 1 Heart (plus 1 to Bleed).`);
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
    logs.push(`DEBUG: ${attacker.name} now has ${attacker.hearts}, ${target.name} now has ${target.hearts}`);
  }

  // 4. BLEED RULE (Suspended in Final Two or for Fed Players)
  if (!isFinalTwo) {
    updatedPlayers.forEach(p => {
      if (p.is_alive) {
        const pid = getPid(p);
        if (fedPlayers.has(pid)) {
           logs.push(`FEED STATUS: ${p.name} is satiated. Skipping bleed.`);
        } else {
           logs.push(`FEED STATUS: ${p.name} is hungry. Bleeding 1 Heart.`);
           p.hearts -= 1;
           if (p.hearts <= 0) {
             logs.push(`${p.name} BLED OUT.`);
             p.is_alive = false;
             p.hearts = 0;
           } else {
             logs.push(`${p.name} now has ${p.hearts} Heart(s).`);
           }
        }
      }
    });
  }

  const aliveFinal = updatedPlayers.filter(p => p.is_alive);
  if (aliveFinal.length === 1) {
    return { updatedPlayers, logs, winnerId: getPid(aliveFinal[0]) };
  } else if (aliveFinal.length === 0) {
    return { updatedPlayers, logs, winnerId: null };
  }

  return { updatedPlayers, logs };
}

module.exports = {
  resolveCycle
};
