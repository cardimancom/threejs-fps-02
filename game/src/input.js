// Input: pointer lock + keyboard + mouse. Exposes a state object the loop reads.
export function createInput(domElement, onLockChange) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, dx: 0, dy: 0, left: false, right: false };
  let locked = false;

  function lockChange() {
    locked = document.pointerLockElement === domElement;
    onLockChange?.(locked);
  }
  document.addEventListener('pointerlockchange', lockChange);

  domElement.addEventListener('click', () => {
    if (!locked) domElement.requestPointerLock?.();
  });

  document.addEventListener('mousemove', (e) => {
    if (!locked) return;
    mouse.dx += e.movementX;
    mouse.dy += e.movementY;
  });

  document.addEventListener('mousedown', (e) => {
    if (!locked) return;
    if (e.button === 0) mouse.left = true;
    if (e.button === 2) mouse.right = true;
  });
  document.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.left = false;
    if (e.button === 2) mouse.right = false;
  });
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  document.addEventListener('keydown', (e) => {
    keys.add(e.code);
    // number keys 1-5 select weapons
    if (['Digit1','Digit2','Digit3','Digit4','Digit5'].includes(e.code)) {
      state.weaponSlot = parseInt(e.code.slice(5), 10) - 1;
    }
    // B opens buy menu (only in buy phase)
    if (e.code === 'KeyB') state.buyToggle = true;
    if (e.code === 'Escape') state.pauseToggle = true;
    if (e.code === 'KeyR') state.reloadRequest = true;
    if (e.code === 'KeyG') state.dropRequest = true;
    if (e.code === 'KeyF') state.plantRequest = true;     // plant bomb / objective
    if (e.code === 'KeyE') state.useRequest = true;
    if (e.code === 'KeyM') state.mapVoteRequest = true;
    if (e.code === 'Tab') { e.preventDefault(); state.scoreboard = true; }
  });

  document.addEventListener('keyup', (e) => {
    keys.delete(e.code);
    if (e.code === 'Tab') state.scoreboard = false;
    if (e.code === 'KeyB') state.buyToggle = false;
  });

  const state = {
    keys,
    mouse,
    locked,
    weaponSlot: 0,
    buyToggle: false,
    pauseToggle: false,
    reloadRequest: false,
    dropRequest: false,
    plantRequest: false,
    useRequest: false,
    mapVoteRequest: false,
    scoreboard: false,
    consumeMouseDelta() {
      const dx = mouse.dx, dy = mouse.dy;
      mouse.dx = 0; mouse.dy = 0;
      return { dx, dy };
    },
    isDown(code) { return keys.has(code); },
  };
  return state;
}
