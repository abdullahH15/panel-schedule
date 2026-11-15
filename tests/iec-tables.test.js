// Copper current-carrying capacities checked against IEC 60364-5-52:2009 Annex B
// (Tables B.52.2, B.52.4, B.52.5, B.52.12). Sizes 1.5 … 300 mm².
const assert = require('assert');
const path = require('path');
const E = require(path.join(__dirname, '../src/engine.js'));
const ref = {
  'B1.PVC.2': [17.5, 24, 32, 41, 57, 76, 101, 125, 151, 192, 232, 269, 300, 341, 400, 458],
  'B2.PVC.2': [16.5, 23, 30, 38, 52, 69, 90, 111, 133, 168, 201, 232, 258, 294, 344, 394],
  'C.PVC.2': [19.5, 27, 36, 46, 63, 85, 112, 138, 168, 213, 258, 299, 344, 392, 461, 530],
  'D.PVC.2': [22, 29, 37, 46, 60, 78, 99, 119, 140, 173, 204, 231, 261, 292, 336, 379],
  'D2.PVC.2': [22, 28, 38, 48, 64, 83, 110, 132, 156, 192, 230, 261, 293, 331, 382, 427],
  'B1.PVC.3': [15.5, 21, 28, 36, 50, 68, 89, 110, 134, 171, 207, 239, 262, 296, 346, 394],
  'B2.PVC.3': [15, 20, 27, 34, 46, 62, 80, 99, 118, 149, 179, 206, 225, 255, 297, 339],
  'C.PVC.3': [17.5, 24, 32, 41, 57, 76, 96, 119, 144, 184, 223, 259, 299, 341, 403, 464],
  'D.PVC.3': [18, 24, 30, 38, 50, 64, 82, 98, 116, 143, 169, 192, 217, 243, 280, 316],
  'D2.PVC.3': [19, 24, 33, 41, 54, 70, 92, 110, 130, 162, 193, 220, 246, 278, 320, 359],
  'B1.XLPE.3': [20, 28, 37, 48, 66, 88, 117, 144, 175, 222, 269, 312, 342, 384, 450, 514],
  'B2.XLPE.3': [19.5, 26, 35, 44, 60, 80, 105, 128, 154, 194, 233, 268, 300, 340, 398, 455],
  'C.XLPE.3': [22, 30, 40, 52, 71, 96, 119, 147, 179, 229, 278, 322, 371, 424, 500, 576],
  'D.XLPE.3': [21, 28, 36, 44, 58, 75, 96, 115, 135, 167, 197, 223, 251, 281, 324, 365],
  'D2.XLPE.3': [23, 30, 39, 49, 65, 84, 107, 129, 153, 188, 226, 257, 287, 324, 375, 419],
  'E.XLPE.2': [26, 36, 49, 63, 86, 115, 149, 185, 225, 289, 352, 410, 473, 542, 641, 741],
  'E.XLPE.3': [23, 32, 42, 54, 75, 100, 127, 158, 192, 246, 298, 346, 399, 456, 538, 621]
};
for (const [k, v] of Object.entries(ref)) {
  const [m, ins, l] = k.split('.');
  assert.deepStrictEqual(E.AMP[m][ins][l], v, `${k} differs from IEC 60364-5-52:2009`);
}
// Correction factors spot checks (B.52.14, B.52.15, B.52.16, B.52.17, B.52.18, B.52.19)
const c = o => E.corrections(Object.assign({ ins: 'PVC', amb: 30, group: 1, soil: 2.5 }, o));
assert.strictEqual(c({ method: 'B1', amb: 45 }).ca, 0.79);
assert.strictEqual(c({ method: 'E', ins: 'XLPE', amb: 45 }).ca, 0.87);
assert.strictEqual(c({ method: 'D', amb: 40 }).ca, 0.77);
assert.strictEqual(c({ method: 'D', soil: 2 }).cs, 1.05);
assert.strictEqual(c({ method: 'D2', soil: 2 }).cs, 1.12);
assert.strictEqual(c({ method: 'B1', group: 3 }).cg, 0.7);
assert.strictEqual(c({ method: 'E', group: 2 }).cg, 0.88);
assert.strictEqual(c({ method: 'D2', group: 3 }).cg, 0.65);
assert.strictEqual(c({ method: 'D', group: 10 }).cg, 0.49);
console.log(`IEC tables: ${Object.keys(ref).length} columns and factor spot checks passed`);
