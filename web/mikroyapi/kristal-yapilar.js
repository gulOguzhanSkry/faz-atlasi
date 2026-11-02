/* SPDX-License-Identifier: MIT — port of OG portfolio geometry. See docs/STAGE3_DELIVERY.md. */
const cementite = {
  "cell": {
    "a": 5.09,
    "b": 6.748,
    "c": 4.523,
    "alpha": 90,
    "beta": 90,
    "gamma": 90
  },
  "atoms": [
    {
      "element": "C",
      "position": [
        0.39,
        0.25,
        0.05
      ]
    },
    {
      "element": "C",
      "position": [
        0.10999999999999999,
        0.75,
        0.55
      ]
    },
    {
      "element": "C",
      "position": [
        0.61,
        0.75,
        0.95
      ]
    },
    {
      "element": "C",
      "position": [
        0.89,
        0.25,
        0.45
      ]
    },
    {
      "element": "Fe",
      "position": [
        0.036,
        0.25,
        0.852
      ]
    },
    {
      "element": "Fe",
      "position": [
        0.464,
        0.75,
        0.35199999999999987
      ]
    },
    {
      "element": "Fe",
      "position": [
        0.964,
        0.75,
        0.14800000000000002
      ]
    },
    {
      "element": "Fe",
      "position": [
        0.536,
        0.25,
        0.648
      ]
    },
    {
      "element": "Fe",
      "position": [
        0.186,
        0.063,
        0.328
      ]
    },
    {
      "element": "Fe",
      "position": [
        0.314,
        0.937,
        0.8280000000000001
      ]
    },
    {
      "element": "Fe",
      "position": [
        0.8140000000000001,
        0.563,
        0.6719999999999999
      ]
    },
    {
      "element": "Fe",
      "position": [
        0.6859999999999999,
        0.437,
        0.172
      ]
    },
    {
      "element": "Fe",
      "position": [
        0.8140000000000001,
        0.937,
        0.6719999999999999
      ]
    },
    {
      "element": "Fe",
      "position": [
        0.6859999999999999,
        0.063,
        0.172
      ]
    },
    {
      "element": "Fe",
      "position": [
        0.186,
        0.437,
        0.328
      ]
    },
    {
      "element": "Fe",
      "position": [
        0.314,
        0.563,
        0.8280000000000001
      ]
    }
  ],
  "source": {
    "provider": "AFLOW prototype encyclopedia",
    "recordId": "AB3_oP16_62_c_cd-001",
    "url": "https://aflow.org/p/AB3_oP16_62_c_cd-001/",
    "citation": "Hicks et al., Computational Materials Science 199 (2021) 110450; Herbstein & Smuts, Acta Cryst.17 (1964) 1331\u20131332",
    "license": "Source-linked factual coordinates; original source attribution retained",
    "originalCifPath": "docs/education/heat-treatment/research/crystals/cementite-aflow.cif",
    "sha256": "89a04731c6b8d5e32d002bb7f9eab663740e6e0c33812e92bb735d6baeb5a36a",
    "retrievedAt": "2026-11-01",
    "kind": "idealized",
    "normalizedInputSha256": "cf120a4937a5d47918ca95f615efafbf75a3fdc3e5fcb99d2b6c7fb3c73eb4a5",
    "normalization": "Added chemical_formula_sum Fe3 C from named prototype; coordinates and symmetry unchanged"
  }
};
const IRON_SOURCE = "https://www.phase-trans.msm.cam.ac.uk/2003/Lattices/iron.html";
const BCC = [[0, 0, 0], [0.5, 0.5, 0.5]], FCC = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]];
const OCTAHEDRAL = { BCC: [[0.5, 0, 0], [0, 0.5, 0], [0, 0, 0.5], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]], FCC: [[0.5, 0.5, 0.5], [0.5, 0, 0], [0, 0.5, 0], [0, 0, 0.5]] };
function phaseCrystal(code) {
  const base = { code, cell: [1, 1, 1], periodic: true, carbonAtomsPerCell: 0, source: IRON_SOURCE };
  if (code === "A" || code === "D") return {
    ...base,
    name: code === "A" ? "\u03B1-ferrit" : "\u03B4-ferrit",
    system: "HMK / BCC \xB7 Im3\u0305m (#229)",
    atoms: BCC.map((position) => ({ element: "Fe", position, role: "lattice" })),
    interstices: OCTAHEDRAL.BCC,
    metalAtomsPerCell: 2,
    description: "Fe k\xF6\u015Felerde ve g\xF6vde merkezinde. \xC7\xF6z\xFCnm\xFC\u015F C, \xE7arp\u0131k oktahedral arayerlerde bulunur: iki yak\u0131n ve d\xF6rt daha uzak Fe kom\u015Fusu.",
    scope: "\u03B1 ve \u03B4 ayn\u0131 kafes t\xFCr\xFCne sahiptir. C bir yerle\u015Fim \xF6rne\u011Fidir; se\xE7ili karbon y\xFCzdesini temsil etmez. Boyut normalize edilmi\u015Ftir; s\u0131cakl\u0131kla genle\u015Fme veya C kaynakl\u0131 yerel gev\u015Feme hesaplanmaz."
  };
  if (code === "G") return {
    ...base,
    name: "\u03B3-\xF6stenit",
    system: "YMK / FCC \xB7 Fm3\u0305m (#225)",
    atoms: FCC.map((position) => ({ element: "Fe", position, role: "lattice" })),
    interstices: OCTAHEDRAL.FCC,
    metalAtomsPerCell: 4,
    description: "Fe k\xF6\u015Felerde ve y\xFCz merkezlerinde. C g\xF6vde merkezindeki ve kenar ortalar\u0131ndaki oktahedral arayerlere yerle\u015Febilir; alt\u0131 e\u015F uzakl\u0131kl\u0131 Fe kom\u015Fusu bulunur.",
    scope: "G\xF6sterilen C yaln\u0131z bir yerle\u015Fim \xF6rne\u011Fidir; b\xFCt\xFCn arayerler dolu de\u011Fildir ve se\xE7ili a\u011F.% C oran\u0131n\u0131 temsil etmez."
  };
  if (code === "C") return {
    ...base,
    name: "\u03B8-sementit \xB7 Fe\u2083C",
    system: "Ortorombik \xB7 Pnma (#62) \xB7 oP16",
    cell: [cementite.cell.a, cementite.cell.b, cementite.cell.c],
    atoms: cementite.atoms.map((a) => ({ element: a.element, position: a.position, role: "lattice" })),
    interstices: [],
    metalAtomsPerCell: 12,
    carbonAtomsPerCell: 4,
    source: cementite.source.url,
    description: "Fe: 4c ve 8d; C: 4c konumlar\u0131. Bir h\xFCcrede 12 Fe + 4 C, yani d\xF6rt Fe\u2083C form\xFCl birimi bulunur. C \xE7evresindeki alt\u0131 Fe yakla\u015F\u0131k trigonal prizma olu\u015Fturur.",
    scope: "Kaynak AFLOW prototipidir; a=5,090 \xC5, b=6,748 \xC5, c=4,523 \xC5. Bu sabit referans geometri se\xE7ili s\u0131cakl\u0131\u011F\u0131n \xF6l\xE7\xFClm\xFC\u015F yap\u0131s\u0131 de\u011Fildir."
  };
  if (code !== "L") throw new RangeError("Unsupported phase crystal");
  let state = 19631101;
  const random = () => {
    state = Math.imul(state, 1664525) + 1013904223 >>> 0;
    return state / 4294967296;
  };
  const atoms = [];
  for (let tries = 0; atoms.length < 38 && tries < 1e4; tries++) {
    const position = [random(), random(), random()];
    if (atoms.every((a) => a.position.reduce((s, x, i) => s + (x - position[i]) ** 2, 0) > 0.12 ** 2)) atoms.push({ element: atoms.length < 36 ? "Fe" : "C", position, role: "example" });
  }
  return { ...base, name: "S\u0131v\u0131 \xB7 Fe\u2013C", system: "Periyodik kristal kafesi yok", periodic: false, metalAtomsPerCell: 0, atoms, interstices: [], source: "https://www.phase-trans.msm.cam.ac.uk/2003/Lattices/cementite.html", description: "Atomlar\u0131n uzun menzilli periyodik dizilimi yoktur. Bu d\xFCzensiz anl\u0131k yerle\u015Fim yaln\u0131z s\u0131v\u0131 ile kristal ayr\u0131m\u0131n\u0131 anlat\u0131r.", scope: "Bu bir molek\xFCler dinamik sim\xFClasyonu de\u011Fildir. Kom\u015Fuluk istatisti\u011Fi, atom hareketi veya se\xE7ili bile\u015Fim modellenmez." };
}
function crystalImages(crystal, repetitions) {
  if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 8) throw new RangeError("One to eight cells per axis");
  if (!crystal.periodic) return crystal.atoms.map((a) => ({ ...a }));
  const atoms = [];
  for (const atom of crystal.atoms) for (let x = 0; x <= repetitions; x++) for (let y = 0; y <= repetitions; y++) for (let z = 0; z <= repetitions; z++) {
    const position = [atom.position[0] + x, atom.position[1] + y, atom.position[2] + z];
    if (position.every((c) => c <= repetitions + 1e-10)) atoms.push({ ...atom, position });
  }
  return atoms;
}
function exampleCarbon(crystal, repetitions) {
  if (crystal.code === "C") return crystal.atoms.find((a) => a.element === "C").position;
  if (crystal.code === "L") return null;
  return crystal.code === "G" ? [0.5, 0.5, 0.5] : repetitions >= 2 ? [0.5, 0.5, 1] : [0.5, 0.5, 0];
}
function carbonNeighbours(crystal, carbon) {
  if (!crystal.periodic) return [];
  const candidates = [];
  const origin = carbon.map(Math.floor);
  for (const atom of crystal.atoms.filter((a) => a.element === "Fe")) for (let x = origin[0] - 1; x <= origin[0] + 1; x++) for (let y = origin[1] - 1; y <= origin[1] + 1; y++) for (let z = origin[2] - 1; z <= origin[2] + 1; z++) {
    const position = [atom.position[0] + x, atom.position[1] + y, atom.position[2] + z];
    const distance = Math.sqrt(position.reduce((s, p, i) => s + ((p - carbon[i]) * crystal.cell[i]) ** 2, 0));
    candidates.push({ position, distance });
  }
  return candidates.sort((a, b) => a.distance - b.distance).slice(0, 6);
}
const TETRAHEDRAL = {
  FCC: [[0.25, 0.25, 0.25], [0.75, 0.25, 0.25], [0.25, 0.75, 0.25], [0.25, 0.25, 0.75], [0.75, 0.75, 0.25], [0.75, 0.25, 0.75], [0.25, 0.75, 0.75], [0.75, 0.75, 0.75]],
  BCC: [[0, 0.5, 0.25], [0, 0.5, 0.75], [0, 0.25, 0.5], [0, 0.75, 0.5], [0.5, 0, 0.25], [0.5, 0, 0.75], [0.25, 0, 0.5], [0.75, 0, 0.5], [0.5, 0.25, 0], [0.5, 0.75, 0], [0.25, 0.5, 0], [0.75, 0.5, 0]]
};
const SHARE = { corner: 1 / 8, edge: 1 / 4, face: 1 / 2, body: 1 };
const onWall = (v) => Math.abs(v) < 1e-9 || Math.abs(v - 1) < 1e-9;
function classifySite(p) {
  const n = p.filter(onWall).length;
  return n === 3 ? "corner" : n === 2 ? "edge" : n === 1 ? "face" : "body";
}
function siteShare(p) {
  return SHARE[classifySite(p)];
}
function cellShareCount(crystal) {
  if (!crystal.periodic) return [];
  const images = crystalImages(crystal, 1);
  return ["Fe", "C"].map((element) => {
    const byClass = { corner: 0, edge: 0, face: 0, body: 0 };
    for (const atom of images) if (atom.element === element) byClass[classifySite(atom.position)]++;
    const total = Object.keys(byClass).reduce((s, k) => s + byClass[k] * SHARE[k], 0);
    return { element, byClass, total };
  }).filter((row) => row.total > 0);
}
function cubicFamily(crystal) {
  return crystal.code === "G" ? "FCC" : crystal.code === "A" || crystal.code === "D" ? "BCC" : null;
}
function ironRadius(crystal) {
  const f = cubicFamily(crystal);
  return f === "FCC" ? Math.SQRT2 / 4 : f === "BCC" ? Math.sqrt(3) / 4 : null;
}
function packingFraction(crystal) {
  const R = ironRadius(crystal);
  if (R === null) return null;
  const fe = cellShareCount(crystal).find((r) => r.element === "Fe").total;
  return fe * 4 / 3 * Math.PI * R ** 3 / (crystal.cell[0] * crystal.cell[1] * crystal.cell[2]);
}
function ironDistances(crystal, p) {
  const out = [];
  const o = p.map(Math.floor);
  for (const atom of crystal.atoms) if (atom.element === "Fe") for (let x = o[0] - 1; x <= o[0] + 1; x++) for (let y = o[1] - 1; y <= o[1] + 1; y++) for (let z = o[2] - 1; z <= o[2] + 1; z++) {
    const d = Math.sqrt([atom.position[0] + x, atom.position[1] + y, atom.position[2] + z].reduce((s, v, i) => s + ((v - p[i]) * crystal.cell[i]) ** 2, 0));
    if (d > 1e-9) out.push(d);
  }
  return out.sort((a, b) => a - b);
}
function coordinationNumber(crystal) {
  if (!crystal.periodic || cubicFamily(crystal) === null) return null;
  const fe = crystal.atoms.find((a) => a.element === "Fe").position, d = ironDistances(crystal, fe);
  return d.filter((v) => v < d[0] * (1 + 1e-6)).length;
}
function interstitialSites(crystal) {
  const f = cubicFamily(crystal), R = ironRadius(crystal);
  if (!f || R === null) return [];
  const out = [];
  for (const [kind, list, neighbours] of [["octa", OCTAHEDRAL[f], 6], ["tetra", TETRAHEDRAL[f], 4]]) for (const position of list) {
    const nearest = ironDistances(crystal, position)[0];
    out.push({ kind, position, neighbours, ratio: (nearest - R) / R, nearest });
  }
  return out;
}
function interstitialSummary(crystal) {
  const sites = interstitialSites(crystal);
  return ["octa", "tetra"].map((kind) => {
    const s = sites.filter((x) => x.kind === kind);
    return { kind, perCell: s.length, ratio: s[0]?.ratio ?? NaN, neighbours: s[0]?.neighbours ?? 0 };
  }).filter((x) => x.perCell > 0);
}
function siteImages(positions, n = 1) {
  const out = [];
  for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) for (const p of positions) {
    const q = [p[0] + x, p[1] + y, p[2] + z];
    for (const a of Math.abs(q[0]) < 1e-9 ? [0, n] : [q[0]]) for (const b of Math.abs(q[1]) < 1e-9 ? [0, n] : [q[1]]) for (const c of Math.abs(q[2]) < 1e-9 ? [0, n] : [q[2]]) out.push([a, b, c]);
  }
  const seen = /* @__PURE__ */ new Set();
  return out.filter((p) => {
    const k = p.map((v) => v.toFixed(6)).join();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
const REFERENCE_LATTICE = { A: { a: 2.904, temperature: 912 }, G: { a: 3.647, temperature: 912 } };
const CARBON_RADIUS_ANGSTROM = 0.77;
function radiiAngstrom(code) {
  const crystal = phaseCrystal(code), { a, temperature } = REFERENCE_LATTICE[code], R = ironRadius(crystal) * a, s = interstitialSummary(crystal);
  return { a, temperature, iron: R, octa: s.find((x) => x.kind === "octa").ratio * R, tetra: s.find((x) => x.kind === "tetra").ratio * R };
}
export {
  CARBON_RADIUS_ANGSTROM,
  OCTAHEDRAL,
  REFERENCE_LATTICE,
  TETRAHEDRAL,
  carbonNeighbours,
  cellShareCount,
  classifySite,
  coordinationNumber,
  crystalImages,
  exampleCarbon,
  interstitialSites,
  interstitialSummary,
  ironRadius,
  packingFraction,
  phaseCrystal,
  radiiAngstrom,
  siteImages,
  siteShare
};
