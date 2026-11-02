/**
 * Experimental, dimensionless geometry only. No thermodynamic phases, kinetics,
 * physical grain sizes or P0 acceptance are inferred by this module.
 */
export type Vec3 = readonly [number, number, number];
export type GridShape = readonly [number, number, number]; // nx, ny, nz
export type Axis = 'x' | 'y' | 'z';

export interface GrainSeed {
  readonly id: number;
  readonly position: Vec3;
  /** Power distance = squared Euclidean distance minus weight. */
  readonly weight: number;
}

export const GEOMETRY_REVISION = 'grain-volume-r01';
export const GEOMETRY_LIMITS = Object.freeze({
  seeds: 512,
  samples: 2_097_152,
  scoreEvaluations: 67_108_864,
  candidateAttempts: 1_000_000,
});

export const GEOMETRY_SCOPE = Object.freeze({
  status: 'experimental-geometry',
  scientificAcceptance: false,
  coordinateBasis: 'normalized-unit-cube',
  budgetBasis: 'geometric-occupancy',
  boundaryMode: 'clipped-box',
  label: 'Şematik hacim, ölçeksiz. Bilimsel kabul verilmedi.',
} as const);

export interface LabelGrid {
  readonly shape: GridShape;
  /** x is fastest: x + nx * (y + ny * z). Samples are voxel centers. */
  readonly labels: Uint32Array;
  readonly seedIds: readonly number[];
  readonly revision: typeof GEOMETRY_REVISION;
  readonly scope: typeof GEOMETRY_SCOPE;
}

export interface LabelSlice {
  readonly axis: Axis;
  readonly coordinate: number;
  /** x plane: u=y,v=z; y plane: u=x,v=z; z plane: u=x,v=y. */
  readonly width: number;
  readonly height: number;
  readonly labels: Uint32Array;
}

function positiveInteger(value: number, name: string, maximum = Number.MAX_SAFE_INTEGER): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new RangeError(`${name} must be an integer in [1, ${maximum}].`);
  }
}

function assertUnit(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name} must be finite and inside [0, 1]; no clipping is performed.`);
  }
}

function assertAxis(axis: Axis): void {
  if (axis !== 'x' && axis !== 'y' && axis !== 'z') throw new RangeError('Unknown slice axis.');
}

function shapeCount(shape: GridShape): number {
  if (shape.length !== 3) throw new RangeError('Grid requires exactly three dimensions.');
  for (let i = 0; i < 3; i++) positiveInteger(shape[i], `shape[${i}]`, GEOMETRY_LIMITS.samples);
  const total = shape[0] * shape[1] * shape[2];
  if (!Number.isSafeInteger(total) || total > GEOMETRY_LIMITS.samples) {
    throw new RangeError('Grid sample budget exceeded.');
  }
  return total;
}

function checkWork(samples: number, seeds: number): void {
  if (!Number.isSafeInteger(samples) || samples > GEOMETRY_LIMITS.samples ||
      samples * seeds > GEOMETRY_LIMITS.scoreEvaluations) {
    throw new RangeError('Geometry sampling budget exceeded; use a coarser grid.');
  }
}

function slicePoint(axis: Axis, coordinate: number, u: number, v: number): Vec3 {
  return axis === 'x' ? [coordinate, u, v] : axis === 'y' ? [u, coordinate, v] : [u, v, coordinate];
}

/** Immutable seed geometry; sampling does not depend on rendering/frame history. */
export class GrainVolume {
  readonly seeds: readonly GrainSeed[];

  constructor(seeds: readonly GrainSeed[]) {
    positiveInteger(seeds.length, 'seed count', GEOMETRY_LIMITS.seeds);
    const ids = new Set<number>();
    const copied = Array.from(seeds, seed => {
      if (!seed || typeof seed !== 'object') throw new RangeError('Missing grain seed.');
      positiveInteger(seed.id, 'seed id', 0xffffffff);
      if (ids.has(seed.id)) throw new RangeError('Duplicate grain id.');
      ids.add(seed.id);
      if (seed.position.length !== 3) throw new RangeError('Seed requires three coordinates.');
      for (let i = 0; i < 3; i++) assertUnit(seed.position[i], `position[${i}]`);
      if (!Number.isFinite(seed.weight)) throw new RangeError('Power weight must be finite.');
      // Coordinates are normalized. This is a numerical conditioning guard, not
      // a material parameter or a physical grain-size constraint.
      if (Math.abs(seed.weight) > 16) throw new RangeError('Normalized power weight exceeds [-16, 16].');
      return Object.freeze({ id: seed.id, position: Object.freeze([...seed.position]) as Vec3, weight: seed.weight });
    });
    this.seeds = Object.freeze(copied.sort((a, b) => a.id - b.id));
    Object.freeze(this);
  }

  sample(point: Vec3): number {
    if (point.length !== 3) throw new RangeError('Point requires three coordinates.');
    for (let i = 0; i < 3; i++) assertUnit(point[i], `point[${i}]`);
    return this.owner(point[0], point[1], point[2]);
  }

  private owner(x: number, y: number, z: number): number {
    let best = Infinity;
    let id = 0;
    for (const seed of this.seeds) {
      const dx = x - seed.position[0], dy = y - seed.position[1], dz = z - seed.position[2];
      const score = dx * dx + dy * dy + dz * dz - seed.weight;
      // Sorted IDs resolve exact ties. No geometric epsilon erases small cells.
      if (score < best) { best = score; id = seed.id; }
    }
    return id;
  }

  rasterize(shape: GridShape): LabelGrid {
    const count = shapeCount(shape);
    checkWork(count, this.seeds.length);
    const [nx, ny, nz] = shape;
    const labels = new Uint32Array(count);
    for (let z = 0, offset = 0; z < nz; z++) {
      for (let y = 0; y < ny; y++) {
        for (let x = 0; x < nx; x++, offset++) {
          labels[offset] = this.owner((x + .5) / nx, (y + .5) / ny, (z + .5) / nz);
        }
      }
    }
    return {
      shape: Object.freeze([...shape]) as GridShape,
      labels,
      seedIds: Object.freeze(this.seeds.map(seed => seed.id)),
      revision: GEOMETRY_REVISION,
      scope: GEOMETRY_SCOPE,
    };
  }

  slice(axis: Axis, coordinate: number, width: number, height: number): LabelSlice {
    assertAxis(axis);
    assertUnit(coordinate, 'slice coordinate');
    positiveInteger(width, 'slice width', GEOMETRY_LIMITS.samples);
    positiveInteger(height, 'slice height', GEOMETRY_LIMITS.samples);
    checkWork(width * height, this.seeds.length);
    const labels = new Uint32Array(width * height);
    for (let v = 0; v < height; v++) {
      for (let u = 0; u < width; u++) {
        const point = slicePoint(axis, coordinate, (u + .5) / width, (v + .5) / height);
        labels[u + width * v] = this.owner(...point);
      }
    }
    return { axis, coordinate, width, height, labels };
  }
}

/** Validates serialized/mutable raster labels before diagnostics or slicing. */
export function validateGrid(grid: LabelGrid): void {
  if (grid.revision !== GEOMETRY_REVISION) throw new RangeError('Unsupported geometry revision.');
  if (!grid.scope || Object.entries(GEOMETRY_SCOPE).some(([key, value]) =>
    grid.scope[key as keyof typeof GEOMETRY_SCOPE] !== value)) {
    throw new RangeError('Grid scope must remain experimental, dimensionless geometry.');
  }
  const count = shapeCount(grid.shape);
  if (!(grid.labels instanceof Uint32Array) || grid.labels.length !== count) {
    throw new RangeError('Grid label count/type mismatch.');
  }
  positiveInteger(grid.seedIds.length, 'grid seed count', GEOMETRY_LIMITS.seeds);
  const ids = new Set<number>();
  for (const id of grid.seedIds) {
    positiveInteger(id, 'grid seed id', 0xffffffff);
    if (ids.has(id)) throw new RangeError('Duplicate grid seed id.');
    ids.add(id);
  }
  for (const id of grid.labels) if (!ids.has(id)) throw new RangeError('Unowned or unknown grid label.');
}

export function extractGridSlice(grid: LabelGrid, axis: Axis, index: number): LabelSlice {
  validateGrid(grid);
  assertAxis(axis);
  const [nx, ny, nz] = grid.shape;
  const depth = axis === 'x' ? nx : axis === 'y' ? ny : nz;
  if (!Number.isSafeInteger(index) || index < 0 || index >= depth) throw new RangeError('Slice index out of range.');
  const width = axis === 'x' ? ny : nx;
  const height = axis === 'z' ? ny : nz;
  const labels = new Uint32Array(width * height);
  for (let v = 0; v < height; v++) {
    for (let u = 0; u < width; u++) {
      const [x, y, z] = axis === 'x' ? [index, u, v] : axis === 'y' ? [u, index, v] : [u, v, index];
      labels[u + width * v] = grid.labels[x + nx * (y + ny * z)];
    }
  }
  return { axis, coordinate: (index + .5) / depth, width, height, labels };
}

export interface GrainDiagnostics {
  readonly id: number;
  readonly voxelCount: number;
  readonly geometricFraction: number;
  readonly components6: number;
}

/** Raster diagnostics are not continuous-cell topology/physical validation. */
export function analyzeGrid(grid: LabelGrid): {
  basis: 'sampled-voxel-geometry';
  grains: GrainDiagnostics[];
  absentFromSamples: number[];
  disconnectedInSamples: number[];
} {
  validateGrid(grid);
  const [nx, ny, nz] = grid.shape, plane = nx * ny;
  const entries = new Map(grid.seedIds.map(id => [id, { id, voxelCount: 0, geometricFraction: 0, components6: 0 }]));
  for (const id of grid.labels) entries.get(id)!.voxelCount++;
  const visited = new Uint8Array(grid.labels.length);
  const queue = new Uint32Array(grid.labels.length);
  for (let start = 0; start < grid.labels.length; start++) {
    if (visited[start]) continue;
    const id = grid.labels[start];
    entries.get(id)!.components6++;
    let head = 0, tail = 1;
    queue[0] = start;
    visited[start] = 1;
    const visit = (i: number) => {
      if (!visited[i] && grid.labels[i] === id) { visited[i] = 1; queue[tail++] = i; }
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
    basis: 'sampled-voxel-geometry', grains,
    absentFromSamples: grains.filter(g => g.voxelCount === 0).map(g => g.id),
    disconnectedInSamples: grains.filter(g => g.components6 > 1).map(g => g.id),
  };
}

export interface SeedGenerationOptions {
  readonly seed: number;
  readonly count: number;
  readonly minimumDistance: number;
  readonly maxAttempts: number;
}

export type SeedGenerationResult =
  | { readonly status: 'complete'; readonly seeds: readonly GrainSeed[]; readonly attempts: number;
      readonly algorithm: 'mulberry32-rejection-r01'; readonly options: SeedGenerationOptions }
  | { readonly status: 'exhausted'; readonly generatedCount: number; readonly attempts: number;
      readonly algorithm: 'mulberry32-rejection-r01'; readonly options: SeedGenerationOptions };

/** Sequential hard-distance rejection sampling; not a calibrated Poisson model. */
export function generateGrainSeeds(input: SeedGenerationOptions): SeedGenerationResult {
  if (!Number.isInteger(input.seed) || input.seed < 0 || input.seed > 0xffffffff) throw new RangeError('Seed must be uint32.');
  positiveInteger(input.count, 'seed count', GEOMETRY_LIMITS.seeds);
  positiveInteger(input.maxAttempts, 'maxAttempts', GEOMETRY_LIMITS.candidateAttempts);
  if (input.count * input.maxAttempts > GEOMETRY_LIMITS.scoreEvaluations) {
    throw new RangeError('Seed generation comparison budget exceeded.');
  }
  if (!Number.isFinite(input.minimumDistance) || input.minimumDistance < 0 || input.minimumDistance > Math.sqrt(3)) {
    throw new RangeError('minimumDistance must be in [0, sqrt(3)] in normalized coordinates.');
  }
  const options = Object.freeze({ ...input });
  let state = input.seed >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ state >>> 15, state | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const seeds: GrainSeed[] = [];
  const separation2 = input.minimumDistance ** 2;
  for (let attempts = 1; attempts <= input.maxAttempts; attempts++) {
    const position: Vec3 = [random(), random(), random()];
    if (seeds.some(s => s.position.reduce((sum, v, i) => sum + (v - position[i]) ** 2, 0) < separation2)) continue;
    seeds.push(Object.freeze({ id: seeds.length + 1, position: Object.freeze(position), weight: 0 }));
    if (seeds.length === input.count) return {
      status: 'complete', seeds: Object.freeze(seeds), attempts,
      algorithm: 'mulberry32-rejection-r01', options,
    };
  }
  return { status: 'exhausted', generatedCount: seeds.length, attempts: input.maxAttempts,
    algorithm: 'mulberry32-rejection-r01', options };
}
