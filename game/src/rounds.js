// Round/match state machine.
// Phases: 'menu' -> 'buy' -> 'combat' -> 'roundEnd' -> 'buy' ... -> 'matchEnd'
import * as THREE from 'three';
import { CONFIG } from './config.js';

export function createRounds(player, bots, world) {
  const state = {
    phase: 'menu',
    round: 0,
    blueScore: 0,
    redScore: 0,
    blueLossStreak: 0,
    redLossStreak: 0,
    phaseStart: 0,
    phaseEnd: 0,
    bombPlantedAt: 0,
    bombSite: null,
    bombDefusedAt: 0,
    killFeed: [],
    nextMapIndex: 0,
    currentMapId: 'lab',
  };

  function startMatch() {
    state.phase = 'buy';
    state.round = 1;
    state.blueScore = 0;
    state.redScore = 0;
    state.blueLossStreak = 0;
    state.redLossStreak = 0;
    enterBuyPhase();
  }

  function enterBuyPhase() {
    state.phase = 'buy';
    state.phaseStart = performance.now() / 1000;
    state.phaseEnd = state.phaseStart + CONFIG.buyTimeSec;
    state.bombSite = null;
    state.bombPlantedAt = 0;
    state.bombDefusedAt = 0;
    // Reset spawns and health for everyone alive next round
    resetActors();
  }

  function enterCombatPhase() {
    state.phase = 'combat';
    state.phaseStart = performance.now() / 1000;
    state.phaseEnd = state.phaseStart + CONFIG.roundTimeSec;
  }

  function enterRoundEnd(winnerTeam, reason) {
    state.phase = 'roundEnd';
    state.phaseStart = performance.now() / 1000;
    state.phaseEnd = state.phaseStart + CONFIG.endTimeSec;
    state.lastWinner = winnerTeam;
    state.lastReason = reason;
    // Award money + score
    if (winnerTeam === 'blue') {
      state.blueScore++;
      state.redLossStreak = 0;
      state.blueLossStreak = 0;
      awardTeamMoney('blue', CONFIG.winBonus);
      awardTeamMoney('red', CONFIG.lossBonus * Math.min(CONFIG.lossBonusMax, state.redLossStreak + 1));
      state.redLossStreak++;
    } else {
      state.redScore++;
      state.blueLossStreak = 0;
      state.redLossStreak = 0;
      awardTeamMoney('red', CONFIG.winBonus);
      awardTeamMoney('blue', CONFIG.lossBonus * Math.min(CONFIG.lossBonusMax, state.blueLossStreak + 1));
      state.blueLossStreak++;
    }
    // Match end?
    if (state.blueScore >= CONFIG.roundsToWin || state.redScore >= CONFIG.roundsToWin) {
      state.phase = 'matchEnd';
      state.phaseEnd = state.phaseStart + 30;
    }
    // Cycle map each round
    state.nextMapIndex = (state.nextMapIndex + 1) % CONFIG.maps.length;
  }

  function awardTeamMoney(team, amount) {
    if (player.team === team) {
      player.state.money = Math.min(CONFIG.maxMoney, player.state.money + amount);
    }
    for (const b of bots) {
      if (b.team === team) b.state.money = Math.min(CONFIG.maxMoney, b.state.money + amount);
    }
  }

  function resetActors() {
    // Player
    if (player.state.alive || !player.state.alive) {
      player.state.alive = true;
      player.state.health = CONFIG.maxHealth;
      // Don't reset money each round — accumulate
      // Reset to spawn
      const sp = (player.team === 'blue' ? world.blueSpawns : world.redSpawns)[0].clone();
      player.camera.position.copy(sp);
      player.state.vy = 0;
      if (player.state.weapon && player.state.weapon.state) {
        player.state.weapon.state.mag = player.state.weapon.def.magSize;
        player.state.weapon.state.reserve = player.state.weapon.def.reserveAmmo;
        player.state.weapon.state.reloading = false;
      }
    }
    // Bots
    let bs = 0, rs = 0;
    for (const b of bots) {
      const spawnIdx = b.team === 'blue' ? bs++ : rs++;
      // Give bots a weapon based on money
      const w = pickBotWeapon(b.state.money);
      b.reset(spawnIdx, w);
    }
  }

  function pickBotWeapon(money) {
    if (money >= 2500) return 'rifle';
    if (money >= 1800) return 'shotgun';
    if (money >= 1200) return 'smg';
    return 'sidearm';
  }

  function checkWinConditions(now) {
    if (state.phase !== 'combat') return;
    // Elimination
    const blueAlive = countAlive('blue');
    const redAlive = countAlive('red');
    if (redAlive === 0) {
      enterRoundEnd('blue', 'elimination');
      return;
    }
    if (blueAlive === 0) {
      enterRoundEnd('red', 'elimination');
      return;
    }
    // Bomb planted timer
    if (state.bombPlantedAt > 0) {
      const elapsed = now - state.bombPlantedAt;
      if (elapsed > 35) {
        // Bomb explodes — red (planter) wins
        enterRoundEnd('red', 'bomb_detonated');
        // Big boom at site
        return;
      }
    } else {
      // Round time expired — blue wins by default (defenders)
      if (now > state.phaseEnd) {
        enterRoundEnd('blue', 'time_expired');
        return;
      }
    }
  }

  function countAlive(team) {
    let n = 0;
    if (player.team === team && player.state.alive) n++;
    for (const b of bots) if (b.team === team && b.alive) n++;
    return n;
  }

  function addKill(killer, victim, weapon, headshot) {
    state.killFeed.unshift({
      killer: killer?.state?.name || killer?.team === 'blue' ? 'Blue' : 'Red',
      victim: victim.state?.name || victim.team,
      weapon,
      headshot,
      time: performance.now() / 1000,
    });
    if (state.killFeed.length > 6) state.killFeed.pop();
    // Award killer money
    if (killer?.state) {
      killer.state.money = Math.min(CONFIG.maxMoney, killer.state.money + CONFIG.killBonus);
    }
  }

  function tick(now) {
    if (state.phase === 'buy' && now > state.phaseEnd) {
      enterCombatPhase();
    } else if (state.phase === 'combat') {
      checkWinConditions(now);
    } else if (state.phase === 'roundEnd' && now > state.phaseEnd) {
      // Next round
      state.round++;
      enterBuyPhase();
    }
  }

  function getCurrentMap() {
    return CONFIG.maps[state.nextMapIndex % CONFIG.maps.length].id;
  }

  return {
    state,
    startMatch, tick,
    enterRoundEnd,
    addKill,
    getCurrentMap,
    countAlive,
  };
}
