/* SPDX-License-Identifier: MIT — port of OG portfolio geometry. See docs/STAGE3_DELIVERY.md. */
import { exampleCarbon } from "./kristal-yapilar.js";
const ATOMIC_MASS = { Fe: 55.847, C: 12.011 };
function carbonWeight(iron, carbon) {
  return carbon === 0 ? 0 : 100 * carbon * ATOMIC_MASS.C / (iron * ATOMIC_MASS.Fe + carbon * ATOMIC_MASS.C);
}
function budget(crystal, wt, n) {
  const iron = crystal.metalAtomsPerCell * n ** 3, expected = iron * (wt / (100 - wt)) * (ATOMIC_MASS.Fe / ATOMIC_MASS.C), capacity = crystal.interstices.length * n ** 3;
  const choices = [Math.floor(expected), Math.ceil(expected)].filter((c) => c >= 0 && c <= capacity);
  if (!choices.length) throw new RangeError("Carbon exceeds interstitial capacity");
  const count = choices.reduce((best, c) => Math.abs(carbonWeight(iron, c) - wt) < Math.abs(carbonWeight(iron, best) - wt) ? c : best, choices[0]);
  return { iron, expected, count, represented: carbonWeight(iron, count) };
}
function carbonPopulation(crystal, wt, repetitions = "auto") {
  if (!["A", "D", "G"].includes(crystal.code) || !Number.isFinite(wt) || wt < 0 || wt >= 100) throw new RangeError("A valid solid-solution phase composition is required");
  let n = repetitions === "auto" ? 8 : repetitions;
  if (!Number.isInteger(n) || n < 1 || n > 8) throw new RangeError("Cell repetition outside drawing budget");
  if (repetitions === "auto") for (let candidate = 1; candidate <= 8; candidate++) {
    const b2 = budget(crystal, wt, candidate);
    if (wt === 0 || b2.count > 0 && Math.abs(b2.represented - wt) <= Math.min(0.02, wt * 0.05)) {
      n = candidate;
      break;
    }
  }
  const b = budget(crystal, wt, n), sites = [];
  for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) for (const p of crystal.interstices) sites.push([p[0] + x, p[1] + y, p[2] + z]);
  const positions = [], distance = new Float64Array(sites.length);
  distance.fill(Infinity);
  const used = new Uint8Array(sites.length);
  const periodicDistance = (a, b2) => a.reduce((s, v, i) => {
    const d = Math.abs(v - b2[i]), p = Math.min(d, n - d) * crystal.cell[i];
    return s + p * p;
  }, 0);
  const middle = [n / 2, n / 2, n / 2];
  let selected = 0;
  for (let i = 1; i < sites.length; i++) if (sites[i].reduce((s, v, j) => s + (v - middle[j]) ** 2, 0) < sites[selected].reduce((s, v, j) => s + (v - middle[j]) ** 2, 0)) selected = i;
  for (let k = 0; k < b.count; k++) {
    used[selected] = 1;
    positions.push(sites[selected]);
    let next = -1;
    for (let i = 0; i < sites.length; i++) {
      if (used[i]) continue;
      distance[i] = Math.min(distance[i], periodicDistance(sites[i], sites[selected]));
      if (next < 0 || distance[i] > distance[next]) next = i;
    }
    selected = next;
  }
  return { repetitions: n, ironCount: b.iron, carbonCount: b.count, targetWtPercent: wt, representedWtPercent: b.represented, errorWtPercent: b.represented - wt, expectedCarbonCount: b.expected, positions, sites, belowResolution: wt > 0 && b.count === 0 };
}
function idealInterstitialRadius(crystal) {
  if (!["A", "D", "G"].includes(crystal.code)) return null;
  const iron = crystal.code === "G" ? Math.SQRT2 / 4 : Math.sqrt(3) / 4;
  return { iron, void: 0.5 - iron };
}
function referenceCarbon(crystal, n) {
  const p = exampleCarbon(crystal, n);
  return p ? [p] : [];
}
function carbonImages(positions, n) {
  const images = [];
  for (const p of positions) {
    if (p.some((v) => !Number.isFinite(v) || v < 0 || v >= n)) throw new RangeError("Expected half-open periodic carbon sites");
    for (const x of p[0] === 0 ? [0, n] : [p[0]]) for (const y of p[1] === 0 ? [0, n] : [p[1]]) for (const z of p[2] === 0 ? [0, n] : [p[2]]) images.push([x, y, z]);
  }
  return images;
}
export {
  ATOMIC_MASS,
  carbonImages,
  carbonPopulation,
  carbonWeight,
  idealInterstitialRadius,
  referenceCarbon
};
