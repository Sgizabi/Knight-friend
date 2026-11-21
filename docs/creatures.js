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
  const pts = [[-30, .5], [-22, .15], [-19.3, 2.6], [-15.2, 6.3], [-10, 7.9], [-3, 8.4], [6, 8.6], [15, 8.2]].map(([x, z]) => V(x, 0, z));
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
function nightGrown(parent, pos, s = 1) {
  const glass = new T.MeshStandardMaterial({ color: '#1c2438', metalness: .45, roughness: .15, emissive: '#1a2848', emissiveIntensity: 1.1, flatShading: true });
  const seam = glow('#bfe2ff', 2.6, { fog: false });
  const g = G(parent, pos); g.scale.setScalar(s);
  for (const sx of [-1, 1]) { bone(g, [sx * .09, 1.05, 0], [sx * .12, .55, .1], .045, .035, glass); bone(g, [sx * .12, .55, .1], [sx * .1, 0, 0], .035, .03, glass); }
  const torso = G(g, [0, 1.05, 0], [.38, 0, 0]);
  P(torso, A.ico(.2, 1), glass, [0, .45, 0], { scale: [1, 2.2, .75] });
  bone(torso, [0, .85, 0], [0, 1.05, .08], .035, .03, glass);
  const head = G(torso, [0, 1.15, .1]);
  P(head, A.ico(.1, 1), glass, [0, 0, 0], { scale: [.85, 1.15, .95] });
  P(head, A.box(.012, .17, .01), seam, [0, 0, .097], { cast: false, jitter: 0 });
  const arms = [-1, 1].map(sx => {
    const a = G(torso, [sx * .2, .8, 0]);
    bone(a, [0, 0, 0], [sx * .05, -.6, .05], .03, .025, glass); bone(a, [sx * .05, -.6, .05], [sx * .03, -1.15, .1], .025, .02, glass);
    for (let f = 0; f < 3; f++) bone(a, [sx * .03, -1.15, .1], [sx * (.01 + f * .025), -1.38, .12 + f * .01], .008, .004, glass, 4);
    return a;
  });
  const N = 40, sp = new Float32Array(N * 3), r = A.rand(Math.floor(pos[0] * 100));
  for (let i = 0; i < N; i++) { const u = r() * 6.28, v = Math.acos(2 * r() - 1); sp.set([Math.sin(v) * Math.cos(u) * .205, .45 + Math.cos(v) * .45, Math.sin(v) * Math.sin(u) * .155], i * 3); }
  const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(sp, 3));
  const stars = new T.Points(sg, new T.PointsMaterial({ color: '#e4ecff', size: .03, transparent: true, opacity: .9, fog: false })); torso.add(stars);
  return {
    g, tick(t, ph) {
      const reach = smooth(0, 1, pulse(t + ph, 9, 4.5) * 1.6);   // now and then they reach for the sky
      arms.forEach((a, i) => { a.rotation.x = -reach * (2.5 + i * .15) + Math.sin(t * .7 + ph + i) * .05; });
      head.rotation.x = -reach * .55; torso.rotation.x = .38 - reach * .3;
      g.rotation.z = Math.sin(t * .5 + ph) * .04;
      stars.rotation.y = t * .08 + ph; seam.emissiveIntensity = 2.2 + Math.sin(t * 1.3 + ph) * .7;
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
const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const pulse = (t, every, len) => { const p = t % every; return p < len ? Math.sin(p / len * Math.PI) : 0; };

// ------------------------------------------------------------------ the creatures
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
      // the young: grey down, big eyes, a stubby beak, hardly a crest, a few trinkets, a bobbing
      // clumsy walk. The old: dull, greyed plumage, a crack down its glass beak, a ragged crest,
      // heavy with its hoard, slow.
      const plume = A.mat(young ? '#7d8597' : old ? '#5a5f6b' : '#465068', 0, .85), plumeL = A.mat(young ? '#a7adbb' : old ? '#a9aab0' : '#9aa2b4', 0, .8);
      const plumeD = A.mat('#262d3c', 0, .9), leg = A.mat('#8a7f5e', 0, .65), talon = A.mat('#16130f', .2, .5);
      const glass = new T.MeshStandardMaterial({ color: '#d6f3f8', transparent: true, opacity: .5, roughness: .02, metalness: .2,
                                                 emissive: '#58b6cc', emissiveIntensity: .3, flatShading: true });
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
      const blen = young ? .22 : .55;
      const beakUp = G(head, [0, .01, .08]), beakLo = G(head, [0, -.03, .08]);
      P(beakUp, new T.ConeGeometry(.045, blen, 5), glass, [0, 0, blen / 2], { rot: [Math.PI / 2, 0, 0], scale: [1, 1, .7], cast: false });
      P(beakLo, new T.ConeGeometry(.035, blen * .92, 5), glass, [0, 0, blen * .46], { rot: [Math.PI / 2, 0, 0], scale: [1, 1, .6], cast: false });
      if (old) P(beakUp, A.box(.004, .05, blen * .7), A.mat('#2a3a40'), [.012, .012, blen * .45], { rot: [0, .05, .4], cast: false });   // a crack, long healed over
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
      const pathAt = t => { const a = t * .03; return [-10.6 + Math.sin(a) * 1.2, .15 + Math.sin(a * 1.7) * .75]; };   // the lane: clear of the buildings, the tree and him
      let yaw = 0, last = pathAt(0), stride = 0;
      return (t, dt) => {
        const cycle = t % 14, stalking = cycle < 9;                          // walk a while, then stop to hunt
        const tt = stalking ? t : t - (cycle - 9);
        const [x, z] = pathAt(t - Math.max(0, cycle - 9) - Math.floor(t / 14) * 5);
        const dx = x - last[0], dz = z - last[1]; last = [x, z];
        if (Math.hypot(dx, dz) > 1e-5) { let d = Math.atan2(dx, dz) - yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); yaw += d * Math.min(1, dt * 2); }
        g.position.set(x, gy(x, z), z); g.rotation.y = yaw;
        if (stalking) stride += dt * (young ? 1.7 : old ? .8 : 1.2);
        legs.forEach(({ hip, knee, ankle }, i) => {
          const s = stalking ? Math.sin(stride * Math.PI + i * Math.PI) : 0, up = Math.max(0, s);
          hip.rotation.x = -s * .3; knee.rotation.x = up * .4; ankle.rotation.x = -up * .9;
        });
        bird.position.y = stalking ? Math.abs(Math.sin(stride * Math.PI)) * (young ? .07 : .03) : 0;   // the young bob along
        // the neck: resting S; the bob; the dart
        const hunt = stalking ? 0 : cycle - 9;
        const bob = hunt > .4 && hunt < 2.4 ? Math.sin((hunt - .4) * Math.PI * 3) * .5 + .5 : 0;
        const dart = hunt > 2.6 ? pulse(hunt - 2.6, 999, .7) : 0;            // one quick strike, then it straightens
        neck.forEach((j, i) => {
          const rest = [.3, .3, -.5, -.5, .3, .1][i];                            // the S, head carried level
          j.rotation.x = rest * (1 - dart) + (i < 3 ? .6 : .1) * dart + (i === 4 ? bob * .25 : 0);
          j.rotation.y = Math.sin(t * .5 + i) * .03;
        });
        head.rotation.x = .5 * dart - bob * .15;
        beakLo.rotation.x = hunt > 2.9 ? pulse(hunt - 2.9, 999, .4) * .25 : 0;  // snaps
        held.visible = !stalking && hunt > 3.2;                                // and comes up holding something
        for (const { w, sx, prim } of wings) { w.rotation.z = sx * pulse(t + 4, 31, 2.5) * .9; prim.forEach((f, i) => { f.rotation.y = sx * pulse(t + 4, 31, 2.5) * i * .12; }); }
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
      const size = (v.size || 1) * (v.age === 'young' ? .6 : v.age === 'old' ? 1.1 : 1);
      // it lies along the lane, head toward the doorway, and shifts a little forward and back (it never needs to turn)
      const g = G(root, [-10.0, 0, .1], [0, Math.PI / 2, 0]); const lizard = G(g); lizard.scale.setScalar(size);
      const hide = A.mat('#56664a', 0, .7), hideD = A.mat('#3a4632', 0, .75), belly = A.mat('#9c9a70', 0, .8);
      const plate = A.mat('#8e9088', .1, .6), frill = ds('#6a2c26', 0, .8), claw = A.mat('#1a1712', .2, .5);
      const lidM = A.mat('#46543a', 0, .7);
      const N = 12, segs = [];
      let parent = lizard;
      for (let i = 0; i < N; i++) {                                   // overlapping, so it reads as one long body
        const r = i < 4 ? .42 + i * .02 : .5 * (1 - (i - 3) / (N - 1)) + .06;
        const s = G(parent, [0, i ? 0 : .42, i ? -.42 : 0]);
        P(s, A.ico(1, 2), i % 3 ? hide : hideD, [0, 0, 0], { scale: [r * 1.15, r * .72, r * 1.25], jitter: .015 });
        P(s, A.ico(1, 1), belly, [0, -r * .32, 0], { scale: [r * 1.05, r * .42, r * 1.15] });
        P(s, A.box(r * .55, r * .12, r * .7), plate, [0, r * .7, 0], { rot: [-.25, 0, 0], jitter: .02 });   // a grey plate on the ridge
        segs.push({ s, r }); parent = s;
      }
      const legs = [];
      for (const i of [0, 2, 4]) for (const sx of [-1, 1]) {
        const { s, r } = segs[i], hip = G(s, [sx * r * 1.0, -r * .15, 0]);
        bone(hip, [0, 0, 0], [sx * .38, .1, .08], .11, .085, hide);
        bone(hip, [sx * .38, .1, .08], [sx * .5, -.32, .14], .085, .06, hideD);
        for (const a of [-.45, 0, .45]) P(hip, new T.ConeGeometry(.028, .15, 4), claw, [sx * .5 + Math.sin(a) * .09, -.37, .22 + Math.cos(a) * .05], { rot: [1.6, a, 0] });
        legs.push({ hip, sx, ph: i * .9 + (sx > 0 ? Math.PI : 0) });
      }
      // the head: low and wedge-shaped, heavy brows, half-lidded eyes
      const head = G(segs[0].s, [0, .04, .5]);
      P(head, A.ico(1, 2), hide, [0, 0, .2], { scale: [.3, .16, .42], jitter: .01 });
      P(head, A.ico(1, 1), hideD, [0, -.02, .5], { scale: [.2, .1, .22] });
      const jaw = G(head, [0, -.09, .05]); P(jaw, A.ico(1, 1), belly, [0, -.02, .32], { scale: [.25, .06, .38] });
      const eyeMat = glow('#d8ff5a', 1.6);
      const lids = [];
      for (const sx of [-1, 1]) {
        const e = G(head, [sx * .2, .1, .3]);
        P(e, A.ico(.055, 1), eyeMat, [0, 0, 0], { cast: false });
        P(e, A.box(.012, .07, .02), A.mat('#0a0a06'), [0, 0, .05], { cast: false });   // a slit pupil
        const lid = G(e, [0, 0, 0]); P(lid, new T.SphereGeometry(.065, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), lidM, [0, 0, 0], { cast: false, jitter: 0 });
        lids.push(lid);
        P(head, A.box(.16, .05, .14), plate, [sx * .19, .16, .3], { rot: [.15, 0, sx * -.3] });   // the brow
      }
      const crest = G(head, [0, .12, .02]);                             // a frill of bony spines with dull red skin between
      const tips = [];
      for (let i = 0; i < 5; i++) { const a = -.9 + i * .45, tip = [Math.sin(a) * .42, .32 + Math.cos(a) * .4 - .2 * Math.abs(Math.sin(a)), -.25 - Math.cos(a) * .15]; bone(crest, [0, 0, 0], tip, .035, .01, plate, 5); tips.push(tip); }
      sheet(crest, [[0, 0, 0], ...tips], [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 5]], frill);
      const tongue = G(head, [0, -.04, .7]);
      for (const sx of [-1, 1]) P(tongue, A.box(.02, .01, .2), A.mat('#8a2a3a'), [sx * .025, 0, .1], { rot: [0, sx * .25, 0], cast: false });
      const gazeMat = new T.MeshBasicMaterial({ color: '#d8ff5a', transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending });
      const gaze = new T.Mesh(new T.ConeGeometry(.9, 4, 12, 1, true), gazeMat); gaze.rotation.x = -Math.PI / 2; gaze.position.set(0, .1, 2.4); head.add(gaze);
      segs.forEach(({ s }) => merge(s)); merge(head);
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
      let pi = 0, lastLook = -99;
      const hp = V(), dir = V();
      return (t) => {
        const shift = Math.sin(t * .05) * .9;                          // creeps forward and back along the lane
        g.position.x = -10.0 + shift;
        const crawl = Math.abs(Math.cos(t * .05)) > .3;
        for (let i = 1; i < N; i++) segs[i].s.rotation.y = Math.sin(t * .8 - i * .5) * .05 * (crawl ? 1 : .3);
        for (const l of legs) l.hip.rotation.x = crawl ? Math.sin(t * 1.6 + l.ph) * .3 : 0;
        head.rotation.y = Math.sin(t * .2) * .35; head.rotation.x = Math.sin(t * .23) * .05;
        // its tell: the lids lift, slowly, and only then does the gaze go out
        const look = smooth(0, 3, (t % 20) - 12) * (1 - smooth(5, 6.5, (t % 20) - 12));
        lids.forEach(l => { l.rotation.x = -.2 - look * 1.2; });
        gazeMat.opacity = look * (.05 + Math.sin(t * 2.3) * .015);
        eyeMat.emissiveIntensity = 1 + look * 1.4;
        if (look > .9 && t - lastLook > 4) {                           // where it looks, the grass goes grey
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
        { at: [-.15, .2], yaw: 2.3, n: 14, len: .3, r: .2, base: .05, curl: .14, amp: .1 },     // tall, question-mark
        { at: [.2, .1], yaw: -.95, n: 13, len: .28, r: .18, base: .9, curl: -.05, amp: .06, bend: [.35, .35, .3, .1] },   // over the rim, onto the grass
        { at: [.05, -.25], yaw: 3.8, n: 7, len: .22, r: .14, base: .8, curl: .38, amp: .05 },   // gripping the rim
        { at: [-.25, -.05], yaw: -2.6, n: 11, len: .26, r: .15, base: .35, curl: .08, amp: .16 },   // waving
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
    blurb: 'Legendary. The hill south of the keep is a sleeping giant of moss and stone. On rare days it shifts, and once in a long while it opens an eye.',
    view: [[-1.2, 2.5, -3.6], [1.5, 2.6, 19]],
    knight: { place: 'fire', action: 'stand', emote: 'dots', note: 'watching the hill rise and fall' },
    build(root) {
      const g = G(root, [2.5, 0, 21]);
      const turf = A.mat('#4a5a34', 0, .95), turfD = A.mat('#3a4729', 0, .95), rock = A.M.stone, rockL = A.M.stoneL, bark = A.M.woodD;
      const body = G(g);
      P(body, A.ico(1, 2), turf, [0, -.6, 0], { scale: [9, 4, 6], jitter: .15 });
      P(body, A.ico(1, 1), turfD, [4.5, -.4, 2.5], { scale: [4, 2.6, 3.5], jitter: .12 });
      const r = A.rand(21);
      for (let i = 0; i < 14; i++) {
        const a = r() * 6.28, d = r() * .75;
        const x = Math.cos(a) * 8 * d, z = Math.sin(a) * 5.5 * d, y = 3.2 * Math.sqrt(Math.max(0, 1 - d * d)) - .4;
        if (i < 9) { const tr = G(body, [x, y, z]); P(tr, A.cyl(.08, .12, .7, 5), bark, [0, .35, 0]); P(tr, new T.ConeGeometry(.5, 1.4, 6), turfD, [0, 1.2, 0]); P(tr, new T.ConeGeometry(.38, 1.0, 6), turf, [0, 1.75, 0]); }
        else P(body, A.box(1 + r(), .6 + r() * .6, .9 + r()), i % 2 ? rock : rockL, [x, y, z], { rot: [r(), r(), r()], jitter: .1 });
      }
      // the face, half buried at the west end, turned toward the keep
      const face = G(body, [-6.4, -.6, -3.6], [-.12, 3.0, 0]); face.scale.setScalar(1.5);
      const rockD = A.M.stoneD;
      P(face, A.ico(1.6, 1), rock, [0, 1.6, -.9], { scale: [1.05, 1.15, .9], jitter: .15 });          // the head, mostly in the hill
      P(face, A.box(2.5, .55, .7), rockL, [0, 2.55, .5], { rot: [-.15, 0, 0], jitter: .08 });          // brow
      for (const sx of [-1, 1]) {
        P(face, A.box(.95, .7, .5), rockD, [sx * .62, 1.95, .55], { jitter: .04 });                    // eye socket
        P(face, A.box(.75, .55, .8), rockL, [sx * 1.05, 1.15, .45], { rot: [0, sx * -.35, 0], jitter: .07 });   // cheekbone
      }
      P(face, A.cyl(.12, .42, 1.15, 4), rockL, [0, 1.6, .85], { rot: [-.3, Math.PI / 4, 0], scale: [1, 1, .9], jitter: .05 });   // nose
      P(face, A.box(1.3, .5, .6), rock, [0, .75, .55], { jitter: .06 });                                // upper lip
      P(face, A.box(1.2, .09, .3), rockD, [0, .5, .78], { jitter: .02 });                               // the line of its mouth
      P(face, A.box(1.15, .5, .6), rock, [0, .22, .5], { jitter: .06 });                                // chin, sinking into the turf
      P(face, A.box(2.8, .35, 1.5), turf, [0, 2.95, -.1], { rot: [-.1, 0, 0], jitter: .12 });          // moss on its brow
      for (let i = 0; i < 6; i++) P(face, new T.ConeGeometry(.08, .4, 4), turfD, [-1.1 + i * .45, 3.2, .2 - (i % 2) * .3]);
      const eyeGlow = glow('#ffcc66', 3, { fog: false });
      const lids = [];
      for (const sx of [-1, 1]) {
        const e = G(face, [sx * .62, 1.95, .82]);
        P(e, A.box(.6, .08, .06), eyeGlow, [0, 0, 0], { cast: false, jitter: 0 });
        const up = G(e, [0, 0, 0]), lo = G(e, [0, 0, 0]);
        P(up, A.box(.72, .3, .2), rockL, [0, .15, .04], { jitter: .03 });
        P(lo, A.box(.72, .26, .2), rock, [0, -.13, .04], { jitter: .03 });
        lids.push({ up, lo });
      }
      // its hand, resting on the ground in front, fingers like boulders
      const hand = G(g, [5.5, 0, -5.2], [0, -.4, 0]);
      P(hand, A.box(2.6, .8, 2.2), rock, [0, .3, 0], { jitter: .15 });
      for (let f = 0; f < 4; f++) for (let k = 0; k < 3; k++) P(hand, A.ico(.42 - k * .05, 0), k % 2 ? rockL : rock, [-.95 + f * .62, .3 - k * .05, -1.4 - k * .72], { scale: [1, .8, 1.2], jitter: .06 });
      for (let k = 0; k < 2; k++) P(hand, A.ico(.38, 0), rockL, [1.55 + k * .45, .25, .2 - k * .5], { jitter: .06 });
      P(hand, A.box(2.4, .12, 2), turf, [0, .72, .1], { jitter: .08 });
      const tr = G(hand, [-.6, .7, .3]); P(tr, A.cyl(.05, .08, .5, 5), bark, [0, .25, 0]); P(tr, new T.ConeGeometry(.32, .9, 6), turfD, [0, .85, 0]);
      const glowLight = new T.PointLight('#ffcc66', 0, 14, 1.5); glowLight.position.set(-5.5, 2.4, -.8); g.add(glowLight);
      return (t) => {
        const b = Math.sin(t * .55);
        body.scale.set(1 + b * .012, 1 + b * .035, 1 + b * .012); body.position.y = b * .12;
        const open = pulse(t + 8, 22, 6) * (1 - pulse(t + 8 - 2.6, 22, .5) * .9);
        for (const { up, lo } of lids) { up.position.y = open * .2; lo.position.y = -open * .14; }
        eyeGlow.emissiveIntensity = .5 + open * 4; glowLight.intensity = open * 25;
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
      const big = (v.size || 1) * (v.age === 'young' ? .55 : v.age === 'old' ? 1.15 : 1);
      const g = G(root, [0, 13, 0], [0, -Math.PI / 2, 0]); g.scale.setScalar(big);
      const hide = A.mat('#2c3d5a', .05, .75, { emissive: '#1a2c48', emissiveIntensity: 1 });
      const bellyM = A.mat('#6f7f96', 0, .8, { emissive: '#1a2333', emissiveIntensity: .5 });
      const finM = ds('#2b3c58', .05, .8);
      const prof = [[0, -8], [1.2, -7], [2.2, -5], [2.6, -2.5], [2.5, 0], [2.1, 2.5], [1.5, 4.5], [.9, 6.4], [.5, 7.8], [.12, 8.6], [0, 8.7]]
        .map(([r, y]) => new T.Vector2(r, y));
      const body = new T.Mesh(A.facet(new T.LatheGeometry(prof, 18), .12, 3), hide);
      body.rotation.x = Math.PI / 2; body.scale.set(1.1, 1, .85); g.add(body);
      P(g, A.ico(1, 2), bellyM, [0, -1.1, -1], { scale: [1.9, .9, 6.5], jitter: .05 });
      const pleatM = A.mat('#3b4a63', 0, .85, { emissive: '#141c2a', emissiveIntensity: .5 });
      for (let i = 0; i < 9; i++) P(g, A.box(.06, .05, 5.2), pleatM, [(i - 4) * .3, -1.72 + Math.abs(i - 4) * .1, 3.2], { cast: false, jitter: 0 });   // throat grooves
      const spots = new T.MeshBasicMaterial({ color: '#7ff0e6', fog: false });
      const r = A.rand(77);
      const spotMeshes = [];
      for (let c = 0; c < 9; c++) {                                    // little constellations along its back and flanks
        const z0 = -6.5 + r() * 13, side = c % 2 ? 1 : -1, a0 = .3 + r() * .9;
        for (let i = 0; i < 4 + Math.floor(r() * 4); i++) {
          const z = z0 + (r() - .5) * 1.6, a = a0 + (r() - .5) * .35, rr = 2.5 * Math.sin(Math.PI * (z + 8) / 16.7) * 1.05;
          const m = new T.Mesh(A.ico(.06 + r() * .09, 0), spots); m.position.set(side * Math.cos(a) * rr * 1.1, Math.sin(a) * rr * .85 - .2, z); g.add(m);
          m.userData.ph = r() * 9; spotMeshes.push(m);
        }
      }
      const eyes = [];                                                  // a gentle eye: dark, with a soft teal ring
      for (const sx of [-1, 1]) {
        const e = G(g, [sx * 1.58, .05, 5.2], [0, sx * 1.35, 0]);
        P(e, A.ico(.17, 1), A.mat('#05080d', .3, .1), [0, 0, 0], { cast: false, jitter: 0 });
        const ring = new T.Mesh(new T.TorusGeometry(.19, .025, 4, 14), new T.MeshBasicMaterial({ color: '#6fd8cf', fog: false })); e.add(ring);
        eyes.push(e);
      }
      const fins = [];
      for (const sx of [-1, 1]) {
        const f = G(g, [sx * 2.1, -.5, 2.2]);
        sheet(f, [[0, 0, .8], [0, 0, -1.6], [sx * 5.5, -.3, -2.2], [sx * 6.8, -.4, -3.6], [sx * 3.0, -.2, -2.9]], [[0, 1, 2], [2, 3, 4], [1, 2, 4], [0, 2, 1]], finM);
        for (let i = 0; i < 4; i++) { const m = new T.Mesh(A.ico(.1, 0), spots); m.position.set(sx * (2 + i * 1.2), -.25, -1.4 - i * .5); f.add(m); }
        for (let i = 0; i < 6; i++) P(f, A.ico(.16, 0), hide, [sx * (.6 + i * 1.0), -.12, .45 - i * .52], { cast: false });   // the knobbled leading edge
        fins.push({ f, sx });
      }
      const fluke = G(g, [0, 0, -8]);
      sheet(fluke, [[0, 0, .6], [3.4, 0, -1.6], [1.2, 0, -.6], [0, 0, -.9], [-1.2, 0, -.6], [-3.4, 0, -1.6]], [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 5]], finM);
      const tendrils = [];
      const tMat = A.mat('#3a5a78', 0, .7, { emissive: '#1d4f6a', emissiveIntensity: .8 });
      for (let i = 0; i < 7; i++) {
        const base = G(g, [(i % 2 ? 1 : -1) * (.4 + (i % 3) * .35), -1.7, -4 + i * 1.2], [Math.PI, 0, 0]);
        tendrils.push(chain(base, 9, .55, .07, .015, tMat, { sides: 5, jitter: .005 }));
      }
      // star-dust trailing behind it, and rings when it sings
      const DN = 70, dp = new Float32Array(DN * 3), dl = Float32Array.from({ length: DN }, (_, i) => i / DN);
      const dg = new T.BufferGeometry(); dg.setAttribute('position', new T.BufferAttribute(dp, 3));
      root.add(new T.Points(dg, new T.PointsMaterial({ color: '#9ff3ea', size: .09, transparent: true, opacity: .7, depthWrite: false, fog: false })));
      const songs = [0, 1, 2].map(() => { const m = new T.Mesh(new T.TorusGeometry(1, .018, 3, 48), new T.MeshBasicMaterial({ color: '#8fe6dd', transparent: true, opacity: 0, depthWrite: false, fog: false })); root.add(m); return { m, born: -99 }; });
      const tail = V(), head = V(); let lastSong = -99, si = 0;
      return (t, dt = 1 / 60) => {
        const k = (t * .55 + 14) % 50;
        g.position.set(22 - k, 12.5 + Math.sin(t * .2) * .5, -1 + Math.sin(t * .07) * 2);
        g.rotation.z = Math.sin(t * .3) * .05; g.rotation.x = Math.sin(t * .23) * .03;
        for (const { f, sx } of fins) f.rotation.z = sx * Math.sin(t * .7) * .28;
        fluke.rotation.x = Math.sin(t * .7 - 1) * .3;
        tendrils.forEach((c, n) => c.forEach((j, i) => { j.rotation.x = Math.sin(t * .8 - i * .5 + n) * .08; j.rotation.z = Math.sin(t * .5 - i * .4 + n * 2) * .06; }));
        spotMeshes.forEach(m => m.scale.setScalar(.6 + .55 * Math.max(0, Math.sin(t * 1.2 - m.position.z * .5)) + .25 * Math.max(0, Math.sin(t * 3.1 + m.userData.ph))));
        eyes.forEach(e => { e.scale.y = 1 - pulse(t, 9, .35) * .85; });
        fluke.getWorldPosition(tail);
        for (let i = 0; i < DN; i++) {
          dl[i] += dt * .25; if (dl[i] > 1) { dl[i] = 0; dp[i * 3] = tail.x + Math.sin(i * 3.7) * .8; dp[i * 3 + 1] = tail.y + Math.cos(i * 2.3) * .6; dp[i * 3 + 2] = tail.z + Math.sin(i * 1.3) * .8; }
          dp[i * 3 + 1] -= dt * .25;                                    // drifting slowly down
        }
        dg.attributes.position.needsUpdate = true;
        if (t - lastSong > 12 + (Math.floor(t / 12) % 3) * 4) {        // it sings
          lastSong = t; const sg = songs[si++ % 3]; sg.born = t; g.localToWorld(head.set(0, 0, 6.5)); sg.m.position.copy(head);
        }
        for (const sg of songs) { const q = (t - sg.born) / 5; sg.m.visible = q < 1; if (q < 1) { sg.m.scale.setScalar(1 + q * 12); sg.m.material.opacity = .28 * (1 - q) * (1 - q); sg.m.lookAt(A.camera.position); } }
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
      const hx = -9.7, hz = -.1;                                       // open ground: clear of the buildings, the tree, the well and him
      const v = root.userData.appearance?.variant || {}, big = (v.size || 1) * (v.age === 'young' ? .7 : v.age === 'old' ? 1.12 : 1);
      const hide = A.mat('#7c6c55', 0, .8), band = A.mat('#4d4235', 0, .85), bone_ = A.mat('#e0d6bd', 0, .6), dark = A.mat('#0b0806', 0, 1);
      const hole = new T.Mesh(new T.CircleGeometry(1.25, 14), dark); hole.rotation.x = -Math.PI / 2; hole.position.set(hx, .035, hz); root.add(hole);
      const r = A.rand(5);
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * 6.28, d = 1.2 + r() * .25;
        P(root, A.box(.45 + r() * .3, .2 + r() * .25, .35 + r() * .3), i % 3 ? A.M.dirt : A.M.stone, [hx + Math.cos(a) * d, .08, hz + Math.sin(a) * d], { rot: [r() - .5, a, (r() - .5) * .9], jitter: .06 });
      }
      const base = G(root, [hx, -.6, hz], [0, -.63 + Math.PI, 0]); base.scale.setScalar(big);   // rearing up, leaning out over the lane, away from him
      const segs = chain(base, 9, .58, .95, .78, hide, { sides: 9, jitter: .04, each: (i, j, ra) => {
        P(j, A.cyl(ra * 1.07, ra * 1.07, .14, 9), band, [0, .05, 0], { jitter: .02 });
        for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28; P(j, A.box(.18, .3, .1), band, [Math.cos(a) * ra * 1.02, .3, Math.sin(a) * ra * 1.02], { rot: [0, -a, 0] }); }
      } });
      // the last segment is a hollow ring (its cap and joint ball would close the mouth)
      segs[8].remove(segs[8].children[1]); segs[8].remove(segs[8].children[0]); segs[7].remove(segs[7].children[1]);
      P(segs[8], new T.CylinderGeometry(.79, .8, .62, 9, 1, true), A.mat('#7c6c55', 0, .8, { side: T.DoubleSide }), [0, .3, 0], { jitter: .03 });
      const mouth = G(segs[8], [0, .66, 0]);
      P(mouth, new T.CylinderGeometry(.95, .8, .3, 10, 1, true), ds('#4d4235'), [0, 0, 0], { jitter: .04 });
      // a gullet going down into the dark, with a dim glow at the bottom
      const gullet = new T.Mesh(A.facet(new T.CylinderGeometry(.66, .1, .62, 12, 3, true), .03, 4), A.mat('#5a1410', 0, .85, { side: T.BackSide }));
      gullet.position.y = -.33; mouth.add(gullet);
      const throat = glow('#ff3a18', 1.2);
      const tc = new T.Mesh(new T.CircleGeometry(.13, 8), throat); tc.rotation.x = -Math.PI / 2; tc.position.y = -.63; mouth.add(tc);
      const rings = [];
      for (let ring = 0; ring < 3; ring++) {
        const rg = G(mouth, [0, .1 - ring * .08, 0]); rings.push(rg);
        const n = 12 - ring * 2, rad = .78 - ring * .18;
        for (let k = 0; k < n; k++) { const a = k / n * 6.28; P(rg, new T.ConeGeometry(.06 - ring * .01, .3 - ring * .08, 4), bone_, [Math.cos(a) * rad, .1, Math.sin(a) * rad], { rot: [Math.sin(a) * -.35, 0, Math.cos(a) * .35] }); }
      }
      for (let k = 0; k < 14; k++) { const a = k / 14 * 6.28; P(mouth, new T.ConeGeometry(.02, .35, 3), band, [Math.cos(a) * .98, .2, Math.sin(a) * .98], { rot: [Math.sin(a) * .5, 0, -Math.cos(a) * .5], cast: false }); }
      // another coil, breaking the ground outside the north wall
      const arch = new T.Mesh(A.facet(new T.TorusGeometry(2.3, .8, 8, 14, Math.PI), .05, 2), hide);
      arch.position.set(-11.5, -.25, -7.8); arch.rotation.y = .3; arch.castShadow = true; root.add(arch);
      for (let i = 0; i < 7; i++) { const a = .2 + i / 6 * (Math.PI - .4); const b = new T.Mesh(A.facet(new T.TorusGeometry(.86, .1, 5, 10), .02, i), band); b.position.set(Math.cos(a) * 2.3, Math.sin(a) * 2.3, 0); b.rotation.set(0, Math.PI / 2, 0); b.lookAt(0, 0, 0); b.rotateY(Math.PI / 2); arch.add(b); }
      for (let i = 0; i < 10; i++) P(root, A.box(.4 + r() * .4, .25, .4), A.M.dirt, [-11.5 + (i < 5 ? -2.3 : 2.3) * Math.cos(.3) + (r() - .5) * 1.4, .1, -7.8 + (i < 5 ? 2.3 : -2.3) * Math.sin(.3) * .5 + (r() - .5) * 1.4], { rot: [r(), r(), r()] });
      const crumbs = Array.from({ length: 10 }, (_, i) => ({ m: P(root, A.box(.08, .08, .08), A.M.dirt, [0, 0, 0], { cast: false }), ph: i / 10 }));
      const tip = new T.Vector3();
      return (t) => {
        const sway = Math.sin(t * .4);
        base.position.y = -.75 + .25 * (.5 + .5 * Math.sin(t * .23));
        segs.forEach((j, i) => { j.rotation.z = (i === 0 ? .05 : -.07) + sway * .025; j.rotation.x = Math.sin(t * .5 - i * .4) * .035; });
        rings.forEach((rg, i) => { rg.rotation.y = t * (i % 2 ? -.4 : .3); });
        throat.emissiveIntensity = 1 + Math.sin(t * 1.6) * .5;
        segs[5].getWorldPosition(tip);
        for (const c of crumbs) {
          const k = (t * .5 + c.ph) % 1;
          c.m.position.set(tip.x + Math.sin(c.ph * 40) * .9, tip.y * (1 - k * k), tip.z + Math.cos(c.ph * 40) * .9);
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
      const g = G(root, [-20.3, 0, -.3], [0, Math.PI / 2, 0]);
      const iron = A.mat('#4a423b', .55, .65, { emissive: '#1b2b28', emissiveIntensity: .55 }), rust = A.mat('#6b4632', .3, .8, { emissive: '#1d1a14', emissiveIntensity: .4 }), dark = A.mat('#2a2724', .5, .7);   // a faint, cold sheen
      const cloth = ds('#1f1b19', 0, 1), bonec = A.mat('#cfc6ad', 0, .7), eyeMat = glow('#9ff0dc', 3, { fog: false });
      const mound = G(root, [-21.6, 0, -.3]);
      P(mound, A.ico(1, 1), A.mat('#38422a', 0, 1), [0, -.25, 0], { scale: [3.3, 1.15, 2.8], jitter: .1 });
      P(mound, A.box(1.3, .18, 1.0), A.M.stone, [1.7, .35, .5], { rot: [.1, .3, -.5], jitter: .05 });
      P(mound, A.box(.25, 1.6, .9), A.M.stoneD, [2.6, .7, -1.5], { rot: [0, .2, .15], jitter: .06 });
      P(mound, A.box(.25, 1.3, .8), A.M.stoneD, [2.5, .6, 1.6], { rot: [0, -.25, -.12], jitter: .06 });
      for (const [x, z, a] of [[1.0, 2.2, .3], [2.6, -2.8, -.2], [3.6, 2.6, .5]]) {
        const s = G(root, [-21.6 + x, 0, -.3 + z], [a, a * 2, a * .5]);
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
        const holder = G(root, [-9 - rnd() * 13, .35 + rnd() * 2.1, -4.5 + rnd() * 9]);
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
      const g = G(root, [-11, 6.5, -.5]), ring = G(g);
      const boneM = A.mat('#d9cfb6', 0, .7), boneD = A.mat('#a89b7e', 0, .8);
      const tor = new T.Mesh(A.facet(new T.TorusGeometry(2.1, .22, 6, 27), .05, 3), boneM); tor.castShadow = true; ring.add(tor);
      for (let i = 0; i < 18; i++) { const a = i / 18 * 6.28; P(ring, new T.ConeGeometry(.07, .5 + (i % 3) * .15, 4), boneD, [Math.cos(a) * 2.4, Math.sin(a) * 2.4, 0], { rot: [0, 0, a - Math.PI / 2] }); }
      const eyes = [], r = A.rand(9);
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * 6.28 + .2, at = [Math.cos(a) * 2.1, Math.sin(a) * 2.1, .1];
        P(ring, A.ico(.38, 1), boneD, at, { scale: [1, 1, .45] });
        const e = eyeball(ring, .3, ['#c9a6ff', '#ffd27a', '#9fe8d8'][i % 3], [at[0], at[1], .3]);
        eyes.push({ e, look: V(-11 + (r() - .5) * 12, r() * 3, (r() - .5) * 8), want: V(), next: 0, k: i });
      }
      const lamp = new T.PointLight('#b49cff', 3, 12, 1.5); g.add(lamp);
      const head = V(), cam = V();
      return (t, dt) => {
        g.position.y = 6.5 + Math.sin(t * .4) * .3; ring.rotation.z = t * .05;
        A.camera.getWorldPosition(cam); g.lookAt(cam.x, cam.y - 2, cam.z);   // its face turned down toward whoever is below
        A.K.J.hips.getWorldPosition(head); head.y += .75;
        const all = pulse(t + 12, 24, 5) > .05;
        for (const s of eyes) {
          if (t > s.next) { const q = A.rand(Math.floor(t * 10) + s.k * 77); s.want.set(-8 + (q() - .5) * 14, q() * 3, 2 + (q() - .5) * 10); s.next = t + 2 + q() * 4; }
          s.look.lerp(all ? head : s.want, 1 - Math.exp(-dt * (all ? 6 : 2)));
          s.e.lookAt(s.look);
          s.e.scale.y = 1 - pulse(t + s.k * 1.7, 6 + s.k * .4, .2) * .9;
        }
        lamp.intensity = all ? 6 : 3 + Math.sin(t) * .5;
      };
    },
  },

  // ================================================================ THE SECOND MOON
  moon2: {
    name: 'The Second Moon', hour: 22,
    blurb: 'Some nights there is another moon: pale green, a little too close, with thin rings slowly turning. Small things fall from it.',
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
      const tint = new T.DirectionalLight('#9fd49a', .35); tint.position.set(-26, 30, -48); root.add(tint);
      const fallMat = new T.MeshBasicMaterial({ color: '#e2ffd8', fog: false, transparent: true });
      const falling = Array.from({ length: 12 }, (_, i) => { const m = new T.Mesh(A.ico(.22, 0), fallMat.clone()); root.add(m); return { m, ph: i / 12, x: (i % 4 - 1.5) * 6, z: (Math.floor(i / 4) - 1) * 5 }; });
      return (t) => {
        body.rotation.y = t * .01; halo.material.opacity = .3 + Math.sin(t * .5) * .06;
        rings.forEach((m, i) => { m.rotation.z = .35 + t * (.02 + i * .01); });
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
    blurb: 'One of the things that fell. A pale grub the size of a cart, lit from inside with starlight, curled in a crater in the courtyard. It seems harmless. It is a little bigger every time it comes back.',
    view: [[-8.6, 2.4, 4.8], [-13.3, .5, 1.1]],
    knight: { place: 'courtyard', action: 'stand', emote: 'question', note: 'wondering whether it is warm, or cold, or anything at all' },
    build(root) {
      const cx = -13.6, cz = 1.4;
      const pit = new T.Mesh(new T.CircleGeometry(1.9, 14), A.mat('#14100d', 0, 1)); pit.rotation.x = -Math.PI / 2; pit.position.set(cx, .03, cz); root.add(pit);
      const r = A.rand(17), shardM = glow('#cfe2ff', 1.6);
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * 6.28, d = 1.8 + r() * .4;
        P(root, A.box(.4 + r() * .3, .18 + r() * .2, .35), i % 3 ? A.M.dirt : A.M.stone, [cx + Math.cos(a) * d, .08, cz + Math.sin(a) * d], { rot: [r() - .5, a, (r() - .5) * .8] });
        if (i % 2) P(root, new T.TetrahedronGeometry(.05 + r() * .05), shardM, [cx + Math.cos(a + .2) * (d - .5), .06, cz + Math.sin(a + .2) * (d - .5)], { cast: false });
      }
      const skin = new T.MeshStandardMaterial({ color: '#e6e1f2', transparent: true, opacity: .7, roughness: .35, emissive: '#7f8ad8', emissiveIntensity: .75, flatShading: true, depthWrite: false });
      const band = A.mat('#cfc8e0', 0, .5), dark = A.mat('#1b1626');
      const g = G(root, [cx, 0, cz], [0, .6, 0]);
      const N = 11, segs = [];
      for (let i = 0; i < N; i++) {
        const rad = .5 * Math.pow(Math.sin(Math.PI * (i + .6) / (N + .4)), .6) + .14;
        const s = G(g);
        P(s, A.ico(rad, 1), skin, [0, 0, 0], { scale: [1, .9, .8], jitter: .02 });
        P(s, A.cyl(rad * 1.0, rad * 1.0, rad * .08, 9), band, [0, 0, 0], { rot: [Math.PI / 2, 0, 0], jitter: .01 });
        const sp = [], n = 14;
        for (let k = 0; k < n; k++) { const v = V(r() - .5, r() - .5, r() - .5).normalize().multiplyScalar(r() * rad * .7); sp.push(v.x, v.y, v.z); }
        const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
        s.add(new T.Points(pg, new T.PointsMaterial({ color: '#ffffff', size: .07, transparent: true, depthWrite: false })));
        if (i > 1 && i < N - 1) for (const sx of [-1, 1]) P(s, new T.ConeGeometry(.03, .18, 4), band, [sx * rad * .5, -rad * .8, 0], { rot: [0, 0, Math.PI + sx * .4] });
        segs.push({ s, rad, i });
      }
      const head = segs[N - 1].s;
      P(head, new T.CircleGeometry(.1, 10), dark, [0, 0, .17], { cast: false, jitter: 0 });
      for (const sx of [-1, 1]) bone(head, [sx * .06, .08, .1], [sx * .16, .26, .25], .015, .006, band, 4);
      const lamp = softLight('#9fb4ff', 2.5, 3.2); lamp.position.set(cx, .8, cz); root.add(lamp);
      const p = V(), q = V();
      return (t) => {
        const R = 1.5 + Math.sin(t * .35) * .08;
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
      const base = [2.6, 0, 12.6];
      P(root, A.ico(1, 1), A.mat('#3e4a2e', 0, 1), [base[0], -.9, base[2]], { scale: [3.2, 1.4, 2.6], jitter: .1 });
      const g = G(root, [base[0], .45, base[2]], [0, Math.PI, 0]); g.scale.setScalar(1.3);
      const skin = A.mat('#2f2b27', 0, .9), cloth = ds('#1b1918'), antler = A.mat('#d2c6aa', 0, .7), ear = A.mat('#b8a39b', 0, .6);
      for (const sx of [-1, 1]) { bone(g, [sx * .14, 1.75, 0], [sx * .17, .85, .05], .07, .05, skin); bone(g, [sx * .17, .85, .05], [sx * .15, 0, 0], .05, .035, skin); }
      P(g, A.cyl(.2, .14, .9, 6), skin, [0, 2.15, 0], { scale: [1, 1, .7] });
      for (let i = 0; i < 7; i++) {
        const c = G(g, [(i - 3) * .09, 2.55, -.12 - Math.abs(i - 3) * .02]), len = 2.0 + ((i * 41) % 5) * .14;
        sheet(c, [[-.06, 0, 0], [.06, 0, 0], [.05, -len, -.04], [0, -len - .2, -.04], [-.05, -len + .08, -.04]], [[0, 1, 2], [0, 2, 3], [0, 3, 4]], cloth);
      }
      const arms = [];
      for (const sx of [-1, 1]) {
        const sh = G(g, [sx * .24, 2.5, 0]);
        bone(sh, [0, 0, 0], [sx * .08, -.9, .05], .05, .04, skin); bone(sh, [sx * .08, -.9, .05], [sx * .05, -1.85, .12], .04, .03, skin);
        for (let f = 0; f < 3; f++) bone(sh, [sx * .05, -1.85, .12], [sx * (.03 + f * .03), -2.2, .14 + f * .02], .012, .006, skin, 4);
        arms.push(sh);
      }
      const neck = G(g, [0, 2.62, 0]), head = G(neck, [0, .18, .03]);
      bone(neck, [0, 0, 0], [0, .2, .03], .05, .045, skin);
      P(head, A.ico(.15, 1), A.mat('#cfc6b5', 0, .7), [0, 0, 0], { scale: [.9, 1.1, 1] });
      const ears = [], r = A.rand(5);
      const branch = (parent, from, dir, len, depth) => {
        const to = [from[0] + dir[0] * len, from[1] + dir[1] * len, from[2] + dir[2] * len];
        bone(parent, from, to, .03 * (depth + 1) * .7, .02 * (depth + .6) * .6, antler, 5);
        if (depth === 0) {
          const o = G(parent, to); o.quaternion.setFromUnitVectors(V(0, 1, 0), V(...dir).normalize());
          const e = G(o); P(e, new T.ConeGeometry(.1, .28, 5), ear, [0, .12, 0], { scale: [1, 1, .4] });
          ears.push({ e, ph: r() * 9 }); return;
        }
        for (const s of [-1, 1]) {
          const d = V(dir[0] + s * .45 * (r() + .4), dir[1] + .1, dir[2] + (r() - .5) * .5).normalize();
          branch(parent, to, [d.x, d.y, d.z], len * .62, depth - 1);
        }
      };
      for (const sx of [-1, 1]) branch(head, [sx * .07, .12, 0], [sx * .55, .83, -.1], .55, 3);
      return (t) => {
        head.rotation.z = Math.sin(t * .23) * .25 + pulse(t, 11, 2) * .35;
        head.rotation.x = .1 + Math.sin(t * .17) * .06;
        for (const { e, ph } of ears) e.rotation.z = pulse(t + ph, 3.5 + ph * .3, .3) * .6;
        arms.forEach((a, i) => { a.rotation.x = Math.sin(t * .3 + i) * .03; });
      };
    },
  },

  // ================================================================ THE DREAM-LEECH
  leech: {
    name: 'The Dream-Leech', hour: 22,
    blurb: 'A vast, clear thing that swims through the air as if it were water, with small stars drifting inside it. When it passes over the keep while the knight sleeps, his dreams that night are strange, and not his own.',
    view: [[-10.5, 3.4, 7.5], [-2, 5.2, -.5]],
    knight: { place: 'bedroll', action: 'sleep', emote: 'zzz', note: 'dreaming something that is not his' },
    build(root) {
      const skin = new T.MeshStandardMaterial({ color: '#9db2e6', transparent: true, opacity: .3, roughness: .2, emissive: '#3a4f8a', emissiveIntensity: .6,
                                                flatShading: true, depthWrite: false, side: T.DoubleSide });
      const rimM = new T.MeshStandardMaterial({ color: '#c7d4ff', emissive: '#7f95e0', emissiveIntensity: .9, flatShading: true, transparent: true, opacity: .7 });
      const N = 14, segs = [], r = A.rand(23);
      for (let i = 0; i < N; i++) {
        const rad = (i < 2 ? .7 + i * .25 : 1.25 * (1 - (i - 2) / (N - 1)) + .25);
        const s = new T.Group(); root.add(s);
        const m = new T.Mesh(A.facet(new T.IcosahedronGeometry(rad, 1), .04, i), skin); m.scale.set(1, .75, 1.3); s.add(m);
        const sp = [];
        for (let k = 0; k < 22; k++) { const v = V(r() - .5, r() - .5, r() - .5).normalize().multiplyScalar(r() * rad * .7); sp.push(v.x, v.y * .75, v.z * 1.3); }
        const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
        s.add(new T.Points(pg, new T.PointsMaterial({ color: '#fff6dc', size: .08, transparent: true, depthWrite: false })));
        segs.push({ s, rad });
      }
      const mouth = new T.Mesh(new T.TorusGeometry(.55, .09, 5, 14), rimM); mouth.position.z = .85; segs[0].s.add(mouth);
      for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28; P(segs[0].s, new T.ConeGeometry(.03, .15, 3), rimM, [Math.cos(a) * .5, Math.sin(a) * .5, .9], { rot: [Math.PI / 2, 0, 0], cast: false }); }
      const lamp = new T.PointLight('#8fa6ff', 3, 10, 1.5); segs[0].s.add(lamp);
      const path = s => V(-2 + Math.cos(s) * 7.5, 6.4 + Math.sin(s * 2) * .8, Math.sin(s) * 5.5);
      return (t) => {
        const s0 = t * .1;
        segs.forEach(({ s }, i) => {
          const at = path(s0 - i * .085); at.y += Math.sin(t * 1.4 - i * .55) * .35;
          s.position.copy(at); s.lookAt(path(s0 - i * .085 + .02));
          s.scale.setScalar(1 + Math.sin(t * 1.4 - i * .55) * .06);
        });
        lamp.intensity = 2.5 + Math.sin(t * 1.4) * .8;
      };
    },
  },

  // ================================================================ THE SEAM
  seam: {
    name: 'The Seam', hour: 22,
    blurb: 'Seen only by those who have seen enough. A crack in the air above the courtyard. Through it, something enormous moves in a space that should not be there. Sometimes a hand comes through, feeling around.',
    view: [[-7.0, 2.2, 4.9], [-11.4, 3.7, -.3]],
    knight: { place: 'courtyard', action: 'stand', emote: 'exclaim', note: 'very still, in case the hand is looking for him' },
    build(root) {
      const g = G(root, [-11.5, 4.1, -.3], [0, .45, 0]);
      const pts = [[0, 2.2], [.18, 1.6], [.42, 1.3], [.3, .8], [.62, .3], [.5, -.3], [.7, -.8], [.35, -1.3], [.2, -1.8], [0, -2.3],
                   [-.22, -1.7], [-.45, -1.2], [-.3, -.6], [-.66, -.1], [-.48, .5], [-.62, 1.0], [-.3, 1.4], [-.16, 1.8]];
      const shape = new T.Shape(pts.map(([x, y]) => new T.Vector2(x, y)));
      const tex = canvasTex(256, 512, (c, w, h) => {
        const gr = c.createRadialGradient(w * .5, h * .5, 10, w * .5, h * .5, h * .6);
        gr.addColorStop(0, '#2a1a4a'); gr.addColorStop(1, '#05030c'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
        const r = A.rand(3);
        for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(230,220,255,${.3 + r() * .7})`; c.fillRect(r() * w, r() * h, r() < .1 ? 2 : 1, r() < .1 ? 2 : 1); }
        c.fillStyle = 'rgba(190,170,255,.18)'; c.beginPath(); c.ellipse(w * .5, h * .55, 110, 46, .2, 0, 6.3); c.fill();   // something vast, an eye
        c.fillStyle = 'rgba(255,214,140,.55)'; c.beginPath(); c.ellipse(w * .5, h * .55, 34, 34, 0, 0, 6.3); c.fill();
        c.fillStyle = '#05030c'; c.beginPath(); c.ellipse(w * .5, h * .55, 7, 26, 0, 0, 6.3); c.fill();
      });
      tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(.9, .45);
      const sg = new T.ShapeGeometry(shape); const uv = sg.attributes.uv, pos = sg.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + .7) / 1.4, (pos.getY(i) + 2.3) / 4.5);
      const inner = new T.Mesh(sg, new T.MeshBasicMaterial({ map: tex, fog: false, side: T.DoubleSide })); g.add(inner);
      const edge = glow('#e2d2ff', 2.4, { fog: false });
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; const m = bone(g, [a[0], a[1], 0], [b[0], b[1], 0], .035, .035, edge, 4, 0); m.castShadow = false; }
      const lamp = new T.PointLight('#b9a2ff', 5, 10, 1.4); lamp.position.z = .8; g.add(lamp);
      // the hand: a long pale arm feeling its way out
      const pale = A.mat('#d8d0c4', 0, .6, { emissive: '#3a3448', emissiveIntensity: .6 }), arm = G(g, [.05, -.3, 0], [Math.PI / 2 + .5, 0, 0]);
      const fore = chain(arm, 4, .42, .11, .07, pale, { sides: 6 });
      const hand = G(fore[3], [0, .42, 0]); P(hand, A.box(.2, .18, .07), pale, [0, .06, 0]);
      const fingers = [];
      for (let f = 0; f < 5; f++) {
        const fb = G(hand, [(f - 2) * .045, .14, 0], [f === 0 ? .3 : 0, 0, (f - 2) * .12]);
        fingers.push(chain(fb, 3, f === 0 ? .1 : .16, .022, .012, pale, { sides: 5, jitter: .003 }));
      }
      const motes = Array.from({ length: 10 }, (_, i) => { const m = new T.Mesh(A.ico(.03, 0), edge); g.add(m); return { m, ph: i / 10 }; });
      return (t) => {
        tex.offset.set(.05 + Math.sin(t * .07) * .05, .25 + Math.sin(t * .05 + 1) * .25);
        const reach = .5 + .5 * Math.sin(t * .3);
        arm.rotation.x = Math.PI / 2 + .75 + reach * .35; arm.rotation.z = -.5 + Math.sin(t * .37) * .3; arm.scale.setScalar(.9 + reach * .55);
        fore.forEach((j, i) => { j.rotation.x = Math.sin(t * .8 - i) * .15; j.rotation.z = Math.sin(t * .5 + i) * .1; });
        const curl = .5 + .5 * Math.sin(t * 1.1);
        fingers.forEach(c => c.forEach(j => { j.rotation.x = .15 + curl * .5; }));
        for (const { m, ph } of motes) { const k = (t * .15 + ph) % 1; m.position.set(Math.sin(ph * 40) * .5 * k, Math.cos(ph * 30) * 1.6, k * 2.5); m.visible = k > .05; }
        edge.emissiveIntensity = 2 + Math.sin(t * 2.3) * .6; lamp.intensity = 4.5 + Math.sin(t * 2.3) * 1.2;
      };
    },
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
      const arm = G(body, [.24, 2.45, 0]);
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
      let x = -11, dir = 1;
      return (t, dt) => {
        const target = -11.3 + Math.sin(t * .09) * 3.8, v = target - x; x = target;
        if (Math.abs(v) > 1e-4) dir = Math.sign(v);
        g.position.x = x; g.rotation.y += ((dir > 0 ? Math.PI / 2 : -Math.PI / 2) - g.rotation.y) * Math.min(1, dt * 3);
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
      const OUT = [[-8.6, -1.4], [-9.4, 3.1], [-7.4, -.9], [-10.4, -.5], [-9.6, 1.5], [-7.0, 2.3], [-11.8, .5]];
      const STEP = [-6.0, 1.0], IN = [[-4.5, 1.0], [-3.7, 1.8], [-3.9, .2], [-2.6, -2.4]];   // the doorstep, and inside the hall
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
        if (isIn(c.node)) return STEP;
        if (isStep(c.node)) return r < .55 ? IN[Math.floor(c.s() * IN.length)] : OUT[Math.floor(c.s() * OUT.length)];
        return r < .25 ? STEP : OUT[Math.floor(c.s() * OUT.length)];
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
              const j = isIn(c.node) || isStep(c.node) ? .15 : .5;
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
    view: [[-7.6, 1.7, 1.4], [-24, 3.4, -1.6]],
    knight: { place: 'courtyard', action: 'stand', emote: 'dots', note: 'not looking at it. Not looking at it.' },
    build(root) {
      const g = G(root, [-27.5, 0, -1.6], [0, Math.PI / 2, 0]);
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
    blurb: 'A night when the stars visibly move, and the sky turns out to have seams. Something vast looks down through the gaps between the stitches.',
    view: [[-8, 1.6, 3.6], [-6, 17, -40]],
    knight: { place: 'courtyard', action: 'gaze', emote: 'exclaim', note: 'looking up at the seams in the sky' },
    build(root) {
      const W = 1024, H = 512, cvs = document.createElement('canvas'); cvs.width = W; cvs.height = H;
      const c = cvs.getContext('2d'), tex = new T.CanvasTexture(cvs); tex.colorSpace = T.SRGBColorSpace;
      const tear = [[150, 250], [300, 205], [460, 185], [620, 195], [780, 225], [900, 262], [780, 300], [620, 330], [460, 335], [300, 315]];
      const small = [[620, 70], [690, 58], [760, 66], [690, 92]];
      const path = pts => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); };
      let look = { x: 0, y: 0 };
      const draw = (t) => {
        c.clearRect(0, 0, W, H);
        c.save(); path(tear); c.clip();
        const gr = c.createLinearGradient(0, 180, 0, 340); gr.addColorStop(0, '#1a0a20'); gr.addColorStop(.5, '#3a1430'); gr.addColorStop(1, '#1a0a20');
        c.fillStyle = gr; c.fillRect(0, 0, W, H);
        const ex = 525 + look.x * 90, ey = 262 + look.y * 25;
        c.fillStyle = '#a89c78'; c.beginPath(); c.ellipse(ex, ey, 150, 52, 0, 0, 6.3); c.fill();
        c.fillStyle = '#c4862a'; c.beginPath(); c.arc(ex + look.x * 30, ey, 44, 0, 6.3); c.fill();
        c.fillStyle = '#f2c060'; c.beginPath(); c.arc(ex + look.x * 30, ey, 30, 0, 6.3); c.fill();
        c.fillStyle = '#120608'; c.beginPath(); c.ellipse(ex + look.x * 30, ey, 7 + Math.sin(t * .7) * 3, 40, 0, 0, 6.3); c.fill();
        c.restore();
        c.save(); path(small); c.clip(); c.fillStyle = '#2a0f28'; c.fillRect(0, 0, W, H);
        c.fillStyle = '#c9b48a'; c.beginPath(); c.arc(690 + Math.sin(t * .4) * 20, 75, 16, 0, 6.3); c.fill(); c.restore();
        c.strokeStyle = '#efe3c8'; c.lineWidth = 3; path(tear); c.stroke(); path(small); c.stroke();
        c.lineWidth = 4; c.strokeStyle = '#f6ecd6';
        for (let i = 0; i < 14; i++) {   // the stitches holding it shut
          const x = 200 + i * 48, top = 232 - Math.sin((i + .5) / 14 * Math.PI) * 50, bot = 270 + Math.sin((i + .5) / 14 * Math.PI) * 60;
          c.beginPath(); c.moveTo(x - 10, top - 14); c.lineTo(x + 10, bot + 14); c.stroke();
        }
        for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(655 + i * 30, 56); c.lineTo(668 + i * 30, 92); c.stroke(); }
        tex.needsUpdate = true;
      };
      draw(0);
      const plane = new T.Mesh(new T.PlaneGeometry(64, 32), new T.MeshBasicMaterial({ map: tex, transparent: true, fog: false, depthWrite: false }));
      plane.position.set(-6, 24, -50); plane.lookAt(-8, 1.6, 3.6); root.add(plane);
      // stars that slowly swirl out of place
      const N = 260, pos = new Float32Array(N * 3), seeds = [], r = A.rand(61);
      for (let i = 0; i < N; i++) seeds.push({ a: r() * 6.28, d: 6 + r() * 34, sp: (r() - .5) * .03 });
      const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(pos, 3));
      const stars = new T.Points(sg, new T.PointsMaterial({ color: '#e8e2ff', size: .35, fog: false, transparent: true, depthWrite: false })); root.add(stars);
      const right = V(1, 0, 0).applyQuaternion(plane.quaternion), up = V(0, 1, 0).applyQuaternion(plane.quaternion);
      const camPos = V(), toCam = V();
      let lastDraw = 0;
      return (t) => {
        for (let i = 0; i < N; i++) {
          const s = seeds[i], a = s.a + t * s.sp * (40 / s.d);
          const x = Math.cos(a) * s.d, y = Math.sin(a) * s.d * .55;
          pos[i * 3] = plane.position.x + right.x * x + up.x * y; pos[i * 3 + 1] = plane.position.y + right.y * x + up.y * y; pos[i * 3 + 2] = plane.position.z + right.z * x + up.z * y + 1;
        }
        sg.attributes.position.needsUpdate = true;
        if (t - lastDraw > .08) {
          A.camera.getWorldPosition(camPos); toCam.copy(camPos).sub(plane.position).normalize();
          look = { x: Math.max(-1, Math.min(1, toCam.dot(right) * 3 + Math.sin(t * .2) * .3)), y: Math.max(-1, Math.min(1, -toCam.dot(up) * 3)) };
          draw(t); lastDraw = t;
        }
      };
    },
  },

  // ================================================================ THE MANY-JOINTED
  manyjoint: {
    name: 'The Many-Jointed', hour: 22,
    blurb: 'Something with far too many limbs folds itself into the high corner of the hall at night. You only see it when the lantern swings that way.',
    view: [[1.2, 2.1, .2], [4.6, 3.2, -3.8]],
    knight: { place: 'bedroll', action: 'sleep', emote: 'zzz', note: 'asleep, under the corner' },
    build(root) {
      const pale = A.mat('#d6d0c6', 0, .6), paleD = A.mat('#a49d92', 0, .7);
      const g = G(root, [4.75, 3.25, -3.8], [0, -Math.PI * .75, 0]);
      const body = G(g);
      P(body, A.ico(.16, 1), pale, [0, 0, 0], { scale: [1, 2.2, .9] });
      const head = G(body, [0, .42, .06]); P(head, A.ico(.11, 1), pale, [0, 0, 0], { scale: [.8, 1, 1] });
      P(head, A.box(.08, .012, .02), A.mat('#1a1416'), [0, -.03, .1], { cast: false });
      const limbs = [], r = A.rand(4);
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * 6.28;
        const base = G(body, [Math.cos(a) * .12, (r() - .5) * .5, Math.sin(a) * .1], [0, -a + Math.PI / 2, 0]);
        base.rotation.z = 1.0 + (r() - .5) * .8;   // splayed outward
        const j = chain(base, 4, .4 + r() * .15, .035, .012, i % 2 ? pale : paleD, { sides: 5, jitter: .004 });
        P(j[3], new T.ConeGeometry(.018, .14, 4), paleD, [0, .45, 0]);
        limbs.push({ j, ph: r() * 6, bend: [(r() - .5) * .6, 1.3 + r() * .4, -1.5 - r() * .3, .8] });
      }
      // a lantern hanging from the beams, swinging
      const hook = G(root, [2.8, 4.1, -2.3]);
      bone(hook, [0, 0, 0], [0, -1.1, 0], .008, .008, A.M.iron, 4);
      const lantern = G(hook, [0, -1.2, 0]);
      P(lantern, A.box(.14, .2, .14), A.M.iron, [0, 0, 0]); P(lantern, A.box(.1, .14, .1), glow('#ffc46b', 2.2), [0, 0, 0], { cast: false });
      const lamp = new T.PointLight('#ffb86a', 5, 7, 1.4); lantern.add(lamp);
      return (t) => {
        const swing = Math.sin(t * .9);
        hook.rotation.z = swing * .55; hook.rotation.x = Math.cos(t * .9) * .2;
        const lit = smooth(.2, .9, swing);   // when the light swings its way, it draws in
        body.scale.setScalar(1 + Math.sin(t * 1.3) * .03);
        for (const { j, ph, bend } of limbs) j.forEach((jt, i) => {
          jt.rotation.x = i === 0 ? bend[0] : bend[i] * (1 + lit * .25) + Math.sin(t * .7 + ph + i) * .06 + (pulse(t + ph, 5, .25) * .3);
        });
        head.rotation.y = Math.sin(t * .4) * .5 - lit * .4;
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
    view: [[-1.1, 1.95, -1.55], [-.6, 2.45, -4.0]],
    knight: { place: 'window', action: 'gaze', emote: 'spark', note: 'memorising the map on its wings' },
    build(root) {
      const mapTex = canvasTex(512, 256, (c, w, h) => {
        c.clearRect(0, 0, w, h);
        const wing = sx => {
          c.save(); c.translate(w / 2, h / 2); c.scale(sx, 1);
          c.beginPath(); c.moveTo(8, -6); c.bezierCurveTo(60, -120, 230, -125, 240, -60); c.bezierCurveTo(250, -20, 170, 10, 120, 6);
          c.bezierCurveTo(200, 30, 210, 110, 140, 118); c.bezierCurveTo(80, 124, 20, 60, 8, 10); c.closePath();
          c.fillStyle = '#e8d8b0'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#6b4a2a'; c.stroke(); c.clip();
          const r = A.rand(sx > 0 ? 3 : 8);
          c.fillStyle = '#9fb7a6'; c.beginPath(); c.moveTo(40, -130);   // the sea, with a ragged coast
          for (let y = -130; y < 130; y += 12) c.lineTo(150 + Math.sin(y * .05) * 30 + (r() - .5) * 20, y);
          c.lineTo(260, 130); c.lineTo(260, -130); c.closePath(); c.fill();
          c.strokeStyle = '#5a7a8a'; c.lineWidth = 2; c.beginPath(); c.moveTo(20, -40);
          for (let x = 20; x < 150; x += 10) c.lineTo(x, -40 + Math.sin(x * .08) * 14 + x * .3); c.stroke();   // a river
          c.fillStyle = '#6b4a2a';
          for (let i = 0; i < 6; i++) { const x = 40 + r() * 80, y = -90 + r() * 60; c.beginPath(); c.moveTo(x - 9, y + 8); c.lineTo(x, y - 8); c.lineTo(x + 9, y + 8); c.fill(); }
          c.fillStyle = '#4e6a3a'; for (let i = 0; i < 10; i++) { c.beginPath(); c.arc(30 + r() * 90, 30 + r() * 70, 4, 0, 6.3); c.fill(); }
          c.setLineDash([5, 5]); c.strokeStyle = '#9a2b1f'; c.lineWidth = 2; c.beginPath(); c.moveTo(25, 90);
          c.bezierCurveTo(60, 40, 90, 20, 115, -20); c.stroke(); c.setLineDash([]);
          if (sx > 0) { c.strokeStyle = '#9a2b1f'; c.lineWidth = 3; c.beginPath(); c.moveTo(108, -28); c.lineTo(122, -12); c.moveTo(122, -28); c.lineTo(108, -12); c.stroke(); }
          c.strokeStyle = 'rgba(107,74,42,.5)'; c.lineWidth = 1; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(8, 0); c.lineTo(240 * Math.cos(-.9 + i * .5), 120 * Math.sin(-.9 + i * .5)); c.stroke(); }
          c.restore();
        };
        wing(1); wing(-1);
        c.fillStyle = '#4a3626'; c.beginPath(); c.ellipse(w / 2, h / 2 + 4, 9, 60, 0, 0, 6.3); c.fill();
      });
      const wingMat = new T.MeshStandardMaterial({ map: mapTex, emissiveMap: mapTex, emissive: '#ffd9a0', emissiveIntensity: .35, transparent: true, alphaTest: .4, side: T.DoubleSide, roughness: .9 });
      const big = G(root, [-.55, 2.5, -3.98], [0, 0, -.06]); big.scale.setScalar(1.35);
      const fur = A.mat('#5a4636', 0, 1), furL = A.mat('#8a7458', 0, 1);
      for (let i = 0; i < 5; i++) P(big, A.ico(.055 - i * .005, 1), i % 2 ? furL : fur, [0, .07 - i * .06, .02], { scale: [1, 1.2, .9] });
      for (const sx of [-1, 1]) {
        const ant = G(big, [sx * .02, .12, .02], [0, 0, sx * -.45]);
        bone(ant, [0, 0, 0], [0, .2, .03], .007, .004, fur, 4);
        for (let k = 0; k < 5; k++) bone(ant, [0, .03 + k * .035, .01], [sx * .04, .05 + k * .035, .02], .003, .002, furL, 3);
      }
      const wings = [];
      for (const sx of [-1, 1]) {
        const w = G(big, [0, .0, .01]);
        const plane = new T.PlaneGeometry(.55, .55);
        const uv = plane.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, sx > 0 ? .5 + uv.getX(i) * .5 : uv.getX(i) * .5);
        const m = new T.Mesh(plane, wingMat); m.position.x = sx * .275; w.add(m); wings.push({ w, sx });
      }
      return (t) => {
        const shut = pulse(t + 3, 9, 1.2);
        for (const { w, sx } of wings) w.rotation.y = -sx * (shut * 1.3 + Math.sin(t * 1.5) * .05);
        big.position.y = 2.5 + pulse(t + 3, 9, 1.2) * .04;
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
      const size = (v.size || 1) * (v.age === 'young' ? .7 : v.age === 'old' ? 1.1 : 1);
      const g = G(root, [-11, 0, 7.8]); const stag = G(g); stag.scale.setScalar(size);
      const bark = A.mat('#4a3b2a', 0, .95), barkD = A.mat('#2f251b', 0, .95), core = A.mat('#3a2e20', 0, 1);
      const leaf = A.mat('#56703a', 0, .9), leafL = A.mat('#7a9548', 0, .9), moss = A.mat('#4f6a33', 0, 1);
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
          if (i % 7 === 3) P(parent, A.ico(.045, 0), r() < .7 ? bloom : bloomW, prev, { cast: false });
          if (i % 9 === 5) P(parent, A.ico(.08, 0), moss, prev, { scale: [1, .5, 1], cast: false });
        }
      };
      const body = G(stag, [0, 0, 0]);
      weave(body, [0, 2.05, .25], [.42, .5, .55], 64, .042);               // the deep chest
      weave(body, [0, 2.0, -.5], [.36, .4, .5], 46, .036);                 // the belly and haunch
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
        legs.push({ top, mid, front, ph: (x > 0 ? 0 : Math.PI) + (front ? 0 : Math.PI * .5) });
      }
      // the neck, held high; the long head
      const neck = G(body, [0, 2.3, .72], [-.95, 0, 0]);
      weave(neck, [0, .45, 0], [.2, .55, .18], 26, .03);
      const head = G(neck, [0, 1.0, 0], [1.25, 0, 0]);
      weave(head, [0, 0, .25], [.13, .14, .34], 18, .025);
      P(head, A.ico(.06, 0), hoof, [0, -.03, .58], { cast: false });         // the nose, a knot of dark wood
      for (const sx of [-1, 1]) {
        P(head, A.ico(.028, 0), eye, [sx * .11, .06, .2], { cast: false });  // faint and green, kindly enough
        const ear = G(head, [sx * .12, .14, .0], [-.3, 0, sx * -.9]); P(ear, A.ico(.07, 0), leaf, [0, .08, 0], { scale: [.5, 1.3, .25] });
      }
      // antlers of briar, thorned, in blossom
      const branch = (from, dir, len, depth) => {
        const to = [from[0] + dir[0] * len, from[1] + dir[1] * len, from[2] + dir[2] * len];
        bone(head, from, to, .03 + depth * .012, .015 + depth * .008, depth > 1 ? barkD : bark, 5);
        for (let k = 0; k < 2; k++) { const u = .3 + k * .4; P(head, new T.ConeGeometry(.015, .09, 3), thornM, [from[0] + dir[0] * len * u, from[1] + dir[1] * len * u + .03, from[2] + dir[2] * len * u], { cast: false }); }
        if (depth === 0) { P(head, A.ico(.055, 0), r() < .65 ? bloom : bloomW, to, { cast: false }); if (r() < .5) P(head, A.ico(.07, 0), leafL, [to[0], to[1] - .05, to[2]], { scale: [1, .4, 1], cast: false }); return; }
        for (const s of [-1, 1]) { const d = V(dir[0] + s * .4 * (r() + .3), dir[1] + .15, dir[2] + (r() - .6) * .4).normalize(); branch(to, [d.x, d.y, d.z], len * .66, depth - 1); }
      };
      for (const sx of [-1, 1]) branch([sx * .09, .13, -.02], [sx * .55, .8, -.25], .6, 3);
      merge(body); merge(neck); merge(head);                                // one draw per material, not hundreds
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
        const x = -11.2 + Math.sin(t * .045) * 4.2, vx = x - g.position.x;
        if (Math.abs(vx) > 1e-5) dir = Math.sign(vx);
        g.position.set(x, gy(x, 7.8), 7.8); g.rotation.y += ((dir > 0 ? Math.PI / 2 : -Math.PI / 2) - g.rotation.y) * Math.min(1, dt * 1.5);
        const moving = Math.abs(Math.cos(t * .045)) > .12, ph = t * 2.0;
        for (const { top, mid, front, ph: p } of legs) {
          const s = moving ? Math.sin(ph + p) : 0;
          top.rotation.x = s * .3; mid.rotation.x = Math.max(0, front ? -s : s) * .5 * (front ? 1 : -1);
        }
        body.position.y = moving ? Math.abs(Math.sin(ph)) * .04 : 0;
        neck.rotation.x = -.95 + Math.sin(t * .3) * .06 + (moving ? 0 : pulse(t, 17, 6) * .5);   // stops now and then to graze
        head.rotation.y = Math.sin(t * .25) * .3;
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
      const ashC = age === 'old' ? '#4a4440' : '#2e2724';
      const ash = A.mat(ashC, 0, .95, { emissive: '#4a1a08', emissiveIntensity: .85 }), ashL = A.mat('#4d423c', 0, .95, { emissive: '#3a1608', emissiveIntensity: .7 });   // the fire shows through
      const ember = glow('#ff6a1f', 2.6), emberD = glow('#c2410f', 1.6), eyeM = glow('#ffb347', 3), maw = glow('#ff9a3a', 1.2);
      const smokeMat = () => new T.SpriteMaterial({ map: puff(), color: '#3d3633', transparent: true, opacity: .3, depthWrite: false });
      // cracks of fire along a bone: thin glowing slivers on its surface
      const cracks = (parent, n, rx, ry, rz, r) => { for (let k = 0; k < n; k++) {
        const a = r() * 6.28, z = (r() - .5) * 2 * rz;
        const rib = r() < .4;                                       // along the body, or around a rib
        P(parent, A.box(.016, .018, .12 + r() * .18), r() < .7 ? ember : emberD, [Math.cos(a) * rx, Math.abs(Math.sin(a)) * ry * .98, z],
          { rot: rib ? [0, Math.PI / 2, a + (r() - .5) * .3] : [(r() - .5) * .3, (r() - .5) * .35, 0], cast: false });
      } };
      const wolf = (n, scale) => {
        const r = A.rand(n * 9 + 2), w = G(root), body = G(w, [0, .66 * scale, 0]); body.scale.setScalar(scale);
        // chest deep, waist tucked, hips lower
        const chest = G(body, [0, .04, .3]); P(chest, A.ico(1, 1), ash, [0, 0, 0], { scale: [.24, .3, .34], jitter: .02 });
        const waist = G(body, [0, .06, -.12]); P(waist, A.ico(1, 1), ash, [0, 0, 0], { scale: [.17, .2, .3], jitter: .02 });
        const hips = G(body, [0, .02, -.45]); P(hips, A.ico(1, 1), ashL, [0, 0, 0], { scale: [.2, .23, .22], jitter: .02 });
        cracks(chest, 16, .22, .28, .3, r); cracks(waist, 9, .16, .18, .28, r); cracks(hips, 9, .18, .2, .2, r);
        for (let k = 0; k < 9; k++) P(body, new T.ConeGeometry(.04, .14 + r() * .1, 4), ash, [(r() - .5) * .08, .3 - k * .02, .38 - k * .1], { rot: [-.9, 0, (r() - .5) * .5], cast: false });   // the ruff, the ridge
        const neck = G(body, [0, .18, .52], [-.55, 0, 0]);
        P(neck, A.cyl(.1, .14, .32, 6), ash, [0, .14, 0]);
        const head = G(neck, [0, .3, .02], [.55, 0, 0]);
        P(head, A.ico(.15, 1), ash, [0, 0, 0], { scale: [.9, .85, 1.05] });
        P(head, A.box(.12, .1, .26), ashL, [0, -.03, .2], { jitter: .015 });           // the muzzle
        P(head, A.ico(.03, 0), A.mat('#0c0807'), [0, .0, .34], { cast: false });         // nose
        const jaw = G(head, [0, -.07, .08]); P(jaw, A.box(.1, .04, .24), ash, [0, -.02, .12], { jitter: .01 });
        P(jaw, A.box(.08, .01, .2), maw, [0, .01, .12], { cast: false });              // fire in its mouth
        for (const sx of [-1, 1]) {
          P(head, new T.ConeGeometry(.045, .15, 4), ash, [sx * .08, .15, -.04], { rot: [-.15, 0, sx * -.25] });
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
        return { w, body, head, neck, jaw, legs, tc, smoke, n, tailBase };
      };
      const sizes = { young: .6, old: 1.12 };
      const wolves = Array.from({ length: count }, (_, n) => wolf(n, n === 0 ? 1.08 * (sizes[age] || 1) : (sizes[age] || 1) * (.85 + A.rand(n + 40)() * .2)));
      const watcher = wolves[0];                                    // the one that sits apart, on the rubble, and watches
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
            body.rotation.x = -.5; body.position.y = .5;                    // sitting up
            legs.forEach(({ top, mid }, i) => { top.rotation.x = i < 2 ? .35 : -1.2; mid.rotation.x = i < 2 ? -.2 : 1.6; });
            const h = howl ? Math.sin((cycle - 15) / 3.5 * Math.PI) : 0;
            neck.rotation.x = -.55 - h * .7; head.rotation.x = .55 - h * .5; jaw.rotation.x = h * .5;
          } else {
            // circling just beyond the wall, slowly while waiting, at a lope once the watcher has howled
            const speed = moving ? .34 : .1, k = n * 2.2;
            wf.a = (wf.a ?? k) + dt * speed;
            const a = wf.a, x = -21.2 + Math.cos(a) * 2.2, z = .3 + Math.sin(a) * 3.4;   // beyond the west wall
            w.position.set(x, gy(x, z), z); w.rotation.y = Math.atan2(-Math.sin(a) * 2.2, Math.cos(a) * 3.4);
            const ph = t * (moving ? 9 : 4) + n;
            body.position.y = .66 * (body.scale.x) + Math.abs(Math.sin(ph)) * (moving ? .04 : .015);
            legs.forEach(({ top, mid, front, ph: p }) => { const s = Math.sin(ph + p); top.rotation.x = s * (moving ? .55 : .3); mid.rotation.x = Math.max(0, front ? -s : s) * .6 * (front ? -1 : 1); });
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
        ash.emissiveIntensity = .12 + .75 * dark; ashL.emissiveIntensity = .1 + .6 * dark;
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
      // jittery scuttle, a hand bell. The old: faded and chipped, barnacled all over, the tip of its
      // big claw broken off long ago, slow.
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
    blurb: 'Gentle. After heavy rain, when the courtyard floods into shallow pools, something pale and pink wades in: longer than the knight is tall, with a broad flat head, feathery glowing gills and a wide, permanent smile. It likes the warmth of the fire, and noses toward the doorway now and then. It leaves when the water drains.',
    view: [[-7.2, 2.1, 5.0], [-11.6, .6, 1.0]],
    knight: { place: 'courtyard', action: 'stand', emote: 'heart', note: 'being looked at, very kindly, by something enormous' },
    build(root) {
      const v = root.userData.appearance?.variant || {};
      const age = v.age || '', hue = v.hue || 0;
      const young = age === 'young', old = age === 'old';
      const scale = (v.size || 1) * (young ? .55 : old ? 1.15 : 1);
      // the young: pale, almost see-through, a big head and big eyes, stub gills, a short tail, a wobbly
      // quick walk. The old: darker and mottled, pale old scars, ragged drooping gills, a notched fin,
      // one clouded eye, a slow walk.
      // the rain pools it wades between, each with a ring of ripples
      const water = new T.MeshStandardMaterial({ color: '#6d8d99', roughness: .06, metalness: .35, transparent: true, opacity: .72 });
      const rippleM = new T.MeshBasicMaterial({ color: '#cfe3ea', transparent: true, opacity: .0, depthWrite: false });
      const r = A.rand(8);
      const pools = [[-11.2, .5, .9], [-10.0, -.3, .7], [-12.4, -.4, .6], [-9.6, .6, .5], [-13.0, .3, .5]];   // in the lane, clear of the buildings
      for (const [x, z, s] of pools) {
        const pool = new T.Mesh(new T.CircleGeometry(s, 16), water); pool.rotation.x = -Math.PI / 2;
        pool.position.set(x, gy(x, z) + .035, z); pool.scale.set(1, .6 + r() * .4, 1); root.add(pool);
      }
      const ripples = Array.from({ length: 4 }, () => {
        const m = new T.Mesh(new T.RingGeometry(.3, .36, 24), rippleM.clone()); m.rotation.x = -Math.PI / 2; root.add(m); return { m, t: 0 };
      });
      // colour: pale pink by default; a warmer or a duskier one now and then
      const base = new T.Color(young ? '#f8dbe0' : old ? '#c98d9a' : '#f3bcc8').offsetHSL(hue * 1.5, 0, 0), belly = base.clone().offsetHSL(0, -.1, .08);
      const skin = young ? A.mat(base, 0, .3, { transparent: true, opacity: .86 }) : A.mat(base, 0, .42), skinL = A.mat(belly, 0, .38);
      const freck = A.mat(base.clone().offsetHSL(0, .05, old ? -.3 : -.18), 0, .5), scarM = A.mat('#f1e3dc', 0, .6);
      const eyeM = A.mat('#120a0c', .3, .15), glint = glow('#ffffff', .6), mouthM = A.mat('#8c4f5e', 0, .6);
      const gillM = glow(new T.Color('#ff6f9c').offsetHSL(hue * 1.5, 0, 0), .85), finM = ds(base.clone().offsetHSL(0, -.05, .06), 0, .45);
      const g = G(root, [-12.6, 0, 1.3]);
      const body = G(g, [0, .5 * scale, 0]); body.scale.setScalar(scale);
      // the trunk: a few soft, flattened segments in a gentle S that the walk bends
      const segs = [];
      const radii = [[.5, .36, .7], [.55, .4, .74], [.47, .35, .66]];
      let at = body;
      radii.forEach(([rx, ry, rz], i) => {
        const s = G(at, [0, 0, i ? -.5 : .35]);
        P(s, A.ico(1, 2), skin, [0, 0, 0], { scale: [rx, ry, rz], jitter: .006, seed: i });
        P(s, A.ico(1, 2), skinL, [0, -ry * .38, 0], { scale: [rx * .82, ry * .55, rz * .92], jitter: .004, seed: i + 9 });
        for (let f = 0; f < (young ? 0 : old ? 9 : 3); f++) P(s, A.ico(old ? .05 : .035, 0), freck, [(r() - .5) * rx * 1.3, ry * .93, (r() - .5) * rz], { cast: false, jitter: 0 });
        if (old && i === 1) for (let k = 0; k < 3; k++) P(s, A.box(.02, .01, .3), scarM, [rx * .5 - k * .06, ry * .85, .05 + k * .08], { rot: [0, .5, .2], cast: false });   // old claw-marks
        segs.push(s); at = s;
      });
      // the head: broad, flat, wide-mouthed
      const neck = G(segs[0], [0, .04, .5]);
      const head = G(neck, [0, .02, .38]); if (young) head.scale.setScalar(1.3);   // the young: all head
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
        const stalk = G(head, [sx * .5, .1 + (1 - k) * .07, -.22], [-.55 + (k - 1) * .5, sx * -.35, sx * -(1.05 + (k - 1) * .3)]);
        const ragged = old ? .55 : 1;
        const c = chain(stalk, young ? 2 : 4, young ? .09 : .16, .026, .011, gillM, { sides: 4, jitter: .002, each: (i, j) => {
          for (const s of [-1, 1]) for (let q = 0; q < 3; q++) {      // fine filaments, swept back like a feather
            if (r() > ragged) continue;
            P(j, new T.ConeGeometry(.008, .11 - i * .015, 3), gillM, [s * .012, .03 + q * .045, 0], { rot: [-.55, 0, s * .6], cast: false, jitter: 0 });
          }
        } });
        gills.push({ c, ph: k * 1.7 + sx, droop: old ? .45 : 0 });
      }
      // splayed salamander legs, front ones on the first segment, back ones on the third
      const legs = [];
      for (const [seg, z, sx, toes] of [[0, .15, -1, 4], [0, .15, 1, 4], [2, -.05, -1, 5], [2, -.05, 1, 5]]) {
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
      const TAIL = young ? 5 : 7;
      for (let i = 0; i < TAIL; i++) {
        const j = G(tj, [0, 0, i ? -.3 : 0]), ra = .3 * (1 - i / 7.5) + .03, rb = .3 * (1 - (i + 1) / 7.5) + .03;
        P(j, A.cyl(rb, ra, .36, 8), skin, [0, 0, -.15], { rot: [Math.PI / 2, 0, 0], scale: [.42, 1, 1], jitter: .003, seed: i });
        if (!(old && i === 4))                                           // the old: a notch bitten from the fin
          sheet(j, [[0, ra * .8, .02], [0, ra * .8 + .2 - i * .015, -.02], [0, rb * .8 + .2 - (i + 1) * .015, -.32], [0, rb * .8, -.32]], [[0, 1, 2], [0, 2, 3]], finM);
        sheet(j, [[0, -ra * .8, .02], [0, -ra * .8 - .1 + i * .008, -.02], [0, -rb * .8 - .1 + (i + 1) * .008, -.32], [0, -rb * .8, -.32]], [[0, 1, 2], [0, 2, 3]], finM);
        tail.push(j); tj = j;
      }
      sheet(segs[1], [[0, .38, .3], [0, .46, 0], [0, .5, -.4], [0, .38, -.62], [0, .3, -.62], [0, .3, .3]], [[0, 1, 5], [1, 4, 5], [1, 2, 4], [2, 3, 4]], finM);

      segs.forEach(merge); merge(head); tail.forEach(merge);               // fewer draws, same look
      // where it goes: a slow loop along the lane between the building plots, turning in the open
      // at either end, resting now and then nearest the warm doorway. Its body follows its own path
      // (each part where the head has been), so it never swings through a wall, the well or him.
      const E = [-9.9, .05], W = [-12.3, .05], R = .5, ST = E[0] - W[0], LOOP = 2 * ST + 2 * Math.PI * R;
      const along = d => {
        d = ((d % LOOP) + LOOP) % LOOP;
        if (d < ST) return [E[0] - d, W[1] + R];                                  // west along the north side
        d -= ST; if (d < Math.PI * R) { const f = d / R; return [W[0] - Math.sin(f) * R, W[1] + Math.cos(f) * R]; }
        d -= Math.PI * R; if (d < ST) return [W[0] + d, W[1] - R];                // east along the south side
        d -= ST; const f = d / R; return [E[0] + Math.sin(f) * R, E[1] - Math.cos(f) * R];
      };
      const heading = d => { const [x0, z0] = along(d - .05), [x1, z1] = along(d + .05); return Math.atan2(x1 - x0, z1 - z0); };
      const SPEED = young ? .26 : old ? .13 : .2, PIV = [0, .15, .65, 1.15];                              // how far behind the front each part sits
      const WALK = LOOP / SPEED, CYCLE = WALK + 16;                             // once round, then a rest facing the doorway
      const travelled = t => SPEED * (Math.floor(t / CYCLE) * WALK + Math.min(t % CYCLE, WALK)) - Math.PI * R / 2;
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
        body.position.y = (.5 + Math.abs(sw) * (young ? .05 : .02)) * scale;   // the young wobble as they go
        if (young) body.rotation.z = Math.sin(step * 3.2) * .05;
        tail.forEach((j, i) => { j.rotation.y += Math.sin(step * 1.6 - i * .55) * .06 * walking + Math.sin(t * .4 + i * .5) * .03; });
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
    view: [[-1.4, 1.45, 1.0], [-11, .5, .7]],
    knight: { place: 'fire', action: 'sit', emote: 'question', note: 'keeping the fire very, very steady' },
    build(root) {
      const pale = A.mat('#cfc8bd', 0, .65), paleD = A.mat('#a59d92', 0, .7), dark = A.mat('#120e0e');
      const g = G(root, [-14, 0, .7], [0, Math.PI / 2, 0]);
      P(g, A.cyl(.13, .16, .95, 7), pale, [0, 1.12, 0], { rot: [Math.PI / 2 - .15, 0, 0] });   // the arched trunk
      P(g, A.ico(.17, 1), pale, [0, 1.2, -.35], { scale: [1.1, .8, 1] }); P(g, A.ico(.19, 1), pale, [0, 1.1, .42], { scale: [1.2, .8, 1] });
      for (let i = 0; i < 5; i++) P(g, A.box(.24, .02, .04), paleD, [0, 1.27, -.15 + i * .1], { cast: false });   // ribs, showing through
      for (const sx of [-1, 1]) {
        bone(g, [sx * .14, 1.05, -.42], [sx * .32, .62, -.72], .06, .045, pale); bone(g, [sx * .32, .62, -.72], [sx * .24, .02, -1.0], .045, .035, pale);
        P(g, A.box(.09, .04, .22), paleD, [sx * .24, .02, -1.08]);
        bone(g, [sx * .2, 1.08, .45], [sx * .48, .7, .55], .05, .04, pale); bone(g, [sx * .48, .7, .55], [sx * .3, .02, .9], .04, .03, pale);
        for (let f = 0; f < 4; f++) bone(g, [sx * .3, .02, .9], [sx * (.24 + f * .045), .01, 1.12], .012, .006, paleD, 4);
      }
      bone(g, [0, 1.05, .55], [0, .72, .7], .05, .045, pale);
      const head = G(g, [0, .56, .74], [Math.PI, 0, 0]);
      P(head, A.ico(.15, 1), pale, [0, 0, 0], { scale: [.85, 1.15, .9] });
      for (const sx of [-1, 1]) P(head, A.ico(.035, 0), dark, [sx * .05, .03, .12], { scale: [1, 1.4, .5], cast: false });
      P(head, A.box(.07, .012, .02), dark, [0, -.08, .13], { cast: false });
      const steps = Array.from({ length: 11 }, (_, i) => -14 + i * .75);
      let idx = 0, lastFlick = 0, flickUntil = 0, wait = 0;
      return (t) => {
        if (t > lastFlick + 4.5) {   // the fire gutters for a moment
          lastFlick = t; flickUntil = t + .35;
          if (idx < steps.length - 1) idx++; else if (++wait > 2) { idx = 0; wait = 0; }
        }
        A.setFireDim(t < flickUntil ? .18 : 1);
        g.position.x = steps[idx];
        head.rotation.z = Math.sin(t * .3) * .15;
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
      const pale = A.mat('#dcd6cb', 0, .55), dark = A.mat('#0c0909');
      const g = G(root, [-2.6, 0, -4.85]);
      const head = G(g, [0, 2.55, 0]);
      P(head, A.ico(.32, 1), pale, [0, 0, 0], { scale: [.62, 1.12, .55] });
      for (const sx of [-1, 1]) P(head, A.ico(.06, 1), dark, [sx * .08, .1, .15], { scale: [1, 1.6, .4], cast: false });
      P(head, A.box(.04, .2, .02), dark, [0, -.18, .16], { cast: false });   // a long, closed mouth
      bone(g, [0, 0, -.1], [0, 2.25, 0], .07, .06, pale);   // its neck, all the way down
      const hand = G(g, [.48, 2.05, .22]);
      P(hand, A.box(.16, .2, .03), pale, [0, 0, 0]);
      for (let f = 0; f < 4; f++) bone(hand, [(f - 1.5) * .04, .1, 0], [(f - 1.5) * .05, .38 + (f === 1 || f === 2 ? .05 : 0), .01], .012, .008, pale, 4);
      bone(hand, [-.08, -.02, 0], [-.17, .1, .01], .013, .008, pale, 4);
      const prints = new T.MeshBasicMaterial({ color: '#e8e4dc', transparent: true, opacity: .18, depthWrite: false });
      for (const [x, y] of [[-2.25, 1.7], [-2.95, 1.95], [-2.4, 2.35]]) { const m = new T.Mesh(new T.CircleGeometry(.07, 8), prints); m.scale.set(1, 1.3, 1); m.position.set(x, y, -4.62); root.add(m); }
      const moonlight = new T.PointLight('#b8c8ff', 2.5, 4, 1.6); moonlight.position.set(-2.2, 3.2, -5.6); root.add(moonlight);
      return (t) => {
        const sink = pulse(t + 8, 16, 5);   // now and then it slides down out of sight
        g.position.y = -sink * 2.4;
        head.rotation.z = Math.sin(t * .25) * .25; head.rotation.y = Math.sin(t * .17) * .15;
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
    view: [[-10.9, 1.8, 4.9], [-7.3, 2.8, -3.4]],
    knight: { place: 'courtyard', action: 'stand', emote: 'exclaim', note: 'face to face with a dragon' },
    build(root) {
      const g = G(root, [-7.3, 1.25, -4.3]);
      const sA = A.mat('#6e2a20', .2, .55), sB = A.mat('#4a1b16', .2, .6), sC = A.mat('#8e3a28', .2, .5);
      const belly = A.mat('#caa070', .05, .6), horn = A.mat('#e2d6bd', 0, .5), hornD = A.mat('#9c8a6c', 0, .6), claw = A.mat('#16110f', .3, .4);
      const fire = glow('#ff7a1a', 2.6), eyeM = glow('#ffd040', 3.2), black = A.mat('#050303');
      const wingTex = canvasTex(256, 256, (c, w, h) => {
        const gr = c.createRadialGradient(0, h, 10, 0, h, w * 1.35);
        gr.addColorStop(0, '#3a120e'); gr.addColorStop(.55, '#6e2418'); gr.addColorStop(1, '#c65e30'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(28,8,6,.55)'; c.lineWidth = 2;
        for (let i = 0; i < 16; i++) { c.beginPath(); let x = 0, y = h; c.moveTo(x, y); const a = -.05 - i * .1; for (let k = 0; k < 7; k++) { const b = a + (k % 2 ? .18 : -.18); x += Math.cos(b) * 42; y += Math.sin(b) * 42; c.lineTo(x, y); } c.stroke(); }
      });
      const web = new T.MeshStandardMaterial({ map: wingTex, emissiveMap: wingTex, emissive: '#ff7a3a', emissiveIntensity: .18, side: T.DoubleSide, roughness: .8, flatShading: true });
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
        P(torso, new T.ConeGeometry(.08, .22 + Math.sin(i / 9 * Math.PI) * .2, 4), hornD, [0, R * .8 + .06, z], { rot: [-.35, 0, 0] });
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
      const hj = G(neck[8], [0, .3, 0]), head = G(hj, [0, 0, 0], [-Math.PI / 2 + .3, 0, 0]);
      P(head, A.ico(.3, 1), sA, [0, .05, 0], { scale: [1, .78, 1.15] });
      P(head, A.cyl(.11, .22, .85, 6), sA, [0, 0, .55], { rot: [Math.PI / 2, Math.PI / 6, 0], scale: [1.15, 1, .72] });
      P(head, A.ico(.12, 1), sB, [0, -.01, .98], { scale: [1.1, .7, 1] });
      for (let k = 0; k < 4; k++) P(head, new T.ConeGeometry(.025, .09, 4), hornD, [0, .13 - k * .01, .35 + k * .16], { rot: [-.6, 0, 0] });
      for (const sx of [-1, 1]) {
        P(head, A.box(.14, .07, .34), sB, [sx * .15, .17, .2], { rot: [-.12, sx * .22, sx * -.38] });
        P(head, A.ico(.052, 1), eyeM, [sx * .17, .11, .3], { cast: false });
        P(head, A.box(.012, .07, .02), black, [sx * .195, .11, .32], { rot: [0, sx * .9, 0], cast: false });
        bone(head, [sx * .13, .2, -.1], [sx * .28, .42, -.55], .085, .05, horn);
        bone(head, [sx * .28, .42, -.55], [sx * .33, .47, -1.02], .05, .012, horn);
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
      const breath = new T.PointLight('#ff7a2a', 0, 7, 1.6); breath.position.set(0, -.05, 1.0); head.add(breath);
      const nose = G(head, [0, .02, 1.05]);
      // tail over the far side of the wall, ending in a spade
      const tailBase = G(torso, [0, -.1, -1.75]);
      const tail = chain(tailBase, 14, .36, .34, .04, sA, { each: (i, j, r) => { if (i % 2 === 0) P(j, new T.ConeGeometry(.05, .17, 4), hornD, [0, .15, r * .9], { rot: [.4, 0, 0] }); } });
      tail[0].rotation.x = -2.0; for (let i = 1; i < 14; i++) tail[i].rotation.x = .09;
      sheet(tail[13], [[0, .2, 0], [0, .45, .22], [0, .8, 0], [0, .45, -.22]], [[0, 1, 2], [0, 2, 3]], web);
      // wings, half raised, membranes veined and glowing faintly at the edges
      const wings = [];
      for (const sx of [-1, 1]) {
        const w = G(g, [sx * .52, 1.65, .8]);
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
      const at = V(), fwd = V(), kn = V(), toK = V();
      let look = 0;
      return (t, dt) => {
        const b = Math.sin(t * 1.05);
        torso.scale.set(1 + .02 * b, 1 + .03 * b, 1);
        A.K.J.hips.getWorldPosition(kn); toK.copy(kn).sub(g.position);
        const want = Math.max(-.7, Math.min(.7, Math.atan2(toK.x, toK.z)));
        look += (want - look) * Math.min(1, dt * 1.5);
        neck.forEach((j, i) => { j.rotation.y = look / 9 + .05 * Math.sin(t * .45 + i * .35); });
        neck[0].rotation.x = .5 + .05 * Math.sin(t * .3);
        const fireOn = pulse(t + 3, 14, 2.6), idle = pulse(t, 7, 1.4) * .35;
        jaw.rotation.x = .04 + Math.max(idle, fireOn) * .55;
        breath.intensity = fireOn * 30 + idle * 6;
        nostrils.emissiveIntensity = 1.2 + fireOn * 4 + Math.sin(t * 3) * .3;
        const glowK = 2 + Math.sin(t * 1.05) * .6 + fireOn * 2; fire.emissiveIntensity = glowK; seams.forEach(s => { s.visible = true; });
        head.children.forEach(c => { if (c.material === eyeM) c.scale.y = 1 - pulse(t, 6.5, .2) * .85; });
        for (let i = 0; i < 14; i++) tail[i].rotation.z = .12 * Math.sin(t * .7 - i * .45);
        const stretch = pulse(t + 8, 17, 4);
        for (const { w, sx } of wings) { w.rotation.z = sx * (-.1 + .06 * Math.sin(t * .6) - stretch * .55 - fireOn * .25); w.rotation.y = sx * -stretch * .3; }
        nose.getWorldPosition(at); head.getWorldDirection(fwd);
        for (const p of puffs) { const k = (t * .25 + p.ph) % 1; p.s.position.set(at.x + Math.sin(k * 9 + p.ph * 20) * .25 * k, at.y + k * 1.8, at.z + k * .4); p.s.scale.setScalar(.25 + k * 1.4); p.s.material.opacity = .3 * (1 - k) * (1 - fireOn); }
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
    view: [[-7.6, 1.7, 1.4], [-24, 3.4, -1.6]],
    knight: { place: 'courtyard', action: 'stand', emote: 'dots', note: 'not looking at it. Not looking at it.' },
    build(root) {
      const skin = A.mat('#2c2a28', 0, .65), skinD = A.mat('#1b1a19', 0, .8), coat = ds('#121113', 0, .95), coatL = ds('#1d1b1e', 0, .95);
      const face = A.mat('#e2ded6', 0, .5, { emissive: '#4a4844', emissiveIntensity: .5 }), faceD = A.mat('#bcb6ac', 0, .6, { emissive: '#2e2c2a', emissiveIntensity: .5 });
      const g = G(root, [-27.5, 0, -1.6], [0, Math.PI / 2, 0]);
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
      const r = A.rand(31), figs = [];
      for (let i = 0; i < 5; i++) {
        const x = 1.5 + i * 1.7 + (r() - .5) * .8, z = 14 + r() * 3.2;
        const f = nightGrown(root, [x, gy(x, z), z], .9 + r() * .3);
        f.g.rotation.y = Math.atan2(-x, -z) + (r() - .5) * .5;
        figs.push({ ...f, ph: r() * 9 });
      }
      const sheen = new T.PointLight('#8fa8ff', 5, 12, 1.4); sheen.position.set(5, gy(5, 15.5) + 4, 13.5); root.add(sheen);   // starlight on dark glass
      return (t) => figs.forEach(f => f.tick(t, f.ph));
    },
  },

  // ================================================================ THE CLOCK-HEADED FIGURE
  clockhead: {
    name: 'The clock-headed figure', hour: 22,
    blurb: 'Otherworldly. Very tall and thin, with an old clock face where its head should be, its hands spinning wrong. Time stutters around it: it freezes mid-step, then is suddenly further along, sometimes walks backward, and the fire flickers the wrong way.',
    view: [[-6.6, 1.8, 4.6], [-12.2, 2.2, .8]],
    knight: { place: 'repair:doorway', action: 'stand', emote: 'question', note: 'not sure what time it is any more' },
    build(root) {
      const coat = ds('#17151a', 0, .9), skin = A.mat('#2a2622', 0, .7), brass = A.mat('#9a7a3a', .8, .35);
      const g = G(root, [-12, 0, 1.4], [0, Math.PI / 2, 0]), body = G(g);
      const legs = [-1, 1].map(sx => { const l = G(body, [sx * .12, 1.35, 0]); bone(l, [0, 0, 0], [0, -1.35, .02], .05, .04, skin); return l; });
      const coatM = new T.Mesh(A.facet(new T.CylinderGeometry(.2, .44, 1.7, 9, 2, true), .05, 4), coat); coatM.position.y = 1.55; coatM.castShadow = true; body.add(coatM);
      P(body, A.cyl(.24, .2, .8, 8), coat, [0, 2.6, 0], { scale: [1, 1, .7] });
      bone(body, [0, 2.95, 0], [0, 3.25, 0], .045, .04, skin);
      const arms = [-1, 1].map(sx => { const a = G(body, [sx * .27, 2.9, 0]); bone(a, [0, 0, 0], [sx * .08, -.75, .05], .04, .035, skin); bone(a, [sx * .08, -.75, .05], [sx * .05, -1.5, .1], .035, .03, skin); return a; });
      // the head: an old clock face, brass-rimmed, its hands not keeping any time we know
      const head = G(body, [0, 3.55, 0]);
      const face = canvasTex(256, 256, (c, w) => {
        c.fillStyle = '#e6dcc2'; c.beginPath(); c.arc(w / 2, w / 2, w / 2, 0, 6.3); c.fill();
        c.strokeStyle = '#3a2f22'; c.fillStyle = '#3a2f22';
        for (let k = 0; k < 60; k++) {
          const a = k / 60 * 6.283, big = k % 5 === 0, r0 = w / 2 - 10, r1 = r0 - (big ? 22 : 9);
          c.lineWidth = big ? 5 : 2; c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * r0, w / 2 + Math.sin(a) * r0); c.lineTo(w / 2 + Math.cos(a) * r1, w / 2 + Math.sin(a) * r1); c.stroke();
        }
        c.globalAlpha = .25; c.beginPath(); c.arc(w * .62, w * .35, 40, 0, 6.3); c.fill();   // an old stain
      });
      P(head, A.cyl(.42, .42, .1, 24), brass, [0, 0, 0], { rot: [Math.PI / 2, 0, 0], jitter: 0 });
      P(head, new T.CircleGeometry(.38, 32), new T.MeshStandardMaterial({ map: face, roughness: .6, emissive: '#3a3020', emissiveIntensity: .35 }), [0, 0, .051], { jitter: 0, cast: false });
      const hour = G(head, [0, 0, .06]), minute = G(head, [0, 0, .065]);
      P(hour, A.box(.03, .2, .012), A.mat('#120e0a'), [0, .09, 0], { jitter: 0, cast: false });
      P(minute, A.box(.02, .3, .012), A.mat('#120e0a'), [0, .14, 0], { jitter: 0, cast: false });
      P(head, A.ico(.03, 0), brass, [0, 0, .075], { jitter: 0, cast: false });
      let mode = 'freeze', until = 0, x = -12, dir = 1, handH = 0, handM = 0;
      const pose = () => { arms.forEach(a => { a.rotation.set((Math.random() - .5) * 1.6, 0, (Math.random() - .5) * .8); }); legs.forEach(l => { l.rotation.x = (Math.random() - .5) * .9; }); head.rotation.z = (Math.random() - .5) * .9; };
      return (t, dt) => {
        if (t > until) {   // time does something different every few seconds
          mode = ['freeze', 'skip', 'skip', 'backward', 'race'][Math.floor(Math.random() * 5)]; until = t + 1.2 + Math.random() * 2.5;
          if (mode === 'skip') { x += dir * (.5 + Math.random() * .8); pose(); }
          if (x > -10.2 || x < -14.6) { dir = -dir; x = Math.max(-14.6, Math.min(-10.2, x)); }
        }
        if (mode === 'backward') { x -= dir * dt * .5; const ph = t * 4; legs.forEach((l, i) => { l.rotation.x = -Math.sin(ph + i * Math.PI) * .4; }); arms.forEach((a, i) => { a.rotation.x = Math.sin(ph + i * Math.PI) * .3; }); }
        if (mode === 'race') { body.position.x = (Math.random() - .5) * .03; body.position.z = (Math.random() - .5) * .03; }
        g.position.set(x, 0, 1.4); g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        const speed = { freeze: 0, skip: 0, backward: -9, race: 40 }[mode];
        handM += speed * dt; handH += speed * dt / 12;
        minute.rotation.z = -handM; hour.rotation.z = -handH;
        A.setFireDim(mode === 'backward' ? .7 + .3 * Math.sin(t * 13) : 1);
      };
    },
    exit() { A.setFireDim(1); },
  },

  // ================================================================ A METEOR FALLS (an arrival)
  meteor: {
    name: 'A meteor falls', hour: 22,
    blurb: 'An arrival event. A streak across the night sky, a flash and a thud on the plain, a smoking crater that stays for days, and sometimes something climbing out of it. (Plays out every half minute here.)',
    view: [[-1.2, 3.0, 5.2], [8.5, 1.8, 18.5]],
    knight: { place: 'fire', action: 'stand', emote: 'exclaim', note: 'the sky just lit up' },
    build(root) {
      const px = 9.5, pz = 19, py = gy(px, pz), P0 = V(px, py, pz), S = V(px + 14, py + 16, pz + 10);
      const head = new T.Mesh(A.ico(.55, 1), new T.MeshBasicMaterial({ color: '#fff2c8', fog: false })); root.add(head);
      const trail = Array.from({ length: 16 }, (_, i) => { const s = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: i < 5 ? '#ffe0a0' : '#ff8a3a', transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false })); root.add(s); return s; });
      const flash = new T.PointLight('#ffb070', 0, 60, 1.2); flash.position.copy(P0).add(V(0, 2, 0)); root.add(flash);
      const crater = G(root, [px, py, pz]);
      const hole = new T.Mesh(new T.CircleGeometry(2.4, 16), A.mat('#120d0a', 0, 1)); hole.rotation.x = -Math.PI / 2; hole.position.y = .05; crater.add(hole);
      const r = A.rand(8), embers = glow('#ff7a2a', 2.5);
      for (let i = 0; i < 18; i++) { const a = i / 18 * 6.28, d = 2.3 + r() * .5; P(crater, A.box(.5 + r() * .4, .3 + r() * .3, .4), A.M.stone, [Math.cos(a) * d, .12, Math.sin(a) * d], { rot: [r() - .5, a, (r() - .5) * .9] }); }
      for (let i = 0; i < 10; i++) P(crater, A.ico(.08 + r() * .1, 0), embers, [(r() - .5) * 2.6, .08, (r() - .5) * 2.6], { cast: false });
      const rock = P(crater, A.ico(.55, 0), A.mat('#2a2622', .4, .5, { emissive: '#ff5a1a', emissiveIntensity: .6 }), [0, .2, 0]);
      const ring = new T.Mesh(new T.RingGeometry(.93, 1, 48), new T.MeshBasicMaterial({ color: '#ffd8a0', transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.copy(P0).add(V(0, .3, 0)); root.add(ring);
      const debris = Array.from({ length: 22 }, () => { const m = P(root, A.ico(.12 + Math.random() * .12, 0), A.M.stoneD, [0, 0, 0], { cast: false }); return { m, v: V((Math.random() - .5) * 10, 6 + Math.random() * 8, (Math.random() - .5) * 10) }; });
      const smoke = Array.from({ length: 12 }, (_, i) => { const s = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: '#4a4440', transparent: true, opacity: 0, depthWrite: false })); root.add(s); return { s, ph: i / 12 }; });
      const thing = nightGrown(root, [px, py - 2.6, pz], 1.05); thing.g.rotation.y = Math.atan2(-px, -pz);
      const T_HIT = 2.6, CYCLE = 32;
      return (t, dt) => {
        const k = t % CYCLE, falling = k < T_HIT, after = k >= T_HIT;
        const u = Math.min(1, k / T_HIT), pos = S.clone().lerp(P0, u * u);
        head.visible = falling; head.position.copy(pos);
        trail.forEach((s, i) => { s.position.copy(S.clone().lerp(P0, Math.max(0, u - i * .012) ** 2)); s.scale.setScalar(2.4 - i * .1); s.material.opacity = falling ? .9 - i * .05 : 0; });
        const since = k - T_HIT;
        flash.intensity = after ? 90 * Math.exp(-since * 2.2) : falling ? 6 * u : 0;
        crater.visible = after;
        ring.material.opacity = after && since < .9 ? .7 * (1 - since / .9) : 0; ring.scale.setScalar(1 + since * 14);
        debris.forEach(d => { d.m.visible = after && since < 2.4; if (d.m.visible) { d.m.position.copy(P0).addScaledVector(d.v, since); d.m.position.y = py + d.v.y * since - 9.8 * since * since / 2; } });
        smoke.forEach(sm => { const q = (t * .12 + sm.ph) % 1; sm.s.position.set(px + Math.sin(sm.ph * 30) * .8 * q, py + .5 + q * 7, pz + Math.cos(sm.ph * 20) * .8 * q); sm.s.scale.setScalar(1 + q * 4); sm.s.material.opacity = after ? .4 * (1 - q) : 0; });
        embers.emissiveIntensity = 2 + Math.sin(t * 6) * .6;
        const rise = Math.min(1, Math.max(0, (k - 10) / 4));   // something climbs out
        thing.g.position.y = py - 2.6 + rise * 2.6; thing.g.visible = rise > 0;
        thing.tick(t, 2);
      };
    },
  },

  // ================================================================ A SHIP LANDS (an arrival)
  lander: {
    name: 'A ship lands', hour: 22,
    blurb: 'An arrival event. A smooth, seed-like craft settles on the plain with no fire and no sound, opens, and one of its crew steps out to look around: slender, made of glassy light. Then it leaves, and a scorched ring stays where it stood. (Plays out every minute here.)',
    view: [[-2.2, 2.6, 12.5], [-6.3, 1.7, 21]],
    knight: { place: 'fire', action: 'stand', emote: 'question', note: 'watching the lights on the plain' },
    build(root) {
      const lx = -7, lz = 22, ly = gy(lx, lz);
      const hull = A.mat('#d4d9e0', .6, .25), seam = A.mat('#8a929e', .6, .3), lightM = glow('#7ff0e6', 2.4, { fog: false });
      const ship = G(root, [lx, ly + 40, lz]);
      P(ship, new T.SphereGeometry(1.7, 18, 10, 0, 6.283, Math.PI / 2, Math.PI / 2), hull, [0, 0, 0], { scale: [1, .55, 1], jitter: .01 });   // the lower hull
      const lid = G(ship, [-1.6, 0, 0]);   // the upper shell, hinged at one side
      P(lid, new T.SphereGeometry(1.7, 18, 10, 0, 6.283, 0, Math.PI / 2), hull, [1.6, 0, 0], { scale: [1, .75, 1], jitter: .01 });
      for (const y of [-.25, -.5]) { const s = new T.Mesh(new T.TorusGeometry(1.65 - (y < -.3 ? .3 : .05), .03, 4, 36), seam); s.rotation.x = Math.PI / 2; s.position.y = y; ship.add(s); }
      const under = new T.Mesh(new T.TorusGeometry(.9, .07, 6, 32), lightM); under.rotation.x = Math.PI / 2; under.position.y = -.85; ship.add(under);
      const inner = new T.PointLight('#9ff6ee', 0, 8, 1.5); inner.position.y = .4; ship.add(inner);
      const beam = new T.Mesh(new T.ConeGeometry(2.2, 12, 20, 1, true), new T.MeshBasicMaterial({ color: '#9ff6ee', transparent: true, opacity: .12, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false }));
      beam.position.y = -6.8; ship.add(beam);
      const scorch = new T.Mesh(new T.RingGeometry(1.2, 2.3, 24), new T.MeshBasicMaterial({ color: '#16120e', transparent: true, opacity: .85 })); scorch.rotation.x = -Math.PI / 2; scorch.position.set(lx, ly + .05, lz); root.add(scorch);
      // one of its crew: tall, slender, made of glassy light, on long stilting legs
      const glassL = new T.MeshStandardMaterial({ color: '#cfe9ff', transparent: true, opacity: .55, emissive: '#6fbfe0', emissiveIntensity: 1.1, roughness: .1, flatShading: true, depthWrite: false });
      const crew = G(root, [lx, ly, lz]), cbody = G(crew, [0, 1.9, 0]);
      P(cbody, A.ico(.22, 1), glassL, [0, 0, 0], { scale: [.8, 1.6, .6], cast: false });
      const chead = G(cbody, [0, .5, .02]); P(chead, A.ico(.12, 1), glassL, [0, 0, 0], { scale: [.8, 1.2, 1.1], cast: false }); P(chead, A.ico(.03, 0), glow('#ffffff', 3), [0, .02, .1], { cast: false });
      const clegs = [-1, 1].map(sx => { const l = G(crew, [sx * .1, 1.65, 0]); bone(l, [0, 0, 0], [sx * .05, -.85, .15], .03, .022, glassL); bone(l, [sx * .05, -.85, .15], [0, -1.65, 0], .022, .012, glassL); return l; });
      [-1, 1].forEach(sx => bone(cbody, [sx * .14, .25, 0], [sx * .3, -.7, .2], .02, .01, glassL));
      const cl = new T.PointLight('#bfefff', 2, 5, 1.6); cl.position.y = 2; crew.add(cl);
      const CYCLE = 60, out = V(lx + 2.6, 0, lz - 3.4);
      return (t) => {
        const k = t % CYCLE;
        const down = smooth(0, 9, k), up = smooth(40, 50, k);
        ship.position.y = ly + 1.0 + (1 - down) * 40 + up * 45; ship.rotation.y = t * .2;
        beam.material.opacity = (k < 11 || (k > 39 && k < 50)) ? .12 + .05 * Math.sin(t * 8) : 0;
        const open = smooth(11, 13, k) * (1 - smooth(34, 36, k));
        lid.rotation.z = open * 1.2; inner.intensity = open * 6;
        under.material.emissiveIntensity = 2 + Math.sin(t * 3) * .6;
        scorch.visible = k > 9;
        // the crew member steps out, walks, looks, bends to take a sample, and goes back in
        const walk = smooth(13, 18, k) * (1 - smooth(28, 33, k));
        crew.visible = k > 12.5 && k < 34;
        crew.position.lerpVectors(V(lx, ly, lz), V(out.x, gy(out.x, out.z), out.z), walk);
        crew.rotation.y = k < 28 ? Math.atan2(out.x - lx, out.z - lz) : Math.atan2(lx - out.x, lz - out.z);
        const stepping = (k > 13 && k < 18) || (k > 28 && k < 33);
        clegs.forEach((l, i) => { l.rotation.x = stepping ? Math.sin(t * 5 + i * Math.PI) * .35 : 0; });
        const bend = smooth(19, 21, k) * (1 - smooth(23, 25, k));
        cbody.rotation.x = bend * .9; cbody.position.y = 1.9 - bend * .4;
        chead.rotation.y = Math.sin(t * .8) * .4 * smooth(25, 26, k); chead.rotation.z = smooth(25.5, 26.5, k) * (1 - smooth(27, 28, k)) * .4;
      };
    },
  },
};
const ORDER = Object.keys(BEASTS);
// beings that come young, grown or old, each age its own design (brain/creatures.py AGED: keep the two in step)
const AGED = ['axolotl', 'bellcrab', 'glassbeak', 'ashwolves', 'dragon', 'dragon2', 'whale', 'thorn', 'basilisk', 'wyrm', 'larva',
              'listener', 'cartographer', 'bentone', 'watcher', 'nightgrown'];
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
  root.userData.appearance = { variant: { size: 1, age: aged ? (ui?.age?.value || '') : '' } };   // the preview's chosen age
  A.scene.add(root);
  const tick = def.build(root);
  cur = { key, def, root, tick };
  A.onTick.push(tick);
  A.setHour(hour ?? def.hour);
  A.force({ ...def.knight, awake: false });
  const [pos, at] = def.view, far = innerWidth / innerHeight < 1 ? 1.75 : 1;   // tall screens: step back to fit it in
  A.view(pos.map((v, i) => at[i] + (v - at[i]) * far), at);
  const u = new URL(location.href); u.searchParams.set('creature', key); u.searchParams.set('hour', A.hour);
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
    <select title="Age" class="age"><option value="">grown</option><option value="young">young</option><option value="old">old</option></select></div>
    <p></p><small>Mockup only: not part of Rooken's world (yet). ${matchMedia('(pointer: coarse)').matches ? 'Drag to look around.' : 'Drag to look around, WASD to fly.'}</small>`;
  document.body.append(el);
  ui = { name: el.querySelector('b'), blurb: el.querySelector('p'), count: el.querySelector('.n'), time: el.querySelector('select'), age: el.querySelector('select.age') };
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

export function start(key, api) {
  T = api.THREE; A = api; A.mat = api.mat;
  buildUI();
  const hour = new URLSearchParams(location.search).get('hour');
  show(BEASTS[key] ? key : ORDER[0], hour != null && hour !== '' ? +hour : undefined);
}
