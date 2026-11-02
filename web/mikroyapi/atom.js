/* SPDX-License-Identifier: MIT — port of OG portfolio geometry. See docs/STAGE3_DELIVERY.md. */
import * as THREE from "../vendor/three/three.module.min.js";
import { crystalImages, exampleCarbon, carbonNeighbours } from "./kristal-yapilar.js";
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
export {
  drawAtomicPhase
};
