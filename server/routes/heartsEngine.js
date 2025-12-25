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

    const p1 = aliveAtStart[0];
    const p2 = aliveAtStart[1];
    const a1 = getAction(getPid(p1))?.action || 'COMPROMISE';
    const a2 = getAction(getPid(p2))?.action || 'COMPROMISE';

    // Final Duel Actions: COMPROMISE, BETRAY, QUIT
    // Normalize legacy actions for backwards compatibility:
    // - SACRIFICE → COMPROMISE (Decisive Move)
    // - PROTECT → COMPROMISE (removed SHARE)
    // - SHARE → COMPROMISE (removed SHARE)
    let act1 = (a1 === 'SACRIFICE' || a1 === 'PROTECT' || a1 === 'SHARE') ? 'COMPROMISE' : a1;
    let act2 = (a2 === 'SACRIFICE' || a2 === 'PROTECT' || a2 === 'SHARE') ? 'COMPROMISE' : a2;

    // Validate Final Duel actions
    const validFinalActions = ['COMPROMISE', 'BETRAY', 'QUIT'];
    if (!validFinalActions.includes(act1)) {
      logs.push(`WARNING: ${p1.name} used invalid action '${act1}', treating as COMPROMISE`);
      act1 = 'COMPROMISE';
    }
    if (!validFinalActions.includes(act2)) {
      logs.push(`WARNING: ${p2.name} used invalid action '${act2}', treating as COMPROMISE`);
      act2 = 'COMPROMISE';
    }

    logs.push(`RESOLUTION: ${p1.name} chose ${act1} | ${p2.name} chose ${act2}`);

    // 1. Immediate Losers (BETRAY/QUIT)
    const is1Bad = act1 === 'BETRAY' || act1 === 'QUIT';
    const is2Bad = act2 === 'BETRAY' || act2 === 'QUIT';

    if (is1Bad && is2Bad) {
      logs.push("BOTH ATTEMPTED DISHONORABLE ACTIONS. BOTH TERMINATED.");
      p1.is_alive = false; p1.hearts = 0;
      p2.is_alive = false; p2.hearts = 0;
      return { updatedPlayers, logs, winnerId: null };
    }
    if (is1Bad) {
      logs.push(`${p1.name} attempted ${act1} and was terminated by the system.`);
      p1.is_alive = false; p1.hearts = 0;
      return { updatedPlayers, logs, winnerId: getPid(p2) };
    }
    if (is2Bad) {
      logs.push(`${p2.name} attempted ${act2} and was terminated by the system.`);
      p2.is_alive = false; p2.hearts = 0;
      return { updatedPlayers, logs, winnerId: getPid(p1) };
    }

    // 2. COMPROMISE vs COMPROMISE (Both Win - Resonance Achieved)
    if (act1 === 'COMPROMISE' && act2 === 'COMPROMISE') {
      logs.push("MUTUAL COMPROMISE. RESONANCE ACHIEVED. BOTH UNITS HAVE PROVEN THEIR WORTH.");
      logs.push("DUAL CHAMPIONS DECLARED.");
      return { updatedPlayers, logs, winnerId: 'BOTH' };
    }

    // If we reach here, something went wrong - default to no winner
    logs.push("UNEXPECTED FINAL DUEL STATE. NO WINNER DECLARED.");
    return { updatedPlayers, logs, winnerId: null };
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

  const protectedPlayers = new Map(); // targetId -> protectorId
  for (const p of protects) {
    const attackerId = getPid(p);
    const protector = getPlayer(attackerId);
    if (!protector || !protector.is_alive) continue;

    // In Final Duel, PROTECT shouldn't exist (converted to SHARE above), but handle gracefully
    if (isFinalTwo) {
      logs.push(`${protector.name} attempted PROTECT in Final Duel (invalid - PROTECT is FREE only before Final Duel).`);
      continue; // Skip PROTECT entirely in Final Duel
    }

    // Check if player has enough hearts for PROTECT (costs 1 heart before Final Duel)
    if (protector.hearts < 1) {
      logs.push(`${protector.name} lacked the Heart to PROTECT.`);
      continue;
    }

    protector.hearts -= 1; // PROTECT costs 1 heart (only applies before Final Duel)
    const targetIdRaw = p.targetId || p.target_id;
    const targetId = targetIdRaw ? String(targetIdRaw).toLowerCase() : null;
    if (targetId) {
      protectedPlayers.set(targetId, attackerId);
      logs.push(`${protector.name} is PROTECTING ${getPlayer(targetId)?.name} (cost: 1 Heart).`);
    }
  }

  const processedBetrays = new Set();
  for (const b of betrays) {
    const attackerId = getPid(b);
    if (!attackerId || processedBetrays.has(attackerId)) continue;

    const attacker = getPlayer(attackerId);
    // CRITICAL: Normalize target ID immediately
    const targetIdRaw = b.targetId || b.target_id;
    const targetId = targetIdRaw ? String(targetIdRaw).toLowerCase() : null;
    const target = getPlayer(targetId);
    
    if (!attacker || !attacker.is_alive || !target || !target.is_alive) continue;

    const counterAction = getAction(targetId);
    const counterTargetId = counterAction ? (counterAction.targetId || counterAction.target_id) : null;
    const normalizedCounterTargetId = counterTargetId ? String(counterTargetId).toLowerCase() : null;

    if (counterAction && counterAction.action === 'BETRAY' && normalizedCounterTargetId === attackerId) {
      logs.push(`CRITICAL COLLISION: ${attacker.name} and ${target.name} betrayed each other! Both lose 1 Heart (plus 1 to Bleed).`);
      attacker.hearts -= 1;
      target.hearts -= 1;
      processedBetrays.add(attackerId);
      processedBetrays.add(targetId);
      continue;
    }

    if (protectedPlayers.has(targetId)) {
      const protectorId = protectedPlayers.get(targetId);
      const protector = getPlayer(protectorId);
      logs.push(`BACKFIRE: ${attacker.name} tried to BETRAY ${target.name}, but they were PROTECTED by ${protector?.name || 'someone'}. ${protector?.name || 'The protector'} steals 1 Heart from ${attacker.name}.`);
      
      attacker.hearts -= 1;
      if (protector) {
        protector.hearts += 1;
        fedPlayers.add(protectorId); // Protector avoids bleed because they "fed" on the betrayer
      }
      
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

  // --- SAFEGUARD: THE RULE OF TWO ---
  // From documentation: "If a cycle would result in all players being eliminated, 
  // the system revives the two players who had the highest Hearts before elimination.
  // This rule does NOT apply once the Final Duel begins."
  // 
  // This prevents skipping the Final Duel phase and ensures at least 2 survivors
  // can enter the decisive Final Duel unless we're already IN the Final Duel.
  let currentSurvivors = updatedPlayers.filter(p => p.is_alive);
  const numStart = aliveAtStart.length;
  const numEnd = currentSurvivors.length;

  let limit = 0;
  if (numStart > 2 && numEnd < 2) {
    // We went from 3+ players down to 0-1 survivors - need to ensure 2 for Final Duel
    limit = 2;
  } else if (numEnd === 0 && !isFinalTwo) {
    // Total extinction before Final Duel - resurrect 2 players
    limit = 2;
  }
  // Note: If we started with 2 (isFinalTwo), no resurrection - Final Duel result stands

  if (limit > 0) {
    logs.push(`⚠️ INTERVENTION: The unseen audience demands ${limit} survivors!`);
    
    const quittersIds = new Set(quitters.map(getPid));
    
    // Candidates: Dead players who didn't QUIT
    let candidates = updatedPlayers.filter(p => 
      !p.is_alive && 
      aliveAtStart.some(start => getPid(start) === getPid(p)) &&
      !quittersIds.has(getPid(p))
    );
    
    // Sort by hearts (closest to living)
    candidates.sort((a, b) => b.hearts - a.hearts);
    
    const needed = limit - numEnd;
    
    for (let i = 0; i < needed && i < candidates.length; i++) {
        const p = candidates[i];
        p.is_alive = true;
        p.hearts = 1; 
        logs.push(`${p.name} refuses to die. (Saved by Rule of Two)`);
    }
    
    // Re-eval survivors
    currentSurvivors = updatedPlayers.filter(p => p.is_alive);
  }
  // --- END SAFEGUARD ---

  const aliveFinal = currentSurvivors;
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
