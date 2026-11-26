// Keyboard and mouse for Langit Pos: held keys for flying, clicks for menus and
// the cockpit buttons, and a draggable throttle lever.
export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let mouse = { x: 0, y: 0, down: false, clicked: null };
  let throttleDrag = false;

  function key(e) {
    return e.key.length === 1 ? e.key.toLowerCase() : e.key;
  }
  window.addEventListener('keydown', (e) => {
    const k = key(e);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (!keys.has(k)) pressed.add(k);
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => keys.delete(key(e)));
  window.addEventListener('blur', () => keys.clear());

  function toLocal(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
  }
  canvas.addEventListener('pointerdown', (e) => {
    const p = toLocal(e);
    mouse = { x: p.x, y: p.y, down: true, clicked: { x: p.x, y: p.y } };
  });
  window.addEventListener('pointermove', (e) => {
    const p = toLocal(e);
    mouse.x = p.x;
    mouse.y = p.y;
  });
  window.addEventListener('pointerup', () => { mouse.down = false; throttleDrag = false; });

  return {
    held(name) { return keys.has(name); },
    wasPressed(name) { return pressed.has(name); },
    consumeClick() {
      const c = mouse.clicked;
      mouse.clicked = null;
      return c;
    },
    mouse() { return mouse; },
    setThrottleDrag(v) { throttleDrag = v; },
    throttleDragging() { return throttleDrag; },
    /** Call once per frame: edge-triggered keys only live one frame. */
    endFrame() { pressed.clear(); },
  };
}
