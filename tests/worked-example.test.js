// Worked example from the reference: office floor panel DB-1F (400 m², 6 × 4 TR ducted units).
const assert = require('assert');
const path = require('path');
const E = require(path.join(__dirname, '../src/engine.js'));
const lib = id => E.LIB.find(x => x.id === id);
let n = 0;
const mk = (id, qty, o = {}) => { const it = lib(id); return Object.assign({ id: 'r' + (++n), itemId: id, cat: it.cat, desc: it.ar, qty, unit: it.unit, val: it.val, pf: it.pf, eff: it.eff, eer: it.eer, ph: it.ph, phase: 'L1', mode: it.mode || 'duty', len: 25, brk: 'auto', cable: 'auto', minIn: it.minIn }, o); };
const state = {
  settings: { project: 'off', system: '3P', spare: 25, ways: 16, nec125: false, distributed: false, vdLight: 3, vdOther: 5, feederVd: 2, imbLimit: 10, minSize: 2.5, spareWays: 20,
    final: { method: 'B1', ins: 'PVC', amb: 40, group: 2, soil: 2 }, feeder: { method: 'E', ins: 'XLPE', amb: 45, group: 2, soil: 2, len: 35, override: 'auto' }, mainOverride: 'auto' },
  rows: [
    mk('lt-panel36', 20, { phase: 'L1' }), mk('lt-panel36', 20, { phase: 'L2' }), mk('lt-panel36', 20, { phase: 'L3' }), mk('lt-down18', 30, { phase: 'L1' }),
    mk('sk-180', 10, { phase: 'L1' }), mk('sk-180', 10, { phase: 'L2' }), mk('sk-180', 10, { phase: 'L3' }),
    mk('ds-micro', 2, { phase: 'L1' }), mk('wh-50', 1, { phase: 'L2' }), mk('ac-ex60', 3, { phase: 'L2' }), mk('it-ups3', 1, { phase: 'L3' }), mk('ds-copier', 1, { phase: 'L2' }),
    ...Array.from({ length: 6 }, () => mk('ac-d4', 1, { len: 40 })),
    mk('sp-1', 1, { phase: 'L1' }), mk('sp-1', 1, { phase: 'L2' }), mk('sp-3', 1)
  ]
};
const P = E.compute(state).panel;
assert.ok(Math.abs(P.totConn - 47943) < 5, 'connected load ≈ 47.9 kVA');
assert.ok(Math.abs(P.totDem - 43893) < 5, 'demand load ≈ 43.9 kVA');
assert.ok(Math.abs(P.IbPanel - 64.42) < 0.05, 'Ib from heaviest phase ≈ 64.4 A');
assert.strictEqual(P.mainIn, 100, 'main breaker 100 A');
assert.strictEqual(P.feeder.size, 35, 'feeder 4C × 35 mm² XLPE on tray');
assert.ok(Math.abs(P.feeder.Iz - 121.0) < 0.2, 'feeder Iz = 158 × 0.87 × 0.88 ≈ 121 A');
assert.ok(P.feeder.vd < 0.7, 'feeder voltage drop < 0.7 %');
assert.ok(P.imbDem < 2, 'demand imbalance < 2 %');
// lifts diversity: 1 / 0.75 / 0.6
const st2 = JSON.parse(JSON.stringify(state)); st2.rows = [mk('lf-13', 2), mk('lf-8', 1)];
const r2 = E.compute(st2).rows;
assert.ok(Math.abs(r2[0].dem - r2[0].uva * 1.75) < 1, 'two largest lifts at 1 + 0.75');
assert.ok(Math.abs(r2[1].dem - r2[1].uva * 0.6) < 1, 'third lift at 0.6');
console.log('worked example: all checks passed');
