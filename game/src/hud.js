// HUD: health/armor/ammo/money, round info, kill feed, buy menu, scoreboard,
// crosshair, hitmarker, scope overlay. Pure DOM, no canvas.
import { CONFIG, weaponsByCost } from './config.js';
import { PALETTE } from './palette.js';

export function createHud(rootEl) {
  // Build DOM — APPEND, do not replace (rootEl may contain the #game canvas).
  const container = document.createElement('div');
  container.id = 'hud-root';
  container.innerHTML = `
    <div id="hud" aria-hidden="true">
      <div id="crosshair"><i></i><i></i><i></i><i></i></div>
      <div id="hitmarker"><i></i><i></i><i></i><i></i></div>
      <div id="scope-overlay"></div>

      <div id="top-bar">
        <div id="round-info">
          <span id="round-num">R1</span>
          <span id="round-timer" class="timer">0:00</span>
          <span id="match-score"><b class="blue">0</b> — <b class="red">0</b></span>
        </div>
        <div id="phase-label">BUY</div>
      </div>

      <div id="killfeed"></div>

      <div id="money"><span class="label">$</span><span id="money-value">800</span></div>

      <div id="ammo">
        <span id="ammo-mag">30</span><span id="ammo-reserve">/ 90</span>
      </div>

      <div id="health-armor">
        <div class="bar"><i id="health-bar"></i><span id="health-text">100</span></div>
        <div class="bar armor"><i id="armor-bar"></i><span id="armor-text">0</span></div>
      </div>

      <div id="weapon-name">Pulse Pistol</div>

      <div id="bomb-status" style="display:none">
        <span id="bomb-label">BOMB</span>
        <span id="bomb-timer">35</span>
      </div>
    </div>

    <div id="buy-menu" class="overlay" style="display:none">
      <section class="panel buy-panel">
        <h2>Buy Menu <span id="buy-money">$800</span></h2>
        <p class="muted">Buy phase only. Click an item or press its hotkey.</p>
        <div class="buy-grid">
          <div class="buy-section">
            <h3>Weapons</h3>
            <ul id="buy-weapons"></ul>
          </div>
          <div class="buy-section">
            <h3>Equipment</h3>
            <ul id="buy-equipment"></ul>
          </div>
        </div>
        <div class="buy-footer">
          <button id="buy-close" type="button">Close (B)</button>
        </div>
      </section>
    </div>

    <div id="scoreboard" class="overlay" style="display:none">
      <section class="panel scoreboard-panel">
        <h2>Scoreboard</h2>
        <div class="team-cols">
          <div class="team-col blue">
            <h3>Blue Team <span id="sb-blue-score">0</span></h3>
            <ul id="sb-blue"></ul>
          </div>
          <div class="team-col red">
            <h3>Red Team <span id="sb-red-score">0</span></h3>
            <ul id="sb-red"></ul>
          </div>
        </div>
        <p class="muted">Hold Tab</p>
      </section>
    </div>

    <div id="start-menu" class="overlay">
      <section class="panel">
        <h1>VOIDSTRIKE</h1>
        <p class="subtitle">A tactical three.js FPS — round-based combat, money, guns, two teams.</p>
        <button id="play-btn" type="button">Click to play</button>
        <ul class="keys">
          <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</li>
          <li><kbd>Mouse</kbd> Look</li>
          <li><kbd>Click</kbd> Fire</li>
          <li><kbd>R</kbd> Reload</li>
          <li><kbd>Shift</kbd> Sprint</li>
          <li><kbd>Ctrl</kbd> Crouch</li>
          <li><kbd>Space</kbd> Jump</li>
          <li><kbd>B</kbd> Buy menu (in buy phase)</li>
          <li><kbd>Tab</kbd> Scoreboard</li>
          <li><kbd>1-5</kbd> Switch weapon slot</li>
        </ul>
      </section>
    </div>

    <div id="round-end-overlay" class="overlay" style="display:none">
      <section class="panel">
        <h2 id="re-title">Round Over</h2>
        <p id="re-reason"></p>
        <p class="muted" id="re-next"></p>
      </section>
    </div>

    <div id="match-end-overlay" class="overlay" style="display:none">
      <section class="panel">
        <h2 id="me-title">Match Over</h2>
        <p id="me-score"></p>
        <button id="me-restart" type="button">Play again</button>
      </section>
    </div>
  `;

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --canvas: ${PALETTE.canvas};
      --surface: ${PALETTE.surface};
      --hairline: ${PALETTE.hairline};
      --ink: ${PALETTE.ink};
      --muted: ${PALETTE.muted};
      --accent: ${PALETTE.accent};
      --accent2: ${PALETTE.accent2};
      --blue: ${PALETTE.teamBlue};
      --red: ${PALETTE.teamRed};
      --hazard: ${PALETTE.hazard};
      --font-ui: system-ui, -apple-system, 'Segoe UI', sans-serif;
      --font-readout: ui-monospace, 'SF Mono', Menlo, monospace;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; overflow: hidden; background: var(--canvas); color: var(--ink); font-family: var(--font-ui); }
    #game, #game canvas { position: fixed; inset: 0; display: block; }
    #hud { position: fixed; inset: 0; pointer-events: none; user-select: none; }

    #crosshair { position: fixed; left: 50%; top: 50%; width: 22px; height: 22px; transform: translate(-50%, -50%); }
    #crosshair i { position: absolute; background: var(--ink); opacity: .85; }
    #crosshair i:nth-child(1) { left: 10px; top: 0; width: 2px; height: 7px; }
    #crosshair i:nth-child(2) { left: 10px; bottom: 0; width: 2px; height: 7px; }
    #crosshair i:nth-child(3) { top: 10px; left: 0; height: 2px; width: 7px; }
    #crosshair i:nth-child(4) { top: 10px; right: 0; height: 2px; width: 7px; }

    #hitmarker { position: fixed; left: 50%; top: 50%; width: 26px; height: 26px; transform: translate(-50%, -50%) rotate(45deg); opacity: 0; transition: opacity 90ms linear; }
    #hitmarker.on { opacity: 1; }
    #hitmarker i { position: absolute; background: var(--accent); }
    #hitmarker i:nth-child(1) { left: 12px; top: 0; width: 2px; height: 8px; }
    #hitmarker i:nth-child(2) { left: 12px; bottom: 0; width: 2px; height: 8px; }
    #hitmarker i:nth-child(3) { top: 12px; left: 0; height: 2px; width: 8px; }
    #hitmarker i:nth-child(4) { top: 12px; right: 0; height: 2px; width: 8px; }
    #hitmarker.kill i { background: var(--hazard); }

    #scope-overlay { position: fixed; inset: 0; pointer-events: none; background: radial-gradient(circle at center, transparent 0 80px, rgba(0,0,0,0.85) 90px); display: none; }
    #scope-overlay.on { display: block; }
    #scope-overlay::after { content: ''; position: fixed; left: 50%; top: 50%; width: 1px; height: 100vh; transform: translateX(-0.5px); background: rgba(255,255,255,0.5); }
    #scope-overlay::before { content: ''; position: fixed; left: 0; top: 50%; width: 100vw; height: 1px; transform: translateY(-0.5px); background: rgba(255,255,255,0.5); }

    #top-bar { position: fixed; top: 18px; left: 50%; transform: translateX(-50%); display: flex; gap: 18px; align-items: center; padding: 6px 14px; background: rgba(15,20,28,0.78); border: 1px solid var(--hairline); border-radius: 8px; font-family: var(--font-readout); font-size: 14px; }
    #round-info { display: flex; gap: 12px; align-items: center; color: var(--ink); }
    #match-score b { font-weight: 600; padding: 0 4px; }
    #match-score .blue { color: var(--blue); }
    #match-score .red { color: var(--red); }
    #phase-label { color: var(--accent); font-weight: 600; letter-spacing: 0.1em; }

    #killfeed { position: fixed; top: 60px; right: 24px; display: flex; flex-direction: column; gap: 4px; align-items: flex-end; font-size: 13px; max-width: 280px; }
    #killfeed .kf { padding: 3px 8px; background: rgba(15,20,28,0.7); border-left: 3px solid var(--muted); border-radius: 3px; }
    #killfeed .kf.blue { border-color: var(--blue); }
    #killfeed .kf.red { border-color: var(--red); }
    #killfeed .kf .killer { color: var(--ink); }
    #killfeed .kf .victim { color: var(--muted); }
    #killfeed .kf .hs { color: var(--hazard); }

    #money { position: fixed; top: 18px; left: 24px; font-family: var(--font-readout); font-size: 28px; color: var(--accent); letter-spacing: -0.02em; }
    #money .label { color: var(--muted); margin-right: 2px; }

    #ammo { position: fixed; right: 32px; bottom: 24px; display: flex; align-items: baseline; gap: 8px; font-family: var(--font-readout); font-size: 56px; line-height: 1; letter-spacing: -0.03em; color: var(--ink); }
    #ammo.empty #ammo-mag { color: var(--hazard); }
    #ammo-reserve { font-size: 16px; color: var(--muted); }

    #health-armor { position: fixed; left: 32px; bottom: 24px; display: flex; flex-direction: column; gap: 6px; font-family: var(--font-readout); }
    #health-armor .bar { display: flex; align-items: center; gap: 8px; font-size: 16px; color: var(--ink); width: 220px; }
    #health-armor .bar i { display: block; height: 6px; background: var(--accent); border-radius: 3px; flex: 0 0 100%; transition: flex-basis 80ms linear; }
    #health-armor .bar.armor i { background: var(--accent2); }
    #health-armor .bar span { min-width: 30px; text-align: right; }

    #weapon-name { position: fixed; right: 32px; bottom: 90px; font-family: var(--font-readout); font-size: 14px; color: var(--muted); letter-spacing: 0.05em; text-transform: uppercase; }

    #bomb-status { position: fixed; top: 70px; left: 50%; transform: translateX(-50%); padding: 6px 16px; background: rgba(180,40,40,0.4); border: 1px solid var(--red); border-radius: 4px; font-family: var(--font-readout); }
    #bomb-status #bomb-label { color: var(--red); font-weight: 600; margin-right: 8px; }
    #bomb-status #bomb-timer { color: var(--hazard); font-size: 18px; }

    .overlay { position: fixed; inset: 0; display: grid; place-items: center; padding: 24px; background: color-mix(in srgb, var(--canvas) 86%, transparent); pointer-events: auto; }
    .panel { width: min(560px, 100%); padding: 32px; background: var(--surface); border: 1px solid var(--hairline); border-radius: 12px; }
    .panel h1 { margin: 0 0 8px; font-size: 42px; line-height: 1.05; font-weight: 700; letter-spacing: -0.02em; color: var(--ink); }
    .panel h1 { background: linear-gradient(120deg, var(--accent), var(--accent2)); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .panel .subtitle { margin: 0 0 24px; color: var(--muted); max-width: 46ch; }
    .panel p { margin: 0 0 16px; color: var(--muted); }
    .panel .muted { color: var(--muted); font-size: 13px; }
    button { font: inherit; font-weight: 500; padding: 10px 18px; border: 1px solid var(--accent); border-radius: 8px; background: var(--accent); color: var(--canvas); cursor: pointer; }
    button:hover { background: var(--ink); border-color: var(--ink); color: var(--canvas); }

    .keys { margin: 24px 0 0; padding: 0; list-style: none; display: grid; gap: 8px; font-size: 13px; color: var(--muted); grid-template-columns: 1fr 1fr; }
    .keys li { display: flex; align-items: center; gap: 6px; }
    .keys kbd { min-width: 22px; padding: 2px 5px; border: 1px solid var(--hairline); border-radius: 4px; font-family: var(--font-readout); font-size: 11px; color: var(--ink); text-align: center; }

    .buy-panel { width: min(720px, 100%); }
    .buy-panel h2 { margin: 0 0 8px; font-size: 28px; }
    .buy-panel #buy-money { color: var(--accent); margin-left: 12px; font-family: var(--font-readout); }
    .buy-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
    .buy-section h3 { margin: 0 0 8px; font-size: 14px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; }
    .buy-section ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
    .buy-section li button { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 8px 12px; background: var(--canvas); color: var(--ink); border: 1px solid var(--hairline); border-radius: 6px; font-size: 14px; }
    .buy-section li button:hover { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, var(--canvas)); }
    .buy-section li button:disabled { opacity: 0.5; cursor: not-allowed; }
    .buy-section li button .price { color: var(--accent); font-family: var(--font-readout); }
    .buy-footer { margin-top: 16px; display: flex; justify-content: flex-end; }

    .scoreboard-panel { width: min(640px, 100%); }
    .team-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
    .team-col h3 { margin: 0 0 8px; font-size: 16px; }
    .team-col.blue h3 { color: var(--blue); }
    .team-col.red h3 { color: var(--red); }
    .team-col h3 span { color: var(--muted); margin-left: 6px; font-family: var(--font-readout); }
    .team-col ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 4px; font-size: 13px; }
    .team-col li { display: flex; justify-content: space-between; padding: 4px 8px; background: var(--canvas); border-radius: 4px; }
    .team-col li.dead { opacity: 0.5; }

    @media (prefers-reduced-motion: reduce) {
      * { transition-duration: 0.01ms !important; }
    }
  `;
  document.head.appendChild(style);

  // Append the HUD container to rootEl (do NOT replace rootEl.innerHTML)
  rootEl.appendChild(container);

  // Cache DOM
  const el = (id) => document.getElementById(id);
  const dom = {
    crosshair: el('crosshair'),
    hitmarker: el('hitmarker'),
    scopeOverlay: el('scope-overlay'),
    roundNum: el('round-num'),
    roundTimer: el('round-timer'),
    matchScoreBlue: el('match-score').querySelector('.blue'),
    matchScoreRed: el('match-score').querySelector('.red'),
    phaseLabel: el('phase-label'),
    killfeed: el('killfeed'),
    money: el('money-value'),
    ammoMag: el('ammo-mag'),
    ammoReserve: el('ammo-reserve'),
    healthBar: el('health-bar'),
    healthText: el('health-text'),
    armorBar: el('armor-bar'),
    armorText: el('armor-text'),
    weaponName: el('weapon-name'),
    bombStatus: el('bomb-status'),
    bombTimer: el('bomb-timer'),
    buyMenu: el('buy-menu'),
    buyMoney: el('buy-money'),
    buyWeapons: el('buy-weapons'),
    buyEquipment: el('buy-equipment'),
    buyClose: el('buy-close'),
    scoreboard: el('scoreboard'),
    sbBlueScore: el('sb-blue-score'),
    sbRedScore: el('sb-red-score'),
    sbBlue: el('sb-blue'),
    sbRed: el('sb-red'),
    startMenu: el('start-menu'),
    playBtn: el('play-btn'),
    roundEndOverlay: el('round-end-overlay'),
    reTitle: el('re-title'),
    reReason: el('re-reason'),
    reNext: el('re-next'),
    matchEndOverlay: el('match-end-overlay'),
    meTitle: el('me-title'),
    meScore: el('me-score'),
    meRestart: el('me-restart'),
  };

  // Build buy menu
  function buildBuyMenu(player, onBuy) {
    dom.buyMoney.textContent = `$${player.state.money}`;
    dom.buyWeapons.innerHTML = '';
    for (const w of weaponsByCost()) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.innerHTML = `<span>${w.name}</span><span class="price">$${w.cost}</span>`;
      btn.disabled = player.state.money < w.cost;
      btn.onclick = () => onBuy('weapon', w.id);
      li.appendChild(btn);
      dom.buyWeapons.appendChild(li);
    }
    dom.buyEquipment.innerHTML = '';
    for (const e of Object.values(CONFIG.equipment)) {
      if (e.cost === 0) continue;     // bomb given automatically
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.innerHTML = `<span>${e.name}</span><span class="price">$${e.cost}</span>`;
      btn.disabled = player.state.money < e.cost;
      btn.onclick = () => onBuy('equipment', e.id);
      li.appendChild(btn);
      dom.buyEquipment.appendChild(li);
    }
  }

  function showHitmarker(isKill) {
    dom.hitmarker.classList.add('on');
    if (isKill) dom.hitmarker.classList.add('kill'); else dom.hitmarker.classList.remove('kill');
    setTimeout(() => dom.hitmarker.classList.remove('on'), 120);
  }

  function showBuyMenu(show) {
    dom.buyMenu.style.display = show ? 'grid' : 'none';
  }

  function showScoreboard(show) {
    dom.scoreboard.style.display = show ? 'grid' : 'none';
  }

  function showStartMenu(show) {
    dom.startMenu.style.display = show ? 'grid' : 'none';
  }

  function showRoundEnd(show, winner, reason) {
    if (!show) { dom.roundEndOverlay.style.display = 'none'; return; }
    dom.roundEndOverlay.style.display = 'grid';
    dom.reTitle.textContent = winner === 'blue' ? 'Blue Wins Round' : 'Red Wins Round';
    dom.reTitle.style.color = winner === 'blue' ? PALETTE.teamBlue : PALETTE.teamRed;
    dom.reReason.textContent = `Reason: ${reason}`;
    dom.reNext.textContent = 'Next round in a moment...';
  }

  function showMatchEnd(show, blueScore, redScore) {
    if (!show) { dom.matchEndOverlay.style.display = 'none'; return; }
    dom.matchEndOverlay.style.display = 'grid';
    const blueWon = blueScore > redScore;
    dom.meTitle.textContent = blueWon ? 'Blue Team Wins' : 'Red Team Wins';
    dom.meTitle.style.color = blueWon ? PALETTE.teamBlue : PALETTE.teamRed;
    dom.meScore.textContent = `${blueScore} — ${redScore}`;
  }

  function fmtTime(sec) {
    if (sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function update(player, rounds, now) {
    const r = rounds.state;
    dom.roundNum.textContent = `R${r.round}`;
    dom.matchScoreBlue.textContent = r.blueScore;
    dom.matchScoreRed.textContent = r.redScore;
    dom.phaseLabel.textContent = r.phase.toUpperCase();

    if (r.phase === 'buy') {
      dom.roundTimer.textContent = fmtTime(r.phaseEnd - now);
    } else if (r.phase === 'combat') {
      if (r.bombPlantedAt > 0) {
        const elapsed = now - r.bombPlantedAt;
        const remaining = 35 - elapsed;
        dom.bombStatus.style.display = 'block';
        dom.bombTimer.textContent = Math.max(0, Math.ceil(remaining));
        dom.roundTimer.textContent = 'BOMB';
      } else {
        dom.bombStatus.style.display = 'none';
        dom.roundTimer.textContent = fmtTime(r.phaseEnd - now);
      }
    } else {
      dom.bombStatus.style.display = 'none';
      dom.roundTimer.textContent = '--';
    }

    dom.money.textContent = player.state.money;
    if (player.state.weapon) {
      dom.ammoMag.textContent = player.state.weapon.state.mag;
      dom.ammoReserve.textContent = `/ ${player.state.weapon.state.reserve}`;
      dom.ammoMag.parentElement.id = 'ammo';
      if (player.state.weapon.state.mag === 0) document.getElementById('ammo').classList.add('empty');
      else document.getElementById('ammo').classList.remove('empty');
      dom.weaponName.textContent = player.state.weapon.name;
    }
    dom.healthBar.style.flexBasis = `${player.state.health}%`;
    dom.healthText.textContent = Math.ceil(player.state.health);
    dom.armorBar.style.flexBasis = `${player.state.armor}%`;
    dom.armorText.textContent = Math.ceil(player.state.armor);

    // Kill feed
    const kf = r.killFeed.slice(0, 5);
    dom.killfeed.innerHTML = kf.map(k => {
      const kTeam = k.killer?.team || k.killerTeam || 'blue';
      return `<div class="kf ${kTeam}"><span class="killer">${k.killer}</span> ▸ <span class="victim">${k.victim}</span>${k.headshot ? ' <span class="hs">HS</span>' : ''}</div>`;
    }).join('');

    // Scope overlay
    if (player.state.weapon?.isScoped?.()) dom.scopeOverlay.classList.add('on');
    else dom.scopeOverlay.classList.remove('on');
  }

  function updateScoreboard(player, bots, rounds) {
    dom.sbBlueScore.textContent = rounds.state.blueScore;
    dom.sbRedScore.textContent = rounds.state.redScore;
    const blueList = [{ name: 'You', alive: player.alive, money: player.state.money }];
    const redList = [];
    for (const b of bots) {
      const item = { name: b.state.name, alive: b.alive, money: b.state.money };
      if (b.team === 'blue') blueList.push(item);
      else redList.push(item);
    }
    const render = (list) => list.map(i => `<li class="${i.alive ? '' : 'dead'}"><span>${i.name}</span><span>$${i.money}</span></li>`).join('');
    dom.sbBlue.innerHTML = render(blueList);
    dom.sbRed.innerHTML = render(redList);
  }

  return {
    dom,
    buildBuyMenu,
    showBuyMenu, showScoreboard, showStartMenu, showRoundEnd, showMatchEnd,
    showHitmarker,
    update, updateScoreboard,
  };
}
