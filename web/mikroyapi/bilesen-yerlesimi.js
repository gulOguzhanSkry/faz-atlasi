/* SPDX-License-Identifier: MIT — port of OG portfolio geometry. See docs/STAGE3_DELIVERY.md. */
const CONSTITUENT_COLORS = {
  "proeutectoid-ferrite": "#e4d3a2",
  ferrite: "#e4d3a2",
  "tertiary-cementite": "#3f2b3d",
  pearlite: "#8d7d4f",
  "secondary-cementite": "#55395a",
  austenite: "#6f95b2",
  "primary-austenite": "#4c7898",
  ledeburite: "#a3647f",
  "transformed-ledeburite": "#b58399",
  "primary-cementite": "#3a2638",
  liquid: "#c76c43",
  "delta-ferrite": "#79a69c",
  cementite: "#70536c",
  "primary-solid": "#8b8f8c"
};
const MICRO_SCALE = Object.freeze({ priorGrainUm: 40, lamellaSpacingUm: 0.5, ferriteGrainUm: 12, ledeburitePearliteFactor: 1.6 });
function lamellaCoverage(x0, x1, c) {
  if (!(c > 0)) return 0;
  if (c >= 1) return 1;
  const F = (x) => {
    const i = Math.floor(x), f = x - i;
    return i * c + Math.min(c, Math.max(0, f - (0.5 - c / 2)));
  };
  if (Math.abs(x1 - x0) < 1e-9) {
    const f = x0 - Math.floor(x0);
    return f > 0.5 - c / 2 && f < 0.5 + c / 2 ? 1 : 0;
  }
  return (F(Math.max(x0, x1)) - F(Math.min(x0, x1))) / Math.abs(x1 - x0);
}
const isFerriteBand = (part) => part.placement === "boundary" && Object.keys(part.phases).length === 1 && (part.phases.A ?? 0) > 0;
class LazyFieldView {
  constructor(probe) {
    this.probe = probe;
  }
  probe;
  get interface() {
    return this.probe("interface");
  }
  get ferrite() {
    return this.probe("ferrite");
  }
  get dendrite() {
    return this.probe("dendrite");
  }
  get plate() {
    return this.probe("plate");
  }
  get lamella() {
    return this.probe("lamella");
  }
  get fine() {
    return this.probe("fine");
  }
  get island() {
    return this.probe("island");
  }
}
const bandScore = (lam) => Math.abs(lam - Math.floor(lam) - 0.5) * 2;
const gaussian = (u, v) => Math.sqrt(-2 * Math.log(Math.max(1e-12, u))) * Math.cos(2 * Math.PI * v);
const finite = (n) => Number.isFinite(n);
const before = (value, index, cut) => value < cut.value || value === cut.value && index <= cut.index;
const END = { value: Infinity, index: Infinity };
function hash(a, b, c, d = 0) {
  let h = Math.imul(a | 0, 668265261) ^ Math.imul(b | 0, 374761393) ^ Math.imul(c | 0, 2654435761) ^ Math.imul(d | 0, 2246822507);
  h ^= h >>> 15;
  h = Math.imul(h, 739982445);
  h ^= h >>> 12;
  h = Math.imul(h, 695872825);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
function apportion(weights, total) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!(sum > 0)) return weights.map((_, i) => i === 0 ? total : 0);
  const raw = weights.map((w) => w / sum * total), out = raw.map(Math.floor);
  const order = raw.map((r, i) => ({ i, r: r - out[i] })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (let left = total - out.reduce((a, b) => a + b, 0), k = 0; k < left; k++) out[order[k].i]++;
  return out;
}
class ConstituentOccupancy {
  constructor(volume, size = 32, surfaceDetail = 128) {
    this.volume = volume;
    if (!Number.isInteger(size) || size < 16 || size > 64 || size ** 3 * volume.seeds.length > 11e7) throw new RangeError("Occupancy work budget exceeded");
    if (!finite(surfaceDetail) || surfaceDetail < 16) throw new RangeError("Invalid surface detail");
    this.size = size;
    const n = size, total = n ** 3;
    for (const s of volume.seeds) this.seedById.set(s.id, s);
    this.lamellaFrequency = this.unitUm / MICRO_SCALE.lamellaSpacingUm;
    this.islandFrequency = Math.min(11, surfaceDetail / 9);
    this.labels = new Uint8Array(total);
    this.partLabels = new Uint8Array(total);
    void total;
  }
  volume;
  size;
  labels;
  partLabels;
  phases = [];
  parts = [];
  budgets = [];
  partBudgets = [];
  arrangement = "grain-boundary";
  /** Grid fields are computed on first use: steels never need dendrite, plate or eutectic fields. */
  seedGrid;
  grids = /* @__PURE__ */ new Map();
  grid(name) {
    return this.grids.get(name) ?? (this.ensure([name]), this.grids.get(name));
  }
  /** Fills every missing grid in one pass so nearest-seed and colony lookups are shared. */
  ensure(names) {
    if (names.includes("ferrite") && !this.grids.has("interface")) this.ensure(["interface"]);
    const todo = [...new Set(names)].filter((k) => !this.grids.has(k));
    if (!todo.length) return;
    const n = this.size, out = todo.map(() => new Float64Array(n ** 3));
    for (let z = 0, i = 0; z < n; z++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++, i++) {
      const f = this.probe([(x + 0.5) / n, (y + 0.5) / n, (z + 0.5) / n], true);
      for (let k = 0; k < todo.length; k++) out[k][i] = f(todo[k]);
    }
    todo.forEach((k, j) => this.grids.set(k, out[j]));
  }
  seedById = /* @__PURE__ */ new Map();
  plans = [];
  lamellaFrequency;
  islandFrequency;
  frames = /* @__PURE__ */ new Map();
  frame(id) {
    const cached = this.frames.get(id);
    if (cached) return cached;
    const u = hash(id, 1, 7) * 2 - 1, phi = hash(id, 2, 7) * Math.PI * 2, psi = hash(id, 3, 7) * Math.PI * 2, s = Math.sqrt(1 - u * u);
    const a = [s * Math.cos(phi), s * Math.sin(phi), u];
    const ref = Math.abs(a[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const cross = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
    const norm = (p) => {
      const l = Math.hypot(...p);
      return [p[0] / l, p[1] / l, p[2] / l];
    };
    let b = norm(cross(a, ref)), c = cross(a, b);
    b = [b[0] * Math.cos(psi) + c[0] * Math.sin(psi), b[1] * Math.cos(psi) + c[1] * Math.sin(psi), b[2] * Math.cos(psi) + c[2] * Math.sin(psi)];
    c = cross(a, b);
    const out = [a, b, c];
    this.frames.set(id, out);
    return out;
  }
  /** Grain length scale (mean seed spacing) in normalised volume units. */
  get grainScale() {
    return Math.cbrt(1 / Math.max(1, this.volume.seeds.length));
  }
  /** Micrometres per volume unit implied by MICRO_SCALE.priorGrainUm. */
  get unitUm() {
    return MICRO_SCALE.priorGrainUm / this.grainScale;
  }
  /** Deterministic trilinear value noise in [0,1]. */
  noise(x, y, z, salt) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
    const s = (t) => t * t * (3 - 2 * t), u = s(fx), v = s(fy), w = s(fz);
    const h = (a, b, c) => hash(ix + a, iy + b, iz + c, salt);
    const l = (a, b, t) => a + (b - a) * t;
    return l(l(l(h(0, 0, 0), h(1, 0, 0), u), l(h(0, 1, 0), h(1, 1, 0), u), v), l(l(h(0, 0, 1), h(1, 0, 1), u), l(h(0, 1, 1), h(1, 1, 1), u), v), w);
  }
  /** Fractal (3-octave) noise centred on 0, roughly in [-0.5,0.5]. */
  fbm(p, scale, salt) {
    let sum = 0, amp = 0.5, f = scale;
    for (let o = 0; o < 3; o++) {
      sum += amp * (this.noise(p[0] * f, p[1] * f, p[2] * f, salt + o * 17) - 0.5);
      f *= 2.03;
      amp *= 0.5;
    }
    return sum / 0.875;
  }
  unitFromHash(a, b, c) {
    const u = hash(a, b, c, 41) * 2 - 1, phi = hash(a, b, c, 42) * Math.PI * 2, s = Math.sqrt(1 - u * u);
    return [s * Math.cos(phi), s * Math.sin(phi), u];
  }
  dendriteLimit = Infinity;
  dendrites = /* @__PURE__ */ new Map();
  /** Capsule list of one grain's <100> dendrite: trunks along the six cube half-axes and
   * perpendicular secondary arms; cached per grain. Layout: ax,ay,az,dx,dy,dz,len,ra,rb. */
  dendriteOf(seed, frame) {
    const cached = this.dendrites.get(seed.id);
    if (cached) return cached;
    const G = this.grainScale, r0 = G * 0.055, lambda2 = G * 0.17, o = seed.position, axes = [];
    for (const e of frame) axes.push(e, [-e[0], -e[1], -e[2]]);
    const caps = [], groups = [];
    let reach = 0;
    axes.forEach((dir, i) => {
      const start = caps.length, L1 = G * (0.62 + 0.3 * hash(seed.id, i, 61));
      caps.push(...o, ...dir, L1, r0, r0 * 0.3);
      reach = Math.max(reach, L1 + r0);
      let armReach = r0;
      const others = axes.filter((_, j) => j >> 1 !== i >> 1);
      for (let s = lambda2 * (0.6 + 0.3 * hash(seed.id, i, 62)); s < L1 * 0.85; s += lambda2) {
        const base = [o[0] + dir[0] * s, o[1] + dir[1] * s, o[2] + dir[2] * s], L2 = (L1 - s) * 0.7, ra = r0 * 0.55 * (1 - 0.5 * s / L1);
        for (const d2 of others) {
          caps.push(...base, ...d2, L2, ra, ra * 0.35);
          reach = Math.max(reach, Math.hypot(s, L2) + ra);
          armReach = Math.max(armReach, L2 + ra);
        }
      }
      groups.push(start, caps.length, L1, armReach);
    });
    const out = { reach, caps: Float64Array.from(caps), groups: Float64Array.from(groups) };
    this.dendrites.set(seed.id, out);
    return out;
  }
  /** Signed distance to one grain's dendrite, smooth union of its capsules. Exact: a trunk group
   * (or capsule) is skipped only when its lower bound exceeds the running result plus the blend
   * width, where the smooth minimum can no longer change the value. Groups run nearest first. */
  dendriteSdf(seed, frame, p, limit = Infinity) {
    const { caps, groups } = this.dendriteOf(seed, frame), k = this.grainScale * 0.012;
    const order = [];
    for (let g = 0; g < groups.length; g += 4) {
      const s0 = groups[g], trunkLen = groups[g + 2], armReach = groups[g + 3];
      const tx = p[0] - caps[s0], ty = p[1] - caps[s0 + 1], tz = p[2] - caps[s0 + 2], tt = Math.max(0, Math.min(trunkLen, tx * caps[s0 + 3] + ty * caps[s0 + 4] + tz * caps[s0 + 5]));
      order.push([Math.hypot(tx - caps[s0 + 3] * tt, ty - caps[s0 + 4] * tt, tz - caps[s0 + 5] * tt) - armReach, g]);
    }
    order.sort((x, y) => x[0] - y[0]);
    let acc = Infinity;
    for (const [lb, g] of order) {
      if (lb > Math.min(acc, limit) + k) break;
      for (let c = groups[g]; c < groups[g + 1]; c += 9) {
        const px = p[0] - caps[c], py = p[1] - caps[c + 1], pz = p[2] - caps[c + 2], len = caps[c + 6], ra = caps[c + 7], rb = caps[c + 8];
        const lbc = Math.sqrt(px * px + py * py + pz * pz) - len - ra;
        if (lbc > Math.min(acc, limit) + k) continue;
        const t = Math.max(0, Math.min(len, px * caps[c + 3] + py * caps[c + 4] + pz * caps[c + 5]));
        const d = Math.hypot(px - caps[c + 3] * t, py - caps[c + 4] * t, pz - caps[c + 5] * t) - (ra + (rb - ra) * (len > 0 ? t / len : 0));
        if (!Number.isFinite(acc)) {
          acc = d;
          continue;
        }
        const h = Math.max(k - Math.abs(acc - d), 0) / k;
        acc = Math.min(acc, d) - h * h * k * 0.25;
      }
    }
    return acc;
  }
  nearest(p) {
    const g = this.seedGrid ??= (() => {
      const n2 = Math.max(1, Math.round(Math.cbrt(this.volume.seeds.length / 2)));
      const cells = Array.from({ length: n2 ** 3 }, () => []);
      let maxWeight = 0;
      for (const s of this.volume.seeds) {
        const c = s.position.map((v) => Math.min(n2 - 1, Math.floor(v * n2)));
        cells[c[0] + n2 * (c[1] + n2 * c[2])].push(s);
        maxWeight = Math.max(maxWeight, s.weight);
      }
      return { n: n2, cells, maxWeight };
    })();
    const n = g.n, cx = Math.min(n - 1, Math.floor(p[0] * n)), cy = Math.min(n - 1, Math.floor(p[1] * n)), cz = Math.min(n - 1, Math.floor(p[2] * n));
    let a = Infinity, b = Infinity, id = 0, id2 = 0;
    const visit = (s) => {
      const dx = s.position[0] - p[0], dy = s.position[1] - p[1], dz = s.position[2] - p[2];
      const d = dx * dx + dy * dy + dz * dz - s.weight;
      if (d < a || d === a && s.id < id) {
        b = a;
        id2 = id;
        a = d;
        id = s.id;
      } else if (d < b || d === b && s.id < id2) {
        b = d;
        id2 = s.id;
      }
    };
    for (let ring = 0; ring <= n; ring++) {
      for (let i = cx - ring; i <= cx + ring; i++) for (let j = cy - ring; j <= cy + ring; j++) for (let k = cz - ring; k <= cz + ring; k++) {
        if (Math.max(Math.abs(i - cx), Math.abs(j - cy), Math.abs(k - cz)) !== ring || i < 0 || j < 0 || k < 0 || i >= n || j >= n || k >= n) continue;
        for (const s of g.cells[i + n * (j + n * k)]) visit(s);
      }
      const gap = Math.max(0, Math.min(p[0] - (cx - ring) / n, (cx + ring + 1) / n - p[0], p[1] - (cy - ring) / n, (cy + ring + 1) / n - p[1], p[2] - (cz - ring) / n, (cz + ring + 1) / n - p[2]));
      if (Number.isFinite(b) && gap * gap - g.maxWeight > b) break;
    }
    return { a, b, id, id2 };
  }
  warped(p) {
    const G = this.grainScale, amp = 0.02 * G;
    return [p[0] + amp * this.fbm(p, 2 / G, 101), p[1] + amp * this.fbm(p, 2 / G, 131), p[2] + amp * this.fbm(p, 2 / G, 161)];
  }
  /** Log-normal thickness factor of the boundary facet between two prior grains (σ = 0.45). */
  facetFactor(id, id2) {
    if (!id2) return 1;
    const a = Math.min(id, id2), b = Math.max(id, id2);
    return Math.exp(0.45 * gaussian(hash(a, b, 301), hash(a, b, 302)));
  }
  fInterface(p, nr) {
    const G = this.grainScale, d = Number.isFinite(nr.b) ? nr.b - nr.a : 0;
    return d / this.facetFactor(nr.id, nr.id2) * (1 + 0.35 * this.fbm(p, 3 / G, 211)) + 0.03 * G * G * Math.max(0, this.fbm(p, 4 / G, 223));
  }
  /** Idiomorph nuclei (inclusions) inside grains: one jittered site per cell of size 0.85 G, 55 % occupied. */
  idiomorphDistance(p) {
    const h = 0.85 * this.grainScale, gx = Math.floor(p[0] / h), gy = Math.floor(p[1] / h), gz = Math.floor(p[2] / h);
    let best = Infinity;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
      const cx = gx + i, cy = gy + j, cz = gz + k;
      if (hash(cx, cy, cz, 331) > 0.55) continue;
      const d = Math.hypot(p[0] - (cx + 0.15 + 0.7 * hash(cx, cy, cz, 332)) * h, p[1] - (cy + 0.15 + 0.7 * hash(cx, cy, cz, 333)) * h, p[2] - (cz + 0.15 + 0.7 * hash(cx, cy, cz, 334)) * h);
      if (d < best) best = d;
    }
    return best;
  }
  idioS0;
  /** Interface score at the 35 % quantile: idiomorphs only nucleate once the boundary band is that thick. */
  get idiomorphOnset() {
    if (this.idioS0 !== void 0) return this.idioS0;
    const g = this.grid("interface"), o = this.order("interface", g);
    return this.idioS0 = g[o[Math.floor(0.35 * (o.length - 1))]];
  }
  fFerrite(p, nr) {
    const r = 0.09 * this.grainScale, d = this.idiomorphDistance(p);
    return Math.min(this.fInterface(p, nr), this.idiomorphOnset * (1 + (d / r) ** 2));
  }
  /**
   * Proeutectoid-ferrite grain identity: nearest jittered nucleus on a lattice with the
   * physical ferrite grain size. Display only: ferrite–ferrite boundaries replace the prior
   * austenite boundary, which is not visible inside ferrite.
   */
  ferriteGrain(p) {
    const h = MICRO_SCALE.ferriteGrainUm / this.unitUm, gx = Math.floor(p[0] / h), gy = Math.floor(p[1] / h), gz = Math.floor(p[2] / h);
    let best = Infinity, id = 0;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
      const cx = gx + i, cy = gy + j, cz = gz + k, d = (p[0] - (cx + hash(cx, cy, cz, 341)) * h) ** 2 + (p[1] - (cy + hash(cx, cy, cz, 342)) * h) ** 2 + (p[2] - (cz + hash(cx, cy, cz, 343)) * h) ** 2;
      if (d < best) {
        best = d;
        id = 1 + (cx + 512 & 1023) + 1024 * ((cy + 512 & 1023) + 1024 * (cz + 512 & 1023));
      }
    }
    return id;
  }
  fDendrite(p, nr, limit = Infinity) {
    const d = this.dendriteSdf(this.seedById.get(nr.id), this.frame(nr.id), p, limit);
    if (!nr.id2) return d;
    const s2 = this.seedById.get(nr.id2), den = this.dendriteOf(s2, this.frame(nr.id2));
    const bound = Math.hypot(p[0] - s2.position[0], p[1] - s2.position[1], p[2] - s2.position[2]) - den.reach;
    if (bound >= Math.min(d, limit)) return d;
    return Math.min(d, this.dendriteSdf(s2, this.frame(nr.id2), p, Math.min(d, limit)));
  }
  fPlate(p, nr) {
    return Math.min(this.plateOf(nr.id, p), nr.id2 ? this.plateOf(nr.id2, p) : Infinity);
  }
  plateOf(id, p) {
    const seed = this.seedById.get(id), [e1, e2, e3] = this.frame(id), G = this.grainScale;
    const r = [p[0] - seed.position[0], p[1] - seed.position[1], p[2] - seed.position[2]], dot = (q) => r[0] * q[0] + r[1] * q[1] + r[2] * q[2];
    const plate = (nrm, u, w, L, W, shift) => Math.abs(dot(nrm) - shift) / G + 4 * Math.max(0, Math.max(Math.abs(dot(u)) / L, Math.abs(dot(w)) / W) - 1);
    let best = plate(e3, e1, e2, G * (1.3 + 0.5 * hash(id, 5, 92)), G * 0.5, 0);
    if (hash(id, 5, 91) < 0.7) best = Math.min(best, plate(e1, e2, e3, G * (1.1 + 0.5 * hash(id, 5, 93)), G * 0.4, G * 0.15 * (hash(id, 5, 94) - 0.5)));
    if (hash(id, 5, 95) < 0.35) best = Math.min(best, plate(e2, e3, e1, G * 1.1, G * 0.35, G * 0.2 * (hash(id, 5, 96) - 0.5)));
    return best;
  }
  fLamella(p, nr) {
    const { lam } = this.lamellaCoord(p, nr.id);
    return Math.abs(lam - Math.floor(lam) - 0.5) * 2;
  }
  /** Pearlite colonies: 2-5 per prior austenite grain, each with its own lamella normal. */
  lamellaCoord(p, id) {
    const seed = this.seedById.get(id), G = this.grainScale;
    const colonies = 2 + Math.floor(hash(id, 9, 9) * 4);
    let colony = 0, best = Infinity;
    for (let c = 0; c < colonies; c++) {
      const off = this.unitFromHash(id, c, 71), rad = G * 0.42 * hash(id, c, 72);
      const cx = seed.position[0] + off[0] * rad - p[0], cy = seed.position[1] + off[1] * rad - p[1], cz = seed.position[2] + off[2] * rad - p[2];
      const d = cx * cx + cy * cy + cz * cz;
      if (d < best) {
        best = d;
        colony = c;
      }
    }
    const n = this.unitFromHash(id, colony, 73), q = this.warped(p);
    const lam = (n[0] * q[0] + n[1] * q[1] + n[2] * q[2]) * this.lamellaFrequency + hash(id, colony, 74);
    return { lam, n, colony: id * 8 + colony };
  }
  fColony(p) {
    const Kc = Math.max(2, this.islandFrequency / 3.2);
    let ec = [0, 0, 0], eid = [0, 0, 0], ed = Infinity;
    const gx = Math.floor(p[0] * Kc), gy = Math.floor(p[1] * Kc), gz = Math.floor(p[2] * Kc);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
      const cx = gx + i, cy = gy + j, cz = gz + k, c = [(cx + hash(cx, cy, cz, 1)) / Kc, (cy + hash(cx, cy, cz, 2)) / Kc, (cz + hash(cx, cy, cz, 3)) / Kc];
      const d = Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]);
      if (d < ed) {
        ed = d;
        ec = c;
        eid = [cx, cy, cz];
      }
    }
    return { ec, eid, Kc };
  }
  fIsland(p, col) {
    const { ec, eid, Kc } = col, salt = eid[0] * 7 + eid[1] * 13 + eid[2] * 29;
    const eFrame = this.frame(1e6 + ((eid[0] * 73856093 ^ eid[1] * 19349663 ^ eid[2] * 83492791) >>> 0) % 1e6);
    const v = [p[0] - ec[0], p[1] - ec[1], p[2] - ec[2]], rho = Math.hypot(...v) || 1e-9, rn = rho * Kc;
    const dv = (q) => (v[0] * q[0] + v[1] * q[1] + v[2] * q[2]) / rho;
    const uz = dv(eFrame[2]), ux = dv(eFrame[0]), uy = dv(eFrame[1]);
    const Nz = 10, Nphi = 20, dAng = Math.sqrt(4 * Math.PI / (Nz * Nphi));
    const iz0 = Math.min(Nz - 1, Math.floor((uz + 1) / 2 * Nz)), phi = (Math.atan2(uy, ux) + Math.PI * 2) % (Math.PI * 2), ip0 = Math.floor(phi / (Math.PI * 2) * Nphi);
    let spokes = Infinity;
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      const iz = iz0 + di;
      if (iz < 0 || iz >= Nz) continue;
      const ip = ((ip0 + dj) % Nphi + Nphi) % Nphi, spoke = iz * Nphi + ip;
      const zc = -1 + (iz + 0.15 + 0.7 * hash(salt, spoke, 81)) * 2 / Nz, pc = (ip + 0.15 + 0.7 * hash(salt, spoke, 82)) * Math.PI * 2 / Nphi, sc = Math.sqrt(1 - zc * zc);
      const chord = Math.hypot(ux - sc * Math.cos(pc), uy - sc * Math.sin(pc), uz - zc);
      const seg = Math.floor(Math.log(rn + 0.05) / (dAng * 2.6) + hash(salt, spoke, 83));
      const gap = hash(salt, spoke, seg + 97) < 0.22 ? 1.5 : 0, radius = 0.75 + 0.5 * hash(salt, spoke, 84);
      const score = chord / (dAng * radius) + gap;
      if (score < spokes) spokes = score;
    }
    const Kf = Kc * 9, fx = Math.floor(p[0] * Kf), fy = Math.floor(p[1] * Kf), fz = Math.floor(p[2] * Kf);
    let spot = Infinity;
    if (rn < 0.4) for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
      const cx = fx + i, cy = fy + j, cz = fz + k;
      const d = Math.hypot(p[0] - (cx + hash(cx, cy, cz, 4)) / Kf, p[1] - (cy + hash(cx, cy, cz, 5)) / Kf, p[2] - (cz + hash(cx, cy, cz, 6)) / Kf) * Kf;
      if (d < spot) spot = d;
    }
    const t = Math.min(1, Math.max(0, (rn - 0.2) / 0.2)), island = rn >= 0.4 ? spokes : (1 - t) * spot * 1.6 + t * spokes;
    return island;
  }
  /** Fine lamellae inside transformed-ledeburite islands; one orientation per eutectic colony. */
  fFine(p, col) {
    const { lam } = this.fineCoord(p, col);
    return Math.abs(lam - Math.floor(lam) - 0.5) * 2;
  }
  fineCoord(p, col) {
    const { eid } = col, n = this.unitFromHash(eid[0] + 3, eid[1] + 5, eid[2] + 7), q = this.warped(p);
    const lam = (n[0] * q[0] + n[1] * q[1] + n[2] * q[2]) * this.lamellaFrequency * MICRO_SCALE.ledeburitePearliteFactor + hash(eid[0], eid[1], eid[2], 75);
    return { lam, n, colony: 1e6 + ((eid[0] & 1023) << 20 | (eid[1] & 1023) << 10 | eid[2] & 1023) };
  }
  fields(p) {
    const nr = this.nearest(p), col = this.fColony(p);
    return { interface: this.fInterface(p, nr), ferrite: this.fFerrite(p, nr), dendrite: this.fDendrite(p, nr), plate: this.fPlate(p, nr), lamella: this.fLamella(p, nr), fine: this.fFine(p, col), island: this.fIsland(p, col) };
  }
  /** Lazy field access for continuous sampling: only the fields a plan actually needs are computed. */
  probe(p, exact = false) {
    let nr, col, lc, fc;
    const cache = {};
    const near = () => nr ??= this.nearest(p);
    const limit = exact ? Infinity : this.dendriteLimit;
    const f = (name) => cache[name] ??= name === "interface" ? this.fInterface(p, near()) : name === "ferrite" ? this.fFerrite(p, near()) : name === "dendrite" ? this.fDendrite(p, near(), Number.isFinite(limit) ? limit + 1e-9 : Infinity) : name === "plate" ? this.fPlate(p, near()) : name === "lamella" ? bandScore((lc ??= this.lamellaCoord(p, near().id)).lam) : name === "island" ? this.fIsland(p, col ??= this.fColony(p)) : bandScore((fc ??= this.fineCoord(p, col ??= this.fColony(p))).lam);
    return Object.assign(f, { coord: (kind) => kind === "lamella" ? lc ??= this.lamellaCoord(p, near().id) : fc ??= this.fineCoord(p, col ??= this.fColony(p)) });
  }
  /** Exact, lazily evaluated fields at one point. Safe to cache across temperature changes. */
  lazyFields(p) {
    return new LazyFieldView(this.probe(p, true));
  }
  /** Prior-austenite grain boundaries are etched lines only where the constituent has them:
   * never inside ledeburite (continuous cementite matrix), primary cementite plates or liquid. */
  drawsGrainBoundary(point) {
    const part = this.samplePart(point);
    if (this.arrangement === "dendritic" || this.arrangement === "primary-plates") return false;
    if (isFerriteBand(part)) return false;
    return !["eutectic", "plate", "last"].includes(part.placement);
  }
  /**
   * Section appearance of a lamellar constituent at a point: cementite area fraction inside a
   * square pixel of side `pixel` (volume units) spanned by in-plane unit vectors u, v. Returns
   * null where the point is not inside a resolvable lamellar constituent (pearlite, or the
   * pearlite islands of transformed ledeburite). Identity (sample) is unchanged by this.
   * `at` lets a caller that already classified the point (part index, cached fields) skip
   * the second classification.
   */
  lamellarAppearance(point, u, v, pixel, at) {
    if (!(pixel > 0)) throw new RangeError("Invalid pixel size");
    const k = at ? at.part : this.locate(point).part, plan = this.plans[k];
    if (!plan) return null;
    if (plan.phases.length < 2 || plan.phases[0] !== "C") return null;
    const c = plan.phaseCuts[0].value;
    let coord;
    if (plan.part.placement === "eutectic") {
      if (!plan.islandCut || !(c > 0)) return null;
      const n = this.size, [x, y, z] = point.map((t) => Math.min(n - 1, Math.floor(t * n))), index = x + n * (y + n * z);
      if (!before(at?.fields ? at.fields.island : this.probe(point)("island"), index, plan.islandCut)) return null;
      coord = (at?.fields instanceof LazyFieldView ? at.fields.probe : this.probe(point, true)).coord("fine");
    } else coord = (at?.fields instanceof LazyFieldView ? at.fields.probe : this.probe(point, true)).coord("lamella");
    const share = Math.min(1, Math.max(0, c)), freq = this.lamellaFrequency * (plan.part.placement === "eutectic" ? MICRO_SCALE.ledeburitePearliteFactor : 1);
    const nu = coord.n[0] * u[0] + coord.n[1] * u[1] + coord.n[2] * u[2], nv = coord.n[0] * v[0] + coord.n[1] * v[1] + coord.n[2] * v[2];
    const inPlane = Math.max(1e-6, Math.hypot(nu, nv)), span = freq * pixel * (Math.abs(nu) + Math.abs(nv));
    const lam = coord.lam;
    return { coverage: lamellaCoverage(lam - span / 2, lam + span / 2, share), thetaShare: share, periodsPerPixel: freq * pixel * inPlane, apparentRatio: 1 / inPlane, colony: coord.colony, angle: Math.atan2(nv, nu) };
  }
  fieldFor(arrangement, part) {
    const placement = part.placement;
    if (placement === "plate") return "plate";
    if (arrangement === "grain-boundary" && isFerriteBand(part)) return "ferrite";
    return arrangement === "dendritic" || arrangement === "primary-plates" ? "dendrite" : "interface";
  }
  orders = /* @__PURE__ */ new Map();
  /** Cell indices sorted by (value, index); cached per volume. */
  order(name, values) {
    let o = this.orders.get(name);
    if (!o) {
      o = Uint32Array.from({ length: values.length }, (_, i) => i);
      o.sort((a, b) => values[a] - values[b] || a - b);
      this.orders.set(name, o);
    }
    return o;
  }
  apply(result, breakdown) {
    if (result.status !== "resolved") throw new Error("Cannot draw unresolved equilibrium");
    const parts = breakdown.parts;
    if (!parts.length || parts.length > 32) throw new Error("Invalid constituent list");
    const positive = result.phases.filter((p) => p.fraction > 0);
    for (const p of positive) {
      const s = parts.reduce((a, x) => a + (x.phases[p.code] ?? 0), 0);
      if (Math.abs(s - p.fraction) > 1e-8) throw new Error("Constituents do not reproduce the phase budget");
    }
    for (const x of parts) for (const code of Object.keys(x.phases)) if (!positive.some((p) => p.code === code)) throw new Error("Constituent uses a phase absent from the equilibrium result");
    if (Math.abs(parts.reduce((s, p) => s + p.fraction, 0) - 1) > 1e-8 || parts.some((p) => !(p.fraction > 0))) throw new Error("Invalid constituent budget");
    const n = this.size, total = n ** 3, phaseIndex = /* @__PURE__ */ new Map();
    this.phases.splice(0, this.phases.length);
    for (const code of ["C", "L", "A", "D", "G"]) if (positive.some((p) => p.code === code)) {
      phaseIndex.set(code, this.phases.length);
      this.phases.push(code);
    }
    const counts = apportion(parts.map((p) => p.fraction), total), phaseCells = /* @__PURE__ */ new Map();
    this.plans = [];
    this.parts = parts;
    this.arrangement = breakdown.arrangement;
    const NONE = 255;
    this.partLabels.fill(NONE);
    const members = parts.map(() => []);
    this.ensure(parts.flatMap((p) => {
      const multi = Object.keys(p.phases).length > 1;
      return [this.fieldFor(breakdown.arrangement, p), ...!multi ? [] : p.placement === "eutectic" ? ["island", "fine"] : ["lamella"]];
    }));
    parts.forEach((part, k) => {
      const field = this.fieldFor(breakdown.arrangement, part), values = this.grid(field), order = this.order(field, values);
      const last = k === parts.length - 1, want = last ? Infinity : counts[k], chosen = members[k];
      for (let j = 0; j < order.length && chosen.length < want; j++) {
        const i = order[j];
        if (this.partLabels[i] === NONE) {
          this.partLabels[i] = k;
          chosen.push(i);
        }
      }
      const cut = last ? END : chosen.length ? { value: values[chosen.at(-1)], index: chosen.at(-1) } : { value: -Infinity, index: -1 };
      const codes = Object.keys(part.phases).sort((a, b) => (a === "C" ? 0 : 1) - (b === "C" ? 0 : 1) || this.phases.indexOf(a) - this.phases.indexOf(b));
      this.plans.push({ part, cut, field, phases: codes, phaseCuts: [] });
    });
    this.plans.forEach((plan, k) => {
      const chosen = members[k], codes = plan.phases;
      if (codes.length === 1) {
        for (const i of chosen) this.labels[i] = phaseIndex.get(codes[0]);
        phaseCells.set(codes[0], (phaseCells.get(codes[0]) ?? 0) + chosen.length);
        plan.phaseCuts.push(END);
        return;
      }
      let ordered;
      if (plan.part.placement === "eutectic") {
        const islands = Math.round((plan.part.islandShare ?? 0) * chosen.length), inIsland = new Uint8Array(total);
        const islandGrid = this.grid("island"), io = this.order("island", islandGrid);
        let taken = 0, lastIsland = -1;
        for (let j = 0; j < io.length && taken < islands; j++) {
          const i = io[j];
          if (this.partLabels[i] === k) {
            inIsland[i] = 1;
            taken++;
            lastIsland = i;
          }
        }
        plan.islandCut = lastIsland < 0 ? { value: -Infinity, index: -1 } : { value: islandGrid[lastIsland], index: lastIsland };
        const matrix = chosen.filter((i) => !inIsland[i]).sort((a, b) => islandGrid[b] - islandGrid[a] || a - b);
        const fo = this.order("fine", this.grid("fine")), inside = [];
        for (const i of fo) if (inIsland[i] && this.partLabels[i] === k) inside.push(i);
        ordered = matrix.concat(inside);
      } else {
        const lo = this.order("lamella", this.grid("lamella"));
        ordered = [];
        for (const i of lo) if (this.partLabels[i] === k) ordered.push(i);
      }
      const inner = apportion(codes.map((c) => plan.part.phases[c]), ordered.length);
      let offset = 0;
      codes.forEach((code, j) => {
        const end = offset + inner[j];
        for (; offset < end; offset++) this.labels[ordered[offset]] = phaseIndex.get(code);
        phaseCells.set(code, (phaseCells.get(code) ?? 0) + inner[j]);
        const lastCell = ordered[offset - 1];
        plan.phaseCuts.push(j === codes.length - 1 ? END : inner[j] ? { value: this.internalScore(plan, plan.part.placement === "eutectic" ? this.grid("island")[lastCell] : 0, plan.part.placement === "eutectic" ? 0 : this.grid("lamella")[lastCell], plan.part.placement === "eutectic" ? this.grid("fine")[lastCell] : 0, lastCell), index: lastCell } : { value: -Infinity, index: -1 });
      });
    });
    const cuts = this.plans.filter((x) => x.field === "dendrite" && Number.isFinite(x.cut.value)).map((x) => x.cut.value);
    this.dendriteLimit = cuts.length ? Math.max(...cuts) : Infinity;
    this.budgets = this.phases.map((code) => {
      const p = positive.find((x) => x.code === code), cells = phaseCells.get(code) ?? 0;
      return { code, massFraction: p.fraction, drawingFraction: cells / total, cells, belowResolution: cells === 0 };
    });
    this.partBudgets = parts.map((p, k) => {
      const cells = members[k].length;
      return { id: p.id, label: p.label, massFraction: p.fraction, drawingFraction: cells / total, cells, belowResolution: cells === 0 };
    });
  }
  internalScore(plan, island, lamella, fine, index) {
    if (plan.part.placement === "eutectic") {
      const inIsland = plan.islandCut ? before(island, index, plan.islandCut) : false;
      return inIsland ? fine : -1 - island;
    }
    return lamella;
  }
  locate(point) {
    if (!this.plans.length || point.length !== 3 || point.some((x2) => !finite(x2) || x2 < 0 || x2 > 1)) throw new RangeError("Invalid occupancy sample");
    const n = this.size, [x, y, z] = point.map((v) => Math.min(n - 1, Math.floor(v * n))), index = x + n * (y + n * z);
    if (this.plans.length === 1 && this.plans[0].phases.length === 1) return { part: 0, phase: this.plans[0].phases[0] };
    const f = this.probe(point);
    let k = this.plans.findIndex((plan2) => before(f(plan2.field), index, plan2.cut));
    if (k < 0) k = this.plans.length - 1;
    const plan = this.plans[k];
    if (plan.phases.length === 1) return { part: k, phase: plan.phases[0] };
    const s = plan.part.placement === "eutectic" ? this.internalScore(plan, f("island"), 0, f("fine"), index) : this.internalScore(plan, 0, f("lamella"), 0, index);
    const j = plan.phaseCuts.findIndex((c) => before(s, index, c));
    return { part: k, phase: plan.phases[j < 0 ? plan.phases.length - 1 : j] };
  }
  sample(point) {
    return this.locate(point).phase;
  }
  samplePart(point) {
    return this.plans[this.locate(point).part].part;
  }
}
export {
  CONSTITUENT_COLORS,
  ConstituentOccupancy,
  MICRO_SCALE,
  isFerriteBand,
  lamellaCoverage
};
