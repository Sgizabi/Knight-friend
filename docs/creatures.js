// Creature previews: mockups of beings that might one day come to the keep.
// Loaded only by keep.html?demo&creature=<name>. Nothing here touches Rooken's world.

let T, A;
const live = [];            // what the current creature added (to tidy up on switching)
let cur = null, ui = null;

// ------------------------------------------------------------------ helpers
const V = (x, y, z) => new T.Vector3(x, y, z);
const P = (parent, geo, material, pos = [0, 0, 0], o = {}) => A.part(parent, geo, material, pos, o);
function G(parent, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const g = new T.Group(); g.position.set(...pos); g.rotation.set(...rot); parent.add(g); return g;
}
function glow(color, intensity = 2, extra = {}) {
  return new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: .6,
                                      flatShading: true, toneMapped: false, ...extra });
}
const ds = (color, metal = 0, rough = .9) => A.mat(color, metal, rough, { side: T.DoubleSide });
// a procession along a path across the courtyard (the lantern folk): make(group, i) builds one
// walker and returns { legs, arms, flicker(t), lightY }
function procession(root, make, n = 7) {
  // the old road, where it skirts the keep outside the west and south walls (never through stone)
  const pts = [[-31, 3.6], [-25, 3.9], [-21, 4.4], [-18.6, 5.3], [-15.2, 6.7], [-10, 7.9], [-3, 8.4], [6, 8.6], [15, 8.2]].map(([x, z]) => V(x, 0, z));   // south of the barrow mound and its stones
  const curve = new T.CatmullRomCurve3(pts), len = curve.getLength();
  const halo = new T.SpriteMaterial({ map: puff(), color: '#ffc77a', transparent: true, opacity: .55, depthWrite: false,
                                      blending: T.AdditiveBlending, fog: false });
  const folk = [];
  for (let i = 0; i < n; i++) {
    const w = G(root); w.scale.setScalar(.88 + ((i * 37) % 5) * .05);
    const parts = make(w, i);
    const h = new T.Sprite(halo.clone()); h.position.y = parts.lightY; h.scale.setScalar(1.1); w.add(h);   // its light, without a light
    folk.push({ w, i, h, ...parts });
  }
  const steps = [], stepM = new T.MeshBasicMaterial({ color: '#ffe2a0', transparent: true, depthWrite: false });
  for (let k = 0; k < 40; k++) { const m = new T.Mesh(new T.CircleGeometry(.06, 6), stepM.clone()); m.rotation.x = -Math.PI / 2; m.visible = false; root.add(m); steps.push({ m, born: -9 }); }
  let nextStep = 0, si = 0;
  const at = V(), ahead = V();
  return (t) => {
    for (const f of folk) {
      const u = (((t * .4 - f.i * 1.5 + len * .45) % (len + 9)) + len + 9) % (len + 9) / len;   // a pause between processions
      f.w.visible = u <= 1;
      if (!f.w.visible) continue;
      curve.getPointAt(Math.min(1, u), at); curve.getPointAt(Math.min(1, u + .01), ahead);
      const y = gy(at.x, at.z);
      f.w.position.set(at.x, y + Math.abs(Math.sin(t * 5 + f.i)) * .02, at.z); f.w.lookAt(ahead.x, f.w.position.y, ahead.z);
      f.legs.forEach((l, k) => { l.rotation.x = Math.sin(t * 5 + f.i + k * Math.PI) * .35; });
      f.arms.forEach((a, k) => { a.rotation.x = -Math.sin(t * 5 + f.i + k * Math.PI) * .25; });
      f.flicker(t);
      f.h.material.opacity = .45 + Math.sin(t * 11 + f.i) * .08;
      if (f.i === 3 && t > nextStep) { const s = steps[si++ % steps.length]; s.m.position.set(at.x, y + .025, at.z); s.m.visible = true; s.born = t; nextStep = t + .45; }
    }
    for (const s of steps) if (s.m.visible) { const k = (t - s.born) / 6; s.m.material.opacity = Math.max(0, .7 * (1 - k)); if (k > 1) s.m.visible = false; }
  };
}
// a tall, thin figure in the Long Man's proportions, h metres tall; returns { head }
function thinFigure(g, h, dark, face) {
  const k = h / 5.4, s = v => v.map(x => x * k);
  for (const sx of [-1, 1]) {
    bone(g, s([sx * .16, 3.2, 0]), s([sx * .2, 1.6, .05]), .07 * k, .055 * k, dark);
    bone(g, s([sx * .2, 1.6, .05]), s([sx * .17, 0, 0]), .055 * k, .045 * k, dark);
    bone(g, s([sx * .28, 4.65, 0]), s([sx * .36, 3.2, .05]), .05 * k, .04 * k, dark);
    bone(g, s([sx * .36, 3.2, .05]), s([sx * .33, 1.75, .1]), .04 * k, .035 * k, dark);
  }
  P(g, A.cyl(.2 * k, .13 * k, 1.5 * k, 6), dark, s([0, 3.95, 0]), { scale: [1, 1, .6] });
  bone(g, s([-.3, 4.66, 0]), s([.3, 4.66, 0]), .05 * k, .05 * k, dark);
  bone(g, s([0, 4.7, 0]), s([0, 5.2, .02]), .04 * k, .035 * k, dark);
  const head = G(g, s([0, 5.42, .03]));
  P(head, A.ico(.17 * k, 1), face, [0, 0, 0], { scale: [.8, 1.25, .85] });
  return { head };
}
// a face that is not there: an oval of pure black that takes no light and ignores the mist,
// optionally with a few faint specks drifting deep inside it. Returns a tick for the specks.
let ovalTex = null;
const ovalMask = () => ovalTex ??= canvasTex(64, 64, (c, w) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, w); c.fillStyle = '#fff'; c.beginPath(); c.ellipse(w / 2, w / 2, w * .47, w * .47, 0, 0, 6.3); c.fill(); });
function voidFace(head, specks, scale = [.78, 1.25, .85], r = .17) {
  // a cap following the curve of the head, so it reads as a hole in the face, not a disc on it
  const cap = new T.Mesh(new T.SphereGeometry(r * 1.035, 24, 16, Math.PI / 2 - .62, 1.24, Math.PI / 2 - .6, 1.15),
                         new T.MeshBasicMaterial({ color: '#000000', fog: false, alphaMap: ovalMask(), alphaTest: .5 }));
  cap.scale.set(...scale); head.add(cap);
  if (!specks) return () => {};
  const N = 7, pos = new Float32Array(N * 3), seeds = Array.from({ length: N }, (_, i) => ({ a: i * 2.4, r: .25 + (i % 3) * .22, sp: .08 + (i % 4) * .03 }));
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  const mat = new T.PointsMaterial({ color: '#cfd8ff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: .75, fog: false, depthWrite: false });
  const pts = new T.Points(geo, mat); head.add(pts);
  const front = r * 1.04 * scale[2] + .002, w = r * scale[0] * .45, h = r * scale[1] * .45;
  return t => {
    seeds.forEach((s, i) => { const a = s.a + t * s.sp; pos[i * 3] = Math.cos(a) * s.r * w; pos[i * 3 + 1] = Math.sin(a * 1.3) * s.r * h; pos[i * 3 + 2] = front; });
    geo.attributes.position.needsUpdate = true; mat.opacity = .55 + Math.sin(t * .7) * .2;
  };
}
// the ground's height out on the land (flat 0 in the courtyard)
const gy = (x, z) => (A.ground ? A.ground(x, z) : 0);
// one of the Night-Grown: thin, stooped, dark glass with stars drifting over it, a seam of light for a face
// age: '' grown; 'young' a seedling of glass still growing out of the ground where a star fell (no legs
// yet, swaying); 'old' tall, its glass cracked, so full of stars it shines white, stars leaking out of
// the cracks, one arm always raised, very still.
function nightGrown(parent, pos, s = 1, age = '') {
  const young = age === 'young', old = age === 'old';
  const glass = new T.MeshStandardMaterial({ color: old ? '#2a3248' : '#1c2438', metalness: .45, roughness: .15, emissive: old ? '#2a3a60' : '#1a2848', emissiveIntensity: 1.1, flatShading: true });
  const seam = glow('#bfe2ff', 2.6, { fog: false });
  const g = G(parent, pos); g.scale.setScalar(s);
  if (young) {                                                       // the glowing ground it grows from
    const fall = new T.Mesh(new T.CircleGeometry(.3, 10), glow('#9fc0ff', 1.4, { fog: false })); fall.rotation.x = -Math.PI / 2; fall.position.y = .02; g.add(fall);
    for (let k = 0; k < 5; k++) P(g, new T.TetrahedronGeometry(.04), seam, [Math.cos(k * 1.3) * .22, .03, Math.sin(k * 1.3) * .22], { cast: false });
  } else for (const sx of [-1, 1]) { bone(g, [sx * .09, 1.05, 0], [sx * .12, .55, .1], .045, .035, glass); bone(g, [sx * .12, .55, .1], [sx * .1, 0, 0], .035, .03, glass); }
  const torso = G(g, [0, young ? -.15 : 1.05, 0], [young ? .1 : .38, 0, 0]);
  P(torso, A.ico(.2, 1), glass, [0, .45, 0], { scale: [1, 2.2, .75] });
  bone(torso, [0, .85, 0], [0, 1.05, .08], .035, .03, glass);
  const head = G(torso, [0, 1.15, .1]);
  P(head, A.ico(.1, 1), glass, [0, 0, 0], { scale: [.85, 1.15, .95] });
  P(head, A.box(.012, .17, .01), seam, [0, 0, .097], { cast: false, jitter: 0 });
  const arms = [-1, 1].map(sx => {
    const a = G(torso, [sx * .2, .8, 0]); if (young) a.scale.setScalar(.45);   // the young: little arms, not yet grown
    bone(a, [0, 0, 0], [sx * .05, -.6, .05], .03, .025, glass); bone(a, [sx * .05, -.6, .05], [sx * .03, -1.15, .1], .025, .02, glass);
    for (let f = 0; f < 3; f++) bone(a, [sx * .03, -1.15, .1], [sx * (.01 + f * .025), -1.38, .12 + f * .01], .008, .004, glass, 4);
    return a;
  });
  const N = old ? 150 : young ? 12 : 40, sp = new Float32Array(N * 3), r = A.rand(Math.floor(pos[0] * 100));
  for (let i = 0; i < N; i++) { const u = r() * 6.28, v = Math.acos(2 * r() - 1); sp.set([Math.sin(v) * Math.cos(u) * .205, .45 + Math.cos(v) * .45, Math.sin(v) * Math.sin(u) * .155], i * 3); }
  const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(sp, 3));
  const stars = new T.Points(sg, new T.PointsMaterial({ color: old ? '#ffffff' : '#e4ecff', size: old ? .04 : .03, transparent: true, opacity: .9, fog: false })); torso.add(stars);
  let leak = null, lp = null;
  if (old) {                                                         // cracks, and stars leaking out of them
    for (let k = 0; k < 6; k++) P(torso, A.box(.008, .22 + r() * .2, .008), seam, [Math.sin(k * 2.3) * .19, .25 + (k % 3) * .25, Math.cos(k * 2.3) * .14], { rot: [0, 0, (r() - .5) * .8], cast: false, jitter: 0 });
    lp = new Float32Array(12 * 3); const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.BufferAttribute(lp, 3));
    leak = new T.Points(lg, new T.PointsMaterial({ color: '#ffffff', size: .035, transparent: true, opacity: .8, fog: false })); torso.add(leak);
  }
  return {
    g, tick(t, ph) {
      const reach = smooth(0, 1, pulse(t + ph, 9, 4.5) * 1.6);   // now and then they reach for the sky
      arms.forEach((a, i) => { a.rotation.x = old && i === 1 ? -2.7 + Math.sin(t * .2 + ph) * .03 : -reach * (2.5 + i * .15) * (young ? .6 : 1) + Math.sin(t * .7 + ph + i) * .05; });   // the old: one arm always raised
      head.rotation.x = -reach * .55 * (old ? .3 : 1); torso.rotation.x = (young ? .1 : .38) - reach * .3 * (old ? .3 : 1);
      g.rotation.z = young ? Math.sin(t * .9 + ph) * .12 : Math.sin(t * .5 + ph) * (old ? .01 : .04);   // the young sway like stalks
      stars.rotation.y = t * .08 + ph; seam.emissiveIntensity = 2.2 + Math.sin(t * 1.3 + ph) * .7;
      if (leak) { for (let i = 0; i < 12; i++) { const k = (t * .1 + i / 12) % 1; lp.set([Math.sin(i * 2.3) * .2 + Math.sin(t + i) * .05 * k, .3 + (i % 3) * .25 + k * 1.2, Math.cos(i * 2.3) * .15], i * 3); } leak.geometry.attributes.position.needsUpdate = true; leak.material.opacity = .8; }
    },
  };
}
// an eye: white, a glowing iris and a pupil, looking along +z
function eyeball(parent, r, iris, pos) {
  const e = G(parent, pos);
  P(e, new T.SphereGeometry(r, 12, 9), A.mat('#e2dccb', 0, .35), [0, 0, 0], { jitter: 0 });
  P(e, new T.CircleGeometry(r * .55, 12), glow(iris, 1.4), [0, 0, r * 1.002], { jitter: 0, cast: false });
  P(e, new T.CircleGeometry(r * .22, 10), A.mat('#050405'), [0, 0, r * 1.006], { jitter: 0, cast: false });
  return e;
}
// a tapered bone between two points
function bone(parent, a, b, r0, r1, material, sides = 6, jitter = .015) {
  const from = V(...a), to = V(...b), d = to.clone().sub(from), len = d.length();
  const m = P(parent, A.cyl(r1, r0, len, sides), material, [0, 0, 0], { jitter });
  m.position.copy(from).add(to).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  return m;
}
// a jointed chain along +Y (necks, tails, tentacles); returns the joints
function chain(parent, n, len, r0, r1, material, o = {}) {
  const joints = []; let at = parent;
  for (let i = 0; i < n; i++) {
    const j = new T.Group(); if (i) j.position.y = len; at.add(j);
    const ra = r0 + (r1 - r0) * i / n, rb = r0 + (r1 - r0) * (i + 1) / n;
    P(j, A.cyl(rb, ra, len * 1.06, o.sides || 7), material, [0, len / 2, 0], { jitter: o.jitter ?? .02, seed: i });
    P(j, A.ico(ra * 1.04, 1), material, [0, 0, 0], { jitter: .01 });
    if (o.each) o.each(i, j, ra, rb);
    joints.push(j); at = j;
  }
  return joints;
}
// a flat membrane from points and triangles
function sheet(parent, pts, tris, material) {
  const arr = [];
  for (const [a, b, c] of tris) arr.push(...pts[a], ...pts[b], ...pts[c]);
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(arr, 3)); g.computeVertexNormals();
  const m = new T.Mesh(g, material); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
// Performance: many small still pieces (a woven body, a tangle of branches) cost one draw each.
// Merge a group's direct mesh children into one mesh per material; what animates stays separate.
function merge(group) {
  const byMat = new Map();
  for (const c of [...group.children]) {
    if (!c.isMesh || c.isInstancedMesh || c.userData.keep) continue;
    c.updateMatrix();
    let geo = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone();
    geo.applyMatrix4(c.matrix);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const list = byMat.get(c.material) || []; list.push(geo); byMat.set(c.material, list);
    group.remove(c);
  }
  for (const [material, geos] of byMat) {
    const n = geos.reduce((k, g) => k + g.attributes.position.count, 0);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let o = 0;
    for (const g of geos) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; g.dispose(); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
    const m = new T.Mesh(geo, material); m.castShadow = true; m.receiveShadow = true; group.add(m);
  }
}
// Performance: a glow that stands in for a light (no real light: every light makes everything
// dearer). It answers to .intensity like a light does, so a being's animation needs no change.
function softLight(color, intensity = 2, size = 3) {
  const sp = new T.Sprite(new T.SpriteMaterial({ map: puff(), color, transparent: true, opacity: 0, depthWrite: false,
                                                 blending: T.AdditiveBlending, fog: false }));
  sp.scale.setScalar(size);
  Object.defineProperty(sp, 'intensity', { get() { return sp.userData.i ?? 0; },
    set(v) { sp.userData.i = v; sp.material.opacity = Math.min(.75, v * .09); } });
  sp.intensity = intensity;
  return sp;
}
// What is solid in and around the courtyard: [x0, x1, y0, y1, z0, z1] (docs/dev/clearance.js checks against the same)
const SOLID = [[-13.35, -10.45, -1, 3.1, -3.7, -1.3], [-13.35, -10.45, -1, 3.1, 1.5, 3.9], [-16.65, -13.75, -1, 3.1, -3.7, -1.3],
  [-16.65, -13.75, -1, 3.1, 1.5, 3.9], [-8.9, -7.5, -1, .8, 1.7, 3.1], [-9.05, -8.55, -1, 2.4, -2.45, -1.95],
  [-17.45, -16.95, -1, 1.1, -4.3, 4.3], [-17.2, -5.3, -1, 1.2, -4.55, -4.05], [-17.2, -5.3, -1, 1.0, 4.05, 4.55], [-7.75, -7.05, -1, 1.9, .65, 1.35]];
const inSolid = (x, y, z, pad = .3) => SOLID.some(([x0, x1, y0, y1, z0, z1]) => x > x0 - pad && x < x1 + pad && y > y0 - pad && y < y1 + pad && z > z0 - pad && z < z1 + pad);
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
let puffTex = null;
const puff = () => puffTex ??= canvasTex(128, 128, (g, w) => {
  const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(.45, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, w);
});
// a cheap steady 'random' from a number (the same every time, so a being's moods can be replayed)
const nz = i => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
// Sprung joints: say where each joint wants to be, and it swings there on a spring of its own
// (w: how quick, zeta: 1 settles cleanly, lower overshoots and settles). Heavy parts lag, light
// parts follow through: real weight, which is what makes it look wrong in a world that has none.
function rig() {
  const J = {};
  return {
    J,
    add(name, obj, w, zeta = 1) { const r = obj.rotation; J[name] = { obj, w, zeta, cur: [r.x, r.y, r.z], vel: [0, 0, 0], want: [r.x, r.y, r.z] }; return obj; },
    want(name, x = 0, y = 0, z = 0) { const w = J[name].want; w[0] = x; w[1] = y; w[2] = z; },
    rate(name, w) { J[name].w = w; },
    step(dt) {
      dt = Math.min(dt, .1); const n = Math.max(1, Math.ceil(dt * 120)), h = dt / n;
      for (const name in J) {
        const j = J[name], w2 = j.w * j.w, c = 2 * j.zeta * j.w;
        for (let k = 0; k < n; k++) for (let i = 0; i < 3; i++) { j.vel[i] += (w2 * (j.want[i] - j.cur[i]) - c * j.vel[i]) * h; j.cur[i] += j.vel[i] * h; }
        j.obj.rotation.set(j.cur[0], j.cur[1], j.cur[2]);
      }
    },
  };
}
const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const pulse = (t, every, len) => { const p = t % every; return p < len ? Math.sin(p / len * Math.PI) : 0; };

// The visit's own clock, for beings whose visit has a beginning and an end (an arrival, a landing,
// a leaving): at the real keep it is the real time since the visit began (so someone who looks in
// half an hour later finds the ship already down), and the time left before it ends. The preview has
// no visit: it loops instead (C seconds). Returns t => ({ since, left }).
function visitClock(root, C) {
  const a = root.userData.appearance || {};
  if (!a.id || !a.start || !a.end) return t => { const since = t % C; return { since, left: C - since, live: false }; };
  const s0 = Date.parse(a.start), len = (Date.parse(a.end) - s0) / 1000; let t0 = null;
  return t => { if (t0 === null) t0 = t - (Date.now() - s0) / 1000; const since = t - t0; return { since, left: len - since, live: true }; };
}
// THE GLASSY PEOPLE. Their craft: a smooth seed of pale metal with a hinged upper shell, a ring of
// light underneath and a beam it comes down on. s: size. Returns its parts.
function seedShip(parent, s = 1) {
  const hull = A.mat('#d4d9e0', .6, .25, { emissive: '#4a6a78', emissiveIntensity: .55 }), seam = A.mat('#8a929e', .6, .3), lightM = glow('#7ff0e6', 2.4, { fog: false });
  const ship = G(parent); ship.scale.setScalar(s);
  P(ship, new T.SphereGeometry(1.7, 18, 10, 0, 6.283, Math.PI / 2, Math.PI / 2), hull, [0, 0, 0], { scale: [1, .55, 1], jitter: .01 });   // the lower hull
  const lid = G(ship, [-1.6, 0, 0]);   // the upper shell, hinged at one side
  P(lid, new T.SphereGeometry(1.7, 18, 10, 0, 6.283, 0, Math.PI / 2), hull, [1.6, 0, 0], { scale: [1, .75, 1], jitter: .01 });
  for (const y of [-.25, -.5]) { const sm = new T.Mesh(new T.TorusGeometry(1.65 - (y < -.3 ? .3 : .05), .03, 4, 36), seam); sm.rotation.x = Math.PI / 2; sm.position.y = y; ship.add(sm); }
  const under = new T.Mesh(new T.TorusGeometry(.9, .07, 6, 32), lightM); under.rotation.x = Math.PI / 2; under.position.y = -.85; ship.add(under);
  const inner = softLight('#9ff6ee', 0, 5); inner.position.y = .4; ship.add(inner);
  for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; P(ship, A.box(.02, .02, .5), seam, [Math.cos(a) * 1.25, -.62, Math.sin(a) * 1.25], { rot: [0, -a, 0], cast: false }); }   // panel lines underneath
  P(ship, A.cyl(.12, .2, .25, 10), seam, [0, -.9, 0]);                // the root-like keel of a seed
  const beam = new T.Mesh(new T.ConeGeometry(2.2, 12, 20, 1, true), new T.MeshBasicMaterial({ color: '#9ff6ee', transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false }));
  beam.position.y = -6.8; ship.add(beam);
  return { ship, lid, under, inner, beam, lightM };
}
// Places out on the land worth a look (the glassy scouts' errands): the barrow's edge, the forest edge,
// the road, the plain, the lake shore, the ground north of the keep. Never inside the walls.
const SURVEY = [[-21, -6.5], [-28.2, 3.2], [-19.4, 3.6], [-30, 7], [-31, -7], [-28, 14], [-15, 8], [-8, 9.5], [0, 10], [6, 9], [14, 8.5],
  [2, 16], [-5, 15], [10, 15], [16, 21], [20, 14], [7, 23], [-12, 19], [-20, 12], [12, -3], [15, 5], [11, -10], [3, -11], [-6, -11],
  [-14, -10], [20, -6], [-36, 1]];
// What a walker on the land goes round, not through: the keep and its courtyard, and the barrow with its stones.
const KEEP_OUT = [[-18.6, 6.6, -5.6, 5.6], [-27.4, -20.4, -5.4, 1.3]];
// A way from a to b ([x, z]) that goes round them: the shortest line through their corners. Returns the points to walk to.
function routeAround(a, b) {
  const inside = (x, z) => KEEP_OUT.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1);
  const clear = (p, q) => { for (let i = 1; i < 30; i++) { const u = i / 30; if (inside(p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u)) return false; } return true; };
  if (clear(a, b)) return [b];
  const nodes = [a, b, ...KEEP_OUT.flatMap(([x0, x1, z0, z1]) => [[x0 - 1, z0 - 1], [x1 + 1, z0 - 1], [x0 - 1, z1 + 1], [x1 + 1, z1 + 1]]).filter(p => !inside(...p))];
  const dist = nodes.map(() => Infinity), prev = nodes.map(() => -1), done = nodes.map(() => false); dist[0] = 0;
  for (;;) {
    let u = -1; nodes.forEach((_, i) => { if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i; });
    if (u < 0 || u === 1) break; done[u] = true;
    nodes.forEach((q, v) => { if (!done[v] && v !== u && clear(nodes[u], q)) { const d = dist[u] + Math.hypot(q[0] - nodes[u][0], q[1] - nodes[u][1]); if (d < dist[v]) { dist[v] = d; prev[v] = u; } } });
  }
  if (prev[1] < 0) return [b];
  const path = []; for (let v = 1; v > 0; v = prev[v]) path.unshift(nodes[v]);
  return path;
}
let SOV_STARS = null;   // (the page's stars, while the Sovereign's mothership has set them further out)
// Motes of light: a pool of points that are sent out, drift and fade (one draw for all of them).
function motePool(parent, n = 160, color = '#cffaff', size = .07) {
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), base = new T.Color(color), M = Array.from({ length: n }, () => ({ life: 0, max: 1, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0 }));
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3));
  const pts = new T.Points(geo, new T.PointsMaterial({ size: size * 1.8, map: puff(), vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false }));   // (soft round dots)
  pts.frustumCulled = false; parent.add(pts);
  let next = 0;
  return {
    emit(x, y, z, vx = 0, vy = 0, vz = 0, life = 1) { const p = M[next++ % n]; p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.life = p.max = life; },
    tick(dt) {
      M.forEach((p, i) => {
        if (p.life > 0) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; const a = Math.max(0, p.life / p.max); pos.set([p.x, p.y, p.z], i * 3); col.set([base.r * a, base.g * a, base.b * a], i * 3); }
        else pos[i * 3 + 1] = -999;
      });
      geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    },
  };
}
// One of them coming down a beam (k: 0 at the top, 1 on the ground): it forms out of motes as it comes,
// growing from a wisp to its full self, and lands in a crouch with a soft burst of light at its feet.
// Going back up (k from 1 to 0) it comes apart into motes the same way. Call every frame.
function beamArrive(st, f, m, k, motes, dt, fromY) {
  const was = st.k ?? 0; st.k = k;
  m.y = fromY * (1 - k * k * (3 - 2 * k));
  const s = .25 + .75 * smooth(.1, .95, k); f.g.scale.setScalar(s);
  if (k > 0 && k < 1) {                                                 // motes gathering in round it (or flying off, going up)
    const P_ = f.g.position, up = k < was;
    for (let i = 0; i < 2; i++) { const a = Math.random() * 6.28, r = .9 + Math.random() * .6, h = Math.random() * 2.2 * f.k;
      motes.emit(P_.x + Math.cos(a) * r, P_.y + h, P_.z + Math.sin(a) * r, -Math.cos(a) * r * (up ? -1.4 : 1.6), (up ? .8 : -.2), -Math.sin(a) * r * (up ? -1.4 : 1.6), .55); }
  }
  if (was < 1 && k >= 1) {                                              // landed: a crouch, a ring of light going out over the grass
    st.landT = 0; const P_ = f.g.position;
    for (let i = 0; i < 26; i++) { const a = i / 26 * 6.28; motes.emit(P_.x, P_.y + .08, P_.z, Math.cos(a) * 2.2, .15, Math.sin(a) * 2.2, .9); }
  }
  if (st.landT != null) { st.landT += dt; m.crouch = st.landT < .45 ? .8 : 0; if (st.landT > .5) st.landT = null; }
}
// One of them. Two layers: a clear faceted shell of glass, and inside it a skeleton of light (a core in
// the chest, a line of light up the spine) that brightens as they move. A smooth lens for a head with a
// thin band of light round its front, and no face. Each kind its own build:
//   scout     lean and quick, on long backward-bending legs (they run on their toes), small sensor fins on
//             the head and shoulders, and a beam out of the lens
//   builder   broad and heavy-footed, amber, shoulder plates, carrying a panel of light
//   gardener  slender and careful, long arms with long three-jointed fingers, for taking samples
//   sovereign tall, a robe of light panels and a crest of glass blades that brightens when it is pleased
const GLASS = {};
function glassFolk(parent, kind = 'scout', seed = 1) {
  const sov = kind === 'sovereign', bld = kind === 'builder', sct = kind === 'scout', gdn = kind === 'gardener';
  const [c0, c1] = bld ? ['#ffe9c8', '#d8a050'] : sov ? ['#f0f8ff', '#b4e2ff'] : gdn ? ['#d8f4ec', '#7fd8c0'] : ['#d4ecff', '#6fbfe0'];
  const shell = GLASS[kind] ??= new T.MeshStandardMaterial({ color: c0, transparent: true, opacity: .42, emissive: c1, emissiveIntensity: 1.0, roughness: .05, metalness: .35, flatShading: true, depthWrite: false });
  const core = new T.MeshStandardMaterial({ color: '#ffffff', emissive: c1, emissiveIntensity: 2.2, roughness: .4, flatShading: true, toneMapped: false });   // (its own, so it can brighten)
  const band = new T.MeshBasicMaterial({ color: '#ffffff', fog: false });
  const k = sov ? 1.45 : bld ? .9 : gdn ? .95 : 1;
  const g = G(parent), hips = G(g);
  // legs: [thigh, shin, foot-bone] and their resting bend (the scout's bend backward, like a bird's)
  const L = sct ? [.62, .72, .42] : bld ? [.5, .5] : [.68, .68], REST = sct ? [-.35, .9, -.7] : [0, 0, 0];
  const legR = (bld ? .075 : sct ? .044 : .048) * k;
  let hipY = 0; { let a = 0; L.forEach((l, i) => { a += REST[i]; hipY += l * Math.cos(a); }); } hipY = (hipY + (bld ? .05 : .03)) * k;
  hips.position.y = hipY;
  const legs = [-1, 1].map(sx => {
    const segs = []; let at = G(hips, [sx * (bld ? .17 : .1) * k, 0, 0]);
    L.forEach((l, i) => { const j = i ? G(at, [0, -L[i - 1] * k, 0]) : at; j.rotation.x = REST[i]; const r0 = legR * (1 - i * .18), r1 = legR * (.8 - i * .18);
      bone(j, [0, 0, 0], [0, -l * k, 0], r0, Math.max(.008, r1), shell, 6, .004); segs.push(j); at = j; });   // (each joint hangs from the one above)
    const foot = segs.at(-1);
    P(foot, A.ico((bld ? .09 : .045) * k, 0), shell, [0, -L.at(-1) * k, (bld ? .07 : .05) * k], { scale: bld ? [1.2, .5, 1.6] : [.8, .45, 2], cast: false, jitter: 0 });
    return segs;
  });
  // the body: shell and the light inside it
  const body = G(g, [0, hipY, 0]), torso = G(body);
  P(torso, A.ico(.22 * k, 1), shell, [0, .5 * k, 0], { scale: bld ? [1.5, 1.3, 1.05] : sct ? [.74, 1.6, .56] : [.8, 1.7, .6], cast: false, jitter: .006 });
  if (sct) for (const sx of [-1, 1]) P(torso, new T.ConeGeometry(.04 * k, .26 * k, 3), shell, [sx * .15 * k, .82 * k, -.05 * k], { rot: [-.5, 0, sx * .9], cast: false, jitter: 0 });   // sensor fins
  if (bld) for (const sx of [-1, 1]) P(torso, A.ico(.13 * k, 0), shell, [sx * .34 * k, .82 * k, 0], { scale: [1.3, .7, 1.1], cast: false, jitter: 0 });   // shoulder plates
  bone(torso, [0, .78 * k, 0], [0, (bld ? 1.0 : 1.12) * k, .02 * k], (bld ? .07 : .035) * k, (bld ? .06 : .028) * k, shell, 6, 0);   // the neck
  merge(torso);
  const coreG = G(body);
  P(coreG, A.ico(.075 * k, 1), core, [0, .62 * k, .02 * k], { cast: false, jitter: 0 });
  bone(coreG, [0, .05 * k, 0], [0, .98 * k, 0], .012 * k, .01 * k, core, 4, 0);
  merge(coreG);
  // the head: a smooth lens, a band of light round its front
  const head = G(body, [0, (bld ? 1.0 : 1.14) * k, .02 * k]);
  P(head, A.ico(.12 * k, 2), shell, [0, 0, .02 * k], { scale: bld ? [1.05, .85, 1.15] : [.78, .95, 1.3], cast: false, jitter: 0 });
  if (sct) for (const sx of [-1, 1]) P(head, new T.ConeGeometry(.025 * k, .2 * k, 3), shell, [sx * .07 * k, .07 * k, -.1 * k], { rot: [-1.2, 0, sx * .4], cast: false, jitter: 0 });   // fins swept back
  merge(head);
  const visG = G(head, [0, .01 * k, .02 * k], [0, -(Math.PI / 2 - .75), 0]);   // (the band: an arc of 1.5 turned to face the front)
  const vis = new T.Mesh(new T.TorusGeometry(.105 * k, .007 * k, 3, 16, 1.5), band); vis.rotation.x = Math.PI / 2; vis.scale.set(bld ? 1.22 : .95, bld ? 1.33 : 1.5, 1); visG.add(vis);
  // arms: shoulder and elbow (the gardener's long, with long fingers)
  const AL = gdn ? [.55, .6] : bld ? [.42, .42] : [.48, .5];
  const arms = [-1, 1].map(sx => {
    const sh = G(body, [sx * (bld ? .32 : .16) * k, .82 * k, 0]); bone(sh, [0, 0, 0], [0, -AL[0] * k, 0], (bld ? .045 : .022) * k, (bld ? .038 : .016) * k, shell, 5, .003);
    const el = G(sh, [0, -AL[0] * k, 0]); bone(el, [0, 0, 0], [0, -AL[1] * k, 0], (bld ? .038 : .016) * k, (bld ? .03 : .01) * k, shell, 5, .003);
    if (gdn) for (let f = 0; f < 3; f++) { const a = (f - 1) * .25; bone(el, [0, -AL[1] * k, 0], [Math.sin(a) * .05 * k, -(AL[1] + .17) * k, .03 * k], .006 * k, .004 * k, shell, 3, 0); bone(el, [Math.sin(a) * .05 * k, -(AL[1] + .17) * k, .03 * k], [Math.sin(a) * .07 * k, -(AL[1] + .3) * k, .07 * k], .004 * k, .002 * k, shell, 3, 0); }
    merge(sh); merge(el);
    return { sh, el, sx };
  });
  const out = { g, hips, body, torso, head, legs, arms, core, k, kind, hipY, REST, shell };
  if (sct) {
    const fade = GLASS.beamFade ??= canvasTex(4, 64, (cx, w, h) => { const gr = cx.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.35, '#707070'); gr.addColorStop(1, '#000000'); cx.fillStyle = gr; cx.fillRect(0, 0, w, h); });
    const b = new T.Mesh(new T.ConeGeometry(1.1, 9, 14, 1, true), new T.MeshBasicMaterial({ color: '#bff4ff', alphaMap: fade, transparent: true, opacity: .08, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false }));
    b.rotation.x = -Math.PI / 2; b.position.z = 4.6; head.add(b); out.beam = b;   // (bright at the lens, fading to nothing)
  }
  if (bld) {
    const pnl = new T.Mesh(new T.BoxGeometry(.7, .5, .04), new T.MeshBasicMaterial({ color: '#ffd9a0', transparent: true, opacity: .5, depthWrite: false, fog: false }));
    pnl.position.set(0, .45 * k, .4 * k); body.add(pnl); out.panel = pnl;
  }
  if (sov) {
    const crestM = glow('#dff4ff', 1.6, { fog: false, transparent: true, opacity: .85 }), crest = G(head, [0, .05 * k, -.06 * k]);
    for (let i = 0; i < 7; i++) { const a = (i - 3) * .3; P(crest, new T.ConeGeometry(.03 * k, (.55 + (3 - Math.abs(i - 3)) * .12) * k, 3), crestM, [Math.sin(a) * .2 * k, .25 * k + Math.cos(a) * .2 * k, 0], { rot: [0, 0, -a], cast: false, jitter: 0 }); }
    merge(crest);
    const robeM = new T.MeshBasicMaterial({ color: '#8fc4e8', transparent: true, opacity: .09, depthWrite: false, side: T.DoubleSide, fog: false, blending: T.AdditiveBlending });
    const robe = [];
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, c = G(body, [Math.sin(a) * .2 * k, .95 * k, Math.cos(a) * .14 * k], [0, a, 0]); sheet(c, [[-.1 * k, 0, 0], [.1 * k, 0, 0], [.14 * k, -hipY - .9 * k, .1 * k], [-.14 * k, -hipY - .9 * k, .1 * k]], [[0, 1, 2], [0, 2, 3]], robeM); robe.push({ c, ph: i * 1.3 }); }
    out.crestM = crestM; out.crest = crest; out.robe = robe;
  }
  const lt = softLight(c1, sov ? 3.5 : 2.4, sov ? 4.5 : 3.4); lt.position.y = hipY + .5 * k; g.add(lt); out.light = lt;
  g.traverse(o => { if (o.isMesh) o.castShadow = false; });          // (glass and light: no hard shadows)
  return out;
}
// How one of them moves. A mover keeps its place and speed: toward() walks or runs it to a point
// (speeding up, slowing to a stop, never sliding), and pose() sets its legs, arms and body from how fast
// it is truly going: the stride follows the ground it covers, the scout breaks into a run on its toes,
// it leans into speed and into turns, and when it stops its legs settle and it stands.
function glassMover(f, x, z, yaw = Math.PI) {
  const m = { f, x, z, yaw, y: 0, v: 0, phase: Math.random() * 6, spd: 0, turnRate: 0, crouch: 0, crouchK: 0, look: null, px: x, pz: z, lean: 0 };
  const RUN = f.kind === 'scout' ? 3.4 : f.kind === 'sovereign' ? .7 : 1.4;
  m.toward = (tx, tz, vmax, dt, acc = 2.4) => {
    const dx = tx - m.x, dz = tz - m.z, d = Math.hypot(dx, dz);
    const want = Math.min(vmax, Math.sqrt(2 * acc * Math.max(0, d - .02)));     // speed up, and slow down to arrive
    m.v += Math.max(-acc * dt * 1.6, Math.min(acc * dt, want - m.v));
    if (d > .02 && m.v > 0) { const st = Math.min(d, m.v * dt); m.x += dx / d * st; m.z += dz / d * st; }
    else m.v = Math.max(0, m.v - acc * dt * 2);
    if (d > .3) { let dy = Math.atan2(dx, dz) - m.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); const r = dy * (1 - Math.exp(-dt * (4 + m.v))); m.turnRate = dt > 0 ? r / dt : 0; m.yaw += r; }
    return d;
  };
  m.face = (yaw, dt, rate = 3) => { let dy = yaw - m.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); const r = dy * (1 - Math.exp(-dt * rate)); m.turnRate = dt > 0 ? r / dt : 0; m.yaw += r; };   // (a first frame can have no time in it)
  m.pose = (t, dt) => {
    const moved = Math.hypot(m.x - m.px, m.z - m.pz); m.px = m.x; m.pz = m.z;
    m.spd += (Math.min(6, moved / Math.max(dt, 1e-3)) - m.spd) * (1 - Math.exp(-dt * 8));
    const amp = smooth(.03, .5, m.spd), run = smooth(1.6, RUN, m.spd), k = f.k;
    const stride = (f.kind === 'scout' ? .95 + run * 1.1 : f.kind === 'builder' ? .55 : .8) * k;
    m.phase += moved / stride * Math.PI;
    m.crouchK += (m.crouch - m.crouchK) * (1 - Math.exp(-dt * 4));
    const s = Math.sin(m.phase), c = Math.cos(m.phase), cr = m.crouchK;
    f.legs.forEach((segs, i) => {
      const ph = i ? Math.PI : 0, sl = Math.sin(m.phase + ph), lift = Math.max(0, Math.sin(m.phase + ph + 1.3));
      if (segs.length === 3) {                                          // on its toes: thigh, shin back, foot-bone
        segs[0].rotation.x = f.REST[0] - sl * (.38 + .32 * run) * amp - cr * .7;
        segs[1].rotation.x = f.REST[1] + lift * (.45 + .55 * run) * amp + cr * 1.1;
        segs[2].rotation.x = f.REST[2] - lift * (.3 + .3 * run) * amp - cr * .5;
      } else {
        segs[0].rotation.x = -sl * (f.kind === 'builder' ? .32 : .4) * amp - cr * .9;
        segs[1].rotation.x = lift * (.55 + .2 * run) * amp + cr * 1.6;
      }
    });
    f.arms.forEach(({ sh, el, sx }, i) => {
      const sw = Math.sin(m.phase + (i ? 0 : Math.PI));
      if (f.panel) { sh.rotation.x = -.95; el.rotation.x = -.35; }
      else { sh.rotation.x = sw * (.3 + .25 * run) * amp - cr * .4 + Math.sin(t * .7 + i) * .02; el.rotation.x = -(.15 + .7 * run) * amp - cr * .5 - .08; }
      sh.rotation.z = sx * (.06 + run * .08);
    });
    // body: a bob with each step, a lean into speed and into turns, lower when crouching
    const bob = Math.abs(c) * (.03 + .04 * run) * amp * k, drop = cr * (f.kind === 'scout' ? .45 : .5) * k;
    m.lean += (Math.max(-.5, Math.min(.5, m.turnRate * .08)) - m.lean) * (1 - Math.exp(-dt * 5));
    f.hips.position.y = f.hipY - drop + bob; f.body.position.y = f.hipY - drop + bob;
    f.body.rotation.x = (.05 + .22 * run) * amp + cr * .55; f.body.rotation.z = -m.lean * (.5 + run);
    f.torso.rotation.y = s * .1 * amp;
    // the light inside: brighter as it runs; the shell a little brighter too
    f.core.emissiveIntensity = 2 + m.spd * .4 + Math.sin(t * 2.3 + f.k * 7) * .15;
    f.light.intensity = (f.kind === 'sovereign' ? 3.5 : 2.4) + m.spd * .3;
    if (f.robe) f.robe.forEach(({ c: rc, ph }) => { rc.rotation.x = Math.sin(t * .9 + ph) * .05 + amp * .14; });
    f.g.position.set(m.x, gy(m.x, m.z) + m.y, m.z); f.g.rotation.y = m.yaw;
  };
  // where its head looks: a world point (it turns its head, and if that is not enough, its body), or null to look ahead
  const hp = V();
  m.lookAt = (P_, dt, rate = 5) => {
    f.head.getWorldPosition(hp);
    let ry = 0, rx = .15;
    if (P_) { ry = Math.atan2(P_.x - hp.x, P_.z - hp.z) - m.yaw; ry = Math.atan2(Math.sin(ry), Math.cos(ry)); rx = -Math.atan2(P_.y - hp.y, Math.hypot(P_.x - hp.x, P_.z - hp.z)); }
    const cy = Math.max(-1.2, Math.min(1.2, ry));
    f.head.rotation.y += (cy - f.head.rotation.y) * (1 - Math.exp(-dt * rate)); f.head.rotation.x += (rx - f.head.rotation.x - f.body.rotation.x * .6) * (1 - Math.exp(-dt * rate));
    return ry - cy;                                                    // (what is left over: the body should turn that much)
  };
  return m;
}

// A meteor coming down at (px, pz): the streak, the flash (a glow, not a light), the ring of air, the
// stones thrown up, and the crater, smoking and glowing. o.loop: replay every so many seconds (the
// preview); o.age: how many seconds ago it fell (the real keep: seen falling only if just now; after
// that, the crater cools over the days, the embers first, then the smoke). Returns t => seconds since it hit.
function meteorScene(root, px, pz, o = {}) {
  const py = gy(px, pz), P0 = V(px, py, pz), S = V(px + 14, py + 16, pz + 10), T_HIT = 2.6;
  const head = new T.Mesh(A.ico(.55, 1), new T.MeshBasicMaterial({ color: '#fff2c8', fog: false })); root.add(head);
  const trail = Array.from({ length: 16 }, (_, i) => { const s = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: i < 5 ? '#ffe0a0' : '#ff8a3a', transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false })); root.add(s); return s; });
  const flash = softLight('#ffb070', 0, 26); flash.position.copy(P0).add(V(0, 2, 0)); root.add(flash);
  const crater = G(root, [px, py, pz]);
  const hole = new T.Mesh(new T.CircleGeometry(2.4, 16), A.mat('#120d0a', 0, 1)); hole.rotation.x = -Math.PI / 2; hole.position.y = .05; crater.add(hole);
  const r = A.rand(8), embers = glow('#ff7a2a', 2.5);
  for (let i = 0; i < 18; i++) { const a = i / 18 * 6.28, d = 2.3 + r() * .5; P(crater, A.box(.5 + r() * .4, .3 + r() * .3, .4), A.M.stone, [Math.cos(a) * d, .12, Math.sin(a) * d], { rot: [r() - .5, a, (r() - .5) * .9] }); }
  for (let i = 0; i < 10; i++) P(crater, A.ico(.08 + r() * .1, 0), embers, [(r() - .5) * 2.6, .08, (r() - .5) * 2.6], { cast: false });
  const rockM = A.mat('#2a2622', .4, .5, { emissive: '#ff5a1a', emissiveIntensity: .6 }); P(crater, A.ico(.55, 0), rockM, [0, .2, 0]);
  const heat = softLight('#ff7a3a', 2, 4); heat.position.y = .6; crater.add(heat);
  const ring = new T.Mesh(new T.RingGeometry(.93, 1, 48), new T.MeshBasicMaterial({ color: '#ffd8a0', transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.copy(P0).add(V(0, .3, 0)); root.add(ring);
  const debris = Array.from({ length: 22 }, (_, i) => { const m = P(root, A.ico(.12 + nz(i) * .12, 0), A.M.stoneD, [0, 0, 0], { cast: false }); return { m, v: V((nz(i + 3) - .5) * 10, 6 + nz(i + 7) * 8, (nz(i + 9) - .5) * 10) }; });
  const smoke = Array.from({ length: 12 }, (_, i) => { const s = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: '#4a4440', transparent: true, opacity: 0, depthWrite: false })); root.add(s); return { s, ph: i / 12 }; });
  let t0 = null;
  return (t) => {
    if (t0 === null) t0 = t;
    const k = o.loop ? t % o.loop : (o.age || 0) + (t - t0);                 // (seconds since it began to fall)
    const falling = k < T_HIT, after = k >= T_HIT, since = k - T_HIT, days = since / 86400;
    const u = Math.min(1, k / T_HIT);
    head.visible = falling; head.position.copy(S).lerp(P0, u * u);
    trail.forEach((s, i) => { s.visible = falling; if (falling) { s.position.copy(S).lerp(P0, Math.max(0, u - i * .012) ** 2); s.scale.setScalar(2.4 - i * .1); s.material.opacity = .9 - i * .05; } });
    flash.intensity = after ? 9 * Math.exp(-since * 2.2) : falling ? 1.5 * u : 0;
    crater.visible = after;
    ring.visible = after && since < .9; if (ring.visible) { ring.material.opacity = .7 * (1 - since / .9); ring.scale.setScalar(1 + since * 14); }
    debris.forEach(d => { d.m.visible = after && since < 2.4; if (d.m.visible) { d.m.position.copy(P0).addScaledVector(d.v, since); d.m.position.y = py + d.v.y * since - 9.8 * since * since / 2; } });
    const cool = Math.max(0, 1 - days * 1.2), smokeK = Math.max(.12, 1 - days * .45);   // the embers die within a day; a thread of smoke for days
    smoke.forEach(sm => { const q = (t * .12 + sm.ph) % 1; sm.s.position.set(px + Math.sin(sm.ph * 30) * .8 * q, py + .5 + q * 7 * smokeK, pz + Math.cos(sm.ph * 20) * .8 * q); sm.s.scale.setScalar((1 + q * 4) * (.5 + smokeK * .5)); sm.s.material.opacity = after ? .4 * (1 - q) * smokeK : 0; });
    embers.emissiveIntensity = (2 + Math.sin(t * 6) * .6) * cool; rockM.emissiveIntensity = .6 * cool + .05; heat.intensity = 2 * cool;
    return k;
  };
}
// Where things came down or landed, for the traces they leave at the real keep (by who came)
const METEOR_AT = { larva: [-14.5, 11.5], nightgrown: [9.5, 19] };
const SHIP_AT = { glassy1: [[-7, 22, 1.2]], glassy3: [[4.6, 21.6, 1.2], [13.5, 22.4, 1.2], [9.4, 24.8, 1.2]], glassy4: [[11, 24, 2.5]] };
function shipScorch(root, spots, days) {   // scorched rings in the grass where a craft stood, fading over the days
  const m = new T.MeshBasicMaterial({ color: '#16120e', transparent: true, opacity: .85 * Math.max(.25, 1 - days / 3), depthWrite: false });
  for (const [x, z, s] of spots) { const ring = new T.Mesh(new T.RingGeometry(1.2 * s, 2.3 * s, 28), m); ring.rotation.x = -Math.PI / 2; ring.position.set(x, gy(x, z) + .04, z); root.add(ring); }
  return () => {};
}

// ------------------------------------------------------------------ the creatures
const DEPTHS = [['', 'shallow (slipped through)'], ['deep', 'deep (from a rift)']];   // the abyssals: how deep they came from
const BEASTS = {
  // ================================================================ DRAGON
  dragon: {
    name: 'The dragon', hour: 18,
    blurb: 'Legendary. Lands on the courtyard wall, peers down at whoever is there, and breathes embers when it is curious.',
    view: [[-10.6, 1.7, 4.6], [-7.2, 2.5, -3.4]],
    knight: { place: 'courtyard', action: 'stand', emote: 'exclaim', note: 'face to face with a dragon' },
    build(root) {
      const g = G(root, [-7.3, 1.25, -4.3]);
      const scale = A.mat('#5b2620', .15, .7), scaleD = A.mat('#3b1915', .15, .75), belly = A.mat('#b38a5c', 0, .8);
      const horn = A.mat('#d9ccb0', 0, .6), claw = A.mat('#1c1512', .2, .5), web = ds('#6e2c22');
      const torso = G(g, [0, 1.0, 0]);
      P(torso, A.ico(1, 1), scale, [0, 0, .1], { scale: [.95, .82, 1.45], jitter: .05 });
      P(torso, A.ico(.85, 1), scale, [0, .2, 1.0], { jitter: .04 });
      P(torso, A.ico(.9, 1), belly, [0, -.3, .35], { scale: [.78, .6, 1.35], jitter: .03 });
      for (const sx of [-1, 1]) {
        P(torso, A.ico(.55, 1), scaleD, [sx * .62, -.12, -.6], { scale: [.8, 1.1, 1.2], jitter: .03 });
        P(torso, A.ico(.42, 1), scaleD, [sx * .62, .18, 1.0], { jitter: .03 });
      }
      for (let i = 0; i < 8; i++) P(torso, new T.ConeGeometry(.09, .32 - i * .015, 4), scaleD, [0, .82 - i * .02, 1.3 - i * .33], { rot: [-.3, 0, 0] });
      // legs, gripping the wall top
      for (const sx of [-1, 1]) {
        bone(g, [sx * .62, 1.2, 1.0], [sx * .78, .6, .8], .2, .15, scale);
        bone(g, [sx * .78, .6, .8], [sx * .6, .12, .3], .15, .1, scale);
        P(g, A.box(.26, .1, .3), scaleD, [sx * .6, .06, .28]);
        for (const dx of [-.08, 0, .08]) P(g, new T.ConeGeometry(.03, .18, 4), claw, [sx * .6 + dx, -.02, .45], { rot: [2.2, 0, 0] });
        bone(g, [sx * .62, .9, -.6], [sx * .88, .72, -.05], .3, .2, scale);
        bone(g, [sx * .88, .72, -.05], [sx * .75, .22, -.5], .2, .12, scale);
        bone(g, [sx * .75, .22, -.5], [sx * .7, .06, -.18], .12, .09, scale);
        for (const dx of [-.09, 0, .09]) P(g, new T.ConeGeometry(.035, .2, 4), claw, [sx * .7 + dx, .03, -.02], { rot: [1.75, 0, 0] });
      }
      // neck and head
      const neckBase = G(torso, [0, .45, 1.35]);
      const neck = chain(neckBase, 7, .33, .42, .22, scale, { each: (i, j, r) => P(j, new T.ConeGeometry(.06, .22, 4), scaleD, [0, .15, -r * .95], { rot: [-.4, 0, 0] }) });
      neck[0].rotation.x = .45; for (let i = 1; i < 7; i++) neck[i].rotation.x = .2;
      const hj = G(neck[6], [0, .33, 0]), head = G(hj, [0, 0, 0], [-Math.PI / 2 + .35, 0, 0]);
      // a long tapered skull: wide at the cheeks, narrowing to the nose
      P(head, A.ico(.3, 1), scale, [0, .04, .05], { scale: [1, .8, 1.1], jitter: .03 });
      P(head, A.cyl(.1, .21, .85, 4), scale, [0, .02, .55], { rot: [Math.PI / 2, Math.PI / 4, 0], scale: [1.15, 1, .75], jitter: .02 });
      P(head, A.box(.08, .06, .55), scaleD, [0, .14, .45], { rot: [-.12, 0, 0] });   // ridge along the nose
      for (const sx of [-1, 1]) {
        P(head, A.box(.13, .07, .32), scaleD, [sx * .14, .19, .22], { rot: [-.1, sx * .2, sx * -.35] });   // brow
        P(head, A.ico(.05, 0), glow('#ffb030', 3), [sx * .17, .13, .3], { cast: false });
        bone(head, [sx * .13, .2, -.08], [sx * .3, .5, -.8], .075, .012, horn);
        bone(head, [sx * .22, .03, -.08], [sx * .45, .0, -.5], .05, .01, horn);
        for (let k = 0; k < 5; k++) P(head, new T.ConeGeometry(.016, .07, 4), horn, [sx * (.13 - k * .015), -.08, .3 + k * .13], { rot: [Math.PI, 0, 0] });
      }
      const jaw = G(head, [0, -.1, .05]);
      P(jaw, A.cyl(.06, .15, .85, 4), scaleD, [0, -.02, .45], { rot: [Math.PI / 2, Math.PI / 4, 0], scale: [1.1, 1, .5], jitter: .02 });
      for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) P(jaw, new T.ConeGeometry(.015, .07, 4), horn, [sx * (.1 - k * .015), .04, .3 + k * .13]);
      const ember = glow('#ff6a1a', 2.5);
      P(jaw, A.box(.1, .03, .4), ember, [0, .02, .4], { cast: false });   // the glow in its throat, seen when it opens
      const nostrils = glow('#ff8a2a', 1.5);
      for (const sx of [-1, 1]) P(head, A.ico(.028, 0), nostrils, [sx * .05, .07, .96], { cast: false });
      const breath = new T.PointLight('#ff7a2a', 0, 5, 2); breath.position.set(0, -.05, .9); head.add(breath);
      const nose = G(head, [0, .07, .98]);
      // tail, hanging over the far side of the wall
      const tailBase = G(torso, [0, -.1, -1.3]);
      const tail = chain(tailBase, 12, .38, .36, .05, scale, { each: (i, j, r) => i % 2 || P(j, new T.ConeGeometry(.05, .16, 4), scaleD, [0, .15, r * .9], { rot: [.4, 0, 0] }) });
      tail[0].rotation.x = -2.0; for (let i = 1; i < 12; i++) tail[i].rotation.x = .1;
      P(tail[11], new T.ConeGeometry(.16, .45, 4), scaleD, [0, .5, 0], { scale: [1, 1, .3] });
      // wings, half raised
      const wings = [];
      for (const sx of [-1, 1]) {
        const w = G(g, [sx * .5, 1.55, .7]);
        const S = [0, 0, 0], E = [sx * 1.1, .9, -.3], W = [sx * 2.0, 1.9, -.2];
        const F = [[sx * 3.5, 2.5, -.7], [sx * 3.7, 1.3, -1.4], [sx * 3.0, .2, -2.0], [sx * 1.9, -.4, -2.1]];
        const mid = (a, b) => a.map((v, i) => (v + b[i]) / 2 * .78 + W[i] * .22);
        bone(w, S, E, .1, .07, scale); bone(w, E, W, .07, .05, scale);
        for (const f of F) bone(w, W, f, .05, .015, scaleD, 5);
        P(w, new T.ConeGeometry(.04, .2, 4), claw, W.map((v, i) => v + [0, .1, .05][i]), { rot: [0, 0, sx * -.5] });
        const pts = [S, E, W, ...F, mid(F[0], F[1]), mid(F[1], F[2]), mid(F[2], F[3]), [sx * .9, -.6, -1.6], [0, -.5, -1.3]];
        // 0 S, 1 E, 2 W, 3-6 F, 7-9 scallops, 10 trailing, 11 body
        sheet(w, pts, [[2, 3, 7], [2, 7, 4], [2, 4, 8], [2, 8, 5], [2, 5, 9], [2, 9, 6], [2, 6, 1], [1, 6, 10], [1, 10, 11], [1, 11, 0]], web);
        wings.push({ w, sx });
      }
      // smoke from the nostrils
      const smoke = Array.from({ length: 9 }, (_, i) => {
        const m = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: '#6a625c', transparent: true, opacity: .4, depthWrite: false }));
        m.userData.ph = i / 9; root.add(m); return m;
      });
      const at = new T.Vector3();
      return (t) => {
        const b = Math.sin(t * 1.1);
        torso.scale.set(1, 1 + .03 * b, 1 + .015 * b);
        for (let i = 0; i < 7; i++) neck[i].rotation.y = .1 * Math.sin(t * .45 + i * .35);
        neck[0].rotation.x = .45 + .06 * Math.sin(t * .3);
        const open = pulse(t, 9, 1.8);
        jaw.rotation.x = .04 + open * .5; breath.intensity = open * 14;
        ember.emissiveIntensity = 2 + open * 4; nostrils.emissiveIntensity = 1.2 + open * 4 + Math.sin(t * 3) * .3;
        for (let i = 0; i < 12; i++) tail[i].rotation.z = .12 * Math.sin(t * .7 - i * .45);
        const stretch = pulse(t + 4, 15, 4);
        for (const { w, sx } of wings) { w.rotation.z = sx * (-.1 + .07 * Math.sin(t * .6) - stretch * .55); w.rotation.y = sx * -stretch * .3; }
        nose.getWorldPosition(at);
        for (const s of smoke) {
          const k = (t * .25 + s.userData.ph) % 1;
          s.position.set(at.x + Math.sin(k * 9 + s.userData.ph * 20) * .25 * k, at.y + k * 1.8, at.z + k * .4);
          s.scale.setScalar(.25 + k * 1.4); s.material.opacity = .35 * (1 - k) * (open > .05 ? 1 : .4);
        }
      };
    },
  },

  // ================================================================ GLASSBEAK
  glassbeak: {
    name: 'The Glassbeak', hour: 13,
    blurb: 'Rare. A long-legged bird as tall as a man, like a heron, with a long beak of clear glass and bits of anything shiny worked into its feathers. It stalks the courtyard one slow step at a time, bobs its head, and darts. Rooken\'s glass is very shiny.',
    view: [[-6.9, 1.9, 4.6], [-10.6, 1.5, -.2]],
    knight: { place: 'courtyard', action: 'stand', emote: 'question', note: 'keeping his glass shards out of sight' },
    build(root) {
      const v = root.userData.appearance?.variant || {};
      const age = v.age || '', size = (v.size || 1) * (age === 'young' ? .7 : age === 'old' ? 1.08 : 1);
      const g = G(root, [-10.4, 0, .2]);
      const bird = G(g, [0, 0, 0]); bird.scale.setScalar(size);
      const young = age === 'young', old = age === 'old';
      // the young: a fledgling in grey down, big eyes, hardly a crest, a few trinkets, and a glass beak
      // already near full size, far too heavy for it: it totters, tips, and flaps to catch itself. The old: dull, greyed plumage, a crack down its glass beak, a ragged crest,
      // heavy with its hoard, slow.
      const plume = A.mat(young ? '#7d8597' : old ? '#5a5f6b' : '#465068', 0, .85), plumeL = A.mat(young ? '#a7adbb' : old ? '#a9aab0' : '#9aa2b4', 0, .8);
      const plumeD = A.mat('#262d3c', 0, .9), leg = A.mat('#8a7f5e', 0, .65), talon = A.mat('#16130f', .2, .5);
      const glass = new T.MeshStandardMaterial({ color: old ? '#c8d2d0' : '#d6f3f8', transparent: true, opacity: old ? .85 : .5, roughness: old ? .5 : .02, metalness: .2,
                                                 emissive: old ? '#5e7478' : '#58b6cc', emissiveIntensity: old ? .12 : .3, flatShading: true });   // the old's: clouded, like a bottle left in the sea
      const rnd = A.rand(11 + Math.abs(Math.round((v.hue || 0) * 1000)));
      // stilt legs: a feathered thigh, a long shin, the backward-bending ankle, long toes
      const legs = [];
      for (const sx of [-1, 1]) {
        const hip = G(bird, [sx * .16, 1.55, 0]);
        bone(hip, [0, 0, 0], [0, -.3, .06], .1, .07, plume);
        const knee = G(hip, [0, -.3, .06]);
        bone(knee, [0, 0, 0], [0, -.62, -.08], .035, .03, leg);
        const ankle = G(knee, [0, -.62, -.08]); P(ankle, A.ico(.04, 0), leg, [0, 0, 0]);
        bone(ankle, [0, 0, 0], [0, -.58, .06], .03, .026, leg);
        const foot = G(ankle, [0, -.6, .06]);
        for (const a of [-.5, 0, .5]) { const toe = G(foot, [0, 0, 0], [0, a, 0]); bone(toe, [0, 0, 0], [0, -.02, .26], .022, .014, leg, 4); P(toe, new T.ConeGeometry(.016, .08, 4), talon, [0, -.03, .29], { rot: [2.2, 0, 0] }); }
        bone(foot, [0, 0, 0], [0, -.02, -.14], .02, .012, leg, 4);
        legs.push({ hip, knee, ankle, foot, sx });
      }
      // body: slim, tilted, with wings folded long past the tail
      const body = G(bird, [0, 1.62, 0], [-.35, 0, 0]);
      P(body, A.ico(1, 2), plume, [0, 0, 0], { scale: [.24, .26, .6], jitter: .02 });
      P(body, A.ico(1, 1), plumeL, [0, -.09, .16], { scale: [.19, .19, .38], jitter: .02 });
      const wings = [];
      for (const sx of [-1, 1]) {
        const w = G(body, [sx * .2, .07, .1]);
        P(w, A.ico(1, 1), plume, [0, 0, -.15], { scale: [.08, .22, .5], jitter: .02 });
        const prim = [];
        for (let i = 0; i < 6; i++) { const f = G(w, [0, -.02 - i * .02, -.45], [.06 * i, sx * .02 * i, 0]); P(f, A.box(.025, .08, .7), i % 2 ? plumeD : plume, [0, 0, -.3]); prim.push(f); }
        wings.push({ w, sx, prim });
      }
      for (let i = 0; i < 5; i++) P(body, A.box(.07, .02, young ? .25 : .5), i % 2 ? plumeD : plume, [(i - 2) * .05, .02, young ? -.62 : -.75], { rot: [.1, (i - 2) * .07, 0] });
      if (young) for (let i = 0; i < 18; i++) P(body, A.ico(.05 + rnd() * .03, 0), plumeL, [(rnd() - .5) * .45, (rnd() - .3) * .45, (rnd() - .5) * 1.0], { cast: false });   // down
      // the neck: an S of segments, folded when resting, flung out to strike
      const neckBase = G(bird, [0, 1.84, .22]);
      const neck = chain(neckBase, 6, .16, .075, .05, plume, { sides: 6, jitter: .006 });
      const head = G(neck[5], [0, .16, 0]);
      P(head, A.ico(.1, 1), plume, [0, 0, 0], { scale: [.85, .9, 1.25] });
      P(head, A.ico(.07, 1), plumeL, [0, -.04, .04], { scale: [.8, .7, 1.2] });
      if (young) head.scale.setScalar(1.25);
      const eyeR = young ? .032 : .022;
      for (const sx of [-1, 1]) { P(head, A.ico(eyeR, 0), glow(old ? '#d8b44a' : '#ffcc33', old ? 1.1 : 1.8), [sx * .07, .03, .05], { cast: false }); P(head, A.ico(eyeR * .4, 0), A.mat('#050505'), [sx * .085, .032, .06], { cast: false }); }
      for (let i = 0; i < (young ? 1 : 5); i++)                             // a crest of long plumes (ragged when old)
        P(head, A.box(.012, .02, (young ? .12 : .32 + i * .04) * (old && i % 2 ? .55 : 1)), plumeD, [(i - 2) * .012, .07, -.2 - i * .03], { rot: [.35 + i * .06 + (old ? (rnd() - .5) * .5 : 0), old ? (rnd() - .5) * .6 : 0, 0] });
      const blen = young ? .42 : .55;                                     // the young: a beak already near full size, too heavy for it
      const beakUp = G(head, [0, .01, .08]), beakLo = G(head, [0, -.03, .08]);
      P(beakUp, new T.ConeGeometry(.045, blen, 5), glass, [0, 0, blen / 2], { rot: [Math.PI / 2, 0, 0], scale: [1, 1, .7], cast: false });
      P(beakLo, new T.ConeGeometry(.035, blen * .92, 5), glass, [0, 0, blen * .46], { rot: [Math.PI / 2, 0, 0], scale: [1, 1, .6], cast: false });
      if (old) for (const [y, z, rz] of [[.012, .45, .4], [-.004, .3, -.5], [.02, .62, .1]]) P(beakUp, A.box(.004, .05, blen * .35), A.mat('#2a3a40'), [.012, y, blen * z], { rot: [0, .05, rz], cast: false });   // cracks, long healed over
      // its collection, worked into its feathers; the old carry far more
      const sparkle = [0, 1, 2].map(() => new T.MeshStandardMaterial({ color: '#e6f0f4', metalness: 1, roughness: .08, emissive: '#ffffff', emissiveIntensity: 0, flatShading: true }));
      const tints = ['#d9a441', '#6fc28a', '#7fb6e8'].map(c => new T.MeshStandardMaterial({ color: c, transparent: true, opacity: .75, roughness: .05, metalness: .3, emissive: c, emissiveIntensity: .15, flatShading: true }));
      const bits = age === 'old' ? 40 : age === 'young' ? 6 : 22;
      for (let i = 0; i < bits; i++) {
        const a = rnd() * Math.PI * 2, z = (rnd() - .5) * 1.0;
        P(body, new T.TetrahedronGeometry(.03 + rnd() * .03), i % 4 === 3 ? tints[i % 3] : sparkle[i % 3],
          [Math.cos(a) * .23, Math.sin(a) * .24 + .03, z], { rot: [rnd() * 3, rnd() * 3, 0], cast: false });
      }
      const held = P(beakUp, new T.TetrahedronGeometry(.05), sparkle[0], [0, -.03, blen * .8], { cast: false });
      // how it moves: slow, deliberate steps; a pause; a bob of the head (its tell); a dart
      const pathAt = t => { const a = t * .03; return [-10.6 + Math.sin(a) * 1.2, .1 + Math.sin(a * 1.7) * (old ? .2 : .4)]; };   // the lane: clear of the buildings, the tree and him
      let yaw = 0, last = pathAt(0), stride = 0;
      return (t, dt) => {
        const C = old ? 26 : 14, W = old ? 6 : 9;                            // the old: a few steps, then still as a post for a long while
        const cycle = t % C, stalking = cycle < W;                           // walk a while, then stop to hunt
        const [x, z] = pathAt(t - Math.max(0, cycle - W) - Math.floor(t / C) * (C - W));
        const dx = x - last[0], dz = z - last[1]; last = [x, z];
        if (Math.hypot(dx, dz) > 1e-5) { let d = Math.atan2(dx, dz) - yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); yaw += d * Math.min(1, dt * 2); }
        if (!stalking) { const along = Math.sin(yaw) >= 0 ? Math.PI / 2 : -Math.PI / 2; let d = along - yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); yaw += d * Math.min(1, dt * 3); }   // it darts along the lane, never at a wall
        g.position.set(x, gy(x, z), z); g.rotation.y = yaw;
        if (stalking) stride += dt * (young ? 1.7 : old ? .8 : 1.2);
        legs.forEach(({ hip, knee, ankle }, i) => {
          const s = stalking ? Math.sin(stride * Math.PI + i * Math.PI) : 0, up = Math.max(0, s);
          hip.rotation.x = -s * .3; knee.rotation.x = up * .4; ankle.rotation.x = -up * .9;
        });
        bird.position.y = stalking ? Math.abs(Math.sin(stride * Math.PI)) * (young ? .07 : .03) : 0;   // the young bob along
        const totter = young ? pulse(t + 1.3, 6.5, 1.3) : 0, side = Math.floor((t + 1.3) / 6.5) % 2 ? 1 : -1;   // the young: the beak tips it over; it flaps to catch itself
        bird.rotation.z = young ? Math.sin(t * 1.9) * .07 + totter * .32 * side : 0;
        bird.rotation.x = young ? totter * .18 : old ? .16 : 0;              // the old: hunched forward
        // the neck: resting S; the bob; the dart
        const hunt = stalking ? 0 : cycle - W;
        const bob = hunt > .4 && hunt < 2.4 ? Math.sin((hunt - .4) * Math.PI * 3) * .5 + .5 : 0;
        const dart = hunt > 2.6 ? pulse(hunt - 2.6, 999, .7) : 0;            // one quick strike, then it straightens
        neck.forEach((j, i) => {
          const rest = (old ? [.75, .55, -1.0, -.95, .55, .1] : [.3, .3, -.5, -.5, .3, .1])[i];   // the S, head carried level (the old: drawn right in)
          j.rotation.x = rest * (1 - dart) + (i < 3 ? .6 : .1) * dart + (i === 4 ? bob * .25 : 0);
          j.rotation.y = Math.sin(t * .5 + i) * .03;
        });
        head.rotation.x = .5 * dart - bob * .15 + (young ? .3 + totter * .3 : old ? .12 : 0);   // the young's head drags down
        beakLo.rotation.x = hunt > 2.9 ? pulse(hunt - 2.9, 999, .4) * .25 : 0;  // snaps
        held.visible = !stalking && hunt > 3.2;                                // and comes up holding something
        for (const { w, sx, prim } of wings) { const open = Math.max(pulse(t + 4, 31, 2.5), totter * (.6 + .4 * Math.abs(Math.sin(t * 15)))); w.rotation.z = sx * open * .9; prim.forEach((f, i) => { f.rotation.y = sx * open * i * .12; }); }
        sparkle.forEach((m, i) => { m.emissiveIntensity = Math.pow(Math.max(0, Math.sin(t * (1.3 + i * .7) + i * 2)), 12) * 2.5; });
        glass.emissiveIntensity = .25 + Math.pow(Math.max(0, Math.sin(t * .9)), 20) * 1.2;   // the beak catches the light
      };
    },
  },

  // ================================================================ BASILISK
  basilisk: {
    name: 'The basilisk', hour: 13,
    blurb: 'Rare and dangerous. A long, low, six-legged reptile with a ridge of grey plates, basking on the warm stones, its eyes half-lidded. Before its gaze lands, the lids lift, slowly; where it looks, the grass goes grey and stiff. A crow and a fox in the courtyard did not look away in time.',
    view: [[-8.0, 2.6, 3.4], [-11.6, .4, .1]],
    knight: { place: 'courtyard', action: 'stand', emote: 'exclaim', note: 'very carefully not meeting its eyes' },
    build(root) {
      const v = root.userData.appearance?.variant || {};
      const young = v.age === 'young', old = v.age === 'old';
      // the young: a hatchling, stubby and speckled, all eyes, a cap of its own eggshell still on its head,
      // skittering in fits and starts by the broken egg; its gaze too weak to grey the grass. The old:
      // half turned to stone itself, from the tail up, moss on its back, its eyes shut; it barely moves,
      // and opens them seldom (the grass all round it has long gone grey).
      const size = (v.size || 1) * (young ? .5 : old ? 1.12 : 1);
      // it lies along the lane, head toward the doorway, and shifts a little forward and back (it never needs to turn)
      const g = G(root, [-10.0, 0, .1], [0, Math.PI / 2, 0]); const lizard = G(g); lizard.scale.setScalar(size);
      const hide = A.mat(young ? '#6f9a3c' : old ? '#5c5a38' : '#56664a', 0, .7), hideD = A.mat(young ? '#2f4a1c' : old ? '#3e3c26' : '#3a4632', 0, .75);
      const belly = A.mat(young ? '#c8c27a' : '#9c9a70', 0, .8);
      const plate = A.mat('#8e9088', .1, .6), frill = ds('#6a2c26', 0, .8), claw = A.mat('#1a1712', .2, .5);
      const lidM = A.mat('#46543a', 0, .7);
      const N = young ? 7 : 12, segs = [];
      const rock = A.M.stone, rockL = A.M.stoneL, mossM = A.mat('#56703a', 0, 1), speck = A.mat('#20301a', 0, .7), speckL = A.mat('#d8d080', 0, .7);
      const stoneFrom = 5;                                               // the old: stone from here back
      let parent = lizard;
      for (let i = 0; i < N; i++) {                                   // overlapping, so it reads as one long body
        const r = i < 4 ? .42 + i * .02 : .5 * (1 - (i - 3) / (N - 1)) + .06;
        const s = G(parent, [0, i ? 0 : .42, i ? -.42 : 0]);
        const stoned = old && i >= stoneFrom, part = stoned ? (i % 2 ? rock : rockL) : i % 3 ? hide : hideD;
        P(s, A.ico(1, 2), part, [0, 0, 0], { scale: [r * 1.15, r * .72, r * 1.25], jitter: stoned ? .05 : .015 });
        P(s, A.ico(1, 1), stoned ? rock : belly, [0, -r * .32, 0], { scale: [r * 1.05, r * .42, r * 1.15] });
        if (young) for (let k = 0; k < 6; k++) { const a = (k / 6 - .5) * 2.6; P(s, A.ico(r * .09, 0), k % 2 ? speck : speckL, [Math.sin(a) * r * 1.08, Math.cos(a) * r * .68, ((k * 37) % 10 / 10 - .5) * r], { cast: false }); }   // speckled
        if (old && i >= stoneFrom - 2) for (let k = 0; k < (i >= stoneFrom ? 3 : 1); k++) P(s, A.ico(r * .3, 1), mossM, [((k * 53) % 10 / 10 - .5) * r, r * .7, ((k * 31) % 10 / 10 - .5) * r], { scale: [1.3, .35, 1.1], cast: false });   // moss
        if (old && i === stoneFrom) for (let k = 0; k < 4; k++) P(s, A.box(.02, r * .5, .02), A.mat('#2a2a26'), [((k * 29) % 10 / 10 - .5) * r * 1.6, r * .2, .2 - k * .05], { rot: [0, 0, (k - 1.5) * .5], cast: false });   // where the stone creeps on: cracks
        if (!(old && i % 4 === 2)) P(s, A.box(r * .55, r * .12, r * .7), old && i >= stoneFrom ? rockL : plate, [0, r * .7, 0], { rot: [-.25, old ? (i % 3 - 1) * .2 : 0, old ? (i % 2 - .5) * .3 : 0], jitter: .02 });   // a grey plate on the ridge (cracked and missing, when old)
        if (old && i === 2) P(s, A.box(.03, .02, .7), A.mat('#2a2a24'), [r * .7, r * .4, 0], { rot: [0, .2, .4], cast: false });   // a scar
        segs.push({ s, r }); parent = s;
      }
      const legs = [];
      for (const i of [0, 2, 4]) for (const sx of [-1, 1]) {
        const { s, r } = segs[i], hip = G(s, [sx * r * 1.0, -r * .15, 0]);
        const lstone = old && i >= 4;
        bone(hip, [0, 0, 0], [sx * .38, .1, .08], .11, .085, lstone ? rock : hide);
        bone(hip, [sx * .38, .1, .08], [sx * .5, -.32, .14], .085, .06, lstone ? rockL : hideD);
        for (const a of [-.45, 0, .45]) P(hip, new T.ConeGeometry(.028, .15, 4), claw, [sx * .5 + Math.sin(a) * .09, -.37, .22 + Math.cos(a) * .05], { rot: [1.6, a, 0] });
        legs.push({ hip, sx, ph: i * .9 + (sx > 0 ? Math.PI : 0) });
      }
      // the head: low and wedge-shaped, heavy brows, half-lidded eyes
      const head = G(segs[0].s, [0, .04, .5]); if (young) head.scale.setScalar(1.35);   // the young: all head and eyes
      P(head, A.ico(1, 2), hide, [0, 0, .2], { scale: [.3, .16, .42], jitter: .01 });
      P(head, A.ico(1, 1), hideD, [0, -.02, .5], { scale: [.2, .1, .22] });
      const jaw = G(head, [0, -.09, .05]); P(jaw, A.ico(1, 1), belly, [0, -.02, .32], { scale: [.25, .06, .38] });
      const eyeMat = glow('#d8ff5a', 1.6);
      const lids = [];
      for (const sx of [-1, 1]) {
        const e = G(head, [sx * .2, .1, .3]);
        P(e, A.ico(young ? .075 : .055, 1), old && sx > 0 ? A.mat('#9a9a92', .1, .5) : eyeMat, [0, 0, 0], { cast: false });   // the old: one eye clouded
        P(e, A.box(.012, .07, .02), A.mat('#0a0a06'), [0, 0, .05], { cast: false });   // a slit pupil
        const lid = G(e, [0, 0, 0]); P(lid, new T.SphereGeometry(.065, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), lidM, [0, 0, 0], { cast: false, jitter: 0 });
        lids.push(lid);
        P(head, A.box(.16, .05, .14), plate, [sx * .19, .16, .3], { rot: [.15, 0, sx * -.3] });   // the brow
      }
      const crest = G(head, [0, .12, .02]);                             // a frill of bony spines with dull red skin between
      const tips = [];
      const fr = young ? .35 : 1;                                       // the young: hardly a frill yet
      for (let i = 0; i < 5; i++) { const a = -.9 + i * .45, tip = [Math.sin(a) * .42 * fr, (.32 + Math.cos(a) * .4 - .2 * Math.abs(Math.sin(a))) * fr, (-.25 - Math.cos(a) * .15) * fr]; bone(crest, [0, 0, 0], tip, .035, .01, plate, 5); tips.push(tip); }
      sheet(crest, [[0, 0, 0], ...tips], [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 5]], frill);
      const shellM = new T.MeshStandardMaterial({ color: '#e8e2cf', roughness: .6, side: T.DoubleSide, flatShading: true });
      if (young) { const cap = new T.Mesh(new T.SphereGeometry(.2, 9, 5, 0, Math.PI * 2, 0, 1.2), shellM); cap.position.set(0, .1, .12); cap.rotation.set(-.3, 0, .25); head.add(cap); }   // a cap of its own eggshell
      const tongue = G(head, [0, -.04, .7]);
      for (const sx of [-1, 1]) P(tongue, A.box(.02, .01, .2), A.mat('#8a2a3a'), [sx * .025, 0, .1], { rot: [0, sx * .25, 0], cast: false });
      const gazeMat = new T.MeshBasicMaterial({ color: '#d8ff5a', transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending });
      const gaze = new T.Mesh(new T.ConeGeometry(.9, 4, 12, 1, true), gazeMat); gaze.rotation.x = -Math.PI / 2; gaze.position.set(0, .1, 2.4); head.add(gaze);
      segs.forEach(({ s }) => merge(s)); merge(head);
      if (young) {                                                       // the egg it came from, broken in two beside the lane
        const egg = G(root, [-11.6, gy(-11.6, -.5), -.55]);
        for (const [x, rz, ry] of [[0, .4, 0], [.42, -1.9, 1.2]]) { const h = new T.Mesh(new T.SphereGeometry(.26, 10, 6, 0, Math.PI * 2, 0, 1.5), shellM); h.position.set(x, .18, 0); h.rotation.set(0, ry, rz); egg.add(h); }
      }
      // what it has looked at: a crow, a fox, patches of grass gone grey
      const stone = A.M.stoneL, stoneD = A.M.stone;
      const crow = G(root, [-8.7, 0, 1.25], [0, .6, 0]);
      P(crow, A.ico(.13, 0), stone, [0, .16, 0], { scale: [1, .9, 1.4] }); P(crow, A.ico(.08, 0), stone, [0, .28, .13]);
      P(crow, new T.ConeGeometry(.03, .1, 4), stoneD, [0, .27, .24], { rot: [Math.PI / 2, 0, 0] });
      for (const sx of [-1, 1]) P(crow, A.box(.02, .16, .2), stone, [sx * .11, .2, 0], { rot: [0, 0, sx * -.9] });
      const fox = G(root, [-15.6, 0, .8], [0, 1.0, 0]);
      P(fox, A.ico(.2, 1), stone, [0, .38, 0], { scale: [.85, .85, 1.7] }); P(fox, A.ico(.13, 1), stone, [0, .52, .38]);
      P(fox, new T.ConeGeometry(.07, .2, 4), stoneD, [0, .5, .55], { rot: [Math.PI / 2, 0, 0] });
      for (const sx of [-1, 1]) P(fox, new T.ConeGeometry(.04, .12, 4), stoneD, [sx * .07, .66, .36]);
      for (const [x, z, a] of [[-.1, .22, -.4], [.1, .25, .3], [-.1, -.22, .2], [.1, -.24, -.3]]) bone(fox, [x, .32, z], [x, .02, z + a * .2], .045, .035, stone);
      bone(fox, [0, .4, -.32], [0, .3, -.7], .07, .03, stone);
      merge(crow); merge(fox);
      const grey = A.mat('#8d8f88', 0, 1);
      const patches = Array.from({ length: 6 }, () => { const m = new T.Mesh(new T.CircleGeometry(.35, 8), grey); m.rotation.x = -Math.PI / 2; m.visible = false; root.add(m); return m; });
      if (old) for (let k = 0; k < 9; k++) {                             // the old: the grass all round it long gone grey
        const a = k / 9 * 6.28, d = 1.2 + (k % 3) * .5, x = -10 + Math.cos(a) * d * 1.6, z = .1 + Math.sin(a) * d * .5;
        const m = new T.Mesh(new T.CircleGeometry(.4 + (k % 2) * .2, 8), grey); m.rotation.x = -Math.PI / 2; m.position.set(x, gy(x, z) + .025, z); root.add(m); }
      let pi = 0, lastLook = -99;
      const hp = V(), dir = V();
      return (t) => {
        const u = young ? t - Math.sin(t * 2.6) / 2.6 : t;               // the young: in fits and starts
        const shift = old ? 0 : young ? Math.sin(u * .16) * 1.1 : Math.sin(t * .05) * .9;   // creeps forward and back along the lane (the old: hardly at all)
        g.position.x = -10.0 + shift;
        const crawl = old ? false : young ? Math.abs(Math.cos(u * .16)) * (1 - Math.cos(t * 2.6)) > .25 : Math.abs(Math.cos(t * .05)) > .3;
        for (let i = 1; i < N; i++) segs[i].s.rotation.y = old ? (i < stoneFrom ? Math.sin(t * .3 - i * .5) * .015 : 0) : Math.sin(t * (young ? 2.4 : .8) - i * .5) * .05 * (crawl ? 1 : .3);
        for (const l of legs) l.hip.rotation.x = crawl ? Math.sin(t * (young ? 5 : 1.6) + l.ph) * .3 : 0;
        head.rotation.y = Math.sin(t * (young ? .9 : old ? .08 : .2)) * (old ? .15 : .35); head.rotation.x = Math.sin(t * .23) * .05 - (young ? .15 : 0);
        // its tell: the lids lift, slowly, and only then does the gaze go out (the old: from shut, and seldom)
        const cyc = old ? 46 : 20, look = smooth(0, 3, (t % cyc) - (cyc - 8)) * (1 - smooth(5, 6.5, (t % cyc) - (cyc - 8)));
        lids.forEach(l => { l.rotation.x = old ? .8 - look * 2.0 : -.2 - look * 1.2; });
        gazeMat.opacity = look * (.05 + Math.sin(t * 2.3) * .015) * (young ? .35 : old ? 1.4 : 1);
        eyeMat.emissiveIntensity = (old ? .6 : 1) + look * (young ? .6 : 1.4);
        if (!young && look > .9 && t - lastLook > 4) {                 // where it looks, the grass goes grey (the young's gaze can't, yet)
          lastLook = t; head.getWorldPosition(hp); dir.set(0, 0, 1).applyQuaternion(head.getWorldQuaternion(new T.Quaternion()));
          const m = patches[pi++ % patches.length]; const d = 1.5 + (pi % 3) * .6;
          m.position.set(hp.x + dir.x * d, gy(hp.x + dir.x * d, hp.z + dir.z * d) + .03, hp.z + dir.z * d); m.visible = true;
        }
        const flick = pulse(t, 3.2, .45); tongue.scale.z = .2 + flick * 1.8; jaw.rotation.x = flick * .1;
      };
    },
  },

  // ================================================================ GOLEM
  golem: {
    name: 'The wall that woke', hour: 13,
    blurb: 'Uncommon. The fallen stones of the east wall, stood up and walking. Is it angry, or does it just want to help?',
    view: [[3.6, 2.1, 8.2], [7.3, 2.4, .9]],
    knight: { place: 'tower', action: 'gaze', emote: 'question', note: 'eye to eye with the stones that stood up' },
    build(root) {
      const g = G(root, [7.4, 0, 1.2], [0, -Math.PI / 2 + .75, 0]);
      const S = [A.M.stone, A.M.stoneL, A.M.stoneD], moss = A.M.grass, mossL = A.M.grassL;
      const seam = glow('#ffb347', 2.4);
      const blk = (p, size, pos, i, o = {}) => P(p, A.box(...size), S[i % 3], pos, { jitter: .06, seed: i, ...o });
      for (const sx of [-1, 1]) {
        blk(g, [.65, .25, .85], [sx * .5, .12, .12], 1);
        blk(g, [.5, .75, .55], [sx * .48, .62, .03], 2);
        blk(g, [.58, .8, .62], [sx * .45, 1.35, 0], 0);
      }
      blk(g, [1.25, .45, .72], [0, 1.85, 0], 1);
      // magma underneath: glowing seams between the stones, cracks down the legs, scorched ground
      for (const sx of [-1, 1]) {
        for (const y of [.25, .99, 1.76]) P(g, A.box(.46, .035, .5), seam, [sx * .47, y, .02], { cast: false, jitter: .01 });
        P(g, A.box(.03, .42, .02), seam, [sx * .44, .6, .31], { rot: [0, 0, sx * .25], cast: false });
        P(g, A.box(.03, .3, .02), seam, [sx * .52, 1.4, .32], { rot: [0, 0, -sx * .4], cast: false });
        P(g, A.box(.02, .25, .03), seam, [sx * .73, .55, .1], { rot: [.3, 0, 0], cast: false });
      }
      const scorch = new T.Mesh(new T.CircleGeometry(1.6, 12), A.mat('#1a1411', 0, 1)); scorch.rotation.x = -Math.PI / 2; scorch.position.y = .03; g.add(scorch);
      const er = A.rand(71);
      for (let i = 0; i < 12; i++) { const a = er() * 6.28, d = .6 + er() * .9; P(g, A.box(.05, .02, .12), seam, [Math.cos(a) * d, .04, Math.sin(a) * d], { rot: [0, a, 0], cast: false }); }
      const halo = (parent, pos, sc, col) => { const sp = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: col, transparent: true, opacity: .5,
        depthWrite: false, blending: T.AdditiveBlending, fog: false })); sp.position.set(...pos); sp.scale.setScalar(sc); parent.add(sp); return sp; };
      const heat = halo(g, [0, .4, .6], 2.2, '#ff7a2a');              // the heat of it, without a light of its own
      const EN = 36, ep = new Float32Array(EN * 3), eLife = Float32Array.from({ length: EN }, (_, i) => i / EN);
      const eFrom = Array.from({ length: EN }, (_, i) => [[-.47, .99], [.47, .99], [-.47, 1.76], [.47, 1.76], [-.47, .25], [.47, .25]][i % 6]);
      const eg = new T.BufferGeometry(); eg.setAttribute('position', new T.BufferAttribute(ep, 3));
      g.add(new T.Points(eg, new T.PointsMaterial({ color: '#ffb35a', size: .05, transparent: true, depthWrite: false })));
      const smoke = Array.from({ length: 4 }, (_, i) => {
        const s = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: '#3a3330', transparent: true, opacity: .3, depthWrite: false })); g.add(s); return { s, ph: i / 4 };
      });
      const torso = G(g, [0, 2.05, 0]);
      blk(torso, [1.45, .55, .82], [0, .3, 0], 0);
      blk(torso, [1.8, .7, .95], [0, .9, .02], 2);
      blk(torso, [.7, .35, .5], [-.45, 1.4, -.05], 1); blk(torso, [.75, .35, .5], [.42, 1.42, -.02], 0);
      P(torso, A.box(.05, .55, .02), seam, [-.1, .85, .49], { rot: [0, 0, .3], cast: false });
      P(torso, A.box(.05, .35, .02), seam, [.12, .62, .43], { rot: [0, 0, -.5], cast: false });
      P(torso, A.ico(.16, 0), seam, [0, .9, .43], { cast: false });
      const core = halo(torso, [0, .9, .8], 1.6, '#ff9a3a');
      for (const sx of [-1, 1]) {
        P(torso, A.box(.6, .1, .5), moss, [sx * .55, 1.6, 0], { jitter: .04 });
        for (let i = 0; i < 4; i++) P(torso, new T.ConeGeometry(.04, .25, 4), mossL, [sx * (.4 + i * .1), 1.75, (i % 2) * .2 - .1]);
      }
      const head = G(torso, [0, 1.6, .05]);
      blk(head, [.6, .5, .55], [0, .3, 0], 1);
      blk(head, [.82, .14, .32], [0, .52, .18], 2);
      const eyes = glow('#ffb347', 3);
      for (const sx of [-1, 1]) P(head, A.box(.12, .05, .02), eyes, [sx * .15, .38, .28], { cast: false });
      P(head, new T.ConeGeometry(.05, .3, 4), mossL, [.15, .75, -.1]); P(head, new T.ConeGeometry(.04, .22, 4), moss, [.05, .7, -.05]);
      const arms = [];
      for (const sx of [-1, 1]) {
        const sh = G(torso, [sx * 1.12, 1.15, 0]);
        blk(sh, [.55, .5, .55], [0, 0, 0], 2);
        blk(sh, [.48, .7, .5], [0, -.5, 0], 0);
        const el = G(sh, [0, -.85, 0]);
        blk(el, [.52, .72, .52], [0, -.36, 0], 1);
        const hand = G(el, [0, -.78, 0]);
        const r = A.rand(sx > 0 ? 5 : 9);
        for (let i = 0; i < 6; i++) P(hand, A.ico(.17 + r() * .1, 0), S[i % 3], [(r() - .5) * .35, -(r() * .25), (r() - .5) * .35], { jitter: .04 });
        arms.push({ sh, el, sx });
      }
      // stones drifting up to join it
      const floaters = [];
      const r = A.rand(3);
      for (let i = 0; i < 9; i++) {
        const m = P(root, A.ico(.08 + r() * .12, 0), S[i % 3], [0, 0, 0], { jitter: .03 });
        floaters.push({ m, a: r() * 6.28, rad: .5 + r() * .9, h: r(), sp: .3 + r() * .3 });
      }
      const handPos = new T.Vector3();
      return (t) => {
        const b = Math.sin(t * .9);
        torso.position.y = 2.05 + b * .03; torso.rotation.y = Math.sin(t * .25) * .12;
        head.rotation.y = Math.sin(t * .4) * .35; head.rotation.x = .05 + Math.sin(t * .31) * .05;
        const lift = .5 + .5 * Math.sin(t * .35);
        arms[0].sh.rotation.x = -.15 + Math.sin(t * .6) * .08;
        arms[1].sh.rotation.x = -.35 - lift * .9; arms[1].el.rotation.x = -.6 - lift * .5;
        arms[1].el.getWorldPosition(handPos);
        for (const f of floaters) {
          const k = (t * f.sp * .25 + f.h) % 1;
          const a = f.a + t * f.sp;
          f.m.position.set(handPos.x + Math.cos(a) * f.rad, .2 + k * (handPos.y - .2) + Math.sin(t * 2 + f.a) * .08, handPos.z + Math.sin(a) * f.rad);
          f.m.rotation.set(t * f.sp, t * .7, 0);
        }
        seam.emissiveIntensity = eyes.emissiveIntensity = 2.2 + Math.sin(t * 1.3) * .8; core.material.opacity = .4 + Math.sin(t * 1.3) * .15;
        heat.material.opacity = .42 + Math.sin(t * 1.3) * .12 + Math.sin(t * 7) * .04;
        for (let i = 0; i < EN; i++) {
          eLife[i] += .006 + (i % 4) * .0015; if (eLife[i] > 1) eLife[i] = 0;
          const k = eLife[i], [x, y] = eFrom[i];
          ep[i * 3] = x + Math.sin(i * 5.3 + k * 4) * .2; ep[i * 3 + 1] = y + k * 1.4; ep[i * 3 + 2] = .1 + Math.cos(i * 2.7) * .25;
        }
        eg.attributes.position.needsUpdate = true;
        for (const { s, ph } of smoke) { const k = (t * .12 + ph) % 1; s.position.set((ph - .5) * .9, 1.8 + k * 2.2, -.1); s.scale.setScalar(.6 + k * 1.6); s.material.opacity = .25 * (1 - k); }
      };
    },
  },

  // ================================================================ THE WELL
  well: {
    name: 'Something in the well', hour: 22,
    blurb: 'Rare. The old well goes down further than anyone thought. Some nights, something comes up to look.',
    view: [[-5.9, 2.2, 6.0], [-8.2, 1.9, 2.4]],
    knight: { place: 'repair:doorway', action: 'stand', emote: 'exclaim', note: 'watching the well from the doorway' },
    build(root) {
      const g = G(root, [-8.2, 0, 2.4]);
      const skin = A.mat('#4a3358', .1, .3, { emissive: '#1e1428', emissiveIntensity: .7 }), skinD = A.mat('#33233f', .1, .35, { emissive: '#170f1f', emissiveIntensity: .7 });   // wet, faintly sheened
      const sucker = A.mat('#d8b2c4', 0, .45, { emissive: '#3a2a32', emissiveIntensity: .5 });
      const water = glow('#2fd3c0', .9);
      const disc = new T.Mesh(new T.CircleGeometry(.44, 12), water); disc.rotation.x = -Math.PI / 2; disc.position.y = .55; g.add(disc);
      const lamp = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: '#3fe0c8', transparent: true, opacity: .45, depthWrite: false,
                                                      blending: T.AdditiveBlending, fog: false }));
      lamp.position.set(0, .8, 0); lamp.scale.setScalar(2.4); g.add(lamp);      // the water's glow, without a light of its own
      const specs = [   // where it rises, how it curls
        { at: [-.15, .2], yaw: -1.7, n: 10, len: .28, r: .2, base: .05, curl: .16, amp: .08 },   // tall, question-mark
        { at: [.2, .1], yaw: -2.4, n: 7, len: .26, r: .18, base: .9, curl: -.05, amp: .05, bend: [.35, .35, .3, .1] },   // over the rim, onto the grass (toward the west, away from him)
        { at: [.05, -.25], yaw: 3.8, n: 7, len: .22, r: .14, base: .8, curl: .38, amp: .05 },   // gripping the rim
        { at: [-.25, -.05], yaw: -2.6, n: 8, len: .24, r: .15, base: .25, curl: .12, amp: .12 },   // waving
      ];
      const arms = specs.map((sp, k) => {
        const base = G(g, [sp.at[0], .45, sp.at[1]], [0, sp.yaw, 0]);
        const j = chain(base, sp.n, sp.len, sp.r, .025, k % 2 ? skinD : skin, { sides: 6, each: (i, jt, ra) => {
          if (i > 0) for (const s of [-.5, .5]) P(jt, A.ico(ra * .32, 0), sucker, [s * ra * .6, sp.len * .5, ra * .85], { scale: [1, 1, .5], cast: false });
        } });
        return { j, sp, ph: k * 1.7 };
      });
      const eye = G(g, [.14, .62, .17]);
      P(eye, new T.SphereGeometry(.3, 16, 12), A.mat('#cfc8b6', 0, .2, { emissive: '#3a3730', emissiveIntensity: .45 }), [0, 0, 0], { jitter: 0 });   // pale and wet
      const iris = new T.Mesh(new T.SphereGeometry(.302, 16, 8, 0, Math.PI * 2, 0, .42), glow('#c98a2a', .7)); iris.rotation.x = Math.PI / 2; eye.add(iris);
      P(eye, A.box(.018, .2, .01), A.mat('#050405'), [0, 0, .3], { jitter: 0, cast: false });                       // a thin slit
      const camPos = new T.Vector3(), eyePos = new T.Vector3();
      return (t) => {
        for (const { j, sp, ph } of arms) j.forEach((jt, i) => {
          const bend = sp.bend ? (sp.bend[i] ?? .02) : sp.curl;
          jt.rotation.x = (i === 0 ? sp.base : bend) + Math.sin(t * .9 - i * .45 + ph) * sp.amp * (1 + i * .08);
          jt.rotation.z = Math.sin(t * .6 - i * .3 + ph * 2) * .05;
        });
        const rise = .5 + .5 * Math.sin(t * .3);
        eye.position.y = .5 + rise * .48;
        A.camera.getWorldPosition(camPos); eye.getWorldPosition(eyePos);
        eye.lookAt(camPos); eye.scale.y = 1 - pulse(t, 5.5, .25) * .9;
        water.emissiveIntensity = .7 + Math.sin(t * 1.7) * .25; lamp.material.opacity = .38 + Math.sin(t * 1.7) * .1;
      };
    },
  },

  // ================================================================ THE HILL THAT BREATHES
  hill: {
    name: 'The hill that breathes', hour: 13,
    blurb: 'Legendary. A long green hill rises on the plain south of the keep, trees and boulders on its back, and it was not there before. It breathes, so slowly you have to watch a while to be sure. Before it moves, a ripple runs through its grass. Once in a long while a fold in its side peels open, and an eye the size of a cottage looks at the keep.',
    view: [[-1.2, 2.5, -3.6], [2, 3.4, 19]],
    knight: { place: 'fire', action: 'stand', emote: 'dots', note: 'watching the hill rise and fall' },
    build(root) {
      // A sleeping giant that is a hill: a long lumpy back of turf (no face; only, now and then, one great
      // eye), a crest of half-buried boulders like the knuckles of a spine, trees growing on it, and a
      // forelimb of boulders resting on the plain with turf on its knuckles. It breathes (a long slow
      // swell). Its tell: before it moves, a ripple of paler grass runs over it from end to end. Then
      // it shifts its weight, the trees lean and birds go up out of them, a fold in its side peels open,
      // and an eye, old and wet and amber with a long sideways pupil, looks at the keep, slowly finds
      // whoever is watching, blinks once, and closes.
      const X = 2.5, Z = 22.5, Y = gy(X, Z) - 1.1;
      const g = G(root, [X, Y, Z], [0, .12, 0]), body = G(g);
      // the back: one lumpy faceted mound, coloured per vertex (so the ripple can run through it)
      const geo = new T.IcosahedronGeometry(1, 4).toNonIndexed(), pos = geo.attributes.position, nv = pos.count;
      const base = new Float32Array(nv * 3), cols = new Float32Array(nv * 3), lx = new Float32Array(nv), shade = new Float32Array(nv);
      const cA = new T.Color('#4c5d35'), cB = new T.Color('#3b4a2a'), cR = new T.Color('#5e5a4c');
      for (let i = 0; i < nv; i++) {
        let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const n = nz(Math.round(x * 9) * 7 + Math.round(y * 9) * 13 + Math.round(z * 9) * 29), bump = 1 + (n - .5) * .09 + Math.sin(x * 5) * .03;
        x *= 10.5 * bump; y = (y < 0 ? y * .3 : y) * 5.2 * bump; z *= 6.2 * bump;
        if (x < -6) y *= 1 - (-6 - x) * .05;                                  // a long low tail at the west end
        base.set([x, y, z], i * 3); lx[i] = x; shade[i] = n;
      }
      for (let f = 0; f < nv; f += 3) {                                       // a colour per face (faceted), rock where it is steep or high
        const yAvg = (base[f * 3 + 1] + base[f * 3 + 4] + base[f * 3 + 7]) / 3, n = shade[f], c = (yAvg > 4.3 && n > .55) ? cR : n > .5 ? cA : cB;
        for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (f + k) * 3);
      }
      const colA = new T.BufferAttribute(cols.slice(), 3); geo.setAttribute('color', colA);
      geo.attributes.position.array.set(base); geo.computeVertexNormals();
      const turf = new T.MeshStandardMaterial({ vertexColors: true, roughness: .95, flatShading: true });
      const back = new T.Mesh(geo, turf); back.castShadow = true; back.receiveShadow = true; body.add(back);
      // the crest: boulders half sunk along its spine; and stones and trees on its back
      const r = A.rand(21), rock = A.M.stone, rockL = A.M.stoneL, rockD = A.M.stoneD, stones = G(body);
      for (let i = 0; i < 11; i++) { const x = -7 + i * 1.45, h = 5.2 * Math.sqrt(Math.max(0, 1 - (x / 10.5) ** 2)); P(stones, A.ico(.55 + r() * .35, 0), i % 2 ? rock : rockL, [x, h - .15, (r() - .5) * .5], { scale: [1.2, .8, 1], rot: [r(), r(), r()], jitter: .12 }); }
      for (let i = 0; i < 8; i++) { const a = r() * 6.28, d = .35 + r() * .5, x = Math.cos(a) * 10 * d, z = Math.sin(a) * 5.6 * d; P(stones, A.box(.8 + r(), .5 + r() * .5, .7 + r()), i % 2 ? rock : rockD, [x, 5.2 * Math.sqrt(Math.max(0, 1 - d * d)) - .3, z], { rot: [r(), r(), r()], jitter: .1 }); }
      merge(stones);
      const leaf = A.mat('#2f4424', 0, 1), leafL = A.mat('#3d5530', 0, 1), trees = [];
      for (let i = 0; i < 13; i++) {
        const a = r() * 6.28, d = .3 + r() * .55, x = Math.cos(a) * 10.5 * d, z = Math.sin(a) * 6.2 * d, y = 5.2 * Math.sqrt(Math.max(0, 1 - d * d)) - .2;
        const tr = G(body, [x, y, z]), s = .8 + r() * .6; tr.scale.setScalar(s);
        P(tr, A.cyl(.08, .13, .9, 5), A.M.woodD, [0, .45, 0]); P(tr, new T.ConeGeometry(.6, 1.6, 6), leaf, [0, 1.4, 0]); P(tr, new T.ConeGeometry(.45, 1.2, 6), leafL, [0, 2.05, 0]);
        merge(tr); trees.push({ tr, ph: r() * 6 });
      }
      // the forelimb, resting on the plain in front (toward the keep): boulders for fingers, turf on the knuckles
      const hand = G(g, [5.2, 1.1, -6.6], [0, -.35, 0]), fingers = [];
      P(hand, A.ico(1.5, 1), rock, [0, .2, 1.2], { scale: [1.5, .7, 1.4], jitter: .18 });
      P(hand, A.box(2.6, .15, 2), A.mat('#4c5d35', 0, .95), [0, .78, 1.2], { rot: [.05, 0, 0], jitter: .1 });
      for (let f = 0; f < 4; f++) {
        const fg = G(hand, [-1.05 + f * .7, .2, -.1]), parts = [];
        for (let k = 0; k < 3; k++) { const kn = G(k ? parts[k - 1] : fg, k ? [0, 0, -.7] : [0, 0, 0]); P(kn, A.ico(.42 - k * .06, 0), k % 2 ? rockL : rock, [0, 0, -.32], { scale: [1, .8, 1.3], jitter: .06 }); parts.push(kn); }
        P(parts[0], A.box(.5, .08, .5), A.mat('#4c5d35', 0, .95), [0, .3, -.3], { jitter: .04 });
        fingers.push({ parts, ph: f * .7 });
      }
      // the eye: in a fold of its side facing the keep; a lid of turf peels up off it
      const eyeG = G(body, [-2.6, 2.2, -5.35], [0, Math.PI + .1, 0]);   // (facing out of its side, toward the keep)
      const socket = new T.Mesh(new T.SphereGeometry(1.35, 20, 12), A.mat('#1a1410', 0, .9)); socket.scale.set(1.5, .75, .5); eyeG.add(socket);
      const ball = G(eyeG, [0, 0, -.15]);                                    // (set back, so closed lids cover it whole)
      const irisT = canvasTex(512, 256, (c, w, h) => {                     // (laid round the ball: the iris is only the middle of it)
        const bg = c.createLinearGradient(0, 0, w, 0); bg.addColorStop(0, '#120c06'); bg.addColorStop(.5, '#3a2810'); bg.addColorStop(1, '#120c06');
        c.fillStyle = bg; c.fillRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2, rx = w * .14, ry = h * .26, gr = c.createRadialGradient(cx, cy, 4, cx, cy, rx);
        gr.addColorStop(0, '#e0ad50'); gr.addColorStop(.6, '#ad7a2e'); gr.addColorStop(.92, '#4a3010'); gr.addColorStop(1, 'rgba(26,18,8,0)');
        c.save(); c.translate(cx, cy); c.scale(1, ry / rx); c.translate(-cx, -cy); c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, rx, 0, 6.3); c.fill();
        const q = A.rand(4); c.filter = 'blur(1px)'; for (let i = 0; i < 140; i++) { const a = q() * 6.28; c.strokeStyle = q() < .5 ? 'rgba(255,220,150,.16)' : 'rgba(40,24,8,.28)'; c.beginPath(); c.moveTo(cx + Math.cos(a) * rx * .25, cy + Math.sin(a) * rx * .25); c.lineTo(cx + Math.cos(a) * rx * (.6 + q() * .3), cy + Math.sin(a) * rx * (.6 + q() * .3)); c.stroke(); }
        c.restore(); c.filter = 'none'; c.fillStyle = '#060402'; c.beginPath(); c.ellipse(cx, cy, rx * .62, ry * .13, 0, 0, 6.3); c.fill();   // a long sideways pupil
      });
      const eyeM = new T.MeshStandardMaterial({ map: irisT, roughness: .15, metalness: .1, emissive: '#ffffff', emissiveIntensity: .32, emissiveMap: irisT });   // (it catches light of its own, like a wet eye in shade)
      const orb = new T.Mesh(new T.SphereGeometry(1.15, 28, 18), eyeM); orb.rotation.y = -Math.PI / 2; orb.scale.set(.9, .95, 1.3); ball.add(orb);   // (the texture's middle faces out; turned, so its depth is x and its width z)
      const lidUp = G(eyeG, [0, .15, .1]), lidLo = G(eyeG, [0, -.1, .1]);
      const lidM = new T.MeshStandardMaterial({ color: '#46562f', roughness: .95, flatShading: true });
      P(lidUp, new T.SphereGeometry(1.45, 18, 8, 0, 6.283, 0, Math.PI / 2), lidM, [0, -.15, 0], { scale: [1.55, .9, .8], jitter: .06, cast: false });
      P(lidLo, new T.SphereGeometry(1.45, 18, 8, 0, 6.283, Math.PI / 2, Math.PI / 2), lidM, [0, .1, 0], { scale: [1.55, .7, .78], jitter: .06, cast: false });
      for (let k = 0; k < 7; k++) P(lidUp, new T.ConeGeometry(.07, .35, 4), leaf, [-1.6 + k * .5, .95, .3 + (k % 2) * .2], { cast: false });   // grass on the lid
      const eyeLight = softLight('#ffc46b', 0, 4.5); eyeLight.position.z = 1.2; eyeG.add(eyeLight);
      // dust falling when the lid tears open, and birds going up out of the trees when it moves
      const ND = 40, dA = new Float32Array(ND * 3), dG = new T.BufferGeometry(); dG.setAttribute('position', new T.BufferAttribute(dA, 3));
      const dust = new T.Points(dG, new T.PointsMaterial({ color: '#6a5a44', size: .09, transparent: true, opacity: 0, depthWrite: false })); dust.frustumCulled = false; eyeG.add(dust);
      const birdM = A.mat('#1e1b19', 0, .8), birds = Array.from({ length: 9 }, (_, i) => { const b = G(root); const w = [-1, 1].map(sx => { const wg = G(b, [sx * .05, 0, 0]); P(wg, A.box(.22, .01, .1), birdM, [sx * .11, 0, 0], { cast: false }); return wg; }); P(b, A.ico(.06, 0), birdM, [0, 0, 0], { scale: [.8, .7, 1.5], cast: false }); b.visible = false; return { b, w, tr: trees[i % trees.length].tr, dir: nz(i) * 6.28 }; });
      const cam = V(), loc = V(), inv = new T.Matrix4(), tmp = V();
      // (the preview shows its minute over and over; at the real keep it stays for hours, so it stirs only every
      // six or seven minutes, and each viewer comes in at a different point)
      const live = !!root.userData.appearance?.id, C = live ? 400 : 64, off = live ? Math.random() * C : 0;
      return (t, dt = 1 / 60) => {
        dt = Math.min(dt, .1);
        const k = (t + off) % C; root.userData.kt = k;                        // (for testing: where it is in its stirring)
        // breathing: a long slow swell
        const br = Math.sin(t * .52);
        // the tell: a ripple of paler grass runs over it, west to east; then it moves
        const wave = k > 6 && k < 13 ? -12 + (k - 6) / 7 * 24 : 99;
        const shift = smooth(12.5, 15, k) * (1 - smooth(48, 54, k));          // it shifts its weight, and stays so a while
        const heave = Math.sin(Math.min(1, Math.max(0, (k - 12.5) / 2.5)) * Math.PI);
        body.scale.set(1 + br * .01, 1 + br * .028 + heave * .03, 1 + br * .01); body.position.y = br * .1 + heave * .15;
        body.rotation.z = shift * .03 + heave * .015; body.rotation.x = -shift * .015;
        if (k > 6 && k < 14) {                                                 // (only touch the colours while the ripple runs, and once after, to settle)
          const ca = colA.array;
          for (let i = 0; i < nv; i++) { const d = Math.abs(lx[i] - wave), w = d < 1.6 ? (1 - d / 1.6) * .45 : 0; ca[i * 3] = cols[i * 3] * (1 + w); ca[i * 3 + 1] = cols[i * 3 + 1] * (1 + w * 1.1); ca[i * 3 + 2] = cols[i * 3 + 2] * (1 + w * .6); }
          colA.needsUpdate = true;
        }
        trees.forEach(({ tr, ph }) => { tr.rotation.z = Math.sin(t * .9 + ph) * .02 + heave * .12 * Math.sin(ph * 3); tr.rotation.x = heave * .08 * Math.cos(ph * 2); });
        fingers.forEach(({ parts, ph }) => parts.forEach((p, j) => { p.rotation.x = (j ? .12 : 0) + heave * .1 * (j + 1) * .5 + Math.sin(t * .2 + ph + j) * .01; }));
        // the eye: opens after it has moved, looks at the keep, then (slowly) at whoever is watching; blinks once; closes
        const open = smooth(17, 21, k) * (1 - smooth(41, 45, k)), blink = Math.max(0, 1 - Math.abs(k - 33) / .5);
        const lid = open * (1 - blink * .9);
        lidUp.rotation.x = -lid * 1.05; lidUp.position.y = .15 + lid * .35; lidLo.rotation.x = lid * .55;
        A.camera.getWorldPosition(cam); inv.copy(ball.parent.matrixWorld).invert(); loc.copy(cam).applyMatrix4(inv);
        const find = smooth(24, 30, k), toKeepY = -.15, toCamY = Math.atan2(loc.x, loc.z), toCamX = -Math.atan2(loc.y, Math.hypot(loc.x, loc.z));
        ball.rotation.y = (toKeepY * (1 - find) + Math.max(-.55, Math.min(.55, toCamY)) * find) + Math.sin(t * .3) * .03;
        ball.rotation.x = Math.max(-.3, Math.min(.3, toCamX)) * find;
        eyeLight.intensity = lid * 3;
        // dust from the tearing turf
        dust.material.opacity = smooth(17, 18, k) * (1 - smooth(22, 25, k)) * .9;
        for (let i = 0; i < ND; i++) { const q = ((k - 17) * .25 + nz(i)) % 1; dA.set([(nz(i + 3) - .5) * 3.6, .9 - q * 2.6, .6 + nz(i + 9) * .4], i * 3); }
        dG.attributes.position.needsUpdate = true;
        // birds: up out of the trees as it moves, away, and gone
        birds.forEach((b, i) => {
          const f = k - 12.8 - i * .12;
          b.b.visible = f > 0 && f < 9;
          if (b.b.visible) { b.tr.getWorldPosition(tmp); b.b.position.set(tmp.x + Math.cos(b.dir) * f * 2.2, tmp.y + 2.4 + f * 1.4, tmp.z + Math.sin(b.dir) * f * 2.2); b.b.rotation.y = -b.dir + Math.PI / 2; b.w.forEach((w, s) => { w.rotation.z = (s ? -1 : 1) * Math.sin(t * 22 + i) * .8; }); }
        });
      };
    },
  },

  // ================================================================ SKY WHALE
  whale: {
    name: 'The sky whale', hour: 22,
    blurb: 'Uncommon, and harmless. A vast, gentle thing that drifts over the keep on clear nights, lit with its own small stars in clusters like constellations, trailing star-dust and long glowing tendrils. Now and then it sings, a note you feel more than hear.',
    view: [[-3.5, 1.6, 17], [-3.5, 11, -2]],
    knight: { place: 'courtyard', action: 'gaze', emote: 'heart', note: 'watching the sky whale pass over' },
    build(root) {
      const v = root.userData.appearance?.variant || {};
      const young = v.age === 'young', old = v.age === 'old';
      // the young: a calf, never alone: it swims tucked in beside its mother, rolling and darting
      // ahead and back, piping little songs. The grown: one whale. The old: crusted pale like a
      // barnacled hull, scarred, a notched fluke, very slow, and trailing a long cloud of small lights
      // behind it like a wake of stars (they follow it; nobody knows what they are).
      const r = A.rand(77);
      const spots = new T.MeshBasicMaterial({ color: '#7ff0e6', fog: false });
      const finM = ds('#2b3c58', .05, .8), bellyM = A.mat('#6f7f96', 0, .8, { emissive: '#1a2333', emissiveIntensity: .5 });
      const pleatM = A.mat('#3b4a63', 0, .85, { emissive: '#141c2a', emissiveIntensity: .5 });
      const tMat = A.mat('#3a5a78', 0, .7, { emissive: '#1d4f6a', emissiveIntensity: .8 });
      const make = (big, age) => {
        const calf = age === 'young', aged = age === 'old';
        const g = G(root, [0, 15, 0], [0, -Math.PI / 2, 0]); g.scale.setScalar(big);
        const hide = A.mat(calf ? '#4a6a8a' : aged ? '#2a3442' : '#2c3d5a', .05, .75, { emissive: calf ? '#2a4a6a' : '#1a2c48', emissiveIntensity: 1 });
        const prof = [[0, -8], [1.2, -7], [2.2, -5], [2.6, -2.5], [2.5, 0], [2.1, 2.5], [1.5, 4.5], [.9, 6.4], [.5, 7.8], [.12, 8.6], [0, 8.7]]
          .map(([rr, y]) => new T.Vector2(rr, y));
        const body = new T.Mesh(A.facet(new T.LatheGeometry(prof, 18), .12, 3), hide);
        body.rotation.x = Math.PI / 2; body.scale.set(calf ? 1.2 : 1.1, calf ? .82 : 1, calf ? .78 : .85); g.add(body);   // the calf: round and short
        const still = G(g);
        if (aged) {
          for (let i = 0; i < 6; i++) P(still, A.box(.05, .04, 1.6 + i * .2), A.mat('#5a6474', 0, .9), [(i % 2 ? 1 : -1) * 2.1, .4 - i * .15, -2 + i * .9], { rot: [0, (i % 2 ? 1 : -1) * .2, .3], cast: false });   // old scars
          const crust = A.mat('#8a8f86', 0, .95), crustD = A.mat('#5e6660', 0, .95);   // crusted like an old hull
          for (let i = 0; i < 46; i++) { const z = -6 + r() * 12.5, a = r() * Math.PI * .9 + .1, rr = 2.5 * Math.sin(Math.PI * (z + 8) / 16.7) * 1.02;
            P(still, A.ico(.1 + r() * .16, 0), i % 3 ? crust : crustD, [Math.cos(a) * rr * 1.1, Math.sin(a) * rr * .85 - .1, z], { scale: [1, .5, 1], cast: false }); }
        }
        P(still, A.ico(1, 2), bellyM, [0, -1.1, -1], { scale: [1.9, .9, 6.5], jitter: .05 });
        for (let i = 0; i < 9; i++) P(still, A.box(.06, .05, 5.2), pleatM, [(i - 4) * .3, -1.72 + Math.abs(i - 4) * .1, 3.2], { cast: false, jitter: 0 });   // throat grooves
        merge(still);
        const spotMeshes = [];
        for (let c = 0; c < (calf ? 3 : aged ? 16 : 9); c++) {            // little constellations along its back and flanks
          const z0 = -6.5 + r() * 13, side = c % 2 ? 1 : -1, a0 = .3 + r() * .9;
          for (let i = 0; i < 4 + Math.floor(r() * 4); i++) {
            const z = z0 + (r() - .5) * 1.6, a = a0 + (r() - .5) * .35, rr = 2.5 * Math.sin(Math.PI * (z + 8) / 16.7) * 1.05;
            const m = new T.Mesh(A.ico(.06 + r() * .09, 0), spots); m.position.set(side * Math.cos(a) * rr * 1.1, Math.sin(a) * rr * .85 - .2, z); g.add(m);
            m.userData.ph = r() * 9; spotMeshes.push(m);
          }
        }
        const eyes = [];                                                  // a gentle eye: dark, with a soft teal ring
        for (const sx of [-1, 1]) {
          const e = G(g, [sx * 1.58, .05, 5.2], [0, sx * 1.35, 0]); if (calf) e.scale.setScalar(1.5);
          P(e, A.ico(.17, 1), A.mat('#05080d', .3, .1), [0, 0, 0], { cast: false, jitter: 0 });
          const ring = new T.Mesh(new T.TorusGeometry(.19, .025, 4, 14), new T.MeshBasicMaterial({ color: '#6fd8cf', fog: false })); e.add(ring);
          eyes.push(e);
        }
        const fins = [];
        for (const sx of [-1, 1]) {
          const f = G(g, [sx * 2.1, -.5, 2.2]); if (calf) f.scale.set(.75, 1, .8);
          sheet(f, [[0, 0, .8], [0, 0, -1.6], [sx * 5.5, -.3, -2.2], [sx * 6.8, -.4, -3.6], [sx * 3.0, -.2, -2.9]], [[0, 1, 2], [2, 3, 4], [1, 2, 4], [0, 2, 1]], finM);
          for (let i = 0; i < 4; i++) { const m = new T.Mesh(A.ico(.1, 0), spots); m.position.set(sx * (2 + i * 1.2), -.25, -1.4 - i * .5); f.add(m); }
          for (let i = 0; i < 6; i++) P(f, A.ico(.16, 0), hide, [sx * (.6 + i * 1.0), -.12, .45 - i * .52], { cast: false });   // the knobbled leading edge
          fins.push({ f, sx });
        }
        const fluke = G(g, [0, 0, -8]);
        sheet(fluke, [[0, 0, .6], [3.4, 0, -1.6], [1.2, 0, -.6], [0, 0, -.9], [-1.2, 0, -.6], [-3.4, 0, -1.6]], aged ? [[0, 1, 2], [0, 2, 3], [0, 3, 4]] : [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 5]], finM);   // a notch out of the old one's fluke
        const tendrils = [];
        for (let i = 0; i < (calf ? 4 : 7); i++) {
          const base = G(g, [(i % 2 ? 1 : -1) * (.4 + (i % 3) * .35), -1.7, -4 + i * 1.2], [Math.PI, 0, 0]);
          tendrils.push(chain(base, calf ? 3 : aged ? 11 : 9, .55, .07, .015, tMat, { sides: 5, jitter: .005 }));
        }
        return { g, fins, fluke, tendrils, spotMeshes, eyes };
      };
      const whales = young ? [make(1, ''), make(.36, 'young')] : [make((v.size || 1) * (old ? 1.18 : 1), old ? 'old' : '')];
      const lead = whales[0], calf = young ? whales[1] : null;
      // star-dust trailing behind; for the old, a whole cloud of small lights following in its wake
      const DN = old ? 260 : 70, dp = new Float32Array(DN * 3), dl = Float32Array.from({ length: DN }, (_, i) => i / DN), dr = Float32Array.from({ length: DN }, () => r());
      const dg = new T.BufferGeometry(); dg.setAttribute('position', new T.BufferAttribute(dp, 3));
      root.add(new T.Points(dg, new T.PointsMaterial({ color: old ? '#cffaf2' : '#9ff3ea', size: old ? .16 : .09, transparent: true, opacity: old ? .85 : .7, depthWrite: false, fog: false })));
      const songs = [0, 1, 2, 3].map(() => { const m = new T.Mesh(new T.TorusGeometry(1, .018, 3, 48), new T.MeshBasicMaterial({ color: '#8fe6dd', transparent: true, opacity: 0, depthWrite: false, fog: false })); root.add(m); return { m, born: -99, size: 12, dur: 5 }; });
      const tail = V(), head = V(), side = V(); let lastSong = -99, lastPeep = -99, si = 0;
      const sing = (w, t, size, dur) => { const sg = songs[si++ % songs.length]; sg.born = t; sg.size = size; sg.dur = dur; w.g.localToWorld(head.set(0, 0, 6.5)); sg.m.position.copy(head); };
      const swim = (w, t, beat) => {
        for (const { f, sx } of w.fins) f.rotation.z = sx * Math.sin(t * .7 * beat) * .28;
        w.fluke.rotation.x = Math.sin(t * .7 * beat - 1) * .3;
        w.tendrils.forEach((c, n) => c.forEach((j, i) => { j.rotation.x = Math.sin(t * .8 - i * .5 + n) * .08; j.rotation.z = Math.sin(t * .5 - i * .4 + n * 2) * .06; }));
        w.spotMeshes.forEach(m => m.scale.setScalar(.6 + .55 * Math.max(0, Math.sin(t * 1.2 - m.position.z * .5)) + .25 * Math.max(0, Math.sin(t * 3.1 + m.userData.ph))));
        w.eyes.forEach(e => { e.scale.y = (e.scale.x) * (1 - pulse(t + beat, 9, .35) * .85); });
      };
      return (t, dt = 1 / 60) => {
        const sp = old ? .36 : .55, at = u => [22 - (u * sp + 14) % 50, 15 + Math.sin(u * .2) * .5, -1 + Math.sin(u * .07) * 2];
        lead.g.position.set(...at(t));                                   // high enough that nothing it trails touches a roof
        lead.g.rotation.z = Math.sin(t * .3) * .05; lead.g.rotation.x = Math.sin(t * .23) * .03;
        swim(lead, t, old ? .6 : 1);
        if (calf) {                                                      // tucked in by its mother's flipper, wandering ahead and back, rolling
          const off = Math.sin(t * .19) * 2.2, roll = Math.sin(t * .41);
          calf.g.position.set(lead.g.position.x - 1.2 - off, lead.g.position.y - 2.0 + Math.sin(t * .9) * .25, lead.g.position.z + 4.3 + Math.sin(t * .3) * .4);
          calf.g.rotation.z = roll * .45; calf.g.rotation.x = Math.sin(t * .6) * .06;
          swim(calf, t * 1.7, 1.7);
          if (t - lastPeep > 4 + (Math.floor(t / 7) % 3) * 2) { lastPeep = t; sing(calf, t, 3, 2.5); }   // little songs, often
        }
        lead.fluke.getWorldPosition(tail);
        if (old) {
          // a cloud of lights in its wake: each follows the way it came, a little behind, spreading as it falls back
          const fl = 8 * lead.g.scale.x;
          for (let i = 0; i < DN; i++) {
            const back = dr[i] * dr[i] * 45, [qx, qy, qz] = at(t - back), spread = .5 + back * .09;
            dp[i * 3] = qx + fl + Math.sin(t * (.6 + dr[i]) + i * 1.7) * spread; dp[i * 3 + 1] = qy + Math.cos(t * (.5 + dr[i]) + i * 2.3) * spread * .6 - back * .02;
            dp[i * 3 + 2] = qz + Math.sin(t * (.4 + dr[i] * .7) + i * 3.1) * spread;
          }
        } else {
          for (let i = 0; i < DN; i++) {
            dl[i] += dt * .25; if (dl[i] > 1) { dl[i] = 0; dp[i * 3] = tail.x + Math.sin(i * 3.7) * .8; dp[i * 3 + 1] = tail.y + Math.cos(i * 2.3) * .6; dp[i * 3 + 2] = tail.z + Math.sin(i * 1.3) * .8; }
            dp[i * 3 + 1] -= dt * .25;                                  // drifting slowly down
          }
        }
        dg.attributes.position.needsUpdate = true;
        if (t - lastSong > (old ? 20 : 12) + (Math.floor(t / 12) % 3) * 4) { lastSong = t; sing(lead, t, old ? 18 : 12, old ? 8 : 5); }   // the old sing rarely, and deep
        for (const sg of songs) { const q = (t - sg.born) / sg.dur; sg.m.visible = q < 1; if (q < 1) { sg.m.scale.setScalar(1 + q * sg.size); sg.m.material.opacity = .28 * (1 - q) * (1 - q); sg.m.lookAt(A.camera.position); } }
      };
    },
  },

  // ================================================================ DEEP WYRM
  wyrm: {
    name: 'The deep wyrm', hour: 13,
    blurb: 'Rare. Something long and eyeless burrows beneath the keep. Where it surfaces, the courtyard falls in.',
    view: [[-4.2, 3.0, 6.0], [-9.7, 2.6, -.1]],
    knight: { place: 'courtyard', action: 'stand', emote: 'exclaim', note: 'backing toward the doorway' },
    build(root) {
      const v = root.userData.appearance?.variant || {}, young = v.age === 'young', old = v.age === 'old';
      // the young: three young worms, pale and soft, each out of its own hole in the lane, rising and
      // ducking back in turn like a game. The grown: one wyrm rearing out of the ground. The old: a vast
      // column standing straight up out of the earth, crusted with stone, roots hanging off it, many
      // rings of teeth (some broken), hardly moving at all.
      const hide = A.mat(young ? '#b8a68e' : old ? '#5a4c3c' : '#7c6c55', 0, .8), band = A.mat(young ? '#8a7a64' : old ? '#352c22' : '#4d4235', 0, .85);
      const bone_ = A.mat(old ? '#c9b994' : '#e0d6bd', 0, .6), dark = A.mat('#0b0806', 0, 1), rootM = A.mat('#3a2c1e', 0, .9);
      const r = A.rand(5);
      const throat = glow('#ff3a18', 1.2);
      const worm = (hx, hz, big, n, ringsN) => {
        const holeR = (old ? 1.15 : 1.0) * Math.min(1, big * 1.2 + .25);
        const hole = new T.Mesh(new T.CircleGeometry(holeR, 14), dark); hole.rotation.x = -Math.PI / 2; hole.position.set(hx, .035, hz); root.add(hole);
        for (let i = 0; i < (young ? 8 : 16); i++) {
          const a = i / (young ? 8 : 16) * 6.28, d = holeR * (.98 + r() * .18), k = young ? .55 : 1;
          P(root, A.box((.45 + r() * .3) * k, (.2 + r() * .25) * k, (.35 + r() * .3) * k), i % 3 ? A.M.dirt : A.M.stone, [hx + Math.cos(a) * d, .08 * k, hz + Math.sin(a) * d], { rot: [r() - .5, a, (r() - .5) * .9], jitter: .06 });
        }
        const base = G(root, [hx, -.6, hz], [0, Math.PI, 0]); base.scale.setScalar(big);   // rearing up, leaning down the lane, away from him and the tree
        const segs = chain(base, n, .58, .95, .78, hide, { sides: 9, jitter: .04, each: (i, j, ra) => {
          P(j, A.cyl(ra * 1.07, ra * 1.07, .14, 9), band, [0, .05, 0], { jitter: .02 });
          for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28; P(j, A.box(.18, .3, .1), band, [Math.cos(a) * ra * 1.02, .3, Math.sin(a) * ra * 1.02], { rot: [0, -a, 0] }); }
          if (old && i < n - 1) {                                       // crusted with stone, roots trailing off it
            for (let k = 0; k < 4; k++) { const a = i * 2.1 + k * 1.7; P(j, A.ico(.16 + r() * .14, 0), k % 2 ? A.M.stone : A.M.stoneL, [Math.cos(a) * ra * .97, .1 + r() * .4, Math.sin(a) * ra * .97], { scale: [1, .8, .6], cast: false }); }
            if (i % 2 === 0) for (let k = 0; k < 2; k++) { const a = i * 1.3 + k * 3.1; bone(j, [Math.cos(a) * ra, .4, Math.sin(a) * ra], [Math.cos(a) * (ra + .22), -.35 - r() * .4, Math.sin(a) * (ra + .22)], .035, .01, rootM, 4); }
          }
          if (old && i === 3) P(j, A.box(.04, .5, .03), A.mat('#2a2018'), [ra * .98, .3, 0], { rot: [0, 0, .5], cast: false });   // a long scar
        } });
        // the last segment is a hollow ring (its cap and joint ball would close the mouth)
        const L = n - 1;
        segs[L].remove(segs[L].children[1]); segs[L].remove(segs[L].children[0]); segs[L - 1].remove(segs[L - 1].children[1]);
        P(segs[L], new T.CylinderGeometry(.79, .8, .62, 9, 1, true), A.mat(young ? '#b8a68e' : '#7c6c55', 0, .8, { side: T.DoubleSide }), [0, .3, 0], { jitter: .03 });
        const mouth = G(segs[L], [0, .66, 0]);
        P(mouth, new T.CylinderGeometry(.95, .8, .3, 10, 1, true), ds(young ? '#8a7a64' : '#4d4235'), [0, 0, 0], { jitter: .04 });
        // a gullet going down into the dark, with a dim glow at the bottom
        const gullet = new T.Mesh(A.facet(new T.CylinderGeometry(.66, .1, .62, 12, 3, true), .03, 4), A.mat('#5a1410', 0, .85, { side: T.BackSide }));
        gullet.position.y = -.33; mouth.add(gullet);
        const tc = new T.Mesh(new T.CircleGeometry(.13, 8), throat); tc.rotation.x = -Math.PI / 2; tc.position.y = -.63; mouth.add(tc);
        const rings = [];
        for (let ring = 0; ring < ringsN; ring++) {
          const rg = G(mouth, [0, .1 - ring * .08, 0]); rings.push(rg);
          const nn = 12 - ring * 2, rad = .78 - ring * .16;
          for (let k = 0; k < nn; k++) { const a = k / nn * 6.28; if (old && (k * 7 + ring) % 5 === 0) continue;   // a few broken out
            P(rg, new T.ConeGeometry(Math.max(.02, .06 - ring * .01) * (young ? .7 : 1), Math.max(.1, .3 - ring * .06) * (young ? .6 : 1), 4), bone_, [Math.cos(a) * rad, .1, Math.sin(a) * rad], { rot: [Math.sin(a) * -.35, 0, Math.cos(a) * .35] }); }
        }
        for (let k = 0; k < 14; k++) { const a = k / 14 * 6.28; P(mouth, new T.ConeGeometry(.02, .35, 3), band, [Math.cos(a) * .98, .2, Math.sin(a) * .98], { rot: [Math.sin(a) * .5, 0, -Math.cos(a) * .5], cast: false }); }
        return { base, segs, rings };
      };
      const worms = young ? [[-9.6, -.2, 0], [-11.5, .55, 2.4], [-12.9, -.35, 4.9]].map(([x, z, ph]) => ({ ...worm(x, z, .3, 6, 1), ph }))
        : [{ ...worm(-9.7, .15, (v.size || 1) * (old ? 1.25 : 1), old ? 11 : 9, old ? 5 : 3), ph: 0 }];
      if (!young) {
        // another coil, breaking the ground outside the north wall
        const arch = new T.Mesh(A.facet(new T.TorusGeometry(2.3, .8, 8, 14, Math.PI), .05, 2), hide);
        arch.position.set(-11.5, -.25, -7.8); arch.rotation.y = .3; arch.castShadow = true; root.add(arch);
        for (let i = 0; i < 7; i++) { const a = .2 + i / 6 * (Math.PI - .4); const b = new T.Mesh(A.facet(new T.TorusGeometry(.86, .1, 5, 10), .02, i), band); b.position.set(Math.cos(a) * 2.3, Math.sin(a) * 2.3, 0); b.rotation.set(0, Math.PI / 2, 0); b.lookAt(0, 0, 0); b.rotateY(Math.PI / 2); arch.add(b); }
        for (let i = 0; i < 10; i++) P(root, A.box(.4 + r() * .4, .25, .4), A.M.dirt, [-11.5 + (i < 5 ? -2.3 : 2.3) * Math.cos(.3) + (r() - .5) * 1.4, .1, -7.8 + (i < 5 ? 2.3 : -2.3) * Math.sin(.3) * .5 + (r() - .5) * 1.4], { rot: [r(), r(), r()] });
      }
      const crumbs = Array.from({ length: 10 }, (_, i) => ({ m: P(root, A.box(.08, .08, .08), A.M.dirt, [0, 0, 0], { cast: false }), ph: i / 10 }));
      const tip = new T.Vector3();
      return (t) => {
        const sway = Math.sin(t * (old ? .15 : .4));
        for (const w of worms) {
          if (young) {                                                  // up, a look round, and down again, each in turn
            const k = ((t + w.ph) % 7.5) / 7.5, up = smooth(0, .12, k) * (1 - smooth(.5, .62, k));
            w.base.position.y = -2.1 + up * 1.75 + Math.sin(t * 3 + w.ph) * .03 * up;
            w.segs.forEach((j, i) => { j.rotation.z = (i === 0 ? .05 : -.09) * up + Math.sin(t * 1.3 + w.ph + i) * .06 * up; j.rotation.x = Math.sin(t * 1.1 - i * .5 + w.ph) * .08 * up; });
            w.base.rotation.y = Math.PI + Math.sin(t * .7 + w.ph) * 1.2;
          } else {
            w.base.position.y = old ? -.7 + .06 * Math.sin(t * .1) : -.75 + .25 * (.5 + .5 * Math.sin(t * .23));
            w.segs.forEach((j, i) => { j.rotation.z = (old ? (i === 0 ? .02 : -.012) : (i === 0 ? .05 : -.07)) + sway * (old ? .008 : .025); j.rotation.x = Math.sin(t * (old ? .2 : .5) - i * .4) * (old ? .01 : .035); });
          }
          w.rings.forEach((rg, i) => { rg.rotation.y = t * (i % 2 ? -.4 : .3) * (old ? .4 : 1); });
        }
        throat.emissiveIntensity = 1 + Math.sin(t * 1.6) * .5;
        worms[0].segs[Math.min(5, worms[0].segs.length - 1)].getWorldPosition(tip);
        for (const c of crumbs) {
          const k = (t * .5 + c.ph) % 1;
          c.m.position.set(tip.x + Math.sin(c.ph * 40) * .9 * (young ? .4 : 1), tip.y * (1 - k * k), tip.z + Math.cos(c.ph * 40) * .9 * (young ? .4 : 1));
          c.m.rotation.set(t * 3, t * 2, 0); c.m.visible = tip.y * (1 - k * k) > .1;
        }
      };
    },
  },

  // ================================================================ LAMP-EATERS
  moths: {
    name: 'The lamp-eaters', hour: 22,
    blurb: 'Uncommon. Moths that eat light. They gather around the fire until it gutters, and glow with what they have taken. Their mother is the size of a shield.',
    view: [[2.7, 1.6, 3.6], [-.5, 2.0, -1.8]],
    knight: { place: 'fire', action: 'sit', emote: 'question', note: 'watching the fire go thin' },
    build(root) {
      const wingTex = canvasTex(256, 128, (c, w, h) => {
        c.clearRect(0, 0, w, h);
        for (const sx of [-1, 1]) {
          c.save(); c.translate(w / 2, h / 2); c.scale(sx, 1);
          c.fillStyle = '#d8ccb0'; c.beginPath(); c.ellipse(52, -14, 58, 34, -.35, 0, 6.3); c.fill();
          c.fillStyle = '#c4b490'; c.beginPath(); c.ellipse(40, 26, 38, 26, .4, 0, 6.3); c.fill();
          c.strokeStyle = 'rgba(90,70,50,.6)'; c.lineWidth = 2;
          for (const a of [-.9, -.5, -.1, .3]) { c.beginPath(); c.moveTo(6, 0); c.lineTo(Math.cos(a) * 100, Math.sin(a) * 50); c.stroke(); }
          for (const [rr, col] of [[17, '#3b2a1e'], [14, '#c98a3e'], [10, '#7a4a26'], [6, '#2a1d15']]) {   // an eyespot: rings, not an eye
            c.fillStyle = col; c.beginPath(); c.ellipse(62, -16, rr, rr * .82, -.3, 0, 6.3); c.fill();
          }
          c.restore();
        }
        c.fillStyle = '#3a2c22'; c.beginPath(); c.ellipse(w / 2, h / 2 + 4, 7, 40, 0, 0, 6.3); c.fill();
      });
      const mothMat = new T.MeshStandardMaterial({ map: wingTex, emissiveMap: wingTex, emissive: '#ffd08a', emissiveIntensity: .6,
                                                   transparent: true, alphaTest: .4, side: T.DoubleSide, roughness: .9 });
      const geo = new T.PlaneGeometry(.2, .1); geo.rotateX(-Math.PI / 2);
      const N = Math.round(90 * ((root.userData.appearance?.variant || {}).size || 1)), swarm = new T.InstancedMesh(geo, mothMat, N); swarm.frustumCulled = false; root.add(swarm);
      const seeds = Array.from({ length: N }, (_, i) => { const r = A.rand(i * 7 + 3); return { a: r() * 6.28, rad: .5 + r() * 1.7, sp: .7 + r() * .9, h: r(), fl: r() * 6.28 }; });
      const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(), p = new T.Vector3();
      // the great moth, on the wall by the window
      const big = G(root, [-.9, 2.75, -3.9], [0, 0, .22]); big.scale.setScalar(1.7);   // flat on the wall, wings spread
      const fur = A.mat('#5a4636', 0, 1), furL = A.mat('#8a7458', 0, 1);
      for (let i = 0; i < 5; i++) P(big, A.ico(.09 - i * .008, 1), i % 2 ? furL : fur, [0, .12 - i * .1, 0], { scale: [1, 1.2, .9] });
      for (const sx of [-1, 1]) {
        P(big, A.ico(.03, 0), A.mat('#1a120c', .3, .3, { emissive: '#4a3418', emissiveIntensity: .6 }), [sx * .05, .2, .05], { cast: false });
        const ant = G(big, [sx * .03, .24, .02], [0, 0, sx * -.5]);
        bone(ant, [0, 0, 0], [0, .3, .05], .012, .006, fur, 4);
        for (let k = 0; k < 6; k++) bone(ant, [0, .05 + k * .045, .01], [sx * .06, .08 + k * .045, .03], .004, .002, furL, 3);
      }
      const bigMat = mothMat.clone(); bigMat.emissiveIntensity = .35;
      const wings = [];
      for (const sx of [-1, 1]) {
        const w = G(big, [0, .02, 0]);
        const plane = new T.PlaneGeometry(.66, .66);
        const uv = plane.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, sx > 0 ? .5 + uv.getX(i) * .5 : uv.getX(i) * .5);
        const m = new T.Mesh(plane, bigMat); m.position.x = sx * .33; m.castShadow = true; w.add(m);
        wings.push({ w, sx });
      }
      return (t) => {
        for (let i = 0; i < N; i++) {
          const sd = seeds[i], k = (t * .06 * sd.sp + sd.h) % 1;
          const a = sd.a + t * sd.sp * (1.2 - k * .5), rad = sd.rad * (1 - k * .45) + .15;
          p.set(Math.cos(a) * rad, .45 + k * 4.2 + Math.sin(t * 3 + sd.fl) * .08, Math.sin(a) * rad);
          e.set(Math.sin(t * 5 + sd.fl) * .4, -a, Math.sin(t * 4 + sd.fl) * .3); q.setFromEuler(e);
          const flap = .25 + .75 * Math.abs(Math.sin(t * 22 + sd.fl));
          s.set(flap, 1, 1).multiplyScalar(.8 + (i % 5) * .1);
          m4.compose(p, q, s); swarm.setMatrixAt(i, m4);
        }
        swarm.instanceMatrix.needsUpdate = true;
        const eat = .55 + .45 * Math.sin(t * .25);
        A.setFireDim(.75 - eat * .5); mothMat.emissiveIntensity = .35 + eat * .7;
        const open = .5 + .5 * Math.sin(t * .7);
        for (const { w, sx } of wings) w.rotation.y = -sx * (1 - open) * 1.25;
      };
    },
    exit() { A.setFireDim(1); },
  },

  // ================================================================ BARROW LORD
  barrow: {
    name: 'The barrow lord', hour: 22,
    blurb: 'Rare. Something in old armour climbs out of a grave mound beyond the west wall, on nights when the mist is thick. A knight facing a knight long dead.',
    view: [[-12.4, 2.0, 2.8], [-20.3, 2.0, -.3]],
    knight: { place: 'raise:3', action: 'stand', emote: 'exclaim', note: 'hand on his rusty dagger' },
    build(root) {
      const g = G(root, [-20.4, gy(-20.4, -.9), -.9], [0, Math.PI / 2, 0]);   // at the foot of the real mound, facing the keep
      const iron = A.mat('#4a423b', .55, .65, { emissive: '#1b2b28', emissiveIntensity: .55 }), rust = A.mat('#6b4632', .3, .8, { emissive: '#1d1a14', emissiveIntensity: .4 }), dark = A.mat('#2a2724', .5, .7);   // a faint, cold sheen
      const cloth = ds('#1f1b19', 0, 1), bonec = A.mat('#cfc6ad', 0, .7), eyeMat = glow('#9ff0dc', 3, { fog: false });
      // (the mound and its standing stones are part of the land now; it climbs out of the real one)
      for (const [x, z, a] of [[-21.0, 1.6, .3], [-19.6, -2.6, -.2], [-19.4, 1.9, .5]]) {   // old swords in the grass
        const s = G(root, [x, gy(x, z), z], [a, a * 2, a * .5]);
        P(s, A.box(.06, .9, .02), iron, [0, .3, 0]); P(s, A.box(.28, .04, .06), dark, [0, .76, 0]);
      }
      const shield = G(root, [-18.6, .4, 2.3], [-.4, .8, 0]);
      P(shield, A.cyl(.32, .32, .05, 9), rust, [0, 0, 0], { rot: [Math.PI / 2, 0, 0] });
      for (const sx of [-1, 1]) {
        P(g, A.box(.26, .15, .44), dark, [sx * .27, .07, .08]);
        P(g, A.cyl(.17, .2, .9, 7), iron, [sx * .27, .55, 0]);
        P(g, A.ico(.15, 0), rust, [sx * .27, 1.02, .05]);
        P(g, A.cyl(.22, .19, .72, 7), iron, [sx * .27, 1.38, 0]);
      }
      P(g, A.cyl(.44, .52, .5, 8), rust, [0, 1.72, 0]);
      for (let i = 0; i < 5; i++) P(g, A.box(.2, .45, .04), i % 2 ? dark : iron, [(i - 2) * .17, 1.55, .5 - Math.abs(i - 2) * .05], { rot: [.1, (i - 2) * -.2, 0] });
      const chest = G(g, [0, 2.3, 0]);
      P(chest, A.cyl(.56, .44, .85, 8), iron, [0, 0, 0], { scale: [1, 1, .72] });
      P(chest, A.ico(.42, 1), rust, [0, .1, .16], { scale: [1.1, 1, .6] });
      for (let i = 0; i < 4; i++) P(chest, A.box(.04, .18, .02), A.mat('#120f0d'), [(i - 1.5) * .18, -.05 + (i % 2) * .15, .43], { rot: [0, 0, .5], cast: false });
      for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) P(chest, A.ico(.32 - k * .04, 1), k % 2 ? rust : iron, [sx * (.6 + k * .05), .35 - k * .14, 0], { scale: [1.1, .55, 1] });
      P(chest, A.cyl(.26, .3, .22, 8), dark, [0, .5, 0]);
      const head = G(chest, [0, .78, 0]);
      P(head, A.cyl(.23, .26, .48, 8), iron, [0, 0, 0]);
      P(head, new T.ConeGeometry(.24, .2, 8), dark, [0, .34, 0]);
      for (let i = 0; i < 7; i++) P(head, new T.ConeGeometry(.04, .18 + (i % 3) * .1, 4), bonec, [0, .4 + (i % 3) * .02, -.24 + i * .08], { rot: [(i - 3) * .12, 0, 0] });
      for (const sx of [-1, 1]) P(head, A.box(.15, .028, .02), eyeMat, [sx * .1, .04, .255], { cast: false });
      P(head, A.box(.035, .22, .02), A.mat('#0c0a09'), [0, -.1, .255], { cast: false });
      const visorGlow = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: '#8fe8d4', transparent: true, opacity: .4, depthWrite: false,
                                                           blending: T.AdditiveBlending, fog: false }));
      visorGlow.position.set(0, .04, .3); visorGlow.scale.setScalar(.7); head.add(visorGlow);   // no light of its own: a glow behind the visor
      // long years in the mound: moss and lichen on the shoulders, the helm, the knees
      const moss = A.mat('#3f5a2c', 0, 1), lichen = A.mat('#8d9a6a', 0, 1);
      const rm = A.rand(401);
      for (let i = 0; i < 16; i++) { const sx = i % 2 ? 1 : -1;
        P(chest, A.ico(.07 + rm() * .07, 0), rm() < .7 ? moss : lichen, [sx * (.5 + rm() * .25), .42 + rm() * .12, (rm() - .5) * .4], { scale: [1, .45, 1], cast: false }); }
      for (let i = 0; i < 6; i++) P(head, A.ico(.05 + rm() * .04, 0), moss, [(rm() - .5) * .34, .2 + rm() * .1, (rm() - .5) * .34], { scale: [1, .5, 1], cast: false });
      for (const sx of [-1, 1]) P(g, A.ico(.1, 0), moss, [sx * .27, 1.08, .14], { scale: [1, .5, 1], cast: false });
      // cloak strips, tattered
      const cloak = [];
      for (let i = 0; i < 6; i++) {
        const c = G(chest, [(i - 2.5) * .19, .45, -.36]);
        const len = 1.9 + ((i * 37) % 5) * .12;
        sheet(c, [[-.11, 0, 0], [.11, 0, 0], [.1, -len, -.05], [0, -len - .25, -.05], [-.1, -len + .1, -.05]], [[0, 1, 2], [0, 2, 3], [0, 3, 4]], cloth);
        cloak.push(c);
      }
      // arms down to the hands resting on the sword
      for (const sx of [-1, 1]) {
        bone(chest, [sx * .62, .25, 0], [sx * .48, -.35, .32], .13, .11, iron);
        bone(chest, [sx * .48, -.35, .32], [sx * .1, -.62, .55], .11, .09, rust);
        P(chest, A.ico(.12, 0), dark, [sx * .08, -.68, .58]);
      }
      const sword = G(g, [0, 0, .58]);
      P(sword, A.box(.14, 1.6, .035), A.mat('#5d5a55', .7, .4), [0, .58, 0], { jitter: .01 });
      for (const [y, x] of [[.8, .07], [.45, -.07], [1.1, -.07]]) P(sword, A.box(.05, .05, .05), A.mat('#151210'), [x, y, 0], { rot: [0, 0, .8], cast: false });
      P(sword, A.box(.7, .07, .09), dark, [0, 1.41, 0]);
      P(sword, A.cyl(.035, .035, .36, 6), A.M.leather, [0, 1.62, 0]);
      P(sword, A.ico(.07, 0), dark, [0, 1.83, 0]);
      // mist
      const mist = Array.from({ length: 14 }, (_, i) => {
        const sp = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: '#a9c4c0', transparent: true, opacity: .25, depthWrite: false }));
        sp.userData = { x: -23 + (i % 7) * 1.1, z: -2.5 + Math.floor(i / 7) * 4, ph: i * .7 }; root.add(sp); return sp;
      });
      return (t) => {
        chest.scale.set(1, 1 + Math.sin(t * .8) * .015, 1);
        head.rotation.y = Math.sin(t * .2) * .35; head.rotation.x = .08 + Math.sin(t * .17) * .05;
        cloak.forEach((c, i) => { c.rotation.x = -.12 - Math.sin(t * .9 + i) * .08; c.rotation.z = Math.sin(t * .6 + i * .7) * .04; });
        eyeMat.emissiveIntensity = 2.6 + Math.sin(t * 7) * .4 + (Math.sin(t * 23) > .95 ? -2 : 0);
        visorGlow.material.opacity = .3 + Math.sin(t * 7) * .06;
        for (const m of mist) { const u = m.userData; m.position.set(u.x + Math.sin(t * .1 + u.ph) * .8, .35 + Math.sin(t * .3 + u.ph) * .1, u.z + Math.cos(t * .08 + u.ph) * .6); m.scale.setScalar(3 + Math.sin(t * .2 + u.ph)); }
      };
    },
  },

  // ================================================================ FOG WITH EYES
  fog: {
    name: 'The fog with eyes', hour: 22,
    blurb: 'Common, on some nights. A low fog rolls in from the west and fills the courtyard, and things look out of it: some alone, some in pairs, some far too big. It edges toward the light, and pulls back from the fire.',
    view: [[-6.4, 2.6, 5.4], [-13, 1.0, .5]],
    knight: { place: 'fire', action: 'sit', emote: 'dots', note: 'staying by the fire' },
    build(root) {
      const v = root.userData.appearance?.variant || {};
      const size = v.size || 1, age = v.age || '';
      const rnd = A.rand(7 + Math.abs(Math.round((v.hue || 0) * 1000)));
      // the bank: low, heavy, ground-hugging layers and a thinner layer above, rolling in from the west
      const FRONT0 = -34, FRONT1 = -4.6 - (size - 1) * 4;          // where its leading edge starts and stops (the doorway)
      const sprites = [];
      const layer = (n, y0, y1, w0, w1, op, col) => {
        for (let i = 0; i < n; i++) {
          const sp = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: col, transparent: true, opacity: 0, depthWrite: false, fog: false }));
          sp.userData = { x: -30 + rnd() * 26, y: y0 + rnd() * (y1 - y0), z: -10 + rnd() * 20, w: w0 + rnd() * (w1 - w0),
                          op: op * (.7 + rnd() * .6), sp: .06 + rnd() * .12, ph: rnd() * 9 };
          root.add(sp); sprites.push(sp);
        }
      };
      layer(Math.round(30 * size), .05, .8, 4.5, 8, .5, '#444c5a');       // the heavy floor of it
      layer(Math.round(16 * size), .8, 2.6, 3.5, 6, .28, '#4a5261');      // thinner above
      // tendrils creeping ahead along the ground, toward the light
      const tendrils = Array.from({ length: 6 }, (_, i) => {
        const sp = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: '#444c5a', transparent: true, opacity: 0, depthWrite: false, fog: false }));
        sp.userData = { z: -3.2 + i * 1.3 + rnd() * .5, lag: 1 + rnd() * 2.5, ph: rnd() * 9 };
        root.add(sp); return sp;
      });
      // the eyes: wet, pale, slow to blink; most of them watch whoever is watching
      const sclera = A.mat('#8e9184', 0, .2, { emissive: '#3c3f38', emissiveIntensity: .5, fog: false });   // wet, grey, not white
      const iris = [glow('#b8b06a', .55, { fog: false }), glow('#8fae63', .5, { fog: false }), glow('#b98d55', .5, { fog: false })];
      const pupil = A.mat('#030304', 0, .2, { fog: false });
      const lidMat = A.mat('#4b5260', 0, 1, { fog: false });
      const eyes = [];
      const makeEye = (parent, r, irisMat, slit) => {
        const e = G(parent);
        P(e, new T.SphereGeometry(r, 14, 10), sclera, [0, 0, 0], { jitter: 0, cast: false });
        P(e, new T.CircleGeometry(r * .5, 14), irisMat, [0, 0, r * 1.002], { jitter: 0, cast: false });
        const pu = P(e, new T.CircleGeometry(r * .3, 12), pupil, [0, 0, r * 1.006], { jitter: 0, cast: false });
        if (slit) pu.scale.set(.22, 1.5, 1);
        // lids: two shells of fog-dark that close over it
        const lids = [1, -1].map(s => {
          const l = P(e, new T.SphereGeometry(r * 1.08, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), lidMat, [0, 0, 0], { jitter: 0, cast: false });
          l.rotation.x = s > 0 ? -.15 : Math.PI + .15; return l;
        });
        return { e, lids, pu };
      };
      const n = Math.round((age === 'young' ? 8 : age === 'old' ? 15 : 11) * size);
      for (let i = 0; i < n; i++) {
        const kind = rnd();                                             // a pair, a single, or a cluster
        const r = (i === 0 ? .2 : .035 + rnd() * .05) * (age === 'old' ? 1.2 : 1);
        let ex, ey, ez, tries = 0;
        do { ex = -9 - rnd() * 13; ey = .35 + rnd() * 2.1; ez = -4.5 + rnd() * 9; } while (inSolid(ex, ey, ez, .8) && ++tries < 40);   // never inside a wall or a building
        const holder = G(root, [ex, ey, ez]);
        const im = iris[i % 3], slit = rnd() < .75;
        const parts = kind < .55 ? [[-1.25, 0], [1.25, 0]] : kind < .85 ? [[0, 0]] : [[-1.1, 0], [1.1, .1], [0, 1.1]];
        const set = parts.map(([dx, dy]) => { const m = makeEye(holder, r, im, slit); m.e.position.set(dx * r * 1.9, dy * r * 1.9, 0); return m; });
        eyes.push({ holder, set, home: holder.position.clone(), ph: rnd() * 30, every: 5 + rnd() * 9, open: 0,
                    drift: .2 + rnd() * .4, look: rnd() < .8 });
      }
      const cam = V(), fire = V(0, .6, -1.35), tmp = V(), q = new T.Quaternion(), m4 = new T.Matrix4();
      let t0 = null;
      return (t) => {
        if (t0 === null) t0 = t;
        const age_t = t - t0;
        const roll = smooth(0, 70, age_t);                              // it rolls in over a minute or so
        const front = FRONT0 + (FRONT1 - FRONT0) * roll;
        A.scene.fog.color.set('#151a23'); A.scene.fog.density = .02 + .025 * roll;
        for (const sp of sprites) {
          const u = sp.userData;
          const x = u.x + Math.sin(t * .05 * u.sp * 6 + u.ph) * 1.6 + (front - FRONT1);   // the bank as a whole advances
          const z = u.z + Math.cos(t * .04 + u.ph) * .8;
          const edge = smooth(front + 1, front - 3, x);                 // thin at its leading edge
          const heat = smooth(2.2, 5.5, Math.hypot(x - fire.x, z - fire.z));   // pulls back from the fire
          sp.position.set(x, u.y + Math.sin(t * .2 + u.ph) * .08, z);
          sp.scale.set(u.w * (1 + Math.sin(t * .1 + u.ph) * .08), u.w * .42, 1);
          sp.material.opacity = u.op * edge * heat * roll;
        }
        tendrils.forEach((sp, i) => {
          const u = sp.userData, reach = front + 2.4 - u.lag + Math.sin(t * .25 + u.ph) * .7;
          const heat = smooth(2.5, 5, Math.hypot(reach, u.z + 1.35));
          sp.position.set(reach, .12, u.z + Math.sin(t * .17 + u.ph) * .3);
          sp.scale.set(3.4, .5, 1); sp.material.opacity = .3 * roll * heat;
        });
        A.camera.getWorldPosition(cam);
        for (const ey of eyes) {
          const inside = ey.home.x < front - 1.5;                       // only where the fog already is
          const k = (t + ey.ph) % ey.every;
          const want = inside ? 1 : 0;
          ey.open += (want - ey.open) * .02;
          const blink = k < .22 ? 1 - Math.sin(k / .22 * Math.PI) : 1;  // a slow, heavy blink
          const near = smooth(16, 6, ey.holder.position.distanceTo(cam));   // heavy-lidded, until you come closer
          const lid = Math.min(ey.open, blink) * (.42 + .58 * near);
          ey.holder.position.set(ey.home.x + Math.sin(t * .09 * ey.drift + ey.ph) * .6, ey.home.y + Math.sin(t * .13 + ey.ph) * .12,
                                 ey.home.z + Math.cos(t * .07 * ey.drift + ey.ph) * .5);
          // turn (slowly) toward the watcher, or toward the light
          tmp.copy(ey.look ? cam : fire);
          m4.lookAt(tmp, ey.holder.position, V(0, 1, 0)); q.setFromRotationMatrix(m4);
          ey.holder.quaternion.slerp(q, .03);
          for (const { e, lids, pu } of ey.set) {
            e.visible = ey.open > .03;
            lids[0].rotation.x = -Math.PI / 2 * lid; lids[1].rotation.x = Math.PI + Math.PI / 2 * lid;   // 0 shut, 1 tucked behind
            pu.scale.x = pu.scale.y > 1 ? .22 + near * .3 : 1 + near * .3;   // and the pupils widen
          }
        }
      };
    },
    exit() { A.updateSky(); },
  },

  // ================================================================ THE NINEFOLD EYE
  ninefold: {
    name: 'The Ninefold Eye', hour: 22,
    blurb: 'Seen only by those who have seen enough. A ring of old bone drifts over the courtyard, set with nine eyes, each watching something different. Once in a long while, all nine turn to the knight.',
    view: [[-6.3, 1.6, 4.9], [-11, 6.0, -.5]],
    knight: { place: 'courtyard', action: 'gaze', emote: 'question', note: 'counting the eyes, and getting a different number each time' },
    build(root) {
      // A ring of old vertebrae, each with its spine pointing outward, hung in the air over the
      // courtyard and turning very slowly. Nine eyes are set into it, no two alike (size, iris, the
      // shape of the pupil), each in its own lidded socket, each looking at its own thing: the fire,
      // the well, the knight, the moon, the land, now and then whoever is watching. They glance the
      // way eyes do (a quick jump, then a hold, never a slide), blink on their own clocks, and the
      // pupils widen and narrow. Dried sinews hang from the lower rim. Its tell: once in a long while
      // all nine turn to the knight, one after another, the ring stops turning and the sinews hang
      // still; then they let him go.
      const g = G(root, [-11, 6.6, -.5]), tilt = G(g), ring = G(tilt), R0 = 2.1;
      const pale = { emissive: '#2c2720', emissiveIntensity: .5 };                       // (pale enough to read under the moon)
      const boneM = A.mat('#ddd3ba', 0, .75, pale), boneD = A.mat('#b0a386', 0, .85, pale), disc = A.mat('#5e4d40', 0, .9);
      const flesh = A.mat('#7a4038', 0, .6, { emissive: '#2a0e0a', emissiveIntensity: .6 }), lidM = A.mat('#8a6458', 0, .55, pale), lidD = A.mat('#74544a', 0, .65, pale);
      const vProf = [[0, -.235], [.17, -.225], [.2, -.17], [.15, -.06], [.14, 0], [.15, .06], [.2, .17], [.17, .225], [0, .235]].map(([x, y]) => new T.Vector2(x, y));
      const r = A.rand(9);
      // the vertebrae (still parts: merged into a few meshes)
      const NV = 27;
      for (let i = 0; i < NV; i++) {
        const a = i / NV * 6.283, c = Math.cos(a), s = Math.sin(a), rot = [0, 0, a - Math.PI / 2];
        const v = G(ring, [c * R0, s * R0, 0], rot);
        P(v, new T.LatheGeometry(vProf, 8), boneM, [0, 0, 0], { rot: [0, 0, Math.PI / 2], jitter: .02, seed: i });   // the body: waisted, lying along the ring
        P(v, A.cyl(.17, .17, .03, 8), disc, [.245, 0, 0], { rot: [0, 0, Math.PI / 2], jitter: .008, seed: i + 40 });   // the disc between one and the next
        const len = .42 + (i % 3) * .14 + r() * .12;                                                          // the spine, outward
        P(v, new T.ConeGeometry(.07, len, 4), boneD, [0, .15 + len / 2, -.03], { rot: [(r() - .5) * .25, 0, (r() - .5) * .2], jitter: .012 });
        for (const sz of [-1, 1]) P(v, new T.ConeGeometry(.045, .3, 4), boneD, [0, .06, sz * .24], { rot: [sz * Math.PI / 2 - sz * .3, 0, 0], jitter: .01 });   // the side wings
      }
      for (const v of ring.children) merge(v);
      // the eyes: [where on the ring (angle), size, iris, pupil shape (x, y), temper]
      const EYES = [[-1.57, .44, '#b48a3a', [1, 1], 'still'], [-.88, .27, '#8f7ad8', [.22, 1], 'quick'], [-.2, .31, '#7fb7a2', [1, .26], 'still'],
        [.5, .24, '#c9d6e8', [1, 1], 'quick'], [1.22, .3, '#9a3f2e', [.28, 1], 'still'], [1.95, .26, '#d6b45a', [1, .3], 'quick'],
        [2.62, .29, '#6c8fb8', [1, 1], 'still'], [3.32, .22, '#9fbf6a', [.25, 1], 'watcher'], [3.98, .28, '#b9a3c9', [1, .28], 'quick']];
      const veins = canvasTex(256, 128, (c, w, h) => {                  // old whites, yellowed, with fine veins
        c.fillStyle = '#ddd3bb'; c.fillRect(0, 0, w, h); const q = A.rand(77);
        for (let i = 0; i < 26; i++) { let x = q() * w, y = q() < .5 ? q() * h * .3 : h - q() * h * .3; c.strokeStyle = `rgba(${120 + q() * 50},${30 + q() * 20},${30 + q() * 20},${.25 + q() * .35})`; c.lineWidth = .6 + q();
          c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (q() - .5) * 22; y += (y < h / 2 ? 1 : -1) * q() * 9; c.lineTo(x, y); } c.stroke(); }
      });
      const ballM = new T.MeshStandardMaterial({ map: veins, roughness: .25, emissive: '#5e5646', emissiveIntensity: .45, emissiveMap: veins, flatShading: true });   // faintly pale in the dark
      const irisTex = (col, k) => canvasTex(128, 128, (c, w) => {        // an iris: fibres and flecks round a darker edge
        const gr = c.createRadialGradient(w / 2, w / 2, w * .1, w / 2, w / 2, w / 2); gr.addColorStop(0, col); gr.addColorStop(.75, col); gr.addColorStop(1, '#100c0a');
        c.fillStyle = gr; c.beginPath(); c.arc(w / 2, w / 2, w / 2, 0, 6.3); c.fill();
        const q = A.rand(k + 3); c.lineWidth = 1;
        for (let i = 0; i < 90; i++) { const a = q() * 6.28, r0 = w * (.12 + q() * .08), r1 = w * (.3 + q() * .18); c.strokeStyle = q() < .5 ? 'rgba(255,240,210,.22)' : 'rgba(20,10,8,.25)'; c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * r0, w / 2 + Math.sin(a) * r0); c.lineTo(w / 2 + Math.cos(a) * r1, w / 2 + Math.sin(a) * r1); c.stroke(); }
      });
      const eyes = EYES.map(([a, sz, col, shape, temper], k) => {
        const at = [Math.cos(a) * R0, Math.sin(a) * R0, .12];
        const sock = G(ring, at);
        P(sock, A.ico(sz * 1.3, 1), boneD, [0, 0, -sz * .35], { scale: [1, 1, .55], jitter: .03, seed: k });       // the knot of bone it is set in
        P(sock, new T.TorusGeometry(sz * .93, sz * .2, 6, 16), flesh, [0, 0, sz * .42], { jitter: .01, seed: k });   // the raw rim of the socket
        const e = G(sock, [0, 0, 0]);                                                                                 // the eye, sunk deep, which turns
        P(e, new T.SphereGeometry(sz, 26, 18), ballM, [0, 0, 0], { jitter: 0 });
        const irisM = new T.MeshStandardMaterial({ map: irisTex(col, k), emissive: col, emissiveIntensity: .35, emissiveMap: irisTex(col, k + 50), roughness: .3 });
        P(e, new T.CircleGeometry(sz * .5, 20), irisM, [0, 0, sz * 1.003], { jitter: 0, cast: false });
        const pupil = P(e, new T.CircleGeometry(sz * .2, 16), A.mat('#040304', 0, .4), [0, 0, sz * 1.008], { jitter: 0, cast: false, scale: [...shape, 1] });
        P(e, new T.CircleGeometry(sz * .045, 8), new T.MeshBasicMaterial({ color: '#fff8ea', transparent: true, opacity: .28 }), [sz * .14, sz * .15, sz * 1.012], { jitter: 0, cast: false });   // a faint wet glint
        // the lids: two shells just bigger than the eye, closing over it from above and below
        const lid = (up) => { const l = G(sock, [0, 0, 0]);
          P(l, new T.SphereGeometry(sz * 1.07, 14, 8, 0, 6.283, up ? 0 : Math.PI / 2, Math.PI / 2), up ? lidM : lidD, [0, 0, 0], { jitter: .006, cast: false });
          return l; };
        const up = lid(true), lo = lid(false);
        return { e, up, lo, pupil, shape, temper, k, look: V(), want: V(), next: r() * 3, blinkAt: 2 + r() * 8, blinkT: -9, dil: 1, open: 1 };
      });
      // dried sinews tied to some of the vertebrae, hanging straight down whichever way the ring has turned
      // (one set of lines, swaying; they hang still while it looks at him); bone dust sifting down
      const NS = 11, SEG = 6, sp = new Float32Array(NS * SEG * 2 * 3), sinews = [];
      for (let i = 0; i < NS; i++) sinews.push({ a: (Math.floor(i * NV / NS) + .5) / NV * 6.283, len: 1.1 + r() * 1.9, ph: r() * 6 });
      const sgeo = new T.BufferGeometry(); sgeo.setAttribute('position', new T.BufferAttribute(sp, 3));
      const sLines = new T.LineSegments(sgeo, new T.LineBasicMaterial({ color: '#6f604f', transparent: true, opacity: .55 })); root.add(sLines); sLines.frustumCulled = false;
      const ND = 40, dp = new Float32Array(ND * 3), dust = Array.from({ length: ND }, () => ({ a: r() * 6.28, ph: r(), sp: .25 + r() * .3 }));
      const dgeo = new T.BufferGeometry(); dgeo.setAttribute('position', new T.BufferAttribute(dp, 3));
      const dPts = new T.Points(dgeo, new T.PointsMaterial({ color: '#d8cfba', size: .035, transparent: true, opacity: .55, depthWrite: false })); root.add(dPts); dPts.frustumCulled = false;
      const halo = softLight('#a790ff', 3, 7.5); halo.position.z = -.4; g.add(halo);
      // what the eyes look at
      const cam = V(), kn = V(), tmp = V(), fire = V(0, .7, 0), well = V(-8.2, .6, 2.4), moonP = V(-14, 26, -30);
      const qWant = new T.Quaternion(), aim = new T.Object3D(); root.add(aim);
      let spin = 0, allK = 0, nextAll = 30 + r() * 25, allEnd = -1, last = 0;
      const pick = (s, t) => {                                        // a new thing to look at, by temper
        const q = A.rand(Math.floor(t * 7) + s.k * 131), x = q();
        if (s.temper === 'watcher' && x < .7) return s.want.copy(cam);                       // the small one: mostly whoever is watching
        if (x < .18) return s.want.copy(fire);
        if (x < .3) return s.want.copy(well);
        if (x < .42) return s.want.copy(kn);
        if (x < .5) return s.want.copy(moonP);
        if (x < .56) return s.want.copy(cam);
        return s.want.set(-11 + (q() - .5) * 40, q() * 2, -.5 + (q() - .5) * 30);          // somewhere out on the land
      };
      return (t, dt = 1 / 60) => {
        dt = Math.min(dt, .1);
        A.camera.getWorldPosition(cam); A.K.J.hips.getWorldPosition(kn); kn.y += .75;
        // the tell: all nine on him, then let go
        if (t > nextAll && allEnd < 0) { allEnd = t + 7; }
        let letGo = false;
        if (allEnd > 0 && t > allEnd) { allEnd = -1; nextAll = t + 40 + nz(Math.floor(t)) * 40; letGo = true; }
        const all = allEnd > 0, since = all ? 7 - (allEnd - t) : 99;
        allK += ((all ? 1 : 0) - allK) * (1 - Math.exp(-dt * 2));
        // it hangs and drifts; it turns its face (slowly) down toward whoever is below; the ring turns
        g.position.set(-11 + Math.sin(t * .09) * .3, 6.6 + Math.sin(t * .37) * .22, -.5 + Math.cos(t * .07) * .25);
        aim.position.copy(g.position); aim.lookAt(cam.x, cam.y - 3, cam.z); qWant.copy(aim.quaternion);
        g.quaternion.slerp(qWant, 1 - Math.exp(-dt * .25));
        spin += dt * .04 * (1 - allK); ring.rotation.z = spin;
        tilt.rotation.x = Math.sin(t * .13) * .06; tilt.rotation.y = Math.sin(t * .11 + 1) * .05;
        for (const s of eyes) {
          // where it wants to look: its own thing, or (during the tell) him, each eye joining a moment after the last
          if (all && since > s.k * .22) s.want.copy(kn);
          else if (t > s.next || t < last) { pick(s, t); s.next = t + (s.temper === 'quick' ? .8 + nz(t + s.k) * 1.6 : 2.2 + nz(t + s.k) * 4); }
          // a glance is a jump, not a slide: quick to the new place, then a small tremor while it holds
          s.look.lerp(s.want, 1 - Math.exp(-dt * (s.temper === 'still' && !all ? 9 : 14)));
          s.e.getWorldPosition(tmp);
          tmp.copy(s.look); tmp.x += Math.sin(t * 23 + s.k) * .02; tmp.y += Math.sin(t * 19 + s.k * 2) * .02;
          s.e.lookAt(tmp); s.e.rotation.x = Math.max(-.6, Math.min(.6, s.e.rotation.x)); s.e.rotation.y = Math.max(-.7, Math.min(.7, s.e.rotation.y)); s.e.rotation.z = 0;   // (an eye only turns so far in its socket)
          // the pupil: wider on the dark land, narrower on the fire; widest when it looks at him
          const wantD = all ? 1.5 : s.want === fire || s.want.distanceToSquared(fire) < .1 ? .7 : 1.1;
          s.dil += (wantD - s.dil) * (1 - Math.exp(-dt * 1.5));
          const [sx, sy] = s.shape; s.pupil.scale.set(sx < 1 ? sx * s.dil : sx * (.8 + s.dil * .2), sy < 1 ? sy * s.dil : sy * (.8 + s.dil * .2), 1);
          // blinking: each on its own clock; none while it looks at him; all at once when it lets him go
          if (!all && t > s.blinkAt) { s.blinkT = t; s.blinkAt = t + 3 + nz(t * 3 + s.k) * 9; }
          if (letGo) s.blinkT = t;
          const shut = Math.max(0, Math.sin(Math.min(1, Math.max(0, (t - (s.blinkT ?? -9)) / .3)) * Math.PI));
          s.open += ((1 - shut) - s.open) * (1 - Math.exp(-dt * 40));
          s.up.rotation.x = -.62 * s.open; s.lo.rotation.x = .55 * s.open;              // heavy lids: they never open all the way
        }
        last = t;
        // the sinews sway (most at their ends), and hang still while it looks at him; the dust sifts down
        const sw = 1 - allK * .85;
        sinews.forEach((q, i) => {
          tmp.set(Math.cos(q.a) * (R0 + .1), Math.sin(q.a) * (R0 + .1), 0); ring.localToWorld(tmp);
          let x = tmp.x, y = tmp.y, z = tmp.z, dx = 0, dz = 0;
          for (let j = 0; j < SEG; j++) {
            const f = (j + 1) / SEG;
            dx += Math.sin(t * .8 + q.ph + j * .5) * .025 * f * sw; dz += Math.cos(t * .6 + q.ph + j * .4) * .025 * f * sw;
            const nx = x + dx, ny = y - q.len / SEG, nzv = z + dz;
            sp.set([x, y, z, nx, ny, nzv], (i * SEG + j) * 6); x = nx; y = ny; z = nzv;
          }
        });
        sgeo.attributes.position.needsUpdate = true;
        dust.forEach((d, i) => {
          const k = (t * .05 * d.sp + d.ph) % 1; tmp.set(Math.cos(d.a) * R0, Math.sin(d.a) * R0, 0); ring.localToWorld(tmp);
          dp.set([tmp.x + Math.sin(t * .7 + i) * .1 * k, tmp.y - k * 4.5, tmp.z + Math.cos(t * .5 + i) * .1 * k], i * 3);
        });
        dgeo.attributes.position.needsUpdate = true; dPts.material.opacity = .5 * (1 - allK * .5);
        halo.intensity = 3 + Math.sin(t * .8) * .4 + allK * 2.5;
      };
    },
  },

  // ================================================================ THE SECOND MOON
  moon2: {
    name: 'The Second Moon', hour: 22,
    blurb: 'Some nights there is another moon: pale green, cratered, a little too close, with thin rings of fine dust slowly turning. Small things fall from it.',
    view: [[-7, 1.6, 4.6], [-18, 13, -26]],
    knight: { place: 'courtyard', action: 'gaze', emote: 'exclaim', note: 'looking up at two moons' },
    build(root) {
      const g = G(root, [-26, 30, -48]);
      const body = new T.Mesh(A.facet(new T.IcosahedronGeometry(7, 3), .45, 8),
        new T.MeshStandardMaterial({ color: '#b9d8b0', emissive: '#6f9a6a', emissiveIntensity: .6, roughness: 1, flatShading: true, fog: false }));
      g.add(body);
      for (let i = 0; i < 7; i++) {   // darker seas
        const a = i * 1.7, b = i * .9 - 2;
        const m = new T.Mesh(new T.CircleGeometry(.9 + (i % 3) * .5, 9), new T.MeshBasicMaterial({ color: '#7f9f7a', fog: false }));
        const d = V(Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)).normalize();
        if (d.z < 0) d.z = -d.z;   // on the side we see
        m.position.copy(d).multiplyScalar(7.05); m.lookAt(d.clone().multiplyScalar(20)); body.add(m);
      }
      const ringMat = new T.MeshBasicMaterial({ color: '#d8efcf', transparent: true, opacity: .55, fog: false, side: T.DoubleSide });
      const rings = [[11, .14], [13.2, .08], [14.4, .05]].map(([R, w], i) => {
        const m = new T.Mesh(new T.TorusGeometry(R, w, 3, 72), ringMat); m.rotation.set(1.25 + i * .04, .2, .35); g.add(m); return m;
      });
      const halo = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: '#8fe08a', transparent: true, opacity: .35, depthWrite: false, fog: false }));
      halo.scale.setScalar(30); g.add(halo);
      for (let i = 0; i < 14; i++) {                                     // craters: a pale rim round a darker floor
        const a = i * 2.39, b = (i / 14) * 2.2 - 1.1, d = V(Math.cos(a) * Math.cos(b), Math.sin(b), Math.abs(Math.sin(a) * Math.cos(b)) + .2).normalize(), rr = .35 + (i % 4) * .22;
        const rim = new T.Mesh(new T.RingGeometry(rr, rr * 1.25, 12), new T.MeshBasicMaterial({ color: '#d6ecd0', fog: false, transparent: true, opacity: .6 }));
        rim.position.copy(d).multiplyScalar(7.08); rim.lookAt(d.clone().multiplyScalar(20)); body.add(rim);
        const floor = new T.Mesh(new T.CircleGeometry(rr, 12), new T.MeshBasicMaterial({ color: '#8fae88', fog: false }));
        floor.position.copy(d).multiplyScalar(7.07); floor.lookAt(d.clone().multiplyScalar(20)); body.add(floor);
      }
      const DN = 900, dp = new Float32Array(DN * 3), rr_ = A.rand(91);       // the rings' fine dust, turning with them
      for (let i = 0; i < DN; i++) { const a = rr_() * 6.28, R = 10.2 + rr_() * 4.8 + (rr_() < .3 ? rr_() * .5 : 0); dp.set([Math.cos(a) * R, (rr_() - .5) * .12, Math.sin(a) * R], i * 3); }
      const dg = new T.BufferGeometry(); dg.setAttribute('position', new T.BufferAttribute(dp, 3));
      const dust = new T.Points(dg, new T.PointsMaterial({ color: '#e6f6de', size: .09, transparent: true, opacity: .7, depthWrite: false, fog: false }));
      const dustHold = G(g, [0, 0, 0], [1.25 - Math.PI / 2, .2, .35]); dustHold.add(dust);
      const fallMat = new T.MeshBasicMaterial({ color: '#e2ffd8', fog: false, transparent: true });
      const falling = Array.from({ length: 12 }, (_, i) => { const m = new T.Mesh(A.ico(.22, 0), fallMat.clone()); root.add(m); return { m, ph: i / 12, x: (i % 4 - 1.5) * 6, z: (Math.floor(i / 4) - 1) * 5 }; });
      return (t) => {
        body.rotation.y = t * .01; halo.material.opacity = .3 + Math.sin(t * .5) * .06;
        rings.forEach((m, i) => { m.rotation.z = .35 + t * (.02 + i * .01); }); dust.rotation.y = -t * .015;
        for (const f of falling) {
          const k = (t * .04 + f.ph) % 1;
          f.m.position.set(-26 + f.x + k * 6, 30 - 6 - k * 34, -48 + f.z + k * 10);
          f.m.material.opacity = Math.sin(k * Math.PI); f.m.scale.setScalar(1 + Math.sin(t * 9 + f.ph * 30) * .3);
        }
      };
    },
  },

  // ================================================================ THE STARFALLEN LARVA
  larva: {
    name: 'The Starfallen Larva', hour: 22,
    blurb: 'One of the things that fell. A pale grub the size of a cart, lit from inside with starlight, curled in a crater just beyond the courtyard wall, where it fell. It seems harmless. It is a little bigger every time it comes back.',
    view: [[-6.4, 3.4, .2], [-10.2, 1.2, 7.6]],
    knight: { place: 'courtyard', action: 'stand', emote: 'question', note: 'wondering whether it is warm, or cold, or anything at all' },
    build(root) {
      const v = root.userData.appearance?.variant || {}, young = v.age === 'young', old = v.age === 'old';
      // the young: not one grub but a brood of small ones, nosing about the crater. The grown: one great
      // grub curled in it. The old: no longer a grub at all, a tall chrysalis cracked down the front,
      // wings pressing out from inside, its light almost too bright to look at.
      const k = (v.size || 1) * (young ? 1 : old ? 1.15 : .85);
      const cx = -10.2, cz = 7.6;                                        // where it fell: just beyond the south wall, by the road
      const pit = new T.Mesh(new T.CircleGeometry(1.9 * k, 14), A.mat('#14100d', 0, 1)); pit.userData.ground = true; pit.rotation.x = -Math.PI / 2; pit.position.set(cx, gy(cx, cz) + .03, cz); root.add(pit);
      const r = A.rand(17), shardM = glow('#cfe2ff', 1.6);
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * 6.28, d = (1.8 + r() * .4) * k;
        P(root, A.box(.4 + r() * .3, .18 + r() * .2, .35), i % 3 ? A.M.dirt : A.M.stone, [cx + Math.cos(a) * d, gy(cx + Math.cos(a) * d, cz + Math.sin(a) * d) + .08, cz + Math.sin(a) * d], { rot: [r() - .5, a, (r() - .5) * .8] });
        if (i % 2) P(root, new T.TetrahedronGeometry(.05 + r() * .05), shardM, [cx + Math.cos(a + .2) * (d - .5), gy(cx, cz) + .06, cz + Math.sin(a + .2) * (d - .5)], { cast: false });
      }
      const skin = new T.MeshStandardMaterial({ color: '#e6e1f2', transparent: true, opacity: young ? .5 : .7, roughness: .35, emissive: '#7f8ad8', emissiveIntensity: old ? 1.3 : .75, flatShading: true, depthWrite: false });
      const band = A.mat('#cfc8e0', 0, .5), dark = A.mat('#1b1626');
      const starsIn = (parent, n, rad, size = .07) => {
        const sp = []; for (let q = 0; q < n; q++) { const w = V(r() - .5, r() - .5, r() - .5).normalize().multiplyScalar(r() * rad * .7); sp.push(w.x, w.y, w.z); }
        const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
        parent.add(new T.Points(pg, new T.PointsMaterial({ color: '#ffffff', size, transparent: true, depthWrite: false })));
      };
      if (young) {
        // a brood: five little grubs, each its own size and pace, each nosing about its own patch of the floor
        const grubs = [];
        for (let n = 0; n < 5; n++) {
          const len = 6 + (n % 3), sz = .7 + r() * .35, segs = [];
          for (let i = 0; i < len; i++) {
            const rad = (.12 * Math.pow(Math.sin(Math.PI * (i + .6) / (len + .4)), .6) + .04) * sz;
            const s = G(root);
            P(s, A.ico(rad, 1), skin, [0, 0, 0], { scale: [1, .9, .8], jitter: .02, cast: false });
            P(s, A.cyl(rad, rad, rad * .12, 8), band, [0, 0, 0], { rot: [Math.PI / 2, 0, 0], jitter: .01, cast: false });
            if (i % 2) starsIn(s, 2, rad, .05);
            segs.push({ s, rad });
          }
          const head = segs[len - 1].s, hr = segs[len - 1].rad;
          P(head, new T.CircleGeometry(hr * .45, 8), dark, [0, 0, hr * .8], { cast: false, jitter: 0 });
          for (const sx of [-1, 1]) bone(head, [sx * hr * .4, hr * .5, hr * .5], [sx * hr * .9, hr * 1.4, hr * 1.3], .008, .004, band, 4);
          const ha = n / 5 * 6.28 + r() * .4, hd = (.85 + r() * .25) * k;
          grubs.push({ segs, head, ph: r() * 6.28, w: (.35 + r() * .2) * (r() < .5 ? -1 : 1), hx: cx + Math.cos(ha) * hd, hz: cz + Math.sin(ha) * hd, rot: ha + Math.PI / 2, ra: .42 * k, rb: .2 * k, gap: .13 * sz });
        }
        const lamp = softLight('#9fb4ff', 1.8, 2.6 * k); lamp.position.set(cx, gy(cx, cz) + .5, cz); root.add(lamp);
        const p = V(), q = V();
        return (t) => {
          for (const gb of grubs) {
            const u0 = t + Math.sin(t * .4 + gb.ph) * 1.6;                     // each stops and starts on its own
            const at = (u, out) => { const a = gb.w * u + gb.ph, lx = Math.cos(a) * gb.ra, lz = Math.sin(a) * gb.rb, c = Math.cos(gb.rot), sn = Math.sin(gb.rot);
              return out.set(gb.hx + lx * c - lz * sn, 0, gb.hz + lx * sn + lz * c); };
            const speed = Math.abs(gb.w) * Math.max(gb.ra, gb.rb) + .05, L = gb.segs.length;
            gb.segs.forEach(({ s, rad }, i) => {
              const u = u0 - (L - 1 - i) * gb.gap / speed;
              at(u, p); at(u + .05, q);
              const lift = i === L - 1 ? .06 + Math.max(0, Math.sin(t * .9 + gb.ph)) * .12 : 0;
              s.position.set(p.x, gy(p.x, p.z) + rad * .85 + lift, p.z);
              const b = 1 + Math.sin(t * 2.2 - i * .9 + gb.ph) * .07; s.scale.setScalar(b);
              q.y = s.position.y; s.lookAt(q);
            });
          }
          lamp.intensity = 1.6 + Math.sin(t * 1.3) * .4;
        };
      }
      if (old) {
        // a chrysalis: the old grub's banded body gone hard and upright, split down the front
        const shell = A.mat('#4c4664', .25, .35, { emissive: '#1e1a34', emissiveIntensity: .6 });
        const shellL = A.mat('#5a5478', .2, .4, { emissive: '#221e3c', emissiveIntensity: .6 });
        const crack = glow('#e4ecff', 3), silk = A.mat('#a8a4b8', 0, .7);
        const pod = G(root, [cx, gy(cx, cz), cz], [0, 2.7, 0]); pod.scale.setScalar(k);   // the crack toward the keep
        const lean = G(pod, [0, 0, 0], [.08, 0, -.05]);
        const prof = [[.05, 0], [.42, .12], [.7, .5], [.84, 1.05], [.82, 1.55], [.7, 2.05], [.5, 2.45], [.26, 2.75], [.05, 2.9]];
        const rAt = y => { for (let i = 1; i < prof.length; i++) if (y <= prof[i][1]) { const [r0, y0] = prof[i - 1], [r1, y1] = prof[i]; return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return .05; };
        const body = new T.Mesh(A.facet(new T.LatheGeometry(prof.map(([x, y]) => new T.Vector2(x, y)), 11), .03, 5), shell);
        body.scale.set(1, 1, .86); body.castShadow = true; lean.add(body);
        for (let i = 0; i < 8; i++) {                                         // the old body's bands, set hard
          const y = .32 + i * .32, R = rAt(y);
          P(lean, new T.TorusGeometry(R * .99, .035, 4, 14), shellL, [0, y, 0], { rot: [Math.PI / 2, 0, 0], scale: [1, .86, 1], cast: false, jitter: 0 });
        }
        for (let i = 0; i < 6; i++) P(lean, A.ico(.26, 1), shellL, [0, .7 + i * .3, -rAt(.7 + i * .3) * .8], { scale: [1.2, .45, .4], jitter: .02 });   // plates down its back
        // the crack: a jagged seam of light down the front, widest where the wings push through
        let y = .55, x = 0; const seam = [];
        while (y < 2.78) { const ny = y + .16, nx = (r() - .5) * .12; const R = rAt((y + ny) / 2) * .86;
          bone(lean, [x, y, rAt(y) * .86 + .01], [nx, ny, rAt(ny) * .86 + .01], .022, .022, crack, 4); seam.push([nx, ny, R]); x = nx; y = ny; }
        // the split at the top: three flaps of shell peeled back
        for (let i = 0; i < 3; i++) { const a = i / 3 * 6.28 + .5;
          P(lean, A.box(.22, .46, .04), shell, [Math.sin(a) * .26, 2.84, Math.cos(a) * .26], { rot: [Math.cos(a) * 1.2, 0, -Math.sin(a) * 1.2] }); }
        // wings pressing out through the crack, crumpled, veined with light
        const wingM = new T.MeshStandardMaterial({ color: '#d8e4ff', transparent: true, opacity: .55, emissive: '#9fb4ff', emissiveIntensity: 1.1, side: T.DoubleSide, depthWrite: false, flatShading: true });
        const wings = [];
        for (const sx of [-1, 1]) {
          const w = G(lean, [sx * .07, 2.7, .04], [0, sx * .25, sx * -.25]);   // pushing up out of the split at the top
          for (const [sc, dy, dz] of [[1, 0, 0], [.62, -.45, .1]]) {           // the forewing, and the hindwing under it, both still crumpled
            const out = [], n = 9;
            for (let i = 0; i < n; i++) { const a = -1.9 + i / (n - 1) * 2.9, rr = (.55 + .45 * Math.sin((i + .5) / n * Math.PI)) * sc;
              out.push([sx * Math.cos(a + 1.6) * rr * 1.1 + sx * .05, dy + Math.sin(a + 1.6) * rr * .8 + .1, dz + (i % 2 ? .14 : -.04) * sc]); }   // pleats
            const pts = [[0, dy - .4 * sc, dz + .02], ...out], tris = [];
            for (let i = 1; i < n; i++) tris.push([0, i, i + 1]);
            sheet(w, pts, tris, wingM);
            for (const e of [out[2], out[4], out[6]]) bone(w, pts[0], e, .01, .004, crack, 3);
          }
          wings.push({ w, sx });
        }
        // silk: strands from its sides to the crater's rim, still holding it up
        for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28 + .9, h = .8 + (i % 3) * .35;
          bone(pod, [Math.cos(a) * rAt(h) * .9, h, Math.sin(a) * rAt(h) * .8], [Math.cos(a) * 1.4, .04, Math.sin(a) * 1.4], .007, .004, silk, 3); }
        // the grub's old skin, shed and fallen in pieces about the floor
        for (let i = 0; i < 5; i++) { const a = r() * 6.28, d = 1.0 + r() * .5;
          P(pod, A.ico(.24, 1), skin, [Math.cos(a) * d, .06, Math.sin(a) * d], { scale: [1, .3, .65], rot: [(r() - .5) * .4, r() * 3, (r() - .5) * .4], jitter: .05, cast: false }); }
        // starlight leaking out of the crack, drifting up and fading
        const N = 14, sp = new Float32Array(N * 3), drift = new T.BufferGeometry(); drift.setAttribute('position', new T.BufferAttribute(sp, 3));
        const motes = new T.Points(drift, new T.PointsMaterial({ color: '#ffffff', size: .09, transparent: true, opacity: .9, depthWrite: false })); lean.add(motes);
        const halo = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: '#b8c8ff', transparent: true, opacity: .5, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
        halo.position.set(0, 1.8, rAt(1.8) * .9); halo.scale.setScalar(1.8); lean.add(halo);
        const lamp = softLight('#9fb4ff', 4.5, 3.6 * k); lamp.position.set(cx, gy(cx, cz) + 1.8 * k, cz); root.add(lamp);
        return (t) => {
          const tw = pulse(t, 9, .7);                                        // now and then, something inside shoves
          lean.rotation.z = -.05 + Math.sin(t * 31) * .025 * tw; lean.rotation.x = .08 + Math.sin(t * 27) * .015 * tw;
          const br = 1 + Math.sin(t * .8) * .015; body.scale.set(br, 1, .86 * br);
          crack.emissiveIntensity = 2.6 + Math.sin(t * 1.3) * .5 + tw * 4;
          for (const { w, sx } of wings) { const f = .8 + Math.sin(t * .6) * .04 + tw * .12; w.scale.set(f, f, f); w.rotation.z = sx * (-.25 - tw * .2 + Math.sin(t * .5) * .05); }
          for (let i = 0; i < N; i++) { const u = (t * .12 + i / N) % 1, sd = seam[i % seam.length];
            sp[i * 3] = sd[0] + Math.sin(i * 7 + t * .7) * .3 * u; sp[i * 3 + 1] = sd[1] + u * 1.6; sp[i * 3 + 2] = sd[2] + .1 + u * .5; }
          drift.attributes.position.needsUpdate = true; motes.material.opacity = .9;
          halo.material.opacity = .4 + Math.sin(t * 1.3) * .08 + tw * .3;
          lamp.intensity = 4.2 + Math.sin(t * 1.3) * .6 + tw * 2;
        };
      }
      const g = G(root, [cx, gy(cx, cz), cz], [0, .6, 0]); g.scale.setScalar(k);
      const N = 11, segs = [];
      for (let i = 0; i < N; i++) {
        const rad = .5 * Math.pow(Math.sin(Math.PI * (i + .6) / (N + .4)), .6) + .14;
        const s = G(g);
        P(s, A.ico(rad, 1), skin, [0, 0, 0], { scale: [1, .9, .8], jitter: .02 });
        P(s, A.cyl(rad * 1.0, rad * 1.0, rad * .08, 9), band, [0, 0, 0], { rot: [Math.PI / 2, 0, 0], jitter: .01 });
        const sp = [], n = 14;
        for (let q = 0; q < n; q++) { const w = V(r() - .5, r() - .5, r() - .5).normalize().multiplyScalar(r() * rad * .7); sp.push(w.x, w.y, w.z); }
        const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
        s.add(new T.Points(pg, new T.PointsMaterial({ color: '#ffffff', size: .07, transparent: true, depthWrite: false })));
        if (i > 1 && i < N - 1) for (const sx of [-1, 1]) P(s, new T.ConeGeometry(.03, .18, 4), band, [sx * rad * .5, -rad * .8, 0], { rot: [0, 0, Math.PI + sx * .4] });
        segs.push({ s, rad, i });
      }
      const head = segs[N - 1].s;
      P(head, new T.CircleGeometry(.1, 10), dark, [0, 0, .17], { cast: false, jitter: 0 });
      for (const sx of [-1, 1]) bone(head, [sx * .06, .08, .1], [sx * .16, .26, .25], .015, .006, band, 4);
      const lamp = softLight('#9fb4ff', 2.5, 3.2 * k); lamp.position.set(cx, gy(cx, cz) + .8, cz); root.add(lamp);
      const p = V(), q = V();
      return (t) => {
        const R = 1.35 + Math.sin(t * .35) * .08;
        for (const { s, rad, i } of segs) {
          const a = -2.0 + i / (N - 1) * 3.6 + Math.sin(t * .5 - i * .4) * .05;
          const lift = i === N - 1 ? .25 + Math.sin(t * .6) * .15 : 0;
          s.position.set(Math.cos(a) * R, rad * .85 + lift, Math.sin(a) * R);
          const b = 1 + Math.sin(t * 1.3 - i * .6) * .05; s.scale.set(b, b, b);
          const a2 = a + .1; q.set(Math.cos(a2) * R, s.position.y, Math.sin(a2) * R);
          s.lookAt(p.copy(q).applyMatrix4(g.matrixWorld));
        }
        head.rotation.y += Math.sin(t * .4) * .3;
        lamp.intensity = 2.2 + Math.sin(t * 1.3) * .5;
      };
    },
  },

  // ================================================================ THE ANTLERED LISTENER
  listener: {
    name: 'The Antlered Listener', hour: 18,
    blurb: 'Seen only by those who have seen enough. A gaunt figure on the rise south of the keep at dusk, its head a crown of branching antlers that end in ears. It is listening to the keep. Maybe to him.',
    view: [[.2, 2.0, 1.6], [2.5, 3.6, 12.5]],
    knight: { place: 'fire', action: 'stand', emote: 'dots', note: 'trying very hard to think quietly' },
    build(root) {
      const v = root.userData.appearance?.variant || {}, young = v.age === 'young', old = v.age === 'old';
      // a gaunt figure in a long ragged coat, its smooth pale head without a face, crowned with antlers
      // whose every tip is an ear; all of them turn toward whatever it is listening to (its tell: toward
      // what it likes best). The young: small, all one great pair of ears on stub antlers, restless,
      // half hidden behind a bush and rising to peek. The old: towering, its antlers a vast rack of
      // small ears, some long withered, moss on its shoulders, leaning on a staff, utterly still.
      const base = [2.6, 0, 12.6];
      P(root, A.ico(1, 1), A.mat('#3e4a2e', 0, 1), [base[0], -.9, base[2]], { scale: [3.2, 1.4, 2.6], jitter: .1 });
      const g = G(root, [base[0], .45, base[2]], [0, Math.PI, 0]); g.scale.setScalar((v.size || 1) * (young ? .75 : old ? 1.6 : 1.3));
      const body = G(g);
      const skin = A.mat(old ? '#3c3834' : '#2f2b27', 0, .9), skinD = A.mat('#1f1c1a', 0, .9), cloth = ds(old ? '#26231f' : '#1b1918', 0, .95);
      const antler = A.mat(old ? '#bdb093' : '#d2c6aa', 0, .7), earM = A.mat(young ? '#cfb2a8' : '#b8a39b', 0, .6, { emissive: '#3a2420', emissiveIntensity: .25 });
      const earIn = A.mat('#8a5a56', 0, .7), dead = A.mat('#5e524a', 0, .9), moss = A.mat('#4c5e34', 0, 1), headM = A.mat(old ? '#bdb5a5' : '#cfc6b5', 0, .7);
      const r = A.rand(5);
      // legs: long and thin, knuckled at the knee
      for (const sx of [-1, 1]) {
        bone(body, [sx * .14, 1.75, 0], [sx * .17, .85, .05], .07, .05, skin); P(body, A.ico(.065, 1), skinD, [sx * .17, .85, .05]);
        bone(body, [sx * .17, .85, .05], [sx * .15, .04, 0], .05, .035, skin);
        P(body, A.box(.08, .04, .22), skinD, [sx * .15, .02, .06]);
      }
      // the body under the coat, and the coat: long ragged strips from the shoulders
      P(body, A.cyl(.2, .14, .9, 6), skin, [0, 2.15, 0], { scale: [1, 1, .7] });
      P(body, A.cyl(.26, .2, .22, 7), cloth, [0, 2.5, 0], { scale: [1, 1, .75] });   // the shoulders of the coat
      const strips = [];
      for (let i = 0; i < (old ? 11 : 8); i++) {
        const a = (i / (old ? 11 : 8)) * Math.PI * 1.6 - Math.PI * .8 + Math.PI, c = G(body, [Math.sin(a) * .22, 2.55, Math.cos(a) * .16], [0, a, 0]);
        const len = 1.9 + ((i * 41) % 5) * .14 - (young ? .5 : 0), w = .07 + (i % 2) * .03;
        sheet(c, [[-w, 0, 0], [w, 0, 0], [w * .7, -len, .04], [0, -len - .22, .05], [-w * .8, -len + .1, .04]], [[0, 1, 2], [0, 2, 3], [0, 3, 4]], cloth);
        strips.push({ c, ph: i * 1.3 });
      }
      // arms: too long, hanging, the fingers longer still
      const arms = [];
      for (const sx of [-1, 1]) {
        const sh = G(body, [sx * .24, 2.5, 0]);
        bone(sh, [0, 0, 0], [sx * .08, -.9, .05], .05, .04, skin); P(sh, A.ico(.05, 1), skinD, [sx * .08, -.9, .05]);
        bone(sh, [sx * .08, -.9, .05], [sx * .05, -1.85, .12], .04, .03, skin);
        for (let f = 0; f < 4; f++) bone(sh, [sx * .05, -1.85, .12], [sx * (.02 + f * .025), -2.25 - (f % 2) * .05, .14 + f * .02], .012, .005, skin, 4);
        arms.push(sh);
      }
      if (old) {                                                         // a staff of bare branch, which it leans on; moss on its shoulders
        bone(body, [.32, 1.0, .25], [.36, -.05, .3], .035, .03, A.M.woodD, 5); bone(body, [.32, 1.0, .25], [.3, 2.3, .22], .035, .025, A.M.woodD, 5);
        arms[1].rotation.set(-.12, 0, -.08);
        for (let k = 0; k < 9; k++) P(body, A.ico(.07 + r() * .05, 0), moss, [(r() - .5) * .5, 2.6 + r() * .05, (r() - .5) * .3], { scale: [1.2, .5, 1], cast: false });
      }
      // the head: smooth and pale, no face at all
      const neck = G(body, [0, 2.62, 0]), head = G(neck, [0, .18, .03]); if (young) head.scale.setScalar(1.3);
      bone(neck, [0, 0, 0], [0, .2, .03], .05, .045, skin);
      P(head, A.ico(.15, 2), headM, [0, 0, 0], { scale: [.85, 1.15, .95], jitter: .004 });
      // the antlers, every tip an ear: each stands upright, its opening (+z of its holder) turned to listen
      const ears = [];
      const makeEar = (parent, at, s, withered) => {
        const e = G(parent, at), cup = G(e);
        P(cup, new T.ConeGeometry(.1 * s, .3 * s, 6, 1, true), withered ? dead : earM, [0, .15 * s, 0], { scale: [1, 1, .45], cast: false });
        if (!withered) P(cup, new T.ConeGeometry(.07 * s, .24 * s, 6), earIn, [0, .14 * s, .02 * s], { scale: [1, 1, .25], cast: false });
        ears.push({ e, ph: r() * 9, withered }); return e;
      };
      const tips = [];
      const branch = (from, dir, len, depth) => {
        const to = [from[0] + dir[0] * len, from[1] + dir[1] * len, from[2] + dir[2] * len];
        bone(head, from, to, .03 * (depth + 1) * .7, .02 * (depth + .6) * .6, antler, 5);
        if (depth === 0) { tips.push(to); return; }
        if (old && depth === 2 && r() < .6) P(head, A.ico(.06, 0), moss, to, { scale: [1.3, .6, 1.3], cast: false });
        for (const s of [-1, 1]) {
          const d = V(dir[0] + s * .45 * (r() + .4), dir[1] + .1, dir[2] + (r() - .5) * .5).normalize();
          branch(to, [d.x, d.y, d.z], len * .62, depth - 1);
        }
      };
      if (young) {                                                       // stub antlers, and one great pair of ears
        for (const sx of [-1, 1]) { bone(head, [sx * .07, .12, 0], [sx * .15, .26, -.03], .035, .025, antler, 5); makeEar(head, [sx * .2, .3, -.03], 2.4, false); }
      } else {
        for (const sx of [-1, 1]) branch([sx * .07, .12, 0], [sx * .55, .83, -.1], old ? .62 : .55, old ? 4 : 3);
        for (const t of tips) makeEar(head, t, old ? .7 : 1, old && r() < .3);
      }
      merge(body);
      if (young) {                                                       // the bush it hides behind
        const leaf = A.mat('#2f4424', 0, 1), leafD = A.mat('#23341c', 0, 1);
        for (let k = 0; k < 7; k++) P(root, A.ico(.42 + r() * .25, 1), k % 2 ? leaf : leafD, [base[0] + (k - 3) * .32, .35 + r() * .3, base[2] - 1.0 - r() * .3], { jitter: .08 });
      }
      const kn = V(), tmp = V();
      return (t) => {
        A.K.J.hips.getWorldPosition(kn); kn.y += 1;
        if (young) {                                                     // down behind the bush; up to peek; down again
          const k = (t % 9) / 9, up = smooth(.15, .3, k) * (1 - smooth(.72, .85, k));
          body.position.y = -1.1 * (1 - up); body.rotation.x = .25 * (1 - up);
          head.rotation.z = Math.sin(t * 1.7) * .2 * up;
        } else {
          head.rotation.z = old ? Math.sin(t * .05) * .06 : Math.sin(t * .23) * .25 + pulse(t, 11, 2) * .35;   // the head tilts, listening (the old: hardly at all)
          head.rotation.x = .1 + Math.sin(t * .17) * (old ? .015 : .06);
          body.rotation.x = old ? .06 : 0;
        }
        // every living ear turns toward him, with a flick now and then (the young: restless, turning about)
        for (const { e, ph, withered } of ears) {
          if (withered) { e.rotation.set(1.2, 0, 0); continue; }
          e.getWorldPosition(tmp); e.lookAt(kn.x, tmp.y, kn.z);
          if (young) e.rotateY(Math.sin(t * 2.3 + ph) * .8 * (1 - pulse(t + ph, 5, 2)));
          e.rotateX(-pulse(t + ph, (old ? 9 : 3.5) + ph * .3, .3) * .6);
        }
        arms.forEach((a, i) => { if (!(old && i === 1)) a.rotation.x = Math.sin(t * .3 + i) * .03; });
        strips.forEach(({ c, ph }) => { c.rotation.x = Math.sin(t * .7 + ph) * .04; });   // the coat stirs
      };
    },
  },

  // ================================================================ THE DREAM-LEECH
  leech: {
    name: 'The Dream-Leech', hour: 22,
    blurb: 'Seen only by those who have seen enough. A long, clear thing that swims through the night air as if it were water. Small stars drift inside it, and dreams: a lit window, a ship, a horse, a door, flickering and fading as they go down its length. Now and then it sinks low over the roof where the knight sleeps, its round mouth opening, and his dreams rise into it. He wakes having dreamed something that was not his.',
    view: [[-4, 4.5, 13], [-2, 6.6, -.5]],
    views: { young: [[-4, 3.8, 10.5], [-2, 5.6, -.5]], old: [[-4, 4, 19], [-2, 8, -.5]] },
    knight: { place: 'bedroll', action: 'sleep', emote: 'zzz', note: 'dreaming something that is not his' },
    build(root) {
      // One continuous clear body (not beads on a string), rebuilt each frame along the path its head
      // has taken, so the body truly follows the head. Annulated like a leech, a little flattened, an
      // undulation running down it as it swims; a fin rippling along each side; no eyes, no face: at
      // the front only a round mouth ringed with fine teeth, and feelers drifting. Inside: a core of
      // light, small stars, and dreams (little lit pictures) that drift back down its length and fade,
      // as if digested. Every so often it sinks low over the keep's roof, circles slowly with its mouth
      // open, and motes of light rise from the roof into it.
      // Young: small, quick and restless, only a few dreams in it, swimming low over the roof.
      // Old: vast and slow, its skin clouded and scarred, so full of old dreams that they trail out
      // behind it in a long wake.
      const v = root.userData.appearance?.variant || {}, young = v.age === 'young', old = v.age === 'old';
      const S = (v.size || 1) * (young ? .4 : old ? 1.5 : 1);
      const LEN = 9 * S, RAD = 1.0 * S, NR = 44, NM = 12, SEG = LEN / (NR - 1);
      const speed = young ? .17 : old ? .05 : .085;                       // around its circuit, per second
      const CX = -2, CZ = -.5, AX = young ? 6.4 : old ? 9.5 : 7.5, AZ = young ? 5.0 : old ? 7.0 : 5.5, BY = young ? 5.6 : old ? 8.6 : 6.7;
      const path = (s, o) => o.set(CX + Math.cos(s) * AX, BY + Math.sin(s * 2) * (young ? .35 : .6), CZ + Math.sin(s) * AZ);
      const r = A.rand(23);
      // ---- the skin: a grid of rings, built each frame
      const nv = NR * (NM + 1), posA = new Float32Array(nv * 3), coreA = new Float32Array(nv * 3), uvA = new Float32Array(nv * 2), idx = [];
      for (let i = 0; i < NR; i++) for (let m = 0; m <= NM; m++) { uvA.set([m / NM, i / (NR - 1)], (i * (NM + 1) + m) * 2); if (i < NR - 1 && m < NM) { const a = i * (NM + 1) + m, b = a + NM + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); } }
      const skinG = new T.BufferGeometry(); skinG.setAttribute('position', new T.BufferAttribute(posA, 3)); skinG.setAttribute('uv', new T.BufferAttribute(uvA, 2)); skinG.setIndex(idx);
      const coreG = new T.BufferGeometry(); coreG.setAttribute('position', new T.BufferAttribute(coreA, 3)); coreG.setIndex(idx);
      const bands = canvasTex(32, 512, (c, w, h) => {                       // the rings of a leech; on the old, clouding and old scars
        c.fillStyle = old ? '#a9b4cc' : '#b9c8ee'; c.fillRect(0, 0, w, h);
        for (let k = 0; k < 46; k++) { c.fillStyle = `rgba(40,50,90,${k % 3 ? .18 : .32})`; c.fillRect(0, k / 46 * h, w, 2.5); }
        if (old) { const q = A.rand(9); for (let k = 0; k < 9; k++) { c.fillStyle = `rgba(30,30,50,${.3 + q() * .3})`; c.fillRect(q() * w * .6, q() * h, 4 + q() * w * .5, 3 + q() * 12); } }
      });
      const skinM = new T.MeshStandardMaterial({ color: '#ffffff', map: bands, transparent: true, opacity: old ? .4 : young ? .26 : .3, roughness: .18, metalness: .1,
                                                 emissive: young ? '#4a4a8e' : '#33457e', emissiveIntensity: .75, emissiveMap: bands, flatShading: true, depthWrite: false, side: T.DoubleSide });
      const skin = new T.Mesh(skinG, skinM); skin.frustumCulled = false; root.add(skin);
      const core = new T.Mesh(coreG, new T.MeshBasicMaterial({ color: old ? '#28356a' : '#2c3f8c', transparent: true, opacity: .42, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
      core.frustumCulled = false; root.add(core);
      // ---- the fins: a membrane along each side, rippling
      const NF = 22, F0 = .16, F1 = .82, finA = [new Float32Array(NF * 2 * 3), new Float32Array(NF * 2 * 3)], finIdx = [];
      for (let i = 0; i < NF - 1; i++) { const a = i * 2; finIdx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      const finM = new T.MeshStandardMaterial({ color: '#c3d0f6', transparent: true, opacity: .2, roughness: .2, emissive: '#3d5098', emissiveIntensity: .6, flatShading: true, depthWrite: false, side: T.DoubleSide });
      const fins = finA.map(arr => { const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.BufferAttribute(arr, 3)); gg.setIndex(finIdx); const m = new T.Mesh(gg, finM); m.frustumCulled = false; root.add(m); return gg; });
      // ---- the mouth: a ring of fine teeth at the open front; feelers drifting round it
      const rimM = new T.MeshStandardMaterial({ color: '#b9c6ee', emissive: '#5f74c4', emissiveIntensity: .7, flatShading: true, transparent: true, opacity: .55, depthWrite: false });
      const mouth = G(root), lip = new T.Mesh(new T.TorusGeometry(1, .06, 5, 20), rimM); mouth.add(lip);
      const teeth = G(mouth);
      for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283; P(teeth, new T.ConeGeometry(.035, .2, 3), rimM, [Math.cos(a) * .95, Math.sin(a) * .95, -.08], { rot: [0, 0, a + Math.PI / 2], cast: false, jitter: 0 }); }
      const NFe = 7, FS = 5, feelA = new Float32Array(NFe * FS * 2 * 3), feelG = new T.BufferGeometry(); feelG.setAttribute('position', new T.BufferAttribute(feelA, 3));
      const feel = new T.LineSegments(feelG, new T.LineBasicMaterial({ color: '#c8d4ff', transparent: true, opacity: .5, fog: false })); feel.frustumCulled = false; root.add(feel);
      const glowH = softLight('#8fa6ff', 3, 4.5 * Math.max(.6, S)); root.add(glowH);
      // ---- inside: stars, and dreams
      const NSt = young ? 22 : old ? 150 : 70, stA = new Float32Array(NSt * 3), stars = Array.from({ length: NSt }, () => ({ f: .04 + r() * .9, a: r() * 6.28, rr: r() * .75, sp: (r() - .5) * .4 }));
      const stG = new T.BufferGeometry(); stG.setAttribute('position', new T.BufferAttribute(stA, 3));
      const stP = new T.Points(stG, new T.PointsMaterial({ color: '#fff6dc', size: .07 * Math.max(.7, S), transparent: true, opacity: .9, depthWrite: false, fog: false })); stP.frustumCulled = false; root.add(stP);
      const DRAW = [   // little dream-pictures, each a few strokes of light
        c => { c.fillRect(18, 30, 28, 22); c.beginPath(); c.moveTo(14, 31); c.lineTo(32, 14); c.lineTo(50, 31); c.fill(); c.clearRect(29, 38, 7, 8); },                         // a house, its window lit (a hole of light)
        c => { c.fillRect(30, 34, 5, 22); c.beginPath(); c.arc(32, 26, 15, 0, 6.3); c.fill(); },                                                                         // a tree
        c => { c.beginPath(); c.moveTo(10, 40); c.lineTo(54, 40); c.lineTo(46, 50); c.lineTo(18, 50); c.fill(); c.fillRect(31, 12, 2, 28); c.beginPath(); c.moveTo(33, 14); c.lineTo(48, 36); c.lineTo(33, 36); c.fill(); },   // a ship
        c => { c.beginPath(); c.ellipse(32, 30, 15, 8, 0, 0, 6.3); c.fill(); c.fillRect(42, 16, 6, 16); c.beginPath(); c.ellipse(49, 15, 6, 4, -.5, 0, 6.3); c.fill(); for (const x of [21, 26, 37, 42]) c.fillRect(x, 34, 3, 16); },   // a horse
        c => { c.beginPath(); c.moveTo(20, 56); c.lineTo(20, 24); c.arc(32, 24, 12, Math.PI, 0); c.lineTo(44, 56); c.fill(); },                                       // a door, open on light
        c => { c.beginPath(); c.arc(32, 32, 16, .5, 5.8); c.arc(40, 30, 13, 5.6, .7, true); c.fill(); },                                                              // a moon
        c => { c.beginPath(); c.arc(32, 16, 6, 0, 6.3); c.fill(); c.fillRect(28, 22, 8, 18); c.fillRect(26, 40, 4, 16); c.fillRect(34, 40, 4, 16); c.fillRect(22, 24, 4, 14); c.fillRect(38, 24, 4, 14); },   // someone
        c => { c.beginPath(); c.moveTo(8, 30); c.quadraticCurveTo(20, 18, 32, 32); c.quadraticCurveTo(44, 18, 56, 30); c.quadraticCurveTo(44, 24, 32, 38); c.quadraticCurveTo(20, 24, 8, 30); c.fill(); },   // a bird
        c => { c.beginPath(); c.arc(22, 32, 9, 0, 6.3); c.fill(); c.fillRect(28, 29, 26, 5); c.fillRect(46, 34, 4, 8); c.fillRect(40, 34, 3, 6); },                  // a key
        c => { c.beginPath(); c.ellipse(30, 32, 18, 9, 0, 0, 6.3); c.fill(); c.beginPath(); c.moveTo(46, 32); c.lineTo(58, 22); c.lineTo(58, 42); c.fill(); },         // a fish
        c => { c.fillRect(28, 26, 8, 26); c.beginPath(); c.ellipse(32, 18, 4, 8, 0, 0, 6.3); c.fill(); },                                                              // a candle
        c => { c.beginPath(); c.moveTo(12, 44); c.lineTo(20, 22); c.lineTo(28, 36); c.lineTo(32, 18); c.lineTo(36, 36); c.lineTo(44, 22); c.lineTo(52, 44); c.fill(); },   // a crown
      ];
      const dreamTex = DRAW.map(d => canvasTex(64, 64, (c, w) => { c.filter = 'blur(1.6px)'; c.fillStyle = '#fff'; c.shadowColor = '#fff'; c.shadowBlur = 10; d(c); }));   // (glimpses, not pictures)
      const ND = young ? 3 : old ? 14 : 9, dreams = [];
      for (let k = 0; k < ND; k++) {
        const sp = new T.Sprite(new T.SpriteMaterial({ map: dreamTex[(k * 5) % DRAW.length], color: ['#ffe3b0', '#cfe0ff', '#ffd0c8', '#e8ffd8'][k % 4], transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
        sp.scale.setScalar(.55 * Math.max(.75, S)); root.add(sp);
        dreams.push({ sp, f: .12 + r() * .7, a: r() * 6.28, rr: r() * .45, born: -r() * 30, tex: k });
      }
      // the old: a wake of old dreams trailing out behind it
      const NW = old ? 90 : 0, wA = new Float32Array(Math.max(1, NW) * 3), wake = Array.from({ length: NW }, () => ({ d: r(), a: r() * 6.28, rr: r() })).sort((a, b) => a.d - b.d);
      const wakeD = wake.map(q => LEN + q.d * LEN * .55), wakeP = wake.map(() => V());
      const wG = new T.BufferGeometry(); wG.setAttribute('position', new T.BufferAttribute(wA, 3));
      const wP = new T.Points(wG, new T.PointsMaterial({ color: '#ffe8c4', size: .09, transparent: true, opacity: .6, depthWrite: false, fog: false })); wP.frustumCulled = false; if (old) root.add(wP);
      // feeding: motes rising from the roof into its mouth
      const NM2 = young ? 10 : 26, fA = new Float32Array(NM2 * 3), fG = new T.BufferGeometry(); fG.setAttribute('position', new T.BufferAttribute(fA, 3));
      const fP = new T.Points(fG, new T.PointsMaterial({ color: '#ffe6b8', size: .09, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false })); fP.frustumCulled = false; root.add(fP);
      // ---- the path its head has taken (newest first): the body is laid along it
      const trail = [], head = V(), tmp = V(), tmp2 = V(), want = V(), feed = V(.4, 5.5 + (young ? -.2 : 0) + (old ? .8 : 0), -.3);
      const MAXT = Math.ceil((old ? 1.6 : 1.05) * (NR - 1) * 2) + 6, STEP = SEG * .5;   // (a point every half segment; long enough for the body, and the old one's wake)
      let s = Math.random() * 6.28;
      for (let k = 0; k < MAXT; k++) { path(s - k * STEP / ((AX + AZ) / 2), tmp); trail.push(tmp.clone()); }   // (as if it had already been swimming)
      path(s, head);
      const pts = Array.from({ length: NR }, () => V()), tan = Array.from({ length: NR }, () => V()), upv = Array.from({ length: NR }, () => V()), side = Array.from({ length: NR }, () => V());
      const lay = (dists, outs) => {                                          // points so far back along its path (dists in order): one walk down the trail
        let prev = head, k = 0, done = 0, j = 0;
        while (j < dists.length) {
          const q = trail[Math.min(k, trail.length - 1)], l = prev.distanceTo(q);
          if (dists[j] - done <= l || k >= trail.length - 1) { outs[j].copy(prev).lerp(q, l ? Math.min(1, (dists[j] - done) / l) : 0); j++; continue; }
          done += l; prev = q; k++;
        }
      };
      const bodyD = Array.from({ length: NR }, (_, i) => i * SEG);
      const radius = f => f < .08 ? RAD * (.42 + .58 * Math.sin(f / .08 * Math.PI / 2)) : f < .3 ? RAD : RAD * (.96 * (1 - Math.pow((f - .3) / .7, 1.25)) + .04);
      let feedK = 0, nextFeed = 25 + r() * 20, feedEnd = -1, mouthOpen = .55, last = 0;
      const W = V(0, 1, 0);
      return (t, dt = 1 / 60) => {
        dt = Math.min(dt, .1);
        if (t < last) { feedEnd = -1; nextFeed = t + 20; } last = t;
        // where its head goes: round its circuit; now and then down over the roof to feed, circling slowly
        if (t > nextFeed && feedEnd < 0) feedEnd = t + (young ? 9 : 15);
        if (feedEnd > 0 && t > feedEnd) { feedEnd = -1; nextFeed = t + (young ? 30 : 50) + nz(Math.floor(t)) * 40; }
        feedK += ((feedEnd > 0 ? 1 : 0) - feedK) * (1 - Math.exp(-dt * .5));
        s += speed * dt * (1 - feedK * .75);
        path(s, want);
        tmp.set(feed.x + Math.cos(t * .35) * 1.4 * S, feed.y + Math.sin(t * .6) * .15, feed.z + Math.sin(t * .35) * 1.1 * S);
        want.lerp(tmp, feedK);
        head.lerp(want, 1 - Math.exp(-dt * 2.2));
        if (head.distanceTo(trail[0]) >= STEP) { const q = trail.pop(); trail.unshift(q.copy(head)); }
        // the spine, its direction, and which way is up for it; an undulation runs down it as it swims
        lay(bodyD, pts);
        for (let i = 0; i < NR; i++) {
          tan[i].copy(pts[Math.max(0, i - 1)]).sub(pts[Math.min(NR - 1, i + 1)]).normalize();
          upv[i].copy(W).addScaledVector(tan[i], -tan[i].dot(W)).normalize(); side[i].crossVectors(tan[i], upv[i]);
          const f = i / (NR - 1), wave = Math.sin(f * 9 - t * (young ? 3.4 : old ? 1.2 : 2)) * (.12 + f * .3) * S;
          pts[i].addScaledVector(upv[i], wave); pts[i].addScaledVector(side[i], Math.sin(f * 5 - t * .9) * .1 * f * S);
        }
        // the skin and the core
        for (let i = 0; i < NR; i++) {
          const f = i / (NR - 1), br = 1 + Math.sin(t * 1.4 - i * .3) * .05, rr = radius(f) * br * (i === 0 ? (mouthOpen / .55) : 1);
          for (let m = 0; m <= NM; m++) {
            const a = m / NM * 6.283, cs = Math.cos(a), sn = Math.sin(a), o = (i * (NM + 1) + m) * 3;
            tmp.copy(pts[i]).addScaledVector(side[i], cs * rr).addScaledVector(upv[i], sn * rr * .72);
            posA[o] = tmp.x; posA[o + 1] = tmp.y; posA[o + 2] = tmp.z;
            tmp.copy(pts[i]).addScaledVector(side[i], cs * rr * .42).addScaledVector(upv[i], sn * rr * .3);
            coreA[o] = tmp.x; coreA[o + 1] = tmp.y; coreA[o + 2] = tmp.z;
          }
        }
        skinG.attributes.position.needsUpdate = true; skinG.computeVertexNormals(); skinG.computeBoundingSphere();
        coreG.attributes.position.needsUpdate = true;
        // the fins ripple, a wave running back along them
        fins.forEach((gg, sd) => {
          const arr = finA[sd], sg = sd ? 1 : -1;
          for (let k = 0; k < NF; k++) {
            const f = F0 + (F1 - F0) * k / (NF - 1), i = Math.round(f * (NR - 1)), w = Math.sin((k / (NF - 1)) * Math.PI) * .55 * S;
            const rr = radius(f) * .98, rip = Math.sin(k * .9 - t * (young ? 5 : old ? 2 : 3.2)) * .22 * S;
            tmp.copy(pts[i]).addScaledVector(side[i], sg * rr); arr.set([tmp.x, tmp.y, tmp.z], k * 6);
            tmp.addScaledVector(side[i], sg * w).addScaledVector(upv[i], rip); arr.set([tmp.x, tmp.y, tmp.z], k * 6 + 3);
          }
          gg.attributes.position.needsUpdate = true; gg.computeVertexNormals();
        });
        // the mouth: at the open front, turned the way it swims; wider while it feeds
        mouthOpen += ((feedK > .5 ? .8 : .55 + Math.sin(t * .7) * .04) - mouthOpen) * (1 - Math.exp(-dt * 1.5));
        const r0 = radius(0) * (mouthOpen / .55);
        mouth.position.copy(pts[0]); tmp.copy(pts[0]).add(tan[0]); mouth.lookAt(tmp);
        mouth.scale.set(r0, r0 * .72, r0); teeth.rotation.z = Math.sin(t * .8) * .1;
        glowH.position.copy(pts[2]); glowH.intensity = 2.6 + Math.sin(t * 1.4) * .6 + feedK * 1.5;
        for (let k = 0; k < NFe; k++) {                                         // feelers: from the lip, forward, drifting
          const a = k / NFe * 6.283 + .3;
          tmp.copy(pts[0]).addScaledVector(side[0], Math.cos(a) * r0).addScaledVector(upv[0], Math.sin(a) * r0 * .72);
          for (let j = 0; j < FS; j++) {
            const o = (k * FS + j) * 6; feelA.set([tmp.x, tmp.y, tmp.z], o);
            tmp.addScaledVector(tan[0], .16 * S).addScaledVector(side[0], (Math.cos(a) * .05 + Math.sin(t * 1.3 + k + j) * .05) * S).addScaledVector(upv[0], (Math.sin(a) * .05 + Math.cos(t * 1.1 + k * 2 + j) * .05) * S);
            feelA.set([tmp.x, tmp.y, tmp.z], o + 3);
          }
        }
        feelG.attributes.position.needsUpdate = true;
        // inside: the stars drift; the dreams go slowly down its length and fade, and new ones come in at the front
        const inside = (f, a, rr, out) => { const i = Math.min(NR - 1, Math.round(f * (NR - 1))), R_ = radius(f) * rr; return out.copy(pts[i]).addScaledVector(side[i], Math.cos(a) * R_).addScaledVector(upv[i], Math.sin(a) * R_ * .7); };
        stars.forEach((q, k) => { q.a += q.sp * dt; inside(q.f, q.a, q.rr, tmp); stA.set([tmp.x, tmp.y, tmp.z], k * 3); });
        stG.attributes.position.needsUpdate = true;
        for (const d of dreams) {
          d.f += dt * (young ? .02 : .008) * (1 + feedK); d.a += dt * .2;
          if (d.f > .86) { d.f = .1 + r() * .08; d.born = t; d.tex = (d.tex + 3) % DRAW.length; d.sp.material.map = dreamTex[d.tex]; }
          inside(d.f, d.a, d.rr, tmp); d.sp.position.copy(tmp);
          const fade = smooth(.1, .2, d.f) * (1 - smooth(.62, .86, d.f)), flick = .6 + .4 * Math.sin(t * 7 + d.tex * 3) * Math.sin(t * 2.3 + d.tex);
          d.sp.material.opacity = fade * flick * .55;
        }
        if (old) { lay(wakeD, wakeP); wake.forEach((q, k) => { tmp.copy(wakeP[k]); tmp.x += Math.cos(q.a + t * .1) * q.rr * .8 * (1 + q.d); tmp.y += Math.sin(q.a + t * .13) * q.rr * .6 * (1 + q.d); wA.set([tmp.x, tmp.y, tmp.z], k * 3); }); wG.attributes.position.needsUpdate = true; wP.material.opacity = .55; }
        // feeding: motes of light rise from the roof, up into its mouth
        fP.material.opacity = feedK * .85;
        if (feedK > .02) for (let k = 0; k < NM2; k++) {
          const u = (t * .25 + k / NM2) % 1, sx = Math.sin(k * 3.1) * 2.2, sz = Math.cos(k * 2.3) * 1.8;
          tmp.set(sx, 4.4, sz); tmp2.copy(pts[0]); tmp.lerp(tmp2, u * u); tmp.x += Math.sin(u * 6 + k) * .2; fA.set([tmp.x, tmp.y, tmp.z], k * 3);
        }
        fG.attributes.position.needsUpdate = true;
      };
    },
  },

  // ================================================================ THE SEAM
  seam: {
    name: 'The Seam', hour: 22,
    blurb: 'Seen only by those who have seen enough. A tear in the air above the courtyard, its edges bright and torn like cloth. Through it is somewhere else: a dim violet space, and something enormous moving slowly past. It opens wider while it is watched. Sometimes a long pale hand comes through, takes hold of the edge, and feels its way out toward the knight.',
    view: [[-7.0, 2.2, 4.9], [-11.4, 3.7, -.3]],
    knight: { place: 'courtyard', action: 'stand', emote: 'exclaim', note: 'very still, in case the hand is looking for him' },
    build(root) {
      // The tear is a real opening: what is on the other side is drawn only where the tear is (a
      // stencil), set far back behind it, so it shifts with depth as the camera moves, as a room seen
      // through a window does. Its edges are torn and bright and never quite still; threads of the
      // torn air stretch across the gap and snap as it widens. It widens while it is watched (its
      // tell; here, by whoever is watching the page), and when the hand pulls on it.
      const g = G(root, [-11.5, 4.1, -.3], [0, .45, 0]), H = 4.6, NY = 30;
      const STENCIL = { stencilWrite: true, stencilRef: 1, stencilFunc: T.EqualStencilFunc, stencilFail: T.KeepStencilOp, stencilZFail: T.KeepStencilOp, stencilZPass: T.KeepStencilOp };
      const behind = (m, order) => { m.renderOrder = order; m.frustumCulled = false; return m; };
      // ---- the opening: a strip between its two torn edges, rebuilt each frame
      const L = new Float32Array((NY + 1) * 3), Rr = new Float32Array((NY + 1) * 3), hole = new Float32Array((NY + 1) * 2 * 3), hIdx = [];
      for (let i = 0; i < NY; i++) { const a = i * 2; hIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const holeG = new T.BufferGeometry(); holeG.setAttribute('position', new T.BufferAttribute(hole, 3)); holeG.setIndex(hIdx);
      const holeM = new T.MeshBasicMaterial({ color: '#07040f', transparent: true, depthWrite: false, fog: false, side: T.DoubleSide,
        stencilWrite: true, stencilRef: 1, stencilFunc: T.AlwaysStencilFunc, stencilZPass: T.ReplaceStencilOp });
      g.add(behind(new T.Mesh(holeG, holeM), 10));
      const sn = (sd, x) => { const k = Math.floor(x), f = x - k, e = f * f * (3 - 2 * f); return nz(sd + k) * (1 - e) + nz(sd + k + 1) * e; };   // smooth noise
      const jag = Array.from({ length: NY + 1 }, (_, i) => [.7 + sn(11, i * .3) * .5 + nz(i * 3.1) * .12, .7 + sn(37, i * .27) * .5 + nz(i * 5.7 + 2) * .12]);   // each edge torn its own way: long ragged runs, small splinters
      const halfW = (i, w, t) => { const y = i / NY * 2 - 1, env = Math.pow(Math.max(0, 1 - y * y), .7); return w * env; };
      // ---- the other side: a dim violet space, something vast drifting past, motes
      const far = canvasTex(512, 512, (c, w) => {
        c.fillStyle = '#0a0618'; c.fillRect(0, 0, w, w); const q = A.rand(17);
        for (let k = 0; k < 14; k++) { const gr = c.createRadialGradient(q() * w, q() * w, 0, q() * w, q() * w, 60 + q() * 150); gr.addColorStop(0, `rgba(${90 + q() * 60},${40 + q() * 40},${150 + q() * 80},.35)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, w); }
        for (let k = 0; k < 420; k++) { c.fillStyle = `rgba(235,225,255,${.25 + q() * .75})`; const s = q() < .08 ? 2 : 1; c.fillRect(q() * w, q() * w, s, s); }
      });
      const back = behind(new T.Mesh(new T.PlaneGeometry(90, 90), new T.MeshBasicMaterial({ map: far, transparent: true, depthTest: false, depthWrite: false, fog: false, ...STENCIL })), 11);
      back.position.z = -45; g.add(back);
      // the vast thing: a long, pale, ridged body sliding slowly past, rows of faint lights along it
      const vast = G(g, [0, 0, -34]);
      const curve = new T.CatmullRomCurve3([V(-40, -10, 0), V(-18, -3, -5), V(0, 2, 0), V(18, -1, 5), V(40, -9, 0)]);
      const vM = new T.MeshBasicMaterial({ color: '#251c3a', transparent: true, depthTest: false, depthWrite: false, fog: false, ...STENCIL });
      const ridgeM = new T.MeshBasicMaterial({ color: '#33284f', transparent: true, depthTest: false, depthWrite: false, fog: false, ...STENCIL });
      vast.add(behind(new T.Mesh(A.facet(new T.TubeGeometry(curve, 70, 5.5, 12), .6, 5), vM), 12));
      const ridges = G(vast);
      for (let k = 0; k < 34; k++) { const u = (k + nz(k) * .6) / 34, p = curve.getPointAt(u); const m = new T.Mesh(A.facet(new T.TorusGeometry(5.5 + nz(k + 9) * .3, .2 + nz(k + 3) * .35, 4, 14), .3, k), ridgeM); m.position.copy(p); m.lookAt(curve.getPointAt(Math.min(1, u + .01))); ridges.add(m); }
      merge(ridges); ridges.children.forEach(m => behind(m, 13));
      const NL = 60, lA = new Float32Array(NL * 3);
      for (let k = 0; k < NL; k++) { const u = (k % 30 + nz(k) * .5) / 30, p = curve.getPointAt(u); lA.set([p.x, p.y + (k < 30 ? 4.2 : -3.9) + nz(k + 5), p.z + 3.6], k * 3); }
      const lG = new T.BufferGeometry(); lG.setAttribute('position', new T.BufferAttribute(lA, 3));
      const lights = behind(new T.Points(lG, new T.PointsMaterial({ color: '#d8c8ff', size: .35, transparent: true, depthTest: false, depthWrite: false, fog: false, ...STENCIL })), 14); vast.add(lights);
      const NMo = 50, moA = new Float32Array(NMo * 3), motes = Array.from({ length: NMo }, () => ({ x: (nz(Math.random() * 99) - .5) * 6, y: (Math.random() - .5) * 6, z: -2 - Math.random() * 12, sp: .2 + Math.random() * .4 }));
      const moG = new T.BufferGeometry(); moG.setAttribute('position', new T.BufferAttribute(moA, 3));
      g.add(behind(new T.Points(moG, new T.PointsMaterial({ color: '#c9b8ff', size: .05, transparent: true, opacity: .8, depthTest: false, depthWrite: false, fog: false, ...STENCIL })), 15));
      // ---- the torn edges: a bright thin lip, a soft glow outside it
      const NE = (NY + 1) * 2, lipA = new Float32Array(NE * 2 * 3), gloA = new Float32Array(NE * 2 * 3), eUV = new Float32Array(NE * 2 * 2), eIdx = [];
      for (let k = 0; k < NE; k++) { eUV.set([0, 0, 1, 0], k * 4); if (k < NE - 1 && k !== NY) { const a = k * 2; eIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
      const ribbon = (arr, mat, order) => { const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.BufferAttribute(arr, 3)); gg.setAttribute('uv', new T.BufferAttribute(eUV, 2)); gg.setIndex(eIdx); g.add(behind(new T.Mesh(gg, mat), order)); return gg; };
      const fade = canvasTex(64, 4, (c, w) => { const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, 4); });
      const lipM = new T.MeshBasicMaterial({ color: '#efe4ff', transparent: true, opacity: .95, depthWrite: false, fog: false, side: T.DoubleSide });
      const gloM = new T.MeshBasicMaterial({ color: '#8a6cf0', map: fade, transparent: true, opacity: .4, depthWrite: false, blending: T.AdditiveBlending, fog: false, side: T.DoubleSide });
      const lipG = ribbon(lipA, lipM, 16), gloG = ribbon(gloA, gloM, 17);
      // threads of torn air across the gap: they stretch, and snap when it opens too wide (then hang from the edges)
      const NT = 8, thA = new Float32Array(NT * 4 * 3 * 2), threads = Array.from({ length: NT }, (_, k) => ({ i: 4 + Math.round(nz(k * 7.3) * (NY - 8)), snap: .45 + nz(k * 2.9) * .5, ph: k * 1.7 }));
      const thG = new T.BufferGeometry(); thG.setAttribute('position', new T.BufferAttribute(thA, 3));
      g.add(behind(new T.LineSegments(thG, new T.LineBasicMaterial({ color: '#e6dcff', transparent: true, opacity: .7, depthWrite: false, fog: false })), 18));
      // ---- what comes out: cold motes and frost, a violet light, the fire flinching when it is wide
      const NC = 40, cA = new Float32Array(NC * 3), cold = Array.from({ length: NC }, (_, k) => ({ ph: nz(k * 1.3), x: nz(k * 4.1) - .5, sp: .3 + nz(k * 8.3) * .4 }));
      const cG = new T.BufferGeometry(); cG.setAttribute('position', new T.BufferAttribute(cA, 3));
      const coldP = new T.Points(cG, new T.PointsMaterial({ color: '#dfe6ff', size: .04, transparent: true, opacity: .7, depthWrite: false, fog: false })); coldP.frustumCulled = false; root.add(coldP);
      const frost = new T.Mesh(new T.CircleGeometry(2.4, 24), new T.MeshBasicMaterial({ color: '#cfd8f0', transparent: true, opacity: 0, depthWrite: false }));
      frost.rotation.x = -Math.PI / 2; frost.position.set(-11.1, .025, .3); root.add(frost);
      const lamp = softLight('#b9a2ff', 4, 6); lamp.position.set(0, 0, .6); g.add(lamp);
      // ---- the hand: long and pale, on sprung joints (it has weight; the fingers trail and feel)
      const pale = A.mat('#ddd6ca', 0, .5, { emissive: '#4a4458', emissiveIntensity: .7 }), paleD = A.mat('#bfb6ac', 0, .55, { emissive: '#363048', emissiveIntensity: .65 });
      const R = rig(), arm = G(g, [0, -.3, -4.6]);                            // its root moves: deep inside, or near the opening
      const sh = R.add('sh', G(arm), 3.2, .8);
      bone(sh, [0, 0, 0], [0, 0, 1.35], .125, .095, pale, 7); P(sh, A.ico(.1, 1), paleD, [0, 0, 1.35]);
      const el = R.add('el', G(sh, [0, 0, 1.35]), 3.6, .75);
      bone(el, [0, 0, 0], [0, 0, 1.3], .095, .065, pale, 7);
      const wr = R.add('wr', G(el, [0, 0, 1.3]), 5, .6);
      P(wr, A.ico(.07, 1), paleD); P(wr, A.ico(.15, 1), pale, [0, 0, .17], { scale: [1.05, .38, 1.25], jitter: .008 });   // a long, thin palm
      const fingers = [];
      for (let f = 0; f < 5; f++) {
        const th = f === 0, base = th ? [-.13, -.01, .06] : [-.085 + (f - 1) * .057, 0, .32], segs = [];
        let at = wr, pos = base;
        for (let j = 0; j < 3; j++) {
          const jn = R.add(`f${f}${j}`, G(at, pos, th && j === 0 ? [0, -.7, 0] : [0, 0, 0]), 9 + f * .6 + j * 1.5, .4);
          const len = th ? .15 : (f === 2 ? .22 : .19) - j * .025;
          bone(jn, [0, 0, 0], [0, 0, len], .024 - j * .004, .02 - j * .004, pale, 5, .003);
          segs.push(jn); at = jn; pos = [0, 0, len];
        }
        fingers.push(segs);
      }
      // the hand's visit: it comes up from deep inside, takes hold of the edge, reaches out toward him, feels
      // the air, and goes back. Where a part of it is still on the other side, it is seen only through the tear.
      const armMeshes = []; arm.traverse(o => { if (o.isMesh) armMeshes.push(o); });
      const insideM = new Map();
      for (const m of armMeshes) { const im = m.material.clone(); Object.assign(im, STENCIL, { transparent: true }); insideM.set(m, [m.material, im]); }
      const cam = V(), fwd = V(), to = V(), kn = V(), loc = V(), wp = V(), gInv = new T.Matrix4();
      let widen = 0, pull = 0, lastT = 0;
      const LOOP = 40;
      return (t, dt = 1 / 60) => {
        dt = Math.min(dt, .1);
        // watched? (the camera turned toward it, and not too far off)
        A.camera.getWorldPosition(cam); A.camera.getWorldDirection(fwd); g.getWorldPosition(to); const dist = to.distanceTo(cam); to.sub(cam).normalize();
        const watched = smooth(.9, .97, fwd.dot(to)) * (dist < 45 ? 1 : 0);
        widen += (watched - widen) * (1 - Math.exp(-dt * (watched > widen ? .25 : .08)));
        const u = (t % LOOP);
        const reach = smooth(5, 9, u) * (1 - smooth(29, 35, u)), grip = smooth(9, 11, u) * (1 - smooth(14.5, 16, u)), out = smooth(14, 20, u) * (1 - smooth(27, 33, u));
        pull += ((grip > .5 ? 1 : 0) - pull) * (1 - Math.exp(-dt * 1.2));
        const W = .38 * (1 + widen * .75 + pull * .35) * (1 + Math.sin(t * .37) * .05);   // a crack; watched, it opens to a gap a man could step through
        // the edges, crawling a little
        for (let i = 0; i <= NY; i++) {
          const y = (i / NY - .5) * H, w = halfW(i, W, t), jl = jag[i][0] + Math.sin(t * 1.7 + i) * .05, jr = jag[i][1] + Math.sin(t * 1.3 + i * 1.7) * .05;
          const sway = Math.sin(y * .9 + t * .23) * .12;
          L.set([sway - w * jl, y, 0], i * 3); Rr.set([sway + w * jr, y, 0], i * 3);
          hole.set([L[i * 3], y, 0, Rr[i * 3], y, 0], i * 6);
        }
        holeG.attributes.position.needsUpdate = true; holeG.computeBoundingSphere();
        // the lip and its glow, outward from each edge (left edge, then right)
        for (let side = 0; side < 2; side++) for (let i = 0; i <= NY; i++) {
          const E = side ? Rr : L, k = side * (NY + 1) + i, sg = side ? 1 : -1, x = E[i * 3], y = E[i * 3 + 1], th = .025 + (1 - Math.abs(i / NY * 2 - 1)) * .03;
          lipA.set([x, y, .01, x + sg * th, y, .01], k * 6); gloA.set([x, y, .02, x + sg * (.1 + widen * .1) * (.6 + jag[i][side] * .5), y, .02], k * 6);
        }
        lipG.attributes.position.needsUpdate = true; gloG.attributes.position.needsUpdate = true;
        // threads: whole while the gap is narrow; snapped (hanging from each edge, swinging) once it is too wide
        threads.forEach((q, k) => {
          const i = q.i, lx = L[i * 3], rx = Rr[i * 3], y = L[i * 3 + 1], o = k * 12, broke = rx - lx > q.snap * 1.6;
          if (!broke) { const mx = (lx + rx) / 2, my = y - .04 - Math.sin(t + q.ph) * .02; thA.set([lx, y, 0, mx, my, .01, mx, my, .01, rx, y, 0], o); }
          else { const s1 = Math.sin(t * 1.1 + q.ph) * .08, s2 = Math.sin(t * .9 + q.ph * 2) * .08; thA.set([lx, y, 0, lx + .12 + s1, y - .3, .02, rx, y, 0, rx - .12 + s2, y - .3, .02], o); }
        });
        thG.attributes.position.needsUpdate = true;
        // the other side: the vast thing slides past, the motes drift
        vast.position.x = Math.sin(t * .02) * 12; vast.rotation.z = Math.sin(t * .013) * .2; vast.position.y = Math.sin(t * .03) * 2;
        motes.forEach((m, k) => { m.x += m.sp * dt * .3; if (m.x > 3) m.x = -3; moA.set([m.x, m.y + Math.sin(t * .4 + k) * .2, m.z], k * 3); });
        moG.attributes.position.needsUpdate = true;
        // the hand: deep inside, then near the opening, then out toward him; it turns toward him as it reaches
        A.K.J.hips.getWorldPosition(kn); kn.y += .8; gInv.copy(g.matrixWorld).invert(); loc.copy(kn).applyMatrix4(gInv);
        const gx = L[Math.round(NY * .55) * 3];                                // the left lip, about halfway up: where it takes hold
        arm.position.set(grip * (gx + .1) - out * .3, -.3 - out * .4, -4.6 + reach * 1.7 + out * 2.6);   // (reaching: only the fingertips through; out: the whole forearm)
        const aimY = Math.atan2(loc.x - arm.position.x, loc.z - arm.position.z), aimX = -Math.atan2(loc.y - arm.position.y, Math.hypot(loc.x - arm.position.x, loc.z - arm.position.z));
        R.want('sh', aimX * out * .8 + Math.sin(t * .5) * .05, aimY * out * .9 + grip * -.35, Math.sin(t * .31) * .1);
        R.want('el', .5 - out * .25 + Math.sin(t * .7) * .06, grip * -.5, 0);
        R.want('wr', -.2 + grip * .6 + Math.sin(t * .9) * .15 * out, Math.sin(t * .6) * .3 * out, grip * -.8 + Math.sin(t * .45) * .25);
        fingers.forEach((segs, f) => segs.forEach((jn, j) => {
          const feel = Math.sin(t * (1.3 + f * .21) + f * 1.7 + j * .6) * .25 * (out + reach * .5), curl = grip * (j === 0 ? 1.0 : 1.2) + (1 - reach) * .6 + .12;
          R.want(`f${f}${j}`, curl + feel, f === 0 && j === 0 ? -.7 : (f - 2) * .08 * (1 - grip) * (j === 0 ? 1 : 0), 0);
        }));
        R.step(dt);
        // what is still on the other side is seen only through the tear
        for (const m of armMeshes) { m.getWorldPosition(wp); wp.applyMatrix4(gInv); const [a, b] = insideM.get(m), inside = wp.z < -.02; m.material = inside ? b : a; m.renderOrder = inside ? 19 : 0; }
        // the cold coming out of it
        cold.forEach((c, k) => { const v = (t * .08 * c.sp + c.ph) % 1; wp.set(c.x * W * 1.2, (c.ph - .5) * H * .8 - v * 2.2, .2 + v * 1.6); wp.applyMatrix4(g.matrixWorld); cA.set([wp.x, wp.y, wp.z], k * 3); });
        cG.attributes.position.needsUpdate = true;
        frost.material.opacity = .05 + widen * .1 + pull * .05;
        lipM.opacity = .8 + Math.sin(t * 2.3) * .15; gloM.opacity = .3 + widen * .2 + Math.sin(t * 2.3) * .06;
        lamp.intensity = 3.5 + widen * 2.5 + Math.sin(t * 2.3) * .8;
        A.setFireDim(1 - widen * .25);
        lastT = t;
      };
    },
    exit() { A.setFireDim(1); },
  },

  // ================================================================ THE BLOOM-HEADED WANDERER
  bloom: {
    name: 'The Bloom-Headed Wanderer', hour: 18,
    blurb: 'A traveller in a tattered cloak who seems ordinary, until something interests it. Then its head unfolds like a flower into pale tendrils. It is very polite. It has a mind of its own, and it would like to talk.',
    view: [[-8.0, 1.85, 2.0], [-10.3, 1.8, .25]],
    knight: { place: 'courtyard', action: 'stand', emote: 'exclaim', note: 'being very polite back' },
    build(root) {
      const g = G(root, [-10.3, 0, .25], [0, 1.25, 0]);
      const cloth = ds('#3b3430'), clothD = ds('#2a2522'), hide = A.mat('#5b4a3e', 0, .9), petalM = ds('#d7b7ae', 0, .7), petalOut = ds('#6e5a52', 0, .8);
      const tendrilM = A.mat('#e5cfc6', 0, .55), tipM = glow('#ffd9c9', 1.4);
      const cloak = new T.Mesh(A.facet(new T.CylinderGeometry(.2, .45, 1.55, 9, 2, true), .06, 2), cloth); cloak.position.y = .85; cloak.castShadow = true; g.add(cloak);
      for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; P(g, new T.ConeGeometry(.08, .25, 3), clothD, [Math.cos(a) * .43, .05, Math.sin(a) * .43], { rot: [Math.PI, 0, 0] }); }
      P(g, A.ico(.25, 1), cloth, [0, 1.6, 0], { scale: [1.3, .7, 1] });
      const hood = G(g, [0, 1.72, 0]);
      const hm = new T.Mesh(A.facet(new T.SphereGeometry(.21, 8, 6, 0, 6.28, 0, 2.1), .02, 1), clothD); hm.position.set(0, .12, -.03); hm.castShadow = true; hood.add(hm);
      bone(g, [.3, 1.45, .15], [.38, .95, .3], .05, .04, cloth); bone(g, [.38, .95, .3], [.42, .95, .45], .04, .03, hide);
      bone(g, [.45, 0, .5], [.45, 1.9, .5], .03, .025, A.M.woodD);   // a walking staff
      bone(g, [-.3, 1.45, .1], [-.34, .9, .15], .05, .04, cloth);
      const head = G(hood, [0, .12, .04]); head.scale.setScalar(1.45);
      const bloomLight = softLight('#ffcbb8', 0, 1.4); bloomLight.position.set(0, .2, .25); head.add(bloomLight);
      const apB = root.userData.appearance || {}, canBloom = !apB.id || (apB.seeing ?? 0) >= 2;   // he sees it bloom only from seeing step 2
      const bulb = P(head, A.ico(.13, 1), A.mat('#cdb8ae', 0, .6), [0, 0, 0], { scale: [1, 1.15, 1] });
      const petals = [];
      for (let i = 0; i < 6; i++) {
        const p = G(head, [0, -.02, 0], [0, i / 6 * 6.28, 0]);
        const hinge = G(p, [0, 0, .09]);
        sheet(hinge, [[-.07, 0, 0], [.07, 0, 0], [.09, .28, .02], [0, .38, .04], [-.09, .28, .02]], [[0, 1, 2], [0, 2, 3], [0, 3, 4]], i % 2 ? petalM : petalOut);
        petals.push(hinge);
      }
      const tendrils = [];
      for (let i = 0; i < 8; i++) {
        const b = G(head, [Math.cos(i * .8) * .04, .05, Math.sin(i * .8) * .04], [Math.cos(i * .8) * .5, 0, Math.sin(i * .8) * .5]);
        const c = chain(b, 5, .09, .018, .006, tendrilM, { sides: 4, jitter: .002 });
        P(c[4], A.ico(.014, 0), tipM, [0, .09, 0], { cast: false });
        tendrils.push({ b, c, ph: i });
      }
      return (t) => {
        const open = smooth(0, 1, pulse(t + 2, 12, 6) * 1.6);
        petals.forEach((h, i) => { h.rotation.x = open * (canBloom ? 1 : 0) * (1.0 + Math.sin(t * 2 + i) * .08); });
        bulb.scale.setScalar(1 - open * .5);
        for (const { b, c, ph } of tendrils) {
          b.scale.setScalar(.05 + open * .95);
          c.forEach((j, i) => { j.rotation.x = Math.sin(t * 2.2 - i * .6 + ph) * .35 * open; j.rotation.z = Math.cos(t * 1.7 - i * .5 + ph) * .25 * open; });
        }
        bloomLight.intensity = open * 2.2 * (canBloom ? 1 : 0);
        head.rotation.x = -open * .25; hood.rotation.y = Math.sin(t * .4) * .2 * (1 - open);
      };
    },
  },

  // ================================================================ THE LANTERN WARDEN
  warden: {
    name: 'The Lantern Warden', hour: 22,
    blurb: 'A tall, thin figure in a long hunter\'s coat who walks the walls at night, holding out a cage lantern with something alive inside. It trades secrets for trinkets, and its secrets are always true.',
    view: [[-9.4, 1.7, -1.6], [-11.4, 2.4, 4.3]],
    knight: { place: 'courtyard', action: 'stand', emote: 'question', note: 'wondering what a secret costs' },
    build(root) {
      const g = G(root, [-11, 1.15, 4.3]);
      const coat = ds('#2b2a2e', 0, .85), coatL = ds('#3e3b40', 0, .85), leather = A.M.leather, iron = A.M.iron;
      const body = G(g);
      const legs = [];
      for (const sx of [-1, 1]) { const l = G(body, [sx * .1, 1.0, 0]); bone(l, [0, 0, 0], [0, -1.0, 0], .055, .045, leather); P(l, A.box(.1, .07, .24), leather, [0, -1.0, .06]); legs.push(l); }
      const coatM = new T.Mesh(A.facet(new T.CylinderGeometry(.22, .4, 1.3, 9, 2, true), .05, 1), coat); coatM.position.y = 1.35; coatM.castShadow = true; body.add(coatM);
      for (const sx of [-1, 1]) sheet(body, [[sx * .05, .9, -.3], [sx * .3, .9, -.2], [sx * .28, .05, -.42], [sx * .1, .25, -.45]], [[0, 1, 2], [0, 2, 3]], coatL);
      P(body, A.cyl(.26, .22, .7, 8), coat, [0, 2.2, 0], { scale: [1, 1, .75] });
      P(body, A.cyl(.17, .26, .2, 8), coatL, [0, 2.55, 0]);   // high collar
      const head = G(body, [0, 2.72, 0]);
      P(head, A.ico(.15, 1), A.mat('#1a1918'), [0, 0, 0]);
      const hood = new T.Mesh(A.facet(new T.SphereGeometry(.2, 8, 6, 0, 6.28, 0, 2.2), .02, 3), coat); hood.position.set(0, .05, -.04); hood.castShadow = true; head.add(hood);
      P(head, A.box(.24, .12, .06), coatL, [0, -.06, .14]);   // a scarf across its face
      for (const sx of [-1, 1]) P(head, A.ico(.016, 0), glow('#e6f3ff', 2.5), [sx * .05, .03, .15], { cast: false });
      bone(body, [-.24, 2.45, 0], [-.27, 1.6, .05], .045, .035, coat);
      const arm = G(body, [.24, 2.45, 0]); const armSide = arm;
      bone(arm, [0, 0, 0], [.32, -.35, .25], .045, .04, coat); bone(arm, [.32, -.35, .25], [.6, -.45, .5], .04, .035, coat);
      const cage = G(arm, [.62, -.55, .52]); cage.scale.setScalar(1.6);
      bone(cage, [0, .1, 0], [0, .32, 0], .008, .008, iron, 4);
      for (const y of [.1, -.28]) { const ring = new T.Mesh(new T.TorusGeometry(.11, .012, 4, 10), iron); ring.rotation.x = Math.PI / 2; ring.position.y = y; cage.add(ring); }
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; bone(cage, [Math.cos(a) * .11, .1, Math.sin(a) * .11], [Math.cos(a) * .11, -.28, Math.sin(a) * .11], .008, .008, iron, 4); }
      const thing = G(cage, [0, -.09, 0]), light = glow('#bfe8ff', 2.5);
      P(thing, A.ico(.035, 0), light, [0, 0, 0], { cast: false });
      const wings = [-1, 1].map(sx => { const w = G(thing); sheet(w, [[0, 0, 0], [sx * .09, .03, .02], [sx * .07, -.02, -.03]], [[0, 1, 2]], glow('#dff4ff', 1.2, { side: T.DoubleSide, transparent: true, opacity: .8 })); return { w, sx }; });
      const lamp = softLight('#9fd8ff', 6, 1.6); cage.add(lamp);
      const apW = root.userData.appearance || {};
      thing.visible = !apW.id || (apW.seeing ?? 0) >= 2;            // the lantern looks empty until he can see what lives in it
      let x = -8.4, dir = 1;
      return (t, dt) => {
        const target = -8.4 + Math.sin(t * .09) * 1.5, v = target - x; x = target;   // the stretch of wall with no buildings behind it
        if (Math.abs(v) > 1e-4) dir = Math.sign(v);
        g.position.x = x; g.rotation.y += ((dir > 0 ? Math.PI / 2 : -Math.PI / 2) - g.rotation.y) * Math.min(1, dt * 3);
        armSide.scale.x = dir > 0 ? -1 : 1;                              // the lantern always held out beyond the wall, never over the roofs
        const stride = Math.abs(Math.cos(t * .09)) > .15 ? 1 : .2, ph = t * 3.2;
        legs.forEach((l, i) => { l.rotation.x = Math.sin(ph + i * Math.PI) * .35 * stride; });
        body.position.y = Math.abs(Math.sin(ph)) * .03 * stride;
        cage.rotation.z = Math.sin(ph) * .08 * stride; head.rotation.y = Math.sin(t * .3) * .5;
        thing.position.set(Math.sin(t * 2.3) * .04, -.09 + Math.sin(t * 3.1) * .04, Math.cos(t * 2.7) * .04);
        for (const { w, sx } of wings) w.rotation.y = sx * Math.sin(t * 30) * .7;
        lamp.intensity = 5.5 + Math.sin(t * 7) * .8;
      };
    },
  },

  // ================================================================ THE PALE BROOD
  brood: {
    name: 'The Pale Brood', hour: 22,
    blurb: 'Small grey things, all elbows and eyes, with fingers far too long. They creep about the courtyard at night and in through the door, and make off with tools and glass. Look straight at them and they freeze; look again and they have scattered.',
    view: [[-3.4, 1.6, 3.4], [-7.4, .3, .4]],
    knight: { place: 'bedroll', action: 'sleep', emote: 'zzz', note: 'asleep, and missing his hammer by morning' },
    build(root) {
      const v = root.userData.appearance?.variant || {};
      const count = Math.max(3, Math.min(7, Math.round(5 * (v.size || 1))));
      const skin = A.mat('#a9a59d', 0, .8, { emissive: '#2c2c30', emissiveIntensity: .6 }), skinD = A.mat('#7c7872', 0, .85, { emissive: '#1e1e22', emissiveIntensity: .5 });
      const eyeM = A.mat('#030205', .5, .05);                          // wet black, no glint, nothing cute
      // where they go: about the courtyard, and in through the door (always through the doorway, never the wall)
      const OUT = [[-10.2, -.5], [-11.8, .5], [-13.0, -.4], [-9.8, .7], [-12.4, .6], [-9.6, -.7]];   // the lane: clear of everything
      const WAY = [-7.9, -.35], STEP = [-5.95, 1.0], DOOR = [-4.4, 1.0];       // past his spot, the doorstep, just inside the door
      const IN = [DOOR, [-3.7, 1.8], [-3.9, .4], [-2.6, -2.4]];              // inside the hall
      const loot = [
        g => { P(g, A.cyl(.012, .012, .22, 5), A.M.wood, [0, 0, 0], { rot: [0, 0, 1.4] }); P(g, A.box(.05, .05, .1), A.M.iron, [-.1, 0, 0]); },   // his hammer
        g => P(g, new T.TetrahedronGeometry(.06), new T.MeshStandardMaterial({ color: '#c8eef5', transparent: true, opacity: .7, roughness: .05, metalness: .3 }), [0, 0, 0], { cast: false }),
        g => P(g, A.cyl(.03, .03, .12, 6), A.mat('#e8dcc0'), [0, .04, 0]),   // a candle end
        g => P(g, A.box(.12, .02, .08), A.mat('#d9cfb4'), [0, 0, 0]),          // a page
        () => {}, () => {}, () => {},
      ];
      const brood = [];
      for (let n = 0; n < count; n++) {
        const b = G(root), body = G(b, [0, .24, 0]);
        P(body, A.ico(.12, 1), skin, [0, 0, -.04], { scale: [1, .8, 1.35] });
        for (let k = 0; k < 4; k++) P(body, A.ico(.022, 0), skinD, [0, .09, .05 - k * .06], { cast: false });   // knuckles of a spine
        const head = G(body, [0, .1, .15]);
        P(head, A.ico(.1, 1), skin, [0, 0, 0], { scale: [1.05, .85, .95] });
        for (const sx of [-1, 1]) P(head, A.ico(.05, 1), eyeM, [sx * .052, .015, .065], { scale: [1, 1.25, .6] });   // too big, too dark
        const limbs = [];
        for (const sx of [-1, 1]) for (const fz of [.1, -.02, -.13]) {   // six limbs, all elbows
          const l = G(body, [sx * .07, -.02, fz]);
          const up = .16 + (fz > 0 ? .02 : 0);
          bone(l, [0, 0, 0], [sx * .13, up * .6, fz * .4], .016, .012, skin, 4);          // up to an elbow, higher than the back
          bone(l, [sx * .13, up * .6, fz * .4], [sx * .2, -.22, fz * .9], .012, .008, skin, 4);
          if (fz > 0) for (let f = 0; f < 4; f++) bone(l, [sx * .2, -.22, fz * .9], [sx * (.2 + f * .03), -.24, fz * .9 + .18 + (f % 2) * .05], .006, .003, skin, 3);
          limbs.push({ l, sx, fz });
        }
        const carry = G(body, [0, -.05, .26]); loot[n % loot.length](carry);
        const s = A.rand(n * 31 + 7 + Math.abs(Math.round((v.hue || 0) * 1000)));
        const at = V(...[OUT[n % OUT.length]].map(([x, z]) => [x, 0, z])[0]);
        b.position.copy(at);
        brood.push({ b, body, head, limbs, node: OUT[n % OUT.length], from: at.clone(), to: at.clone(), go: 1, wait: s() * 3, len: 1, s, frozen: 0 });
      }
      // the next place: from outside, another spot or the doorstep; from the doorstep, in or out; from inside, the doorstep
      const isIn = p => IN.includes(p), isStep = p => p === STEP;
      const next = (c) => {
        const r = c.s();
        if (c.node === DOOR) return r < .5 ? STEP : IN[1 + Math.floor(c.s() * (IN.length - 1))];   // in, or out again through the doorway
        if (isIn(c.node)) return DOOR;
        if (isStep(c.node)) return r < .55 ? DOOR : WAY;
        if (c.node === WAY) return r < .5 ? STEP : OUT[Math.floor(c.s() * OUT.length)];
        return r < .25 ? WAY : OUT[Math.floor(c.s() * OUT.length)];
      };
      const hp = V(), cam = V();
      return (t, dt) => {
        A.camera.getWorldPosition(cam);
        for (const c of brood) {
          // looked straight at (close and in the middle of the view): it freezes; then it bolts
          c.head.getWorldPosition(hp); const d = hp.distanceTo(cam); hp.project(A.camera);
          const stared = Math.abs(hp.x) < .3 && Math.abs(hp.y) < .35 && hp.z < 1 && d < 9;
          if (stared && c.frozen <= 0 && c.go < 1) c.frozen = 1.4;
          if (c.frozen > 0) { c.frozen -= dt; if (c.frozen <= 0) c.wait = 0; continue; }
          if (c.go >= 1) {
            c.wait -= dt;
            if (c.wait <= 0) {
              c.from.copy(c.b.position); c.node = next(c);
              const j = isIn(c.node) || isStep(c.node) || c.node === WAY ? 0 : .4;
              c.to.set(c.node[0] + (c.s() - .5) * j, 0, c.node[1] + (c.s() - .5) * j); c.go = 0; c.len = c.from.distanceTo(c.to) || 1;
            }
          } else {
            c.go = Math.min(1, c.go + dt * 2.6 / c.len);
            c.b.position.lerpVectors(c.from, c.to, smooth(0, 1, c.go));
            c.b.position.y = gy(c.b.position.x, c.b.position.z) * (isIn(c.node) ? 0 : 1);
            const want = Math.atan2(c.to.x - c.from.x, c.to.z - c.from.z);
            c.b.rotation.y += Math.atan2(Math.sin(want - c.b.rotation.y), Math.cos(want - c.b.rotation.y)) * Math.min(1, dt * 10);
            if (c.go >= 1) c.wait = .8 + c.s() * 3.5;
          }
          const moving = c.go < 1, ph = t * 17;
          c.body.position.y = .24 + (moving ? Math.abs(Math.sin(ph)) * .035 : 0);
          c.body.rotation.x = moving ? .35 : .1;
          for (const { l, sx, fz } of c.limbs) l.rotation.x = moving ? Math.sin(ph + (sx * fz > 0 ? 0 : Math.PI) + fz * 9) * .6 : Math.sin(t * 6 + sx + fz) * .05;
          c.head.rotation.y = moving ? 0 : Math.sin(t * 1.7 + c.from.x) * .7;
        }
      };
    },
  },

  // ================================================================ THE LONG MAN
  longman: {
    name: 'The Long Man', hour: 18,
    blurb: 'An impossibly tall, thin shape standing still at the edge of the mist. Each time you look away, it is a little closer. It never comes past the courtyard wall... probably. (Try looking away.)',
    view: [[-10.5, 1.9, 3.6], [-24, 3.0, 6.2]],
    knight: { place: 'courtyard', action: 'stand', emote: 'dots', note: 'not looking at it. Not looking at it.' },
    build(root) {
      const g = G(root, [-27.5, 0, 6.2], [0, Math.PI / 2, 0]);   // the field south-west of the keep, clear of the barrow
      const dark = A.mat('#141315', 0, .9), face = A.mat('#d4cec4', 0, .6);
      for (const sx of [-1, 1]) {
        bone(g, [sx * .16, 3.2, 0], [sx * .2, 1.6, .05], .07, .055, dark);
        bone(g, [sx * .2, 1.6, .05], [sx * .17, 0, 0], .055, .045, dark);
        bone(g, [sx * .28, 4.65, 0], [sx * .36, 3.2, .05], .05, .04, dark);
        bone(g, [sx * .36, 3.2, .05], [sx * .33, 1.75, .1], .04, .035, dark);
        for (let f = 0; f < 4; f++) bone(g, [sx * .33, 1.75, .1], [sx * (.3 + f * .025), 1.2, .1 + (f - 1.5) * .03], .01, .004, dark, 4);
      }
      P(g, A.cyl(.2, .13, 1.5, 6), dark, [0, 3.95, 0], { scale: [1, 1, .6] });
      bone(g, [-.3, 4.66, 0], [.3, 4.66, 0], .05, .05, dark);
      bone(g, [0, 4.7, 0], [0, 5.2, .02], .04, .035, dark);
      const head = G(g, [0, 5.42, .03]);
      P(head, A.ico(.17, 1), face, [0, 0, 0], { scale: [.8, 1.25, .85] });
      voidFace(head, false, [.8, 1.25, .85]);
      const mist = Array.from({ length: 10 }, (_, i) => {
        const sp = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: '#8c8697', transparent: true, opacity: .3, depthWrite: false }));
        sp.userData = { x: -32 + (i % 5) * 3.2, z: -5 + Math.floor(i / 5) * 6, ph: i }; root.add(sp); return sp;
      });
      const p = V(); let seen = true;
      return (t) => {
        head.getWorldPosition(p); p.project(A.camera);
        const onScreen = Math.abs(p.x) < 1.02 && Math.abs(p.y) < 1.02 && p.z < 1;
        if (seen && !onScreen && g.position.x < -19.8) g.position.x = Math.min(-19.8, g.position.x + 2.3);   // it moves only when unwatched
        seen = onScreen;
        head.rotation.z = Math.sin(t * .15) * .12; head.rotation.y = Math.sin(t * .11) * .1;
        for (const m of mist) { const u = m.userData; m.position.set(u.x + Math.sin(t * .1 + u.ph) * .8, .4, u.z); m.scale.setScalar(4 + Math.sin(t * .2 + u.ph)); }
      };
    },
  },

  // ================================================================ THE STITCHED SKY
  stitched: {
    name: 'The Stitched Sky', hour: 22,
    blurb: 'Seen only by those who have seen enough. A night when the stars move, slowly, as if drawn toward something, and the sky turns out to have seams: long pale scars across it, stitched shut. One of them opens, its stitches pulling taut, and something vast looks down through the gap. It opens wider when the fire burns bright.',
    view: [[-8, 1.6, 3.6], [34, 47, -72]],
    knight: { place: 'courtyard', action: 'gaze', emote: 'exclaim', note: 'looking up at the seams in the sky' },
    build(root) {
      // Laid on the sky itself (a great sphere around the keep, far off): long pale scars with cross-
      // stitches over them. The main seam's lips part along the middle, its stitches stretching taut
      // across the gap. What is behind is drawn only where the gap is (a stencil): a dark red depth and
      // an eye, so large that the gap only ever shows part of it, that looks about and then finds whoever
      // is watching. The stars it brings drift toward the gap, faster as they near it, and go in.
      // Its tell: the gap opens wider while the fire burns bright.
      const Cn = V(-6, 0, 0), RS = 140, D = V(.42, .5, -.76).normalize(),   // (east of north, clear of the moon)
        E = V().crossVectors(D, V(0, 1, 0)).normalize(), N = V().crossVectors(E, D).normalize();
      const sky = (a, b, r = RS, out = V()) => out.copy(D).addScaledVector(E, a).addScaledVector(N, b).normalize().multiplyScalar(r).add(Cn);
      const STEN = { stencilWrite: true, stencilRef: 2, stencilFunc: T.EqualStencilFunc, stencilFail: T.KeepStencilOp, stencilZFail: T.KeepStencilOp, stencilZPass: T.KeepStencilOp };
      const order = (m, o) => { m.renderOrder = o; m.frustumCulled = false; return m; };
      const basic = (color, o = {}) => new T.MeshBasicMaterial({ color, transparent: true, depthWrite: false, fog: false, side: T.DoubleSide, ...o });
      // a strip of quads along points (in sky angles), w wide: [positions], written into arr from k
      const tmp = V(), tmp2 = V();
      const strip = (pts, w, arr, k = 0) => {
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)], dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * w / 2, ny = dx / l * w / 2;
          sky(p[0] + nx, p[1] + ny, RS, tmp); arr.set([tmp.x, tmp.y, tmp.z], (k + i * 2) * 3);
          sky(p[0] - nx, p[1] - ny, RS, tmp); arr.set([tmp.x, tmp.y, tmp.z], (k + i * 2 + 1) * 3);
        }
        return k + pts.length * 2;
      };
      const stripIdx = (n, k, idx) => { for (let i = 0; i < n - 1; i++) { const a = k + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } };
      // ---- the seams: the main one across the middle, three more, one of them a little open too
      const mainB = a => .05 - .09 * a * a + .012 * Math.sin(a * 13);
      const SEAMS = [
        { pts: Array.from({ length: 63 }, (_, i) => { const a = -.62 + i * .02; return [a, mainB(a)]; }), open: [-.32, .32], H: .075 },
        { pts: Array.from({ length: 31 }, (_, i) => { const u = i / 30; return [-.95 + u * .62, .3 + u * .22 + Math.sin(u * 9) * .015]; }) },
        { pts: Array.from({ length: 31 }, (_, i) => { const u = i / 30; return [.3 + u * .55, -.2 + u * .32 + Math.sin(u * 7 + 1) * .012]; }) },
        { pts: Array.from({ length: 16 }, (_, i) => { const u = i / 15; return [.42 + u * .3, .38 + u * .06 + Math.sin(u * 5) * .01]; }), open: [.48, .66], H: .022 },
      ];
      // the scar lines (never change): one mesh
      const nS = SEAMS.reduce((n, s) => n + s.pts.length * 2, 0), scarA = new Float32Array(nS * 3), scarI = [];
      let k0 = 0; for (const s of SEAMS) { stripIdx(s.pts.length, k0, scarI); k0 = strip(s.pts, .0035, scarA, k0); }
      const scarG = new T.BufferGeometry(); scarG.setAttribute('position', new T.BufferAttribute(scarA, 3)); scarG.setIndex(scarI);
      const scarM = basic('#7d7494', { opacity: .45 });
      root.add(order(new T.Mesh(scarG, scarM), 20));
      // the stitches: slanted, every so often along each seam; on an open stretch they stretch across the gap
      const stitches = [];
      SEAMS.forEach((s, si) => { for (let i = 1; i < s.pts.length - 1; i += 2 + Math.round(nz(si * 13 + i) * 1.4)) stitches.push({ si, i, a: s.pts[i][0], b: s.pts[i][1], tilt: (nz(si * 40 + i) < .3 ? -1 : 1) * (.007 + nz(si * 41 + i) * .01), reach: .016 + nz(si * 7 + i) * .012 }); });   // uneven, as if sewn in a hurry
      const NSt = stitches.length, stA = new Float32Array(NSt * 4 * 3), stI = [];
      for (let k = 0; k < NSt; k++) { const a = k * 4; stI.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const stG = new T.BufferGeometry(); stG.setAttribute('position', new T.BufferAttribute(stA, 3)); stG.setIndex(stI);
      const stM = basic('#cdbfa2', { opacity: .6 });
      root.add(order(new T.Mesh(stG, stM), 22));
      // ---- the openings: a hole (marks the stencil), lit lips; behind: the depth, the eye, far stars
      const shade = canvasTex(64, 4, (c, w) => { const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, 4); });
      const opens = SEAMS.filter(s => s.open).map(s => {
        const n = 25, hA = new Float32Array(n * 2 * 3), lipA = new Float32Array(n * 2 * 2 * 3), hI = [], lI = [];
        stripIdx(n, 0, hI); stripIdx(n, 0, lI); stripIdx(n, n * 2, lI);
        const hG = new T.BufferGeometry(); hG.setAttribute('position', new T.BufferAttribute(hA, 3)); hG.setIndex(hI);
        const lG = new T.BufferGeometry(); lG.setAttribute('position', new T.BufferAttribute(lipA, 3)); lG.setIndex(lI);
        root.add(order(new T.Mesh(hG, basic('#120408', { stencilWrite: true, stencilRef: 2, stencilFunc: T.AlwaysStencilFunc, stencilZPass: T.ReplaceStencilOp })), 21));
        const lipM = basic('#a8908a', { opacity: .7 }); root.add(order(new T.Mesh(lG, lipM), 23));
        const shA = new Float32Array(n * 2 * 2 * 3), shUV = new Float32Array(n * 2 * 2 * 2);
        for (let i = 0; i < n * 2; i++) shUV.set([0, 0, 1, 0], i * 4);
        const shG = new T.BufferGeometry(); shG.setAttribute('position', new T.BufferAttribute(shA, 3)); shG.setAttribute('uv', new T.BufferAttribute(shUV, 2)); shG.setIndex(lI);
        root.add(order(new T.Mesh(shG, basic('#000000', { map: shade, depthTest: false, ...STEN })), 29));   // the lips' shadow, over whatever is inside
        return { s, n, hA, hG, lipA, lG, lipM, shA, shG, O: 0 };
      });
      const depth = canvasTex(256, 256, (c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, '#5a1424'); gr.addColorStop(.55, '#2a0812'); gr.addColorStop(1, '#0c0206'); c.fillStyle = gr; c.fillRect(0, 0, w, w); });
      const back = order(new T.Mesh(new T.PlaneGeometry(200, 200), basic('#ffffff', { map: depth, depthTest: false, ...STEN })), 24);
      sky(0, .05, 290, back.position); back.lookAt(Cn); back.scale.setScalar(1.6); root.add(back);
      // the eye: vast, old, wet; it is far behind the gap, and turns
      const eye = G(root); sky(0, .05, 230, eye.position);
      const scl = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#5e5440'; c.fillRect(0, 0, w, h); const q = A.rand(31);
        for (let i = 0; i < 40; i++) { let x = q() * w, y = q() * h; c.strokeStyle = `rgba(${110 + q() * 40},20,24,${.3 + q() * .4})`; c.lineWidth = .7 + q() * 1.4; c.beginPath(); c.moveTo(x, y); for (let j = 0; j < 7; j++) { x += (q() - .5) * 26; y += (q() - .5) * 14; c.lineTo(x, y); } c.stroke(); } });
      eye.add(order(new T.Mesh(new T.SphereGeometry(44, 40, 24), basic('#ffffff', { map: scl, depthTest: false, side: T.FrontSide, ...STEN })), 25));
      const irisT = canvasTex(256, 256, (c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, w * .1, w / 2, w / 2, w / 2); gr.addColorStop(0, '#b89a5a'); gr.addColorStop(.6, '#8a6a34'); gr.addColorStop(.9, '#40301a'); gr.addColorStop(1, '#1a120a'); c.fillStyle = gr; c.beginPath(); c.arc(w / 2, w / 2, w / 2, 0, 6.3); c.fill();
        c.filter = 'blur(1.2px)'; const q = A.rand(8); for (let i = 0; i < 160; i++) { const a = q() * 6.28; c.strokeStyle = q() < .5 ? 'rgba(255,230,170,.16)' : 'rgba(60,30,8,.3)'; c.lineWidth = 1; c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * w * .14, w / 2 + Math.sin(a) * w * .14); c.lineTo(w / 2 + Math.cos(a) * w * (.35 + q() * .14), w / 2 + Math.sin(a) * w * (.35 + q() * .14)); c.stroke(); } });
      const iris = order(new T.Mesh(new T.CircleGeometry(19, 40), basic('#ffffff', { map: irisT, depthTest: false, ...STEN })), 26); iris.position.z = 43.9; eye.add(iris);
      const pupil = order(new T.Mesh(new T.CircleGeometry(9, 28), basic('#050203', { depthTest: false, ...STEN })), 27); pupil.position.z = 44; eye.add(pupil);
      // behind the small seam: a few warm stars of somewhere else
      const NW = 24, wA = new Float32Array(NW * 3);
      for (let k = 0; k < NW; k++) { sky(.48 + nz(k) * .18, .395 + (nz(k + 9) - .5) * .05, 180, tmp); wA.set([tmp.x, tmp.y, tmp.z], k * 3); }
      const wG = new T.BufferGeometry(); wG.setAttribute('position', new T.BufferAttribute(wA, 3));
      root.add(order(new T.Points(wG, new T.PointsMaterial({ color: '#ffcf9a', size: 1.6, transparent: true, depthTest: false, depthWrite: false, fog: false, ...STEN })), 25));
      // ---- the stars it brings: they drift round toward the main gap, quicker as they come close, and go in
      const NSr = 320, srA = new Float32Array(NSr * 3), stars = Array.from({ length: NSr }, (_, k) => ({ ang: nz(k) * 6.28, rad: .15 + nz(k + 7) * 1.05, sp: .6 + nz(k + 3) * .8 }));
      const srG = new T.BufferGeometry(); srG.setAttribute('position', new T.BufferAttribute(srA, 3));
      const srM = new T.PointsMaterial({ color: '#e8e2ff', size: 1.1, transparent: true, opacity: .9, depthWrite: false, fog: false });
      root.add(order(new T.Points(srG, srM), 19));
      const cam = V(), look = V(), want = V();
      let next = 0, last = 0;
      return (t, dt = 1 / 60) => {
        dt = Math.min(dt, .1);
        // how open: its own slow breath of opening and closing, and wider when the fire is bright (its tell)
        const fire = Math.max(0, Math.min(1, (A.fireLight.intensity - 26) / 22));
        const u = t % 80, cyc = .12 + .7 * smooth(4, 26, u) * (1 - smooth(56, 74, u));
        opens.forEach((o, n) => {
          const wantO = n === 0 ? Math.min(1, cyc + fire * .3) : .25 + .2 * Math.sin(t * .11);
          o.O += (wantO - o.O) * (1 - Math.exp(-dt * .6));
          const [a0, a1] = o.s.open, hA = o.hA, lip = o.lipA, top = [], bot = [];
          for (let i = 0; i < o.n; i++) {
            const a = a0 + (a1 - a0) * i / (o.n - 1), x = (a - (a0 + a1) / 2) / ((a1 - a0) / 2), h = o.O * o.s.H * Math.pow(Math.max(0, 1 - x * x), .75) * (1 + Math.sin(t * .7 + i * .8) * .04);
            const b = n === 0 ? mainB(a) : o.s.pts[0][1] + (a - o.s.pts[0][0]) / (o.s.pts.at(-1)[0] - o.s.pts[0][0]) * (o.s.pts.at(-1)[1] - o.s.pts[0][1]);
            top.push([a, b + h]); bot.push([a, b - h]);
            sky(a, b + h, RS - .5, tmp); hA.set([tmp.x, tmp.y, tmp.z], i * 6); sky(a, b - h, RS - .5, tmp); hA.set([tmp.x, tmp.y, tmp.z], i * 6 + 3);
          }
          o.top = top; o.bot = bot;
          strip(top, .0026, lip, 0); strip(bot, .0026, lip, o.n * 2);
          for (let i = 0; i < o.n; i++) {                                    // the shadow: from each lip a little way into the gap
            const sh = Math.min(o.s.H * .55, (top[i][1] - bot[i][1]) * .45);
            sky(top[i][0], top[i][1], RS - .6, tmp); o.shA.set([tmp.x, tmp.y, tmp.z], i * 6); sky(top[i][0], top[i][1] - sh, RS - .6, tmp); o.shA.set([tmp.x, tmp.y, tmp.z], i * 6 + 3);
            sky(bot[i][0], bot[i][1], RS - .6, tmp); o.shA.set([tmp.x, tmp.y, tmp.z], (o.n + i) * 6); sky(bot[i][0], bot[i][1] + sh, RS - .6, tmp); o.shA.set([tmp.x, tmp.y, tmp.z], (o.n + i) * 6 + 3);
          }
          o.shG.attributes.position.needsUpdate = true;
          o.hG.attributes.position.needsUpdate = true; o.lG.attributes.position.needsUpdate = true;
          o.lipM.opacity = .35 + o.O * .35;
        });
        // the stitches: closed ones lie across the scar; on an open stretch, from lip to lip, pulled taut
        stitches.forEach((s, k) => {
          let ta = s.a - s.tilt, tb = s.b + s.reach, ba = s.a + s.tilt, bb = s.b - s.reach;
          const o = opens.find(q => q.s === SEAMS[s.si] && s.a > q.s.open[0] && s.a < q.s.open[1]);
          if (o) { const i = Math.round((s.a - o.s.open[0]) / (o.s.open[1] - o.s.open[0]) * (o.n - 1)), h = o.top[i][1] - o.bot[i][1]; if (h / 2 + .006 > s.reach) { tb = o.top[i][1] + .006; bb = o.bot[i][1] - .006; } }
          const dx = ba - ta, dy = bb - tb, l = Math.hypot(dx, dy) || 1, w = .0014, nx = -dy / l * w, ny = dx / l * w;
          sky(ta + nx, tb + ny, RS - 1, tmp); stA.set([tmp.x, tmp.y, tmp.z], k * 12); sky(ta - nx, tb - ny, RS - 1, tmp); stA.set([tmp.x, tmp.y, tmp.z], k * 12 + 3);
          sky(ba + nx, bb + ny, RS - 1, tmp); stA.set([tmp.x, tmp.y, tmp.z], k * 12 + 6); sky(ba - nx, bb - ny, RS - 1, tmp); stA.set([tmp.x, tmp.y, tmp.z], k * 12 + 9);
        });
        stG.attributes.position.needsUpdate = true;
        // the eye: it looks about while the gap opens; once it is open, it finds whoever is watching
        A.camera.getWorldPosition(cam);
        const O = opens[0].O;
        if (t > next || t < last) { const q = A.rand(Math.floor(t * 3) + 5); want.set(cam.x + (q() - .5) * 120, cam.y + (q() - .5) * 60, cam.z + (q() - .5) * 120); next = t + 2 + q() * 3.5; }
        const finds = smooth(.55, .7, O);
        tmp2.copy(want).lerp(cam, finds); look.lerp(tmp2, 1 - Math.exp(-dt * (finds > .5 ? 1.2 : 3)));
        eye.lookAt(look);
        const narrow = .55 + .45 * (1 - fire) + Math.sin(t * .4) * .05;            // the fire's brightness narrows it
        pupil.scale.set(.32 * narrow, 1, 1);
        // the stars: round the gap and in
        const c0 = [0, .05];
        stars.forEach((s, k) => {
          s.ang += dt * .03 * s.sp / Math.max(.2, s.rad); s.rad -= dt * .004 * s.sp * (.4 + O);
          if (s.rad < .05 + (1 - O) * .06) { s.rad = .9 + nz(k + Math.floor(t)) * .3; s.ang = nz(k * 3 + Math.floor(t)) * 6.28; }
          sky(c0[0] + Math.cos(s.ang) * s.rad * 1.6, c0[1] + Math.sin(s.ang) * s.rad * .55, RS + 2, tmp); srA.set([tmp.x, tmp.y, tmp.z], k * 3);
        });
        srG.attributes.position.needsUpdate = true;
        scarM.opacity = .35 + O * .2; stM.opacity = .5 + O * .2;
        last = t;
      };
    },
  },

  // ================================================================ THE MANY-JOINTED
  manyjoint: {
    name: 'The Many-Jointed', hour: 22,
    blurb: 'Seen only by those who have seen enough. Something pale with far too many limbs, and far too many joints in each, folds itself into the high corner of the hall at night, small as a bundle of sticks. While the fire is low it unfolds, slowly, one joint at a time, down the walls toward the room. When the fire leaps up, it folds away at once.',
    view: [[-1.2, 1.7, .6], [-4.5, 3.0, -3.6]],
    knight: { place: 'bedroll', action: 'sleep', emote: 'zzz', note: 'asleep, with his back to the corner' },
    build(root) {
      // Pale and waxy, faceless: a narrow ridged body, a smooth bulb that hangs where a head would be,
      // and ten limbs of seven joints each, ending in three thin fingers. Folded, every limb zig-zags
      // shut like a folding rule and it is a tight pale knot in the corner. While the light is low it
      // opens, from the body outward, a joint at a time, the limbs spreading flat along the two walls
      // and the beams and reaching down toward the room; the fire throws their shadows huge on the
      // stone. When the fire leaps, it folds away
      // in an instant, the joints overshooting and shivering as they lock. Its tell: it opens only
      // where the light does not reach.
      const g = G(root, [-4.72, 3.62, -3.78]), body = G(g), R = rig();
      const wax = A.mat('#e2ddd4', 0, .45, { emissive: '#4a4844', emissiveIntensity: .45 }), knob = A.mat('#b4aca0', 0, .55, { emissive: '#2e2c2a', emissiveIntensity: .45 });
      // the body: a ridge of small segments, hanging down from the corner, and the bulb at its end
      const spine = R.add('spine', G(body), 4, .55);
      for (let i = 0; i < 6; i++) P(spine, A.ico(.075 - i * .006, 1), i % 2 ? knob : wax, [0, -i * .1, 0], { scale: [1.15, .8, 1], jitter: .006 });
      const neck = R.add('neck', G(spine, [0, -.6, 0]), 3, .5);
      bone(neck, [0, 0, 0], [0, -.22, .04], .03, .025, wax, 5);
      P(neck, A.ico(.09, 2), wax, [0, -.4, .07], { scale: [.75, 2.1, .85], jitter: .004 });   // long and smooth, with nothing on it at all
      // the limbs: [direction it opens toward (corner frame: +x along the north wall, +z along the west wall, -y down), joints, length]
      const DIRS = [[1, -.03, .06], [.5, -.86, .07], [.26, -1, .08],                           // flat along the north wall (west of the window)
                    [.06, -.04, 1], [.06, -.3, 1], [.06, -.6, 1], [.07, -.9, .45],               // along the west wall
                    [1, .02, .3],                                                                 // along the top of the wall
                    [.32, -.86, .4], [.22, -.92, .3]];                                            // and two reaching down toward the desk
      const up = V(0, 1, 0), q = new T.Quaternion(), limbs = [];
      DIRS.forEach((d, li) => {
        const dir = V(...d).normalize();
        const base = G(spine, [(nz(li) - .5) * .1, -.05 - (li % 5) * .1, (nz(li + 7) - .5) * .1]);
        q.setFromUnitVectors(up, dir); base.quaternion.copy(q);
        const segs = [], N = 7, len = .3 + nz(li * 3) * .08;
        let at = base;
        for (let j = 0; j < N; j++) {
          const jn = R.add(`l${li}j${j}`, G(at, j ? [0, len, 0] : [0, .06, 0]), 7 - j * .35, .45);
          bone(jn, [0, 0, 0], [0, len, 0], .026 - j * .002, .022 - j * .002, wax, 5, .004);
          P(jn, A.ico(.03 - j * .002, 0), knob, [0, 0, 0], { jitter: 0 });
          segs.push(jn); at = jn;
        }
        for (let f = 0; f < 3; f++) bone(at, [0, len, 0], [(f - 1) * .025, len + .12, .02], .007, .003, wax, 4, 0);   // three thin fingers
        limbs.push({ segs, li, len, sgn: li % 2 ? 1 : -1, ph: nz(li * 5) * 6 });
      });
      let open = 0, lastT = 0, snapT = -9;
      return (t, dt = 1 / 60) => {
        dt = Math.min(dt, .1);
        if (t < lastT) open = 0; lastT = t;
        // it opens while the fire is low (slowly), and now and then draws in again of its own accord; a leap of the fire folds it at once
        const flare = A.fireLight.intensity > 40, cyc = (t % 70) / 70, wants = cyc < .72 ? 1 : 0;
        if (flare) { if (open > .25) snapT = t; open = Math.max(0, open - dt * 2.5); }
        else open += (wants - open) * (1 - Math.exp(-dt * (wants ? .07 : .25)));
        for (const L of limbs) {
          L.segs.forEach((jn, j) => {
            // each joint opens a moment after the one before it (from the body outward)
            const k = Math.max(0, Math.min(1, open * 1.6 - j * .09 - L.li * .015)), fold = 1 - k;
            const zig = (j % 2 ? -1 : 1) * L.sgn;
            const creep = Math.sin(t * .6 + L.ph + j) * .04 * k + (j === 6 ? Math.sin(t * 1.7 + L.ph) * .15 * k : 0);   // the tips feel at the stone
            R.want(`l${L.li}j${j}`, zig * fold * (j ? 2.75 : 1.2) + creep + k * (.22 + nz(L.li * 9 + j) * .2) * zig, fold * .3 * L.sgn, 0);   // open, still crooked at every joint
            R.rate(`l${L.li}j${j}`, t - snapT < 1.2 ? 16 - j : 7 - j * .35);       // folding away: fast, and it shivers as it locks
          });
        }
        R.want('spine', -.15 + open * .25, Math.sin(t * .13) * .2, open * .15);
        R.want('neck', open * .5 + Math.sin(t * .4) * .08 * open, Math.sin(t * .23) * .5 * open, 0);   // the bulb turns about, slowly, toward the room
        body.position.y = -open * .25; body.scale.setScalar(1 + Math.sin(t * 1.1) * .015);
        R.step(dt);
      };
    },
  },

  // ================================================================ THE LANTERN FOLK (three styles to compare)
  lanternheads: {
    name: 'The Lantern Folk', hour: 22,
    blurb: 'Slender figures of dark wood and iron whose heads are glass lanterns with a small living flame inside, hooded and wrapped for the road. On certain nights a procession of them passes along the old road beyond the walls, going somewhere, their lights bobbing over the stones.',
    view: [[-13.2, 2.2, 3.2], [-13, 1.2, 9]],
    knight: { place: 'courtyard', action: 'gaze', emote: 'heart', note: 'watching them go by, very quietly' },
    build(root) {
      const wood = A.mat('#3a2a1e', 0, .85), woodL = A.mat('#5a4330', 0, .8), iron = A.M.iron, wrap = ds('#4a3a34', 0, .95);
      const pane = new T.MeshStandardMaterial({ color: '#ffe7b8', transparent: true, opacity: .28, roughness: .05, metalness: .1, depthWrite: false });
      const ap = root.userData.appearance || {};
      const count = Math.max(5, Math.min(9, Math.round(7 * ((ap.variant || {}).size || 1))));
      return procession(root, (w, i) => {
        const legs = [-1, 1].map(sx => { const l = G(w, [sx * .08, .82, 0]); bone(l, [0, 0, 0], [0, -.82, .02], .04, .03, wood, 5); return l; });
        P(w, A.cyl(.15, .11, .62, 7), wood, [0, 1.12, 0], { scale: [1, 1, .7] });
        for (const y of [.95, 1.3]) P(w, A.cyl(.155, .155, .03, 7), iron, [0, y, 0], { scale: [1, 1, .72] });
        sheet(w, [[-.17, 1.42, -.08], [.17, 1.42, -.08], [.22, .78, -.18], [0, .7, -.2], [-.22, .78, -.18]], [[0, 1, 2], [0, 2, 3], [0, 3, 4]], wrap);
        const arms = [-1, 1].map(sx => { const a = G(w, [sx * .17, 1.38, 0]); bone(a, [0, 0, 0], [sx * .04, -.55, .05], .03, .025, woodL, 5); return a; });
        bone(w, [0, 1.43, 0], [0, 1.55, 0], .035, .035, iron, 5);
        const head = G(w, [0, 1.72, 0]);
        for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bone(head, [x * .1, -.15, z * .1], [x * .1, .15, z * .1], .012, .012, iron, 4);
        P(head, A.box(.22, .03, .22), iron, [0, -.16, 0]); P(head, new T.ConeGeometry(.17, .12, 4), iron, [0, .2, 0], { rot: [0, Math.PI / 4, 0] });
        const ring = new T.Mesh(new T.TorusGeometry(.04, .01, 4, 8), iron); ring.position.y = .3; head.add(ring);
        P(head, A.box(.2, .28, .2), pane, [0, 0, 0], { cast: false, jitter: 0 });
        const flame = new T.Mesh(new T.ConeGeometry(.045, .13, 6), glow('#ffb347', 3)); flame.position.y = -.05; head.add(flame);
        // what each carries: a hood, a staff, a bundle; no two alike
        const hood = sheet(w, [[-.19, 1.58, -.05], [.19, 1.58, -.05], [.16, 1.86, -.16], [0, 1.95, -.2], [-.16, 1.86, -.16]], [[0, 1, 2], [0, 2, 3], [0, 3, 4]], wrap);
        hood.visible = i % 3 !== 1;
        if (i % 2 === 0) { const st = G(arms[1], [.04, -.55, .05]); bone(st, [0, -.75, 0], [0, .6, 0], .018, .018, woodL, 5); }
        if (i % 3 === 2) P(w, A.box(.26, .22, .16), wrap, [0, 1.2, -.2], { jitter: .02 });
        return { legs, arms, flicker: t => { flame.scale.set(1, .85 + Math.sin(t * 11 + i) * .2, 1); flame.rotation.y = t * 2; }, lightY: 1.72 };
      }, count);
    },
  },
  // ================================================================ THE CARTOGRAPHER MOTH
  cartographer: {
    name: 'The Cartographer Moth', hour: 19,
    blurb: 'A moth whose wings are a map of somewhere real, with coasts, rivers and a dotted path to a place marked X. It likes to rest by the desk of someone who draws maps.',
    view: [[-1.1, 1.95, -1.55], [-.6, 2.45, -4.0]], views: { young: [[-3.1, 1.55, -1.3], [-4.55, .82, -2.45]] },   // the young: on his desk
    knight: { place: 'window', action: 'gaze', emote: 'spark', note: 'memorising the map on its wings' },
    build(root) {
      const v = root.userData.appearance?.variant || {}, young = v.age === 'young', old = v.age === 'old';
      // a moth resting on the wall by the window, wings spread: a map of somewhere real, coasts and a
      // river and a dotted path to an X. Its tell: the longer it rests, the more of the map shows. The
      // young: not a moth yet but a caterpillar, its skin all map-lines, inching over his desk, a bite
      // out of the corner of a map. The old: far bigger, its wings a map drawn over and over, faded,
      // frayed and see-through at the tips, a compass rose on each; it hardly stirs.
      const drawWings = (c, w, h, faded) => {
        c.clearRect(0, 0, w, h);
        const wing = sx => {
          c.save(); c.translate(w / 2, h / 2); c.scale(sx, 1);
          c.beginPath(); c.moveTo(8, -6); c.bezierCurveTo(60, -120, 230, -125, 240, -60); c.bezierCurveTo(250, -20, 170, 10, 120, 6);
          c.bezierCurveTo(200, 30, 210, 110, 140, 118); c.bezierCurveTo(80, 124, 20, 60, 8, 10); c.closePath();
          c.fillStyle = faded ? '#e6dcc4' : '#e8d8b0'; c.fill(); c.lineWidth = 3; c.strokeStyle = faded ? '#8a7254' : '#6b4a2a'; c.stroke(); c.clip();
          const r = A.rand(sx > 0 ? 3 : 8);
          const ink = faded ? ['#a9b9ad', '#8098a4', '#8a7058', '#7d8a68', '#b06a5a'] : ['#9fb7a6', '#5a7a8a', '#6b4a2a', '#4e6a3a', '#9a2b1f'];
          for (let layer = 0; layer < (faded ? 3 : 1); layer++) {          // the old: the same country drawn again and again
            c.globalAlpha = faded ? .55 : 1; c.save(); c.translate(layer * 9, layer * -6); c.rotate(layer * .05);
            c.fillStyle = ink[0]; c.beginPath(); c.moveTo(40, -130);       // the sea, with a ragged coast
            for (let y = -130; y < 130; y += 12) c.lineTo(150 + Math.sin(y * .05) * 30 + (r() - .5) * 20, y);
            c.lineTo(260, 130); c.lineTo(260, -130); c.closePath(); c.fill();
            c.strokeStyle = ink[1]; c.lineWidth = 2; c.beginPath(); c.moveTo(20, -40);
            for (let x = 20; x < 150; x += 10) c.lineTo(x, -40 + Math.sin(x * .08) * 14 + x * .3); c.stroke();   // a river
            c.fillStyle = ink[2];
            for (let i = 0; i < 6; i++) { const x = 40 + r() * 80, y = -90 + r() * 60; c.beginPath(); c.moveTo(x - 9, y + 8); c.lineTo(x, y - 8); c.lineTo(x + 9, y + 8); c.fill(); }
            c.fillStyle = ink[3]; for (let i = 0; i < 10; i++) { c.beginPath(); c.arc(30 + r() * 90, 30 + r() * 70, 4, 0, 6.3); c.fill(); }
            c.setLineDash([5, 5]); c.strokeStyle = ink[4]; c.lineWidth = 2; c.beginPath(); c.moveTo(25, 90);
            c.bezierCurveTo(60, 40, 90, 20, 115, -20); c.stroke(); c.setLineDash([]);
            if (sx > 0) { c.strokeStyle = ink[4]; c.lineWidth = 3; c.beginPath(); c.moveTo(108, -28); c.lineTo(122, -12); c.moveTo(122, -28); c.lineTo(108, -12); c.stroke(); }
            c.restore(); c.globalAlpha = 1;
          }
          c.strokeStyle = 'rgba(107,74,42,.5)'; c.lineWidth = 1; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(8, 0); c.lineTo(240 * Math.cos(-.9 + i * .5), 120 * Math.sin(-.9 + i * .5)); c.stroke(); }   // the veins
          if (faded) {                                                     // a compass rose on the hindwing; and the edges worn through
            c.save(); c.translate(150, 75); c.strokeStyle = '#7a5a3a'; c.fillStyle = '#7a5a3a'; c.lineWidth = 1.5;
            c.beginPath(); c.arc(0, 0, 20, 0, 6.3); c.stroke();
            for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28, l = k % 2 ? 14 : 26; c.beginPath(); c.moveTo(Math.cos(a + .2) * 4, Math.sin(a + .2) * 4); c.lineTo(Math.cos(a) * l, Math.sin(a) * l); c.lineTo(Math.cos(a - .2) * 4, Math.sin(a - .2) * 4); c.fill(); }
            c.restore();
            c.globalCompositeOperation = 'destination-out';
            for (let i = 0; i < 26; i++) { const a = -1.2 + r() * 2.6, d = 200 + r() * 40, x = 120 + Math.cos(a) * d * .55, y = Math.sin(a) * 120; c.globalAlpha = .4 + r() * .6; c.beginPath(); c.arc(x, y, 6 + r() * 12, 0, 6.3); c.fill(); }
            c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
          }
          c.restore();
        };
        wing(1); wing(-1);
        c.fillStyle = '#4a3626'; c.beginPath(); c.ellipse(w / 2, h / 2 + 4, 9, 60, 0, 0, 6.3); c.fill();
      };
      const r = A.rand(19);
      if (young) {
        // a caterpillar on his desk, inching along, its skin all map-lines; a map with a bite out of its corner
        const skinTex = canvasTex(128, 64, (c, w, h) => {
          c.fillStyle = '#e2d2a8'; c.fillRect(0, 0, w, h); c.strokeStyle = '#6b4a2a'; c.lineWidth = 1.5;
          for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(0, 8 + i * 12); for (let x = 0; x <= w; x += 8) c.lineTo(x, 8 + i * 12 + Math.sin(x * .2 + i) * 4); c.stroke(); }
          c.strokeStyle = '#5a7a8a'; c.beginPath(); c.moveTo(20, 0); c.bezierCurveTo(40, 30, 60, 20, 80, 64); c.stroke();
          c.setLineDash([3, 3]); c.strokeStyle = '#9a2b1f'; c.beginPath(); c.moveTo(0, 40); c.lineTo(w, 30); c.stroke();
        });
        const skin = new T.MeshStandardMaterial({ map: skinTex, roughness: .8, flatShading: true }), headM = A.mat('#3a2a1e', .1, .5), leg = A.mat('#6b4a2a', 0, .8);
        const mapTex2 = canvasTex(128, 96, (c, w, h) => {
          c.fillStyle = '#e8dcc0'; c.fillRect(0, 0, w, h); c.fillStyle = '#9fb7a6'; c.fillRect(80, 0, 48, h);
          c.strokeStyle = '#6b4a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(80, 0); for (let y = 0; y < h; y += 8) c.lineTo(80 + Math.sin(y * .3) * 6, y); c.stroke();
          c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(0, 0, 26, 0, 6.3); c.fill();   // the bite
          for (const [x, y] of [[24, 8], [8, 24], [20, 20]]) { c.beginPath(); c.arc(x, y, 6, 0, 6.3); c.fill(); }
        });
        const sheetM = new T.MeshStandardMaterial({ map: mapTex2, alphaTest: .5, roughness: .9, side: T.DoubleSide });
        const mp = new T.Mesh(new T.PlaneGeometry(.3, .22), sheetM); mp.rotation.x = -Math.PI / 2; mp.position.set(-4.6, .813, -2.82); root.add(mp);
        const N = 9, segs = [];
        for (let i = 0; i < N; i++) {
          const s = G(root), rad = .028 + Math.sin(Math.PI * (i + .5) / N) * .012;
          P(s, new T.IcosahedronGeometry(rad, 1), i === N - 1 ? headM : skin, [0, 0, 0], { scale: [1, .9, 1.15], jitter: 0, cast: false });
          if (i > 1 && i < N - 1) for (const sx of [-1, 1]) P(s, A.box(.008, .02, .008), leg, [sx * rad * .7, -rad * .8, 0], { cast: false });
          segs.push({ s, rad });
        }
        const head = segs[N - 1].s; for (const sx of [-1, 1]) bone(head, [sx * .012, .02, .01], [sx * .02, .045, .03], .003, .002, leg, 3);
        const LEN = .05, X = -4.62, Z0 = -2.05, Z1 = -2.68;               // up the desk to the map, and back
        return (t) => {
          const cyc = 34, k = t % cyc, out = k < 17;                     // inch to the map, nibble, inch back
          const u = out ? Math.min(1, k / 13) : 1 - Math.min(1, (k - 17) / 13), nib = out && k > 13 ? pulse(k - 13, 1, .5) : 0;
          const hz = Z0 + (Z1 - Z0) * u, dir = out ? -1 : 1, hump = Math.max(0, Math.sin(t * 2.2));
          segs.forEach(({ s, rad }, i) => {
            const back = (N - 1 - i) * LEN * (1 - hump * .25), z = hz - dir * back;
            const lift = Math.sin(Math.PI * (i / (N - 1))) * hump * .03;   // the inch: a hump that travels along it
            s.position.set(X + Math.sin(t * .7 + i * .5) * .006, .81 + rad * .9 + lift, z);
            s.rotation.y = out ? Math.PI : 0;
          });
          head.rotation.x = -nib * .4;
        };
      }
      const mapTex = canvasTex(512, 256, (c, w, h) => drawWings(c, w, h, old));
      const wingMat = new T.MeshStandardMaterial({ map: mapTex, emissiveMap: mapTex, emissive: '#ffd9a0', emissiveIntensity: old ? .2 : .35, transparent: true, alphaTest: .4, side: T.DoubleSide, roughness: .9 });
      // what has not shown yet: the same wings, blank parchment, fading as it rests
      const blankTex = canvasTex(512, 256, (c, w, h) => { drawWings(c, w, h, old); c.globalCompositeOperation = 'source-atop'; c.fillStyle = old ? '#e6dcc4' : '#e8d8b0'; c.fillRect(0, 0, w, h); });
      const blankMat = new T.MeshStandardMaterial({ map: blankTex, transparent: true, opacity: 1, depthWrite: false, side: T.DoubleSide, roughness: .9, emissive: '#ffd9a0', emissiveMap: blankTex, emissiveIntensity: .3 });
      const BY = old ? 2.75 : 2.5, big = G(root, [-.55, BY, -3.96], [0, 0, -.06]); big.scale.setScalar((v.size || 1) * (old ? 2.0 : 1.35));   // (the old: higher, clear of the bookshelf)
      const fur = A.mat(old ? '#6a5a4c' : '#5a4636', 0, 1), furL = A.mat(old ? '#9a8a74' : '#8a7458', 0, 1), eye = A.mat('#1a1410', .3, .3);
      for (let i = 0; i < 6; i++) P(big, A.ico(.055 - i * .005, 1), i % 2 ? furL : fur, [0, .07 - i * .055, .02], { scale: [1, 1.15, .9], jitter: .004 });   // thorax and abdomen
      P(big, A.ico(.075, 1), furL, [0, .06, .03], { scale: [1.1, .8, .9], jitter: .01 });   // a ruff of fur
      for (const sx of [-1, 1]) {
        P(big, A.ico(.016, 1), eye, [sx * .025, .125, .04], { cast: false });
        const ant = G(big, [sx * .02, .13, .02], [0, 0, sx * -.45]);
        bone(ant, [0, 0, 0], [0, .2, .03], .007, .004, fur, 4);
        for (let k = 0; k < 6; k++) bone(ant, [0, .025 + k * .03, .01], [sx * .045, .045 + k * .03, .02], .003, .002, furL, 3);   // feathered
        for (let k = 0; k < 3; k++) bone(big, [sx * .02, .05 - k * .03, .03], [sx * .07, .02 - k * .04, -.01], .006, .004, fur, 3);   // legs, gripping the wall
      }
      const wings = [];
      for (const sx of [-1, 1]) {
        const w = G(big, [0, .0, .01]);
        for (const mat of [wingMat, blankMat]) {
          const plane = new T.PlaneGeometry(.55, .55);
          const uv = plane.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, sx > 0 ? .5 + uv.getX(i) * .5 : uv.getX(i) * .5);
          const m = new T.Mesh(plane, mat); m.position.set(sx * .275, 0, mat === blankMat ? .002 : 0); w.add(m);
        }
        wings.push({ w, sx });
      }
      let rested = 0;
      return (t, dt) => {
        const every = old ? 29 : 17, shut = pulse(t + 3, every, old ? 2 : 1.2);   // now and then it folds its wings and settles them again
        rested = shut > .3 ? Math.max(0, rested - dt * 1.5) : rested + dt;   // a flutter loses it a little
        blankMat.opacity = 1 - smooth(1, old ? 30 : 20, rested) * .98;   // its tell: the longer it rests, the more of the map shows
        for (const { w, sx } of wings) w.rotation.y = -sx * (shut * 1.3 + Math.sin(t * (old ? .6 : 1.5)) * (old ? .02 : .05));
        big.position.y = BY + shut * .04;
      };
    },
  },

  // ================================================================ THE THORNMOTHER
  thorn: {
    name: 'The Thornmother', hour: 13,
    blurb: 'A great stag woven of bramble and briar, deep in the chest and high in the neck, with antlers of thorn in blossom. Brambles spring up where it steps, and fade again. It is old, and it is not in a hurry.',
    view: [[-8.2, 2.4, 3.6], [-11.4, 2.0, 7.8]],
    knight: { place: 'courtyard', action: 'gaze', emote: 'question', note: 'watching the brambles grow where it walked' },
    build(root) {
      const v = root.userData.appearance?.variant || {};
      const young = v.age === 'young', old = v.age === 'old';
      // the young: a fawn, all legs, a slight body spotted with white blossom, big ears, antler buds;
      // it goes in leaps. The old: its antlers grown into the crown of a tree, in leaf, with nests in
      // the forks and small birds about them; a beard of moss from its chin; head low under the
      // weight, and slow.
      const size = (v.size || 1) * (young ? .55 : old ? 1.1 : 1);
      const g = G(root, [-11, 0, 7.8]); const stag = G(g); stag.scale.setScalar(size);
      const bark = A.mat('#4a3b2a', 0, .95), barkD = A.mat('#2f251b', 0, .95), core = A.mat('#3a2e20', 0, 1);
      const leaf = A.mat(young ? '#6fa040' : old ? '#56622e' : '#56703a', 0, .9), leafL = A.mat(young ? '#9ccc5a' : old ? '#8a8a3c' : '#7a9548', 0, .9), moss = A.mat('#4f6a33', 0, 1);
      const beardM = A.mat('#6f7c58', 0, 1), nestM = A.mat('#6a5232', 0, 1), eggM = A.mat('#bcd6d2', 0, .6);
      const bloom = A.mat('#eab0c0', 0, .7, { emissive: '#3a1c24', emissiveIntensity: .3 }), bloomW = A.mat('#f3ecdc', 0, .7);
      const thornM = A.mat('#22190f', 0, .8), hoof = A.mat('#1a1410', .1, .6), eye = glow('#c8ff9a', 1.4);
      const r = A.rand(12 + Math.abs(Math.round((v.hue || 0) * 1000)));
      // vines woven round a shape: arcs over the surface of an ellipsoid (centre c, radii rad)
      const weave = (parent, c, rad, n, thick) => {
        P(parent, A.ico(1, 1), core, c, { scale: rad.map(x => x * .72), jitter: .04 });            // the dark heart of the thicket
        for (let i = 0; i < n; i++) {
          const a0 = r() * 6.28, b0 = (r() - .5) * 2.4, da = (r() - .5) * 1.6, db = (r() - .5) * 1.2;
          let prev = null;
          for (let k = 0; k <= 4; k++) {
            const a = a0 + da * k / 4, b = b0 + db * k / 4;
            const p = [c[0] + Math.cos(a) * Math.cos(b) * rad[0], c[1] + Math.sin(b) * rad[1], c[2] + Math.sin(a) * Math.cos(b) * rad[2]];
            if (prev) bone(parent, prev, p, thick, thick * .8, i % 3 ? bark : barkD, 4, .01);
            if (prev && k === 2 && i % 2) P(parent, new T.ConeGeometry(.018, .1, 3), thornM, p, { rot: [r() * 3, 0, r() * 3], cast: false });
            prev = p;
          }
          if (i % 4 === 0) P(parent, A.ico(.1 + r() * .08, 0), r() < .5 ? leaf : leafL, prev, { jitter: .03, cast: false });
          if (i % (young ? 4 : old ? 23 : 7) === 3) P(parent, A.ico(.045, 0), r() < .7 ? bloom : bloomW, prev, { cast: false });
          if (i % (old ? 3 : 9) === (old ? 1 : 5)) P(parent, A.ico(old ? .11 : .08, 0), moss, prev, { scale: [1, .5, 1], cast: false });
        }
      };
      const body = G(stag, [0, 0, 0]);
      const sl = young ? .74 : 1;                                         // the fawn: slight, so all legs
      weave(body, [0, 2.05, .25], [.42 * sl, .5 * sl, .55 * sl], young ? 44 : 64, .042);   // the deep chest
      weave(body, [0, 2.0, -.5], [.36 * sl, .4 * sl, .5 * sl], young ? 32 : 46, .036);     // the belly and haunch
      if (young) for (let i = 0; i < 16; i++) {                           // a fawn's spots: white blossom along its back and flanks
        const a = (r() - .5) * 2.2, z = -.75 + r() * 1.3, ry = z > -.1 ? .37 : .3;
        P(body, A.ico(.04, 0), bloomW, [Math.sin(a) * ry * 1.05, 2.03 + Math.cos(a) * ry, z], { cast: false });
      }
      // legs: twisted bundles of three vines, jointed like a stag's, dark hooves
      const legs = [];
      for (const [x, z, front] of [[-.24, .55, 1], [.24, .55, 1], [-.22, -.75, 0], [.22, -.75, 0]]) {
        const top = G(body, [x, 1.75, z]);
        const mid = G(top, [0, -.72, front ? .04 : -.14]);
        const low = G(mid, [0, -.55, front ? -.04 : .12]);
        for (let k = 0; k < 3; k++) {
          const tw = (k - 1) * .035;
          bone(top, [tw, .1, 0], [-tw, -.72, front ? .04 : -.14], .055, .04, k % 2 ? bark : barkD, 5);
          bone(mid, [0, 0, 0], [tw, -.55, front ? -.04 : .12], .042, .032, k % 2 ? barkD : bark, 5);
          bone(low, [0, 0, 0], [-tw * .5, -.46, .04], .03, .026, k % 2 ? bark : barkD, 5);
        }
        P(low, A.cyl(.05, .07, .1, 6), hoof, [0, -.5, .05]);
        if (young) top.scale.y = .8;                                     // the fawn: long-legged, but a fawn's long
        legs.push({ top, mid, front, ph: (x > 0 ? 0 : Math.PI) + (front ? 0 : Math.PI * .5) });
      }
      // the neck, held high; the long head
      const neck = G(body, [0, 2.3, young ? .6 : .72], [-.95, 0, 0]);
      weave(neck, [0, young ? .33 : .45, 0], [.2 * (young ? .8 : 1), young ? .4 : .55, .18 * (young ? .8 : 1)], 26, .03);
      const head = G(neck, [0, young ? .72 : 1.0, 0], [1.25, 0, 0]); if (young) head.scale.setScalar(1.3);
      weave(head, [0, 0, .25], [.13, .14, .34], 18, .025);
      P(head, A.ico(.06, 0), hoof, [0, -.03, .58], { cast: false });         // the nose, a knot of dark wood
      for (const sx of [-1, 1]) {
        P(head, A.ico(.028, 0), eye, [sx * .11, .06, .2], { cast: false });  // faint and green, kindly enough
        const ear = G(head, [sx * .12, .14, .0], [-.3, 0, sx * -.9]); P(ear, A.ico(.07, 0), leaf, [0, .08, 0], { scale: young ? [.75, 1.9, .3] : [.5, 1.3, .25] });
      }
      // antlers of briar, thorned, in blossom
      const forks = [];
      const branch = (from, dir, len, depth) => {
        const to = [from[0] + dir[0] * len, from[1] + dir[1] * len, from[2] + dir[2] * len];
        if (old && depth === 2) forks.push(to);
        if (old && depth === 1) for (let k = 0; k < 2; k++) P(head, A.ico(.13 + r() * .06, 1), r() < .5 ? leaf : leafL, [to[0] + (r() - .5) * .2, to[1] + (r() - .5) * .1, to[2] + (r() - .5) * .2], { scale: [1, .7, 1], jitter: .05, cast: false });   // leaf all through the crown
        if (old && depth === 0) {                                         // the old: every tip in leaf, a crown
          bone(head, from, to, .03, .015, bark, 5);
          for (let k = 0; k < 3; k++) P(head, A.ico(.14 + r() * .08, 1), r() < .55 ? leaf : leafL, [to[0] + (r() - .5) * .16, to[1] + (r() - .3) * .12, to[2] + (r() - .5) * .16], { scale: [1, .7, 1], jitter: .05, cast: k === 0 });
          if (r() < .25) P(head, A.ico(.045, 0), r() < .6 ? bloom : bloomW, [to[0], to[1] + .12, to[2]], { cast: false });
          return;
        }
        bone(head, from, to, .03 + depth * .012, .015 + depth * .008, depth > 1 ? barkD : bark, 5);
        for (let k = 0; k < 2; k++) { const u = .3 + k * .4; P(head, new T.ConeGeometry(.015, .09, 3), thornM, [from[0] + dir[0] * len * u, from[1] + dir[1] * len * u + .03, from[2] + dir[2] * len * u], { cast: false }); }
        if (depth === 0) { if (!old || r() < .12) P(head, A.ico(.055, 0), r() < .65 ? bloom : bloomW, to, { cast: false }); if (!old && r() < .5) P(head, A.ico(.07, 0), leafL, [to[0], to[1] - .05, to[2]], { scale: [1, .4, 1], cast: false }); return; }
        for (const s of [-1, 1]) { const d = V(dir[0] + s * .4 * (r() + .3), dir[1] + .15, dir[2] + (r() - .6) * .4).normalize(); branch(to, [d.x, d.y, d.z], len * .66, depth - 1); }
      };
      if (young) for (const sx of [-1, 1]) { bone(head, [sx * .09, .13, -.02], [sx * .14, .26, -.06], .035, .02, bark, 5); P(head, A.ico(.04, 0), leafL, [sx * .14, .28, -.06], { cast: false }); }   // buds
      else for (const sx of [-1, 1]) branch([sx * .09, .13, -.02], [sx * .62, .75, -.25], old ? .68 : .6, old ? 4 : 3);   // the old: a tree's crown
      if (old) {
        for (const f of forks.filter((_, i) => i % 3 === 1).slice(0, 3)) {   // nests in the forks
          P(head, A.cyl(.11, .07, .07, 8), nestM, f, { jitter: .02 });
          for (let k = 0; k < 2; k++) P(head, A.ico(.025, 0), eggM, [f[0] + (k - .5) * .05, f[1] + .045, f[2]], { scale: [1, 1.3, 1], cast: false, jitter: 0 });
        }
        for (let k = 0; k < 9; k++) {                                     // a beard of moss from its chin and throat
          const x = (k - 4) * .022, z = .2 + (k % 3) * .08, len = .3 + r() * .25;
          bone(head, [x, -.1, z], [x * 1.4 + (r() - .5) * .04, -.1 - len, z - .04], .022, .006, k % 2 ? beardM : moss, 4);
        }
        for (let k = 0; k < 6; k++) P(neck, A.ico(.06, 0), beardM, [(r() - .5) * .2, .2 + r() * .5, .16], { scale: [1, 2.2, .6], cast: false });
      }
      merge(body); merge(neck); merge(head);                                // one draw per material, not hundreds
      // the old: small birds about its crown
      const birdM = A.mat('#2a2620', 0, .8);
      const birds = old ? Array.from({ length: 3 }, (_, i) => {
        const bd = G(root); P(bd, A.ico(.035, 0), birdM, [0, 0, 0], { scale: [.8, .8, 1.4], cast: false });
        const wings = [-1, 1].map(sx => { const w = G(bd, [sx * .02, .01, 0]); P(w, A.box(.07, .006, .035), birdM, [sx * .035, 0, 0], { cast: false }); return { w, sx }; });
        return { bd, wings, ph: i * 2.1, rad: .5 + i * .18 };
      }) : [];
      const crown = V();
      for (const { top, mid } of legs) { merge(top); merge(mid); }
      // brambles where it has walked: they spring up, and fade again
      const brambles = Array.from({ length: 12 }, () => {
        const b = G(root); b.visible = false; const rr = A.rand(Math.floor(r() * 1e6));
        for (let k = 0; k < 7; k++) { const a = rr() * 6.28; bone(b, [0, 0, 0], [Math.cos(a) * .4, .1 + rr() * .35, Math.sin(a) * .4], .022, .008, bark, 4); }
        P(b, A.ico(.13, 0), leaf, [0, .1, 0]); if (rr() < .6) P(b, A.ico(.045, 0), bloom, [.1, .32, 0]);
        merge(b); b.userData.born = -99; return b;
      });
      let lastX = -11, bi = 0, dir = 1;
      return (t, dt) => {
        const pace = young ? .06 : old ? .032 : .045;
        // the fawn stops now and then to look about (its own clock stands still while it does)
        const SP = 17, SL = 3.2, sk = (t + 2) % SP, looking = young && sk < SL, tw = young ? t - SL * Math.floor((t + 2) / SP) - Math.min(sk, SL) : t;
        const x = -11.2 + Math.sin(tw * pace) * 4.2, vx = x - g.position.x;
        if (Math.abs(vx) > 1e-5) dir = Math.sign(vx);
        g.position.set(x, gy(x, 7.8), 7.8); g.rotation.y += ((dir > 0 ? Math.PI / 2 : -Math.PI / 2) - g.rotation.y) * Math.min(1, dt * 1.5);
        const moving = Math.abs(Math.cos(tw * pace)) > .12 && !looking, ph = t * (young ? 2.8 : old ? 1.0 : 2.0);
        // the fawn: mostly a light, springy walk; now and then a short run of three or four leaps
        const bursting = young && moving && (tw % 11) < 3.4;
        if (bursting) {                                                   // a leap: gather, spring, tuck, land
          const h = (tw * 1.1) % 1, air = h < .5 ? Math.sin(h / .5 * Math.PI) : 0, gather = h > .8 ? Math.sin((h - .8) / .2 * Math.PI) : 0;
          for (const { top, mid, front } of legs) { top.rotation.x = (front ? -.7 : .7) * air + (front ? .2 : -.2) * gather; mid.rotation.x = (front ? .9 : -.9) * air; }
          body.position.y = -.35 + air * .55 - gather * .08; body.rotation.x = (h < .25 ? -1 : 1) * air * .12;
        } else if (young) {
          for (const { top, mid, front, ph: p } of legs) {
            const s = moving ? Math.sin(ph + p) : 0;
            top.rotation.x = s * .35; mid.rotation.x = Math.max(0, front ? -s : s) * .6 * (front ? 1 : -1);
          }
          body.position.y = -.35 + (moving ? Math.abs(Math.sin(ph)) * .07 : 0); body.rotation.x = 0;   // springy
        } else {
          for (const { top, mid, front, ph: p } of legs) {
            const s = moving ? Math.sin(ph + p) : 0;
            top.rotation.x = s * .3; mid.rotation.x = Math.max(0, front ? -s : s) * .5 * (front ? 1 : -1);
          }
          body.position.y = moving ? Math.abs(Math.sin(ph)) * .04 : 0;
        }
        neck.rotation.x = young ? -1.15 + Math.sin(t * .3) * .06 - (looking ? .2 : 0)   // the fawn: head up, and higher still when it stops to look
                                : (old ? -.72 : -.95) + Math.sin(t * .3) * .06 + (moving ? 0 : pulse(t, 17, 6) * .5);   // stops now and then to graze (the old: head low under its crown)
        if (old) { head.localToWorld(crown.set(0, .9, -.4));
          for (const { bd, wings, ph: bp, rad } of birds) {
            const k = t * .9 + bp, perch = pulse(t + bp * 3, 11, 4) > .2;   // they flit about, and settle now and then
            bd.position.set(crown.x + Math.cos(k) * rad * (perch ? .5 : 1), crown.y + Math.sin(k * 1.7) * .25 - (perch ? .2 : 0), crown.z + Math.sin(k) * rad * (perch ? .5 : 1));
            bd.rotation.y = -k; for (const { w, sx } of wings) w.rotation.z = sx * Math.sin(t * (perch ? 2 : 22) + bp) * .7;
          } }
        head.rotation.y = looking ? Math.sin(t * 1.3) * .7 * smooth(0, .6, sk) : Math.sin(t * .25) * .3;   // looking about
        if (Math.abs(x - lastX) > 1.1) { const b = brambles[bi++ % brambles.length]; b.position.set(x, gy(x, 7.8), 7.8 + (bi % 2 ? .5 : -.5)); b.rotation.y = bi; b.visible = true; b.userData.born = t; lastX = x; }
        for (const b of brambles) if (b.visible) { const k = (t - b.userData.born) / 40; b.scale.setScalar(Math.min(1, (t - b.userData.born) * 1.5) * (1 - smooth(.7, 1, k))); if (k > 1) b.visible = false; }
      };
    },
  },

  // ================================================================ THE ASHWOLF PACK
  ashwolves: {
    name: 'The Ashwolf pack', hour: 22,
    blurb: 'Wolves of charred ash with fire still in the cracks of them, smoke streaming off their backs. Drawn to the forge\'s heat. They circle just beyond the walls, and one of them always sits apart, keeping watch: when it howls, the pack moves.',
    view: [[-14.2, 2.6, 3.2], [-20.5, .6, -.4]],
    knight: { place: 'repair:doorway', action: 'stand', emote: 'exclaim', note: 'keeping the doorway between him and them' },
    build(root) {
      const v = root.userData.appearance?.variant || {};
      const age = v.age || '', count = Math.max(3, Math.min(5, Math.round(4 * (v.size || 1))));
      // a "young" pack brings pups among the grown. Pups: fluffy smoke, few cracks, big heads and ears,
      // short muzzles, clumsy bounding. An "old" pack is a different pack altogether: grey ash all
      // through, its fire burned low, circling slow and steady in a file behind its leader: a big old
      // grey wolf with a mane of pale ash lit by its own embers, a torn ear, a stiff leg it favours.
      const ashOf = c => A.mat(c, 0, .95, { emissive: '#4a1a08', emissiveIntensity: .85 });
      const ash = ashOf('#2e2724'), ashOld = A.mat('#77716c', 0, .95, { emissive: '#3a1a0c', emissiveIntensity: .3 }), ashPup = ashOf('#3a3230');   // the old: grey ash, the fire in it burned low
      const ashL = A.mat('#4d423c', 0, .95, { emissive: '#3a1608', emissiveIntensity: .7 });   // the fire shows through
      const mats = [ash, ashOld, ashPup, ashL];
      const ember = glow('#ff6a1f', age === 'old' ? 1.7 : 2.6), emberD = glow('#c2410f', age === 'old' ? 1.0 : 1.6), eyeM = glow('#ffb347', 3), maw = glow('#ff9a3a', 1.2);
      const smokeMat = () => new T.SpriteMaterial({ map: puff(), color: '#3d3633', transparent: true, opacity: .3, depthWrite: false });
      // cracks of fire along a bone: thin glowing slivers on its surface
      const cracks = (parent, n, rx, ry, rz, r) => { for (let k = 0; k < n; k++) {
        const a = r() * 6.28, z = (r() - .5) * 2 * rz;
        const rib = r() < .4;                                       // along the body, or around a rib
        P(parent, A.box(.016, .018, .12 + r() * .18), r() < .7 ? ember : emberD, [Math.cos(a) * rx, Math.abs(Math.sin(a)) * ry * .98, z],
          { rot: rib ? [0, Math.PI / 2, a + (r() - .5) * .3] : [(r() - .5) * .3, (r() - .5) * .35, 0], cast: false });
      } };
      const wolf = (n, scale, kind = '') => {
        const pup = kind === 'young', old = kind === 'old', grey = kind === 'grey', ash = pup ? ashPup : old || grey ? ashOld : mats[0];
        const r = A.rand(n * 9 + 2), w = G(root), body = G(w, [0, .66 * scale, 0]); body.scale.setScalar(scale);
        // chest deep, waist tucked, hips lower
        const chest = G(body, [0, .04, .3]); P(chest, A.ico(1, 1), ash, [0, 0, 0], { scale: [.24, .3, .34], jitter: .02 });
        const waist = G(body, [0, .06, -.12]); P(waist, A.ico(1, 1), ash, [0, 0, 0], { scale: [.17, .2, .3], jitter: .02 });
        const hips = G(body, [0, .02, -.45]); P(hips, A.ico(1, 1), ashL, [0, 0, 0], { scale: [.2, .23, .22], jitter: .02 });
        const cr = pup ? .3 : old ? .5 : grey ? .6 : 1;                             // a pup's fire hasn't caught yet; an old one's is burning low
        cracks(chest, Math.round(16 * cr), .22, .28, .3, r); cracks(waist, Math.round(9 * cr), .16, .18, .28, r); cracks(hips, Math.round(9 * cr), .18, .2, .2, r);
        if (pup) for (let k = 0; k < 10; k++) P(body, A.ico(.07 + r() * .05, 0), ashL, [(r() - .5) * .4, (r() - .2) * .4, (r() - .5) * .9], { cast: false });   // fluff
        if (old) for (let k = 0; k < 3; k++) P(chest, A.box(.01, .012, .25), A.mat('#1a1614'), [.2 - k * .03, .18, (k - 1) * .08], { rot: [0, .2, .5], cast: false });   // old scars
        if (old) {                                                       // heavy in the shoulder, and a mane of pale ash at its neck
          chest.scale.set(1.22, 1.12, 1.08);
          const mane = A.mat('#c4bcb2', 0, 1, { emissive: '#7a3412', emissiveIntensity: .8 }), maneD = A.mat('#9a938a', 0, 1, { emissive: '#4a1e0a', emissiveIntensity: .6 });   // lit from within, so it shows at night
          for (let k = 0; k < 34; k++) { const a = (k / 34) * 6.28, ring = k % 2;
            P(body, new T.ConeGeometry(.05, .2 + r() * .12, 4), ring ? mane : maneD, [Math.sin(a) * (.2 + ring * .04), .2 + Math.cos(a) * .2, .5 - ring * .1 + (r() - .5) * .06], { rot: [-1.2 + Math.cos(a) * .4, 0, Math.sin(a) * -.9], cast: false }); }
        }
        for (let k = 0; k < 9; k++) P(body, new T.ConeGeometry(.04, .14 + r() * .1, 4), ash, [(r() - .5) * .08, .3 - k * .02, .38 - k * .1], { rot: [-.9, 0, (r() - .5) * .5], cast: false });   // the ruff, the ridge
        const neck = G(body, [0, .18, .52], [-.55, 0, 0]);
        P(neck, A.cyl(.1, .14, .32, 6), ash, [0, .14, 0]);
        const head = G(neck, [0, .3, .02], [.55, 0, 0]); if (pup) head.scale.setScalar(1.35);
        P(head, A.ico(.15, 1), ash, [0, 0, 0], { scale: [.9, .85, 1.05] });
        P(head, A.box(.12, .1, pup ? .14 : .26), ashL, [0, -.03, pup ? .14 : .2], { jitter: .015 });   // the muzzle (short on a pup)
        P(head, A.ico(.03, 0), A.mat('#0c0807'), [0, .0, .34], { cast: false });         // nose
        const jaw = G(head, [0, -.07, .08]); P(jaw, A.box(.1, .04, .24), ash, [0, -.02, .12], { jitter: .01 });
        P(jaw, A.box(.08, .01, .2), maw, [0, .01, .12], { cast: false });              // fire in its mouth
        for (const sx of [-1, 1]) {
          if (!(old && sx > 0)) P(head, new T.ConeGeometry(pup ? .06 : .045, pup ? .2 : .15, 4), ash, [sx * .08, .15, -.04], { rot: [-.15, 0, sx * -.25] });
          else P(head, A.box(.05, .05, .03), ash, [sx * .08, .14, -.04], { rot: [0, 0, .4] });   // a torn ear
          P(head, A.box(.05, .02, .035), eyeM, [sx * .068, .045, .112], { rot: [0, sx * .4, sx * .15], cast: false });   // narrow, burning
        }
        // legs: three joints each, so the trot reads
        const legs = [];
        for (const [x, z, front] of [[-.13, .34, 1], [.13, .34, 1], [-.12, -.46, 0], [.12, -.46, 0]]) {
          const top = G(body, [x, -.05, z]);
          bone(top, [0, 0, 0], [0, -.26, front ? .04 : -.06], .06, .045, ash, 5);
          const mid = G(top, [0, -.26, front ? .04 : -.06]);
          bone(mid, [0, 0, 0], [0, -.22, front ? -.03 : .06], .042, .035, ash, 5);
          const low = G(mid, [0, -.22, front ? -.03 : .06]);
          bone(low, [0, 0, 0], [0, -.16, .03], .033, .028, ashL, 5); P(low, A.box(.06, .03, .1), ash, [0, -.17, .06]);
          legs.push({ top, mid, front, ph: (x > 0 ? 0 : Math.PI) + (front ? 0 : Math.PI) });
        }
        const tailBase = G(hips, [0, .1, -.2], [-2.3, 0, 0]);
        const tc = chain(tailBase, 4, .13, .055, .03, ashL, { sides: 5 });
        const smoke = Array.from({ length: 4 }, (_, k) => { const s = new T.Sprite(smokeMat()); root.add(s); return { s, k }; });
        if (old) for (const l of legs.slice(2, 3)) l.stiff = true;      // a back leg it favours
        return { w, body, head, neck, jaw, legs, tc, smoke, n, tailBase, pup, old };
      };
      const kindOf = n => age === 'old' ? (n === 0 ? 'old' : 'grey') : age === 'young' && n >= count - 2 ? 'young' : '';
      const sizeOf = (n, k) => (k === 'young' ? .55 : k === 'old' ? 1.3 : 1) * (n === 0 ? 1.08 : .85 + A.rand(n + 40)() * .2);
      const wolves = Array.from({ length: count + (age === 'young' ? 1 : 0) }, (_, n) => { const k = kindOf(n); return wolf(n, sizeOf(n, k), k); });
      const watcher = wolves[age === 'old' ? 1 : 0];                // the one that sits apart, on the rubble, and watches (the old leader leads instead)
      const WATCH = [-18.6, 0, -3.6];                              // just outside the west wall's corner
      const EN = 60, ep = new Float32Array(EN * 3), eLife = Float32Array.from({ length: EN }, (_, i) => i / EN);
      const eg = new T.BufferGeometry(); eg.setAttribute('position', new T.BufferAttribute(ep, 3));
      root.add(new T.Points(eg, new T.PointsMaterial({ color: '#ffb35a', size: .05, transparent: true, depthWrite: false })));
      const tmp = V(), cam = V();
      return (t, dt) => {
        const cycle = t % 22, howl = cycle > 15 && cycle < 18.5;            // the watcher howls; then the pack moves
        const moving = cycle > 17 || cycle < 7;
        for (const wf of wolves) {
          const { w, body, head, neck, jaw, legs, tc, smoke, n } = wf;
          if (wf === watcher) {
            w.position.set(WATCH[0], gy(WATCH[0], WATCH[2]) + WATCH[1], WATCH[2]);
            A.camera.getWorldPosition(cam); w.rotation.y = Math.atan2(cam.x - WATCH[0], cam.z - WATCH[2]) * .6 + .6;
            body.rotation.x = wf.old ? -.32 : -.5; body.position.y = wf.old ? .44 : .5;   // sitting up (the old: slumped, heavy)
            legs.forEach(({ top, mid }, i) => { top.rotation.x = i < 2 ? .35 : -1.2; mid.rotation.x = i < 2 ? -.2 : 1.6; });
            const h = howl ? Math.sin((cycle - 15) / 3.5 * Math.PI) : 0;
            neck.rotation.x = (wf.old ? -.2 : -.55) - h * .7; head.rotation.x = (wf.old ? .35 : .55) - h * .5; jaw.rotation.x = h * .5;   // the old: head low between its shoulders
          } else {
            // circling just beyond the wall, slowly while waiting, at a lope once the watcher has howled
            const speed = (moving ? .34 : .1) * (age === 'old' ? .7 : 1), k = age === 'old' ? -n * .5 : n * 2.2;   // the old pack: in a file behind its leader
            wf.a = (wf.a ?? k) + dt * speed;
            const a = wf.a, x = -20.6 + Math.cos(a) * 2.2, z = 4.7 + Math.sin(a) * 1.8;   // beyond the walls, clear of the barrow's stones
            w.position.set(x, gy(x, z), z); w.rotation.y = Math.atan2(-Math.sin(a) * 2.2, Math.cos(a) * 1.8);
            const ph = t * (moving ? (wf.pup ? 12 : wf.old ? 7 : 9) : 4) + n;
            body.position.y = .66 * (body.scale.x) + Math.abs(Math.sin(ph)) * (moving ? (wf.pup ? .08 : .04) : .015);   // pups bound along
            if (wf.old) body.rotation.z = moving ? Math.sin(ph) * .05 : 0;                                            // the old limp
            legs.forEach(({ top, mid, front, ph: p, stiff }) => { const s = Math.sin(ph + p) * (stiff ? .3 : 1); top.rotation.x = s * (moving ? .55 : .3); mid.rotation.x = stiff ? 0 : Math.max(0, front ? -s : s) * .6 * (front ? -1 : 1); });
            neck.rotation.x = -.55 + (moving ? .25 : 0); head.rotation.x = .55 - (moving ? .2 : 0);
            head.rotation.y = Math.sin(t * .6 + n) * .25; jaw.rotation.x = pulse(t + n * 3, 6, .6) * .25;
          }
          tc.forEach((j, i) => { j.rotation.z = Math.sin(t * 3 + n + i) * .15; });
          body.getWorldPosition(tmp);
          for (const { s, k } of smoke) { const u = (t * .55 + k / 4 + n * .13) % 1; s.position.set(tmp.x - Math.sin(w.rotation.y) * u * .6, tmp.y + .15 + u * 1.2, tmp.z - Math.cos(w.rotation.y) * u * .6); s.scale.setScalar((.35 + u * 1.2) * body.scale.x); s.material.opacity = .3 * (1 - u); }
        }
        for (let i = 0; i < EN; i++) {
          eLife[i] += dt * .35; if (eLife[i] > 1) eLife[i] = 0;
          const wf = wolves[i % wolves.length]; wf.body.getWorldPosition(tmp);
          const k = eLife[i]; ep[i * 3] = tmp.x + Math.sin(i * 7.1) * .3; ep[i * 3 + 1] = tmp.y + k * 1.6; ep[i * 3 + 2] = tmp.z + Math.cos(i * 3.3) * .3;
        }
        eg.attributes.position.needsUpdate = true;
        ember.emissiveIntensity = 2.4 + Math.sin(t * 5) * .6 + (howl ? .8 : 0); maw.emissiveIntensity = 1 + (howl ? 2 : 0);
        const h = A.hour, dark = Math.max(smooth(16.5, 19.5, h), 1 - smooth(5, 7.5, h));   // grey ash by day; the fire shows at night
        ash.emissiveIntensity = ashPup.emissiveIntensity = .12 + .75 * dark; ashOld.emissiveIntensity = .08 + .4 * dark; ashL.emissiveIntensity = .1 + .6 * dark;
      };
    },
  },

  // ================================================================ THE BELL-CRAB
  bellcrab: {
    name: 'The Bell-Crab', hour: 13,
    blurb: 'A hermit crab the size of a cart that has taken an old watchtower bell for its shell, green with age and cracked down one side. It carries it tipped on its back and scuttles sideways, and the bell rings as it goes. Harmless, unless you try to take its bell. (The young make do with a hand bell.)',
    view: [[-6.8, 2.6, 6.2], [-11, 1.0, 9.6]],
    knight: { place: 'courtyard', action: 'gaze', emote: 'music', note: 'listening to the bell go by' },
    build(root) {
      const v = root.userData.appearance?.variant || {};
      const age = v.age || '', size = (v.size || 1) * (age === 'young' ? .5 : age === 'old' ? 1.1 : 1);
      const young = age === 'young', old = age === 'old';
      // the young: bright and soft-shelled, gangly eye-stalks, two claws still the same size, a quick
      // jittery scuttle, a hand bell. The old: faded and chipped, barnacled, the tip of its big claw
      // broken off long ago, slow; its bell so overgrown with turf and moss, grass and flowers and a
      // little thorn bush, that it looks like a small hill that walks (only the lip of the bell shows).
      const g = G(root, [-11, 0, 9.6], [0, Math.PI, 0]);
      const crab = G(g, [0, 0, 0]); crab.scale.setScalar(size);
      const bronze = A.mat('#8c6a38', .7, .42, { side: T.DoubleSide }), bronzeD = A.mat('#5e4523', .7, .5, { side: T.DoubleSide });
      const verd = A.mat('#4f8a78', .15, .85), verdL = A.mat('#6fa592', .1, .85), barn = A.mat('#cfc6b0', 0, .9);
      const shell = A.mat(young ? '#d0552e' : old ? '#7a5a52' : '#8a3f2b', .05, young ? .4 : old ? .8 : .55);
      const shellL = A.mat(young ? '#f0864f' : old ? '#9a7c70' : '#b0623f', .05, .55), shellD = A.mat(old ? '#4a3a34' : '#5a2618', .05, .6);
      const dark = A.mat('#120c0a', .2, .3), soft = A.mat('#c98f78', 0, .7);
      // the bell, tipped on its back, mouth forward, the crab living in it
      const bell = G(crab, [0, .88, -.12], [-1.15, 0, 0]);
      const big = age !== 'young';
      const prof = (big ? [[0, 2.35], [.42, 2.35], [.55, 2.25], [.6, 1.95], [.66, 1.5], [.78, 1.0], [.98, .55], [1.25, .18], [1.38, 0], [1.32, -.05]]
                        : [[0, 2.0], [.5, 2.0], [.55, 1.6], [.62, 1.1], [.8, .5], [1.05, .1], [1.12, 0], [1.08, -.04]]).map(([x, y]) => new T.Vector2(x, y));
      const bm = new T.Mesh(A.facet(new T.LatheGeometry(prof, 16), .025, 2), bronze); bm.castShadow = true; bell.add(bm);
      const inner = new T.Mesh(new T.LatheGeometry(prof.map(p => new T.Vector2(p.x * .9, p.y * .97)), 16), bronzeD); inner.material.side = T.BackSide; bell.add(inner);
      for (const [y, rr] of (big ? [[.08, 1.33], [.5, 1.02], [1.85, .63]] : [[.06, 1.08], [1.5, .6]]))           // cast bands
        { const band = new T.Mesh(new T.TorusGeometry(rr, .035, 4, 18), bronzeD); band.rotation.x = Math.PI / 2; band.position.y = y; bell.add(band); }
      if (big) { const loop = new T.Mesh(new T.TorusGeometry(.22, .07, 5, 10), bronzeD); loop.position.y = 2.5; bell.add(loop); }
      else { bone(bell, [0, 2.0, 0], [0, 2.55, 0], .07, .06, A.mat('#5b3b22', 0, .8), 6); }   // a hand bell's wooden handle
      const r = A.rand(33 + Math.abs(Math.round((v.hue || 0) * 1000)));
      const patches = big ? (age === 'old' ? 16 : 10) : 4;
      for (let i = 0; i < patches; i++) {                                    // verdigris, thickest where rain runs
        const a = r() * 6.28, y = .15 + r() * (big ? 1.9 : 1.5), rad = (y < .6 ? 1.16 : y < 1.2 ? .84 : .64) * (big ? 1 : .82);
        const pg = G(bell, [Math.cos(a) * rad * .97, y, Math.sin(a) * rad * .97], [0, -a, 0]);   // lying on the surface
        P(pg, A.ico(.12 + r() * .14, 1), r() < .5 ? verd : verdL, [0, 0, 0], { scale: [.22, .8 + r() * .7, 1], cast: false, jitter: .01 });
      }
      if (age === 'old') for (let i = 0; i < 9; i++) { const a = r() * 6.28, y = .1 + r() * .6;
        P(bell, new T.ConeGeometry(.07, .12, 5), barn, [Math.cos(a) * 1.2, y, Math.sin(a) * 1.2], { rot: [Math.cos(a) * 1.4, 0, -Math.sin(a) * 1.4], cast: false }); }
      if (big) P(bell, A.box(.035, 1.15, .045), dark, [.72, .9, .55], { rot: [0, -.65, .35], cast: false });   // the crack
      if (old) {
        const turf = A.mat('#4e6a34', 0, 1), turfD = A.mat('#3a5228', 0, 1), soil = A.M.dirt, grassM = A.mat('#6f8f3e', 0, .9), petal = A.mat('#e8d27a', 0, .7), petalW = A.mat('#f0ece0', 0, .7);
        const hill = G(crab, [0, 0, 0]);
        P(hill, A.ico(1, 2), turf, [0, 1.05, -1.55], { scale: [1.55, 1.12, 1.45], jitter: .08 });          // the mound over the bell
        P(hill, A.ico(1, 1), turfD, [.5, 1.3, -1.9], { scale: [.8, .7, .8], jitter: .1 });
        P(hill, A.ico(1, 1), turfD, [-.6, .9, -1.2], { scale: [.7, .5, .7], jitter: .1 });
        for (let i = 0; i < 4; i++) P(hill, A.ico(.25, 0), soil, [(r() - .5) * 2.2, .35, -.8 - r() * 1.5], { scale: [1, .5, 1], cast: false });   // where earth has slipped
        for (let i = 0; i < 4; i++) P(hill, A.ico(.18 + r() * .12, 0), A.M.stone, [(r() - .5) * 2.4, .9 + r() * .9, -1.0 - r() * 1.6], { cast: false });   // stones it has gathered
        for (let i = 0; i < 40; i++) {                                    // grass, and flowers in it
          const a = r() * 6.28, h = r() * 1.05, rr = Math.sqrt(Math.max(0, 1 - (h / 1.15) ** 2)), x = Math.cos(a) * 1.5 * rr, z = -1.55 + Math.sin(a) * 1.4 * rr;
          if (z > -.25) continue;                                          // keep the bell's mouth clear
          P(hill, new T.ConeGeometry(.04, .22 + r() * .15, 3), grassM, [x, 1.05 + h, z], { rot: [(r() - .5) * .5, 0, (r() - .5) * .5], cast: false });
          if (i % 5 === 0) P(hill, A.ico(.04, 0), i % 2 ? petal : petalW, [x, 1.2 + h, z], { cast: false });
        }
        bone(hill, [.2, 2.0, -1.8], [.3, 2.65, -1.9], .05, .03, A.M.woodD, 5);   // a little thorn bush on top
        for (let i = 0; i < 6; i++) P(hill, A.ico(.16, 0), turfD, [.3 + (r() - .5) * .4, 2.55 + r() * .25, -1.9 + (r() - .5) * .4], { cast: false });
        merge(hill);
      }
      const clapper = G(bell, [0, big ? 2.1 : 1.8, 0]); bone(clapper, [0, 0, 0], [0, big ? -1.6 : -1.3, 0], .03, .03, A.M.iron, 5); P(clapper, A.ico(big ? .16 : .12, 0), A.M.iron, [0, big ? -1.65 : -1.35, 0]);
      // the crab's front half, out of the bell's mouth
      const body = G(crab, [0, .62, .55]);
      P(body, A.ico(1, 1), shell, [0, 0, 0], { scale: [.85, .38, .62], jitter: .02 });
      P(body, A.ico(1, 1), shellL, [0, .12, .1], { scale: [.7, .22, .48], jitter: .02 });
      for (let i = 0; i < 7; i++) P(body, A.ico(.05, 0), shellD, [(r() - .5) * 1.2, .3, (r() - .2) * .7], { cast: false });   // mottling
      if (old) for (let i = 0; i < 10; i++) P(body, new T.ConeGeometry(.05, .07, 5), barn, [(r() - .5) * 1.1, .3 + r() * .05, (r() - .3) * .7], { cast: false });   // barnacles
      if (old) for (let i = 0; i < 4; i++) P(body, A.box(.12, .03, .08), shellD, [(r() - .5) * 1.0, .33, (r() - .2) * .6], { rot: [0, r() * 3, 0], cast: false });     // chips
      const eyes = [];
      for (const sx of [-1, 1]) {
        const stalk = G(body, [sx * .18, .22, .55]);
        const sl = young ? .62 : .42;                                    // the young: all eye-stalk
        bone(stalk, [0, 0, 0], [sx * .05, sl, .04], .035, .028, shellL, 5);
        const e = G(stalk, [sx * .05, sl + .03, .04]); P(e, A.ico(.07, 1), dark, [0, 0, 0], { jitter: 0 }); P(e, A.ico(.02, 0), glow('#ffffff', .4), [0, .03, .05], { cast: false, jitter: 0 });
        eyes.push({ stalk, sx });
      }
      const feelers = [];
      for (const sx of [-1, 1]) {
        const base = G(body, [sx * .1, .15, .6], [-1.0, sx * -.3, 0]);
        feelers.push(chain(base, 6, .22, .015, .006, shellD, { sides: 4, jitter: .001 }));
      }
      const mouth = []; for (const sx of [-1, 1]) { const m = G(body, [sx * .07, -.02, .6]); P(m, A.box(.06, .12, .05), soft, [0, -.04, 0], { cast: false }); mouth.push(m); }
      // claws: the right one much bigger, as a hermit crab's is
      const claws = [];
      for (const sx of [-1, 1]) {
        const k = young ? .9 : sx > 0 ? 1.35 : .8;                       // the young: both claws alike, for now
        const arm = G(body, [sx * .55, -.05, .4]);
        bone(arm, [0, 0, 0], [sx * .35 * k, .2, .4 * k], .12 * k, .1 * k, shell); P(arm, A.ico(.11 * k, 1), shellD, [sx * .35 * k, .2, .4 * k]);
        const fore = G(arm, [sx * .35 * k, .2, .4 * k]);
        bone(fore, [0, 0, 0], [-sx * .1 * k, .05, .45 * k], .1 * k, .11 * k, shellL);
        const claw = G(fore, [-sx * .1 * k, .05, .5 * k]);
        P(claw, A.ico(1, 1), shell, [0, .03, .15 * k], { scale: [.2 * k, .18 * k, .32 * k], jitter: .02 });
        for (let s = 0; s < 4; s++) P(claw, A.ico(.025 * k, 0), shellD, [(r() - .5) * .2 * k, .17 * k, (.05 + r() * .3) * k], { cast: false });
        if (!(old && sx > 0)) P(claw, new T.ConeGeometry(.06 * k, .3 * k, 4), shellD, [.02 * sx, .06 * k, .45 * k], { rot: [Math.PI / 2, 0, 0] });
        else P(claw, A.box(.12 * k, .1 * k, .06 * k), shellD, [.02 * sx, .06 * k, .36 * k], { rot: [.3, .2, .4] });   // broken off, long ago
        if (old) for (let s = 0; s < 3; s++) P(claw, new T.ConeGeometry(.03 * k, .05 * k, 5), barn, [(r() - .5) * .15 * k, .16 * k, r() * .25 * k], { cast: false });
        const jaw = G(claw, [0, -.07 * k, .05 * k]); P(jaw, new T.ConeGeometry(.07 * k, .42 * k, 4), shellL, [0, 0, .22 * k], { rot: [Math.PI / 2, 0, 0], scale: [1, 1, .6] });
        claws.push({ arm, jaw, sx });
      }
      // walking legs: three jointed pairs, spiky at the joints
      const legs = [];
      for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
        const hip = G(body, [sx * .62, -.05, .25 - k * .32]);
        const knee = [sx * .55, .42, (k - 1) * .1], ank = [sx * 1.05, .05, (k - 1) * .2], foot = [sx * 1.25, -.62, (k - 1) * .28];
        bone(hip, [0, 0, 0], knee, .085, .07, k % 2 ? shell : shellL, 6); P(hip, A.ico(.075, 0), shellD, knee);
        bone(hip, knee, ank, .07, .055, k % 2 ? shellL : shell, 6); P(hip, A.ico(.06, 0), shellD, ank);
        bone(hip, ank, foot, .055, .012, shellD, 5);
        legs.push({ hip, sx, ph: k * 2.1 + (sx > 0 ? Math.PI : 0) });
      }
      const rings = [0, 1, 2].map(() => { const m = new T.Mesh(new T.TorusGeometry(1, .03, 4, 32), new T.MeshBasicMaterial({ color: '#ffe9b0', transparent: true, opacity: 0, depthWrite: false })); m.rotation.x = Math.PI / 2; root.add(m); return { m, born: -9 }; });
      let lastPeak = 0, ri = 0;
      const bp = V();
      return (t) => {
        const x = -11 + Math.sin(t * .07) * 4, moving = Math.abs(Math.cos(t * .07)) > .1;
        g.position.set(x, gy(x, 9.6), 9.6);
        const ph = t * (young ? 5.2 : old ? 2.2 : 3.4);
        for (const { hip, sx, ph: p } of legs) { hip.rotation.z = moving ? Math.max(0, Math.sin(ph + p)) * .22 * sx : 0; hip.rotation.y = moving ? Math.sin(ph + p) * .14 : 0; }
        body.position.y = .62 + (moving ? Math.abs(Math.sin(ph)) * (young ? .06 : .035) : 0);
        if (young) body.rotation.z = moving ? Math.sin(ph * 1.7) * .06 : 0;      // jittery
        const sway = Math.sin(t * 1.5) * (moving ? .09 : .025);
        bell.rotation.z = sway; clapper.rotation.z = -sway * 2.4;
        claws.forEach(({ jaw, arm, sx }, i) => { jaw.rotation.x = pulse(t + i * 2.3, 5, .7) * .45; arm.rotation.y = Math.sin(t * .6 + i) * .08 * sx; });
        eyes.forEach(({ stalk, sx }, i) => { stalk.rotation.z = Math.sin(t * .8 + i * 2) * .18; stalk.rotation.x = pulse(t + i, 6.5, .4) * -.6; });
        feelers.forEach((f, i) => f.forEach((j, k) => { j.rotation.x = Math.sin(t * 2.2 + i * 1.7 + k * .7) * .18; j.rotation.z = Math.sin(t * 1.3 + i + k) * .12; }));
        mouth.forEach((m, i) => { m.rotation.x = Math.sin(t * 9 + i * Math.PI) * .25; });
        if (moving && Math.abs(sway) > .085 && t - lastPeak > .9) {          // it rings as it goes
          const rg = rings[ri++ % 3]; rg.born = t; bell.getWorldPosition(bp); rg.m.position.copy(bp); lastPeak = t;
        }
        for (const rg of rings) { const k = (t - rg.born) / 2.2; rg.m.visible = k < 1; if (k < 1) { rg.m.scale.setScalar((.5 + k * 5) * size); rg.m.material.opacity = .55 * (1 - k); } }
      };
    },
  },
  // ================================================================ THE LONG CRAWL
  crawl: {
    name: 'The Long Crawl', hour: 18,
    blurb: 'Hostile, and endlessly patient. A vast, slow, shelled thing with a spiral of stone and stars on its back that creeps toward the keep across the plain, a little closer every other day, leaving a glittering trail. Bright fire turns it back: it pulls into its shell and slides away to the horizon, and some day it starts again. (Sped up here: in his world one crossing takes days.)',
    view: [[-6, 3.2, 20], [8, 1.2, 12]],
    knight: { place: 'fire', action: 'stand', emote: 'dots', note: 'checking how far it has come today' },
    build(root) {
      const flesh = A.mat('#6a5f72', 0, .45, { emissive: '#1d1624', emissiveIntensity: .6 }), fleshL = A.mat('#8a7f92', 0, .45);
      const shellM = A.mat('#6b6578', .1, .6, { emissive: '#14121c', emissiveIntensity: .5 }), shellD = A.mat('#46404f', .1, .7, { emissive: '#0e0c14', emissiveIntensity: .5 }), tipM = glow('#cfe6ff', 2);
      const g = G(root);
      const body = G(g);
      P(body, A.ico(1, 1), flesh, [0, .35, 0], { scale: [1.1, .42, 2.8], jitter: .06 });
      P(body, A.ico(.7, 1), flesh, [0, .5, 2.2], { scale: [.95, .75, 1.1] });   // its head end
      for (let i = 0; i < 10; i++) P(body, A.box(.06, .03, 1.4), fleshL, [(i - 4.5) * .2, .12, 0], { cast: false });
      const stalks = [];
      for (const sx of [-1, 1]) {
        const s = G(body, [sx * .3, .9, 2.5], [-.4, 0, sx * -.3]);
        const c = chain(s, 4, .22, .07, .035, flesh, { sides: 6, jitter: .005 });
        P(c[3], A.ico(.07, 1), tipM, [0, .25, 0], { cast: false });
        stalks.push(s);
      }
      // the shell: a spiral of stone with stars in it
      const shell = G(body, [0, .7, -.4]);
      for (let i = 0; i < 26; i++) {
        const a = i * .45, rad = 1.7 * Math.exp(-i * .08), r = .8 * Math.exp(-i * .075);
        P(shell, A.ico(r, 1), i % 2 ? shellM : shellD, [0, Math.sin(a) * rad + 1.1, -Math.cos(a) * rad], { scale: [.85, 1, 1], jitter: .04 });
      }
      const sp = [], rr = A.rand(19);
      for (let k = 0; k < 120; k++) { const a = rr() * 6.28, b = rr() * 3.14; const rad = 1.0 + rr() * .9; sp.push(Math.cos(a) * Math.sin(b) * rad * .95, 1.1 + Math.cos(b) * rad, Math.sin(a) * Math.sin(b) * rad); }
      const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
      shell.add(new T.Points(sg, new T.PointsMaterial({ color: '#e8f0ff', size: .12, transparent: true, depthWrite: false })));
      // its glittering trail
      const trailM = new T.MeshBasicMaterial({ color: '#b8c8ff', transparent: true, opacity: .35, depthWrite: false });
      const trail = new T.Mesh(new T.PlaneGeometry(1.6, 1), trailM); trail.rotation.x = -Math.PI / 2; trail.position.y = .02; root.add(trail);
      merge(body); merge(shell);                                         // fewer draws, same look
      const ap = root.userData.appearance || {}, live = !!ap.id;
      const seen = live ? Date.now() - Date.parse(ap.start) : 0;
      const from = V(13, 0, 20), to = V(5.0, 0, 9.0), dir = to.clone().sub(from).normalize();
      g.rotation.y = Math.atan2(dir.x, dir.z);     // its head end faces the keep, the way it goes
      const CYCLE = 60;
      return (t) => {
        const k = t % CYCLE;
        let u, hide = 0;
        if (live) {                                                  // in the keep: as far as it has come on this day of its approach
          u = Math.min(1, (ap.last ? 1 : ((ap.chain || 1) - 1) / 3 * .85) + Math.min(.06, (seen / 1000 + t) / 3600 * .06));
        } else if (k < 44) u = k / 44;                               // creeping in
        else if (k < 50) { u = 1; hide = smooth(44, 46, k); }        // fire turns it: it pulls into its shell
        else { u = 1 - smooth(50, 60, k); hide = 1 - smooth(57, 60, k); }   // and slides back to the horizon
        g.position.lerpVectors(from, to, u);
        body.scale.set(1, 1, 1 - hide * .35); stalks.forEach(s => s.scale.setScalar(1 - hide * .9));
        shell.position.z = -.4 + hide * .5;
        body.position.y = Math.sin(t * 1.2) * .02;
        stalks.forEach((s, i) => { s.rotation.z = (i ? -.3 : .3) + Math.sin(t * .8 + i) * .15; });
        const mid = g.position.clone().lerp(from, .5); trail.position.set(mid.x, .02, mid.z); trail.scale.set(1, g.position.distanceTo(from) + .01, 1);
        trail.rotation.z = Math.atan2(dir.x, dir.z); trailM.opacity = .25 + Math.sin(t * 2) * .05;
      };
    },
  },

  // ================================================================ THE GIANT AXOLOTL
  axolotl: {
    name: 'The giant axolotl', hour: 13,
    blurb: 'Gentle. After heavy rain, when the meadow beyond the south wall floods into shallow pools, something pale and pink wades about in them: longer than the knight is tall, with a broad flat head, feathery glowing gills and a wide, permanent smile. It likes the warmth of the fire, and lifts its head toward the keep now and then. It leaves when the water drains.',
    view: [[-6.4, 2.6, 2.6], [-10.8, .4, 7.5]],
    knight: { place: 'courtyard', action: 'stand', emote: 'heart', note: 'being looked at, very kindly, by something enormous' },
    build(root) {
      const v = root.userData.appearance?.variant || {};
      const age = v.age || '', hue = v.hue || 0;
      const young = age === 'young', old = age === 'old';
      const scale = (v.size || 1) * (young ? .6 : old ? 1.4 : 1);
      // the young: no legs yet, a slip of a thing, all tail-fin and enormous feathery gills, darting
      // about the pools in bursts like a fish. The old: huge, half-sunk in the broadest pool and slow
      // as a log, lilies and weed growing on its back, gills faded to old-rose and drooping, one
      // clouded eye; it hardly moves but to lift its head toward the keep.
      // the rain pools it wades between, each with a ring of ripples
      const water = new T.MeshStandardMaterial({ color: '#6d8d99', roughness: .06, metalness: .35, transparent: true, opacity: .72 });
      const rippleM = new T.MeshBasicMaterial({ color: '#cfe3ea', transparent: true, opacity: .0, depthWrite: false });
      const r = A.rand(8);
      const pools = [[-11.0, 7.9, 1.0], [-9.4, 6.8, .8], [-12.8, 6.7, .7], [-8.6, 8.3, .6], [-13.6, 8.1, .6]];   // the flooded meadow beyond the south wall
      if (old) pools[0] = [-11.4, 7.9, 2.1];                                // the old one's: broad enough to lie in
      pools.forEach(([x, z, s], i) => {
        const pool = new T.Mesh(new T.CircleGeometry(s, 20), water); pool.rotation.x = -Math.PI / 2;
        pool.position.set(x, gy(x, z) + .04, z); if (old && !i) pool.scale.set(1.55, .72, 1); else pool.scale.set(1, .6 + r() * .4, 1); root.add(pool);
      });
      const ripples = Array.from({ length: 4 }, () => {
        const m = new T.Mesh(new T.RingGeometry(.3, .36, 24), rippleM.clone()); m.rotation.x = -Math.PI / 2; root.add(m); return { m, t: 0 };
      });
      // colour: pale pink by default; a warmer or a duskier one now and then
      const base = new T.Color(young ? '#f8dbe0' : old ? '#b98591' : '#f3bcc8').offsetHSL(hue * 1.5, 0, 0), belly = base.clone().offsetHSL(0, -.1, .08);
      const skin = young ? A.mat(base, 0, .3, { transparent: true, opacity: .86 }) : A.mat(base, 0, .42), skinL = A.mat(belly, 0, .38);
      const freck = A.mat(base.clone().offsetHSL(0, .05, old ? -.3 : -.18), 0, .5), scarM = A.mat(base.clone().offsetHSL(0, -.08, -.12), 0, .55);   // healed scars: a shade darker, never pale
      const algae = A.mat('#5f6e48', 0, .7), pad = ds('#4e7336', 0, .6), padD = ds('#3c5a2a', 0, .65), bloomM = A.mat('#f4e6ee', 0, .4, { emissive: '#3a2a30', emissiveIntensity: .3 }), weed = A.mat('#3d5232', 0, .7);
      const eyeM = A.mat('#120a0c', .3, .15), glint = glow('#ffffff', .6), mouthM = A.mat('#8c4f5e', 0, .6);
      const gillM = glow(new T.Color(old ? '#d98a9c' : '#ff6f9c').offsetHSL(hue * 1.5, old ? -.15 : 0, 0), old ? .45 : .85), finM = ds(base.clone().offsetHSL(0, -.05, .06), 0, .45);
      const g = G(root, [-12.6, 0, 1.3]);
      const body = G(g, [0, .5 * scale, 0]); body.scale.setScalar(scale);
      // the trunk: a few soft, flattened segments in a gentle S that the walk bends
      const segs = [];
      const radii = [[.5, .36, .7], [.55, .4, .74], [.47, .35, .66]].map(([x, y, z]) => young ? [x * .78, y * .85, z] : [x, y, z]);   // the young: a slip of a thing
      let at = body;
      radii.forEach(([rx, ry, rz], i) => {
        const s = G(at, [0, 0, i ? -.5 : .35]);
        P(s, A.ico(1, 2), skin, [0, 0, 0], { scale: [rx, ry, rz], jitter: .006, seed: i });
        P(s, A.ico(1, 2), skinL, [0, -ry * .38, 0], { scale: [rx * .82, ry * .55, rz * .92], jitter: .004, seed: i + 9 });
        for (let f = 0; f < (young ? 0 : old ? 9 : 3); f++) P(s, A.ico(old ? .05 : .035, 0), freck, [(r() - .5) * rx * 1.3, ry * .93, (r() - .5) * rz], { cast: false, jitter: 0 });
        if (old && i === 1) for (let k = 0; k < 3; k++) P(s, A.box(.03, .012, .26), scarM, [rx * .45 - k * .07, ry * .9, .05 + k * .08], { rot: [0, .5, .2], cast: false });   // old claw-marks, long healed
        if (old) {                                                       // its back has become a bank: algae, lily pads, a flower or two, weed trailing
          for (let k = 0; k < 4; k++) P(s, A.ico(.12, 1), algae, [(r() - .5) * rx, ry * .9, (r() - .5) * rz * 1.2], { scale: [1.3, .25, 1], cast: false, jitter: .02 });
          for (let k = 0; k < 3; k++) { const lp = new T.Mesh(new T.CircleGeometry(.11 + r() * .06, 9, .5, 5.6), k % 2 ? padD : pad);
            lp.rotation.set(-Math.PI / 2 + (r() - .5) * .3, 0, r() * 6); lp.position.set((r() - .5) * rx * 1.1, ry * .97 + .01, (r() - .5) * rz * 1.3); s.add(lp); }
          if (i !== 2) { const fx = (r() - .5) * rx * .6, fz = (r() - .5) * rz * .6;
            for (let q = 0; q < 6; q++) P(s, A.ico(.045, 0), bloomM, [fx + Math.cos(q) * .04, ry + .05, fz + Math.sin(q) * .04], { scale: [1, .5, 1.6], rot: [.5, q, 0], cast: false, jitter: 0 }); }
          for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) { const wz = (k - .5) * rz * .8;   // weed hanging down its flanks into the water
            bone(s, [sx * rx * .55, ry * .88, wz], [sx * rx * .9, ry * .45, wz - .06], .02, .014, weed, 4); bone(s, [sx * rx * .9, ry * .45, wz - .06], [sx * rx * 1.0, -ry * .1, wz - .02], .014, .008, weed, 4); }
        }
        segs.push(s); at = s;
      });
      // the head: broad, flat, wide-mouthed
      const neck = G(segs[0], [0, .04, .5]);
      const head = G(neck, [0, .02, .38]); if (young) head.scale.setScalar(1.25);   // the young: all head
      P(head, A.ico(1, 2), skin, [0, 0, 0], { scale: [.66, .3, .5], jitter: .006 });
      P(head, A.ico(1, 2), skinL, [0, -.1, .04], { scale: [.6, .17, .46], jitter: .004 });
      const mouth = new T.Mesh(new T.TorusGeometry(.5, .014, 3, 20, 1.9), mouthM);
      mouth.rotation.set(Math.PI / 2 + .06, 0, Math.PI + .62); mouth.position.set(0, -.07, .02); mouth.scale.set(1, 1, .55); head.add(mouth);
      const eyes = [];
      for (const sx of [-1, 1]) {
        const e = G(head, [sx * .5, .1, .27]);                         // small, dark, set wide on the sides of the face
        P(e, A.ico(young ? .095 : .07, 1), old && sx > 0 ? A.mat('#8e8a86', .1, .5) : eyeM, [0, 0, 0], { jitter: 0 });   // old: one eye clouded
        P(e, A.ico(.02, 0), glint, [sx * .02, .035, .05], { cast: false, jitter: 0 });
        eyes.push(e);
      }
      // gills: three feathery fronds each side, swept back, glowing
      const gills = [];
      for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
        const stalk = G(head, [sx * .5, .1 + (1 - k) * .07, -.22], [(young ? -1.0 : -.55) + (k - 1) * .5, sx * -.35, sx * -((young ? 1.25 : 1.05) + (k - 1) * .3)]);   // the young's sweep back like plumes
        const ragged = old ? .55 : 1;
        const c = chain(stalk, young ? 6 : 4, young ? .17 : .16, young ? .03 : .026, .011, gillM, { sides: 4, jitter: .002, each: (i, j) => {
          for (const s of [-1, 1]) for (let q = 0; q < (young ? 4 : 3); q++) {      // fine filaments, swept back like a feather (the young: great plumes)
            if (r() > ragged) continue;
            P(j, new T.ConeGeometry(.008, (young ? .15 : .11) - i * (young ? .012 : .015), 3), gillM, [s * .012, .03 + q * .045, 0], { rot: [-.55, 0, s * .6], cast: false, jitter: 0 });
          }
        } });
        gills.push({ c, ph: k * 1.7 + sx, droop: old ? .45 : young ? .2 : 0 });
      }
      // splayed salamander legs, front ones on the first segment, back ones on the third
      const legs = [];
      for (const [seg, z, sx, toes] of young || old ? [] : [[0, .15, -1, 4], [0, .15, 1, 4], [2, -.05, -1, 5], [2, -.05, 1, 5]]) {   // the young have none yet; the old's are under the water
        const hip = G(segs[seg], [sx * .42, -.08, z]);
        const upper = G(hip, [0, 0, 0]);
        bone(upper, [0, 0, 0], [sx * .27, -.08, .05], .13, .095, skin);
        const knee = G(upper, [sx * .27, -.08, .05]);
        bone(knee, [0, 0, 0], [sx * .07, -.24, .1], .095, .07, skin);
        for (let f = 0; f < toes; f++) bone(knee, [sx * .07, -.24, .1], [sx * .07 + (f - (toes - 1) / 2) * .06, -.27, .22], .024, .013, skinL, 4);
        legs.push({ upper, knee, sx, ph: (sx > 0 ? 0 : Math.PI) + (seg ? Math.PI : 0) });   // diagonal pairs move together
      }
      // the tail: long and flattened side to side, finned above and below
      const tail = [];
      let tj = G(segs[2], [0, .02, -.5]);
      const TAIL = young ? 8 : 7, FH = young ? 1.9 : 1;                 // the young: a long tail, its fin a broad ribbon
      for (let i = 0; i < TAIL; i++) {
        const j = G(tj, [0, 0, i ? -.3 : 0]), ra = .3 * (1 - i / (TAIL + .5)) + .03, rb = .3 * (1 - (i + 1) / (TAIL + .5)) + .03;
        P(j, A.cyl(rb, ra, .36, 8), skin, [0, 0, -.15], { rot: [Math.PI / 2, 0, 0], scale: [.42, 1, 1], jitter: .003, seed: i });
        const up0 = ra * .8 + (.2 - i * .015) * FH, up1 = rb * .8 + (.2 - (i + 1) * .015) * FH, dn0 = ra * .8 + (.1 - i * .008) * FH, dn1 = rb * .8 + (.1 - (i + 1) * .008) * FH;
        // one fin, no seams: each piece starts inside the one before (so no light shows between them)
        sheet(j, [[0, ra * .6, .1], [0, up0, .1], [0, up1, -.36], [0, rb * .6, -.36]], [[0, 1, 2], [0, 2, 3]], finM);
        sheet(j, [[0, -ra * .6, .1], [0, -dn0, .1], [0, -dn1, -.36], [0, -rb * .6, -.36]], [[0, 1, 2], [0, 2, 3]], finM);
        tail.push(j); tj = j;
      }
      sheet(segs[1], [[0, .38, .3], [0, .46, 0], [0, .5, -.4], [0, .38, -.62], [0, .3, -.62], [0, .3, .3]], [[0, 1, 5], [1, 4, 5], [1, 2, 4], [2, 3, 4]], finM);
      if (young) {                                                       // the young: the fin runs all the way up its back, and under its belly
        sheet(segs[0], [[0, .26, .45], [0, .4, .1], [0, .44, -.3], [0, .3, -.4], [0, .26, -.3]], [[0, 1, 4], [1, 3, 4], [1, 2, 3]], finM);
        sheet(segs[2], [[0, .26, .3], [0, .5, .2], [0, .52, -.5], [0, .26, -.6]], [[0, 1, 2], [0, 2, 3]], finM);
        sheet(segs[2], [[0, -.24, .1], [0, -.38, 0], [0, -.4, -.5], [0, -.24, -.6]], [[0, 1, 2], [0, 2, 3]], finM);
      }

      segs.forEach(merge); merge(head); tail.forEach(merge);               // fewer draws, same look
      // where it goes: a slow loop along the lane between the building plots, turning in the open
      // at either end, resting now and then nearest the warm doorway. Its body follows its own path
      // (each part where the head has been), so it never swings through a wall, the well or him.
      const E = [-8.6, 7.5], W = [-12.9, 7.5], R = .95, ST = E[0] - W[0], LOOP = 2 * ST + 2 * Math.PI * R;   // room to turn, out in the meadow
      const along = d => {
        d = ((d % LOOP) + LOOP) % LOOP;
        if (d < ST) return [E[0] - d, W[1] + R];                                  // west along the north side
        d -= ST; if (d < Math.PI * R) { const f = d / R; return [W[0] - Math.sin(f) * R, W[1] + Math.cos(f) * R]; }
        d -= Math.PI * R; if (d < ST) return [W[0] + d, W[1] - R];                // east along the south side
        d -= ST; const f = d / R; return [E[0] + Math.sin(f) * R, E[1] - Math.cos(f) * R];
      };
      const heading = d => { const [x0, z0] = along(d - .05), [x1, z1] = along(d + .05); return Math.atan2(x1 - x0, z1 - z0); };
      const SPEED = young ? .3 : .2, PIV = [0, .15, .65, 1.15];                              // how far behind the front each part sits
      const WALK = LOOP / SPEED, CYCLE = WALK + 16;                             // once round, then a rest facing the doorway
      const DART = 2.4, darting = t => t - Math.sin(t / DART * 6.28) * DART / 6.28;   // the young go in bursts: a flick, a glide, a stop
      const travelled = t => SPEED * (young ? darting(t) : Math.floor(t / CYCLE) * WALK + Math.min(t % CYCLE, WALK)) - Math.PI * R / 2;
      if (old) {
        // the old one lies in its pool, half under the water, and barely stirs
        const OX = -9.6, OZ = 7.9; body.position.y = .12 * scale;
        g.position.set(OX, gy(OX, OZ), OZ);
        const cam = V(); let tilt = 0;
        return (t, dt) => {
          g.rotation.y = Math.PI / 2 + Math.sin(t * .05) * .12;
          segs[1].rotation.y = Math.sin(t * .12) * .05; segs[2].rotation.y = Math.sin(t * .12 - .6) * .06;
          tail.forEach((j, i) => { j.rotation.y = Math.sin(t * .25 - i * .5) * .05; });
          body.position.y = (.12 + Math.sin(t * .3) * .015) * scale;     // slow breaths
          gills.forEach(({ c, ph, droop }) => c.forEach((j, i) => { j.rotation.x = (i ? .28 - droop : 0) + Math.sin(t * .9 + ph + i * .7) * .07; }));
          gillM.emissiveIntensity = .4 + Math.sin(t * .6) * .08 + pulse(t + 3, 14, 4) * .2;
          const look = pulse(t + 2, 16, 6); tilt += (look * .2 - tilt) * Math.min(1, dt * 1.2);   // once in a long while it lifts its head toward the keep
          head.rotation.z = tilt * .5; neck.rotation.x = -tilt * .9; neck.rotation.y = -tilt * 1.2;
          eyes.forEach(e => { e.scale.y = 1 - pulse(t, 8.3, .3) * .9; });
          ripples.forEach((rp, i) => {
            rp.t += dt; if (rp.t > 4) { rp.t = 0; const k = i / 4 * 6.28; rp.m.position.set(OX - 1.6 + Math.cos(k) * 2.2, gy(OX, OZ) + .045, OZ + Math.sin(k) * .9); }
            rp.m.scale.setScalar(1 + rp.t * .8); rp.m.material.opacity = .25 * (1 - rp.t / 4);
          });
        };
      }
      const cam = V(); let tilt = 0, step = 0, lastD = 0;
      return (t, dt) => {
        const d = travelled(t), speed = (d - lastD) / Math.max(dt, 1e-3); lastD = d;
        const [x, z] = along(d), h0 = heading(d);
        g.position.set(x, gy(x, z), z); g.rotation.y = h0;
        const hs = PIV.map(k => heading(d - k));
        segs[1].rotation.y = hs[1] - hs[0]; segs[2].rotation.y = hs[2] - hs[1];
        const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
        segs[1].rotation.y = wrap(segs[1].rotation.y); segs[2].rotation.y = wrap(segs[2].rotation.y);
        let prev = hs[2];
        tail.forEach((j, i) => { const hk = heading(d - 1.15 - i * .3); j.rotation.y = wrap(hk - prev); prev = hk; });
        step += dt * (speed > .05 ? 1 + speed * 5 : 0);
        const sw = Math.sin(step * 1.6), walking = speed > .05;
        segs[0].rotation.y = -sw * .05 * walking; segs[1].rotation.y += sw * .05 * walking;   // a little S in the walk
        legs.forEach(({ upper, knee, sx, ph }) => {
          const c = Math.sin(step * 1.6 + ph);
          upper.rotation.y = c * .45 * sx; upper.rotation.z = Math.max(0, -c) * .35 * sx; knee.rotation.x = Math.max(0, c) * .2;
        });
        body.position.y = (young ? .3 : .5 + Math.abs(sw) * .02) * scale;   // the young: low, swimming
        const swim = young ? Math.min(1, speed * 4) : 0;
        if (young) { segs[0].rotation.y += Math.sin(t * 7) * .1 * swim; segs[1].rotation.y += Math.sin(t * 7 - .8) * .12 * swim; }
        tail.forEach((j, i) => { j.rotation.y += Math.sin(step * 1.6 - i * .55) * .06 * walking + Math.sin(t * .4 + i * .5) * .03 + Math.sin(t * 7 - i * .7) * .16 * swim; });
        gills.forEach(({ c, ph, droop }) => c.forEach((j, i) => { j.rotation.x = (i ? .28 - droop : 0) + Math.sin(t * 1.8 + ph + i * .7) * .12; }));   // curling fronds (drooping, when old)
        gillM.emissiveIntensity = .75 + Math.sin(t * 1.2) * .2 + pulse(t + 3, 9, 3) * .3;   // flushes when it is happy
        // every so often it notices whoever is watching and tilts its head, smiling
        A.camera.getWorldPosition(cam);
        const look = pulse(t + 2, 9, 3); tilt += (look * .35 - tilt) * Math.min(1, dt * 3);
        head.rotation.z = tilt; neck.rotation.y = Math.sin(t * .3) * .2 * (1 - look);
        eyes.forEach(e => { e.scale.y = 1 - pulse(t, 5.3, .16) * .9; });
        // ripples where it treads
        ripples.forEach((rp, i) => {
          rp.t += dt; if (rp.t > 2.4) { rp.t = 0; rp.m.position.set(x + Math.sin(i * 2.1) * .7 * scale, gy(x, z) + .045, z + Math.cos(i * 2.1) * .7 * scale); }
          rp.m.scale.setScalar((.6 + rp.t * .9) * scale); rp.m.material.opacity = .35 * (1 - rp.t / 2.4) * Math.min(1, speed * 3 + .2);
        });
      };
    },
  },
  // ================================================================ THE THIN CROWD
  thincrowd: {
    name: 'The Thin Crowd', hour: 18,
    blurb: 'Tall, thin, grey shapes standing in a loose crowd on the rise south of the keep at dusk, with no faces at all. Each evening there is one more of them, and they are a little closer. They never move while watched; look away and back, and they stand a little differently. Nothing happens... until they reach the wall. (Sped up here: one more every few seconds.)',
    view: [[-2.2, 2.4, 4.2], [-.6, 2.4, 13]],
    knight: { place: 'fire', action: 'stand', emote: 'dots', note: 'counting them again' },
    build(root) {
      const ap = root.userData.appearance || {};
      const live = !!ap.id, chainN = ap.chain || 1;
      const grey = A.mat('#3c3c43', 0, .95), skin = A.mat('#5d5f69', 0, .45, { emissive: '#1d1f27', emissiveIntensity: .6 });   // smooth, dark, blank
      const cloth = ds('#4d4b55', 0, 1);
      const r = A.rand(77 + (ap.id ? ap.id.length : 0));
      // one figure: gaunt, too long in the limbs, wrapped in hanging grey strips, a head with nothing on it
      const figure = h => {
        const g = G(root), k = h / 4.2;
        const body = G(g, [0, 0, 0]); body.scale.setScalar(k);
        for (const sx of [-1, 1]) {
          bone(body, [sx * .1, 2.35, 0], [sx * .13, 1.2, .03], .05, .036, grey);
          bone(body, [sx * .13, 1.2, .03], [sx * .11, .04, 0], .036, .03, grey);
        }
        P(body, A.cyl(.17, .11, 1.1, 7), grey, [0, 2.85, 0], { scale: [1, 1, .62] });               // a narrow, hollow chest
        P(body, A.ico(.12, 1), grey, [0, 2.28, 0], { scale: [1, .6, .7] });
        bone(body, [-.22, 3.33, .02], [.22, 3.33, .02], .045, .045, grey);                            // sloped, hunched shoulders
        const arms = [];
        for (const sx of [-1, 1]) {                                                                  // arms that hang past the knees
          const sh = G(body, [sx * .22, 3.38, 0]);
          bone(sh, [0, 0, 0], [sx * .03, -1.15, .03], .034, .028, grey);
          const el = G(sh, [sx * .03, -1.15, .03]);
          bone(el, [0, 0, 0], [0, -1.15, .04], .028, .022, grey);
          const hand = G(el, [0, -1.2, .04]);
          for (let f = 0; f < 4; f++) bone(hand, [(f - 1.5) * .012, 0, 0], [(f - 1.5) * .018, -.2, .01], .008, .005, skin, 4);
          arms.push({ sh, el });
        }
        bone(body, [0, 3.36, 0], [0, 3.72, .12], .032, .028, grey);                                   // the neck, craned forward
        const head = G(body, [0, 3.9, .16]);
        P(head, A.ico(.13, 2), skin, [0, 0, 0], { scale: [.78, 1.35, .86], jitter: .004 });           // smooth: nothing on it at all
        // hanging strips of cloth from the shoulders and waist
        const strips = [];
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2, y = i % 2 ? 3.3 : 2.4, len = .9 + r() * 1.2;
          const st = G(body, [Math.sin(a) * .17, y, Math.cos(a) * .12], [0, a, 0]);
          sheet(st, [[-.09, 0, 0], [.09, 0, 0], [.05, -len, .02], [-.07, -len * .9, 0]], [[0, 1, 2], [0, 2, 3]], cloth);
          strips.push(st);
        }
        return { g, head, arms, strips, ph: r() * 9 };
      };
      const MAX = 7, figs = Array.from({ length: MAX }, () => figure(3.4 + r() * 1.2));
      // a loose crowd, not a line: where each stands, and the postures it can be found in
      const spots = figs.map((_, i) => [(i % 2 ? 1 : -1) * Math.ceil(i / 2) * 1.25 + (r() - .5) * .5, (r() - .5) * 1.6]);
      const poses = [() => [0, 0, 0, 0], () => [.25, -.1, .12, 0], () => [-.3, 0, -.08, .25], () => [.1, .2, .3, -.15], () => [-.15, -.25, 0, .2]];
      figs.forEach(f => { f.pose = Math.floor(r() * poses.length); });
      const mist = Array.from({ length: 12 }, (_, i) => {
        const sp = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: '#8c8697', transparent: true, opacity: .24, depthWrite: false }));
        sp.userData = { x: -9 + (i % 6) * 3.6, z: 8 + Math.floor(i / 6) * 5 }; root.add(sp); return sp;
      });
      const cam = V(), hp = V();
      let seen = true;
      return (t) => {
        // how many, and how near: in the keep, from which evening this is; in the preview, sped up
        const n = live ? Math.min(MAX, chainN + 2) : Math.min(MAX, 3 + Math.floor((t % 50) / 6));
        const near = live ? (ap.last ? 1 : (chainN - 1) / 4) : (n - 3) / 4;
        const z0 = 15 - near * 8.6;                                    // from the rise to the foot of the wall
        // look away and back: they stand differently, and perhaps a little closer
        figs[0].head.getWorldPosition(hp); hp.project(A.camera);
        const onScreen = Math.abs(hp.x) < 1.05 && Math.abs(hp.y) < 1.05 && hp.z < 1;
        if (seen && !onScreen) figs.forEach(f => { f.pose = (f.pose + 1 + Math.floor(r() * 3)) % poses.length; });
        seen = onScreen;
        const together = pulse(t, 23, 4);                              // now and then, every head tilts the same way at once
        figs.forEach((f, i) => {
          f.g.visible = i < n;
          const [sx, sz] = spots[i];
          f.g.position.set(-.6 + sx, gy(-.6 + sx, z0 + sz), z0 + sz);
          f.g.rotation.y = Math.PI + Math.atan2(-.6 + sx - (-1), 6) * .3;   // all facing the keep
          const [a0, a1, tilt, turn] = poses[f.pose]();
          f.arms[0].sh.rotation.x = a0; f.arms[1].sh.rotation.x = a1;
          f.head.rotation.z = tilt * (1 - together) + .45 * together; f.head.rotation.y = turn * (1 - together);
          f.strips.forEach((s, k) => { s.rotation.x = Math.sin(t * .6 + k + f.ph) * .05; s.rotation.z = Math.sin(t * .4 + k * 1.3) * .03; });
        });
        for (const m of mist) { const u = m.userData; m.position.set(u.x + Math.sin(t * .1 + u.z) * .8, .4, u.z); m.scale.setScalar(4.5); }
      };
    },
  },

  // ================================================================ THE BENT ONE
  bentone: {
    name: 'The Bent One', hour: 22,
    blurb: 'A pale figure bent impossibly backward, walking on hands and feet with its face upside down. While the light is steady it does not move. Every time the fire flickers, it is closer. A well-tended fire keeps it frozen in place.',
    view: [[-1.4, 1.45, 1.0], [-11, .6, .7]],
    knight: { place: 'fire', action: 'sit', emote: 'question', note: 'keeping the fire very, very steady' },
    build(root) {
      const v = root.userData.appearance?.variant || {}, young = v.age === 'young', old = v.age === 'old';
      // pale, gaunt, bent backward over itself so it walks on hands and feet, belly to the sky, its head
      // hanging upside down beneath its shoulders: no face, only smooth skin, and hair falling to the
      // ground. While the light is steady it does not move at all. Each time the fire gutters it is
      // closer, and standing a little differently. The young: smaller, only half bent, twitching
      // between flickers as if it cannot hold still yet. The old: limbs far too long, arched into a
      // high hoop, white hair to the ground; it covers more ground with each flicker.
      const H = young ? .62 : old ? 1.55 : 1.0, ARC = young ? .1 : old ? .65 : .25, LZ = young ? .8 : old ? 1.15 : 1, L = young ? .72 : old ? 1.5 : 1;
      const pale = A.mat(old ? '#d8d4cc' : '#cfc8bd', 0, .65), paleD = A.mat(old ? '#aaa59c' : '#a59d92', 0, .7), hairM = A.mat(old ? '#d6d2ca' : '#1a1614', 0, .9);
      const g = G(root, [-14.5, 0, .7], [0, Math.PI / 2, 0]); g.scale.setScalar(v.size || 1);
      const body = G(g);
      // the spine: an arch from hips (back) to shoulders (front), the knobs of it showing
      const spineAt = u => [0, H + Math.sin(Math.PI * u) * ARC + .1, (-.45 + .9 * u) * LZ];
      const SN = old ? 16 : 8;
      for (let i = 0; i <= SN; i++) {
        const u = i / SN, [x, y, z] = spineAt(u), rr = .13 + Math.sin(Math.PI * u) * .03;
        P(body, A.ico(rr, 1), pale, [x, y, z], { scale: [1.15, .8, 1], jitter: .01 });
        P(body, A.ico(.035, 0), paleD, [x, y - rr * .75, z], { cast: false });   // its spine runs underneath: it is on its back
        if (i > SN * .2 && i < SN * .8) for (const sx of [-1, 1]) P(body, A.box(.012, .02, .08), paleD, [sx * rr * .95, y + .02, z], { rot: [0, 0, sx * .5], cast: false });   // ribs, showing through
      }
      // limbs: each from a pivot at hip or shoulder, so it can stand a little differently after every step
      const hip = spineAt(0), sh = spineAt(1), limbs = [];
      const limb = (at, sx, front) => {
        const pv = G(body, at), foot = [sx * .3 * L, -at[1] + .02, (front ? .5 : -.55) * L], knee = [sx * .42 * L, (-at[1] + .02) * .45 + .22 * L, (front ? .22 : -.3) * L];
        bone(pv, [0, 0, 0], knee, .055 * Math.min(1, L), .042, pale); P(pv, A.ico(.05, 1), paleD, knee);
        bone(pv, knee, foot, .042, .03, pale);
        if (front) for (let f = 0; f < 4; f++) bone(pv, foot, [foot[0] + sx * (f - 1.5) * .045, .01 - at[1] + .02, foot[2] + .2 * L], .012, .006, paleD, 4);   // long fingers, splayed
        else P(pv, A.box(.09, .04, .22 * L), paleD, [foot[0], foot[1], foot[2] - .06]);
        limbs.push({ pv, sx, front });
      };
      for (const sx of [-1, 1]) { limb(hip, sx, false); limb(sh, sx, true); }
      // the neck hangs down under the shoulders; the head upside down, smooth, without a face
      const neckTop = [0, sh[1] - .1, sh[2] + .12], headAt = [0, Math.max(.32, sh[1] * .45), sh[2] + .28 * L];
      bone(body, neckTop, headAt, .05, .045, pale);
      const head = G(body, headAt, [Math.PI, 0, 0]);
      P(head, A.ico(.15, 2), pale, [0, -.02, 0], { scale: [.85, 1.15, .9], jitter: .003 });
      for (let k = 0; k < (old ? 22 : young ? 10 : 16); k++) {         // hair, falling from its crown to the ground
        const a = k / (old ? 22 : young ? 10 : 16) * 6.28, x = Math.cos(a) * .09, z = Math.sin(a) * .08;
        bone(body, [x, headAt[1] - .12, headAt[2] + z], [x * 1.6, young ? headAt[1] - .3 : .01, headAt[2] + z * 1.4 + .04], .012, .005, hairM, 3);
      }
      merge(head);
      const r = A.rand(23);
      const N = young ? 14 : old ? 6 : 9, X0 = -14.5, X1 = -8.9 - .85 * L;   // it stops short of where he stands in the courtyard (its fingers reach far ahead of it)
      const steps = Array.from({ length: N }, (_, i) => X0 + (X1 - X0) * i / (N - 1));
      const poses = Array.from({ length: N }, () => limbs.map(() => [(r() - .5) * .3, (r() - .5) * .25]).concat([[(r() - .5) * .5, (r() - .5) * .3]]));
      let idx = 0, lastFlick = 0, flickUntil = 0, wait = 0, moved = -99;
      const setPose = i => { poses[i].forEach(([x, z], k) => { if (k < limbs.length) { limbs[k].pv.rotation.set(x, 0, z); } else { head.rotation.set(Math.PI + x * .4, 0, z); } }); };
      setPose(0);
      return (t) => {
        if (t > lastFlick + 4.5) {   // the fire gutters for a moment
          lastFlick = t; flickUntil = t + .35;
          if (idx < steps.length - 1) idx = Math.min(steps.length - 1, idx + (young ? 2 : 1)); else if (++wait > 2) { idx = 0; wait = 0; }
          setPose(idx); moved = t;
        }
        A.setFireDim(t < flickUntil ? .18 : 1);
        g.position.x = steps[idx];
        // otherwise utterly still (the young: a twitch now and then, as if it can't help it)
        body.rotation.z = young ? pulse(t - moved, 1.9, .12) * .05 * Math.sin(t * 40) : 0;
      };
    },
    exit() { A.setFireDim(1); },
  },

  // ================================================================ THE WINDOW WATCHER
  watcher: {
    name: 'The Window Watcher', hour: 22,
    blurb: 'A long pale face at the window, far too high for anyone standing outside. It is only ever seen through the glass. Go out to look and nothing is there, except a handprint on the outside of the pane, a little higher each night.',
    view: [[-1.7, 1.7, -1.0], [-2.6, 2.45, -4.4]],
    knight: { place: 'desk', action: 'write', emote: 'dots', note: 'writing, with his back to the window' },
    build(root) {
      const v = root.userData.appearance?.variant || {}, young = v.age === 'young', old = v.age === 'old';
      // a long pale face behind the window glass, far too high for anyone standing outside: two deep
      // sockets with a cold pinprick far down in each, no mouth, and it never blinks. A hand laid flat
      // on the outside of the pane. Its tell: the glass cracks the longer it is ignored. The young: only
      // small fingers tapping at the bottom corner of the pane, and the top of a face just over the sill.
      // The old: a face so long it runs past the top and bottom of the window, both hands spread on the
      // glass, handprints all over it, the pane fogging from outside.
      const pale = A.mat(old ? '#e2ded6' : '#dcd6cb', 0, .55), socket = A.mat('#050404', 0, 1), pin = glow('#e8f0ff', 2.2);
      const WX = -2.6, WY = 2.22, GZ = -4.0;                             // the window glass (keep.html)
      let glassThere = false; A.scene.traverse(o => { if (o.isMesh && o.material === A.M.glass && Math.abs(o.position.z - GZ) < .05) glassThere = true; });
      const g = G(root, [WX, 0, -4.85]); g.scale.setScalar(v.size || 1);
      const head = G(g, [0, young ? 1.42 : old ? 2.25 : 2.55, 0]);
      const tall = young ? .7 : old ? 2.4 : 1.12;
      P(head, A.ico(.32, 2), pale, [0, 0, 0], { scale: [young ? .55 : .62, tall, .55], jitter: .004 });
      for (const sx of [-1, 1]) {                                       // the sockets, and far down in each a cold pinprick
        P(head, A.ico(.065, 1), socket, [sx * .085, .1 * tall, .15], { scale: [1, 1.7, .5], cast: false });
        P(head, A.ico(.009, 0), pin, [sx * .085, .1 * tall - .01, .165], { cast: false });
      }
      bone(g, [0, 0, -.1], [0, head.position.y - .3, 0], .07, .06, pale);   // its neck, all the way down to the ground
      // hands on the pane (the young: small fingers at the corner, tapping)
      const hands = [];
      const hand = (x, y, s, spread) => {
        const h = G(root, [x, y, GZ - .03]); h.scale.setScalar(s);
        P(h, A.box(.16, .2, .03), pale, [0, 0, 0]);
        const fingers = [];
        for (let f = 0; f < 4; f++) { const fg = G(h, [(f - 1.5) * .04, .1, 0]); bone(fg, [0, 0, 0], [(f - 1.5) * .012 * spread, .28 + (f === 1 || f === 2 ? .05 : 0), .01], .012, .008, pale, 4); fingers.push(fg); }
        bone(h, [-.08, -.02, 0], [-.17, .1, .01], .013, .008, pale, 4);
        hands.push({ h, fingers }); return h;
      };
      if (young) { const h = hand(WX + .5, 1.42, .55, 1); h.position.y = 1.36; }
      else if (old) { hand(WX - .52, 2.35, 1.15, 2.2); hand(WX + .5, 2.0, 1.15, 2.2).rotation.z = -.2; }
      else hand(WX + .48, 2.05, 1, 1);
      // handprints, a little higher each night (the old: all over the pane)
      const prints = new T.MeshBasicMaterial({ color: '#e8e4dc', transparent: true, opacity: .16, depthWrite: false });
      const spots = old ? Array.from({ length: 14 }, (_, i) => [WX - .6 + ((i * 37) % 12) / 10, 1.5 + ((i * 53) % 15) / 10]) : young ? [[WX + .4, 1.45]] : [[-2.25, 1.7], [-2.95, 1.95], [-2.4, 2.35]];
      for (const [x, y] of spots) { const m = new T.Mesh(new T.CircleGeometry(.07, 8), prints); m.scale.set(1, 1.3, 1); m.position.set(x, y, GZ - .012); m.rotation.y = Math.PI; root.add(m); }
      // on the glass, if there is glass: cracks that spread the longer it is ignored; the old one's breath fogging it
      const crackTex = canvasTex(256, 320, (c, w, h) => {
        c.strokeStyle = 'rgba(235,240,245,.85)'; c.lineWidth = 1.4; const r = A.rand(61);
        const crack = (x, y, a, len, d) => { if (d > 3 || len < 8) return; const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
          c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke(); crack(x2, y2, a + (r() - .5) * .9, len * .7, d + 1); if (r() < .6) crack(x2, y2, a + (r() < .5 ? -1 : 1) * (.5 + r() * .5), len * .55, d + 1); };
        for (let k = 0; k < 9; k++) crack(w * .7, h * .55, k / 9 * 6.28, 40 + r() * 30, 0);
      });
      const crackM = new T.MeshBasicMaterial({ map: crackTex, transparent: true, opacity: 0, depthWrite: false });
      const fogM = new T.MeshBasicMaterial({ color: '#dfe4ea', transparent: true, opacity: 0, depthWrite: false });
      if (glassThere) {
        const cr = new T.Mesh(new T.PlaneGeometry(1.4, 1.75), crackM); cr.position.set(WX, WY, GZ + .004); root.add(cr);
        if (old) { const fg = new T.Mesh(new T.PlaneGeometry(1.4, 1.75), fogM); fg.position.set(WX, WY, GZ - .006); root.add(fg); }
      }
      const moon = softLight('#b8c8ff', 2.5, 4); moon.position.set(-2.2, 3.2, -5.6); root.add(moon);
      return (t) => {
        const sink = young ? pulse(t + 4, 11, 3) : pulse(t + 8, old ? 30 : 16, old ? 4 : 5);   // now and then it slides down out of sight
        g.position.y = -sink * (young ? 1.2 : 2.4);
        head.rotation.z = Math.sin(t * (old ? .08 : .25)) * (old ? .08 : .25); head.rotation.y = Math.sin(t * .17) * (old ? .05 : .15);
        for (const { fingers } of hands) fingers.forEach((f, i) => { f.rotation.x = young ? -(Math.max(0, Math.sin(t * 6 - i * .9)) ** 6) * .6 * (1 - sink) : 0; });   // tap, tap
        crackM.opacity = smooth(8, old ? 40 : 70, t) * .8;              // its tell: the longer it is left, the more the glass cracks
        fogM.opacity = old ? .12 + Math.max(0, Math.sin(t * .4)) * .22 : 0;   // breath on the glass
      };
    },
  },

  // ================================================================ THE DOORWAY FIGURE
  doorway: {
    name: 'The Doorway Figure', hour: 22,
    blurb: 'Someone standing in the courtyard door at night, backlit by pale mist: far too tall for the frame, folded down so its head comes just under the lintel, long pale fingers curled round the door posts. No face, only two small cold points of light that blink, slowly, now and then. It never steps over the threshold uninvited. Shut the door and it is gone by morning. Leave it open...',
    view: [[-.6, 1.55, 1.3], [-5.6, 1.7, 1.0]],
    knight: { place: 'fire', action: 'sit', emote: 'exclaim', note: 'not inviting anyone in' },
    build(root) {
      const v = root.userData.appearance?.variant || {};
      const age = v.age || '';
      const dark = A.mat('#0c0b0e', 0, .9), darkL = A.mat('#16141a', 0, .9);
      const pale = A.mat('#b9b2a8', 0, .6, { emissive: '#2c2a28', emissiveIntensity: .4 });
      // the doorway: the hall's west wall at x -5.3 (its outer face at about -5.65), the opening from
      // z .35 to 1.65, the lintel at 2.4. It stands outside, and nothing of it passes through stone.
      const OUT = -5.66, Z0 = .38, Z1 = 1.62, LINTEL = 2.4;
      const g = G(root, [-6.55, 0, 1.0], [0, Math.PI / 2, 0]);           // facing the hall (+x)
      const tall = age === 'old' ? 1.08 : age === 'young' ? .92 : 1;
      for (const sx of [-1, 1]) {                                        // long legs, knees a little bent
        bone(g, [sx * .15, 1.75 * tall, -.1], [sx * .17, .9 * tall, .12], .065, .05, dark);
        bone(g, [sx * .17, .9 * tall, .12], [sx * .14, 0, -.02], .05, .04, dark);
      }
      // the body folds forward over the lintel's height, staying outside the wall
      const spine = G(g, [0, 1.75 * tall, -.1], [1.25, 0, 0]);   // folded down to come in under the lintel
      P(spine, A.cyl(.2, .14, 1.05, 7), dark, [0, .52, 0], { scale: [1, 1, .62] });
      for (let i = 0; i < 6; i++) P(spine, A.ico(.035, 0), darkL, [0, .15 + i * .15, -.1], { cast: false });   // a spine you can count
      const neck = G(spine, [0, 1.08, .02], [.5, 0, 0]);
      bone(neck, [0, 0, 0], [0, .32, 0], .045, .04, dark);
      const head = G(neck, [0, .44, .02]);
      P(head, A.ico(.15, 2), darkL, [0, 0, 0], { scale: [.8, 1.25, .88], jitter: .004 });   // nothing on it but two points of light
      const pin = new T.MeshBasicMaterial({ color: '#eef4ff', fog: false });
      const eyes = [-1, 1].map(sx => { const e = new T.Mesh(A.ico(.014, 1), pin); e.position.set(sx * .045, .03, .125); head.add(e); return e; });
      // arms: up and out to the door posts, fingers curled round the stone
      const hands = [];
      for (const sx of [-1, 1]) {
        const sh = G(spine, [sx * .22, .98, 0]);
        const zJamb = sx < 0 ? Z0 : Z1;
        const handAt = new T.Vector3(OUT - .02, 1.95, zJamb - sx * .03);
        hands.push({ sh, sx, handAt });
      }
      // the arms are placed in world space each frame from shoulder to the hand on the post
      const armMeshes = hands.map(() => [P(root, A.cyl(.032, .045, 1, 6), dark), P(root, A.cyl(.025, .032, 1, 6), dark)]);
      const fingerSets = hands.map(({ sx, handAt }) => {
        const hg = G(root, handAt.toArray());
        P(hg, A.box(.05, .14, .07), pale, [0, 0, 0]);
        const fs = [];
        for (let f = 0; f < 4; f++) {                                   // over the edge of the post, into the opening
          const fb = G(hg, [.02, .05 - f * .045, 0]);
          const c = chain(fb, 3, .07, .011, .006, pale, { sides: 4, jitter: .001 });
          fb.rotation.set(0, 0, -Math.PI / 2); fb.rotation.y = sx * .9;
          fs.push(c);
        }
        return { hg, fs };
      });
      // pale mist behind it (no light of its own: its outline is enough)
      const mist = Array.from({ length: 10 }, (_, i) => {
        const sp = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: '#9aa4bb', transparent: true, opacity: .32, depthWrite: false, fog: false }));
        sp.position.set(-7.4 - (i % 4) * 1.2, .5 + Math.floor(i / 4) * .7, .2 + (i % 3) * .8); sp.scale.setScalar(3.2); root.add(sp); return sp;
      });
      const a = V(), b = V(), mid = V(), q = new T.Quaternion(), up = V(0, 1, 0);
      const place = (m, from, to) => { mid.copy(from).add(to).multiplyScalar(.5); m.position.copy(mid);
        const d = to.clone().sub(from); m.scale.set(1, d.length(), 1); q.setFromUnitVectors(up, d.normalize()); m.quaternion.copy(q); };
      return (t) => {
        spine.rotation.x = 1.25 + Math.sin(t * .5) * .01;               // breathing, barely
        neck.rotation.z = Math.sin(t * .13) * .18;                       // the head tilts, slowly, one way then the other
        head.rotation.y = Math.sin(t * .09) * .12;
        const shut = pulse(t + 4, 11, 1.1);                              // a slow blink, now and then
        eyes.forEach(e => { e.scale.set(1, Math.max(.05, 1 - shut * 1.2), 1); });
        hands.forEach(({ sh }, i) => {
          sh.getWorldPosition(a); const h = hands[i].handAt;
          const elbow = a.clone().lerp(h, .5).add(V(.05, .25, 0));
          place(armMeshes[i][0], a, elbow); place(armMeshes[i][1], elbow, h);
        });
        fingerSets.forEach(({ fs }, i) => fs.forEach((c, f) => c.forEach((j, k) => {
          j.rotation.z = .5 + pulse(t + f * .35 + i * 3, 7, .5) * .35;   // now and then, one after another, they tap
        })));
        mist.forEach((m, i) => { m.position.x += Math.sin(t * .3 + i) * .002; });
        void b; void LINTEL;
      };
    },
  },
  // ================================================================ THE DRAGON, FINAL LOOK (art pass)
  dragon2: {
    name: 'The dragon (final look)', hour: 18,
    blurb: 'Art pass: how the dragon would look in the finished version. Legendary. It lands on the courtyard wall, peers down at whoever is there, and breathes fire when it is angry or showing off.',
    view: [[-6.0, 2.4, 3.2], [-15.6, 2.6, .1]], views: { young: [[-5.6, 2.0, 1.4], [-7.8, 1.5, -4.3]] },   // the young: on the north wall
    knight: { place: 'courtyard', action: 'stand', emote: 'exclaim', note: 'face to face with a dragon' },
    build(root) {
      const v = root.userData.appearance?.variant || {}, young = v.age === 'young', old = v.age === 'old';
      // the young: a wyrmling no bigger than a large dog, bright-scaled, stub horns, big eyes, little
      // wings, scrambling up and down the wall top and snapping at moths; only smoke yet. The old:
      // hunched low on the wall, torn wings folded round it like a cloak, head lowered, a greyed muzzle,
      // one horn broken short, smoke always curling from its nostrils.
      const g = G(root, young ? [-8.15, 1.25, -4.3] : [old ? -17.95 : -17.6, old ? .95 : 1.15, .1], [0, Math.PI / 2, 0]); g.scale.setScalar((v.size || 1) * (young ? .36 : old ? 1.12 : 1));   // the young: the north wall, by the keep; the others on the west wall, facing the keep
      const sA = A.mat(young ? '#a8432a' : old ? '#5a2a24' : '#6e2a20', .2, .55), sB = A.mat(young ? '#7a2e1e' : old ? '#3e1f1a' : '#4a1b16', .2, .6);
      const sC = A.mat(young ? '#c85a34' : old ? '#6e3a2e' : '#8e3a28', .2, .5);
      const belly = A.mat('#caa070', .05, .6), horn = A.mat('#e2d6bd', 0, .5), hornD = A.mat('#9c8a6c', 0, .6), claw = A.mat('#16110f', .3, .4);
      const fire = glow('#ff7a1a', 2.6), eyeM = glow(old ? '#c9a24a' : '#ffd040', old ? 1.8 : 3.2), black = A.mat('#050303');
      const scarM = A.mat('#2a1512', .1, .8), muzzleOld = A.mat('#8a7a70', .1, .7);
      const wingTex = canvasTex(256, 256, (c, w, h) => {
        const gr = c.createRadialGradient(0, h, 10, 0, h, w * 1.35);
        gr.addColorStop(0, '#3a120e'); gr.addColorStop(.55, '#6e2418'); gr.addColorStop(1, '#c65e30'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(28,8,6,.55)'; c.lineWidth = 2;
        for (let i = 0; i < 16; i++) { c.beginPath(); let x = 0, y = h; c.moveTo(x, y); const a = -.05 - i * .1; for (let k = 0; k < 7; k++) { const b = a + (k % 2 ? .18 : -.18); x += Math.cos(b) * 42; y += Math.sin(b) * 42; c.lineTo(x, y); } c.stroke(); }
        if (old) { c.globalCompositeOperation = 'destination-out';           // the old: tears in the membrane
          for (const [x, y, r] of [[150, 110, 22], [196, 60, 16], [110, 170, 12], [210, 150, 18]]) { c.beginPath(); c.moveTo(x - r, y); c.lineTo(x, y - r * .6); c.lineTo(x + r * .8, y + r * .2); c.lineTo(x - r * .2, y + r); c.closePath(); c.fill(); }
          c.globalCompositeOperation = 'source-over'; }
      });
      const web = new T.MeshStandardMaterial({ map: wingTex, emissiveMap: wingTex, emissive: '#ff7a3a', emissiveIntensity: young ? .3 : .18, side: T.DoubleSide, roughness: .8, flatShading: true,
                                               alphaTest: old ? .5 : 0, transparent: false });
      const sheetUV = (parent, pts, tris, span) => {
        const m = sheet(parent, pts, tris, web), pa = m.geometry.attributes.position, uv = [];
        for (let i = 0; i < pa.count; i++) uv.push(Math.min(1, Math.abs(pa.getX(i)) / span), Math.min(1, Math.max(0, (pa.getY(i) + .8) / 3.6)));
        m.geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); return m;
      };
      // the body: a long, deep chest with plated belly, scaled flanks and a crest of spines
      const torso = G(g, [0, 1.02, .05]);
      const prof = [[.05, -1.8], [.5, -1.6], [.78, -1.0], [.9, -.3], [.95, .4], [.9, 1.0], [.72, 1.5], [.45, 1.85], [.05, 1.95]];
      const rAt = z => { for (let i = 1; i < prof.length; i++) if (z <= prof[i][1]) { const [r0, y0] = prof[i - 1], [r1, y1] = prof[i]; return r0 + (r1 - r0) * (z - y0) / (y1 - y0); } return .05; };
      const body = new T.Mesh(A.facet(new T.LatheGeometry(prof.map(([r, y]) => new T.Vector2(r, y)), 12), .03, 3), sA);
      body.rotation.x = Math.PI / 2; body.scale.set(.95, 1, .82); body.castShadow = true; torso.add(body);
      const seams = [];
      for (let i = 0; i < 10; i++) {
        const z = -1.35 + i * .33, R = rAt(z);
        const plate = new T.Mesh(new T.TorusGeometry(R * .93, .075, 3, 10, Math.PI * .8), belly); plate.rotation.z = -.9 * Math.PI; plate.position.z = z; plate.scale.y = .82; torso.add(plate);
        if (i < 9) { const s = new T.Mesh(new T.TorusGeometry(R * .9, .02, 3, 10, Math.PI * .7), fire); s.rotation.z = -.85 * Math.PI; s.position.z = z + .165; s.scale.y = .82; torso.add(s); seams.push(s); }
        for (const sx of [-1, 1]) for (const [row, y] of [[0, .3], [1, .02]]) if ((i + row) % 2 === 0) P(torso, A.ico(.16, 0), row ? sB : sC, [sx * R * .9, y * R, z], { scale: [.35, .9, 1.4], rot: [0, sx * .2, 0], cast: false });
        if (!young || i % 3 === 0) P(torso, new T.ConeGeometry(.08, (.22 + Math.sin(i / 9 * Math.PI) * .2) * (young ? .5 : 1), 4), hornD, [0, R * .8 + .06, z], { rot: [-.35, 0, 0] });
        if (old && i % 3 === 1) P(torso, A.box(.02, .05, .5), scarM, [R * .75, R * .3, z], { rot: [0, .3, .6], cast: false });   // old scars along its flank
      }
      for (const sx of [-1, 1]) { P(torso, A.ico(.45, 1), sB, [sx * .6, .2, 1.05]); P(torso, A.ico(.55, 1), sB, [sx * .6, -.1, -.65], { scale: [.75, 1.05, 1.25] }); }
      // legs gripping the wall
      for (const sx of [-1, 1]) {
        bone(g, [sx * .62, 1.25, 1.05], [sx * .82, .65, .8], .2, .15, sA); P(g, A.ico(.15, 1), sB, [sx * .82, .65, .8]);
        bone(g, [sx * .82, .65, .8], [sx * .62, .16, .38], .15, .1, sA);
        P(g, A.box(.28, .1, .22), sB, [sx * .62, .08, .34]);
        for (let k = 0; k < 4; k++) {
          const tx = sx * .62 + (k - 1.5) * .07;
          bone(g, [tx, .1, .4], [tx, .06, .55], .035, .028, sB, 5);
          P(g, new T.ConeGeometry(.026, .15, 4), claw, [tx, -.02, .6], { rot: [2.3, 0, 0] });
        }
        bone(g, [sx * .62, .9, -.62], [sx * .9, .75, -.12], .28, .18, sA); P(g, A.ico(.16, 1), sB, [sx * .9, .75, -.12]);
        bone(g, [sx * .9, .75, -.12], [sx * .78, .3, -.55], .17, .11, sA);
        bone(g, [sx * .78, .3, -.55], [sx * .72, .07, -.22], .11, .08, sA);
        for (let k = 0; k < 3; k++) {
          const tx = sx * .72 + (k - 1) * .09;
          bone(g, [tx, .07, -.22], [tx, .05, -.02], .04, .03, sB, 5);
          P(g, new T.ConeGeometry(.03, .16, 4), claw, [tx, .01, .04], { rot: [1.9, 0, 0] });
        }
      }
      // neck, plated beneath and spined above
      const neckBase = G(torso, [0, .42, 1.7]);
      const neck = chain(neckBase, 9, .3, .4, .22, sA, { each: (i, j, r) => {
        P(j, new T.ConeGeometry(.055, .22, 4), hornD, [0, .15, -r * .95], { rot: [-.45, 0, 0] });
        P(j, A.box(r * 1.1, .2, .06), belly, [0, .15, r * .88], { rot: [.1, 0, 0] });
      } });
      neck[0].rotation.x = .5; for (let i = 1; i < 9; i++) neck[i].rotation.x = .17;
      const hj = G(neck[8], [0, .3, 0]), head = G(hj, [0, 0, 0], [-Math.PI / 2 + .3, 0, 0]); if (young) head.scale.setScalar(1.5);   // the young: all head and eyes
      P(head, A.ico(.3, 1), sA, [0, .05, 0], { scale: [1, .78, 1.15] });
      P(head, A.cyl(.11, .22, .85, 6), sA, [0, 0, .55], { rot: [Math.PI / 2, Math.PI / 6, 0], scale: [1.15, 1, .72] });
      P(head, A.ico(.12, 1), old ? muzzleOld : sB, [0, -.01, .98], { scale: [1.1, .7, 1] });   // a greyed muzzle on the old
      if (old) P(head, A.cyl(.09, .19, .5, 6), muzzleOld, [0, .01, .7], { rot: [Math.PI / 2, Math.PI / 6, 0], scale: [1.18, 1, .74] });
      for (let k = 0; k < 4; k++) P(head, new T.ConeGeometry(.025, .09, 4), hornD, [0, .13 - k * .01, .35 + k * .16], { rot: [-.6, 0, 0] });
      for (const sx of [-1, 1]) {
        P(head, A.box(.14, .07, .34), sB, [sx * .15, .17, .2], { rot: [-.12, sx * .22, sx * -.38] });
        P(head, A.ico(young ? .075 : .052, 1), eyeM, [sx * .17, .11, .3], { cast: false });
        P(head, A.box(.012, .07, .02), black, [sx * .195, .11, .32], { rot: [0, sx * .9, 0], cast: false });
        if (young) bone(head, [sx * .13, .2, -.1], [sx * .2, .3, -.3], .07, .02, horn);          // stubby horns, just coming
        else {
          bone(head, [sx * .13, .2, -.1], [sx * .28, .42, -.55], .085, .05, horn);
          if (old && sx > 0) P(head, A.ico(.05, 0), hornD, [sx * .28, .42, -.55]);              // broken short, long ago
          else bone(head, [sx * .28, .42, -.55], [sx * .33, .47, -1.02], .05, .012, horn);
        }
        bone(head, [sx * .24, .05, -.12], [sx * .48, .02, -.5], .05, .01, hornD);
        const fr = [[sx * .24, -.08, -.05], [sx * .46, .1, -.32], [sx * .5, -.12, -.25], [sx * .42, -.28, -.12]];
        for (let k = 1; k < 4; k++) bone(head, fr[0], fr[k], .025, .008, hornD, 4);
        sheet(head, fr, [[0, 1, 2], [0, 2, 3]], web);
        for (let k = 0; k < 6; k++) P(head, new T.ConeGeometry(.016, .08, 4), horn, [sx * (.14 - k * .012), -.09, .32 + k * .12], { rot: [Math.PI, 0, 0], cast: false });
      }
      const jaw = G(head, [0, -.1, .05]);
      P(jaw, A.cyl(.07, .16, .85, 6), sB, [0, -.02, .45], { rot: [Math.PI / 2, Math.PI / 6, 0], scale: [1.1, 1, .5] });
      P(jaw, A.box(.1, .03, .5), A.mat('#5e1616'), [0, .02, .42], { cast: false });
      P(jaw, A.box(.08, .02, .45), fire, [0, .035, .45], { cast: false });
      for (const sx of [-1, 1]) for (let k = 0; k < 5; k++) P(jaw, new T.ConeGeometry(.014, .07, 4), horn, [sx * (.1 - k * .012), .04, .32 + k * .12], { cast: false });
      for (const sx of [-1, 1]) bone(jaw, [sx * .05, -.06, .1], [sx * .07, -.28, .02], .02, .006, hornD, 4);
      const nostrils = glow('#ff8a2a', 1.4);
      for (const sx of [-1, 1]) P(head, A.ico(.025, 0), nostrils, [sx * .05, .06, 1.02], { cast: false });
      const breath = softLight('#ff7a2a', 0, 2.6); breath.position.set(0, -.05, 1.2); head.add(breath);   // a glow, not a light
      const nose = G(head, [0, .02, 1.05]);
      // the tail down the far side of the wall, curling south along its foot, ending in a spade
      const tailBase = G(torso, [0, -.1, -1.75]);
      const tail = chain(tailBase, 14, .36, .34, .04, sA, { each: (i, j, r) => { if (i % 2 === 0) P(j, new T.ConeGeometry(.05, .17, 4), hornD, [0, .15, r * .9], { rot: [.4, 0, 0] }); } });
      tail[0].rotation.x = -2.6; for (let i = 1; i < 14; i++) { tail[i].rotation.x = .06; tail[i].rotation.y = -.1; }   // clear of the barrow stones
      sheet(tail[13], [[0, .2, 0], [0, .45, .22], [0, .8, 0], [0, .45, -.22]], [[0, 1, 2], [0, 2, 3]], web);
      // wings, half raised, membranes veined and glowing faintly at the edges
      const wings = [];
      for (const sx of [-1, 1]) {
        const w = G(g, [sx * .52, 1.65, .8]);
        if (young) w.scale.setScalar(.5); else if (old) w.scale.set(.5, .95, .9);   // little wings; the old's folded close
        const S = [0, 0, 0], E = [sx * 1.15, .95, -.35], W = [sx * 2.1, 2.0, -.25];
        const F = [[sx * 3.7, 2.7, -.75], [sx * 3.95, 1.35, -1.5], [sx * 3.2, .15, -2.15], [sx * 2.0, -.45, -2.3]];
        bone(w, S, E, .12, .08, sA); bone(w, E, W, .08, .055, sA);
        P(w, A.ico(.1, 1), sB, E); P(w, A.ico(.075, 1), sB, W);
        for (const f of F) bone(w, W, f, .055, .014, sB, 5);
        P(w, new T.ConeGeometry(.045, .22, 4), claw, W.map((v, i) => v + [0, .12, .05][i]), { rot: [0, 0, sx * -.5] });
        const sc = (a, b, u) => a.map((v, i) => (v + (b[i] - v) * u) * .84 + W[i] * .16);
        const pts = [W, F[0], sc(F[0], F[1], .33), sc(F[0], F[1], .66), F[1], sc(F[1], F[2], .33), sc(F[1], F[2], .66), F[2], sc(F[2], F[3], .33), sc(F[2], F[3], .66), F[3], E, [sx * 1.0, -.6, -1.9], [0, -.5, -1.35], S];
        const tris = []; for (let i = 1; i < 10; i++) tris.push([0, i, i + 1]);
        tris.push([0, 10, 11], [11, 10, 12], [11, 12, 13], [11, 13, 14]);
        sheetUV(w, pts, tris, 4);
        wings.push({ w, sx });
      }
      // smoke, and now and then a gout of fire
      const puffs = Array.from({ length: 8 }, (_, i) => { const s = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: '#6a625c', transparent: true, opacity: .3, depthWrite: false })); root.add(s); return { s, ph: i / 8 }; });
      const flames = Array.from({ length: 30 }, (_, i) => { const s = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: i % 3 ? '#ff8a2a' : '#ffd06a', transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending })); root.add(s); return { s, ph: i / 22 }; });
      const at = V(), fwd = V(), kn = V(), toK = V(), hp = V();
      let look = 0;
      // the young: moths about its head, which it snaps at (and misses)
      const moths = young ? Array.from({ length: 3 }, (_, i) => { const m = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: '#fff2c0', transparent: true, opacity: .85, depthWrite: false, blending: T.AdditiveBlending }));
        m.scale.setScalar(.09); root.add(m); return { m, ph: i * 2.1 }; }) : [];
      let zAt = 0, face = 0, turnK = 0, tailSide = 1;
      return (t, dt) => {
        const b = Math.sin(t * 1.05);
        torso.scale.set(1 + .02 * b, 1 + .03 * b, 1);
        A.K.J.hips.getWorldPosition(kn); toK.copy(kn).sub(g.position);
        const rel = Math.atan2(toK.x, toK.z) - g.rotation.y;
        const lim = young ? .45 : .7, want = Math.max(-lim, Math.min(lim, Math.atan2(Math.sin(rel), Math.cos(rel))));
        look += (want - look) * Math.min(1, dt * 1.5);
        neck.forEach((j, i) => { j.rotation.y = look / 9 + .05 * Math.sin(t * .45 + i * .35); });
        neck[0].rotation.x = (old ? 1.15 : young ? .15 : .5) + .05 * Math.sin(t * .3);   // (the young: head up, alert)        // the old: head low, resting near the wall top
        if (old) for (let i = 1; i < 9; i++) neck[i].rotation.x = i < 5 ? .05 : .2;
        if (young) {                                                        // scrambling along the wall top in fits and starts
          const sit = pulse(t + 5, 13, 4) > 0;                             // now and then it sits a while and snaps at the moths
          const want = sit ? zAt : Math.sin(t * .23) * .42 + Math.sin(t * .61) * .18, step = want - zAt;   // the stretch of wall between the dead tree and the keep
          zAt += step * Math.min(1, dt * 1.6);
          const v = step * 1.6;
          if (Math.abs(v) > .15) { turnK += ((v > 0 ? 0 : 1) - turnK) * Math.min(1, dt * 5); face = Math.PI / 2 - turnK * Math.PI; }   // it turns about facing the courtyard, so its tail swings outside the wall
          g.position.x = -8.15 + zAt; g.rotation.y = face; g.position.y = 1.15 + Math.abs(Math.sin(t * 11)) * .04 * Math.min(1, Math.abs(v));
          g.rotation.z = Math.sin(t * 11) * .05 * Math.min(1, Math.abs(v));
        }
        const fireOn = young ? 0 : pulse(t + 3, old ? 20 : 14, 2.6), idle = pulse(t, 7, 1.4) * .35;   // the young have only smoke yet
        const snap = young ? Math.max(0, Math.sin(t * 5.3)) ** 8 * Math.max(pulse(t, 3.1, 1.2), pulse(t + 5, 13, 4)) : 0;   // snapping at the moths (most of all while it sits)
        jaw.rotation.x = .04 + Math.max(idle, fireOn, snap) * .55;
        breath.intensity = fireOn * 7 + idle * 1.5;
        nostrils.emissiveIntensity = 1.2 + fireOn * 4 + Math.sin(t * 3) * .3;
        const glowK = 2 + Math.sin(t * 1.05) * .6 + fireOn * 2; fire.emissiveIntensity = glowK; seams.forEach(s => { s.visible = true; });
        head.children.forEach(c => { if (c.material === eyeM) c.scale.y = 1 - pulse(t, 6.5, .2) * .85; });
        if (young) { tailSide = -Math.sin(face); tail[0].rotation.z = tailSide * 1.1; }   // the young turn about: its tail always hangs down the outside (north) of the wall
        const outward = young ? tailSide : 1;
        for (let i = 1; i < 14; i++) tail[i].rotation.z = outward * (old ? .27 : .2) + .05 * Math.sin(t * .7 - i * .45);   // (the old's coiled tighter, off the barrow stones)
        const stretch = pulse(t + 8, 17, 4);
        for (const { w, sx } of wings) {
          if (old) { w.rotation.z = sx * (-1.3 + .03 * Math.sin(t * .4)); w.rotation.y = sx * .25; continue; }   // folded down and back over its haunches   // folded round it like a cloak
          w.rotation.z = sx * (-.1 + .06 * Math.sin(t * .6) + stretch * .4 - fireOn * .2) + (young ? sx * Math.sin(t * 13) * .35 * pulse(t, 4.3, 1) : 0); w.rotation.y = sx * stretch * .2; }   // up and back: clear of the roofs and the walls (the young: a flutter)
        nose.getWorldPosition(at); head.getWorldDirection(fwd);
        const puffMore = young ? 1 + pulse(t + 3, 9, 2) * 1.5 : old ? 1.7 : 1;   // the young huff smoke where the old would breathe fire; the old always smoulder
        if (young) { head.getWorldPosition(hp);
          for (const { m, ph } of moths) m.position.set(hp.x + Math.sin(t * 2.3 + ph) * .35, hp.y + .25 + Math.sin(t * 3.1 + ph * 2) * .18, hp.z + Math.cos(t * 1.9 + ph) * .35); }
        for (const p of puffs) { const k = (t * .25 * puffMore + p.ph) % 1; p.s.position.set(at.x + Math.sin(k * 9 + p.ph * 20) * .25 * k, at.y + k * 1.8, at.z + k * .4); p.s.scale.setScalar((.25 + k * 1.4) * (young ? .7 : 1)); p.s.material.opacity = Math.min(.6, .3 * puffMore) * (1 - k) * (1 - fireOn); }
        for (const f of flames) {
          const k = (t * 1.6 + f.ph) % 1;
          f.s.position.copy(at).addScaledVector(fwd, .2 + k * 3.4); f.s.position.y -= k * k * .8;
          f.s.scale.setScalar(.5 + k * 2.4); f.s.material.opacity = Math.min(1, fireOn * 1.6) * (1 - k);
        }
      };
    },
  },

  // ================================================================ THE LONG MAN, FINAL LOOK (art pass)
  longman2: {
    name: 'The Long Man (final look)', hour: 18, specks: true,
    blurb: 'Art pass: how the Long Man would look in the finished version. It only moves when no one is watching, and each time it is a little closer, standing a little differently. (Try looking away.)',
    view: [[-10.5, 1.9, 3.6], [-24, 3.0, 6.2]],
    knight: { place: 'courtyard', action: 'stand', emote: 'dots', note: 'not looking at it. Not looking at it.' },
    build(root) {
      const skin = A.mat('#2c2a28', 0, .65), skinD = A.mat('#1b1a19', 0, .8), coat = ds('#121113', 0, .95), coatL = ds('#1d1b1e', 0, .95);
      const face = A.mat('#e2ded6', 0, .5, { emissive: '#4a4844', emissiveIntensity: .5 }), faceD = A.mat('#bcb6ac', 0, .6, { emissive: '#2e2c2a', emissiveIntensity: .5 });
      const g = G(root, [-27.5, 0, 6.2], [0, Math.PI / 2, 0]);   // the field south-west of the keep, clear of the barrow
      for (const sx of [-1, 1]) {
        bone(g, [sx * .15, 3.25, 0], [sx * .19, 1.65, .06], .075, .05, skin); P(g, A.ico(.075, 1), skinD, [sx * .19, 1.65, .06]);
        bone(g, [sx * .19, 1.65, .06], [sx * .16, .12, -.02], .05, .038, skin); P(g, A.ico(.05, 1), skinD, [sx * .16, .12, -.02]);
        P(g, A.box(.09, .05, .34), skin, [sx * .16, .04, .1]);
        for (let k = 0; k < 4; k++) bone(g, [sx * .16 + (k - 1.5) * .02, .03, .25], [sx * .16 + (k - 1.5) * .025, .02, .36], .01, .006, skinD, 4);
      }
      P(g, A.ico(.17, 1), skin, [0, 3.3, 0], { scale: [1.3, .7, .8] });
      P(g, A.cyl(.19, .13, 1.35, 7), skin, [0, 3.98, 0], { scale: [1, 1, .6] });
      for (let i = 0; i < 6; i++) { const rib = new T.Mesh(new T.TorusGeometry(.15 - Math.abs(i - 2.5) * .01, .012, 3, 8, Math.PI), skinD); rib.position.set(0, 3.65 + i * .11, .02); rib.rotation.set(0, 0, Math.PI); rib.scale.z = .6; g.add(rib); }
      bone(g, [-.31, 4.62, 0], [.31, 4.62, 0], .055, .055, skin);
      const arms = [];
      for (const sx of [-1, 1]) {
        const sh = G(g, [sx * .31, 4.62, 0]);
        bone(sh, [0, 0, 0], [sx * .06, -1.37, .06], .05, .04, skin); P(sh, A.ico(.055, 1), skinD, [sx * .06, -1.37, .06]);
        bone(sh, [sx * .06, -1.37, .06], [sx * .03, -2.77, .1], .04, .032, skin); P(sh, A.ico(.04, 1), skinD, [sx * .03, -2.77, .1]);
        const hand = G(sh, [sx * .03, -2.85, .1]);
        P(hand, A.box(.07, .14, .04), skin, [0, -.03, 0]);
        const fingers = [];
        for (let f = 0; f < 5; f++) {
          const fb = G(hand, [(f - 2) * .016 * sx, -.1, f === 0 ? .03 : 0], [0, 0, (f - 2) * .04 * sx]);
          fingers.push(chain(fb, 3, f === 0 ? .1 : .16, .011, .006, skin, { sides: 4, jitter: .002 }));
          fingers[f].forEach(j => { j.rotation.z = Math.PI; });   // hanging down
        }
        arms.push({ sh, fingers, sx });
      }
      bone(g, [0, 4.66, 0], [0, 5.22, .03], .042, .038, skin);
      for (let k = 0; k < 4; k++) P(g, A.ico(.022, 0), skinD, [0, 4.75 + k * .12, -.035]);
      const head = G(g, [0, 5.44, .03]);
      P(head, A.ico(.17, 2), face, [0, 0, 0], { scale: [.78, 1.25, .85], jitter: .006 });
      const voidTick = voidFace(head, this.specks, [.78, 1.25, .85]);   // no face at all: a hole
      // a long coat hanging open from its shoulders, ragged at the hem
      const panels = [];
      const back = G(g, [0, 4.62, -.06]);
      sheet(back, [[-.33, 0, 0], [.33, 0, 0], [.4, -2.55, -.12], [.22, -2.35, -.12], [.05, -2.7, -.12], [-.12, -2.4, -.12], [-.28, -2.62, -.12], [-.4, -2.5, -.12]],
        [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 5], [0, 5, 6], [0, 6, 7]], coat);
      panels.push(back);
      for (const sx of [-1, 1]) {
        const fp = G(g, [sx * .3, 4.62, .02]);
        sheet(fp, [[0, 0, 0], [-sx * .12, -.15, .1], [-sx * .08, -2.3, .14], [0, -2.45, .1], [sx * .08, -2.2, .05]], [[0, 1, 2], [0, 2, 3], [0, 3, 4]], coatL);
        panels.push(fp);
      }
      P(g, A.cyl(.11, .17, .14, 8), coat, [0, 4.68, 0]);
      const mist = Array.from({ length: 18 }, (_, i) => {
        const sp = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: i % 2 ? '#8c8697' : '#7a7686', transparent: true, opacity: .26, depthWrite: false }));
        sp.userData = { x: -32 + (i % 6) * 2.4, z: -5.5 + Math.floor(i / 6) * 4, y: .3 + (i % 3) * .35, ph: i }; root.add(sp); return sp;
      });
      const poses = [{ l: 0, r: 0, tilt: .12, turn: 0 }, { l: -.15, r: 0, tilt: -.35, turn: .1 }, { l: 0, r: -.55, tilt: .45, turn: -.1 }, { l: -.35, r: -.2, tilt: 0, turn: 0 }];
      let pi = 0;
      const p = V(); let seen = true;
      return (t, dt) => {
        voidTick(t);
        head.getWorldPosition(p); p.project(A.camera);
        const onScreen = Math.abs(p.x) < 1.02 && Math.abs(p.y) < 1.02 && p.z < 1;
        if (seen && !onScreen && g.position.x < -19.8) { g.position.x = Math.min(-19.8, g.position.x + 2.3); pi = (pi + 1) % poses.length; }
        seen = onScreen;
        const ps = poses[pi];
        arms[0].sh.rotation.x = ps.l; arms[1].sh.rotation.x = ps.r;
        head.rotation.z = ps.tilt + Math.sin(t * .15) * .05; head.rotation.y = ps.turn + Math.sin(t * .11) * .05;
        for (const { fingers } of arms) fingers.forEach((c, f) => c.forEach((j, i) => { j.rotation.x = pulse(t + f * 1.3, 7 + f, .25) * .4 * (i + 1) / 3; }));
        panels.forEach((pn, i) => { pn.rotation.x = Math.sin(t * .7 + i) * .04 + (i === 0 ? -.03 : 0); pn.rotation.z = Math.sin(t * .5 + i * 1.3) * .02; });
        for (const m of mist) { const u = m.userData; m.position.set(u.x + Math.sin(t * .1 + u.ph) * .9, u.y, u.z + Math.cos(t * .07 + u.ph) * .5); m.scale.setScalar(3.5 + Math.sin(t * .2 + u.ph)); }
      };
    },
  },
  // ================================================================ THE NIGHT-GROWN
  nightgrown: {
    name: 'The Night-Grown', hour: 22,
    blurb: 'Otherworldly. Thin, stooped figures of dark glass with constellations drifting inside them, their small smooth heads split by one seam of light. They gather on the plain when stars fall, and reach upward, as if listening to the sky.',
    view: [[2.4, 2.1, 8.6], [5.2, 1.9, 15.6]],
    knight: { place: 'fire', action: 'stand', emote: 'question', note: 'watching the figures on the plain' },
    build(root) {
      const v = root.userData.appearance?.variant || {}, age = v.age || '', young = age === 'young', old = age === 'old';
      // the young: a bed of seedlings of glass, knee-high, growing where the stars came down; the grown:
      // five thin stooped figures; the old: three, tall and cracked and shining white, one arm raised.
      const r = A.rand(31), figs = [], n = young ? 9 : old ? 3 : 5;
      for (let i = 0; i < n; i++) {
        const x = young ? 3 + (i % 3) * 1.1 + (r() - .5) * .6 : 1.5 + i * (old ? 3 : 1.7) + (r() - .5) * .8, z = young ? 14.5 + Math.floor(i / 3) * 1.0 + (r() - .5) * .5 : 14 + r() * 3.2;
        const f = nightGrown(root, [x, gy(x, z), z], (young ? .5 : old ? 1.55 : .9) + r() * (young ? .15 : .3), age);
        f.g.rotation.y = Math.atan2(-x, -z) + (r() - .5) * .5;
        figs.push({ ...f, ph: r() * 9 });
      }
      const sheen = softLight('#8fa8ff', old ? 6 : 5, 12); sheen.position.set(5, gy(5, 15.5) + 4, 13.5); root.add(sheen);   // starlight on dark glass
      return (t) => figs.forEach(f => f.tick(t, f.ph));
    },
  },

  // ================================================================ THE STRANGER IN THE TREES
  stranger: {
    name: 'The stranger in the trees', hour: 18,
    blurb: 'Not of this world, and nobody knows what it wants. Tree-tall, it peers out from the forest edge. Most times it comes out in a disguise, never the same one twice, and it moves wrongly in each. Now and then it comes out without one, a smiling mask on a far too tall body, until something notices it. Then it realises, and goes back into the trees.',
    view: [[-24, 2.6, 10], [-35, 3.4, 8]],
    variants: [['', 'as it comes'], ['cape', 'hooded cape'], ['woodsman', 'woodsman'], ['bark', 'bark and branches'], ['traveller', 'traveller'], ['bare', 'no disguise']],
    knight: { place: 'courtyard', action: 'stand', emote: 'question', note: 'that tree was not there yesterday' },
    build(root) {
      const v = root.userData.appearance?.variant || {}, only = v.kind || '', k = v.size || 1;
      // a real tree at the forest edge to hide behind, with open ground between it and the keep
      const trees = []; let trunks = null;
      A.scene.traverse(o => { if (!trunks && o.isInstancedMesh && o.material === A.M.woodD) trunks = o; });
      if (trunks) { const m = new T.Matrix4(); for (let i = 0; i < trunks.count; i++) { trunks.getMatrixAt(i, m); const e = m.elements; trees.push([e[12], e[14], Math.hypot(e[0], e[1], e[2])]); } }
      let room = 1;   // how much room it wants round other trees (eased off if no tree has that much)
      const clearOf = (x0, z0, x1, z1, skip) => trees.every(([x, z, s], i) => { if (i === skip) return true; const dx = x1 - x0, dz = z1 - z0, u = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - x0 - dx * u, z - z0 - dz * u) > (.5 + s * .8) * room; });
      // its tree: on the keep side of a stand of trees, with open ground between it and the keep. It hides
      // behind the tree as seen from the keep, leans out round the trunk to watch the keep (and him), then
      // steps out round it and walks into the open toward the keep.
      const KP = [-6, 0];                                                 // the keep, which it watches
      const route = (x, z, side) => { const kl = Math.hypot(KP[0] - x, KP[1] - z), ux = (KP[0] - x) / kl, uz = (KP[1] - z) / kl, px = -uz * side, pz = ux * side;
        const at = (a, c) => [x + ux * a + px * c, z + uz * a + pz * c];
        return { HIDE: at(-1.2, 0), SIDE: at(.3, 1.5), OUT: at(8.5, 1.1), OUTB: at(6.6, 1.2), side, at, u: [ux, uz], p: [px, pz] }; };
      // the camera must see the whole walk with no tree crown in the way (crowns are wide: a generous margin)
      const sight = (cx, cz, px, pz, skip) => trees.every(([x, z, s], i) => { if (i === skip) return true; const dx = px - cx, dz = pz - cz, u = Math.max(0, Math.min(1, ((x - cx) * dx + (z - cz) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - cx - dx * u, z - cz - dz * u) > .4 + s * 1.05; });
      const behind = ([x, z]) => trees.reduce((n, [X, Z]) => n + (X < x + .5 && Math.hypot(X - x, Z - z) < 9 ? 1 : 0), 0);
      const cands = trees.map((t, i) => [t, i, behind(t)]).filter(([[x, z, s]]) => x < -32 && x > -75 && z > -25 && z < 30 && s > .8 && s < 1.5).sort((a, b) => b[2] - a[2]);
      let best = null;
      for (room of [1, .8, .6]) {
        for (const [[x, z], i] of cands) for (const side of [1, -1]) {
          const r = route(x, z, side);
          if (!clearOf(...r.HIDE, ...r.SIDE, i) || !clearOf(...r.SIDE, ...r.OUT, i)) continue;
          for (const [cd, cl] of [[11, 4], [9, 5], [13, 3.5], [8, 6], [15, 4]]) {   // (the preview's camera: toward the keep, off to the side it leans)
            const C = r.at(cd, cl);
            if (trees.every(([X, Z]) => Math.hypot(X - C[0], Z - C[1]) > 2.5) && [r.at(.1, .9), r.SIDE, r.at(4.5, 1.2), r.OUTB, r.OUT].every(q => sight(...C, ...q, i))) { r.CAM = C; best = [x, z, i, side, C]; break; }
          }
          if (best) break;
          if (best) break;
        }
        if (best) break;
      }
      const [tx, tz, pick, side, CAM] = best || [-36, 8, -1, 1, [-32, 19]];
      const RT = route(tx, tz, side), { HIDE, SIDE, OUT, OUTB } = RT, [ux, uz] = RT.u, [px, pz] = RT.p;
      const PEER = Math.atan2(ux, uz), LS = Math.sign(-px * Math.cos(PEER) + pz * Math.sin(PEER)) || 1;   // it faces the keep, and leans out round the trunk to the side
      const PK = RT.at(.2, .9);
      this.view = [[CAM[0], gy(...CAM) + 2.4, CAM[1]], [PK[0], gy(...PK) + 3.4, PK[1]]];

      // ---- the body. It is not made the way everything else here is made: smooth where the world is
      // faceted, untouched by the mist, lit faintly from a direction where there is no light (a matcap:
      // its light ignores the fire and the sky). Its disguises are borrowed from this world, so they are
      // made like this world; the body underneath is not.
      const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
      const matcap = (base, key, rim) => {
        const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S; const cx = cv.getContext('2d'), im = cx.createImageData(S, S);
        const B = rgb(base), K = rgb(key), Rm = rgb(rim), L = [-.55, .62, .56], ll = Math.hypot(...L);
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
          const nx = (x + .5) / S * 2 - 1, ny = 1 - (y + .5) / S * 2, r2 = Math.min(1, nx * nx + ny * ny), nzv = Math.sqrt(1 - r2), o = (y * S + x) * 4;
          const d = Math.max(0, (nx * L[0] + ny * L[1] + nzv * L[2]) / ll), rr = Math.sqrt(r2) || 1;
          const rim2 = Math.pow(1 - nzv, 2.4) * Math.max(0, (-nx * .75 + ny * .66) / rr * .5 + .5);   // a cold edge-light, always from the same side
          for (let c = 0; c < 3; c++) im.data[o + c] = Math.min(255, B[c] + (K[c] - B[c]) * d * .8 + Rm[c] * rim2);
          im.data[o + 3] = 255;
        }
        cx.putImageData(im, 0, 0); const tx_ = new T.CanvasTexture(cv); tx_.colorSpace = T.SRGBColorSpace; return tx_;
      };
      const skin = new T.MeshMatcapMaterial({ matcap: matcap('#111014', '#36343d', '#7b91b6'), fog: false });
      const handM = new T.MeshMatcapMaterial({ matcap: matcap('#18161b', '#46434e', '#8ea2c4'), fog: false });
      const sm = (parent, geo, mat, pos = [0, 0, 0], o = {}) => { const m = new T.Mesh(geo, mat); m.position.set(...pos); if (o.rot) m.rotation.set(...o.rot); if (o.scale) m.scale.set(...o.scale); m.castShadow = true; parent.add(m); return m; };
      const limb = (parent, a, b, r0, r1, mat, seg = 12) => {           // a smooth limb, with a rounded joint where it starts
        const from = V(...a), to = V(...b), d = to.clone().sub(from), len = d.length();
        const m = sm(parent, new T.CylinderGeometry(r1, r0, len, seg, 1), mat); m.position.copy(from).add(to).multiplyScalar(.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
        sm(parent, new T.SphereGeometry(r0, seg, Math.max(6, seg >> 1)), mat, a); return m;
      };
      // very tall and thin, arms that reach its knees, long fingers
      const g = G(root), LEG = 2.8 * k;
      const R = rig();
      const hips = R.add('pelvis', G(g, [0, LEG, 0]), 9);
      sm(hips, new T.SphereGeometry(.15 * k, 16, 12), skin, [0, .02 * k, 0], { scale: [1.15, .7, .7] });
      const spine = R.add('spine', G(hips), 6, .8);
      limb(spine, [0, 0, 0], [0, .8 * k, 0], .1 * k, .08 * k, skin);
      const chest = R.add('chest', G(spine, [0, .8 * k, 0]), 5.5, .8);
      const rib = sm(chest, new T.LatheGeometry([[.07, -.02], [.12, .12], [.18, .38], [.25, .62], [.29, .8], [.24, .9], [.1, .96]].map(([r, y]) => new T.Vector2(r * k, y * k)), 18), skin, [0, 0, 0], { scale: [1, 1, .5] });   // a narrow ribcage over a waist far too thin
      for (const sx of [-1, 1]) limb(chest, [0, .9 * k, 0], [sx * .37 * k, .8 * k, 0], .055 * k, .045 * k, skin);   // sloping shoulders
      const neck = R.add('neck', G(chest, [0, .85 * k, 0]), 5, .75);
      limb(neck, [0, 0, 0], [0, .42 * k, .04 * k], .05 * k, .04 * k, skin);
      const head = R.add('head', G(neck, [0, .44 * k, .05 * k]), 4.2, .62);
      sm(head, new T.SphereGeometry(.27 * k, 24, 18), skin, [0, .24 * k, 0], { scale: [.85, 1.18, .9] });
      const arm = sx => {
        const sd = sx < 0 ? 'L' : 'R';
        const sh = R.add('sh' + sd, G(chest, [sx * .36 * k, .8 * k, 0]), 6, .7);
        limb(sh, [0, 0, 0], [0, -1.2 * k, 0], .06 * k, .048 * k, skin);
        const el = R.add('el' + sd, G(sh, [0, -1.2 * k, 0]), 6, .6);
        limb(el, [0, 0, 0], [0, -1.25 * k, 0], .048 * k, .036 * k, skin);
        const wr = R.add('wr' + sd, G(el, [0, -1.25 * k, 0]), 6, .5);
        sm(wr, new T.SphereGeometry(.036 * k, 10, 8), handM);
        sm(wr, new T.SphereGeometry(.09 * k, 14, 10), handM, [0, -.1 * k, 0], { scale: [.75, 1.1, .3] });
        const fingers = [];
        for (let f = 0; f < 4; f++) {                                      // each finger on its own springs: they trail, and keep moving after the hand stops
          const f1 = R.add(`f${sd}${f}a`, G(wr, [(f - 1.5) * .035 * k, -.18 * k, 0]), 8 + f * .7, .35); limb(f1, [0, 0, 0], [(f - 1.5) * .01 * k, -.24 * k, 0], .014 * k, .011 * k, handM, 7);
          const f2 = R.add(`f${sd}${f}b`, G(f1, [(f - 1.5) * .01 * k, -.24 * k, 0]), 9 + f * .7, .35); limb(f2, [0, 0, 0], [0, -.22 * k, 0], .011 * k, .006 * k, handM, 7);
          fingers.push(f1, f2);
        }
        limb(wr, [-sx * .06 * k, -.06 * k, 0], [-sx * .12 * k, -.3 * k, .02 * k], .012 * k, .007 * k, handM, 7);   // thumb
        return { sh, el, wr, fingers, sd };
      };
      const legJ = sx => {
        const sd = sx < 0 ? 'L' : 'R';
        const hp = R.add('hp' + sd, G(hips, [sx * .13 * k, 0, 0]), 16);
        limb(hp, [0, 0, 0], [0, -1.45 * k, 0], .085 * k, .06 * k, skin);
        const kn = R.add('kn' + sd, G(hp, [0, -1.45 * k, 0]), 16);
        limb(kn, [0, 0, 0], [0, -1.33 * k, 0], .06 * k, .04 * k, skin);
        const an = R.add('an' + sd, G(kn, [0, -1.33 * k, 0]), 14, .9);
        sm(an, new T.SphereGeometry(.04 * k, 10, 8), handM);
        sm(an, new T.SphereGeometry(.1 * k, 14, 10), handM, [0, -.01 * k, .1 * k], { scale: [.45, .3, 1.7] });
        return { hp, kn, an };
      };
      const arms = { L: arm(-1), R: arm(1) }, legs = { L: legJ(-1), R: legJ(1) };

      // ---- the mask (only ever seen without a disguise): smooth and pale, a little too small for its
      // head, a thin carved smile far too wide, two hollow eyes with a cold pinprick far down in each
      const maskTex = canvasTex(256, 256, (c, w) => {
        const gr = c.createRadialGradient(w * .46, w * .36, 8, w / 2, w / 2, w * .56); gr.addColorStop(0, '#eeeae1'); gr.addColorStop(.7, '#d6cfc2'); gr.addColorStop(1, '#a89f90');
        c.fillStyle = gr; c.beginPath(); c.ellipse(w / 2, w * .5, w * .34, w * .48, 0, 0, 6.3); c.fill();   // longer than it is wide, and smaller than the face behind it
        c.strokeStyle = 'rgba(30,26,24,.95)'; c.lineWidth = 3.2; c.lineCap = 'round';                  // the smile: one thin line, almost flat, far too wide, curling up at the ends
        c.beginPath(); c.moveTo(w * .2, w * .67); c.bezierCurveTo(w * .38, w * .735, w * .62, w * .735, w * .8, w * .67); c.stroke();
        c.lineWidth = 2.4; c.beginPath(); c.moveTo(w * .2, w * .67); c.quadraticCurveTo(w * .175, w * .655, w * .185, w * .615); c.moveTo(w * .8, w * .67); c.quadraticCurveTo(w * .825, w * .655, w * .815, w * .615); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(w * .22, w * .685); c.bezierCurveTo(w * .38, w * .75, w * .62, w * .75, w * .78, w * .685); c.stroke();
        c.strokeStyle = 'rgba(90,80,70,.45)'; c.lineWidth = 1; c.beginPath(); c.moveTo(w * .62, w * .04); c.lineTo(w * .585, w * .17); c.lineTo(w * .61, w * .28); c.stroke();   // a hairline crack
        c.fillStyle = 'rgba(80,70,62,.18)'; for (const ex of [.37, .63]) { c.beginPath(); c.ellipse(w * ex, w * .41, w * .085, w * .05, 0, 0, 6.3); c.fill(); }   // faint hollows round the eyes
        c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000';                 // the eyes are holes: thin, calm crescents, curved up like closed smiling eyes
        for (const ex of [.37, .63]) { const x = w * ex, y = w * .42; c.beginPath(); c.moveTo(x - w * .075, y + w * .018); c.quadraticCurveTo(x, y - w * .085, x + w * .075, y + w * .018); c.quadraticCurveTo(x, y - w * .012, x - w * .075, y + w * .018); c.fill(); }
      });
      const mask = G(head, [0, .24 * k, 0]), PH0 = Math.PI / 2 - .7, PHL = 1.4, TH0 = Math.PI / 2 - .78, THL = 1.5, MR = .27 * k * 1.06;
      const maskMesh = new T.Mesh(new T.SphereGeometry(MR, 24, 16, PH0, PHL, TH0, THL), new T.MeshMatcapMaterial({ matcap: matcap('#a29b90', '#f6f2ea', '#c4d4ee'), map: maskTex, alphaTest: .5, side: T.DoubleSide, fog: false }));
      maskMesh.scale.set(.85, 1.18, .9); mask.add(maskMesh);
      for (const ex of [.37, .63]) {                                                         // the pinpricks, deep in the holes
        const ph = PH0 + ex * PHL, th = TH0 + .4 * THL, r = MR * .92;
        P(mask, A.ico(.008 * k, 0), glow('#e8f0ff', 2.4, { fog: false }), [-Math.cos(ph) * Math.sin(th) * r * .85, Math.cos(th) * r * 1.18, Math.sin(ph) * Math.sin(th) * r * .9], { cast: false });
      }

      // ---- its disguises: always different, each a try at passing for something that belongs here
      const D = {};
      const cloth = (c, r = .9) => ds(c, 0, r);
      const hood = (parent, m, sz, peak) => {
        const pts = [[0, .5], [.13, .47], [.25, .36], [.33, .16], [.36, -.06], [.4, -.28], [.52, -.46], [.62, -.56]].map(([r, y]) => new T.Vector2(r * sz, y * sz));
        const h = new T.Mesh(A.facet(new T.LatheGeometry(pts, 14, .75, Math.PI * 2 - 1.5), .012 * sz, 21), m); h.castShadow = true; parent.add(h);
        if (peak) P(parent, new T.ConeGeometry(.11 * sz, .42 * sz, 6), m, [0, .42 * sz, -.2 * sz], { rot: [-1.0, 0, 0] });
        const dark = new T.Mesh(new T.SphereGeometry(.3 * sz, 12, 10), new T.MeshBasicMaterial({ color: '#000000' })); dark.scale.set(.85, 1.1, .75); dark.position.z = .02 * sz; parent.add(dark);   // no face in there: only dark
        return h;
      };
      { // a long hooded cape, face lost in the hood
        const d = D.cape = { parts: [] }, m = cloth('#1d1b18');
        const cl = G(chest, [0, .82 * k, 0]); d.cloak = cl;
        P(cl, A.facet(new T.CylinderGeometry(.34 * k, 1.0 * k, 3.95 * k, 12, 3, true), .05 * k, 11), m, [0, -1.95 * k, -.04 * k]);
        const hd = G(head, [0, .24 * k, -.02 * k]);
        hood(hd, m, 1.0 * k, true);
        d.parts.push(cl, hd);
      }
      { // a woodsman: a long coat, a wide hat, a scarf to the eyes, a bundle of sticks on its back
        const d = D.woodsman = { parts: [] }, coat = cloth('#4b3b29'), hatM = A.mat('#2a221a', 0, .9), scarf = cloth('#6b3a2e');
        const co = G(chest, [0, .8 * k, 0]); d.cloak = co;
        P(co, A.facet(new T.CylinderGeometry(.33 * k, .6 * k, 2.7 * k, 10, 2, true), .04 * k, 12), coat, [0, -1.35 * k, 0]);
        const hat = G(head, [0, .44 * k, 0]);
        P(hat, A.cyl(.7 * k, .7 * k, .04 * k, 14), hatM, [0, 0, 0], { rot: [-.08, 0, 0] });
        P(hat, A.cyl(.24 * k, .28 * k, .36 * k, 10), hatM, [0, .16 * k, 0]);
        const sc = P(head, new T.CylinderGeometry(.28 * k, .3 * k, .34 * k, 12, 1, true), scarf, [0, .1 * k, .01 * k], { scale: [1, 1, 1.05] });
        const bundle = G(chest, [0, .2 * k, -.22 * k], [.15, 0, .25]);
        for (let i = 0; i < 7; i++) bone(bundle, [(i - 3) * .045 * k, 0, (i % 2) * .04 * k], [(i - 3) * .05 * k, 1.5 * k, (i % 2) * .05 * k], .03 * k, .025 * k, A.M.woodD);
        P(bundle, A.cyl(.2 * k, .2 * k, .06 * k, 10), A.mat('#7a6a48', 0, .9), [0, .9 * k, .02 * k], { scale: [1, 1, .45] });
        d.parts.push(co, hat, bundle, sc);
      }
      { // bark and branches: wrapped in strips of bark, arms held up as boughs, a crown of leaves like the trees
        const d = D.bark = { parts: [] }, bk = A.mat('#3b2e22', 0, .95), bk2 = A.mat('#56432f', 0, .95);
        const leaf = new T.MeshStandardMaterial({ color: new T.Color().setHSL(.29, .36, .19), roughness: .95, flatShading: true });
        for (const [par, y0, y1, r] of [[spine, 0, .8, .14], [chest, .05, .85, .24]]) {
          const w = G(par); d.parts.push(w);
          for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; P(w, A.box(.07 * k, (y1 - y0) * k * (.8 + nz(i) * .3), .025 * k), i % 2 ? bk : bk2, [Math.cos(a) * r * k, (y0 + y1) / 2 * k, Math.sin(a) * r * k * .7], { rot: [0, -a + Math.PI / 2, (nz(i + 3) - .5) * .3] }); }
        }
        for (const sx of ['L', 'R']) {
          for (const [j, len] of [[arms[sx].sh, 1.2], [arms[sx].el, 1.25]]) {
            const w = G(j); d.parts.push(w);
            for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28; P(w, A.box(.05 * k, len * .9 * k, .022 * k), i % 2 ? bk : bk2, [Math.cos(a) * .065 * k, -len / 2 * k, Math.sin(a) * .065 * k], { rot: [0, -a, 0] }); }
          }
          const tw = G(arms[sx].el, [0, -.7 * k, 0]); d.parts.push(tw);                     // twigs off the forearms, with leaves
          for (let i = 0; i < 3; i++) { const a = i * 2.1 + (sx === 'L' ? 0 : 1); const e = [Math.cos(a) * .45 * k, -(.1 + i * .25) * k, Math.sin(a) * .45 * k]; bone(tw, [0, -i * .25 * k, 0], e, .025 * k, .01 * k, bk); P(tw, A.ico(.17 * k, 0), leaf, e, { scale: [1, .7, 1] }); }
          for (const lg of [legs[sx].hp, legs[sx].kn]) { const w = G(lg); d.parts.push(w); for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28 + .4; P(w, A.box(.06 * k, 1.25 * k, .025 * k), i % 2 ? bk : bk2, [Math.cos(a) * .08 * k, -.68 * k, Math.sin(a) * .08 * k], { rot: [0, -a, 0] }); } }
        }
        const crown = G(head, [0, .14 * k, 0]); d.parts.push(crown);
        P(crown, A.ico(.32 * k, 1), bk, [0, .1 * k, 0], { scale: [.9, 1.2, .95] });
        P(crown, A.facet(new T.ConeGeometry(.85 * k, 2.1 * k, 6), .06 * k, 13), leaf, [0, 1.25 * k, 0]);
        P(crown, A.facet(new T.ConeGeometry(.6 * k, 1.5 * k, 6), .05 * k, 14), leaf, [0, 2.05 * k, 0]);
      }
      { // a traveller: a patched cloak, a deep cowl and a wrapped face, a pack, a long staff
        const d = D.traveller = { parts: [] };
        const patch = canvasTex(128, 128, (c, w) => { c.fillStyle = '#5b4a39'; c.fillRect(0, 0, w, w); const r = A.rand(5);
          for (let i = 0; i < 9; i++) { c.fillStyle = ['#6e5a42', '#4a3c2e', '#735040', '#556048'][i % 4]; const x = r() * w, y = r() * w, s = 14 + r() * 22; c.fillRect(x, y, s, s * .8); c.strokeStyle = '#2a2018'; c.setLineDash([3, 3]); c.strokeRect(x, y, s, s * .8); } });
        const m = new T.MeshStandardMaterial({ map: patch, roughness: .95, side: T.DoubleSide, flatShading: true }), wrap = cloth('#8a7a62');
        const cl = G(chest, [0, .8 * k, 0]); d.cloak = cl;
        P(cl, A.facet(new T.CylinderGeometry(.36 * k, .8 * k, 3.4 * k, 11, 2, true), .05 * k, 15), m, [0, -1.7 * k, 0]);
        const cw = G(head, [0, .26 * k, -.03 * k]);
        hood(cw, m, .92 * k, false);
        P(cw, new T.CylinderGeometry(.26 * k, .27 * k, .18 * k, 12, 1, true), wrap, [0, -.2 * k, .03 * k]);
        const pack = G(chest, [0, .35 * k, -.3 * k]);
        P(pack, A.box(.5 * k, .65 * k, .28 * k), A.mat('#4a3826', 0, .9), [0, 0, 0]);
        P(pack, A.cyl(.1 * k, .1 * k, .62 * k, 8), A.mat('#6a5a3e', 0, .9), [0, .4 * k, 0], { rot: [0, 0, Math.PI / 2] });
        const staff = G(arms.R.wr, [0, -.2 * k, .05 * k]);
        bone(staff, [0, 1.0 * k, 0], [0, -2.2 * k, 0], .035 * k, .03 * k, A.M.woodD);
        d.parts.push(cl, cw, pack, staff);
      }
      const show = kind => { for (const [n, d] of Object.entries(D)) for (const q of d.parts) q.visible = n === kind; mask.visible = kind === 'bare'; };

      // ---- the birds out in the grass: they don't mind a disguise, but they know what it is without one
      const birdM = A.mat('#2a2522', 0, .8), birds = [];
      for (let i = 0; i < 9; i++) {
        const b = G(root), body = G(b);
        P(body, A.ico(.06, 0), birdM, [0, .06, 0], { scale: [.9, .8, 1.6], cast: false });
        const wings = [-1, 1].map(sx => { const w = G(body, [sx * .04, .08, 0]); P(w, A.box(.16, .006, .08), birdM, [sx * .08, 0, 0], { cast: false }); return w; });
        const a1 = 1.2 + nz(i) * 2.6, a2 = (nz(i + 9) - .5) * 2.4, at = [OUTB[0] + ux * a1 + px * a2, OUTB[1] + uz * a1 + pz * a2];
        birds.push({ b, body, wings, at, ph: nz(i + 20) * 6, dir: nz(i + 30) * 1.2 - .6 });
      }

      // ---- the timeline: each visit plays out over a minute or so
      const C = 44, SEQ = ['cape', 'woodsman', 'bare', 'bark', 'traveller', 'bare'];
      const path = (pts, u) => { const L = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(l); tot += l; }
        let d = Math.max(0, Math.min(1, u)) * tot; for (let i = 0; i < L.length; i++) { if (d <= L[i] || i === L.length - 1) { const f = Math.min(1, d / L[i]); return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f, Math.atan2(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]), tot]; } d -= L[i]; } };
      let yaw = PEER, lastKind = '', walked = 0, lastPos = null, breath = 0, scanAt = 0, scanN = 0, scanFrom = [0, 0, 0], scanTo = [0, 0, 0], scanT = -9;
      const sides = ['L', 'R'], J = R.J;
      // smooth noise (-1..1), so that nothing it does ever quite repeats; the world around it loops, it does not
      const vn = (sd, x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return (nz(sd * 57.3 + i) * (1 - u) + nz(sd * 57.3 + i + 1) * u) * 2 - 1; };
      const fb = (sd, x) => vn(sd, x) * .65 + vn(sd + 13, x * 2.3) * .35;
      const bump = (x, a, b) => x > a && x < b ? Math.sin((x - a) / (b - a) * Math.PI) : 0;   // a brief swell between a and b
      const add = (name, x = 0, y = 0, z = 0) => { const w = J[name].want; w[0] += x; w[1] += y; w[2] += z; };
      const scan = (t, amp, sd) => {                          // where it looks: it holds, then turns, with a small turn the other way first
        if (t > scanAt || t < scanT) { scanFrom = scanTo.slice(); const q = scanN * 3 + sd; scanTo = [(nz(q + 1) - .5) * .35 * amp, (nz(q + 2) - .5) * 1.7 * amp, nz(q + 3) < .4 ? (nz(q + 7) - .5) * 1.1 * amp : 0]; scanT = t; scanAt = t + 1.1 + nz(q + 4) * 2.8; scanN++; }
        R.want('head', ...(t - scanT < .28 ? scanFrom.map((v, i) => v - (scanTo[i] - v) * .18) : scanTo));
      };
      const rest = (t, hold) => {                             // standing: its weight settles on one leg, then drifts to the other; never quite still
        const wl = fb(5, t * .09) * (hold ? .2 : 1);
        R.want('pelvis', 0, fb(6, t * .07) * .05, wl * .06); hips.position.x = wl * .07 * k;
        R.want('spine', .02 + fb(8, t * .11) * .025, 0, -wl * .08); R.want('chest', 0, fb(9, t * .08) * .07, -wl * .02);
        for (const sx of sides) {
          const sg = sx === 'L' ? -1 : 1, free = Math.max(0, sg * wl);
          R.want('hp' + sx, -free * .14, 0, -wl * .06); R.want('kn' + sx, free * .38); R.want('an' + sx);
          R.want('sh' + sx, .04 + fb(20 + sg, t * .13) * .05, 0, sg * .07 + fb(22 + sg, t * .1) * .03); R.want('el' + sx, -.14 + fb(24 + sg, t * .15) * .07); R.want('wr' + sx, .05 + fb(26 + sg, t * .2) * .1);
        }
        R.want('neck', fb(30, t * .06) * .05); R.want('head', fb(31, t * .05) * .04, fb(32, t * .04) * .12, fb(33, t * .06) * .05);
      };
      const gait = (kind, ph, fast) => {                        // each disguise walks wrongly in its own way; under all of them, real weight
        const s = Math.sin(ph), c = Math.cos(ph), vv = 1 + .12 * fb(50, ph * .3);   // no two strides alike
        R.want('pelvis', 0, s * .1, c * .035); hips.position.x = c * .05 * k;     // the hips twist and sway over each step
        R.want('chest', J.chest.want[0], -s * .13, 0); add('head', 0, s * .04, 0);   // the shoulders twist against them; the head stays level
        if (kind === 'cape') {                                  // a glide: hardly any stride under the cape
          R.want('hpL', -s * .14); R.want('hpR', s * .14); R.want('knL', Math.max(0, c) * .2); R.want('knR', Math.max(0, -c) * .2);
        } else if (kind === 'woodsman') {                       // a man's walk, learnt from far off: knees far too high, arms swinging with the same leg
          R.want('hpL', -s * .62 * vv); R.want('hpR', s * .62 * vv); R.want('knL', Math.max(0, c) * 1.3 * vv); R.want('knR', Math.max(0, -c) * 1.3 * vv);
          R.want('shL', -s * .5, 0, -.07); R.want('shR', s * .5, 0, .07);
          R.want('neck', .15 + Math.max(0, Math.sin(ph * 2)) * .35);   // and its head bobs like the birds'
        } else if (kind === 'traveller') {                      // a limp it copied, which changes legs halfway along
          const stiff = walked % 9 < 4.5 ? 'L' : 'R', loose = stiff === 'L' ? 'R' : 'L', sg = stiff === 'L' ? 1 : -1;
          R.want('hp' + stiff, -s * sg * .3); R.want('kn' + stiff, 0); R.want('hp' + loose, s * sg * .5 * vv); R.want('kn' + loose, Math.max(0, -c * sg) * .9 * vv);
          add('spine', 0, 0, sg * Math.max(0, s * sg) * .12);
        } else {                                                // its own walk: long, smooth, unhurried strides (or a run)
          const a = (fast ? .75 : .45) * vv; R.want('hpL', -s * a); R.want('hpR', s * a); R.want('knL', Math.max(0, c) * (fast ? 1.3 : .8) * vv); R.want('knR', Math.max(0, -c) * (fast ? 1.3 : .8) * vv);
          R.want('shL', s * a * .8, 0, -.07); R.want('shR', -s * a * .8, 0, .07); R.want('elL', -.15 - Math.max(0, -s) * .3); R.want('elR', -.15 - Math.max(0, s) * .3);
          if (fast) { add('spine', .35); add('chest', .2); }
        }
        for (const sx of sides) { const sg = sx === 'L' ? -1 : 1; R.want('an' + sx, -(J['hp' + sx].want[0] + J['kn' + sx].want[0]) * .8 + Math.max(0, sg * s) * .25); }   // heel down, toe off
      };
      // At the real keep a visit lasts half an hour or more, so it does not replay the preview's minute:
      // most of the time it stays behind its tree and now and then leans out to look; only some
      // minutes does it come out (without a disguise, more seldom: it knows it was seen). Each viewer
      // joins at a different moment of its visit. In the preview it plays its minute, over and over.
      const live = !!root.userData.appearance?.id, LC = 150, t0 = live ? Math.random() * LC : 0, seed = nz(k * 97 + (v.hue || 0) * 1e3) * 50;
      const clockAt = t => {
        if (!live) { const n = Math.floor(t / C); return [n, t - n * C]; }
        const n = Math.floor((t + t0) / LC), lt = t + t0 - n * LC, out = n === 0 ? nz(seed) < .8 : nz(n * 3.3 + seed) < (only === 'bare' ? .3 : .55);
        if (lt < C) return [n, out || lt < 10.8 ? lt : C];               // comes out, or only leans out to look and draws back
        if (lt > 85 && lt < 85 + 10.8) return [n, lt - 85];               // another look, later on
        return [n, C];                                                    // behind its tree
      };
      const camW = V();
      return (t, dt = 1 / 60) => {
        const [n, kt] = clockAt(t), kind = only || SEQ[n % SEQ.length], bare = kind === 'bare';
        if (kind !== lastKind) { show(kind); lastKind = kind; }
        const holding = bare && kt > 18.2 && kt < 21.9;               // when it is noticed, it holds its breath
        root.userData.kt = kt;                                        // (for testing: where it is in its visit)
        rest(t, holding);
        let x = HIDE[0], z = HIDE[1], face = PEER, moving = 0, fast = false, lean = -.12, drop = 0;
        const peer = smooth(1.5, 3.5, kt) * (1 - smooth(10, 11.5, kt));
        // peering: lean out from behind the tree and look about; a hand on the boughs
        if (kt < 11.5) {
          lean = -.12 + peer * .75;
          if (peer > .02) scan(t, peer, n * 31);
          if (peer > .5 && pulse(t + n * 7, 11, 2.6) > .3) {               // now and then it looks straight at him, and holds
            A.K.J.hips.getWorldPosition(camW); const rel = Math.atan2(Math.sin(Math.atan2(camW.x - g.position.x, camW.z - g.position.z) - yaw), Math.cos(Math.atan2(camW.x - g.position.x, camW.z - g.position.z) - yaw));
            R.want('head', .08, Math.max(-1, Math.min(1, rel)) * .9, 0);
          }
          const lh = LS > 0 ? 'L' : 'R'; R.want('sh' + lh, -1.15 * peer, 0, -LS * .35 * peer); R.want('el' + lh, -.6 * peer); R.want('wr' + lh, -.2 * peer);
        }
        // before it steps out, it gathers itself: a small dip, a lean back
        const gather = bump(kt, 10.9, 11.75); drop += gather * .12 * k; for (const sx of sides) add('kn' + sx, gather * .3); add('spine', -gather * .1);
        const out = bare ? OUTB : OUT, back = [out, SIDE, HIDE];
        if (kt >= 11.5 && kt < 13.5) { const u = smooth(11.5, 13.5, kt); x = HIDE[0] + (SIDE[0] - HIDE[0]) * u; z = HIDE[1] + (SIDE[1] - HIDE[1]) * u; face = PEER; moving = 1; }   // stepping out from behind it
        if (kt >= 13.5) { x = SIDE[0]; z = SIDE[1]; face = PEER; }
        if (!bare) {
          if (kt >= 13.5 && kt < 23) {
            let u = (kt - 13.5) / 9.5;
            if (kind === 'cape') u += Math.sin(u * 6.28 * 3.5) / (6.28 * 3.5);                  // the cape: stops dead now and then, then glides on
            if (kind === 'bark') u = (Math.floor(u * 5) + smooth(.55, 1, (u * 5) % 1)) / 5;      // the bark: still as a tree, then a few lurching steps
            const [px, pz, a] = path([SIDE, out], u); x = px; z = pz; face = a; moving = kind === 'bark' ? ((u * 5) % 1 > .5 ? 1 : 0) : 1;
          } else if (kt >= 23 && kt < 28.5) {                                                    // stands and looks at the keep
            x = out[0]; z = out[1]; face = PEER; scan(t, .4, 200 + n * 17);
          } else if (kt >= 28.5 && kt < 38.5) {
            const u = (kt - 28.5) / 10; const [px, pz, a] = path(back, u); x = px; z = pz; face = a; moving = 1;
          } else if (kt >= 38.5) { x = HIDE[0]; z = HIDE[1]; }
          if (kind === 'bark' && kt > 11.5 && kt < 38.5) for (const sx of sides) { const sg = sx === 'L' ? -1 : 1; R.want('sh' + sx, -2.3, 0, sg * .5); R.want('el' + sx, -.35, 0, sg * .2); }   // boughs, held up
        } else {
          if (kt >= 13.5 && kt < 18.2) { const [px, pz, a] = path([SIDE, out], (kt - 13.5) / 4.7); x = px; z = pz; face = a; moving = 1; }
          else if (kt >= 18.2 && kt < 21.9) {
            x = out[0]; z = out[1]; face = PEER + .15;
            // noticed: it freezes mid-step, turns its head slowly to the birds, then lifts a hand to its own face
            R.want('head', .1, -.55, .25);
            const pre = bump(kt, 19.2, 19.65), lift = smooth(19.6, 20.6, kt);   // (the arm draws back a little before it rises)
            R.want('shR', -1.75 * lift + pre * .35, 0, -.3 * lift); R.want('elR', -2.55 * lift, 0, 0); R.want('wrR', -.5 * lift);
            if (lift > .5) R.want('head', .45, -.1, -.15);
            // and then it looks straight at whoever is watching, a long moment, before it goes
            A.camera.getWorldPosition(camW);                                                   // (whoever is watching: wherever the camera is)
            const look = smooth(20.7, 21.2, kt), toCam = Math.atan2(Math.sin(Math.atan2(camW.x - x, camW.z - z) - yaw), Math.cos(Math.atan2(camW.x - x, camW.z - z) - yaw));
            if (look > 0) { R.want('head', .12, toCam * .8, .2 * look); R.want('neck', 0, toCam * .2, 0); R.rate('head', 3.4); } else R.rate('head', 4.2);
            R.want('hpL', -.25); R.want('hpR', .25); R.want('knR', .4);                         // caught mid-step
          } else if (kt >= 21.9 && kt < 24.6) { const [px, pz, a] = path(back, smooth(22.1, 24.6, kt) * .4 + (kt - 21.9) / 2.7 * .6); x = px; z = pz; face = a; moving = 1; fast = true; R.rate('head', 4.2); }
          else if (kt >= 24.6) { x = HIDE[0]; z = HIDE[1]; }
          // before it runs, all its length folds down into a crouch; then it goes
          const crouch = bump(kt, 21.3, 22.2); drop += crouch * .4 * k; for (const sx of sides) { add('kn' + sx, crouch * 1.0); add('hp' + sx, -crouch * .5); } add('spine', crouch * .45); add('neck', crouch * .2);
        }
        // ground under it, how far it has walked (its stride follows the ground it covers), which way it faces
        const step = lastPos ? Math.hypot(x - lastPos[0], z - lastPos[1]) : 0; lastPos = [x, z]; if (step < 1) walked += step;
        if (moving) gait(kind, walked * Math.PI / (fast ? 2.4 : 1.7) * (kind === 'woodsman' ? .75 : 1), fast);
        else for (const sx of sides) R.want('an' + sx, -(J['hp' + sx].want[0] + J['kn' + sx].want[0]));   // standing: feet flat on the ground
        R.rate('hpL', moving ? 16 : 7); R.rate('hpR', moving ? 16 : 7);
        let dy = face - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); yaw += dy * (1 - Math.exp(-dt * (fast ? 7 : 2.5)));
        g.position.set(x, gy(x, z), z); g.rotation.y = yaw;
        // leaning out sideways from behind the tree (toward the open side), bending at the waist
        add('spine', 0, 0, LS * lean * .5); add('chest', 0, 0, LS * lean * .45);
        // breathing: slow and uneven, the ribs filling, the shoulders lifting; it stops when it is noticed
        if (!holding) breath += dt * 6.283 * (.19 + .05 * fb(40, t * .05));
        const b = (Math.sin(breath) + 1) / 2;
        rib.scale.set(1 + b * .035, 1 + b * .015, .5 * (1 + b * .09)); add('chest', -b * .03); for (const sx of sides) add('sh' + sx, 0, 0, (sx === 'L' ? 1 : -1) * b * .02);
        hips.position.y = LEG - drop - (moving ? Math.abs(Math.sin(walked * Math.PI / 1.7)) * (kind === 'cape' ? 0 : .06 * k) + (fast ? .25 * k : 0) : 0);
        // the fingers: each feeling the air on its own, trailing when the arm moves and swinging on after it stops; gripping when a hand is raised
        for (const sx of sides) {
          const pv = J['sh' + sx].vel[0] + J['el' + sx].vel[0] + J['wr' + sx].vel[0], grip = J['sh' + sx].cur[0] < -.8 ? .5 : 0;
          for (let f = 0; f < 4; f++) {
            const curl = .22 + .18 * fb(60 + f + (sx === 'L' ? 0 : 9), t * .25);
            R.want(`f${sx}${f}a`, -curl - grip + pv * .06); R.want(`f${sx}${f}b`, -curl * 1.2 - grip + pv * .08);
          }
        }
        if (D[kind]?.cloak) { const c = D[kind].cloak; c.rotation.set(-(J.spine.cur[0] + J.chest.cur[0]) + (moving ? .08 : 0), 0, -(J.pelvis.cur[2] + J.spine.cur[2] + J.chest.cur[2]) * .85); }   // the cloth hangs straight, trailing a little
        R.step(dt);
        // the birds: pecking in the grass, until something wrong walks out among them
        const flee = bare && kt > 18.2 ? kt - 18.2 : -1;
        for (const [i, b] of birds.entries()) {
          const f = flee - i * .07;
          if (f > 0) {
            const up = f * 3.2, away = f * 5;
            b.b.position.set(b.at[0] + away * .8, gy(b.at[0], b.at[1]) + up + f * f * .3, b.at[1] + away * b.dir); b.b.rotation.y = Math.atan2(.8, b.dir);
            b.wings.forEach((w, s) => { w.rotation.z = (s ? -1 : 1) * Math.sin(t * 28 + i) * .9; }); b.body.rotation.x = -.4; b.b.visible = f < 7;
          } else {
            b.b.visible = true; b.b.position.set(b.at[0], gy(b.at[0], b.at[1]), b.at[1]); b.b.rotation.y = b.ph + Math.floor((t + b.ph) / 3) * 1.3;
            b.body.rotation.x = Math.max(0, Math.sin((t + b.ph) * 5)) ** 4 * .7; b.wings.forEach(w => { w.rotation.z = 0; });
          }
        }
      };
    },
  },

  // ================================================================ THE CLOCK-HEADED FIGURE
  clockhead: {
    name: 'The Five Hours', hour: 22,
    blurb: 'Otherworldly. Very tall and thin, in a long coat with a high collar, and one head at a time: a clock, an hourglass, a metronome, a galaxy turning under glass, or a gilded smiling mask. A head sinks into the collar and another rises when its mood changes. The clock watches, patient, and walks slowly. The metronome walks in step with its own ticking. The hourglass paces, restless, until its sand runs out. The galaxy stands looking up at the sky, far away, and the fire flickers. Nobody can read the mask: it stands and watches whoever is watching it. Some are seen with only one head.',
    view: [[-6.6, 1.8, 4.6], [-12.2, 2.2, .8]],
    variants: [['', 'five heads'], ['clock', 'only a clock'], ['hourglass', 'only an hourglass'], ['metronome', 'only a metronome'], ['galaxy', 'only a galaxy'], ['mask', 'only a mask']],
    knight: { place: 'repair:doorway', action: 'stand', emote: 'question', note: 'not sure what time it is any more' },
    build(root) {
      const v = root.userData.appearance?.variant || {}, only = v.kind || '', ZW = .1;   // it walks the aisle between the building plots
      const coat = ds(only ? '#1d1a17' : '#17151a', 0, .9), skin = A.mat('#2a2622', 0, .7), brass = A.mat('#9a7a3a', .8, .35), dark = A.mat('#120e0a');
      const g = G(root, [-12, 0, ZW], [0, Math.PI / 2, 0]), body = G(g); g.scale.setScalar((v.size || 1) * (only ? .82 : 1));
      const legs = [-1, 1].map(sx => { const l = G(body, [sx * .12, 1.35, 0]); bone(l, [0, 0, 0], [0, -1.35, .02], .05, .04, skin); return l; });
      const coatM = new T.Mesh(A.facet(new T.CylinderGeometry(.2, .44, 1.7, 9, 2, true), .05, 4), coat); coatM.position.y = 1.55; coatM.castShadow = true; body.add(coatM);
      P(body, A.cyl(.24, .2, .8, 8), coat, [0, 2.6, 0], { scale: [1, 1, .7] });
      const arms = [-1, 1].map(sx => { const a = G(body, [sx * .27, 2.9, 0]); bone(a, [0, 0, 0], [sx * .08, -.75, .05], .04, .035, skin); bone(a, [sx * .08, -.75, .05], [sx * .05, -1.5, .1], .035, .03, skin); return a; });
      // the high collar the heads sink into and rise from
      const collar = G(body, [0, 3.0, 0]);
      P(collar, new T.CylinderGeometry(.27, .2, .5, 12, 1, true), coat, [0, .22, 0], { jitter: .01 });
      P(collar, A.cyl(.12, .12, .1, 8), dark, [0, .15, 0], { cast: false });
      const neck = G(collar, [0, .5, 0]);                       // where the head sits; it sinks down into the collar
      const heads = {};
      const make = {
        clock(h) {   // an old clock face, brass-rimmed; the hands keep proper time while it is patient
          const face = canvasTex(256, 256, (c, w) => {
            c.fillStyle = '#e6dcc2'; c.beginPath(); c.arc(w / 2, w / 2, w / 2, 0, 6.3); c.fill(); c.strokeStyle = '#3a2f22'; c.fillStyle = '#3a2f22';
            for (let k = 0; k < 60; k++) { const a = k / 60 * 6.283, big = k % 5 === 0, r0 = w / 2 - 10, r1 = r0 - (big ? 22 : 9); c.lineWidth = big ? 5 : 2; c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * r0, w / 2 + Math.sin(a) * r0); c.lineTo(w / 2 + Math.cos(a) * r1, w / 2 + Math.sin(a) * r1); c.stroke(); }
            c.globalAlpha = .25; c.beginPath(); c.arc(w * .62, w * .35, 40, 0, 6.3); c.fill();
          });
          const f = G(h, [0, .4, 0]);
          P(f, A.cyl(.42, .42, .1, 24), brass, [0, 0, 0], { rot: [Math.PI / 2, 0, 0], jitter: 0 });
          P(f, new T.CircleGeometry(.38, 32), new T.MeshStandardMaterial({ map: face, roughness: .6, emissive: '#3a3020', emissiveIntensity: .35 }), [0, 0, .051], { jitter: 0, cast: false });
          const hour = G(f, [0, 0, .06]), minute = G(f, [0, 0, .065]);
          P(hour, A.box(.03, .2, .012), dark, [0, .09, 0], { jitter: 0, cast: false }); P(minute, A.box(.02, .3, .012), dark, [0, .14, 0], { jitter: 0, cast: false });
          P(f, A.ico(.03, 0), brass, [0, 0, .075], { jitter: 0, cast: false });
          return { hour, minute };
        },
        hourglass(h) {   // glass and brass; the sand runs while it is restless, and it flips when the mood comes
          const f = G(h, [0, .36, 0]), turn = G(f);
          const glass = new T.MeshStandardMaterial({ color: '#cfe4ef', transparent: true, opacity: .28, roughness: .08, metalness: .1, depthWrite: false, side: T.DoubleSide });
          const prof = [[.02, -.27], [.15, -.23], [.17, -.13], [.1, -.04], [.022, 0], [.1, .04], [.17, .13], [.15, .23], [.02, .27]].map(([x, y]) => new T.Vector2(x, y));
          const gm = new T.Mesh(new T.LatheGeometry(prof, 16), glass); turn.add(gm);
          for (const y of [-.3, .3]) P(turn, A.cyl(.21, .21, .04, 12), brass, [0, y, 0]);
          for (let k = 0; k < 3; k++) { const a = k / 3 * 6.28; bone(turn, [Math.cos(a) * .19, -.3, Math.sin(a) * .19], [Math.cos(a) * .19, .3, Math.sin(a) * .19], .014, .014, brass, 5); }
          const sandM = A.mat('#d9b46a', 0, .9);
          const top = G(turn, [0, .025, 0]), bot = G(turn, [0, -.25, 0]);
          P(top, new T.ConeGeometry(.15, .2, 14), sandM, [0, .1, 0], { rot: [Math.PI, 0, 0], jitter: 0, cast: false });
          P(bot, new T.ConeGeometry(.15, .16, 14), sandM, [0, .08, 0], { jitter: 0, cast: false });
          const stream = P(turn, A.cyl(.006, .006, .24, 4), sandM, [0, -.12, 0], { jitter: 0, cast: false });
          return { turn, top, bot, stream };
        },
        metronome(h) {   // a dark wooden pyramid, its arm swinging; it keeps time with whatever it watches
          const f = G(h, [0, .32, 0]), wood = A.mat('#4a2e1c', 0, .6);
          P(f, new T.CylinderGeometry(.08, .24, .62, 4), wood, [0, 0, 0], { rot: [0, Math.PI / 4, 0], jitter: 0 });
          P(f, A.box(.11, .46, .01), A.mat('#d8c9a2', 0, .7), [0, .02, .125], { rot: [-.2, 0, 0], jitter: 0, cast: false });
          const arm = G(f, [0, -.2, .15]);
          P(arm, A.box(.014, .5, .012), brass, [0, .25, 0], { jitter: 0, cast: false });
          P(arm, A.box(.07, .06, .03), brass, [0, .33, 0], { jitter: 0 });
          return { arm };
        },
        galaxy(h) {   // a glass globe with a galaxy slowly turning inside it
          const f = G(h, [0, .36, 0]);
          P(f, new T.SphereGeometry(.3, 20, 14), new T.MeshStandardMaterial({ color: '#0a0c1a', transparent: true, opacity: .55, roughness: .05, metalness: .2, depthWrite: false }), [0, 0, 0], { jitter: 0, cast: false });
          const N = 1400, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), r = A.rand(41), cc = new T.Color();
          for (let i = 0; i < N; i++) {
            const u = Math.sqrt(r()), arm = i % 3, rad = .01 + u * .26, a = arm * 2.094 + u * 4.6 + (r() - .5) * .7 * (1 - u * .4);
            pos.set([Math.cos(a) * rad, (r() - .5) * .05 * (1 - u), Math.sin(a) * rad], i * 3);
            cc.setHSL(.62 + u * .2 - (u < .15 ? .55 : 0), .7, .85 - u * .35); col.set([cc.r, cc.g, cc.b], i * 3);
          }
          const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3));
          const disc = G(f, [0, 0, 0], [1.25, 0, .3]);                       // turned to face out of the globe
          disc.add(new T.Points(geo, new T.PointsMaterial({ size: .024, vertexColors: true, transparent: true, opacity: .95, depthWrite: false, blending: T.AdditiveBlending, fog: false })));
          P(disc, A.ico(.045, 1), glow('#fff2d8', 2.5, { fog: false }), [0, 0, 0], { cast: false });
          const haze = softLight('#9fb0ff', 1.4, .9); f.add(haze);           // its faint light in the glass
          return { disc };
        },
        mask(h) {   // a gilded theatre mask on a dark head: hollow eyes curved up as if smiling, a hollow smile. Nobody can read it.
          const tex = canvasTex(256, 256, (c, w) => {
            const gr = c.createLinearGradient(0, 0, w * .9, w); gr.addColorStop(0, '#d9bd70'); gr.addColorStop(.5, '#a07e36'); gr.addColorStop(1, '#5c4318');
            c.fillStyle = gr; c.beginPath();                                   // broad at the brow, narrowing to a pointed chin
            c.moveTo(w * .5, w * .02); c.bezierCurveTo(w * .86, w * .02, w * .95, w * .3, w * .9, w * .5); c.bezierCurveTo(w * .84, w * .78, w * .62, w * .97, w * .5, w * .99);
            c.bezierCurveTo(w * .38, w * .97, w * .16, w * .78, w * .1, w * .5); c.bezierCurveTo(w * .05, w * .3, w * .14, w * .02, w * .5, w * .02); c.fill();
            c.strokeStyle = 'rgba(70,48,14,.7)'; c.lineWidth = 3; c.lineCap = 'round';
            for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(w * (.5 + sx * .06), w * .3); c.quadraticCurveTo(w * (.5 + sx * .2), w * .18, w * (.5 + sx * .36), w * .3); c.stroke(); }   // arched brows
            c.beginPath(); c.moveTo(w * .5, w * .36); c.lineTo(w * .47, w * .55); c.lineTo(w * .53, w * .55); c.stroke();   // the nose
            c.strokeStyle = 'rgba(40,26,8,.55)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(w * .3, w * .08); c.lineTo(w * .34, w * .22); c.lineTo(w * .31, w * .31); c.stroke();   // an old crack in the gilt
            c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000';
            for (const sx of [-1, 1]) { const x = w * (.5 + sx * .2), y = w * .42; c.beginPath(); c.moveTo(x - w * .1, y + w * .015); c.quadraticCurveTo(x, y - w * .085, x + w * .1, y + w * .015); c.quadraticCurveTo(x, y - w * .045, x - w * .1, y + w * .015); c.fill(); }   // eyes: thin hollow arcs, curved up
            c.beginPath(); c.moveTo(w * .18, w * .64); c.quadraticCurveTo(w * .5, w * .9, w * .82, w * .64); c.quadraticCurveTo(w * .5, w * .8, w * .18, w * .64); c.fill();   // a hollow smile, a thin crescent, too wide
          });
          const f = G(h, [0, .36, 0]);
          P(f, A.ico(.24, 2), A.mat('#120f10', 0, .8), [0, 0, -.06], { scale: [.85, 1.12, .9], jitter: .003 });   // the dark head it is worn on
          const m = new T.Mesh(new T.SphereGeometry(.3, 24, 16, Math.PI / 2 - .85, 1.7, Math.PI / 2 - 1.0, 2.0),
                               new T.MeshStandardMaterial({ map: tex, alphaTest: .5, metalness: .7, roughness: .38, side: T.DoubleSide, emissive: '#3a2c10', emissiveMap: tex, emissiveIntensity: .18 }));
          m.scale.set(.72, 1.12, .5); m.position.z = .02; f.add(m);
          return {};
        },
      };
      const NAMES = ['clock', 'hourglass', 'metronome', 'galaxy', 'mask'];
      for (const n of (only ? [only] : NAMES)) { const h = G(neck); h.visible = false; heads[n] = { h, ...make[n](h) }; }
      let mood = only || 'clock', next = null, swapT = -9, moodT = 0, until = 10, x = -12, dir = 1, faceYaw = Math.PI / 2, handM = 0, dist = 0, swing = 0, walking = false;
      heads[mood].h.visible = true;
      // it walks plainly, like anyone: legs and arms follow the ground it covers, and it turns round at the ends of its path
      const walk = (speed, dt) => { x += dir * speed * dt; dist += speed * dt; walking = true; if (x > -10.2 || x < -14.6) { dir = -dir; x = Math.max(-14.6, Math.min(-10.2, x)); } };
      return (t, dt = 1 / 60) => {
        // the mood changes now and then (the hourglass: when its sand runs out); the head sinks, another rises
        if (!only && next === null && t > until) { next = NAMES.filter(n => n !== mood)[Math.floor(Math.random() * 4)]; swapT = t; }
        const sw = t - swapT;
        if (next !== null) {
          if (sw >= .9 && heads[mood].h.visible) { heads[mood].h.visible = false; mood = next; heads[mood].h.visible = true; moodT = t; }
          if (sw >= 1.8) { next = null; until = t + (mood === 'hourglass' ? 9 : 9 + Math.random() * 7); }
        }
        const sink = next !== null ? (sw < .9 ? smooth(0, .9, sw) : 1 - smooth(.9, 1.8, sw)) : 0;
        neck.position.y = .5 - sink * .62; neck.scale.setScalar(1 - sink * .55);
        collar.rotation.y = next !== null ? Math.sin(t * 30) * .04 : 0;     // the collar shudders as they change
        const mt = t - moodT, H = heads[mood];
        A.setFireDim(1); walking = false; let ph = null, nod = 0;
        if (next !== null) { /* it stands still while its head changes */ }
        else if (mood === 'clock') {                 // patient: it stands and watches, then walks a little way, slowly. Its hands stop just before it moves.
          const k = mt % 7;
          if (k > 4.6) walk(.35, dt);
          if (k < 4.2) handM = Math.floor(t) * .1047;
          H.minute.rotation.z = -handM; H.hour.rotation.z = -handM / 12;
        } else if (mood === 'metronome') {            // focused: it walks steadily, every step on the tick
          const sw2 = Math.sin(t * 2.4); H.arm.rotation.z = sw2 * .5;
          walk(.46, dt); ph = t * 2.4; nod = Math.abs(sw2) ** 8 * .1;
        } else if (mood === 'hourglass') {           // restless: it flips, the sand runs, and it paces up and down until it is empty
          const flip = smooth(0, .9, mt), f = Math.min(1, Math.max(0, (mt - 1) / 8));
          H.turn.rotation.z = Math.PI * (1 - flip);
          H.top.scale.setScalar(Math.max(.01, 1 - f) ** .5); H.bot.scale.setScalar(Math.max(.01, f) ** .5); H.stream.visible = flip > .99 && f < 1;
          if (mt > 1) walk(.9, dt);
          if (f >= 1 && !only) until = Math.min(until, t);
          if (only && mt > 10) moodT = t;            // the lone hourglass flips again
        } else if (mood === 'galaxy') {              // distant: it stands with its head tipped back to the sky, and the fire flickers
          H.disc.rotation.y = -t * .35;
          A.setFireDim(.7 + .3 * Math.sin(t * 13));
        } else if (mood === 'mask') {                // unreadable: it stands and watches whoever is watching; now and then it walks a few steps, then watches again
          if (mt % 8 > 5.5) walk(.3, dt);
        }
        // legs and arms: a plain stride while it walks, easing to stillness when it stops
        swing = Math.max(0, Math.min(1, swing + (walking ? 3 : -3) * dt));
        if (ph === null) ph = dist * Math.PI / .6;
        legs.forEach((l, i) => { l.rotation.x = Math.sin(ph + i * Math.PI) * .38 * swing; });
        arms.forEach((m, i) => { m.rotation.set(-Math.sin(ph + i * Math.PI) * .22 * swing, 0, 0); });
        body.position.y = Math.abs(Math.cos(ph)) * .03 * swing;
        neck.rotation.x = mood === 'galaxy' ? -.55 * (1 - sink) : nod;
        // which way it faces: the way it walks; the mask, standing, turns slowly to whoever is watching
        const c = A.camera.position, want = mood === 'mask' && next === null && !walking ? Math.atan2(c.x - x, c.z - ZW) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
        let dy = want - faceYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); faceYaw += dy * (1 - Math.exp(-dt * (mood === 'mask' ? 1.2 : 3)));
        g.position.set(x, 0, ZW); g.rotation.y = faceYaw;
      };
    },
    exit() { A.setFireDim(1); },
  },

  // ================================================================ THE VISITING PEOPLES (mockups)
  tidekin: {
    name: 'The Tidekin', hour: 18,
    blurb: 'A people of the lake: smooth otter-and-newt folk, dark green-bronze with pale bellies, who carry lit shells as lanterns. Curious, shy and gentle. First one surfaces at dusk and watches him; then a few come to fish and sing along the shore; in time they build a little floating village of reeds; and once, their eldest comes to the wall.',
    view: [[16, 2.4, 14], [22, .2, 18.8]],
    variants: [['', 'one, watching from the lake'], ['shore', 'a few on the shore, singing'], ['eldest', 'their eldest']],
    knight: { place: 'courtyard', action: 'stand', emote: 'question', note: 'something is watching from the lake' },
    build(root) {
      const kind = root.userData.appearance?.variant?.kind || '', LX = 27, LZ = 23, LL = -.35;
      const at = (d, k) => [LX - .76 * k + .65 * d, LZ - .65 * k - .76 * d];   // k: out from the lake's middle toward the keep; d: along the shore
      const look = (cd, ck, ld, lk, ly) => { const c = at(cd, ck), l = at(ld, lk); this.view = [[c[0], gy(...c) + 2.0, c[1]], [l[0], ly, l[1]]]; };
      const rip = Array.from({ length: 5 }, () => { const m = new T.Mesh(new T.RingGeometry(.9, 1, 32), new T.MeshBasicMaterial({ color: '#d6eaf2', transparent: true, opacity: 0, depthWrite: false })); m.rotation.x = -Math.PI / 2; root.add(m); return { m, t0: -99, x: 0, z: 0 }; });
      let ri = 0; const ripple = (x, z, t) => { const q = rip[ri++ % rip.length]; Object.assign(q, { t0: t, x, z }); };
      const ripples = t => { for (const q of rip) { const k = (t - q.t0) / 3; q.m.visible = k >= 0 && k < 1; if (q.m.visible) { q.m.position.set(q.x, LL + .03, q.z); q.m.scale.setScalar(.3 + k * 2.2); q.m.material.opacity = (1 - k) * .45; } } };
      const faceKeep = (o, x, z) => { o.g.rotation.y = Math.atan2(-x, -z); };
      if (kind === 'shore') {                                          // a few on the shore at dusk, singing (no words), one fishing
        look(2.6, 15.2, 0, 10.6, .7);
        const folk = [-1.4, 0, 1.4].map((d, i) => { const [x, z] = at(d, 10.7), o = tidekin(root, [x, gy(x, z), z], .95 + i * .05, false, 10 + i); o.g.rotation.y = Math.atan2(LX - x, LZ - z) + (i - 1) * .3; o.body.position.y = -.28; return o; });
        const rod = G(folk[2].arms.L, [-.04, -.5, .22]); bone(rod, [0, 0, 0], [0, .6, 1.3], .012, .006, A.M.woodL, 4); bone(rod, [0, .6, 1.3], [0, -1.0, 1.9], .002, .002, A.mat('#d8d8d0'), 3);
        const notes = Array.from({ length: 8 }, (_, i) => { const m = P(root, A.ico(.025, 0), glow('#fff0c8', 2, { fog: false }), [0, 0, 0], { cast: false }); return { m, i }; });
        return t => {
          folk.forEach((o, i) => {
            const sing = i < 2 ? Math.max(0, Math.sin(t * 1.9 + i * 1.7)) : 0;
            o.head.rotation.set(i < 2 ? -.45 - sing * .15 : .25, Math.sin(t * .3 + i) * .2, Math.sin(t * .8 + i) * .1);
            o.jaw.rotation.x = .1 + sing * .35; o.body.rotation.z = Math.sin(t * .8 + i * 2) * .07;
            o.arms.R.rotation.x = -.5; o.lantern.rotation.x = .5; o.arms.L.rotation.x = i === 2 ? -1.1 : -.3; o.shellM.emissiveIntensity = 1.4 + Math.sin(t * 2 + i) * .2;
            o.tail[0].rotation.set(-1.75, .5, 0); o.tail.forEach((j, q) => { if (q) j.rotation.z = .35; });   // tail curled round beside it
          });
          for (const q of notes) { const o = folk[q.i % 2], k = (t * .3 + q.i / 8) % 1, p = o.g.position; q.m.position.set(p.x + Math.sin(q.i * 2 + t) * .3, p.y + 1.3 + k * 2.2, p.z + Math.cos(q.i * 3) * .3); q.m.visible = k < .9; }
        };
      }
      if (kind === 'eldest') {                                         // their eldest: old and barnacled, walking the shore slowly with a staff
        look(-1, 19, .4, 10.8, .9);
        const o = tidekin(root, [0, 0, 0], 1.25, true, 20);
        return t => {
          const c = t % 40, u = c < 20 ? smooth(0, 16, c) : 1 - smooth(20, 36, c), d = -2.6 + u * 5.2, [x, z] = at(d, 10.9), walking = (c > .5 && c < 16) || (c > 20.5 && c < 36);
          const [x2, z2] = at(d + (c < 20 ? .1 : -.1), 10.9);
          o.g.position.set(x, gy(x, z), z);
          const stop = !walking; o.g.rotation.y = stop ? Math.atan2(-x, -z) : Math.atan2(x2 - x, z2 - z);   // when it stops, it turns to the keep
          o.body.position.y = walking ? Math.abs(Math.sin(t * 2.2)) * .03 : 0; o.body.rotation.z = walking ? Math.sin(t * 2.2) * .06 : 0;
          o.arms.R.rotation.x = stop ? -1.5 : -.6; o.lantern.rotation.x = -o.arms.R.rotation.x;   // it lifts its lantern toward the keep
          o.arms.L.rotation.x = -.5 + (walking ? Math.sin(t * 2.2) * .15 : 0);
          o.head.rotation.set(stop ? -.1 : .1, 0, Math.sin(t * .5) * .05); o.tail[0].rotation.y = Math.sin(t * 2.2) * .3;
        };
      }
      look(0, 14, 0, 6.5, -.1);                                        // one, surfacing at dusk to watch him
      const spots = [at(-1.5, 7.2), at(1.8, 6.8), at(0, 6)], o = tidekin(root, [0, -5, 0], 1, false, 3);
      let n = -1, dove = false;
      return t => {
        const c = t % 14, cyc = Math.floor(t / 14), sp = spots[cyc % 3];
        if (cyc !== n) { n = cyc; dove = false; o.g.position.x = sp[0]; o.g.position.z = sp[1]; faceKeep(o, ...sp); ripple(sp[0], sp[1], t - c + 1.3); }
        if (c > 12 && !dove) { dove = true; ripple(sp[0], sp[1], t); }
        const up = smooth(1.2, 2.6, c) * (1 - smooth(11.6, 12.8, c));
        o.g.position.y = LL - 1.8 + up * .95;   // head and shoulders out of the water
        o.head.rotation.set(-.08 + Math.sin(t * .7) * .04, Math.sin(t * .4) * .35, pulse(t, 5.3, 1.2) * .35);   // a curious tilt of the head, now and then
        o.arms.R.rotation.x = -1.0 - pulse(t + 1, 7, 2.5) * .5; o.lantern.rotation.x = -o.arms.R.rotation.x; o.arms.L.rotation.x = -.3;
        o.shellM.emissiveIntensity = 1.4 + Math.sin(t * 2) * .2; o.tail[0].rotation.y = Math.sin(t * 1.3) * .5;
        ripples(t);
      };
    },
  },
  burrowfolk: {
    name: 'The Burrowfolk', hour: 19,
    blurb: 'A people under the plain: mole-and-badger diggers in leather aprons, with lantern-mushrooms growing on their backs. First a lost youngster pops up in the courtyard; then diggers come looking for it, with tunnels and mounds; they farm glowing mushrooms in a hollow on the plain; and their Burrow-Mother, huge, gentle and nearly blind, surfaces to thank him or to scold him, depending on how he treated the little one.',
    view: [[-6.4, 1.4, -.9], [-10.8, .35, .1]],
    variants: [['', 'a lost youngster'], ['diggers', 'diggers, searching'], ['mother', 'the Burrow-Mother']],
    knight: { place: 'courtyard', action: 'stand', emote: 'question', note: 'a little nose, in the courtyard' },
    build(root) {
      const kind = root.userData.appearance?.variant?.kind || '';
      if (kind === 'diggers') {
        this.view = [[-4.6, 1.9, 7.6], [-2, .6, 12.6]];
        for (const [x, z, rr] of [[-3.6, 12.4, .55], [-.4, 13.8, .5], [-2.2, 15, .6], [1.2, 11.6, .4]]) dirtMound(root, x, z, rr, rr > .45);
        const a = burrower(root, [-2.9, gy(-2.9, 12.1), 12.1], 1, { seed: 6 }), b = burrower(root, [-1.1, gy(-1.1, 13.0), 13.0], .95, { seed: 7 });
        a.g.rotation.y = 2.4; b.g.rotation.y = Math.atan2(1.1, -13);
        const clods = Array.from({ length: 10 }, (_, i) => ({ m: P(root, A.ico(.05, 0), A.mat('#4a3826', 0, 1), [0, -9, 0]), i }));
        return t => {
          // one digs: claws in, earth thrown back over its shoulder
          const dig = Math.sin(t * 6); a.arms.L.rotation.x = -.6 + dig * .5; a.arms.R.rotation.x = -.6 - dig * .5; a.body.rotation.x = .35; a.head.rotation.x = .3;
          for (const q of clods) { const k = (t * 1.2 + q.i / 10) % 1, p = a.g.position; q.m.position.set(p.x + Math.sin(a.g.rotation.y) * (-.4 - k * 1.2) + (q.i % 3 - 1) * .1, p.y + .6 + Math.sin(k * Math.PI) * .9, p.z + Math.cos(a.g.rotation.y) * (-.4 - k * 1.2)); }
          // the other stands up tall and sniffs the air, turning, calling for the little one
          const call = pulse(t, 6, 1.6); b.head.rotation.set(-.3 - call * .4, Math.sin(t * .5) * .8, 0); b.nose.scale.setScalar(1 + Math.max(0, Math.sin(t * 14)) * .25 * (1 - call));
          b.arms.R.rotation.x = -1.2 + Math.sin(t * .5) * .1; b.arms.L.rotation.x = -.2;
          for (const o of [a, b]) o.caps.forEach((m, i) => { m.emissiveIntensity = 1.4 + Math.sin(t * 1.5 + i) * .3; });
        };
      }
      if (kind === 'mother') {
        this.view = [[-7, 3.2, 3.4], [-1, 2.2, 15]];
        const MX = -1, MZ = 15, y0 = gy(MX, MZ), r = A.rand(19);
        for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28, rr = 2.3 + r() * .5; P(root, A.box(.5 + r() * .4, .25, .4 + r() * .3), A.mat(i % 3 ? '#4a3826' : '#2e3122', 0, 1), [MX + Math.cos(a) * rr, y0 + .05, MZ + Math.sin(a) * rr], { rot: [(r() - .5) * .8, a, (r() - .5) * .8], jitter: .05 }); }   // the ground heaved up round her
        const m = burrower(root, [MX, y0 - 4, MZ], 2.8, { mother: true, seed: 8 }); m.g.rotation.y = Math.atan2(-MX, -MZ);
        return t => {
          const c = t % 40, up = smooth(1, 8, c) * (1 - smooth(34, 39, c));   // she surfaces, slowly, and after a long while sinks back
          m.g.position.y = y0 - 4.2 + up * 2.9;
          m.head.rotation.set(.15 + Math.sin(t * .3) * .1, Math.sin(t * .2) * .35, 0);   // she cannot see well: she finds the keep by smell
          m.nose.scale.setScalar(1 + Math.max(0, Math.sin(t * 3)) ** 3 * .3);
          m.arms.L.rotation.x = -.9; m.arms.R.rotation.x = -.9 + Math.sin(t * .4) * .1;
          m.caps.forEach((q, i) => { q.emissiveIntensity = 1.3 + Math.sin(t * .9 + i * .7) * .4; });
        };
      }
      const H1 = [-9.7, -.5], H2 = [-11.9, .55];                       // a lost youngster, popping up in the courtyard
      const y1 = dirtMound(root, ...H1, .35), y2 = dirtMound(root, ...H2, .35);
      const y = burrower(root, [0, -5, 0], .42, { young: true, seed: 4 });
      return t => {
        const c = t % 13, first = c < 7, [hx, hz] = first ? H1 : H2, base = first ? y1 : y2;
        const up = first ? smooth(1, 1.4, c) * (1 - smooth(6, 6.25, c)) : smooth(8, 8.4, c) * (1 - smooth(12, 12.3, c));   // up it pops; down it ducks, quick
        y.g.position.set(hx, base - .75 + up * .72, hz);
        y.g.rotation.y = first && c > 4 ? Math.atan2(-7.4 - hx, 1 - hz) : first ? 1.2 + Math.sin(c * 1.4) * .9 : Math.atan2(-hx, -hz);   // it looks about; then it sees him
        y.head.rotation.set(first && c > 4 ? -.15 : 0, 0, pulse(c, 3.1, .8) * .3);
        y.nose.scale.setScalar(1 + Math.max(0, Math.sin(t * 16)) * .3);
        y.arms.L.rotation.x = y.arms.R.rotation.x = -1.2;               // little claws on the rim of the hole
      };
    },
  },
  kitemakers: {
    name: 'The Kitemakers', hour: 13,
    blurb: 'A people of the wind: light, long-limbed gliders with silk between arm and leg, patterned like kites, who ride the wind fronts on windy days. First a scout glides in and lands on the keep; then a flock passes over; they rest on the walls in a gale; and once, a great migration darkens the sky for an hour while their Wind-Chief, the largest, its silk ragged with ancient patterns, circles the keep once. They leave dropped silk he can keep.',
    view: [[10.5, 4.4, 1.5], [5.6, 5.0, -4.4]],
    variants: [['', 'a scout, landing on the keep'], ['flock', 'the great migration, and the Wind-Chief']],
    knight: { place: 'courtyard', action: 'stand', emote: 'exclaim', note: 'someone is on the roof' },
    build(root) {
      const kind = root.userData.appearance?.variant?.kind || '';
      if (kind === 'flock') {
        this.view = [[-34, 6, 36], [0, 9, 0]];
        const chief = kiteFolk(root, 2.1, { chief: true, seed: 41 }), flock = Array.from({ length: 14 }, (_, i) => ({ k: kiteFolk(root, .8 + (i % 3) * .1, { seed: 50 + i }), i }));
        const at = (a, R, H) => [Math.cos(a) * R, H + Math.sin(a * 2) * 1.2, Math.sin(a) * R];
        const fly = (K, a, R, H, t) => { const p = at(a, R, H), q = at(a + .02, R, H); K.g.position.set(...p); K.g.rotation.set(0, Math.atan2(q[0] - p[0], q[2] - p[2]), -.35); K.body.rotation.set(Math.PI / 2 - .12, 0, 0); K.pose(1, t); };
        return t => {
          fly(chief, t * .07, 14, 13, t);                              // the Wind-Chief circles the keep once, slowly
          for (const { k, i } of flock) fly(k, t * .07 - .2 - Math.floor(i / 4) * .09 - (i % 4) * .025, 12.5 + (i % 4) * 1.3, 11.5 + Math.floor(i / 4) * 1.1 + Math.sin(t * 1.3 + i) * .3, t + i);
        };
      }
      // a scout: glides in on the wind, lands on the corner of the keep's wall, looks about, and goes
      const k = kiteFolk(root, 1, { seed: 33 }), LAND = V(5.3, 4.22, -4.3);
      const inC = new T.CatmullRomCurve3([V(36, 17, -22), V(21, 11, -12), V(10.5, 6.6, -6.4), LAND.clone().add(V(.25, .35, 0))]);
      const outC = new T.CatmullRomCurve3([LAND.clone(), V(1.5, 6.8, -9), V(-13, 10.5, -15), V(-42, 17, -22)]);
      const P0 = V(), P1 = V();
      return t => {
        const c = t % 26; let spread = 1, pitch = Math.PI / 2 - .15, stand = 0;
        if (c < 7.4) { const u = 1 - (1 - c / 7.4) ** 1.5; inC.getPointAt(u, P0); inC.getPointAt(Math.min(1, u + .01), P1); if (u > .995) P1.copy(P0).add(V(-1, 0, 0)); const fl = smooth(.82, 1, u); pitch = (Math.PI / 2 - .15) * (1 - fl); stand = fl; k.g.rotation.set(0, Math.atan2(P1.x - P0.x, P1.z - P0.z), 0); }   // flaring as it lands
        else if (c < 16) { P0.copy(LAND); spread = 1 - smooth(7.4, 8.4, c) + pulse(c - 11, 99, 1.6) * .7; pitch = 0; stand = 1; k.g.rotation.set(0, -2.2 + Math.sin(c * .45) * .7, 0); k.head.rotation.set(Math.sin(c * .9) * .1, Math.sin(c * .6) * .6, pulse(c, 4.4, 1) * .3); }   // folded; a stretch of the silk; looking about
        else { const u = ((c - 16) / 10) ** 1.25; outC.getPointAt(Math.min(1, u), P0); outC.getPointAt(Math.min(1, u + .01), P1); spread = smooth(16, 16.6, c); pitch = (Math.PI / 2 - .2) * smooth(16, 16.8, c); stand = 1 - smooth(16, 16.6, c); k.g.rotation.set(0, Math.atan2(P1.x - P0.x, P1.z - P0.z), 0); }
        k.g.visible = !(c > 25.5); k.g.position.copy(P0); k.body.rotation.set(pitch, 0, 0); k.body.position.y = stand * .78; k.pose(spread, t);
      };
    },
  },

  // ================================================================ THE ABYSSALS (mockups)
  hanging: {
    name: 'The hanging dark', hour: 18,
    blurb: 'From the abyss. It hangs upright a little above the ground, ribs open at the front with a light moving inside them, a ragged skin from its shoulders, arms long enough to drag. No face at all. It holds perfectly still, then is suddenly turned another way. Its light is its mood: deep teal when calm, violet when unsettled, pale and flickering just before it acts.',
    view: [[-6.4, 2.6, 2.9], [-9.5, 1.6, 10.5]], variants: DEPTHS,
    knight: { place: 'courtyard', action: 'stand', emote: 'dots', note: 'it was facing the other way a moment ago' },
    build(root) { return abyssHanging(root, [-9.5, 0, 10.5], root.userData.appearance?.variant?.kind === 'deep', 11).tick; },
  },
  fingerwalker: {
    name: 'The finger-walker', hour: 18,
    blurb: 'From the abyss. Low and wide, on long legs that end in fingers, with a seam of light down its back and a smooth bulb of a head on a long stalk that snaps from one way to another. It scuttles in sudden bursts, then holds still for a long time, one finger tapping. How long it holds still is how calm it is.',
    view: [[-5.6, 2.6, 2.9], [-8.5, 1.0, 10]], variants: DEPTHS,
    knight: { place: 'courtyard', action: 'stand', emote: 'dots', note: 'one finger, tapping' },
    build(root) { return abyssFingers(root, [-8.5, 0, 10], root.userData.appearance?.variant?.kind === 'deep', 23).tick; },
  },
  scatter: {
    name: 'The scatter', hour: 18,
    blurb: 'From the abyss. A cloud of dark shards around a small cold light. Now and then every shard snaps into a shape at once: a tall figure, a spire, a long arm reaching toward the keep. Then it all falls apart again. When its light goes pale, it only reaches.',
    view: [[-7, 2.8, 2.9], [-10, 1.6, 11]], variants: DEPTHS,
    knight: { place: 'courtyard', action: 'stand', emote: 'dots', note: 'it keeps making shapes' },
    build(root) { return abyssScatter(root, [-10, 0, 11], root.userData.appearance?.variant?.kind === 'deep', 37).tick; },
  },
  rift: {
    name: 'The rift', hour: 18,
    blurb: 'A world event, rare. A tear opens in the land, cold light far down inside it, and dark rises out of it like smoke. The longer it stays open, the deeper the things that climb out of it, and at its deepest the tear climbs up out of the ground and stands open in the air, as if the land had split up into the sky. When it closes, it leaves a scar that can open again. (Where it opens is still to be decided.)',
    view: [[-5.5, 6.0, 3.0], [5, 2.6, 17.5]],
    variants: [['', 'as it deepens (plays out)'], ['deepest', 'at its deepest']],
    knight: { place: 'courtyard', action: 'stand', emote: 'exclaim', note: 'the ground is open' },
    build(root) {
      const RX = 5, RZ = 17, y0 = gy(RX, RZ), r = A.rand(77), L = 9;
      const g = G(root, [RX, y0, RZ], [0, .25, 0]);
      // the tear: a jagged opening in the turf, black all the way down, with cold light far below
      const shape = new T.Shape(), top = [], bot = [];
      for (let i = 0; i <= 14; i++) { const u = i / 14, w = Math.sin(u * Math.PI) ** .7 * (1.15 + r() * .6); top.push([(u - .5) * L + (r() - .5) * .3, w * (i % 2 ? 1 : .75)]); bot.push([(u - .5) * L + (r() - .5) * .3, -w * (i % 2 ? .8 : 1.05)]); }
      shape.moveTo(...top[0]); top.forEach(q => shape.lineTo(...q)); bot.reverse().forEach(q => shape.lineTo(...q));
      const hole = new T.Mesh(new T.ShapeGeometry(shape), new T.MeshBasicMaterial({ color: '#000000', fog: false })); hole.rotation.x = -Math.PI / 2; hole.position.y = .08; g.add(hole);
      const deepM = glow('#7a4cff', 2.2, { fog: false, transparent: true, opacity: .8 });
      for (let i = 1; i < 13; i++) { const u = i / 14, x = (u - .5) * L; P(g, A.box(L / 14 * 1.1, .01, .05 + Math.sin(u * Math.PI) * .12), deepM, [x, .09, (r() - .5) * .1], { rot: [0, (r() - .5) * .3, 0], cast: false, jitter: 0 }); }
      const depthTex = canvasTex(256, 64, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.5, 'rgba(150,110,255,.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
      const deepGlow = new T.Mesh(new T.PlaneGeometry(L * .82, 1.3), new T.MeshBasicMaterial({ map: depthTex, transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
      deepGlow.rotation.x = -Math.PI / 2; deepGlow.position.y = .1; g.add(deepGlow);   // light from far down, along the length of it
      // its torn edges: turf and stone heaved up along both sides
      const turf = A.mat('#2a2e1e', 0, 1), stone = A.M.stoneD;
      for (let i = 0; i < 18; i++) { const u = (i % 9 + .5) / 9, side = i < 9 ? 1 : -1, w = Math.sin(u * Math.PI) ** .7 * 1.6 + .3;
        P(g, A.box(.6 + r() * .5, .18, .5 + r() * .3), i % 3 ? turf : stone, [(u - .5) * L, .05, side * w], { rot: [side * (.3 + r() * .4), r() * .6, (r() - .5) * .3], jitter: .05 }); }
      // dark rising out of it like smoke, a few violet motes, and the light it gives (no real light)
      const smoke = Array.from({ length: 22 }, (_, i) => { const sp = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: '#000000', transparent: true, opacity: 0, depthWrite: false, fog: false })); g.add(sp); return { sp, x: (r() - .5) * L * .8, ph: r() }; });
      const motes = Array.from({ length: 14 }, () => { const m = P(g, A.ico(.03, 0), glow('#b9a2ff', 2.5, { fog: false }), [0, 0, 0], { cast: false }); return { m, x: (r() - .5) * L * .8, ph: r() }; });
      const lamp = softLight('#7a4cff', 3, 9); lamp.position.y = .6; g.add(lamp);
      // at its deepest, the tear climbs up out of the ground and stands open in the air: black, with
      // dark violet edges, smoke pouring off them (unlike the seam's clean crack)
      const TH = 7.5, tshape = new T.Shape(), tl = [], tr = [];
      for (let i = 0; i <= 12; i++) { const u = i / 12, w = Math.sin(u * Math.PI) ** .8 * (1.0 + r() * .5) * (1 - u * .35); tl.push([-w + (r() - .5) * .15, u * TH]); tr.push([w + (r() - .5) * .15, u * TH]); }
      const outline = tr.slice().reverse(); tshape.moveTo(0, 0); tl.forEach(q => tshape.lineTo(...q)); outline.forEach(q => tshape.lineTo(...q));
      const tgeo = new T.ShapeGeometry(tshape), tear = G(g, [0, .05, 0]);
      const rim = new T.Shape(); rim.moveTo(0, -.25); tl.forEach(([x, y]) => rim.lineTo(x * 1.25 - .05, y * 1.02)); outline.forEach(([x, y]) => rim.lineTo(x * 1.25 + .05, y * 1.02));   // its edge: only a border, the middle stays black
      const inner = new T.Path(); inner.moveTo(0, 0); tl.forEach(q => inner.lineTo(...q)); outline.forEach(q => inner.lineTo(...q)); rim.holes.push(inner);
      const edge = new T.Mesh(new T.ShapeGeometry(rim), new T.MeshBasicMaterial({ color: '#6a3cff', transparent: true, opacity: .8, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false })); tear.add(edge);
      tear.add(new T.Mesh(tgeo, new T.MeshBasicMaterial({ color: '#000000', side: T.DoubleSide, fog: false })));
      const tsmoke = Array.from({ length: 16 }, () => { const sp = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: '#05030a', transparent: true, opacity: 0, depthWrite: false, fog: false })); g.add(sp); return { sp, side: r() < .5 ? -1 : 1, y: r() * TH, ph: r() }; });
      const deepest = root.userData.appearance?.variant?.kind === 'deepest';
      // what comes out of it: from deep down
      const hang = abyssHanging(root, [RX - .4, 0, RZ + .2], true, 21), walk = abyssFingers(root, [RX + 3.2, 0, RZ + 3.0], true, 22), scat = abyssScatter(root, [RX - 3.4, 0, RZ + 3.2], true, 23);
      return (t, dt) => {
        for (const s of smoke) { const k = (t * .06 + s.ph) % 1; s.sp.position.set(s.x + Math.sin(t * .3 + s.ph * 9) * .4, .2 + k * 5, Math.sin(s.ph * 20) * .3); s.sp.scale.setScalar(1 + k * 3); s.sp.material.opacity = Math.sin(k * Math.PI) * .55; }
        for (const m of motes) { const k = (t * .12 + m.ph) % 1; m.m.position.set(m.x, k * 3.5, Math.sin(m.ph * 30 + t) * .3); m.m.visible = k < .9; }
        deepM.emissiveIntensity = 1.8 + Math.sin(t * .7) * .5 + Math.sin(t * 2.3) * .2; deepGlow.material.opacity = .45 + Math.sin(t * .7) * .15; lamp.intensity = 2.6 + Math.sin(t * .7) * .6;
        hang.tick(t); walk.tick(t); scat.tick(t);
        // the tear rising out of the ground (in the preview: it deepens, stands open a while, sinks back)
        const cy = t % 50, up = deepest ? 1 : smooth(18, 30, cy) * (1 - smooth(44, 50, cy));
        tear.visible = up > .01; tear.scale.set(.35 + .65 * up, Math.max(.01, up), 1);
        edge.material.opacity = .55 + Math.sin(t * 1.3) * .2 + Math.sin(t * 3.1) * .1;
        for (const q of tsmoke) { const k = (t * .15 + q.ph) % 1, yy = q.y * up; q.sp.position.set(q.side * (Math.sin(yy / TH * Math.PI) * 1.2 * up + k * 1.6), yy + k * 1.2, (q.ph - .5) * .4); q.sp.scale.setScalar(.8 + k * 2.2); q.sp.material.opacity = up * Math.sin(k * Math.PI) * .6; }
        // now and then the hanging one sinks back into the tear and rises out of it again
        const c = t % 34, rise = smooth(0, 6, c) * (1 - smooth(28, 33, c));
        hang.g.position.y -= (1 - rise) * 4.2; hang.g.visible = rise > .02;
      };
    },
  },

  // ================================================================ A METEOR FALLS (an arrival)
  meteor: {
    name: 'A meteor falls', hour: 22,
    blurb: 'An arrival. A streak across the night sky, a flash and a thud on the plain, a ring of air going out and stones thrown up, then a smoking crater that stays for days, cooling, and sometimes something climbing out of it. (Plays out every half minute here; at the keep, only when something truly comes down.)',
    view: [[-1.2, 3.0, 5.2], [8.5, 1.8, 18.5]],
    knight: { place: 'fire', action: 'stand', emote: 'exclaim', note: 'the sky just lit up' },
    build(root) {
      const sc = meteorScene(root, 9.5, 19, { loop: 32 });
      const thing = nightGrown(root, [9.5, gy(9.5, 19) - 2.6, 19], 1.05); thing.g.rotation.y = Math.atan2(-9.5, -19);
      return (t, dt) => {
        const k = sc(t, dt);
        const rise = Math.min(1, Math.max(0, (k - 10) / 4));   // something climbs out
        thing.g.position.y = gy(9.5, 19) - 2.6 + rise * 2.6; thing.g.visible = rise > 0;
        thing.tick(t, 2);
      };
    },
  },

  // ================================================================ A SHIP LANDS (an arrival)
  lander: {
    name: 'A ship lands', hour: 22,
    blurb: 'An arrival event. A smooth, seed-like craft settles on the plain with no fire and no sound, opens, and one of its crew steps out to look around: slender, made of glassy light. Then it leaves, and a scorched ring stays where it stood. (Plays out every minute here.)',
    view: [[-3.4, 3.6, 14.2], [-6.8, 1.6, 21.4]],
    knight: { place: 'fire', action: 'stand', emote: 'question', note: 'watching the lights on the plain' },
    build(root) {
      const lx = -7, lz = 22, ly = gy(lx, lz);
      const hull = A.mat('#d4d9e0', .6, .25, { emissive: '#4a6a78', emissiveIntensity: .55 }), seam = A.mat('#8a929e', .6, .3), lightM = glow('#7ff0e6', 2.4, { fog: false });   // a faint sheen of its own, seen from the keep
      const ship = G(root, [lx, ly + 40, lz]);
      P(ship, new T.SphereGeometry(1.7, 18, 10, 0, 6.283, Math.PI / 2, Math.PI / 2), hull, [0, 0, 0], { scale: [1, .55, 1], jitter: .01 });   // the lower hull
      const lid = G(ship, [-1.6, 0, 0]);   // the upper shell, hinged at one side
      P(lid, new T.SphereGeometry(1.7, 18, 10, 0, 6.283, 0, Math.PI / 2), hull, [1.6, 0, 0], { scale: [1, .75, 1], jitter: .01 });
      for (const y of [-.25, -.5]) { const s = new T.Mesh(new T.TorusGeometry(1.65 - (y < -.3 ? .3 : .05), .03, 4, 36), seam); s.rotation.x = Math.PI / 2; s.position.y = y; ship.add(s); }
      const under = new T.Mesh(new T.TorusGeometry(.9, .07, 6, 32), lightM); under.rotation.x = Math.PI / 2; under.position.y = -.85; ship.add(under);
      const inner = softLight('#9ff6ee', 0, 5); inner.position.y = .4; ship.add(inner);
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; P(ship, A.box(.02, .02, .5), seam, [Math.cos(a) * 1.25, -.62, Math.sin(a) * 1.25], { rot: [0, -a, 0], cast: false }); }   // panel lines underneath
      P(ship, A.cyl(.12, .2, .25, 10), seam, [0, -.9, 0]);                // the root-like keel of a seed
      const beam = new T.Mesh(new T.ConeGeometry(2.2, 12, 20, 1, true), new T.MeshBasicMaterial({ color: '#9ff6ee', transparent: true, opacity: .12, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false }));
      beam.position.y = -6.8; ship.add(beam);
      const scorch = new T.Mesh(new T.RingGeometry(1.2, 2.3, 24), new T.MeshBasicMaterial({ color: '#16120e', transparent: true, opacity: .85 })); scorch.rotation.x = -Math.PI / 2; scorch.position.set(lx, ly + .05, lz); root.add(scorch);
      // one of its crew: the Gardener, slender and careful, with long fingers for taking samples
      const gard = glassFolk(root, 'gardener', 1), gm = glassMover(gard, lx, lz), kp = V(-5, 1.6, 0), sampleP = V();
      // it is a gardener: where it bends down, it leaves a seedling of light, which stays a while
      const sprout = G(root, [lx + 2.6 * .55, gy(lx + 1.4, lz - 1.9), lz - 3.4 * .55]); sprout.visible = false;
      bone(sprout, [0, 0, 0], [0, .22, 0], .012, .008, glow('#9fffe0', 1.6, { fog: false }), 4);
      for (const sx of [-1, 1]) P(sprout, A.ico(.045, 0), glow('#bfffea', 2, { fog: false }), [sx * .05, .22, 0], { scale: [1.4, .4, .8], cast: false });
      const CYCLE = 60, out = V(lx + 2.6, 0, lz - 3.4), clock = visitClock(root, CYCLE);
      return (t, dt = 1 / 60) => {
        dt = Math.min(dt, .1);
        // (the preview plays its minute over and over; at the real keep it lands once, at the start of its
        // visit, its crew goes out now and then while it is here, and it leaves at the end)
        const { since, left, live } = clock(t);
        let k = since;
        if (live) { if (left < 16) k = 50 - Math.max(0, left); else if (since >= 33) { const m = (since - 33) % 75; k = m < 21 ? 13 + m : 33; } }
        const down = smooth(0, 9, k), up = smooth(40, 50, k);
        ship.position.y = ly + 1.0 + (1 - down) * 40 + up * 45; ship.rotation.y = t * .2;
        beam.material.opacity = (k < 11 || (k > 39 && k < 50)) ? .12 + .05 * Math.sin(t * 8) : 0;
        const open = smooth(11, 13, k) * (1 - smooth(34, 36, k));
        lid.rotation.z = open * 1.2; inner.intensity = open * 6;
        under.material.emissiveIntensity = 2 + Math.sin(t * 3) * .6;
        scorch.visible = k > 9;
        // the Gardener steps out, walks to a spot, kneels to take a sample (and leaves a seedling of light), looks
        // round at the keep a while, and goes back in
        gard.g.visible = k > 12.5 && k < 34;
        if (k <= 13 || k >= 34) { gm.x = gm.px = lx; gm.z = gm.pz = lz; }
        const going = k > 13 && k < 28, tx = going ? out.x : lx, tz = going ? out.z : lz;
        const d = gm.toward(tx, tz, .8, dt, 1);
        gm.crouch = k > 19 && k < 24.5 ? 1 : 0;                          // kneeling, taking a sample
        let look = null;
        if (gm.crouch) look = sampleP.set(gm.x + Math.sin(gm.yaw) * .55, gy(gm.x, gm.z), gm.z + Math.cos(gm.yaw) * .55);
        else if (k > 24.5 && k < 28) look = kp;                           // then it looks round at the keep, curious
        const over = gm.lookAt(look, dt, 3); if (look && d < .3) gm.face(gm.yaw + over, dt, 1);
        if (k > 25.5 && k < 27.5) gard.head.rotation.z = Math.sin((k - 25.5) / 2 * Math.PI) * .35; else gard.head.rotation.z *= .9;   // a tilt of the head
        gard.arms[1].sh.rotation.x += gm.crouchK * -.9;                    // (reaching down to the ground)
        gm.pose(t, dt);
        if (gm.crouch) gard.arms[1].sh.rotation.x = -1.0 * gm.crouchK;
        if (k > 22) { sprout.visible = true; if (k < 23) sprout.position.set(gm.x + Math.sin(gm.yaw) * .6, gy(gm.x, gm.z), gm.z + Math.cos(gm.yaw) * .6); }
        if (k < 1) sprout.visible = false; sprout.scale.setScalar(Math.min(1, Math.max(0, k - 22)));
      };
    },
  },

  // ================================================================ THE GLASSY PEOPLE: THE SCOUTS (their story's second chapter)
  glassy2: {
    name: 'The glassy Scouts', hour: 18,
    blurb: 'The second chapter of the glassy people. A slim craft hangs low over the plain, and three or four quick, slender beings of glassy light come down its beam, then scatter across the land, running on their toes from one place to the next: the barrow, the lake shore, the forest edge, the road. At each they stop to look, sweeping the ground with the beams from their faces, crouching to look closer. When something interests them, every beam swings onto it at once, from wherever they are. The better they think of the knight, the nearer they range.',
    view: [[2, 15, 34], [-5, 0, 6]],
    knight: { place: 'courtyard', action: 'gaze', emote: 'question', note: 'watching the lights run about the land' },
    build(root) {
      const ap = root.userData.appearance || {}, reg = Math.max(-2, Math.min(2, ap.regard || 0)), clock = visitClock(root, 120);
      const n = (ap.variant?.size ?? 1) < .95 ? 3 : 4;
      const CP = V(-2, 0, 17 - reg * 2), cy = gy(CP.x, CP.z) + 5.5;
      const craft = seedShip(root, .8); craft.ship.scale.set(.55, .45, 1.15);   // a slim dart of a craft
      // where they may go: places worth a look, as near the keep as their regard allows (never inside its walls)
      const near = 12 - reg * 3, spots = SURVEY.filter(([x, z]) => Math.hypot(x + 5.5, z) >= near);
      const scouts = Array.from({ length: n }, (_, i) => { const f = glassFolk(root, 'scout', i), m = glassMover(f, CP.x, CP.z); return { f, m, i, path: [], at: null, mode: 'up', until: 0, ph: i * 1.7, scan: V() }; });
      const kn = V(), tmp = V(), motes = motePool(root, 180, '#cffaff', .08);
      const pick = (s) => {                                               // somewhere new, away from where the others are going
        const others = scouts.filter(o => o !== s && o.at).map(o => o.at);
        const ok = spots.filter(p => p !== s.at && others.every(q => Math.hypot(p[0] - q[0], p[1] - q[1]) > 7));
        const list = ok.length ? ok : spots, w = list.map(p => 1 / (4 + Math.hypot(p[0] - s.m.x, p[1] - s.m.z)) + .02);   // nearer places a little likelier
        let r = Math.random() * w.reduce((a, b) => a + b, 0); for (let j = 0; j < list.length; j++) { r -= w[j]; if (r <= 0) return list[j]; } return list[0];
      };
      const send = (s, p) => { s.at = p; s.path = routeAround([s.m.x, s.m.z], p); s.mode = 'go'; };
      let first = true, lastSince = -1;
      return (t, dt = 1 / 60) => {
        dt = Math.min(dt, .1);
        const { since, left } = clock(t);
        if (since < lastSince) for (const s of scouts) { s.mode = 'up'; s.path = []; s.at = null; s.m.x = s.m.px = CP.x; s.m.z = s.m.pz = CP.z; s.m.v = 0; s.m.crouch = 0; s.k = 0; }   // (the preview's visit starts over: so do they)
        lastSince = since;
        const down = smooth(0, 6, since), leaving = 1 - smooth(2, 10, left);
        const lastLand = 5 + (n - 1) * 1.3, dip = Math.max(smooth(3, 5, since) * (1 - smooth(lastLand + 2, lastLand + 4, since)), smooth(15, 13, left) * smooth(2, 4, left));   // it dips low while they drop, and while they come back
        craft.ship.position.set(CP.x, cy - dip * 2.3 + (1 - down) * 40 + leaving * 40, CP.z); craft.ship.rotation.y = Math.sin(t * .2) * .3;
        craft.beam.material.opacity = (since > 4 && since < 10 + n * 1.3) || (left > 6 && left < 20) ? .1 + .04 * Math.sin(t * 7) : 0;
        craft.lightM.emissiveIntensity = 2 + Math.sin(t * 3) * .6;
        A.K.J.hips.getWorldPosition(kn); kn.y += .8;
        const tell = pulse(since, 31, 7) > .3 && left > 22;              // its tell: every beam on him at once, from wherever they are
        for (const s of scouts) {
          const { m, f } = s, landT = 5 + s.i * 1.3, upT = 9 - s.i * .9;
          if (first && since > landT + 12 && left > 22) { const p = pick(s); s.at = p; m.x = m.px = p[0] + (Math.random() - .5) * 2; m.z = m.pz = p[1] + (Math.random() - .5) * 2; m.yaw = Math.random() * 6.28; s.mode = 'look'; s.until = since + Math.random() * 4; }   // (someone looking in late finds them already out)
          // coming down the beam; going home at the end; going back up
          beamArrive(s, f, m, Math.min(smooth(landT, landT + 1.6, since), 1 - smooth(upT, upT - 1.6, left)), motes, dt, 2.6);   // forming out of light as it drops; coming apart as it goes up
          f.g.visible = since > landT - .2 && left > upT - 1.7;
          if (s.mode === 'up' && since > landT + 1.6) { send(s, pick(s)); }
          if (left < 20 && s.mode !== 'home') { s.mode = 'home'; s.path = routeAround([m.x, m.z], [CP.x + (s.i - n / 2) * .6, CP.z]); }
          let look = null, vmax = 0;
          if (s.mode === 'go' || s.mode === 'home') {
            const p = s.path[0];
            if (p) { const d = Math.hypot(p[0] - m.x, p[1] - m.z); vmax = s.mode === 'home' ? 3.4 : d > 7 ? 3.3 : 1.3; if (d < .4 && s.path.length > 1) s.path.shift(); else if (d < .25) { if (s.mode === 'go') { s.mode = 'look'; s.until = since + 3 + Math.random() * 4; m.crouch = Math.random() < .35 ? 1 : 0; } } }
          } else if (s.mode === 'look') {                                  // stopping to look: the beam sweeps the ground round about
            const a = since * .9 + s.ph; s.scan.set(m.x + Math.sin(m.yaw + Math.sin(a) * 1.2) * (m.crouch ? 1.4 : 5), gy(m.x, m.z), m.z + Math.cos(m.yaw + Math.sin(a) * 1.2) * (m.crouch ? 1.4 : 5)); look = s.scan;
            if (since > s.until) { m.crouch = 0; send(s, pick(s)); }
          }
          if (tell && s.mode !== 'home' && m.y === 0) { vmax = 0; look = kn; }
          const p = s.path[0];
          if (p && vmax > 0) m.toward(p[0], p[1], vmax, dt, 3); else m.toward(m.x, m.z, 0, dt, 5);
          const over = m.lookAt(look, dt, tell ? 4 : 5);
          if (look && m.v < .1) m.face(m.yaw + over, dt, 1.5);              // if the head cannot turn far enough, the body does
          m.pose(t, dt);
          f.beam.material.opacity = m.y > .05 ? 0 : tell ? .15 : s.mode === 'look' ? .11 : .05;
        }
        first = false;
        motes.tick(dt);
      };
    },
  },

  // ================================================================ THE GLASSY PEOPLE: THE EXPEDITION (the third chapter)
  glassy3: {
    name: 'The glassy Expedition', hour: 18,
    blurb: 'The third chapter of the glassy people. Several of their seed-craft come down together on the plain and make a camp of light for a night or two: sturdy amber builders carry panels of light and raise a lattice dome strut by strut, while slim scouts walk and run the edges of the camp with their beams. Now and then they gather round something they mean to show, facing the keep.',
    view: [[-3, 3.6, 7.5], [8, 1.4, 19]],
    knight: { place: 'courtyard', action: 'gaze', emote: 'question', note: 'watching the camp of lights on the plain' },
    build(root) {
      const ap = root.userData.appearance || {}, reg = Math.max(-2, Math.min(2, ap.regard || 0)), clock = visitClock(root, 140);
      const Cc = V(9, 0, 20 - reg * 2), gyc = gy(Cc.x, Cc.z);
      // the craft, landed round the camp, open
      const ships = [[-4.4, 1.6], [4.5, 2.4], [.4, 4.8]].map(([dx, dz], i) => { const s = seedShip(root, 1); const x = Cc.x + dx, z = Cc.z + dz; s.ship.position.set(x, gy(x, z) + 1, z); s.ship.rotation.y = i * 2.1; return { ...s, x, z, y: gy(x, z) + 1, i }; });
      // the dome they raise, strut by strut (lowest first): one set of lines, shown a little more at a time
      const ico = new T.IcosahedronGeometry(2.4, 1), pa = ico.attributes.position, seen = new Set(), edges = [];
      for (let i = 0; i < pa.count; i += 3) for (const [a, b] of [[i, i + 1], [i + 1, i + 2], [i + 2, i]]) {
        const A_ = [pa.getX(a), pa.getY(a), pa.getZ(a)], B_ = [pa.getX(b), pa.getY(b), pa.getZ(b)], key = [A_, B_].map(v => v.map(x => x.toFixed(2)).join()).sort().join('|');
        if (seen.has(key) || Math.min(A_[1], B_[1]) < -.05) continue; seen.add(key); edges.push([A_, B_]);
      }
      edges.sort((e, f) => Math.max(e[0][1], e[1][1]) - Math.max(f[0][1], f[1][1]));
      const eA = new Float32Array(edges.length * 6); edges.forEach(([a, b], k) => eA.set([...a, ...b], k * 6));
      const dG = new T.BufferGeometry(); dG.setAttribute('position', new T.BufferAttribute(eA, 3));
      const domeM = new T.LineBasicMaterial({ color: '#c8f4ff', transparent: true, opacity: .9, depthWrite: false, fog: false });
      const dome = new T.LineSegments(dG, domeM); dome.position.set(Cc.x, gyc, Cc.z); root.add(dome);
      const floorM = new T.MeshBasicMaterial({ color: '#9fe8ff', transparent: true, opacity: .25, depthWrite: false, side: T.DoubleSide, fog: false });
      const floor = new T.Mesh(new T.RingGeometry(2.3, 2.5, 40), floorM); floor.rotation.x = -Math.PI / 2; floor.position.set(Cc.x, gyc + .04, Cc.z); root.add(floor);
      const heart = softLight('#bfeaff', 5, 9); heart.position.set(Cc.x, gyc + 1.2, Cc.z); root.add(heart);
      const core = P(root, A.ico(.22, 1), glow('#e8fbff', 2.4, { fog: false }), [Cc.x, gyc + 1.2, Cc.z], { cast: false });
      // where they show things: toward the keep, a low plinth of glass with something on it
      const Sx = Cc.x - 1.5, Sz = Cc.z - 4.8, plinth = G(root, [Sx, gy(Sx, Sz), Sz]);
      const pm = new T.MeshStandardMaterial({ color: '#dff4ff', transparent: true, opacity: .5, emissive: '#7fc8e8', emissiveIntensity: 1, roughness: .1, flatShading: true, depthWrite: false });
      P(plinth, A.cyl(.42, .5, .32, 8), pm, [0, .16, 0], { cast: false });
      const shown = P(plinth, A.ico(.14, 0), glow('#fff2c8', 2, { fog: false }), [0, .5, 0], { cast: false });
      // the folk: two builders and three scouts, each with its own errands
      const builders = [0, 1].map(i => { const f = glassFolk(root, 'builder', i); return { f, m: glassMover(f, Cc.x + (i ? 1.6 : -1.6), Cc.z + 1.5), i }; });
      const scouts = [2, 3, 4].map(i => { const f = glassFolk(root, 'scout', i); return { f, m: glassMover(f, Cc.x + (i - 3) * 2.5, Cc.z + 3), i, ph: i * 1.9, way: null, until: 0, scan: V() }; });
      const toKeep = Math.PI + .2, keepP = V(-5, 1.5, 0);
      return (t, dt = 1 / 60) => {
        dt = Math.min(dt, .1);
        const { since, left, live } = clock(t), len = since + left;
        // the craft come down, one after another; at the end they lift away
        ships.forEach(s => { const down = smooth(s.i * 2.5, s.i * 2.5 + 7, since), up = 1 - smooth(s.i * 1.5, s.i * 1.5 + 8, left - 4); s.ship.position.y = s.y + (1 - down) * 45 + up * 45;
          s.lid.rotation.z = smooth(s.i * 2.5 + 8, s.i * 2.5 + 10, since) * smooth(10, 12, left) * 1.2; s.inner.intensity = s.lid.rotation.z * 5;
          s.beam.material.opacity = (since > s.i * 2.5 && since < s.i * 2.5 + 7) || (left > 4 && left < 14) ? .1 : 0; s.lightM.emissiveIntensity = 2 + Math.sin(t * 3 + s.i) * .6; });
        const camp = smooth(10, 14, since) * smooth(10, 16, left);           // the camp is up (its folk out, its lights on)
        const built = live ? smooth(20, Math.max(60, len * .6), since) : smooth(16, 110, since);
        dG.setDrawRange(0, Math.floor(built * edges.length) * 2); domeM.opacity = .85 * camp; floorM.opacity = .25 * camp;
        heart.intensity = 5 * camp; core.visible = camp > .05; core.position.y = gyc + 1.2 + Math.sin(t * .8) * .1;
        const gather = pulse(since + 10, 48, 12) > .2 && camp > .9;           // its tell: they gather round what they mean to show
        shown.position.y = .5 + (gather ? .35 + Math.sin(t * 1.5) * .05 : 0); shown.material.emissiveIntensity = gather ? 3.2 : 1.6;
        // builders: from a craft to the dome with a panel of light, set it in (a stoop), and back for another
        builders.forEach(b => {
          const { f, m } = b; f.g.visible = camp > .05; if (!f.g.visible) return;
          const s = ships[b.i], cyc = ((since + b.i * 9) % 20) / 20, toDome = cyc < .5;
          const at = toDome ? [Cc.x + (b.i ? 2.0 : -2.0), Cc.z - .4] : [s.x + (b.i ? -1.5 : 1.5), s.z - .7];
          const d = m.toward(at[0], at[1], .85, dt, 1.2);
          if (d < .3) m.face(toDome ? Math.atan2(Cc.x - m.x, Cc.z - m.z) : m.yaw, dt, 3);
          m.crouch = toDome && d < .3 && cyc > .4 ? .45 : 0;                  // setting the panel in
          f.panel.visible = toDome ? cyc < .44 : cyc > .9;
          m.lookAt(toDome && d < .3 ? dome.position : null, dt);
          m.pose(t, dt);
        });
        // scouts: round the edge of the camp, walking and now and then running, stopping to sweep; or gathered at the plinth
        scouts.forEach(s => {
          const { f, m } = s; f.g.visible = camp > .05; if (!f.g.visible) return;
          let tx, tz, vmax, look = null;
          if (gather) { const a = (s.i - 3) * .9; tx = Sx + Math.sin(a) * 1.4; tz = Sz + Math.cos(a) * 1.4; vmax = 2.6; }
          else {
            if (!s.way || since > s.until || since < s.until - 20) {           // on round the outside of the camp (clear of the craft), a stretch at a time
              s.ang = (s.ang ?? s.i * 2.1) + (Math.random() < .8 ? 1 : -1) * (.5 + Math.random() * .7); const r = 7.6 + Math.random() * 1.6;
              s.way = [Cc.x + Math.cos(s.ang) * r, Cc.z + 1.6 + Math.sin(s.ang) * r * .9]; s.run = Math.random() < .35; s.until = since + 7 + Math.random() * 5; }
            [tx, tz] = s.way; vmax = s.run ? 3 : 1.1;
          }
          const d = m.toward(tx, tz, vmax, dt, 2.5);
          if (d < .3) { if (gather) { m.face(toKeep, dt, 3); look = keepP; } else { const a = since * .8 + s.ph; s.scan.set(m.x + Math.sin(m.yaw + Math.sin(a)) * 4, gy(m.x, m.z), m.z + Math.cos(m.yaw + Math.sin(a)) * 4); look = s.scan; } }
          m.lookAt(look, dt);
          m.pose(t, dt);
          f.beam.material.opacity = gather ? .02 : d < .3 ? .07 : .035;
        });
      };
    },
  },

  // ================================================================ THE GLASSY PEOPLE: THE SOVEREIGN (the last chapter)
  glassy4: {
    name: 'The glassy Sovereign', hour: 18,
    blurb: 'Legendary, and the last chapter of the glassy people. The stars go out across half the sky as something vast eases over the plain; pale curtains of light ripple down around it, and its underside opens like a splitting seed. The plain turns faintly teal and motes drift down like slow snow. Beams come down one after another, and in each an attendant forms out of the light, until ten stand in two lines and raise staffs of light into an arch. A great craft comes down out of it to the end of the avenue, and the one they serve steps out, its crest unfurling, a ring of light behind its head. It walks the arch toward the keep, the ground lighting under each step, as near as its people think wise. There it raises a hand, and a small light drifts to the keep and fades: a greeting. Its crest brightens when it is pleased, and it inclines its head. At the end it all goes back up, and the vast thing leaves in one silent ripple across the sky.',
    view: [[-4, 2.4, 5], [9, 10, 30]],
    knight: { place: 'courtyard', action: 'stand', emote: 'exclaim', note: 'standing as straight as he can' },
    exit() { if (SOV_STARS) { SOV_STARS.o.scale.setScalar(1); SOV_STARS.o.material.size = SOV_STARS.size; SOV_STARS = null; } },
    build(root) {
      const ap = root.userData.appearance || {}, reg = Math.max(-2, Math.min(2, ap.regard || 0)), clock = visitClock(root, 270);
      // the page's stars lie closer than the mothership will: while it is here they are set further out
      // (same place in the sky, same size), so its hull truly hides them
      let stars = null; A.scene.traverse(o => { if (!stars && o.isPoints && o.material?.size === .18) stars = o; });
      if (stars) SOV_STARS = { o: stars, size: stars.material.size };
      // ---- the mothership
      const MS = V(14, 88, 100), msG = G(root), FAR = V(0, 50, 230);
      const hullM = new T.MeshStandardMaterial({ color: '#a9b2bf', metalness: .6, roughness: .35, emissive: '#26384a', emissiveIntensity: .6, flatShading: true, fog: false });
      const seamM = new T.MeshStandardMaterial({ color: '#59616d', metalness: .6, roughness: .4, emissive: '#101820', emissiveIntensity: .5, flatShading: true, fog: false });
      const petalM = hullM.clone(); petalM.side = T.DoubleSide; petalM.emissive = new T.Color('#3d7f86'); petalM.emissiveIntensity = 1.1;   // (lit from the glow inside)
      const lightM = new T.MeshBasicMaterial({ color: '#9ff6ee', fog: false });
      const prof = [[0, -16], [12, -15], [26, -11], [40, -5], [52, 0], [47, 5], [33, 10], [16, 14], [0, 16]].map(([r, y]) => new T.Vector2(r, y));
      msG.add(new T.Mesh(A.facet(new T.LatheGeometry(prof, 28), .8, 3), hullM));
      for (const [r, y, tb] of [[52.3, 0, .9], [40.5, -5, .5], [33.5, 10, .5], [26.5, -11, .4]]) { const ring = new T.Mesh(new T.TorusGeometry(r, tb, 4, 72), seamM); ring.rotation.x = Math.PI / 2; ring.position.y = y; msG.add(ring); }
      const under = new T.Mesh(new T.TorusGeometry(18, .9, 4, 60), lightM); under.rotation.x = Math.PI / 2; under.position.y = -13.6; msG.add(under);
      const portM = new T.MeshBasicMaterial({ color: '#d8fffb', transparent: true, opacity: .6, fog: false });
      const port = new T.Mesh(new T.CircleGeometry(14.5, 40), portM); port.rotation.x = Math.PI / 2; port.position.y = -15.3; msG.add(port);   // the glow inside, where things come down from
      const petals = [];                                                    // the underside: six petals that open like a seed splitting
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + .26, pg = G(msG, [Math.cos(a) * 15.5, -15.8, Math.sin(a) * 15.5], [0, Math.PI - a, 0]), hinge = G(pg);
        sheet(hinge, [[0, 0, -7.9], [0, 0, 7.9], [11.3, .3, -1.6], [11.3, .3, 1.6]], [[0, 2, 1], [1, 2, 3]], petalM); petals.push(hinge); }
      const outer = G(msG); { const o = new T.Mesh(new T.TorusGeometry(62, 1.4, 5, 96), seamM); o.rotation.x = Math.PI / 2; outer.add(o); for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283; P(outer, A.box(4, 2.2, 3.2), seamM, [Math.cos(a) * 62, 0, Math.sin(a) * 62], { rot: [0, -a, 0], cast: false, jitter: .2 }); } merge(outer); }
      outer.rotation.x = .08;
      const NLt = 420, lp = new Float32Array(NLt * 3), lc = new Float32Array(NLt * 3), cc = new T.Color();
      for (let i = 0; i < NLt; i++) { const ring = i % 6, a = (i / NLt) * 6.283 * 7 + ring, r = [20, 28, 36, 44, 50, 62][ring], y = [-14, -12, -8, -4, -1, 0][ring];
        lp.set([Math.cos(a) * r, y - .6, Math.sin(a) * r], i * 3); cc.set(i % 9 ? '#9ff6ee' : '#ffffff'); lc.set([cc.r, cc.g, cc.b], i * 3); }
      const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.BufferAttribute(lp, 3)); lg.setAttribute('color', new T.BufferAttribute(lc, 3));
      msG.add(new T.Points(lg, new T.PointsMaterial({ size: 1.4, vertexColors: true, transparent: true, opacity: .95, fog: false, depthWrite: false })));
      const msGlow = softLight('#9ff6ee', 6, 150); msGlow.position.y = -22; msG.add(msGlow);
      // curtains of light hanging round it, rippling (an aurora of its own)
      const fadeDown = canvasTex(4, 64, (cx, w, h) => { const gr = cx.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.5, '#555555'); gr.addColorStop(1, '#000000'); cx.fillStyle = gr; cx.fillRect(0, 0, w, h); });
      const NCc = 28, curtains = [0, 1, 2, 3].map(ci => {
        const arr = new Float32Array(NCc * 2 * 3), uv = new Float32Array(NCc * 2 * 2), idx = [];
        for (let c = 0; c < NCc; c++) { uv.set([c / (NCc - 1), 1, c / (NCc - 1), 0], c * 4); if (c < NCc - 1) { const a = c * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
        const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.BufferAttribute(arr, 3)); gg.setAttribute('uv', new T.BufferAttribute(uv, 2)); gg.setIndex(idx);
        const mm = new T.MeshBasicMaterial({ color: ci % 2 ? '#a88cff' : '#7ff0d8', alphaMap: fadeDown, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false });
        const mesh = new T.Mesh(gg, mm); mesh.frustumCulled = false; msG.add(mesh);
        return { gg, arr, mm, a0: ci * 1.57 + .3, r: 56 + ci * 4 };
      });
      msG.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; } });
      // ---- the plain while it is here: washed faint teal, motes drifting down like slow snow
      const radial = canvasTex(64, 64, (cx, w) => { const gr = cx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#000000'); cx.fillStyle = gr; cx.fillRect(0, 0, w, w); });
      const washG = new T.PlaneGeometry(70, 70, 28, 28); washG.rotateX(-Math.PI / 2);
      { const wp = washG.attributes.position; for (let i = 0; i < wp.count; i++) { const x = wp.getX(i) + 7, z = wp.getZ(i) + 20; wp.setXYZ(i, x, gy(x, z) + .06, z); } }
      const washM = new T.MeshBasicMaterial({ color: '#5fe0d0', alphaMap: radial, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false });
      const wash = new T.Mesh(washG, washM); wash.frustumCulled = false; root.add(wash);
      const NSn = 260, snA = new Float32Array(NSn * 3), snow = Array.from({ length: NSn }, () => ({ x: -15 + Math.random() * 45, y: Math.random() * 40, z: 4 + Math.random() * 38, sp: .5 + Math.random() * .6, ph: Math.random() * 6 }));
      const snG = new T.BufferGeometry(); snG.setAttribute('position', new T.BufferAttribute(snA, 3));
      const snM = new T.PointsMaterial({ color: '#cffcf4', size: .22, map: puff(), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false });
      const snowP = new T.Points(snG, snM); snowP.frustumCulled = false; root.add(snowP);
      const motes = motePool(root, 260, '#cffaff', .09);
      // ---- the avenue: the great craft settles at its far end; ten attendants in two lines, with staffs of light
      const Sp = V(12, 0, 26), sy = gy(Sp.x, Sp.z) + 2.1, stop = reg >= 1 ? 10 : reg <= -1 ? 17.5 : 12.8, goal = V(2.5, 0, stop);
      const big = seedShip(root, 2.1); big.ship.position.set(Sp.x, sy, Sp.z);
      const dir = V(goal.x - Sp.x, 0, goal.z - Sp.z), len = dir.length(); dir.normalize(); const side = V(-dir.z, 0, dir.x);
      const SPOTS = [];
      for (const u of [.15, .32, .49, .66, .83]) for (const sd of [-1, 1]) { const x = Sp.x + dir.x * len * u + side.x * sd * 1.9, z = Sp.z + dir.z * len * u + side.z * sd * 1.9; SPOTS.push({ x, z, face: Math.atan2(-side.x * sd, -side.z * sd), u }); }
      const staffM = glow('#a8e8e0', 1.3, { fog: false });
      const att = SPOTS.map((sp, i) => {
        const f = glassFolk(root, 'scout', 10 + i); f.beam.visible = false; const m = glassMover(f, sp.x, sp.z, sp.face);
        const staff = G(f.body, [0, .85 * f.k, .25 * f.k]); bone(staff, [0, -.6, 0], [0, 2.6, 0], .025, .02, staffM, 5, 0); P(staff, A.ico(.09, 1), staffM, [0, 2.65, 0], { cast: false, jitter: 0 }); merge(staff);
        staff.traverse(o => { if (o.isMesh) o.castShadow = false; });
        return { f, m, sp, i, staff, st: {} };
      });
      const beamM = () => new T.MeshBasicMaterial({ color: '#bffaf4', transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false });
      const beams = [...SPOTS.map(sp => V(sp.x, gy(sp.x, sp.z), sp.z)), V(Sp.x, gy(Sp.x, Sp.z), Sp.z)].map(foot => { const b = new T.Mesh(new T.CylinderGeometry(.35, .95, 1, 12, 1, true), beamM()); b.frustumCulled = false; root.add(b); return { b, foot }; });
      const top = V(), mid = V(), tmp = V();
      const placeBeam = ({ b, foot }, op, from) => { b.visible = op > .01; if (!b.visible) return; from.y -= 16; mid.copy(from).add(foot).multiplyScalar(.5); b.position.copy(mid); b.scale.set(1, from.distanceTo(foot), 1); b.quaternion.setFromUnitVectors(V(0, 1, 0), from.clone().sub(foot).normalize()); b.material.opacity = op; };
      // ---- the Sovereign: its crest folded until it steps into the light; a ring of light behind its head
      const sov = glassFolk(root, 'sovereign', 7), S = glassMover(sov, Sp.x, Sp.z, Math.atan2(dir.x, dir.z));
      const halo = new T.Mesh(new T.TorusGeometry(.3 * sov.k, .005 * sov.k, 3, 48), new T.MeshBasicMaterial({ color: '#cfeff0', transparent: true, opacity: .55, depthWrite: false, blending: T.AdditiveBlending, fog: false })); halo.position.set(0, .12 * sov.k, -.2 * sov.k); sov.head.add(halo);   // (a thin, faint ring)
      // its footsteps light the ground, and stay faintly lit behind it
      const stepM = () => new T.MeshBasicMaterial({ color: '#bff8f0', transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false });
      const steps = Array.from({ length: 44 }, () => { const m = new T.Mesh(new T.CircleGeometry(.2, 10), stepM()); m.rotation.x = -Math.PI / 2; m.visible = false; root.add(m); return { m, born: -99 }; });
      let stepN = 0, lastStep = 0;
      // the greeting: a small light from its raised hand, drifting to the keep and fading there
      const greet = new T.Mesh(A.ico(.12, 1), glow('#f2fffc', 3, { fog: false })); greet.visible = false; root.add(greet);
      const greetGlow = softLight('#cffcf4', 0, 2.2); greet.add(greetGlow);
      const keepWall = V(-1, 3.3, 4.7), from = V(), skyGlow = softLight('#cfeeff', 0, 60); root.add(skyGlow);
      const ripple = new T.Mesh(new T.RingGeometry(.82, 1, 64), new T.MeshBasicMaterial({ color: '#d8fff8', transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false }));
      ripple.frustumCulled = false; root.add(ripple);
      let first = true, lastSince = -1, greetT = -1, greeted = false;
      return (t, dt = 1 / 60) => {
        dt = Math.min(dt, .1);
        const { since, left } = clock(t);
        if (since < lastSince) { greeted = false; greetT = -1; stepN = 0; steps.forEach(s => { s.m.visible = false; }); att.forEach(a => { a.st = {}; }); S.x = S.px = Sp.x; S.z = S.pz = Sp.z; }   // (the preview starts over)
        lastSince = since;
        // ---- the mothership: in slowly; at the very end, it pulls its light in and goes in one ripple
        const inK = smooth(0, 22, since) * smooth(1.5, 6, left), gone = 1 - smooth(1.5, 6, left);
        msG.position.copy(MS).addScaledVector(FAR, 1 - smooth(0, 22, since)); msG.position.y += gone * 120; msG.rotation.y = t * .01; outer.rotation.y = -t * .03;
        msG.visible = inK > .002 || since < 22;
        if (stars) { const far = inK > .002 ? 3.6 : 1; stars.scale.setScalar(far); stars.material.size = SOV_STARS.size * far; }
        under.material.color.setHSL(.47, .9, .7 + Math.sin(t * 1.3) * .08);
        const pull = smooth(9, 6, left) * (1 - gone);                      // drawing its light in, just before it goes
        portM.opacity = .35 + .5 * smooth(20, 30, since) + pull * .6; port.scale.setScalar(1 - pull * .6);
        const open = smooth(20, 30, since) * smooth(12, 18, left);
        petals.forEach((p, i) => { p.rotation.z = -open * (1.05 + Math.sin(i * 2.1) * .08); });
        skyGlow.position.set(MS.x * .6, 40, MS.z * .5); skyGlow.intensity = 4 * inK + pull * 6;
        const ripK = Math.min(1, Math.max(0, (6 - left) / 4.5));            // the ripple across the sky as it leaves
        ripple.visible = ripK > 0 && ripK < 1; if (ripple.visible) { ripple.position.copy(MS).lerp(A.camera.position, .45); ripple.lookAt(A.camera.position); ripple.scale.setScalar(3 + ripK * 70); ripple.material.opacity = .85 * (1 - ripK) ** 1.5; }   // (in front of the hull, toward whoever watches)
        // ---- curtains, the teal plain, the slow snow
        const aur = smooth(8, 28, since) * smooth(10, 20, left);
        curtains.forEach((c, ci) => {
          c.mm.opacity = aur * .3;
          for (let k = 0; k < NCc; k++) { const a = c.a0 + (k / (NCc - 1)) * 1.4, r = c.r + Math.sin(k * .45 + t * .35 + ci) * 3.2 + Math.sin(k * .17 - t * .2) * 2;
            const x = Math.cos(a) * r, z = Math.sin(a) * r, sway = Math.sin(k * .3 + t * .5 + ci * 2) * 2.5; c.arr.set([x, -4, z, x + sway, -62, z + sway * .5], k * 6); }
          c.gg.attributes.position.needsUpdate = true;
        });
        const plain = smooth(12, 30, since) * smooth(10, 20, left);
        washM.opacity = plain * .16; snM.opacity = plain * .75;
        if (plain > .01) { snow.forEach((q, i) => { q.y -= q.sp * dt; if (q.y < gy(q.x, q.z)) q.y += 40; snA.set([q.x + Math.sin(t * .5 + q.ph) * .4, q.y, q.z + Math.cos(t * .4 + q.ph) * .4], i * 3); }); snG.attributes.position.needsUpdate = true; }
        // ---- the attendants: down the beams one by one, forming out of the light; staffs raised into an arch as the great craft comes
        const raise = smooth(56, 62, since) * smooth(46, 50, left);
        const sp = sov.g.position, msBottom = msG.position.y - 16;
        att.forEach(a => {
          const dT = 26 + a.i * 2.4, uT = 30 - a.i * 1.2;
          const k = Math.min(smooth(dT, dT + 4, since), 1 - smooth(uT, uT - 4, left));
          beamArrive(a.st, a.f, a.m, k, motes, dt, Math.max(4, msBottom - gy(a.sp.x, a.sp.z)));
          a.f.g.visible = since > dT - .1 && left > uT - 4.1;
          placeBeam(beams[a.i], (since > dT - 1 && since < dT + 4.5) || (left < uT + 1 && left > uT - 4.5) ? .085 : 0, top.copy(msG.position));
          a.m.face(a.sp.face, dt, 2);
          const near = sov.g.visible ? smooth(4, 1.5, Math.hypot(sp.x - a.m.x, sp.z - a.m.z)) : 0;
          a.m.lookAt(sov.g.visible ? top.set(sp.x, sp.y + 2.5, sp.z) : null, dt, 2);
          a.m.pose(t, dt);
          a.f.body.rotation.x += near * .3;
          a.staff.visible = a.f.g.visible && a.m.y < .1; a.staff.rotation.x = .12 + raise * .6; a.f.arms[0].sh.rotation.x = -.5 - raise * 1.0; a.f.arms[1].sh.rotation.x = -.5 - raise * 1.0;
        });
        // ---- the great craft: down the middle beam out of the mothership, and back up at the end
        const cd = smooth(52, 64, since), cu = smooth(42, 30, left);
        big.ship.position.y = sy + (msBottom - sy) * Math.max(1 - cd, cu); big.ship.rotation.y = t * .05;
        big.lid.rotation.z = smooth(64, 67, since) * smooth(43, 46, left) * 1.1; big.inner.intensity = big.lid.rotation.z * 6;
        big.lightM.emissiveIntensity = 2.2 + Math.sin(t * 2) * .5;
        placeBeam(beams[10], (since > 50 && since < 65) || (left < 43 && left > 29) ? .1 : 0, top.copy(msG.position));
        // ---- the Sovereign
        const out = since > 70 && left > 80;
        if (first && out && since > 125) {                                 // (someone looking in late finds it already standing there)
          S.x = S.px = goal.x; S.z = S.pz = goal.z; S.yaw = Math.PI; greeted = true;
          for (let i = 0; i < 16; i++) { const u = i / 15, s = steps[stepN++ % steps.length], sd = i % 2 ? 1 : -1; s.m.position.set(Sp.x + (goal.x - Sp.x) * u + side.x * sd * .2, 0, Sp.z + (goal.z - Sp.z) * u + side.z * sd * .2); s.m.position.y = gy(s.m.position.x, s.m.position.z) + .04; s.m.visible = true; s.born = t - 20; }
        }
        first = false;
        sov.g.visible = since > 66.5 && left > 46;
        const tgt = out ? goal : Sp, d = S.toward(tgt.x, tgt.z, .55, dt, .5);
        if (d < .3) S.face(out ? Math.PI : Math.atan2(dir.x, dir.z), dt, 1);
        const unfurl = smooth(67, 71, since); sov.crest.scale.set(.15 + .85 * unfurl, .3 + .7 * unfurl, 1);
        halo.scale.setScalar(Math.max(.001, smooth(70, 72.5, since))); halo.rotation.z = t * .2;
        const arrived = out && d < .3;
        if (arrived && !greeted && greetT < 0) greetT = 0;
        let lift = 0;
        if (greetT >= 0) {                                                 // the greeting: the hand rises, a small light goes to the keep
          greetT += dt; lift = smooth(0, 1.5, greetT) * (1 - smooth(5, 6.5, greetT));
          if (greetT > 1.5 && greetT < 9) {
            const u = smooth(1.5, 8.5, greetT); sov.arms[1].el.getWorldPosition(from);
            greet.visible = true; greet.position.copy(from).lerp(keepWall, u); greet.position.y += Math.sin(u * Math.PI) * 2.5;
            greet.scale.setScalar(1 - smooth(7.8, 9, greetT) * .9); greetGlow.intensity = 2.5 * (1 - smooth(8, 9, greetT));
            if (Math.random() < .5) motes.emit(greet.position.x, greet.position.y, greet.position.z, (Math.random() - .5) * .3, -.2, (Math.random() - .5) * .3, .8);
          } else greet.visible = false;
          if (greetT > 9) { greetT = -1; greeted = true; }
        }
        const bow = arrived && greeted ? pulse(since, 32, 5) : 0;
        S.lookAt(bow > .15 ? top.set(S.x + Math.sin(S.yaw) * 2.5, gy(S.x, S.z), S.z + Math.cos(S.yaw) * 2.5) : lift > .1 ? keepWall : null, dt, 2);
        S.pose(t, dt);
        sov.body.rotation.x += bow * .14;
        if (lift > 0) { sov.arms[1].sh.rotation.x = -1.35 * lift; sov.arms[1].el.rotation.x = -.25 * lift; }
        sov.crestM.emissiveIntensity = 1.4 + bow * 2.2 + lift * 1.2 + (1 - unfurl) * 2 * smooth(66.5, 67, since) + Math.sin(t * 1.2) * .2; sov.crest.rotation.z = Math.sin(t * .4) * .03;
        // footsteps: a mark of light where each foot comes down, fading to a faint glow that stays
        if (sov.g.visible && S.spd > .1 && Math.floor(S.phase / Math.PI) !== lastStep) {
          lastStep = Math.floor(S.phase / Math.PI); const s = steps[stepN++ % steps.length], sd = lastStep % 2 ? 1 : -1;
          s.m.position.set(S.x + Math.cos(S.yaw) * sd * .2, 0, S.z - Math.sin(S.yaw) * sd * .2); s.m.position.y = gy(s.m.position.x, s.m.position.z) + .04; s.m.visible = true; s.born = t;
        }
        const keepLit = smooth(10, 20, left);
        steps.forEach(s => { if (s.m.visible) { const age = t - s.born; s.m.material.opacity = (.25 + .65 * Math.exp(-age * .6)) * keepLit; } });
        motes.tick(dt);
      };
    },
  },

  // ================================================================ SMALL LIFE (the animals: brain/animals.py says who is about)
  animals: {
    name: 'Small life', hour: 13,
    blurb: 'The ordinary animals about the keep, decided hour by hour by the time of day, the season and the weather: crows on the walls, small birds in the dead tree, hares on the plain, deer at the forest edge, butterflies in summer, an owl and bats at night, a fox on the plain, fish in the lake, and now and then a stray cat. They shy away from anything big or hostile, and from the knight if he comes close.',
    view: [[-6, 2.6, 6], [-11, 1.2, -2]],
    variants: [['crows', 'crows'], ['songbirds', 'small birds'], ['hares', 'hares'], ['deer', 'deer'], ['butterflies', 'butterflies'], ['owl', 'an owl'], ['bats', 'bats'], ['fox', 'a fox'], ['fish', 'fish'], ['cat', 'a stray cat']],
    knight: { place: 'courtyard', action: 'stand', emote: 'dots', note: 'watching the animals' },
    build(root) {
      const kind = root.userData.appearance?.variant?.kind || 'crows';
      const VIEW = { crows: [[-9, 2.4, 3], [-11, 1.4, -4]], songbirds: [[-6.6, 1.6, .6], [-8.8, 1.3, -1.6]], hares: [[-2, 2, 8.5], [2, .4, 15]], deer: [[-21, 2, 6], [-31, 1.1, 2]],
        butterflies: [[-7.5, 1.6, 3], [-11, .9, 0]], owl: [[-7, 1.9, .2], [-8.85, 2.4, -2.15]], bats: [[-9, 1.6, 7], [-6, 5, 0]], fox: [[-12, 2.2, 3.5], [-10, .3, 9]], fish: [[18, 2.5, 13], [26, -.3, 22]], cat: [[-9.5, 1.9, -1.2], [-11, 1.3, -4.3]] };
      const [[cx, cy, cz], [tx, ty, tz]] = VIEW[kind];                   // (heights above the ground there: the land is not flat)
      this.view = [[cx, Math.max(cy, gy(cx, cz) + 1.6), cz], [tx, gy(tx, tz) + Math.max(.4, ty - gy(tx, tz) > 0 ? ty - Math.max(0, gy(tx, tz)) : .6), tz]];
      this.hour = { owl: 22, bats: 18, fox: 22, deer: 18, hares: 18 }[kind] ?? 13;
      return ANIMALS[kind](root, { scared: () => false });
    },
  },
};
// ------------------------------------------------------------------ the visiting peoples
// THE TIDEKIN: smooth otter-and-newt folk of the lake, dark green-bronze with pale bellies, who carry
// lit shells as lanterns. Curious, shy and gentle.
function tidekin(parent, pos, s = 1, elder = false, seed = 1) {
  const r = A.rand(seed);
  const skin = A.mat(elder ? '#5c6a58' : '#3f6448', .25, .4), belly = A.mat(elder ? '#d8d2bf' : '#cfc6a6', 0, .6), dark = A.mat('#0c0f0d', .3, .2);
  const g = G(parent, pos); g.scale.setScalar(s);
  const body = G(g);
  P(body, A.ico(.3, 1), skin, [0, .78, 0], { scale: [.82, 1.45, .74] });
  P(body, A.ico(.26, 1), belly, [0, .74, .08], { scale: [.7, 1.3, .6] });
  const tail = chain(body, 5, .22, .11, .03, skin); tail[0].position.set(0, .42, -.18); tail[0].rotation.x = -2.0; tail[0].scale.set(.6, 1, 1);   // a newt's tail, flattened
  for (const sx of [-1, 1]) { bone(body, [sx * .14, .45, 0], [sx * .17, .2, .06], .07, .05, skin); bone(body, [sx * .17, .2, .06], [sx * .16, .02, .12], .05, .04, skin); P(body, A.ico(.06, 0), skin, [sx * .16, .01, .2], { scale: [1.1, .35, 1.7] }); }
  // the head: broad and flat, a short soft muzzle, small dark eyes, round ears like an otter's
  const head = G(body, [0, 1.28, .06]);
  P(head, A.ico(.2, 1), skin, [0, 0, 0], { scale: [1.05, .78, 1.15] });
  P(head, A.ico(.12, 1), belly, [0, -.05, .17], { scale: [1.1, .7, 1] });
  P(head, A.ico(.025, 0), dark, [0, -.01, .29]);
  for (const sx of [-1, 1]) {
    P(head, A.ico(.032, 1), dark, [sx * .11, .05, .16]);
    P(head, A.ico(.045, 0), skin, [sx * .16, .12, -.05], { scale: [1, .8, .6] });
    for (let w = 0; w < 2; w++) bone(head, [sx * .06, -.05, .24], [sx * .22, -.07 + w * .04, .27], .004, .002, belly, 3);   // whiskers
  }
  const jaw = G(head, [0, -.1, .1]); P(jaw, A.ico(.09, 0), belly, [0, -.02, .08], { scale: [1, .45, 1.1] });
  const arm = sx => { const a = G(body, [sx * .2, 1.02, .05]); bone(a, [0, 0, 0], [sx * .05, -.28, .1], .05, .04, skin); bone(a, [sx * .05, -.28, .1], [sx * .04, -.48, .2], .04, .03, skin); P(a, A.ico(.05, 0), skin, [sx * .04, -.5, .22], { scale: [1.3, .6, 1.2] }); return a; };
  const arms = { L: arm(-1), R: arm(1) };
  // a spiral shell on a cord, lit from inside: their lantern
  const shellM = glow('#ffd9a0', 1.6), lantern = G(arms.R, [.04, -.52, .24]);
  bone(lantern, [0, 0, 0], [0, -.16, 0], .004, .004, dark, 3);
  P(lantern, new T.ConeGeometry(.07, .2, 9), shellM, [0, -.27, 0], { rot: [Math.PI, 0, 0], cast: false });
  for (let k = 0; k < 3; k++) P(lantern, new T.TorusGeometry(.055 - k * .013, .01, 4, 10), A.mat('#e8d6b0', 0, .5), [0, -.2 - k * .045, 0], { rot: [Math.PI / 2, 0, 0] });
  const glowL = softLight('#ffcf8a', 1.8, 1.4); glowL.position.y = -.27; lantern.add(glowL);
  if (elder) {                                                         // the eldest: barnacled, with a staff of driftwood
    for (let k = 0; k < 18; k++) { const a = Math.PI + (r() - .5) * 3.4, y = .5 + r() * .95; P(body, new T.CylinderGeometry(.018, .035, .035, 6), A.mat('#d4cdb8', 0, .8), [Math.sin(a) * .23, y, Math.cos(a) * .2], { rot: [Math.PI / 2 * Math.sign(Math.cos(a)), 0, 0] }); }
    const staff = G(arms.L, [-.04, -.5, .22]); bone(staff, [0, .8, 0], [0, -.95, 0], .025, .03, A.M.woodL);
  }
  return { g, body, head, jaw, arms, tail, lantern, shellM };
}
// THE BURROWFOLK: mole-and-badger diggers in leather aprons, lantern-mushrooms growing on their backs.
function burrower(parent, pos, s = 1, o = {}) {
  const fur = A.mat(o.mother ? '#5c524a' : '#4a3f35', 0, .95), pale = A.mat('#e8e2d6', 0, .9), pink = A.mat('#d99a9a', 0, .6), dark = A.mat('#0d0b0a', .2, .3), claw = A.mat('#d8ccb0', .1, .5), apron = A.mat('#7a4e2c', 0, .8);
  const g = G(parent, pos); g.scale.setScalar(s);
  const body = G(g);
  P(body, A.ico(.38, 1), fur, [0, .55, 0], { scale: [1, 1.15, .9] });
  if (!o.mother) {                                                     // a leather apron, with a pocket and a trowel in it
    P(body, A.box(.48, .55, .04), apron, [0, .5, .33], { rot: [.12, 0, 0] });
    for (const sx of [-1, 1]) bone(body, [sx * .2, .8, .3], [0, 1.0, .2], .012, .012, apron, 4);
    P(body, A.box(.16, .12, .03), apron, [.1, .42, .37], { rot: [.12, 0, 0] }); bone(body, [.12, .44, .38], [.14, .62, .36], .012, .01, A.M.woodL, 4);
  }
  const head = G(body, [0, 1.02, .12]);                                // a long snout, a pink nose, small eyes, a white stripe like a badger's
  P(head, A.ico(.24, 1), fur, [0, 0, 0], { scale: [1, .85, 1.1] });
  P(head, new T.ConeGeometry(.12, .3, 8), fur, [0, -.04, .3], { rot: [Math.PI / 2, 0, 0] });
  const nose = P(head, A.ico(.055, 1), pink, [0, -.04, .46]);
  P(head, A.box(.07, .02, .42), pale, [0, .19, .05], { rot: [-.15, 0, 0] });
  for (const sx of [-1, 1]) { P(head, A.ico(.028, 0), o.mother ? A.mat('#cfd4d8', 0, .4) : dark, [sx * .11, .07, .2]); P(head, A.ico(.06, 0), fur, [sx * .17, .15, -.05], { scale: [1, .7, .5] }); }   // (the Mother's eyes are milky: she is nearly blind)
  const arm = sx => { const a = G(body, [sx * .32, .72, .12]); bone(a, [0, 0, 0], [sx * .12, -.28, .12], .08, .07, fur); const h = G(a, [sx * .12, -.32, .14]); P(h, A.ico(.09, 0), fur, [0, 0, 0], { scale: [1.3, .6, 1] }); for (let c = 0; c < 3; c++) P(h, new T.ConeGeometry(.025, .16, 5), claw, [(c - 1) * .06, -.05, .1], { rot: [1.9, 0, 0] }); return a; };
  const arms = { L: arm(-1), R: arm(1) };
  for (const sx of [-1, 1]) P(body, A.ico(.11, 0), fur, [sx * .18, .1, .05], { scale: [1, .8, 1.3] });
  const caps = [], n = o.mother ? 24 : o.young ? 3 : 6, r = A.rand(o.seed || 5);   // lantern-mushrooms on its back
  for (let i = 0; i < n; i++) {
    const a = (r() - .5) * 2.4, y = .4 + r() * .55, st = G(body, [Math.sin(a) * .3, y + .1, -Math.cos(a) * .3 - .02]);
    bone(st, [0, 0, 0], [0, .12, -.02], .015, .012, pale, 5);
    const capM = glow(['#ffd08a', '#9fe8c8', '#c8b4ff'][i % 3], 1.6);
    P(st, new T.SphereGeometry(.07, 8, 5, 0, 6.3, 0, 1.5), capM, [0, .12, -.02], { scale: [1, .7, 1], cast: false }); caps.push(capM);
  }
  const lamp = softLight('#ffd8a0', o.mother ? 3 : 1.4, o.mother ? 2.2 : 1.6); lamp.position.set(0, .95, -.4); body.add(lamp);
  return { g, body, head, nose, arms, caps };
}
function dirtMound(parent, x, z, rr, hole = true) {   // a heap of fresh earth, and the dark of a tunnel in it
  const y = x > -17.2 && x < -5.3 && Math.abs(z) < 4.3 ? 0 : gy(x, z);   // (the courtyard floor is level)
  P(parent, A.ico(rr, 1), A.mat('#4a3826', 0, 1), [x, y - rr * .3, z], { scale: [1, .6, 1], jitter: .03 });
  if (hole) { const h = new T.Mesh(new T.CircleGeometry(rr * .45, 10), new T.MeshBasicMaterial({ color: '#050403' })); h.rotation.x = -Math.PI / 2; h.position.set(x, y + rr * .31, z); parent.add(h); }
  return y + rr * .3;
}
// THE KITEMAKERS: light, long-limbed gliders with silk between arm and leg, patterned like kites, who
// ride the wind fronts. The Wind-Chief is the largest, its silk ragged and its patterns very old.
function kiteFolk(parent, s = 1, o = {}) {
  const r = A.rand(o.seed || 9);
  const skin = A.mat(o.chief ? '#9aa0a6' : '#b9c2c9', 0, .7), dark = A.mat('#0e1014', .2, .3);
  const PAL = [['#c8443a', '#e8c068'], ['#2f7f8a', '#efe2c0'], ['#d9862c', '#3d5a8a'], ['#7a3f8a', '#e6d6a8'], ['#3f7a4a', '#e8b04a']], [c1, c2] = PAL[Math.floor(r() * PAL.length)];
  const tex = canvasTex(128, 128, (c, w) => {
    c.fillStyle = c1; c.fillRect(0, 0, w, w);
    c.fillStyle = c2; c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w, w / 2); c.lineTo(w / 2, w); c.lineTo(0, w / 2); c.closePath(); c.fill();
    c.strokeStyle = '#1a1410'; c.lineWidth = 3; c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, w); c.moveTo(0, w / 2); c.lineTo(w, w / 2); c.stroke(); c.strokeRect(1, 1, w - 2, w - 2);
    if (o.chief) { c.globalAlpha = .4; c.fillStyle = '#8a8070'; c.fillRect(0, 0, w, w); c.globalAlpha = 1; c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000'; for (let k = 0; k < 8; k++) { c.beginPath(); c.arc(r() * w, r() * w, 4 + r() * 9, 0, 6.3); c.fill(); } }   // faded and torn
  });
  const memM = new T.MeshStandardMaterial({ map: tex, side: T.DoubleSide, roughness: .8, alphaTest: .5, flatShading: true });
  const g = G(parent), body = G(g); g.scale.setScalar(s);
  P(body, A.ico(.16, 1), skin, [0, 0, 0], { scale: [.85, 2.6, .6] });
  const head = G(body, [0, .55, .02]); P(head, A.ico(.11, 1), skin, [0, .05, 0], { scale: [.8, 1.25, .9] });
  for (const sx of [-1, 1]) P(head, A.ico(.025, 1), dark, [sx * .045, .07, .085], { scale: [1, .6, .5] });   // calm dark eyes
  const crest = [], crestM = A.mat(o.chief ? '#d8d0c0' : c2, 0, .8);
  for (let k = 0; k < 5; k++) { const f = G(head, [(k - 2) * .025, .15, -.04]); bone(f, [0, 0, 0], [0, .06, -.3], .006, .002, crestM, 3); crest.push(f); }   // fine filaments streaming back
  const limb = (at, len) => { const a = G(body, at); bone(a, [0, 0, 0], [0, -len, 0], .025, .02, skin); const b = G(a, [0, -len, 0]); bone(b, [0, 0, 0], [0, -len, 0], .02, .014, skin); return { a, b, tip: G(b, [0, -len, 0]) }; };
  const L = { armL: limb([-.1, .32, 0], .42), armR: limb([.1, .32, 0], .42), legL: limb([-.07, -.38, 0], .4), legR: limb([.07, -.38, 0], .4) };
  const sheets = [-1, 1].map(sx => {                                   // the silk, rebuilt each frame between arm and leg
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(new Float32Array(18), 3)); geo.setAttribute('uv', new T.BufferAttribute(new Float32Array([0, 1, .5, 1, 1, 1, 1, 0, .5, 0, 0, 0]), 2)); geo.setIndex([0, 1, 4, 0, 4, 5, 1, 2, 3, 1, 3, 4]);
    const m = new T.Mesh(geo, memM); m.castShadow = true; m.frustumCulled = false; body.add(m); return { geo, sx };
  });
  const tailM = A.mat(c1, 0, .8), tails = [-1, 1].map(sx => { const ch = chain(body, 6, .22, .02, .01, tailM); ch[0].position.set(sx * .04, -.4, -.05); return ch; });   // two kite tails
  const v = new T.Vector3(), local = q => { q.getWorldPosition(v); return body.worldToLocal(v).toArray(); };
  return {
    g, body, head,
    pose(spread, t) {
      for (const [k, sx] of [['armL', -1], ['armR', 1]]) { L[k].a.rotation.set(0, 0, sx * (.12 + spread * 1.42)); L[k].b.rotation.set(0, 0, sx * (.35 - spread * .3)); }
      for (const [k, sx] of [['legL', -1], ['legR', 1]]) { L[k].a.rotation.set(0, 0, sx * (.04 + spread * .62)); L[k].b.rotation.set(0, 0, -sx * .1 * spread); }
      g.updateMatrixWorld(true);
      for (const S of sheets) { const [a, l] = S.sx < 0 ? [L.armL, L.legL] : [L.armR, L.legR], arr = S.geo.attributes.position.array; [a.a, a.b, a.tip, l.tip, l.b, l.a].forEach((q, i) => arr.set(local(q), i * 3)); S.geo.attributes.position.needsUpdate = true; S.geo.computeVertexNormals(); }
      tails.forEach((ch, i) => ch.forEach((j, k) => { j.rotation.x = .25 + Math.sin(t * 6 + k * .8 + i) * .25 * (.4 + spread); j.rotation.z = Math.sin(t * 4.3 + k + i * 2) * .15; }));
      crest.forEach((f, k) => { f.rotation.x = Math.sin(t * 7 + k) * .15 * (.4 + spread); });
    },
  };
}

// ------------------------------------------------------------------ the abyssals
// Their light shows their mood: calm (deep teal), uneasy (violet), about to act (pale, flickering).
const ABYSS_MOOD = ['#2fd3c4', '#8a5cff', '#f2e8c8'];
// The erratic motor: every part of an abyssal holds, then snaps (or, now and then, drifts at the wrong
// speed) somewhere new, each part on its own clock. The rhythm of the holds is the other way to read
// its mood: calm, long holds; uneasy, any length at all; about to act, a fast steady beat.
function erratic(seed) {
  const r = A.rand(seed), ch = {};
  let mood = 0, moodUntil = 0;
  const cur = (c, t) => { const k = Math.min(1, Math.max(0, (t - c.t0) / c.dur)); return c.from + (c.to - c.from) * (c.smooth ? k * k * (3 - 2 * k) : k); };
  return {
    r, get mood() { return mood; },
    tick(t) { if (t > moodUntil) { mood = [0, 0, 1, 1, 2][Math.floor(r() * 5)]; moodUntil = t + 7 + r() * 8; } },
    // one channel, between lo and hi: 'snap' (mostly snaps, sometimes a slow drift), 'drift' (always slow), 'burst' (sudden dashes)
    v(name, lo, hi, t, how = 'snap') {
      let c = ch[name]; if (!c) c = ch[name] = { from: (lo + hi) / 2, to: (lo + hi) / 2, t0: 0, dur: .1, next: r() * 2, smooth: false };
      if (t > c.next) {
        c.from = cur(c, t); c.to = lo + r() * (hi - lo); c.t0 = t;
        const slow = how === 'drift' || (how === 'snap' && r() < .15);
        c.dur = how === 'burst' ? Math.abs(c.to - c.from) / (3 + r() * 2) + .05 : slow ? 1.2 + r() * 2.5 : .05 + r() * .08; c.smooth = slow;
        c.next = t + c.dur + (mood === 0 ? 1.8 + r() * 2.6 : mood === 1 ? .15 + r() * 3 : .4 + r() * .12);
      }
      return cur(c, t);
    },
    moving(name, t) { const c = ch[name]; return !!c && t >= c.t0 && t < c.t0 + c.dur; },
    tremor(t, amp) { return (Math.sin(t * 47) * .6 + Math.sin(t * 73 + 1) * .4) * amp; },
  };
}
const abyssSkin = shallow => new T.MeshStandardMaterial({ color: '#06070b', roughness: .22, metalness: .35, flatShading: true, transparent: shallow, opacity: shallow ? .8 : 1 });
function abyssHalo(parent, y, size, op) {   // the dark around them: it eats the light
  const sp = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: '#000000', transparent: true, opacity: op, depthWrite: false, fog: false }));
  sp.position.y = y; sp.scale.setScalar(size); parent.add(sp); return sp;
}
function abyssFray(parent, n, y0, h, rad) {   // the shallow ones are fraying away: they cannot stay long
  const pos = new Float32Array(n * 3), geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  parent.add(new T.Points(geo, new T.PointsMaterial({ color: '#0a0812', size: .07, transparent: true, opacity: .8, depthWrite: false })));
  return t => { for (let i = 0; i < n; i++) { const k = (t * .25 + i / n) % 1, a = i * 2.39; pos.set([Math.cos(a) * rad * (1 + k), y0 + (i % 5) / 5 * h + k * 1.4, Math.sin(a) * rad * (1 + k)], i * 3); } geo.attributes.position.needsUpdate = true; };
}
function abyssLight(E, mats, lamp) {   // the mood light: its colour; when it is about to act, it flickers
  const c = ABYSS_MOOD[E.mood], fl = E.mood === 2 && Math.random() < .3 ? .25 : 1;
  for (const m of mats) { m.color.set(c); m.emissive.set(c); m.emissiveIntensity = 2.2 * fl; }
  if (lamp) { lamp.material.color.set(c); lamp.intensity = 2.4 * fl; }
}
// THE HANGING DARK: hangs upright a little above the ground, ribs open at the front with the light
// moving inside, a ragged skin from its shoulders, arms long enough to drag, a smooth bulb of a head.
function abyssHanging(parent, pos, deep, seed) {
  const E = erratic(seed), sh = !deep, skin = abyssSkin(sh), voidM = new T.MeshBasicMaterial({ color: '#000000' }), light = glow(ABYSS_MOOD[0], 2.2);
  const g = G(parent, pos); g.scale.setScalar(deep ? 1.3 : .85);
  const body = G(g, [0, .45, 0]);
  for (let i = 0; i < 9; i++) P(body, A.ico(.075 - i * .004, 0), skin, [0, .25 + i * .26, -.06]);   // the spine, its knuckles showing
  for (let i = 0; i < 5; i++) {                                         // ribs, open at the front
    const y = 1.0 + i * .25, w = .3 - Math.abs(i - 1.6) * .035;
    for (const sx of [-1, 1]) { bone(body, [0, y, -.06], [sx * w, y - .05, .06], .026, .02, skin, 5); bone(body, [sx * w, y - .05, .06], [sx * w * .55, y - .13, .24], .02, .012, skin, 5); }
  }
  P(body, A.ico(.11, 1), light, [0, 1.45, .03], { cast: false });
  const lamp = softLight(ABYSS_MOOD[0], 2.4, 2.6); lamp.position.set(0, 1.45, .05); body.add(lamp);
  // a ragged skin hanging from its shoulders in long strips, open at the front, the ribs showing between
  const shroudM = ds('#020204', 0, .95); if (sh) { shroudM.transparent = true; shroudM.opacity = .8; }
  const strips = [], rr = A.rand(seed + 3);
  for (let i = 0; i < 15; i++) {                                        // thin tatters, each narrowing to a point
    const a = .95 + i / 14 * (Math.PI * 2 - 1.9), len = 1.5 + rr() * 1.1, st = G(body, [Math.sin(a) * .28, 2.42, Math.cos(a) * .28 - .03], [0, a, 0]);
    const geo = new T.PlaneGeometry(.11 + rr() * .05, len, 1, 4), gp = geo.attributes.position;
    for (let v = 0; v < gp.count; v++) { const k = (len / 2 - gp.getY(v)) / len; gp.setX(v, gp.getX(v) * (1 - k * .9)); }
    const m = new T.Mesh(geo, shroudM); m.position.set(0, -len / 2, .04); m.rotation.x = -.05; m.castShadow = true; st.add(m);
    strips.push({ st, ph: rr() * 6 });
  }
  const neck = G(body, [0, 2.5, -.02]);                                // the neck droops forward; the head has nothing on it at all
  bone(neck, [0, 0, 0], [0, .3, .2], .05, .04, skin); bone(neck, [0, .3, .2], [0, .32, .48], .04, .035, skin);
  const head = G(neck, [0, .32, .48], [1.1, 0, 0]);                     // it hangs its head forward and down
  P(head, A.ico(.16, 2), voidM, [0, .18, 0], { scale: [.75, 1.8, .8], cast: false });
  const arms = [];
  const arm = (sx, y, len) => {
    const s0 = G(body, [sx * .3, y, 0]); bone(s0, [0, 0, 0], [sx * .05, -len, .05], .04, .03, skin);
    const e = G(s0, [sx * .05, -len, .05]); bone(e, [0, 0, 0], [0, -len, .1], .03, .022, skin);
    for (let f = 0; f < 3; f++) bone(e, [0, -len, .1], [(f - 1) * .07, -len - .35, .2], .014, .006, skin, 4);
    arms.push({ s0, e, sx });
  };
  arm(-1, 2.3, 1.05); arm(1, 2.3, 1.05); if (deep) { arm(-1, 1.85, .8); arm(1, 1.85, .8); }   // the deep ones: a second pair
  const halo = abyssHalo(g, 1.5, deep ? 5.5 : 4, deep ? .6 : .45);
  const fray = sh ? abyssFray(body, 26, .2, 2.6, .25) : null;
  const x0 = pos[0];
  return { g, tick(t) {
    E.tick(t); abyssLight(E, [light], lamp);
    head.rotation.set(1.1 + E.v('nod', -.6, .5, t), E.v('turn', -1.3, 1.3, t), E.v('tilt', -1.4, 1.4, t)); neck.rotation.x = E.v('neck', -.4, .8, t);
    const shake = Math.floor(t / 3.7 + seed) % arms.length;            // one limb at a time trembles
    arms.forEach((a, i) => { a.s0.rotation.set(E.v('ax' + i, -.7, .35, t) + (i === shake ? E.tremor(t, .05) : 0), 0, a.sx * E.v('az' + i, -.05, .5, t)); a.e.rotation.x = E.v('ae' + i, -.9, .15, t); });
    body.rotation.x = E.v('lean', -.15, .3, t); body.rotation.z = E.v('roll', -.15, .15, t); body.position.y = .45 + E.v('hang', -.06, .14, t);
    g.rotation.y = E.v('yaw', -1.2, 1.2, t);
    g.position.x = x0 + E.v('x', -2.5, 2.5, t, 'drift'); g.position.y = gy(g.position.x, g.position.z);
    halo.material.opacity = (deep ? .6 : .45) * (E.mood === 2 ? 1.25 : 1);
    strips.forEach(q => { q.st.rotation.x = .05 + E.v('st' + q.ph, -.05, .25, t, 'drift'); });   // the strips stir, slowly, with no wind
    if (sh) { skin.opacity = shroudM.opacity = .6 + .25 * Math.abs(Math.sin(t * 1.7 + Math.sin(t * 5.3))); fray(t); }
  } };
}
// THE FINGER-WALKER: low and wide, on long legs that end in fingers, a seam of light down its back,
// its head a smooth bulb on a long stalk. It scuttles in sudden bursts, then holds, one finger tapping.
function abyssFingers(parent, pos, deep, seed) {
  const E = erratic(seed), sh = !deep, skin = abyssSkin(sh), voidM = new T.MeshBasicMaterial({ color: '#000000' }), light = glow(ABYSS_MOOD[0], 2.2);
  const g = G(parent, pos); g.scale.setScalar(deep ? 1.3 : .85);
  const body = G(g, [0, .8, 0]);
  P(body, A.ico(.5, 1), skin, [0, 0, 0], { scale: [1.3, .36, .8] });
  P(body, A.box(1.05, .025, .05), light, [0, .17, 0], { cast: false, jitter: 0 });
  for (let q = 0; q < 4; q++) P(body, A.box(.025, .02, .22), light, [-.35 + q * .23, .155, (q % 2 ? 1 : -1) * .1], { rot: [0, q % 2 ? .5 : -.5, 0], cast: false, jitter: 0 });
  const lamp = softLight(ABYSS_MOOD[0], 2, 2); lamp.position.y = .4; body.add(lamp);
  const n = deep ? 8 : 6, legs = [];
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1, along = ((i >> 1) - (n / 2 - 1) / 2) * .34;
    const hip = G(body, [along, 0, side * .32]);
    bone(hip, [0, 0, 0], [0, .55, side * .5], .045, .035, skin);
    const knee = G(hip, [0, .55, side * .5]); bone(knee, [0, 0, 0], [0, -1.25, side * .4], .035, .025, skin);
    for (let f = 0; f < 3; f++) bone(knee, [0, -1.25, side * .4], [(f - 1) * .09, -1.4, side * .52], .014, .007, skin, 4);   // it walks on fingers
    legs.push({ hip, knee, side, i });
  }
  const stalk = chain(body, 5, .38, .06, .035, skin); stalk[0].position.set(.6, .1, 0);
  const head = G(stalk[4], [0, .4, 0]); P(head, A.ico(.16, 2), voidM, [0, .05, 0], { scale: [.9, 1.3, .9], cast: false });
  const halo = abyssHalo(g, .9, deep ? 5 : 3.6, deep ? .55 : .42);
  const fray = sh ? abyssFray(body, 20, 0, .6, .5) : null;
  const x0 = pos[0], z0 = pos[2]; let ph = 0, lastX = x0, lastZ = z0;
  return { g, tick(t) {
    E.tick(t); abyssLight(E, [light], lamp);
    const x = x0 + E.v('x', -3.5, 3.5, t, 'burst'), z = z0 + E.v('z', -.8, .8, t, 'burst'), moving = E.moving('x', t) || E.moving('z', t);
    ph += Math.hypot(x - lastX, z - lastZ) * 9; lastX = x; lastZ = z;
    g.position.set(x, gy(x, z), z); g.rotation.y = E.v('yaw', -.5, .5, t);
    const tap = Math.floor(t / 2.9 + seed) % n;
    legs.forEach(L => {
      if (moving) { L.hip.rotation.z = Math.sin(ph + L.i * 2.1) * .35; L.knee.rotation.x = -L.side * Math.max(0, Math.sin(ph + L.i * 2.1)) * .4; }
      else { L.hip.rotation.z *= .6; L.knee.rotation.x = L.i === tap ? -L.side * Math.max(0, Math.sin(t * 9)) ** 4 * .3 : L.knee.rotation.x * .6; }   // holding still, one finger tapping
    });
    stalk.forEach((j, i) => { j.rotation.z = -.35 + E.v('s' + i, -.5, .5, t) * (i ? 1 : .4); j.rotation.x = E.v('sx' + i, -.3, .3, t); });
    head.rotation.set(E.v('hx', -.8, .8, t), E.v('hy', -1.5, 1.5, t), E.v('hz', -1.2, 1.2, t));
    body.rotation.z = moving ? .05 : E.v('bz', -.08, .08, t); body.position.y = .8 + (moving ? 0 : E.v('crouch', -.25, .05, t));
    halo.material.opacity = (deep ? .55 : .42) * (E.mood === 2 ? 1.25 : 1);
    if (sh) { skin.opacity = .6 + .25 * Math.abs(Math.sin(t * 1.9 + Math.sin(t * 4.1))); fray(t); }
  } };
}
// THE SCATTER: a cloud of dark shards round a small cold light. Now and then every shard snaps into a
// shape (a tall figure, a spire, a long arm reaching for the keep), then it all falls apart again.
function abyssScatter(parent, pos, deep, seed) {
  const E = erratic(seed), sh = !deep, N = deep ? 120 : 50, skin = abyssSkin(sh), light = glow(ABYSS_MOOD[0], 2.4);
  const g = G(parent, pos); g.scale.setScalar(deep ? 1.25 : .9);
  const inst = new T.InstancedMesh(new T.TetrahedronGeometry(.12, 0), skin, N); inst.castShadow = true; inst.frustumCulled = false; g.add(inst);
  const core = P(g, A.ico(.16, 1), light, [0, 1.4, 0], { cast: false }); const lamp = softLight(ABYSS_MOOD[0], 2.6, 2.8); core.add(lamp);
  const halo = abyssHalo(g, 1.4, deep ? 6 : 4.5, deep ? .55 : .42);
  const r = A.rand(seed + 7), rnd = () => r() * 2 - 1;
  const along = (segs, i) => { const q = segs[i % segs.length], u = r(); return [0, 1, 2].map(c => q[0][c] + (q[1][c] - q[0][c]) * u + rnd() * .06); };
  const FIG = [[[-.18, 0, 0], [-.14, 1.3, 0]], [[.18, 0, 0], [.14, 1.3, 0]], [[0, 1.3, 0], [0, 2.4, 0]], [[-.3, 2.35, 0], [-.45, .9, .1]], [[.3, 2.35, 0], [.45, .9, .1]], [[0, 2.55, 0], [0, 2.85, .02]], [[-.3, 2.35, 0], [.3, 2.35, 0]]];
  const REACH = [[[0, 1.3, 0], [0, 1.2, 1.4]], [[0, 1.2, 1.4], [0, .9, 2.8]], [[0, .9, 2.8], [-.15, .6, 3.3]], [[0, .9, 2.8], [.15, .6, 3.3]], [[0, .9, 2.8], [0, .55, 3.4]]];
  const forms = {
    cloud: () => Array.from({ length: N }, () => { let q; do q = [rnd(), rnd(), rnd()]; while (Math.hypot(...q) > 1); return [q[0] * 1.1, 1.4 + q[1] * .9, q[2] * 1.1]; }),
    figure: () => Array.from({ length: N }, (_, i) => along(FIG, i)),
    reach: () => Array.from({ length: N }, (_, i) => i < N * .35 ? [rnd() * .4, 1.3 + rnd() * .35, rnd() * .4] : along(REACH, i)),
    spire: () => Array.from({ length: N }, () => { const y = r() * 3.6, w = .18 * (1 - y / 4); return [rnd() * w, y, rnd() * w]; }),
  };
  const CORE = { cloud: [0, 1.4, 0], figure: [0, 2.0, 0], reach: [0, 1.3, 0], spire: [0, 2.8, 0] };
  const cur = forms.cloud(), from = cur.map(q => q.slice()), to = cur.map(q => q.slice()), t0 = new Float32Array(N), du = new Float32Array(N).fill(.1);
  const spin = Array.from({ length: N }, () => [r() * 6, r() * 6, r() * 6]);
  const M = new T.Matrix4(), Q = new T.Quaternion(), Eu = new T.Euler(), Sc = new T.Vector3(), Pp = new T.Vector3();
  let form = 'cloud', next = 2, coreFrom = [0, 1.4, 0], coreTo = [0, 1.4, 0], coreT = 0;
  const x0 = pos[0];
  return { g, tick(t) {
    E.tick(t); abyssLight(E, [light], lamp);
    if (t > next) {   // all at once (each shard a moment apart) they snap into something else
      const opts = E.mood === 2 ? (form === 'reach' ? ['cloud'] : ['reach']) : ['cloud', 'figure', 'spire', 'reach', 'cloud'].filter(f => f !== form);
      form = opts[Math.floor(r() * opts.length)]; const tg = forms[form]();
      for (let i = 0; i < N; i++) { from[i] = cur[i].slice(); to[i] = tg[i]; t0[i] = t + r() * .5; du[i] = r() < .1 ? 1 + r() * 1.5 : .06 + r() * .1; }
      coreFrom = core.position.toArray(); coreTo = CORE[form]; coreT = t;
      next = t + (E.mood === 0 ? 5 + r() * 4 : E.mood === 1 ? 1 + r() * 6 : 1.3);
    }
    for (let i = 0; i < N; i++) {
      const k = Math.min(1, Math.max(0, (t - t0[i]) / du[i]));
      for (let c = 0; c < 3; c++) cur[i][c] = from[i][c] + (to[i][c] - from[i][c]) * k;
      Pp.set(cur[i][0] + E.tremor(t + i, .012), cur[i][1], cur[i][2] + E.tremor(t + i * 1.3, .012));
      Eu.set(spin[i][0] + (form === 'cloud' ? t * .3 : 0), spin[i][1], spin[i][2]); Q.setFromEuler(Eu);
      Sc.set(1, form === 'cloud' ? 1 : 1.8, 1); M.compose(Pp, Q, Sc); inst.setMatrixAt(i, M);
    }
    inst.instanceMatrix.needsUpdate = true;
    const kc = Math.min(1, (t - coreT) / .3); core.position.set(...coreFrom.map((q, c) => q + (coreTo[c] - q) * kc));
    const gx = x0 + E.v('x', -2, 2, t, 'drift'), gz = g.position.z; g.position.set(gx, gy(gx, gz), gz);
    g.rotation.y = form === 'reach' ? Math.atan2(-gx, -gz) : E.v('yaw', -1, 1, t);   // the arm always reaches for the keep
    halo.material.opacity = (deep ? .55 : .42) * (E.mood === 2 ? 1.25 : 1);
    if (sh) skin.opacity = .6 + .25 * Math.abs(Math.sin(t * 1.3 + Math.sin(t * 3.7)));
  } };
}

// ------------------------------------------------------------------ small life (brain/animals.py says who is about)
// Ordinary animals, made like everything else here. Each kind is a few of them with simple habits;
// all of them shy away (fly off, bolt into cover) when something big or hostile is about, or when
// the knight comes close, and drift back once it is calm. o.scared() says whether to. Each build
// returns a tick.
function bird(parent, o = {}) {   // a small bird: body, head, beak, tail, two wings that fold or beat
  const s = o.s || 1, body = A.mat(o.body || '#1a1a1d', 0, .8), belly = A.mat(o.belly || o.body || '#1a1a1d', 0, .8), beakM = A.mat(o.beak || '#2a2622', .2, .6);
  const g = G(parent), b = G(g); b.scale.setScalar(s);
  P(b, A.ico(.07, 1), body, [0, .07, 0], { scale: [.85, .8, 1.45], cast: false });
  P(b, A.ico(.055, 0), belly, [0, .055, .03], { scale: [.8, .7, 1.1], cast: false });
  const head = G(b, [0, .12, .08]); P(head, A.ico(.045, 1), body, [0, 0, 0], { cast: false });
  P(head, new T.ConeGeometry(.014, o.long ? .07 : .045, 4), beakM, [0, -.004, .05], { rot: [Math.PI / 2, 0, 0], cast: false });
  P(b, A.box(.05, .012, .09), body, [0, .08, -.11], { rot: [.3, 0, 0], cast: false });
  const wings = [-1, 1].map(sx => { const w = G(b, [sx * .05, .1, 0]); P(w, A.box(.12, .008, .07), body, [sx * .06, 0, -.01], { cast: false }); return w; });
  return { g, b, head, wings };
}
function beast(parent, o) {   // a four-legged animal: body, neck and head, ears, legs that swing, a tail
  const k = o.k, coat = A.mat(o.coat, 0, .9), dark = A.mat(o.dark || o.coat, 0, .9), pale = A.mat(o.pale || o.coat, 0, .9);
  const g = G(parent), body = G(g, [0, o.legH * k, 0]);
  P(body, A.ico(.5 * k, 1), coat, [0, 0, 0], { scale: o.bodyS, jitter: .01 * k });
  if (o.pale) P(body, A.ico(.42 * k, 1), pale, [0, -.08 * k, .05 * k], { scale: [o.bodyS[0] * .8, o.bodyS[1] * .6, o.bodyS[2] * .8], cast: false });
  const neck = G(body, [0, o.neckAt[0] * k, o.neckAt[1] * k]), head = G(neck, [0, o.neckLen * k, .05 * k]);
  if (o.neckLen > .05) bone(neck, [0, 0, 0], [0, o.neckLen * k, .05 * k], o.neckR * k, o.neckR * .8 * k, coat, 6, .003);
  P(head, A.ico(o.headR * k, 1), coat, [0, 0, 0], { scale: o.headS, cast: false });
  P(head, A.ico(o.headR * .55 * k, 0), dark, [0, -o.headR * .25 * k, o.headR * 1.1 * k], { scale: [.8, .75, 1.3], cast: false });   // muzzle
  const ears = [-1, 1].map(sx => { const e = G(head, [sx * o.headR * .55 * k, o.headR * .7 * k, -o.headR * .1 * k]); P(e, new T.ConeGeometry(o.earW * k, o.earL * k, 4), o.earM ? A.mat(o.earM, 0, .9) : coat, [0, o.earL * .5 * k, 0], { scale: [1, 1, .45], cast: false }); e.rotation.z = -sx * (o.earOut || .2); return e; });
  if (o.antlers) for (const sx of [-1, 1]) { bone(head, [sx * .06 * k, o.headR * .8 * k, 0], [sx * .2 * k, o.headR * 2.6 * k, -.08 * k], .015 * k, .01 * k, A.M.woodL, 4); bone(head, [sx * .14 * k, o.headR * 1.9 * k, -.05 * k], [sx * .27 * k, o.headR * 2.3 * k, .06 * k], .01 * k, .006 * k, A.M.woodL, 4); }
  const legs = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz], i) => { const l = G(body, [sx * o.legX * k, -.05 * k, sz * o.legZ * k]); bone(l, [0, 0, 0], [0, -o.legH * k * 1.02, 0], o.legR * k, o.legR * .65 * k, i < 2 ? coat : dark, 5, .002); return l; });
  const tail = G(body, [0, o.tailAt[0] * k, o.tailAt[1] * k]); bone(tail, [0, 0, 0], [0, o.tailV[0] * k, o.tailV[1] * k], o.tailR * k, o.tailR * .5 * k, o.tailM ? A.mat(o.tailM, 0, .9) : coat, 5, .003);
  g.traverse(m => { if (m.isMesh) m.castShadow = o.k > .5; });
  return { g, body, neck, head, ears, legs, tail, k };
}
// walking about on the ground: a little mover for the animals (speeds up, slows, turns, legs by distance)
function critter(f, x, z, yaw = 0) {
  const c = { f, x, z, yaw, v: 0, ph: Math.random() * 6, px: x, pz: z };
  c.to = (tx, tz, vmax, dt, acc = 3) => { const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz), want = Math.min(vmax, Math.sqrt(2 * acc * Math.max(0, d - .02)));
    c.v += Math.max(-acc * dt * 2, Math.min(acc * dt, want - c.v)); if (d > .02 && c.v > 0) { const st = Math.min(d, c.v * dt); c.x += dx / d * st; c.z += dz / d * st; }
    if (d > .1) { let dy = Math.atan2(dx, dz) - c.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); c.yaw += dy * (1 - Math.exp(-dt * 6)); } return d; };
  c.place = (dt, stride, swing, yOff = 0) => { const moved = Math.hypot(c.x - c.px, c.z - c.pz); c.px = c.x; c.pz = c.z; c.ph += moved / stride * Math.PI;
    const amp = Math.min(1, moved / Math.max(dt, 1e-3) / 1.2); f.legs?.forEach((l, i) => { l.rotation.x = Math.sin(c.ph + (i === 0 || i === 3 ? 0 : Math.PI)) * swing * amp; });
    f.g.position.set(c.x, gy(c.x, c.z) + yOff, c.z); f.g.rotation.y = c.yaw; return amp; };
  return c;
}
const ANIMALS = {
  // crows: hopping along the wall tops, pecking, cawing; up and away, circling, when scared
  crows(root, o) {
    const PERCH = [[-15.5, 1.22, -4.3], [-12.6, 1.22, -4.3], [-9.6, 1.22, -4.3], [-7, 1.22, -4.3], [-17.2, 1.12, -1.5], [-17.2, 1.12, 2.4], [-3.2, 4.22, -4.3], [1.4, 4.22, -4.3], [3.8, 4.22, 4.3]];
    const n = 6 + Math.floor(Math.random() * 4);
    const cs = Array.from({ length: n }, (_, i) => { const b = bird(root, { s: 1.7, body: '#141417', beak: '#1e1c1c' }); const p = PERCH[(i * 2) % PERCH.length]; return { b, at: p.slice(), from: p.slice(), to: null, fly: 0, next: 2 + Math.random() * 6, ph: Math.random() * 9, out: 0, x: p[0] + (Math.random() - .5), yaw: Math.random() * 6 }; });
    return (t, dt) => {
      const sc = o.scared();
      for (const c of cs) {
        c.out += ((sc ? 1 : 0) - c.out) * (1 - Math.exp(-dt * (sc ? 3 : .15)));
        if (!c.to && t > c.next) { const p = PERCH[Math.floor(Math.random() * PERCH.length)]; c.from = [c.x, c.at[1], c.at[2]]; c.to = p; c.fly = 0; }
        let x = c.x, y = c.at[1], z = c.at[2], flying = false;
        if (c.to) { c.fly += dt / 2.2; const u = smooth(0, 1, c.fly); x = c.from[0] + (c.to[0] + (c.ph % 1 - .5) - c.from[0]) * u; z = c.from[2] + (c.to[2] - c.from[2]) * u; y = c.from[1] + (c.to[1] - c.from[1]) * u + Math.sin(u * Math.PI) * 2.5; flying = true;
          if (c.fly >= 1) { c.at = c.to.slice(); c.x = x; c.to = null; c.next = t + 4 + Math.random() * 9; } c.yaw = Math.atan2(c.to ? c.to[0] - c.from[0] : 0, c.to ? c.to[2] - c.from[2] : 1); }
        else { const hop = pulse(t + c.ph, 3.3, .25); c.x += Math.sin(c.yaw) * hop * dt * .6; x = c.x; y += hop * .05; if (pulse(t + c.ph, 7, .1) > .9) c.yaw += (Math.random() - .5) * 2; }
        // scared: up and away in a wide circle, gone over the hills
        const a = t * .5 + c.ph, R = 6 + c.out * 30;
        x = x * (1 - c.out) + (-8 + Math.cos(a) * R) * c.out; z = z * (1 - c.out) + (Math.sin(a) * R) * c.out; y = y * (1 - c.out) + (8 + c.out * 10 + Math.sin(a * 2) * 2) * c.out;
        if (c.out > .05) { flying = true; c.yaw = a + Math.PI / 2; }
        c.b.g.position.set(x, y, z); c.b.g.rotation.y = c.yaw; c.b.g.visible = c.out < .97;
        const flap = flying ? Math.sin(t * 22 + c.ph) * .9 : 0;
        c.b.wings.forEach((w, s) => { w.rotation.z = (s ? -1 : 1) * flap; });
        c.b.b.rotation.x = flying ? -.15 : pulse(t + c.ph * 2, 4.1, .35) * .7;        // pecking
        c.b.head.rotation.x = !flying && pulse(t + c.ph, 9, .6) > .2 ? -.5 : 0;         // a caw: head up, beak to the sky
      }
    };
  },
  // songbirds: small and bright, flitting between the dead tree and the ground below it
  songbirds(root, o) {
    const TREE = [-8.8, -2.2], cols = [['#7a5a3a', '#c8562e'], ['#6a6a3a', '#d8c24a'], ['#5a5248', '#c9b8a0'], ['#4a5a6a', '#d0d8e0']];
    const bs = Array.from({ length: 5 + Math.floor(Math.random() * 3) }, (_, i) => { const [b0, b1] = cols[i % cols.length]; const b = bird(root, { s: .8, body: b0, belly: b1, beak: '#3a3020' }); return { b, p: null, q: null, u: 1, next: Math.random() * 3, ph: Math.random() * 9 }; });
    const spot = () => Math.random() < .55 ? [TREE[0] + (Math.random() - .5) * 1.4, 1.3 + Math.random() * 1.1, TREE[1] + (Math.random() - .5) * 1.4] : [TREE[0] + (Math.random() - .5) * 4, .02, TREE[1] + 1 + Math.random() * 2.2];
    let gone = 0;
    return (t, dt) => {
      gone += ((o.scared() ? 1 : 0) - gone) * (1 - Math.exp(-dt * (o.scared() ? 4 : .2)));
      for (const s of bs) {
        if (!s.p) { s.p = spot(); s.q = s.p; }
        if (s.u >= 1 && t > s.next) { s.p = s.q; s.q = spot(); s.u = 0; }
        s.u = Math.min(1, s.u + dt / .7); const u = smooth(0, 1, s.u);
        const x = s.p[0] + (s.q[0] - s.p[0]) * u, z = s.p[2] + (s.q[2] - s.p[2]) * u, y = s.p[1] + (s.q[1] - s.p[1]) * u + Math.sin(u * Math.PI) * .5;
        if (s.u >= 1 && s.next < t) s.next = t + 1 + Math.random() * 4;
        const fl = s.u < 1;
        s.b.g.position.set(x + gone * 10, y + gone * 12, z - gone * 6); s.b.g.visible = gone < .95;
        if (fl) s.b.g.rotation.y = Math.atan2(s.q[0] - s.p[0], s.q[2] - s.p[2]);
        s.b.wings.forEach((w, k) => { w.rotation.z = (k ? -1 : 1) * (fl || gone > .05 ? Math.sin(t * 34 + s.ph) * 1 : 0); });
        s.b.b.rotation.x = !fl && s.q[1] < .1 ? pulse(t + s.ph, 1.7, .2) * .8 : 0; s.b.head.rotation.y = Math.sin(t * 1.3 + s.ph) * .6 * (fl ? 0 : 1);
      }
    };
  },
  // hares: grazing on the plain, a few hops at a time, sitting up with ears high; bolting when scared
  hares(root, o) {
    const hs = Array.from({ length: 3 + Math.floor(Math.random() * 3) }, (_, i) => {
      const f = beast(root, { k: .38, coat: '#8a7458', dark: '#6a5640', pale: '#cdbfa6', bodyS: [.62, .62, 1.05], legH: .28, legX: .16, legZ: .26, legR: .07, neckAt: [.18, .42], neckLen: .05, neckR: .1, headR: .26, headS: [.85, .9, 1.15], earW: .07, earL: .7, earOut: .1, tailAt: [.08, -.52], tailV: [.06, -.08], tailR: .1, tailM: '#efe8dc' });
      const x = -8 + i * 4.5 + Math.random() * 3, z = 11 + Math.random() * 8;
      return { f, c: critter(f, x, z, Math.random() * 6), home: [x, z], tx: x, tz: z, next: 0, sit: 0, ph: Math.random() * 9 };
    });
    return (t, dt) => {
      const sc = o.scared(o.near?.(hs[0].c.x, hs[0].c.z, 7));
      for (const h of hs) {
        if (sc) { h.tx = h.home[0] + 30; h.tz = h.home[1] + 25; }
        else if (t > h.next) { h.tx = h.home[0] + (Math.random() - .5) * 6; h.tz = h.home[1] + (Math.random() - .5) * 5; h.next = t + 3 + Math.random() * 6; h.sit = Math.random() < .35 ? t + 1.5 : 0; }
        const d = h.c.to(h.tx, h.tz, sc ? 7 : 1.6, dt, sc ? 12 : 6);
        const amp = h.c.place(dt, .5, 1.0), hop = Math.abs(Math.sin(h.c.ph)) * .12 * amp;
        h.f.g.position.y += hop; h.f.body.rotation.x = -amp * .25;
        const up = d < .1 && h.sit && t > h.sit && t < h.sit + 3 ? 1 : 0;           // sitting up to look about
        h.f.body.rotation.x += -up * .7; h.f.head.rotation.x = up ? -.3 : d < .1 ? .5 + pulse(t + h.ph, 2.3, .6) * .3 : 0;   // or head down, grazing
        h.f.ears.forEach(e => { e.rotation.x = up || sc ? -.1 : .5; });
        h.f.g.visible = Math.hypot(h.c.x - h.home[0], h.c.z - h.home[1]) < 26;
      }
    };
  },
  // deer: at the forest edge at dawn and dusk; grazing, heads up to listen, a slow walk; into the trees when scared
  deer(root, o) {
    const n = 3 + Math.floor(Math.random() * 3), base = [-31, -2 + Math.random() * 8];
    const ds = Array.from({ length: n }, (_, i) => {
      const fawn = i === n - 1 && n > 2, stag = i === 0 && Math.random() < .4, k = fawn ? .5 : stag ? .95 : .85;
      const f = beast(root, { k, coat: '#7a5a3a', dark: '#4a3826', pale: fawn ? '#a8845a' : '#c8b08a', bodyS: [.5, .62, 1.75], legH: .85, legX: .15, legZ: .62, legR: .065, neckAt: [.25, .78], neckLen: .62, neckR: .12, headR: .16, headS: [.8, .85, 1.6], earW: .06, earL: .2, earOut: .7, tailAt: [.12, -.58], tailV: [-.08, -.1], tailR: .06, tailM: '#efe8dc', antlers: stag });
      const x = base[0] + (Math.random() - .5) * 5, z = base[1] + i * 1.8;
      return { f, c: critter(f, x, z, Math.PI / 2 + (Math.random() - .5)), home: [x, z], tx: x, tz: z, next: 0, ph: Math.random() * 9, alert: 0 };
    });
    return (t, dt) => {
      const sc = o.scared(o.near?.(ds[0].c.x, ds[0].c.z, 9));
      for (const d of ds) {
        if (sc) { d.tx = d.home[0] - 18; d.tz = d.home[1] + (d.ph - 4.5); }
        else if (t > d.next) { d.tx = d.home[0] + (Math.random() - .5) * 5; d.tz = d.home[1] + (Math.random() - .5) * 4; d.next = t + 6 + Math.random() * 10; }
        const dist = d.c.to(d.tx, d.tz, sc ? 6 : .7, dt, sc ? 8 : 2);
        const amp = d.c.place(dt, sc ? 1.4 : .7, sc ? .8 : .45);
        if (sc) d.f.g.position.y += Math.abs(Math.sin(d.c.ph)) * .25 * amp;
        d.alert = pulse(t + d.ph, 13, 3.5);                                // now and then the head comes up to listen
        d.f.neck.rotation.x = dist < .1 && !sc ? 1.3 * (1 - d.alert) : -.1;
        d.f.head.rotation.y = d.alert * Math.sin(t * .8 + d.ph) * .6; d.f.ears.forEach((e, k) => { e.rotation.y = d.alert * (k ? -1 : 1) * .5; });
        d.f.tail.rotation.x = sc ? -1 : Math.sin(t * 3 + d.ph) * .2;
        d.f.g.visible = Math.hypot(d.c.x - d.home[0], d.c.z - d.home[1]) < 15;
      }
    };
  },
  // butterflies: a few, fluttering over the courtyard on wandering paths
  butterflies(root, o) {
    const cols = ['#e8c040', '#e0e0d8', '#d87830', '#8aa0e0', '#e8a0c0'];
    const bs = Array.from({ length: 6 }, (_, i) => {
      const g = G(root), m = new T.MeshStandardMaterial({ color: cols[i % cols.length], side: T.DoubleSide, roughness: .8, flatShading: true });
      const wings = [-1, 1].map(sx => { const w = G(g); sheet(w, [[0, 0, -.03], [sx * .07, .01, -.05], [sx * .08, 0, .03], [0, 0, .02]], [[0, 1, 2], [0, 2, 3]], m); return w; });
      P(g, A.cyl(.005, .005, .06, 4), A.mat('#1a1610'), [0, 0, 0], { rot: [Math.PI / 2, 0, 0], cast: false });
      return { g, wings, ph: i * 1.7, cx: -16 + Math.random() * 10, cz: -3 + Math.random() * 6 };
    });
    return (t, dt) => {
      const gone = o.scared() ? 1 : 0;
      for (const b of bs) {
        const a = t * .35 + b.ph, x = b.cx + Math.sin(a) * 2.5 + Math.sin(a * 2.3) * .8, z = b.cz + Math.cos(a * .8) * 2 + Math.sin(a * 1.7) * .6, y = .5 + Math.abs(Math.sin(a * 1.9)) * 1.2 + Math.sin(t * 6 + b.ph) * .05;
        b.g.position.set(x, y, z); b.g.rotation.y = a + Math.PI / 2; b.g.visible = !gone;
        b.wings.forEach((w, k) => { w.rotation.z = (k ? -1 : 1) * (.2 + Math.abs(Math.sin(t * 16 + b.ph)) * 1.1); });
      }
    };
  },
  // an owl in the dead tree at night: its head turning right round, slow blinks; now and then a silent circle out over the courtyard
  owl(root, o) {
    const b = bird(root, { s: 2.6, body: '#6a5a46', belly: '#b8a888', beak: '#2a2418' }), T0 = [-8.85, 2.25, -2.15];
    b.b.scale.set(2.6, 3.1, 2.4);
    const eyes = [-1, 1].map(sx => P(b.head, A.ico(.012, 1), glow('#f0c040', 1.4), [sx * .02, .005, .04], { cast: false, jitter: 0 }));
    let fly = -1, next = 25 + Math.random() * 30;
    return (t, dt) => {
      const sc = o.scared();
      if (fly < 0 && (t > next || sc)) fly = 0;
      let x = T0[0], y = T0[1], z = T0[2];
      if (fly >= 0) { fly += dt / 9; const a = fly * 6.283; x += Math.sin(a) * 7; z += (1 - Math.cos(a)) * 4; y += Math.sin(fly * Math.PI) * 3;
        b.g.rotation.y = a + Math.PI / 2; if (fly >= 1 && !sc) { fly = -1; next = t + 40 + Math.random() * 40; } }
      b.g.position.set(x, y, z); b.g.visible = !(sc && fly > .3 && fly < .7) || !sc;
      b.wings.forEach((w, s) => { w.rotation.z = (s ? -1 : 1) * (fly >= 0 ? Math.sin(t * 5) * .8 + .2 : 0); });
      if (fly < 0) { b.head.rotation.y = Math.sin(t * .23) * 1.6 + (pulse(t, 17, 1.5) > .5 ? 2.6 : 0) * .4; }   // the head turns, and turns, nearly right round
      const blink = pulse(t, 5.3, .25) > .3; eyes.forEach(e => { e.scale.y = blink ? .1 : 1; });
    };
  },
  // bats at dusk: quick, jinking flight over the keep and courtyard
  bats(root, o) {
    const m = A.mat('#1a1418', 0, .8);
    const bs = Array.from({ length: 10 }, (_, i) => { const g = G(root); P(g, A.ico(.045, 0), m, [0, 0, 0], { scale: [1, .9, 1.4], cast: false });
      const wings = [-1, 1].map(sx => { const w = G(g); sheet(w, [[0, 0, -.03], [sx * .12, .02, -.05], [sx * .16, 0, .02], [0, 0, .03]], [[0, 1, 2], [0, 2, 3]], m); return w; }); return { g, wings, ph: i * 2.3 }; });
    return (t, dt) => {
      const gone = o.scared();
      for (const b of bs) {
        const a = t * .9 + b.ph, j = Math.sin(t * 7 + b.ph) * .5;
        b.g.position.set(-6 + Math.sin(a) * 8 + Math.sin(a * 3.1) * 1.5, 5 + Math.sin(a * 1.7) * 1.5 + j * .3, Math.cos(a * 1.3) * 5 + Math.cos(a * 2.7) * 1.2);
        b.g.rotation.y = a * 1.3 + j; b.g.visible = !gone;
        b.wings.forEach((w, k) => { w.rotation.z = (k ? -1 : 1) * Math.sin(t * 26 + b.ph) * 1.1; });
      }
    };
  },
  // a fox at night: out along the road and the plain, nose down, stopping to listen, sitting to look at the keep
  fox(root, o) {
    const f = beast(root, { k: .5, coat: '#b0602a', dark: '#2a1e18', pale: '#ece2d0', bodyS: [.5, .5, 1.25], legH: .42, legX: .14, legZ: .4, legR: .05, neckAt: [.12, .5], neckLen: .18, neckR: .14, headR: .2, headS: [.95, .85, 1.3], earW: .08, earL: .26, earOut: .15, tailAt: [.05, -.6], tailV: [0, -.95], tailR: .17 });
    const ROUTE = [[-30, 8], [-20, 9.5], [-10, 8.8], [0, 9.4], [9, 13], [14, 18], [4, 20], [-8, 17], [-22, 14]];
    const c = critter(f, ROUTE[0][0], ROUTE[0][1]); let i = 1, wait = 0, sitT = -9;
    return (t, dt) => {
      const sc = o.scared(o.near?.(c.x, c.z, 6));
      const p = sc ? [c.x + Math.sin(c.yaw) * 30, c.z + Math.cos(c.yaw) * 30] : ROUTE[i % ROUTE.length];
      if (!sc && t < wait) { c.to(c.x, c.z, 0, dt); } else { const d = c.to(p[0], p[1], sc ? 6 : 1.1, dt, sc ? 10 : 3); if (d < .3 && !sc) { i++; wait = t + (Math.random() < .5 ? 3 + Math.random() * 4 : 0); sitT = wait > t + 4 ? t : -9; } }
      const amp = c.place(dt, .45, .6);
      const sit = t - sitT < 6 ? smooth(0, .6, t - sitT) : 0;
      f.body.rotation.x = -sit * .45; f.legs[2].rotation.x = f.legs[3].rotation.x = sit * -1.1 + (1 - sit) * f.legs[2].rotation.x;
      f.neck.rotation.x = amp > .2 ? .5 : sit ? -.2 : .3; f.head.rotation.y = (1 - amp) * Math.sin(t * .7) * .7;
      f.tail.rotation.x = -.35 + Math.sin(t * 2) * .1 - sit * .8;
      f.g.visible = !sc || Math.hypot(c.x - p[0], c.z - p[1]) > 4;
    };
  },
  // fish rising in the lake: rings spreading on the water, and now and then one jumps
  fish(root, o) {
    const LK = [27, 23], LV = -.35, m = A.mat('#8a9aa0', .4, .4), ringM = () => new T.MeshBasicMaterial({ color: '#dfeaf0', transparent: true, opacity: 0, depthWrite: false });
    const rings = Array.from({ length: 6 }, () => { const r = new T.Mesh(new T.RingGeometry(.9, 1, 24), ringM()); r.rotation.x = -Math.PI / 2; root.add(r); return { r, born: -9 }; });
    const fishG = G(root); P(fishG, A.ico(.12, 1), m, [0, 0, 0], { scale: [.5, .6, 1.8], cast: false }); P(fishG, A.box(.01, .12, .1), m, [0, 0, -.22], { cast: false }); fishG.visible = false;
    let next = 2, ri = 0, jump = null;
    return (t, dt) => {
      if (t > next) {
        const a = Math.random() * 6.28, rr = Math.random() * 6, x = LK[0] + Math.cos(a) * rr, z = LK[1] + Math.sin(a) * rr * .8;
        const r = rings[ri++ % rings.length]; r.r.position.set(x, LV + .02, z); r.born = t;
        if (Math.random() < .35) jump = { x, z, t0: t, yaw: Math.random() * 6 };
        next = t + 1.5 + Math.random() * 5;
      }
      rings.forEach(r => { const k = (t - r.born) / 3; r.r.visible = k < 1; if (k < 1) { r.r.scale.setScalar(.1 + k * 1.4); r.r.material.opacity = .6 * (1 - k); } });
      if (jump) { const k = (t - jump.t0) / .9; fishG.visible = k < 1; if (k < 1) { fishG.position.set(jump.x + Math.sin(jump.yaw) * k * .8, LV + Math.sin(k * Math.PI) * .7, jump.z + Math.cos(jump.yaw) * k * .8); fishG.rotation.set(-(k - .5) * 2.2, jump.yaw, 0); } else jump = null; }
    };
  },
  // a stray cat: along the courtyard wall top, sitting to wash, curling up to sleep in the sun; it does not care much about anything
  cat(root, o) {
    const coats = [['#3a3330', '#c8c0b4'], ['#c87a3a', '#f0e0c8'], ['#8a8680', '#e0dcd4'], ['#1c1a1a', '#1c1a1a']], [c0, c1] = coats[Math.floor(Math.random() * coats.length)];
    const f = beast(root, { k: .38, coat: c0, dark: c0, pale: c1, bodyS: [.5, .52, 1.15], legH: .5, legX: .14, legZ: .38, legR: .06, neckAt: [.15, .5], neckLen: .1, neckR: .14, headR: .25, headS: [1, .9, .95], earW: .09, earL: .22, earOut: .25, tailAt: [.12, -.55], tailV: [0, .9], tailR: .06 });
    const WALL = [[-16.4, 1.2, -4.3], [-6.2, 1.2, -4.3]], c = critter(f, -11, -4.3, Math.PI / 2);
    let goal = -8, mode = 'walk', until = 0;
    return (t, dt) => {
      const sc = o.scared();
      if (t > until) { const r = Math.random(); mode = r < .4 ? 'walk' : r < .7 ? 'wash' : 'sleep'; goal = WALL[0][0] + Math.random() * (WALL[1][0] - WALL[0][0]); until = t + (mode === 'sleep' ? 25 : 8) + Math.random() * 8; }
      const d = c.to(sc ? WALL[0][0] - 3 : mode === 'walk' ? goal : c.x, WALL[0][2], sc ? 3 : .5, dt, 3);
      c.z = WALL[0][2]; const amp = c.place(dt, .3, .5, 1.2);
      const sit = mode === 'wash' && d < .1 ? 1 : 0, sleep = mode === 'sleep' && d < .1 ? 1 : 0;
      f.body.rotation.x = -sit * .5; f.body.position.y = f.legs[0].position.y + (.5 - sleep * .3) * f.k;
      f.legs.forEach(l => { l.visible = !sleep; });
      f.head.rotation.set(sit ? .5 + Math.sin(t * 6) * .15 : sleep ? .5 : 0, sleep ? .6 : Math.sin(t * .4) * .4, 0);
      f.tail.rotation.set(Math.sin(t * 1.3) * .3 + (sleep ? 1.4 : 0), 0, Math.sin(t * 2.1) * (sleep ? .05 : .4));
      f.g.visible = !(sc && c.x < WALL[0][0] - 2);
    };
  },
};
// For the live keep: one kind of animal while it is about. o: { scared(near) } (the page says when to shy away;
// near: whether the knight is close to a given spot, for the ground animals).
export function spawnAnimals(kind, api, o = {}) {
  T = api.THREE; A = api; A.mat = api.mat;
  const make = ANIMALS[kind]; if (!make) return null;
  const root = new T.Group(); A.scene.add(root);
  const tick = make(root, { scared: o.scared || (() => false), near: o.near });
  A.onTick.push(tick);
  return { root, tick, remove() { const i = A.onTick.indexOf(tick); if (i >= 0) A.onTick.splice(i, 1); A.scene.remove(root); root.traverse(m => { if (m.isMesh) m.geometry?.dispose(); }); } };
}

const ORDER = Object.keys(BEASTS);
// beings that come young, grown or old, each age its own design (brain/creatures.py AGED: keep the two in step)
const AGED = ['axolotl', 'bellcrab', 'glassbeak', 'ashwolves', 'dragon', 'dragon2', 'whale', 'thorn', 'basilisk', 'wyrm', 'larva',
              'listener', 'cartographer', 'bentone', 'watcher', 'nightgrown', 'leech'];
const TIMES = [['day', 13], ['dusk', 18], ['night', 22]];

// ------------------------------------------------------------------ showing them
function clear() {
  if (!cur) return;
  cur.def.exit?.();
  const i = A.onTick.indexOf(cur.tick); if (i >= 0) A.onTick.splice(i, 1);
  A.scene.remove(cur.root);
  cur.root.traverse(o => { if (o.isMesh) o.geometry?.dispose(); });
  cur = null;
}
function show(key, hour) {
  clear();
  const def = BEASTS[key], root = new T.Group();
  const aged = AGED.includes(key);
  if (ui?.age) ui.age.style.display = aged ? '' : 'none';                          // only beings that have ages
  const kinds = def.variants;                                                        // beings that come in kinds (def.variants: [value, label])
  if (ui?.kind) {
    ui.kind.style.display = kinds ? '' : 'none';
    if (kinds && ui.kind.dataset.for !== key) {
      ui.kind.innerHTML = kinds.map(([v, l]) => `<option value="${v}">${l}</option>`).join(''); ui.kind.dataset.for = key;
      const q = new URLSearchParams(location.search).get('kind'); ui.kind.value = kinds.some(k => k[0] === q) ? q : kinds[0][0];
    }
  }
  root.userData.appearance = { variant: { size: 1, age: aged ? (ui?.age?.value || '') : '', kind: kinds ? ui?.kind?.value || '' : '' } };   // the preview's chosen age and kind
  A.scene.add(root);
  const tick = def.build(root);
  cur = { key, def, root, tick };
  A.onTick.push(tick);
  A.setHour(hour ?? def.hour);
  A.force({ ...def.knight, awake: false });
  const [pos, at] = def.views?.[root.userData.appearance.variant.age] || def.view, far = innerWidth / innerHeight < 1 ? 1.75 : 1;   // (an age can have its own view); tall screens: step back to fit it in
  A.view(pos.map((v, i) => at[i] + (v - at[i]) * far), at);
  const u = new URL(location.href); u.searchParams.set('creature', key); u.searchParams.set('hour', A.hour);
  if (kinds) u.searchParams.set('kind', root.userData.appearance.variant.kind); else u.searchParams.delete('kind');
  history.replaceState(null, '', u);
  ui.name.textContent = def.name; ui.blurb.textContent = def.blurb;
  ui.count.textContent = `${ORDER.indexOf(key) + 1} / ${ORDER.length}`;
  ui.time.value = String(A.hour);
}

function buildUI() {
  const css = document.createElement('style');
  css.textContent = `#bestiary{position:fixed;left:12px;bottom:64px;max-width:min(430px,calc(100vw - 24px));padding:10px 12px;z-index:5;font-size:19px;line-height:1.15}
#bestiary .row{display:flex;gap:8px;align-items:center}
#bestiary b{flex:1;font-size:23px;color:#f0e2c4}
#bestiary button,#bestiary select{font:inherit;font-size:18px;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:0 9px;cursor:pointer}
#bestiary p{margin:6px 0 4px;color:var(--ink)} #bestiary small{color:var(--dim)}
@media (max-width:640px){#bestiary{top:128px;bottom:auto;left:8px;right:8px;max-width:none;font-size:16px;padding:8px 10px}#bestiary b{font-size:19px}}`;
  document.head.append(css);
  const el = document.createElement('div'); el.id = 'bestiary'; el.className = 'panel';
  el.innerHTML = `<div class="row"><button data-d="-1" title="Previous">◀</button><b></b><small class="n"></small><button data-d="1" title="Next">▶</button>
    <select title="Time of day">${TIMES.map(([n, h]) => `<option value="${h}">${n}</option>`).join('')}</select>
    <select title="Age" class="age"><option value="">grown</option><option value="young">young</option><option value="old">old</option></select>
    <select title="Kind" class="kind"></select></div>
    <p></p><small>Mockup only: not part of Rooken's world (yet). ${matchMedia('(pointer: coarse)').matches ? 'Drag to look around.' : 'Drag to look around, WASD to fly.'}</small>`;
  document.body.append(el);
  ui = { name: el.querySelector('b'), blurb: el.querySelector('p'), count: el.querySelector('.n'), time: el.querySelector('select'), age: el.querySelector('select.age'), kind: el.querySelector('select.kind') };
  ui.kind.onchange = () => { const u = new URL(location.href); u.searchParams.set('kind', ui.kind.value); history.replaceState(null, '', u); show(cur.key, A.hour); ui.kind.blur(); };
  const qAge = new URLSearchParams(location.search).get('age'); if (qAge) ui.age.value = qAge;
  ui.age.onchange = () => { const u = new URL(location.href); u.searchParams.set('age', ui.age.value); history.replaceState(null, '', u); show(cur.key, A.hour); ui.age.blur(); };
  el.querySelectorAll('button').forEach(b => b.onclick = () => {
    const i = (ORDER.indexOf(cur.key) + +b.dataset.d + ORDER.length) % ORDER.length; show(ORDER[i]); b.blur();
  });
  ui.time.onchange = () => { A.setHour(+ui.time.value); const u = new URL(location.href); u.searchParams.set('hour', A.hour); history.replaceState(null, '', u); ui.time.blur(); };
  for (const ev of ['pointerdown', 'keydown', 'wheel']) el.addEventListener(ev, e => e.stopPropagation());
}

// For the live keep: build one being where it belongs, without the preview's panel, camera or
// stand-in knight. Returns how to animate it and how to take it away again.
export function spawn(key, api, appearance = {}) {
  T = api.THREE; A = api; A.mat = api.mat;
  const def = BEASTS[key];
  if (!def) return null;
  const root = new T.Group(); root.userData.appearance = appearance;
  A.scene.add(root);
  const tick = def.build(root);
  A.onTick.push(tick);
  return {
    tick, root,
    remove() {
      def.exit?.();
      const i = A.onTick.indexOf(tick); if (i >= 0) A.onTick.splice(i, 1);
      A.scene.remove(root);
      root.traverse(o => { if (o.isMesh) o.geometry?.dispose(); });
    },
  };
}

// For the live keep: what an arrival left behind (a crater, scorched rings), from state.creatures.traces:
// { kind: 'meteor' | 'ship', id (the visit's: its being's name first), since }. A meteor that fell in the
// last minute and a half is seen coming down (the page looks for news about once a minute).
export function spawnTrace(tr, api) {
  T = api.THREE; A = api; A.mat = api.mat;
  const of = String(tr.id || '').split('-')[0], age = Math.max(0, (Date.now() - Date.parse(tr.since)) / 1000);
  const root = new T.Group(); A.scene.add(root);
  const tick = tr.kind === 'meteor' ? meteorScene(root, ...(METEOR_AT[of] || [9.5, 19]), { age: age < 90 ? 0 : age }) : shipScorch(root, SHIP_AT[of] || [], age / 86400);   // (fell in the last minute or so: seen falling, from the start)
  A.onTick.push(tick);
  return { root, remove() { const i = A.onTick.indexOf(tick); if (i >= 0) A.onTick.splice(i, 1); A.scene.remove(root); root.traverse(o => { if (o.isMesh) o.geometry?.dispose(); }); } };
}

export function start(key, api) {
  T = api.THREE; A = api; A.mat = api.mat;
  buildUI();
  const hour = new URLSearchParams(location.search).get('hour');
  show(BEASTS[key] ? key : ORDER[0], hour != null && hour !== '' ? +hour : undefined);
}
