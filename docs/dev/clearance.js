// Clearance check (for testing; nothing on the keep page loads this). Plays each being forward in
// time at each of its ages and tests its solid parts against everything fixed in the scene: the
// keep's walls (the doorway is open), the courtyard walls, the building plots, the well, the dead
// tree, the barrow mound and its standing stones, and where Rooken stands in the courtyard.
//
// In the browser, on keep.html?demo (not a creature preview):
//   const c = await import('./dev/clearance.js'); await c.run();            // every released being
//   await c.run({ kinds: ['axolotl'], seconds: 120 });                       // just some
// Returns a list of { being, age, part, obstacle, t } for anything that touches.

// boxes: [name, x0, x1, y0, y1, z0, z1]; heights are generous (ground rises outside the walls)
const OBSTACLES = [
  ['keep north wall', -5.3, 5.3, -1, 4.2, -4.6, -4.0], ['keep south wall', -5.3, 5.3, -1, 4.2, 4.0, 4.6],
  ['keep east wall', 5.0, 5.6, -1, 4.2, -4.3, 4.3],
  ['keep west wall', -5.65, -4.95, -1, 4.2, -4.3, .35], ['keep west wall', -5.65, -4.95, -1, 4.2, 1.65, 4.3],
  ['the lintel', -5.65, -4.95, 2.4, 4.2, .35, 1.65],
  ['courtyard west wall', -17.45, -16.95, -1, 1.1, -4.3, 4.3],
  ['courtyard north wall', -17.2, -5.3, -1, 1.2, -4.55, -4.05], ['courtyard south wall', -17.2, -5.3, -1, 1.0, 4.05, 4.55],
  ['plot 0', -13.35, -10.45, -1, 3.1, -3.7, -1.3], ['plot 1', -13.35, -10.45, -1, 3.1, 1.5, 3.9],
  ['plot 2', -16.65, -13.75, -1, 3.1, -3.7, -1.3], ['plot 3', -16.65, -13.75, -1, 3.1, 1.5, 3.9],
  ['the well', -8.9, -7.5, -1, .8, 1.7, 3.1], ['the dead tree', -9.05, -8.55, -1, 2.4, -2.45, -1.95],
  ['the barrow mound', -26.9, -22.1, -1, 1.0, -3.8, .8],
  ['a standing stone', -21.9, -20.9, -1, 2.0, -3.6, -2.6], ['a standing stone', -22.0, -21.0, -1, 1.7, -.3, .7],
  ['a standing stone', -25.4, -24.4, -1, 2.1, -5.1, -4.1], ['the barrow slab', -23.0, -21.6, -1, .7, -1.9, -.7],
  ['Rooken (courtyard)', -7.75, -7.05, -1, 1.9, .65, 1.35],
];
// what a being is meant to touch (it perches on, or leans in at, or lives inside)
const ALLOWED = { dragon2: ['courtyard west wall', 'courtyard north wall'], doorway: ['the lintel'], watcher: ['keep north wall'], well: ['the well'],
  manyjoint: ['keep north wall', 'keep west wall'] };   // (its fingertips press on the stone)
const NATURE = { fog: 'hostile', axolotl: 'gentle', bellcrab: 'neutral', glassbeak: 'nuisance', ashwolves: 'hostile',
  dragon2: 'proud', longman2: 'hostile', whale: 'gentle', moths: 'nuisance', barrow: 'proud', thorn: 'neutral',
  lanternheads: 'gentle', brood: 'nuisance', thincrowd: 'hostile', doorway: 'hostile', basilisk: 'hostile', wyrm: 'hostile',
  crawl: 'hostile', golem: 'proud', well: 'proud', bloom: 'courteous', warden: 'courteous', larva: 'gentle',
  listener: 'neutral', cartographer: 'gentle', moon2: 'neutral', bentone: 'hostile', watcher: 'hostile', nightgrown: 'neutral', lander: 'neutral',
  clockhead: 'neutral', stranger: 'hostile', ninefold: 'neutral', leech: 'neutral', seam: 'neutral', stitched: 'neutral', manyjoint: 'hostile', hill: 'neutral', glassy2: 'neutral', glassy3: 'neutral', glassy4: 'neutral' };
// beings that come in forms that are not ages (brain/creatures.py KINDS forms): each is checked
const FORMS = { clockhead: ['', 'clock', 'hourglass', 'metronome', 'galaxy', 'mask'], stranger: ['cape', 'woodsman', 'bark', 'traveller', 'bare'] };
const AGED = ['axolotl', 'bellcrab', 'glassbeak', 'ashwolves', 'dragon2', 'whale', 'thorn', 'basilisk', 'wyrm', 'larva',
  'listener', 'cartographer', 'bentone', 'watcher', 'nightgrown', 'leech'];

function solidBoxes(root) {
  // each solid mesh's world box (skipping glows, smoke, water, rings: anything see-through)
  const out = [];
  root.traverse(o => {
    if (!o.isMesh || !o.visible || o.isSprite) return;
    let v = o, shown = true; while (v) { if (!v.visible) shown = false; v = v.parent; }
    if (!shown) return;
    const m = o.material;
    if (!m || m.transparent || m.depthWrite === false || m.blending === 2) return;
    const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox();
    const b = g.boundingBox, e = o.matrixWorld.elements;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
      const X = e[0] * x + e[4] * y + e[8] * z + e[12], Y = e[1] * x + e[5] * y + e[9] * z + e[13], Z = e[2] * x + e[6] * y + e[10] * z + e[14];
      x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y); z0 = Math.min(z0, Z); z1 = Math.max(z1, Z);
    }
    if (x1 - x0 > 30 || z1 - z0 > 30) return;                 // (sky-sized effects)
    if (y1 - y0 < .05) return;                                    // (flat marks on the ground: scorch, grey grass, a crater floor)
    out.push([o, x0, x1, y0, y1, z0, z1]);
  });
  return out;
}

const SHRINK = .06;   // a part's box is a little bigger than the part; allow for it
function touches(b, o) {
  return b[1] + SHRINK < o[2] && b[2] - SHRINK > o[1] && b[3] + SHRINK < o[4] && b[4] - SHRINK > o[3] && b[5] + SHRINK < o[6] && b[6] - SHRINK > o[5];
}
// the boxes overlap; is any of the part's actual surface inside? (samples each triangle's corners,
// edges and middle, so a big wing whose box reaches a wall but whose skin does not is let off)
function surfaceIn(mesh, o) {
  const pa = mesh.geometry.attributes.position, idx = mesh.geometry.index, e = mesh.matrixWorld.elements;
  const W = i => { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
    return [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]]; };
  const inside = ([x, y, z]) => x > o[1] + .02 && x < o[2] - .02 && y > o[3] + .02 && y < o[4] - .02 && z > o[5] + .02 && z < o[6] - .02;
  const n = idx ? idx.count : pa.count, at = k => (idx ? idx.getX(k) : k);
  for (let k = 0; k + 2 < n; k += 3) {
    const a = W(at(k)), b = W(at(k + 1)), c = W(at(k + 2));
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      const steps = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) / .1));
      for (let s = 0; s < steps; s++) { const u = s / steps; const pt = [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u]; if (inside(pt)) return pt.map(v => +v.toFixed(2)); }
    }
    const m = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3]; if (inside(m)) return m.map(v => +v.toFixed(2));
  }
  return false;
}

export async function run({ kinds = Object.keys(NATURE), seconds = 150, step = 2.5 } = {}) {
  const K = window.__keep, hits = [];
  let scene = K.camera.parent; while (scene.parent) scene = scene.parent;
  const iso = ms => new Date(ms).toISOString(), now = Date.now();
  for (const kind of kinds) for (const age of AGED.includes(kind) ? ['', 'young', 'old'] : FORMS[kind] || ['']) {
    const form = FORMS[kind] ? age : '';
    await K.setCreatures([{ id: `${kind}-${age}-check`, kind, render: kind, nature: NATURE[kind] || 'neutral', variant: { size: 1, age: form ? '' : age, kind: form },
                            start: iso(now - 30000), end: iso(now + 3600e3), chain: 5, last: true }]);
    let root = null; scene.traverse(o => { if (!root && o.userData?.appearance?.id === `${kind}-${age}-check`) root = o; });
    if (!root) { hits.push({ being: kind, age, part: '-', obstacle: 'did not appear', t: 0 }); continue; }
    const seen = new Set();
    for (let t = 0; t < seconds; t += step) {
      K.advance(step);
      for (const b of solidBoxes(root)) for (const o of OBSTACLES) {
        if ((ALLOWED[kind] || []).includes(o[0])) continue;
        let at; if (!seen.has(o[0]) && touches(b, o) && (at = surfaceIn(b[0], o))) { seen.add(o[0]); hits.push({ being: kind, age: age || 'grown', part: b[0].geometry.type, obstacle: o[0], t: Math.round(t), at, box: b.slice(1).map(v => +v.toFixed(2)), color: b[0].material.color?.getHexString() }); }
      }
    }
  }
  await K.setCreatures([]);
  return hits;
}
