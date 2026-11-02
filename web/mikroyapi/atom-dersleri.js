/* SPDX-License-Identifier: MIT — port of OG portfolio geometry. See docs/STAGE3_DELIVERY.md. */
const base = { repeats: 1, shares: false, holes: "none", carbon: false, neighbours: false, dim: false, compare: false };
function lessonSteps(code) {
  const cubic = code === "A" || code === "D" || code === "G";
  const step = (id, badges, view, body = id) => ({ id, titleKey: `kup.lesson.${id}.title`, bodyKey: `kup.lesson.${body}.body`, badges, view: view && { ...base, ...view } });
  if (code === "L") return [step("free", [], null)];
  if (!cubic) return [
    step("lattice", ["reference"], { repeats: 2 }, "latticeC"),
    step("cell", ["reference"], { carbon: true }, "cellC"),
    step("free", [], null)
  ];
  const bcc = code !== "G";
  return [
    step("lattice", ["reference"], { repeats: 2 }),
    step("cell", ["reference", "ideal"], { shares: true }),
    step("interstices", ["ideal"], { holes: "all", carbon: true, neighbours: bcc, dim: true }, bcc ? "intersticesBcc" : "interstices"),
    step("compare", ["ideal", "calculated"], { holes: "octa", carbon: true, dim: true, compare: true }),
    step("free", [], null)
  ];
}
function lessonKeys() {
  const keys = /* @__PURE__ */ new Set();
  for (const code of ["G", "A", "D", "C", "L"]) for (const s of lessonSteps(code)) {
    keys.add(s.titleKey);
    keys.add(s.bodyKey);
  }
  return [...keys].sort();
}
export {
  lessonKeys,
  lessonSteps
};
