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
    blurb: 'Rare. A bird the size of a cart, with a beak of clear glass. It hunts for anything shiny, and Rooken\'s pocket of glass shards is very shiny.',
    view: [[-7.2, 1.5, 5.0], [-8.6, 3.6, -2.0]],
    knight: { place: 'courtyard', action: 'stand', emote: 'question', note: 'keeping his glass shards out of sight' },
    build(root) {
      const g = G(root, [-8.8, 2.3, -2.2], [0, .36, 0]);
      const plume = A.mat('#3d475c', 0, .85), plumeL = A.mat('#8b93a6', 0, .8), plumeD = A.mat('#232a38', 0, .9);
      const leg = A.mat('#6f6a5a', 0, .7), talon = A.mat('#16130f', .2, .5);
      const glass = new T.MeshStandardMaterial({ color: '#c8eef5', transparent: true, opacity: .55, roughness: .04, metalness: .15,
                                                 emissive: '#3aa0b8', emissiveIntensity: .25, flatShading: true });
      for (const sx of [-1, 1]) {
        bone(g, [sx * .35, 1.05, -.15], [sx * .42, .5, .12], .17, .1, plume);
        bone(g, [sx * .42, .5, .12], [sx * .38, .08, .22], .09, .07, leg);
        for (const a of [-.45, 0, .45]) {
          const toe = G(g, [sx * .38, .05, .22], [0, a, 0]);
          bone(toe, [0, 0, 0], [0, 0, .32], .05, .035, leg);
          P(toe, new T.ConeGeometry(.035, .16, 4), talon, [0, -.05, .36], { rot: [2.4, 0, 0] });
        }
        bone(g, [sx * .38, .05, .22], [sx * .38, .02, -.1], .045, .03, leg);
      }
      const body = G(g, [0, 1.55, -.1], [-.32, 0, 0]);
      P(body, A.ico(1, 1), plume, [0, 0, 0], { scale: [.85, 1.12, .95], jitter: .05 });
      P(body, A.ico(.75, 1), plumeL, [0, .25, .42], { jitter: .04 });
      // tail fan, hanging back over the tower edge
      for (let i = 0; i < 7; i++) P(g, A.box(.2, .03, 1.6), i % 2 ? plumeD : plume, [(i - 3) * .12, .7, -1.35], { rot: [-.7, (i - 3) * .09, 0] });
      // folded wings, with long primaries
      const wings = [];
      for (const sx of [-1, 1]) {
        const w = G(g, [sx * .72, 2.05, .05]);
        P(w, A.ico(.5, 1), plume, [0, -.35, -.25], { scale: [.45, 1.25, 1.1], jitter: .04 });
        const prim = [];
        for (let i = 0; i < 6; i++) {
          const f = G(w, [0, -.7, -.45 - i * .05], [-.5 - i * .05, 0, 0]);
          P(f, A.box(.04, .2, 1.35), i % 2 ? plumeD : plume, [sx * i * .02, 0, -.62]);
          prim.push(f);
        }
        wings.push({ w, sx, prim });
      }
      // neck ruff and head
      P(g, A.ico(.5, 1), plume, [0, 2.45, .25], { scale: [.85, 1, .85] });
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2;
        P(g, new T.ConeGeometry(.08, .45, 4), plumeD, [Math.cos(a) * .42, 2.25, .25 + Math.sin(a) * .42], { rot: [Math.sin(a) * .9, 0, -Math.cos(a) * .9] });
      }
      const neckJ = G(g, [0, 2.75, .32]), head = G(neckJ, [0, .2, .05]); head.scale.setScalar(1.3);
      P(head, A.ico(.36, 1), plume, [0, 0, 0], { scale: [.85, .9, 1.1] });
      for (const sx of [-1, 1]) {
        P(head, A.ico(.065, 0), glow('#ffc832', 2.2), [sx * .22, .07, .16], { cast: false });
        P(head, A.box(.16, .05, .22), plumeD, [sx * .19, .16, .14], { rot: [.25, 0, sx * .3] });
      }
      P(head, A.box(.26, .2, .26), glass, [0, -.02, .35], { cast: false });
      P(head, new T.ConeGeometry(.13, .6, 5), glass, [0, -.06, .66], { rot: [Math.PI / 2 + .35, 0, 0], cast: false });
      P(head, new T.ConeGeometry(.06, .22, 4), glass, [0, -.24, .9], { rot: [Math.PI, 0, 0], cast: false });
      P(head, new T.ConeGeometry(.09, .38, 5), glass, [0, -.16, .5], { rot: [Math.PI / 2 + .2, 0, 0], cast: false });
      // a shard in its beak, and many more worked into its feathers
      const sparkle = [0, 1, 2].map(() => new T.MeshStandardMaterial({ color: '#e6f0f4', metalness: 1, roughness: .08, emissive: '#ffffff', emissiveIntensity: 0, flatShading: true }));
      const tints = ['#d9a441', '#6fc28a', '#7fb6e8'].map(c => new T.MeshStandardMaterial({ color: c, transparent: true, opacity: .75, roughness: .05, metalness: .3, emissive: c, emissiveIntensity: .15, flatShading: true }));
      P(head, new T.TetrahedronGeometry(.09), sparkle[0], [0, -.2, .82], { cast: false });
      const rnd = A.rand(11);
      for (let i = 0; i < 46; i++) {
        const a = rnd() * Math.PI * 1.1 - .55 + Math.PI / 2, y = 1.25 + rnd() * 1.3, r = (y > 2.15 ? .5 : y > 1.9 ? .95 : 1.02);
        const m = i % 4 === 3 ? tints[i % 3] : sparkle[i % 3];
        P(g, new T.TetrahedronGeometry(.05 + rnd() * .06), m, [Math.cos(a) * r * .8, y, .15 + Math.sin(a) * r], { rot: [rnd() * 3, rnd() * 3, 0], cast: false });
      }
      let lookAt = 0, tiltAt = 0, nextLook = 0, look = 0, tilt = 0;
      return (t, dt) => {
        body.scale.set(1, 1 + .02 * Math.sin(t * 1.4), 1);
        if (t > nextLook) { lookAt = (A.rand(Math.floor(t * 7))() - .5) * 1.3; tiltAt = (A.rand(Math.floor(t * 13))() - .5) * .8; nextLook = t + .8 + (t * 3.7 % 1.4); }
        const k = 1 - Math.exp(-dt * 18); look += (lookAt - look) * k; tilt += (tiltAt - tilt) * k;
        head.rotation.set(.1, look, tilt); neckJ.rotation.y = look * .3;
        const open = pulse(t + 6, 13, 3.5);
        for (const { w, sx, prim } of wings) {
          w.rotation.z = sx * open * 1.05; w.rotation.x = -open * .25;
          prim.forEach((f, i) => { f.rotation.y = sx * open * (i * .14); });
        }
        sparkle.forEach((m, i) => { m.emissiveIntensity = Math.pow(Math.max(0, Math.sin(t * (1.3 + i * .7) + i * 2)), 12) * 2.5; });
      };
    },
  },

  // ================================================================ BASILISK
  basilisk: {
    name: 'The basilisk', hour: 13,
    blurb: 'Rare and dangerous. A six-legged serpent whose gaze turns living things to stone. A crow and a fox in the courtyard did not look away in time.',
    view: [[-8.3, 2.7, 3.9], [-10.7, .4, -.4]],
    knight: { place: 'courtyard', action: 'stand', emote: 'exclaim', note: 'very carefully not meeting its eyes' },
    build(root) {
      const g = G(root, [-10.4, 0, .05], [0, Math.PI / 2, 0]);
      const hide = A.mat('#5a6a46', 0, .7), hideD = A.mat('#3b4631', 0, .75), belly = A.mat('#a39f6c', 0, .8);
      const crestB = A.mat('#c9bfa0', 0, .6), crestM = ds('#7a2e2a'), claw = A.mat('#1a1712', .2, .5);
      const stone = A.M.stoneL, stoneD = A.M.stone;
      const N = 10, segs = [];
      for (let i = 0; i < N; i++) {
        const r = i < 3 ? .5 + i * .03 : .56 * (1 - (i - 2) / (N - 1)) + .07;
        const s = G(g, [0, r * .95, -i * .5]);
        P(s, A.ico(r, 1), i % 2 ? hide : hideD, [0, 0, 0], { scale: [1.05, .82, 1.15], jitter: .03 });
        P(s, A.ico(r * .8, 1), belly, [0, -r * .3, 0], { scale: [.95, .5, 1.1] });
        P(s, new T.ConeGeometry(r * .3, r * .7, 4), crestB, [0, r * .78, 0], { rot: [-.35, 0, 0] });
        segs.push({ s, r });
      }
      const legs = [];
      for (const i of [1, 3, 5]) for (const sx of [-1, 1]) {
        const { s, r } = segs[i], hip = G(s, [sx * r * .8, -r * .1, 0]);
        bone(hip, [0, 0, 0], [sx * .45, -.05, .1], .13, .1, hide);
        bone(hip, [sx * .45, -.05, .1], [sx * .55, -r * .95 + .05, .15], .1, .07, hideD);
        for (const a of [-.4, 0, .4]) P(hip, new T.ConeGeometry(.03, .16, 4), claw, [sx * .55 + Math.sin(a) * .1, -r * .95 + .03, .22 + Math.cos(a) * .05], { rot: [1.6, a, 0] });
        legs.push({ hip, sx, ph: i * .9 + (sx > 0 ? Math.PI : 0) });
      }
      const head = G(segs[0].s, [0, .05, .55]);
      P(head, A.box(.6, .34, .75), hide, [0, .02, .25], { jitter: .05 });
      P(head, A.box(.46, .22, .4), hideD, [0, -.02, .7], { jitter: .04 });
      const jaw = G(head, [0, -.16, .05]);
      P(jaw, A.box(.52, .1, .85), belly, [0, -.03, .38], { jitter: .03 });
      const eyeMat = glow('#d8ff5a', 2.2);
      for (const sx of [-1, 1]) {
        P(head, A.ico(.07, 0), eyeMat, [sx * .25, .14, .48], { cast: false });
        P(head, A.box(.18, .06, .22), hideD, [sx * .24, .21, .46], { rot: [0, 0, sx * -.3] });
      }
      // the crest: a fan of bony spines with skin between
      const crest = G(head, [0, .2, 0]);
      const tips = [];
      for (let i = 0; i < 5; i++) {
        const a = -.9 + i * .45, tip = [Math.sin(a) * .55, .45 + Math.cos(a) * .55 - .25 * Math.abs(Math.sin(a)), -.25 - Math.cos(a) * .2];
        bone(crest, [0, 0, 0], tip, .05, .012, crestB, 5); tips.push(tip);
      }
      sheet(crest, [[0, 0, 0], ...tips], [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 5]], crestM);
      const tongue = G(head, [0, -.08, .85]);
      for (const sx of [-1, 1]) P(tongue, A.box(.025, .012, .22), A.mat('#8a2a3a'), [sx * .03, 0, .12], { rot: [0, sx * .25, 0], cast: false });
      const gazeMat = new T.MeshBasicMaterial({ color: '#d8ff5a', transparent: true, opacity: .05, depthWrite: false, blending: T.AdditiveBlending });
      const gaze = new T.Mesh(new T.ConeGeometry(.9, 4, 12, 1, true), gazeMat); gaze.rotation.x = -Math.PI / 2; gaze.position.set(0, .14, 2.5); head.add(gaze);
      // what it looked at
      const crow = G(root, [-8.7, 0, 1.25], [0, .6, 0]);
      P(crow, A.ico(.13, 0), stone, [0, .16, 0], { scale: [1, .9, 1.4] });
      P(crow, A.ico(.08, 0), stone, [0, .28, .13]);
      P(crow, new T.ConeGeometry(.03, .1, 4), stoneD, [0, .27, .24], { rot: [Math.PI / 2, 0, 0] });
      P(crow, A.box(.12, .02, .16), stoneD, [0, .17, -.18], { rot: [.4, 0, 0] });
      for (const sx of [-1, 1]) P(crow, A.box(.02, .16, .2), stone, [sx * .11, .2, 0], { rot: [0, 0, sx * -.9] });
      const fox = G(root, [-13.7, 0, 1.5], [0, 1.0, 0]);
      P(fox, A.ico(.2, 1), stone, [0, .38, 0], { scale: [.85, .85, 1.7] });
      P(fox, A.ico(.13, 1), stone, [0, .52, .38]);
      P(fox, new T.ConeGeometry(.07, .2, 4), stoneD, [0, .5, .55], { rot: [Math.PI / 2, 0, 0] });
      for (const sx of [-1, 1]) P(fox, new T.ConeGeometry(.04, .12, 4), stoneD, [sx * .07, .66, .36]);
      for (const [x, z, a] of [[-.1, .22, -.4], [.1, .25, .3], [-.1, -.22, .2], [.1, -.24, -.3]]) bone(fox, [x, .32, z], [x, .02, z + a * .2], .045, .035, stone);
      bone(fox, [0, .4, -.32], [0, .3, -.7], .07, .03, stone);
      return (t) => {
        for (let i = 0; i < N; i++) { segs[i].s.position.x = Math.sin(t * 1.1 - i * .55) * .22 * smooth(0, 3, i); segs[i].s.rotation.y = Math.cos(t * 1.1 - i * .55) * .2 * smooth(0, 3, i); }
        head.rotation.y = Math.sin(t * .35) * .45; head.rotation.x = -.05 + Math.sin(t * .23) * .06;
        for (const l of legs) l.hip.rotation.x = Math.sin(t * 1.1 + l.ph) * .35;
        const flick = pulse(t, 3.2, .45); tongue.scale.z = .2 + flick * 1.8; jaw.rotation.x = flick * .12;
        eyeMat.emissiveIntensity = 1.8 + Math.sin(t * 2.3) * .6; gazeMat.opacity = .035 + Math.sin(t * 2.3) * .015;
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
      const torso = G(g, [0, 2.05, 0]);
      blk(torso, [1.45, .55, .82], [0, .3, 0], 0);
      blk(torso, [1.8, .7, .95], [0, .9, .02], 2);
      blk(torso, [.7, .35, .5], [-.45, 1.4, -.05], 1); blk(torso, [.75, .35, .5], [.42, 1.42, -.02], 0);
      P(torso, A.box(.05, .55, .02), seam, [-.1, .85, .49], { rot: [0, 0, .3], cast: false });
      P(torso, A.box(.05, .35, .02), seam, [.12, .62, .43], { rot: [0, 0, -.5], cast: false });
      P(torso, A.ico(.16, 0), seam, [0, .9, .43], { cast: false });
      const core = new T.PointLight('#ff9a3a', 2, 3.5, 2); core.position.set(0, .9, .8); torso.add(core);
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
        seam.emissiveIntensity = eyes.emissiveIntensity = 2.2 + Math.sin(t * 1.3) * .8; core.intensity = 1.6 + Math.sin(t * 1.3) * .6;
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
      const skin = A.mat('#4a3358', .1, .35), skinD = A.mat('#33233f', .1, .4), sucker = A.mat('#d8b2c4', 0, .45);
      const water = glow('#2fd3c0', .9);
      const disc = new T.Mesh(new T.CircleGeometry(.44, 12), water); disc.rotation.x = -Math.PI / 2; disc.position.y = .55; g.add(disc);
      const lamp = new T.PointLight('#3fe0c8', 4, 7, 1.6); lamp.position.set(.3, .95, .5); g.add(lamp);
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
      P(eye, new T.SphereGeometry(.3, 12, 9), A.mat('#d8d2b0', 0, .35), [0, 0, 0], { jitter: 0 });
      P(eye, new T.CircleGeometry(.15, 12), glow('#f0a020', 1.6), [0, 0, .301], { jitter: 0, cast: false });
      P(eye, A.box(.035, .22, .01), A.mat('#050405'), [0, 0, .31], { jitter: 0, cast: false });
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
        water.emissiveIntensity = .7 + Math.sin(t * 1.7) * .25; lamp.intensity = 3.6 + Math.sin(t * 1.7) * 1;
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
    blurb: 'Uncommon, and harmless. A vast, gentle thing that drifts over the keep on clear nights, lit with its own small stars.',
    view: [[-3.5, 1.6, 17], [-3.5, 11, -2]],
    knight: { place: 'courtyard', action: 'gaze', emote: 'heart', note: 'watching the sky whale pass over' },
    build(root) {
      const g = G(root, [0, 13, 0], [0, -Math.PI / 2, 0]);
      const hide = A.mat('#2c3d5a', .05, .75, { emissive: '#1a2c48', emissiveIntensity: 1 });
      const bellyM = A.mat('#6f7f96', 0, .8, { emissive: '#1a2333', emissiveIntensity: .5 });
      const finM = ds('#2b3c58', .05, .8);
      const prof = [[0, -8], [1.2, -7], [2.2, -5], [2.6, -2.5], [2.5, 0], [2.1, 2.5], [1.5, 4.5], [.9, 6.4], [.5, 7.8], [.12, 8.6], [0, 8.7]]
        .map(([r, y]) => new T.Vector2(r, y));
      const body = new T.Mesh(A.facet(new T.LatheGeometry(prof, 10), .25, 3), hide);
      body.rotation.x = Math.PI / 2; body.scale.set(1.1, 1, .85); g.add(body);
      P(g, A.ico(1, 1), bellyM, [0, -1.1, -1], { scale: [1.9, .9, 6.5], jitter: .1 });
      const spots = new T.MeshBasicMaterial({ color: '#7ff0e6', fog: false });
      const r = A.rand(77);
      const spotMeshes = [];
      for (let i = 0; i < 44; i++) {
        const z = -6.5 + r() * 13, side = i % 2 ? 1 : -1, rr = 2.5 * Math.sin(Math.PI * (z + 8) / 16.7) * 1.05;
        const a = .25 + r() * .9;
        const m = new T.Mesh(A.ico(.08 + r() * .08, 0), spots); m.position.set(side * Math.cos(a) * rr * 1.1, Math.sin(a) * rr * .85 - .2, z); g.add(m);
        spotMeshes.push(m);
      }
      const eye = new T.Mesh(A.ico(.16, 0), new T.MeshBasicMaterial({ color: '#cfffff', fog: false }));
      for (const sx of [-1, 1]) { const e = eye.clone(); e.position.set(sx * 1.55, .1, 5.2); g.add(e); }
      const fins = [];
      for (const sx of [-1, 1]) {
        const f = G(g, [sx * 2.1, -.5, 2.2]);
        sheet(f, [[0, 0, .8], [0, 0, -1.6], [sx * 5.5, -.3, -2.2], [sx * 6.8, -.4, -3.6], [sx * 3.0, -.2, -2.9]], [[0, 1, 2], [2, 3, 4], [1, 2, 4], [0, 2, 1]], finM);
        for (let i = 0; i < 4; i++) { const m = new T.Mesh(A.ico(.1, 0), spots); m.position.set(sx * (2 + i * 1.2), -.25, -1.4 - i * .5); f.add(m); }
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
      return (t) => {
        const k = (t * .55 + 14) % 50;
        g.position.set(22 - k, 12.5 + Math.sin(t * .2) * .5, -1 + Math.sin(t * .07) * 2);
        g.rotation.z = Math.sin(t * .3) * .05; g.rotation.x = Math.sin(t * .23) * .03;
        for (const { f, sx } of fins) f.rotation.z = sx * Math.sin(t * .7) * .28;
        fluke.rotation.x = Math.sin(t * .7 - 1) * .3;
        tendrils.forEach((c, n) => c.forEach((j, i) => { j.rotation.x = Math.sin(t * .8 - i * .5 + n) * .08; j.rotation.z = Math.sin(t * .5 - i * .4 + n * 2) * .06; }));
        spotMeshes.forEach((m, i) => m.scale.setScalar(.7 + .5 * Math.max(0, Math.sin(t * 1.2 - m.position.z * .5))));
      };
    },
  },

  // ================================================================ DEEP WYRM
  wyrm: {
    name: 'The deep wyrm', hour: 13,
    blurb: 'Rare. Something long and eyeless burrows beneath the keep. Where it surfaces, the courtyard falls in.',
    view: [[-6.2, 3.0, 5.6], [-12.6, 2.4, .9]],
    knight: { place: 'courtyard', action: 'stand', emote: 'exclaim', note: 'backing toward the doorway' },
    build(root) {
      const hx = -14, hz = 1.7;
      const hide = A.mat('#7c6c55', 0, .8), band = A.mat('#4d4235', 0, .85), bone_ = A.mat('#e0d6bd', 0, .6), dark = A.mat('#0b0806', 0, 1);
      const hole = new T.Mesh(new T.CircleGeometry(1.5, 14), dark); hole.rotation.x = -Math.PI / 2; hole.position.set(hx, .035, hz); root.add(hole);
      const r = A.rand(5);
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * 6.28, d = 1.45 + r() * .35;
        P(root, A.box(.45 + r() * .3, .2 + r() * .25, .35 + r() * .3), i % 3 ? A.M.dirt : A.M.stone, [hx + Math.cos(a) * d, .08, hz + Math.sin(a) * d], { rot: [r() - .5, a, (r() - .5) * .9], jitter: .06 });
      }
      const base = G(root, [hx, -.6, hz], [0, -.63, 0]);
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
        segs.forEach((j, i) => { j.rotation.z = (i === 0 ? .1 : -.16) + sway * .025; j.rotation.x = Math.sin(t * .5 - i * .4) * .035; });
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
          c.fillStyle = '#e8a64a'; c.beginPath(); c.arc(62, -16, 15, 0, 6.3); c.fill();
          c.fillStyle = '#231a14'; c.beginPath(); c.arc(62, -16, 10, 0, 6.3); c.fill();
          c.fillStyle = '#f4ead2'; c.beginPath(); c.arc(59, -19, 3, 0, 6.3); c.fill();
          c.restore();
        }
        c.fillStyle = '#3a2c22'; c.beginPath(); c.ellipse(w / 2, h / 2 + 4, 7, 40, 0, 0, 6.3); c.fill();
      });
      const mothMat = new T.MeshStandardMaterial({ map: wingTex, emissiveMap: wingTex, emissive: '#ffd08a', emissiveIntensity: .6,
                                                   transparent: true, alphaTest: .4, side: T.DoubleSide, roughness: .9 });
      const geo = new T.PlaneGeometry(.2, .1); geo.rotateX(-Math.PI / 2);
      const N = 90, swarm = new T.InstancedMesh(geo, mothMat, N); swarm.frustumCulled = false; root.add(swarm);
      const seeds = Array.from({ length: N }, (_, i) => { const r = A.rand(i * 7 + 3); return { a: r() * 6.28, rad: .5 + r() * 1.7, sp: .7 + r() * .9, h: r(), fl: r() * 6.28 }; });
      const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(), p = new T.Vector3();
      // the great moth, on the wall by the window
      const big = G(root, [-.9, 2.75, -3.9], [0, 0, .22]); big.scale.setScalar(1.7);   // flat on the wall, wings spread
      const fur = A.mat('#5a4636', 0, 1), furL = A.mat('#8a7458', 0, 1);
      for (let i = 0; i < 5; i++) P(big, A.ico(.09 - i * .008, 1), i % 2 ? furL : fur, [0, .12 - i * .1, 0], { scale: [1, 1.2, .9] });
      for (const sx of [-1, 1]) {
        P(big, A.ico(.035, 0), glow('#ffe0a0', 2), [sx * .05, .2, .05], { cast: false });
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
      const iron = A.mat('#4a423b', .55, .65), rust = A.mat('#6b4632', .3, .8), dark = A.mat('#2a2724', .5, .7);
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
      const ghost = new T.PointLight('#8fe8d4', 1.4, 4, 2); ghost.position.set(0, 0, .6); head.add(ghost);
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
        for (const m of mist) { const u = m.userData; m.position.set(u.x + Math.sin(t * .1 + u.ph) * .8, .35 + Math.sin(t * .3 + u.ph) * .1, u.z + Math.cos(t * .08 + u.ph) * .6); m.scale.setScalar(3 + Math.sin(t * .2 + u.ph)); }
      };
    },
  },

  // ================================================================ FOG WITH EYES
  fog: {
    name: 'The fog with eyes', hour: 22,
    blurb: 'Common, on some nights. Fog rolls into the courtyard, and things look out of it. Nothing happens if you stay by the fire.',
    view: [[-2.3, 1.6, 1.0], [-11, 1.3, .6]],
    knight: { place: 'fire', action: 'sit', emote: 'dots', note: 'staying by the fire' },
    build(root) {
      const sprites = Array.from({ length: 56 }, (_, i) => {
        const r = A.rand(i * 13 + 1);
        const sp = new T.Sprite(new T.SpriteMaterial({ map: puff(), color: '#5f687b', transparent: true, opacity: .24 + r() * .14, depthWrite: false }));
        sp.userData = { x: -26 + r() * 20.5, y: .3 + r() * 1.6, z: -9 + r() * 18, s: 3 + r() * 4, sp: .15 + r() * .2 };
        root.add(sp); return sp;
      });
      const eyeMats = [glow('#f6e7a0', 3, { fog: false }), glow('#c8f07a', 3, { fog: false })];
      const pairs = [];
      const r = A.rand(42);
      const spots = [[-9.5, .6, -1.8], [-11, 1.4, 2.6], [-13.5, .9, -.5], [-15.5, 1.8, 2.0], [-12.2, .45, .8], [-16.5, 1.1, -2.8],
                     [-8.6, 1.9, 3.4], [-14.2, 2.4, -3.2], [-19, 1.3, 1.0], [-18, .7, -1.2], [-10.5, 2.6, -3.5]];
      for (const [x, y, z] of spots) {
        const pr = G(root, [x, y, z]), gap = .12 + r() * .12, sz = .03 + r() * .03;
        for (const sx of [-1, 1]) P(pr, A.ico(sz, 0), eyeMats[pairs.length % 3 === 2 ? 1 : 0], [sx * gap, 0, 0], { scale: [1, .7, 1], cast: false, jitter: 0 });
        pairs.push({ pr, ph: r() * 20, every: 4 + r() * 6 });
      }
      const huge = G(root, [-22, 3.4, .6]);
      for (const sx of [-1, 1]) P(huge, A.ico(.22, 0), eyeMats[0], [sx * .65, 0, 0], { scale: [1, .6, 1], cast: false, jitter: 0 });
      pairs.push({ pr: huge, ph: 3, every: 11 });
      const cam = new T.Vector3();
      return (t) => {
        A.scene.fog.color.set('#141821'); A.scene.fog.density = .075;
        for (const sp of sprites) {
          const u = sp.userData; let x = u.x + t * u.sp;
          x = -26 + ((x + 26) % 20.5);
          sp.position.set(x, u.y + Math.sin(t * .3 + u.z) * .15, u.z); sp.scale.setScalar(u.s);
        }
        A.camera.getWorldPosition(cam);
        for (const p of pairs) {
          const k = (t + p.ph) % p.every;
          const lid = k < .18 ? .1 : 1, fade = smooth(0, 1.2, k) * (1 - smooth(p.every - 1.2, p.every, k));
          p.pr.scale.set(fade, fade * lid, fade); p.pr.lookAt(cam);
        }
      };
    },
    exit() { A.updateSky(); },
  },
};
const ORDER = Object.keys(BEASTS);
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
    <select title="Time of day">${TIMES.map(([n, h]) => `<option value="${h}">${n}</option>`).join('')}</select></div>
    <p></p><small>Mockup only: not part of Rooken's world (yet). ${matchMedia('(pointer: coarse)').matches ? 'Drag to look around.' : 'Drag to look around, WASD to fly.'}</small>`;
  document.body.append(el);
  ui = { name: el.querySelector('b'), blurb: el.querySelector('p'), count: el.querySelector('.n'), time: el.querySelector('select') };
  el.querySelectorAll('button').forEach(b => b.onclick = () => {
    const i = (ORDER.indexOf(cur.key) + +b.dataset.d + ORDER.length) % ORDER.length; show(ORDER[i]); b.blur();
  });
  ui.time.onchange = () => { A.setHour(+ui.time.value); const u = new URL(location.href); u.searchParams.set('hour', A.hour); history.replaceState(null, '', u); ui.time.blur(); };
  for (const ev of ['pointerdown', 'keydown', 'wheel']) el.addEventListener(ev, e => e.stopPropagation());
}

export function start(key, api) {
  T = api.THREE; A = api; A.mat = api.mat;
  buildUI();
  const hour = new URLSearchParams(location.search).get('hour');
  show(BEASTS[key] ? key : ORDER[0], hour != null && hour !== '' ? +hour : undefined);
}
