/* SPDX-License-Identifier: MIT — port of OG portfolio geometry. See docs/STAGE3_DELIVERY.md. */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function coordinationHull(vertices) {
  if (vertices.length !== 6 || vertices.some((p) => p.length !== 3 || p.some((v) => !Number.isFinite(v)))) throw new RangeError("Six finite coordination vertices required");
  const faces = /* @__PURE__ */ new Map(), centre = vertices.reduce((s, p) => s.map((v, i) => v + p[i] / 6), [0, 0, 0]);
  for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) for (let k = j + 1; k < 6; k++) {
    let normal = cross(sub(vertices[j], vertices[i]), sub(vertices[k], vertices[i]));
    const length = Math.sqrt(dot(normal, normal));
    if (length < 1e-10) continue;
    normal = normal.map((v) => v / length);
    const d = vertices.map((p) => dot(normal, sub(p, vertices[i])));
    if (d.some((v) => v > 1e-8) && d.some((v) => v < -1e-8)) continue;
    if (dot(normal, sub(centre, vertices[i])) > 0) normal = normal.map((v) => -v);
    const ids = d.flatMap((v, id) => Math.abs(v) < 1e-8 ? [id] : []);
    faces.set(ids.join(","), { ids, normal });
  }
  const triangles = [];
  for (const { ids, normal } of faces.values()) {
    const c = ids.reduce((s, id) => s.map((v2, i) => v2 + vertices[id][i] / ids.length), [0, 0, 0]), u = sub(vertices[ids[0]], c), v = cross(normal, u);
    ids.sort((a, b) => Math.atan2(dot(sub(vertices[a], c), v), dot(sub(vertices[a], c), u)) - Math.atan2(dot(sub(vertices[b], c), v), dot(sub(vertices[b], c), u)));
    for (let i = 1; i < ids.length - 1; i++) triangles.push(ids[0], ids[i], ids[i + 1]);
  }
  if (!triangles.length) throw new Error("Degenerate coordination shell");
  return triangles;
}
export {
  coordinationHull
};
