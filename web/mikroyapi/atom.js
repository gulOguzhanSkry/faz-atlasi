/* SPDX-License-Identifier: MIT — port of OG portfolio geometry. See docs/STAGE3_DELIVERY.md. */
import * as THREE from "../vendor/three/three.module.min.js";
import { crystalImages, exampleCarbon, carbonNeighbours, classifySite, ironRadius, interstitialSummary, siteImages, phaseCrystal, OCTAHEDRAL, TETRAHEDRAL, REFERENCE_LATTICE, CARBON_RADIUS_ANGSTROM } from "./kristal-yapilar.js";
import { idealInterstitialRadius, carbonImages } from "./karbon-yerlesimi.js";
import { coordinationHull } from "./koordinasyon.js";
function drawAtomicPhase(group, crystal, repeats, showCarbon, showHoles, showNeighbours, population, showVolumes = false, compact = false) {
  const n = crystal.periodic ? repeats : 1, scale = 1.18 / (Math.max(...crystal.cell) * n);
  const world = (p) => new THREE.Vector3((p[0] - n / 2) * crystal.cell[0] * scale, (p[2] - n / 2) * crystal.cell[2] * scale, -(p[1] - n / 2) * crystal.cell[1] * scale);
  const atoms = crystalImages(crystal, repeats);
  let example = exampleCarbon(crystal, repeats);
  if (population) {
    example = population.positions[0] ?? population.sites.reduce((best, p) => p.reduce((s, v, i) => s + (v - n / 2) ** 2, 0) < best.reduce((s, v, i) => s + (v - n / 2) ** 2, 0) ? p : best, population.sites[0]);
  }
  if (showCarbon && crystal.code !== "C") {
    for (const position of population ? carbonImages(population.positions, n) : example ? [example] : []) atoms.push({ element: "C", position, role: "example" });
  }
  function spheres(positions, color, radius2, opacity = 1, wireframe = false) {
    if (!positions.length) return;
    const geometry = new THREE.SphereGeometry(radius2, 24, 16), material = new THREE.MeshStandardMaterial({ color, metalness: 0.2, roughness: 0.35, transparent: opacity < 1, opacity, wireframe });
    const mesh = new THREE.InstancedMesh(geometry, material, positions.length), matrix = new THREE.Matrix4();
    positions.forEach((p, i) => {
      const v = world(p);
      mesh.setMatrixAt(i, matrix.makeTranslation(v.x, v.y, v.z));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  const ideal = idealInterstitialRadius(crystal);
  const radius = ideal ? ideal.iron * scale * (compact ? 0.9 : 0.46) : crystal.code === "C" ? 0.039 / repeats : 0.044;
  spheres(atoms.filter((a) => a.element === "Fe").map((a) => a.position), "#809cae", radius);
  if (showCarbon) spheres(atoms.filter((a) => a.element === "C").map((a) => a.position), "#f3b74e", radius * 0.6);
  const lines = [];
  if (crystal.periodic) for (let axis = 0; axis < 3; axis++) for (let a = 0; a <= n; a++) for (let b = 0; b <= n; b++) {
    const other = [0, 1, 2].filter((v) => v !== axis), p = [0, 0, 0], q = [0, 0, 0];
    p[other[0]] = q[other[0]] = a;
    p[other[1]] = q[other[1]] = b;
    q[axis] = n;
    lines.push(...world(p).toArray(), ...world(q).toArray());
  }
  if (lines.length) {
    const geometry = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));
    group.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 6848906, transparent: true, opacity: 0.45 })));
  }
  if (crystal.periodic && showHoles && crystal.code !== "C") {
    const holes = [];
    for (const p of crystal.interstices) for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) {
      const q = [p[0] + x, p[1] + y, p[2] + z];
      const occupied = showCarbon && (population ? population.positions : example ? [example] : []).some((c) => c.every((v, i) => Math.abs(v - q[i]) < 1e-8));
      if (!occupied) holes.push(q);
    }
    spheres(holes, "#3ea09c", ideal ? ideal.void * scale : radius * 0.65, 0.28, true);
  }
  if (crystal.periodic && showVolumes && example) {
    const centres = showHoles ? crystal.interstices.map((p) => [p[0] + Math.floor(example[0]), p[1] + Math.floor(example[1]), p[2] + Math.floor(example[2])]) : [example];
    for (const centre of centres) {
      const neighbours = carbonNeighbours(crystal, centre), positions = neighbours.map((p) => world(p.position)), geometry = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(positions.flatMap((p) => p.toArray()), 3));
      geometry.setIndex(coordinationHull(neighbours.map((p) => [p.position[0] * crystal.cell[0], p.position[1] * crystal.cell[1], p.position[2] * crystal.cell[2]])));
      geometry.computeVertexNormals();
      group.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 4766124, transparent: true, opacity: 0.11, side: THREE.DoubleSide, depthWrite: false })));
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: 3447182, transparent: true, opacity: 0.6 })));
      if (ideal) spheres([centre], "#48b9ac", ideal.void * scale, 0.16);
    }
  }
  if (showCarbon && showNeighbours && example) {
    const neighbours = carbonNeighbours(crystal, example), geometry = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(neighbours.flatMap((p) => [...world(example).toArray(), ...world(p.position).toArray()]), 3));
    group.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 13732646, transparent: true, opacity: 0.8 })));
    spheres(neighbours.filter((p) => p.position.some((v) => v < 0 || v > n)).map((p) => p.position), "#809cae", radius, 0.45);
  }
}
const LESSON_COLORS = { corner: "#7f9db0", edge: "#8a7ac2", face: "#3d7fb1", body: "#c47a45", octa: "#2fa69a", tetra: "#8a63c9", carbon: "#f3b74e", near: "#d36b1f", far: "#8a969b" };
function frame(crystal, n, unit, shift = 0) {
  const across = new THREE.Vector3(shift, 0, 0);
  return { unit, world: (p) => new THREE.Vector3((p[0] - n / 2) * crystal.cell[0] * unit, (p[2] - n / 2) * crystal.cell[2] * unit, -(p[1] - n / 2) * crystal.cell[1] * unit).add(across) };
}
function addSpheres(group, f, positions, color, radius, opts = {}) {
  if (!positions.length || radius <= 0) return;
  const opacity = opts.opacity ?? 1, geometry = new THREE.SphereGeometry(radius, 28, 18);
  const material = new THREE.MeshStandardMaterial({ color, metalness: 0.15, roughness: 0.4, transparent: opacity < 1, opacity, depthWrite: opacity >= 1, side: opts.side ?? THREE.FrontSide, clippingPlanes: opts.clip ?? null });
  const mesh = new THREE.InstancedMesh(geometry, material, positions.length), m = new THREE.Matrix4();
  positions.forEach((p, i) => {
    const v = f.world(p);
    mesh.setMatrixAt(i, m.makeTranslation(v.x, v.y, v.z));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.name = opts.name ?? "";
  group.add(mesh);
}
function addTetrahedra(group, f, positions, radius) {
  if (!positions.length) return;
  const geometry = new THREE.TetrahedronGeometry(radius), material = new THREE.MeshStandardMaterial({ color: LESSON_COLORS.tetra, transparent: true, opacity: 0.55, depthWrite: false, flatShading: true });
  const mesh = new THREE.InstancedMesh(geometry, material, positions.length), m = new THREE.Matrix4();
  positions.forEach((p, i) => {
    const v = f.world(p);
    mesh.setMatrixAt(i, m.makeTranslation(v.x, v.y, v.z));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.name = "tetra";
  group.add(mesh);
}
function cellEdges(group, f, n, opacity = 0.55) {
  const lines = [];
  for (let axis = 0; axis < 3; axis++) for (let a = 0; a <= n; a++) for (let b = 0; b <= n; b++) {
    const o = [0, 1, 2].filter((v) => v !== axis), p = [0, 0, 0], q = [0, 0, 0];
    p[o[0]] = q[o[0]] = a;
    p[o[1]] = q[o[1]] = b;
    q[axis] = n;
    lines.push(...f.world(p).toArray(), ...f.world(q).toArray());
  }
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(lines, 3)), new THREE.LineBasicMaterial({ color: 5204080, transparent: true, opacity })));
}
function boxPlanes(f, n) {
  const a = f.world([0, 0, 0]), b = f.world([n, n, n]), min = a.clone().min(b), max = a.clone().max(b);
  return [new THREE.Plane(new THREE.Vector3(1, 0, 0), -min.x), new THREE.Plane(new THREE.Vector3(-1, 0, 0), max.x), new THREE.Plane(new THREE.Vector3(0, 1, 0), -min.y), new THREE.Plane(new THREE.Vector3(0, -1, 0), max.y), new THREE.Plane(new THREE.Vector3(0, 0, 1), -min.z), new THREE.Plane(new THREE.Vector3(0, 0, -1), max.z)];
}
function lessonCarbon(crystal) {
  if (crystal.code === "G") return [0.5, 0.5, 0.5];
  if (crystal.code === "A" || crystal.code === "D") return [0.5, 0.5, 1];
  return null;
}
function drawLessonCell(group, crystal, view, f) {
  const n = view.repeats, R = ironRadius(crystal), iron = R !== null ? R * crystal.cell[0] * f.unit : 0.55 * f.unit;
  const atoms = crystalImages(crystal, n), fe = atoms.filter((a) => a.element === "Fe").map((a) => a.position), c = atoms.filter((a) => a.element === "C").map((a) => a.position);
  const feRadius = view.dim ? iron * 0.32 : iron * (view.shares ? 1 : 0.46);
  if (view.shares && n === 1) {
    const clip = boxPlanes(f, n), byClass = /* @__PURE__ */ new Map();
    for (const p of fe) {
      const k = classifySite(p);
      byClass.set(k, [...byClass.get(k) ?? [], p]);
    }
    for (const [k, list] of byClass) {
      addSpheres(group, f, list, LESSON_COLORS[k], feRadius, { clip, side: THREE.DoubleSide, name: "share-" + k });
      addSpheres(group, f, list, LESSON_COLORS[k], feRadius * 1.002, { opacity: 0.07, name: "ghost-" + k });
    }
  } else addSpheres(group, f, fe, LESSON_COLORS.corner, feRadius, { opacity: view.dim ? 0.55 : 1, name: "fe" });
  if (crystal.code === "C") addSpheres(group, f, c, LESSON_COLORS.carbon, iron * 0.7, { name: "c" });
  cellEdges(group, f, n);
  if (R === null) return;
  const summary = interstitialSummary(phaseCrystal(crystal.code)), family = crystal.code === "G" ? "FCC" : "BCC", feA = R * crystal.cell[0] * f.unit;
  if (view.holes !== "none") {
    const octa = siteImages(OCTAHEDRAL[family], n), carbon = view.carbon ? lessonCarbon(crystal) : null;
    const free = octa.filter((p) => !carbon || p.some((v, i) => Math.abs(v - carbon[i]) > 1e-9));
    addSpheres(group, f, free, LESSON_COLORS.octa, summary.find((s) => s.kind === "octa").ratio * feA, { opacity: 0.42, name: "octa" });
    if (view.holes === "all") addTetrahedra(group, f, siteImages(TETRAHEDRAL[family], n), summary.find((s) => s.kind === "tetra").ratio * feA);
  }
  if (view.carbon) {
    const carbon = lessonCarbon(crystal);
    if (!carbon) return;
    const cR = CARBON_RADIUS_ANGSTROM / REFERENCE_LATTICE[crystal.code === "G" ? "G" : "A"].a * crystal.cell[0] * f.unit;
    addSpheres(group, f, [carbon], LESSON_COLORS.carbon, cR, { opacity: view.compare ? 1 : 0.82, name: "c" });
    if (view.neighbours) {
      const nb = carbonNeighbours(crystal, carbon), near = nb[0].distance;
      const seg = (list, color, opacity) => {
        if (!list.length) return;
        const g = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(list.flatMap((p) => [...f.world(carbon).toArray(), ...f.world(p.position).toArray()]), 3));
        group.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity })));
      };
      seg(nb.filter((p) => p.distance < near * 1.01), LESSON_COLORS.near, 1);
      seg(nb.filter((p) => p.distance >= near * 1.01), LESSON_COLORS.far, 0.7);
      const outside = nb.filter((p) => p.position.some((v) => v < -1e-9 || v > n + 1e-9)).map((p) => p.position);
      addSpheres(group, f, outside, LESSON_COLORS.corner, feRadius, { opacity: 0.35, name: "neighbour-image" });
    }
  }
}
function drawAtomicLesson(group, crystal, view) {
  if (view.compare) {
    const unit = 0.78 / REFERENCE_LATTICE.G.a;
    for (const [code, shift] of [["G", -0.56], ["A", 0.52]]) {
      const c = phaseCrystal(code), scaled = { ...c, cell: [REFERENCE_LATTICE[code].a, REFERENCE_LATTICE[code].a, REFERENCE_LATTICE[code].a] };
      drawLessonCell(group, scaled, { ...view, repeats: 1, neighbours: false }, frame(scaled, 1, unit, shift));
    }
    return;
  }
  const n = crystal.periodic ? view.repeats : 1;
  drawLessonCell(group, crystal, { ...view, repeats: n }, frame(crystal, n, (view.shares ? 0.92 : 1.18) / (Math.max(...crystal.cell) * n)));
}
export {
  LESSON_COLORS,
  drawAtomicLesson,
  drawAtomicPhase
};
