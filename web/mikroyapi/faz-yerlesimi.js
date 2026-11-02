/* SPDX-License-Identifier: MIT — port of OG portfolio geometry. See docs/STAGE3_DELIVERY.md. */
const PHASE_COLORS = { A: "#d8ba78", G: "#547c9c", D: "#79a69c", C: "#70536c", L: "#c76c43" };
class PhaseOccupancy {
  /** Constituent morphology (pearlite, ledeburite …) lives in ConstituentOccupancy. */
  constructor(volume, size = 32) {
    this.volume = volume;
    if (!Number.isInteger(size) || size < 16 || size > 64 || size ** 3 * volume.seeds.length > 11e7) throw new RangeError("Occupancy work budget exceeded");
    this.size = size;
    const n = this.size, total = n ** 3, rank = new Float64Array(total);
    this.ranks = rank;
    this.labels = new Uint8Array(total);
    for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const index = x + n * (y + n * z);
      rank[index] = this.score([(x + 0.5) / n, (y + 0.5) / n, (z + 0.5) / n]);
    }
    this.order = Uint32Array.from({ length: total }, (_, i) => i);
    this.order.sort((a, b) => rank[a] - rank[b] || a - b);
  }
  volume;
  size;
  ranks;
  cuts = [];
  order;
  labels;
  phases = [];
  budgets = [];
  apply(result) {
    if (result.status !== "resolved") throw new Error("Cannot draw unresolved equilibrium");
    if (new Set(result.phases.map((p) => p.code)).size !== result.phases.length || result.phases.some((p) => !Number.isFinite(p.fraction) || p.fraction < 0 || p.fraction > 1 || !(p.code in PHASE_COLORS))) throw new Error("Invalid phase entries");
    const order = ["C", "L", "A", "D", "G"];
    const positive = result.phases.filter((p) => p.fraction > 0).sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code));
    if (!positive.length || positive.some((p) => !Number.isFinite(p.fraction) || p.fraction < 0) || Math.abs(positive.reduce((s, p) => s + p.fraction, 0) - 1) > 1e-10) throw new Error("Invalid phase budget");
    const total = this.labels.length, counts = positive.map((p) => Math.floor(p.fraction * total));
    const remainders = positive.map((p, i) => ({ i, r: p.fraction * total - counts[i] })).sort((a, b) => b.r - a.r || a.i - b.i);
    for (let left = total - counts.reduce((a, b) => a + b, 0), i = 0; i < left; i++) counts[remainders[i].i]++;
    this.phases.splice(0, this.phases.length, ...positive.map((p) => p.code));
    let offset = 0;
    this.cuts = [];
    this.budgets = positive.map((p, i) => {
      for (let end = offset + counts[i]; offset < end; offset++) this.labels[this.order[offset]] = i;
      if (counts[i]) {
        const index = this.order[offset - 1];
        this.cuts.push({ score: this.ranks[index], lastIndex: index, phase: i });
      }
      return { code: p.code, massFraction: p.fraction, drawingFraction: counts[i] / total, cells: counts[i], belowResolution: counts[i] === 0 };
    });
  }
  score(p) {
    let a = Infinity, b = Infinity;
    for (const s of this.volume.seeds) {
      const dx = s.position[0] - p[0], dy = s.position[1] - p[1], dz = s.position[2] - p[2];
      const d = dx * dx + dy * dy + dz * dz - s.weight;
      if (d < a) {
        b = a;
        a = d;
      } else if (d < b) b = d;
    }
    return Number.isFinite(b) ? b - a : 0;
  }
  sample(point) {
    if (!this.phases.length || point.some((x2) => !Number.isFinite(x2) || x2 < 0 || x2 > 1)) throw new RangeError("Invalid occupancy sample");
    if (this.cuts.length === 1) return this.phases[this.cuts[0].phase];
    const [x, y, z] = point.map((x2) => Math.min(this.size - 1, Math.floor(x2 * this.size)));
    const index = x + this.size * (y + this.size * z), score = this.score(point);
    const cut = this.cuts.find((c) => score < c.score || score === c.score && index <= c.lastIndex) ?? this.cuts.at(-1);
    return this.phases[cut.phase];
  }
}
export {
  PHASE_COLORS,
  PhaseOccupancy
};
