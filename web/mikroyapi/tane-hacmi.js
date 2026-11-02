/* SPDX-License-Identifier: MIT — port of OG portfolio geometry. See docs/STAGE3_DELIVERY.md. */
const GEOMETRY_REVISION = "grain-volume-r01";
const GEOMETRY_LIMITS = Object.freeze({
  seeds: 512,
  samples: 2097152,
  scoreEvaluations: 67108864,
  candidateAttempts: 1e6
});
const GEOMETRY_SCOPE = Object.freeze({
  status: "experimental-geometry",
  scientificAcceptance: false,
  coordinateBasis: "normalized-unit-cube",
  budgetBasis: "geometric-occupancy",
  boundaryMode: "clipped-box",
  label: "\u015Eematik hacim, \xF6l\xE7eksiz. Bilimsel kabul verilmedi."
});
function positiveInteger(value, name, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new RangeError(`${name} must be an integer in [1, ${maximum}].`);
  }
}
function assertUnit(value, name) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name} must be finite and inside [0, 1]; no clipping is performed.`);
  }
}
function assertAxis(axis) {
  if (axis !== "x" && axis !== "y" && axis !== "z") throw new RangeError("Unknown slice axis.");
}
function shapeCount(shape) {
  if (shape.length !== 3) throw new RangeError("Grid requires exactly three dimensions.");
  for (let i = 0; i < 3; i++) positiveInteger(shape[i], `shape[${i}]`, GEOMETRY_LIMITS.samples);
  const total = shape[0] * shape[1] * shape[2];
  if (!Number.isSafeInteger(total) || total > GEOMETRY_LIMITS.samples) {
    throw new RangeError("Grid sample budget exceeded.");
  }
  return total;
}
function checkWork(samples, seeds) {
  if (!Number.isSafeInteger(samples) || samples > GEOMETRY_LIMITS.samples || samples * seeds > GEOMETRY_LIMITS.scoreEvaluations) {
    throw new RangeError("Geometry sampling budget exceeded; use a coarser grid.");
  }
}
function slicePoint(axis, coordinate, u, v) {
  return axis === "x" ? [coordinate, u, v] : axis === "y" ? [u, coordinate, v] : [u, v, coordinate];
}
class GrainVolume {
  seeds;
  constructor(seeds) {
    positiveInteger(seeds.length, "seed count", GEOMETRY_LIMITS.seeds);
    const ids = /* @__PURE__ */ new Set();
    const copied = Array.from(seeds, (seed) => {
      if (!seed || typeof seed !== "object") throw new RangeError("Missing grain seed.");
      positiveInteger(seed.id, "seed id", 4294967295);
      if (ids.has(seed.id)) throw new RangeError("Duplicate grain id.");
      ids.add(seed.id);
      if (seed.position.length !== 3) throw new RangeError("Seed requires three coordinates.");
      for (let i = 0; i < 3; i++) assertUnit(seed.position[i], `position[${i}]`);
      if (!Number.isFinite(seed.weight)) throw new RangeError("Power weight must be finite.");
      if (Math.abs(seed.weight) > 16) throw new RangeError("Normalized power weight exceeds [-16, 16].");
      return Object.freeze({ id: seed.id, position: Object.freeze([...seed.position]), weight: seed.weight });
    });
    this.seeds = Object.freeze(copied.sort((a, b) => a.id - b.id));
    Object.freeze(this);
  }
  sample(point) {
    if (point.length !== 3) throw new RangeError("Point requires three coordinates.");
    for (let i = 0; i < 3; i++) assertUnit(point[i], `point[${i}]`);
    return this.owner(point[0], point[1], point[2]);
  }
  owner(x, y, z) {
    let best = Infinity;
    let id = 0;
    for (const seed of this.seeds) {
      const dx = x - seed.position[0], dy = y - seed.position[1], dz = z - seed.position[2];
      const score = dx * dx + dy * dy + dz * dz - seed.weight;
      if (score < best) {
        best = score;
        id = seed.id;
      }
    }
    return id;
  }
  rasterize(shape) {
    const count = shapeCount(shape);
    checkWork(count, this.seeds.length);
    const [nx, ny, nz] = shape;
    const labels = new Uint32Array(count);
    for (let z = 0, offset = 0; z < nz; z++) {
      for (let y = 0; y < ny; y++) {
        for (let x = 0; x < nx; x++, offset++) {
          labels[offset] = this.owner((x + 0.5) / nx, (y + 0.5) / ny, (z + 0.5) / nz);
        }
      }
    }
    return {
      shape: Object.freeze([...shape]),
      labels,
      seedIds: Object.freeze(this.seeds.map((seed) => seed.id)),
      revision: GEOMETRY_REVISION,
      scope: GEOMETRY_SCOPE
    };
  }
  slice(axis, coordinate, width, height) {
    assertAxis(axis);
    assertUnit(coordinate, "slice coordinate");
    positiveInteger(width, "slice width", GEOMETRY_LIMITS.samples);
    positiveInteger(height, "slice height", GEOMETRY_LIMITS.samples);
    checkWork(width * height, this.seeds.length);
    const labels = new Uint32Array(width * height);
    for (let v = 0; v < height; v++) {
      for (let u = 0; u < width; u++) {
        const point = slicePoint(axis, coordinate, (u + 0.5) / width, (v + 0.5) / height);
        labels[u + width * v] = this.owner(...point);
      }
    }
    return { axis, coordinate, width, height, labels };
  }
}
function validateGrid(grid) {
  if (grid.revision !== GEOMETRY_REVISION) throw new RangeError("Unsupported geometry revision.");
  if (!grid.scope || Object.entries(GEOMETRY_SCOPE).some(([key, value]) => grid.scope[key] !== value)) {
    throw new RangeError("Grid scope must remain experimental, dimensionless geometry.");
  }
  const count = shapeCount(grid.shape);
  if (!(grid.labels instanceof Uint32Array) || grid.labels.length !== count) {
    throw new RangeError("Grid label count/type mismatch.");
  }
  positiveInteger(grid.seedIds.length, "grid seed count", GEOMETRY_LIMITS.seeds);
  const ids = /* @__PURE__ */ new Set();
  for (const id of grid.seedIds) {
    positiveInteger(id, "grid seed id", 4294967295);
    if (ids.has(id)) throw new RangeError("Duplicate grid seed id.");
    ids.add(id);
  }
  for (const id of grid.labels) if (!ids.has(id)) throw new RangeError("Unowned or unknown grid label.");
}
function extractGridSlice(grid, axis, index) {
  validateGrid(grid);
  assertAxis(axis);
  const [nx, ny, nz] = grid.shape;
  const depth = axis === "x" ? nx : axis === "y" ? ny : nz;
  if (!Number.isSafeInteger(index) || index < 0 || index >= depth) throw new RangeError("Slice index out of range.");
  const width = axis === "x" ? ny : nx;
  const height = axis === "z" ? ny : nz;
  const labels = new Uint32Array(width * height);
  for (let v = 0; v < height; v++) {
    for (let u = 0; u < width; u++) {
      const [x, y, z] = axis === "x" ? [index, u, v] : axis === "y" ? [u, index, v] : [u, v, index];
      labels[u + width * v] = grid.labels[x + nx * (y + ny * z)];
    }
  }
  return { axis, coordinate: (index + 0.5) / depth, width, height, labels };
}
function analyzeGrid(grid) {
  validateGrid(grid);
  const [nx, ny, nz] = grid.shape, plane = nx * ny;
  const entries = new Map(grid.seedIds.map((id) => [id, { id, voxelCount: 0, geometricFraction: 0, components6: 0 }]));
  for (const id of grid.labels) entries.get(id).voxelCount++;
  const visited = new Uint8Array(grid.labels.length);
  const queue = new Uint32Array(grid.labels.length);
  for (let start = 0; start < grid.labels.length; start++) {
    if (visited[start]) continue;
    const id = grid.labels[start];
    entries.get(id).components6++;
    let head = 0, tail = 1;
    queue[0] = start;
    visited[start] = 1;
    const visit = (i) => {
      if (!visited[i] && grid.labels[i] === id) {
        visited[i] = 1;
        queue[tail++] = i;
      }
    };
    while (head < tail) {
      const i = queue[head++], x = i % nx, y = Math.floor(i / nx) % ny, z = Math.floor(i / plane);
      if (x > 0) visit(i - 1);
      if (x + 1 < nx) visit(i + 1);
      if (y > 0) visit(i - nx);
      if (y + 1 < ny) visit(i + nx);
      if (z > 0) visit(i - plane);
      if (z + 1 < nz) visit(i + plane);
    }
  }
  const grains = [...entries.values()].sort((a, b) => a.id - b.id);
  for (const grain of grains) grain.geometricFraction = grain.voxelCount / grid.labels.length;
  return {
    basis: "sampled-voxel-geometry",
    grains,
    absentFromSamples: grains.filter((g) => g.voxelCount === 0).map((g) => g.id),
    disconnectedInSamples: grains.filter((g) => g.components6 > 1).map((g) => g.id)
  };
}
function generateGrainSeeds(input) {
  if (!Number.isInteger(input.seed) || input.seed < 0 || input.seed > 4294967295) throw new RangeError("Seed must be uint32.");
  positiveInteger(input.count, "seed count", GEOMETRY_LIMITS.seeds);
  positiveInteger(input.maxAttempts, "maxAttempts", GEOMETRY_LIMITS.candidateAttempts);
  if (input.count * input.maxAttempts > GEOMETRY_LIMITS.scoreEvaluations) {
    throw new RangeError("Seed generation comparison budget exceeded.");
  }
  if (!Number.isFinite(input.minimumDistance) || input.minimumDistance < 0 || input.minimumDistance > Math.sqrt(3)) {
    throw new RangeError("minimumDistance must be in [0, sqrt(3)] in normalized coordinates.");
  }
  const options = Object.freeze({ ...input });
  let state = input.seed >>> 0;
  const random = () => {
    state = state + 1831565813 >>> 0;
    let t = Math.imul(state ^ state >>> 15, state | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const seeds = [];
  const separation2 = input.minimumDistance ** 2;
  for (let attempts = 1; attempts <= input.maxAttempts; attempts++) {
    const position = [random(), random(), random()];
    if (seeds.some((s) => s.position.reduce((sum, v, i) => sum + (v - position[i]) ** 2, 0) < separation2)) continue;
    seeds.push(Object.freeze({ id: seeds.length + 1, position: Object.freeze(position), weight: 0 }));
    if (seeds.length === input.count) return {
      status: "complete",
      seeds: Object.freeze(seeds),
      attempts,
      algorithm: "mulberry32-rejection-r01",
      options
    };
  }
  return {
    status: "exhausted",
    generatedCount: seeds.length,
    attempts: input.maxAttempts,
    algorithm: "mulberry32-rejection-r01",
    options
  };
}
export {
  GEOMETRY_LIMITS,
  GEOMETRY_REVISION,
  GEOMETRY_SCOPE,
  GrainVolume,
  analyzeGrid,
  extractGridSlice,
  generateGrainSeeds,
  validateGrid
};
