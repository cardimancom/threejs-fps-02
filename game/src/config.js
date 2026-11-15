// Game configuration: weapons, money, round rules, team sizes.
// All sci-fi themed. Names are original (not borrowed from any commercial game).

export const CONFIG = {
  // Match
  roundsToWin: 8,
  teamSize: 5,             // 5v5 (player + 4 bots vs 5 bots)
  buyTimeSec: 12,
  roundTimeSec: 100,
  freezeTimeSec: 3,
  endTimeSec: 5,

  // Money
  startMoney: 800,
  maxMoney: 16000,
  winBonus: 3000,
  lossBonus: 1000,
  lossBonusMax: 4,         // stacking loss bonus up to $4000
  killBonus: 300,
  bombPlantBonus: 250,
  objectiveBonus: 500,

  // Player
  maxHealth: 100,
  maxArmor: 100,
  moveSpeed: 5.2,           // m/s walk
  sprintSpeed: 7.4,
  crouchSpeed: 2.8,
  jumpForce: 5.2,
  gravity: 14,
  eyeHeight: 1.7,
  crouchEyeHeight: 1.0,
  playerRadius: 0.32,
  playerHeight: 1.8,

  // Bots
  botDifficulty: 'medium',  // easy | medium | hard
  botReactTime: 0.35,       // seconds before bot starts shooting after seeing enemy
  botAccuracy: 0.62,        // 0-1
  botMoveSpeed: 4.5,

  // Weapons (sci-fi themed, original names)
  // damage, fireRate (rounds/sec), magSize, reserveAmmo, reloadTime (sec),
  // range (m), spread (radians), recoil, cost, automatic, scope (zoom factor), type
  weapons: {
    sidearm: {
      id: 'sidearm',
      name: 'Pulse Pistol',
      kind: 'pistol',
      damage: 22,
      fireRate: 6,
      magSize: 12,
      reserveAmmo: 36,
      reloadTime: 1.4,
      range: 60,
      spread: 0.012,
      recoil: 0.6,
      cost: 200,
      automatic: false,
      scope: 1.0,
      color: 0x22d3ee,
      trailColor: 0x22d3ee,
      sound: 'pulse',
    },
    smg: {
      id: 'smg',
      name: 'Vector Pulse',
      kind: 'smg',
      damage: 18,
      fireRate: 14,
      magSize: 30,
      reserveAmmo: 90,
      reloadTime: 1.8,
      range: 55,
      spread: 0.022,
      recoil: 0.45,
      cost: 1200,
      automatic: true,
      scope: 1.0,
      color: 0xa855f7,
      trailColor: 0xa855f7,
      sound: 'vector',
    },
    rifle: {
      id: 'rifle',
      name: 'Plasma Carbine',
      kind: 'rifle',
      damage: 30,
      fireRate: 9,
      magSize: 30,
      reserveAmmo: 90,
      reloadTime: 2.2,
      range: 90,
      spread: 0.008,
      recoil: 0.55,
      cost: 2500,
      automatic: true,
      scope: 1.0,
      color: 0x22d3ee,
      trailColor: 0x67e8f9,
      sound: 'plasma',
    },
    sniper: {
      id: 'sniper',
      name: 'Beam Lance',
      kind: 'sniper',
      damage: 95,
      fireRate: 1.1,
      magSize: 5,
      reserveAmmo: 20,
      reloadTime: 3.0,
      range: 150,
      spread: 0.002,
      recoil: 1.5,
      cost: 4000,
      automatic: false,
      scope: 4.0,
      color: 0xef4444,
      trailColor: 0xfca5a5,
      sound: 'beam',
    },
    shotgun: {
      id: 'shotgun',
      name: 'Flak Cannon',
      kind: 'shotgun',
      damage: 12,           // per pellet
      pellets: 9,
      fireRate: 1.4,
      magSize: 7,
      reserveAmmo: 28,
      reloadTime: 0.7,      // per shell (magazine loads one at a time)
      range: 28,
      spread: 0.08,
      recoil: 1.0,
      cost: 1800,
      automatic: false,
      scope: 1.0,
      color: 0xfbbf24,
      trailColor: 0xfde68a,
      sound: 'flak',
    },
  },

  // Equipment
  equipment: {
    armor: { id: 'armor', name: 'Energy Shield', cost: 650, kind: 'armor' },
    defuser: { id: 'defuser', name: 'Defuser', cost: 400, kind: 'defuser' },
    bomb: { id: 'bomb', name: 'Ion Charge', cost: 0, kind: 'bomb' },
  },

  // Maps
  maps: [
    { id: 'lab', name: 'Helix Labs' },
    { id: 'station', name: 'Orbital Station' },
    { id: 'alien', name: 'Expanse' },
  ],

  // Bot names (sci-fi)
  blueBotNames: ['Vega', 'Rigel', 'Kepl', 'Aether'],
  redBotNames: ['Reven', 'Onyx', 'Drak', 'Sable', 'Cipher'],
};

// Helper: get weapon by id
export function getWeapon(id) {
  return CONFIG.weapons[id];
}

// Helper: list weapons sorted by cost
export function weaponsByCost() {
  return Object.values(CONFIG.weapons).sort((a, b) => a.cost - b.cost);
}
