(() => {
  const E = ENG;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f0 = n => Math.round(n || 0).toLocaleString('en-US');
  const fx = (n, d) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const uid = p => (p || 'r') + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 6);
  const UNITS = { W: 'W', VA: 'VA', kVA: 'kVA', kW: 'kW محرك', kWe: 'kW كهربائي', TR: 'طن تبريد' };
  const USHORT = { W: 'W', VA: 'VA', kVA: 'kVA', kW: 'kW', kWe: 'kWe', TR: 'TR' };
  const bd = s => `<bdi>${s}</bdi>`;
  const MODES = { duty: 'عادي', standby: 'احتياطي', fire: 'حريق فقط' };
  const LS_CUR = 'ps.current.v1', LS_SAVED = 'ps.saved.v1', LS_BANNER = 'ps.banner.v1';
  const DEF_LEN = { LT: 25, SK: 25, DS: 20, KT: 15, WH: 15, AC: 30, MT: 30, LF: 40, IT: 15, EV: 30, SL: 80, IN: 120, FS: 40, SP: 0 };
  const CB_LIST = E.BRK.filter(v => v <= 630);
  const ls = {
    get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  };

  // ---------- state
  function defaultSettings() {
    return { project: 'off', system: '3P', ways: 16, spare: 25, spareWays: 20, isc: 10, icu: 10, mainOverride: 'auto', nec125: false, distributed: false,
      supply: 'public', vdLight: 3, vdOther: 5, feederVd: 2, imbLimit: 10, minSize: 2.5,
      final: { method: 'B1', ins: 'PVC', amb: 40, group: 2, soil: 2 },
      feeder: { method: 'E', ins: 'XLPE', amb: 45, group: 2, soil: 2, len: 35, override: 'auto' } };
  }
  function newState(keepSettings) {
    return { id: uid('p'), meta: { project: '', tag: '', fedFrom: '', location: '' },
      settings: keepSettings ? JSON.parse(JSON.stringify(keepSettings)) : defaultSettings(), rows: [], dfOverride: {} };
  }
  function normalize(s) {
    const d = defaultSettings();
    const o = Object.assign(newState(), s || {});
    o.id = o.id || uid('p');
    o.meta = Object.assign({ project: '', tag: '', fedFrom: '', location: '' }, o.meta || {});
    o.settings = Object.assign(d, o.settings || {});
    o.settings.final = Object.assign(defaultSettings().final, (s && s.settings && s.settings.final) || {});
    o.settings.feeder = Object.assign(defaultSettings().feeder, (s && s.settings && s.settings.feeder) || {});
    o.rows = Array.isArray(o.rows) ? o.rows.filter(r => r && E.CATS[r.cat]).map(r => Object.assign({ id: uid(), qty: 1, unit: 'VA', val: 0, pf: 0.9, ph: 1, phase: 'L1', mode: 'duty', len: 20, brk: 'auto', cable: 'auto', curve: null, rcd: null, minIn: null, df: null, desc: '' }, r)) : [];
    o.dfOverride = o.dfOverride && typeof o.dfOverride === 'object' ? o.dfOverride : {};
    return o;
  }
  const descOf = it => {
    const hasNum = /\d/.test(it.ar);
    if (!hasNum && it.val > 0 && (it.unit === 'W' || it.unit === 'VA')) return `${it.ar} ${it.val}${it.unit}`;
    if (!hasNum && it.unit === 'kVA') return `${it.ar} ${it.val}kVA`;
    return it.ar;
  };
  function rowFromItem(it, phase) {
    return { id: uid(), itemId: it.id, cat: it.cat, desc: descOf(it), qty: 1, unit: it.unit, val: it.val, pf: it.pf, eff: it.eff ?? null, eer: it.eer ?? null,
      ph: it.ph || 1, phase: phase || 'L1', mode: it.mode || 'duty', len: DEF_LEN[it.cat] ?? 20, brk: it.brk || 'auto', cable: 'auto', curve: it.curve || null, rcd: null, minIn: it.minIn || null, df: null };
  }
  const lib = id => E.LIB.find(x => x.id === id);
  function exampleState() {
    const st = newState();
    st.example = true;
    st.meta = { project: 'مبنى مكاتب — مثال المرجع', tag: 'DB-1F', fedFrom: 'MDB — الدائرة 5', location: 'غرفة الكهرباء — الدور الأول' };
    const mk = (id, qty, desc, phase, len, extra) => Object.assign(rowFromItem(lib(id), phase), { qty, desc: desc || descOf(lib(id)), len: len ?? DEF_LEN[lib(id).cat] }, extra || {});
    st.rows = [
      mk('lt-panel36', 20, 'إنارة مكاتب مفتوحة — الجناح A', 'L1', 25),
      mk('lt-panel36', 20, 'إنارة مكاتب مفتوحة — الجناح B', 'L2', 25),
      mk('lt-panel36', 20, 'إنارة مكاتب واجتماعات', 'L3', 25),
      mk('lt-down18', 30, 'إنارة ممرات ودورات مياه ومطبخ', 'L1', 25),
      mk('sk-180', 10, 'مقابس مكاتب مفتوحة — A', 'L1', 25),
      mk('sk-180', 10, 'مقابس مكاتب مفتوحة — B', 'L2', 25),
      mk('sk-180', 10, 'مقابس مكاتب واجتماعات', 'L3', 25),
      mk('ds-micro', 2, 'مقابس المطبخ (غلاية + مايكرويف)', 'L1', 20),
      mk('wh-50', 1, 'سخان مياه 50 لتر', 'L2', 15),
      mk('ac-ex60', 3, 'مراوح شفط دورات المياه', 'L2', 15),
      mk('it-ups3', 1, 'UPS خزانة الشبكة 3 kVA', 'L3', 10),
      mk('ds-copier', 1, 'طابعة / ناسخة', 'L2', 15),
      ...[1, 2, 3, 4, 5, 6].map(i => mk('ac-d4', 1, `وحدة تكييف مخفية AC-${i} — 4 طن`, '3P', 40)),
      mk('sp-1', 1, 'احتياطي', 'L3', 0), mk('sp-1', 1, 'احتياطي', 'L3', 0), mk('sp-3', 1, 'احتياطي ثلاثي', '3P', 0)
    ];
    return st;
  }

  let state, OUT, libCat = 'rec', DL = null, STORE = { kind: 'local' }, STANDALONE = false;

  // ---------- path helpers
  const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const setPath = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); const t = ks.reduce((a, k) => a[k], o); t[last] = v; };
  const sysThree = () => state.settings.system !== '1P';

  // ---------- settings UI
  function fillStaticOptions() {
    $('#s-project').innerHTML = Object.entries(E.PROJECTS).map(([k, p]) => `<option value="${k}">${esc(p.ar)}</option>`).join('');
    const mOpts = Object.entries(E.METHODS).map(([k, t]) => `<option value="${k}">${esc(t)}</option>`).join('');
    $('#f-method').innerHTML = mOpts; $('#d-method').innerHTML = mOpts;
    $('#s-main').innerHTML = `<option value="auto">تلقائي</option>` + E.BRK.filter(v => v >= 16).map(v => `<option value="${v}">${v} A</option>`).join('');
    $('#d-cable').innerHTML = `<option value="auto">تلقائي</option>` + E.SIZES.map(v => `<option value="${v}">${E.fmtSize(v)} mm²</option>`).join('');
  }
  function fillWays() {
    const three = sysThree();
    const opts = three ? [4, 6, 8, 12, 16, 18, 24, 30, 36] : [6, 8, 12, 16, 18, 24];
    $('#ways-label').textContent = three ? 'حجم اللوحة (مخارج TPN)' : 'حجم اللوحة (مخارج أحادية)';
    $('#s-ways').innerHTML = opts.map(n => `<option value="${n}">${three ? `${n}-way TPN · ${n * 3} مخرج` : `${n} مخرج`}</option>`).join('');
    if (!opts.includes(Number(state.settings.ways))) state.settings.ways = three ? 16 : 12;
  }
  function renderSettings() {
    fillWays();
    $$('[data-s]').forEach(el => {
      const v = getPath(state, el.dataset.s);
      if (el.type === 'checkbox') el.checked = !!v; else el.value = v ?? '';
    });
    labelAmb();
  }
  function labelAmb() {
    $('#f-amb-l').textContent = state.settings.final.method.startsWith('D') ? 'حرارة التربة °C' : 'حرارة المحيط °C';
    $('#d-amb-l').textContent = state.settings.feeder.method.startsWith('D') ? 'حرارة التربة °C' : 'حرارة المحيط °C';
  }
  function onSetting(el) {
    const p = el.dataset.s, t = el.dataset.type;
    let v = t === 'num' ? parseFloat(el.value) : t === 'bool' ? el.checked : el.value;
    if (t === 'num' && !Number.isFinite(v)) return;
    setPath(state, p, v);
    if (p === 'settings.supply') {
      state.settings.vdLight = v === 'private' ? 6 : 3; state.settings.vdOther = v === 'private' ? 8 : 5;
      $('#l-vdl').value = state.settings.vdLight; $('#l-vdo').value = state.settings.vdOther;
    }
    if (p === 'settings.system') {
      fillWays(); $('#s-ways').value = state.settings.ways;
      if (!sysThree()) state.rows.forEach(r => { r.ph = 1; r.phase = 'L1'; });
      renderTable();
    }
    if (p === 'settings.project') { libCat = 'rec'; renderLibrary(); buildDF(); }
    if (p.endsWith('.method')) labelAmb();
    if (p.startsWith('meta.')) delete state.example;
    update();
  }

  // ---------- library
  function renderLibrary() {
    const proj = E.PROJECTS[state.settings.project] || E.PROJECTS.off;
    const chips = [['rec', `مقترح لـ${proj.ar}`], ['all', 'الكل'], ...Object.entries(E.CATS).filter(([k]) => k !== 'SP').map(([k, c]) => [k, c.ar])];
    $('#lib-chips').innerHTML = chips.map(([k, t]) => `<button type="button" class="chip${proj.rec.includes(k) ? ' rec' : ''}" data-chip="${k}" aria-pressed="${libCat === k}">${esc(t)}</button>`).join('');
    renderItems();
  }
  function renderItems() {
    const proj = E.PROJECTS[state.settings.project] || E.PROJECTS.off;
    const q = $('#lib-search').value.trim();
    let items = E.LIB.filter(it => it.cat !== 'SP');
    if (q) items = items.filter(it => (it.ar + ' ' + E.CATS[it.cat].ar).includes(q));
    else if (libCat === 'rec') items = proj.rec.flatMap(c => items.filter(it => it.cat === c));
    else if (libCat !== 'all') items = items.filter(it => it.cat === libCat);
    $('#lib-items').innerHTML = items.length ? items.map(it => {
      const va = E.unitVA(it);
      const val = it.unit === 'TR' ? `${it.val} TR · EER ${it.eer}` : `${it.val} ${USHORT[it.unit]}`;
      return `<button type="button" class="item" data-add="${it.id}" title="إضافة إلى الجدول"><span class="n">${esc(descOf(it))}</span><span class="add" aria-hidden="true">+</span><span class="m">${esc(val)} · ${f0(va)} VA · ${it.ph === 3 ? '3φ' : '1φ'}</span></button>`;
    }).join('') : `<p class="muted" style="margin:6px">لا توجد نتائج. جرّب كلمة أخرى أو أضف حملاً مخصصاً.</p>`;
  }
  function addRow(it) {
    const phase = sysThree() ? (it.ph === 3 ? '3P' : E.lightestPhase(state)) : 'L1';
    const row = rowFromItem(it, phase);
    if (!sysThree()) row.ph = 1;
    state.rows.push(row); delete state.example;
    renderTable(); update();
    const tr = $(`tr[data-id="${row.id}"]`);
    if (tr) { tr.scrollIntoView({ block: 'nearest' }); const d = $('input.desc', tr); if (d) d.focus({ preventScroll: true }); }
    toast(`أضيفت الدائرة: ${row.desc}`);
  }

  // ---------- schedule table
  function opt(v, t, sel) { return `<option value="${esc(v)}"${String(sel) === String(v) ? ' selected' : ''}>${esc(t)}</option>`; }
  function rowHTML(r) {
    const sp = r.cat === 'SP', three = sysThree();
    const id = r.id;
    const catSel = sp ? `<span class="muted">احتياطي</span>` : `<select data-f="cat" id="c-${id}" aria-label="الفئة">${Object.entries(E.CATS).filter(([k]) => k !== 'SP').map(([k, c]) => opt(k, c.ar, r.cat)).join('')}</select>`;
    const effCell = sp ? '—' : r.unit === 'kW' ? `<input type="number" data-f="eff" id="e-${id}" class="w44" min="0.3" max="1" step="0.01" value="${r.eff ?? 0.9}" aria-label="الكفاءة η">`
      : r.unit === 'TR' ? `<input type="number" data-f="eer" id="e-${id}" class="w44" min="5" max="25" step="0.1" value="${r.eer ?? 11}" aria-label="EER">` : '<span class="muted">—</span>';
    const phSel = `<select data-f="ph" id="h-${id}" aria-label="عدد الأطوار"${three ? '' : ' disabled'}>${opt(1, '1φ', r.ph)}${opt(3, '3φ', r.ph)}</select>`;
    const phaseSel = (three && r.ph === 3) ? '<span class="muted ltr">L1-L2-L3</span>' : `<select data-f="phase" id="p-${id}" aria-label="الطور"${three ? '' : ' disabled'}>${opt('L1', 'L1', r.phase)}${opt('L2', 'L2', r.phase)}${opt('L3', 'L3', r.phase)}</select>`;
    const brkSel = `<select data-f="brk" id="b-${id}" aria-label="القاطع"><option value="auto" data-c="brkauto"${r.brk === 'auto' ? ' selected' : ''}>تلقائي</option>${CB_LIST.map(v => opt(v, v + ' A', r.brk)).join('')}</select><span class="sub" data-c="dev"></span>`;
    const curveSel = `<select data-f="curve" id="k-${id}" aria-label="منحنى القاطع"><option value="" data-c="curveauto"${!r.curve ? ' selected' : ''}>تلقائي</option>${['B', 'C', 'D'].map(v => opt(v, v, r.curve || '-')).join('')}</select>`;
    const rcd = sp ? '' : `<input type="checkbox" data-f="rcd" id="x-${id}" aria-label="حماية تسرب RCD 30mA"${(r.rcd ?? E.CATS[r.cat].rcd) ? ' checked' : ''}>`;
    const cabSel = sp ? '<span class="muted">—</span>' : `<select data-f="cable" id="w-${id}" aria-label="مقطع الكابل"><option value="auto" data-c="cabauto"${r.cable === 'auto' ? ' selected' : ''}>تلقائي</option>${E.SIZES.map(v => opt(v, E.fmtSize(v) + ' mm²', r.cable)).join('')}</select><span class="sub" data-c="cab"></span>`;
    const modeSel = sp ? '' : `<select data-f="mode" id="o-${id}" aria-label="حالة التشغيل">${Object.entries(MODES).map(([k, t]) => opt(k, t, r.mode)).join('')}</select>`;
    return `<tr data-id="${id}">
      <td class="c0 cct"><span class="cct-in"><i class="dot" data-c="dot"></i><span data-c="cct"></span></span></td>
      <td class="c1"><input class="desc" type="text" data-f="desc" id="d-${id}" value="${esc(r.desc)}" aria-label="وصف الدائرة"></td>
      <td>${catSel}</td>
      <td>${sp ? '' : `<input type="number" data-f="qty" id="q-${id}" class="w44" min="0" step="1" value="${r.qty}" aria-label="العدد">`}</td>
      <td>${sp ? '' : `<input type="number" data-f="val" id="v-${id}" min="0" step="any" value="${r.val}" aria-label="القدرة للوحدة"> <select data-f="unit" id="u-${id}" aria-label="وحدة القدرة">${Object.entries(UNITS).map(([k, t]) => opt(k, t, r.unit)).join('')}</select>`}</td>
      <td>${sp ? '' : `<input type="number" data-f="pf" id="f-${id}" class="w44" min="0.1" max="1" step="0.01" value="${r.pf}" aria-label="معامل القدرة">`}</td>
      <td>${effCell}</td>
      <td>${phSel}</td>
      <td>${phaseSel}</td>
      <td class="n" data-c="va"></td>
      <td class="n phc" data-c="p1"></td><td class="n phc" data-c="p2"></td><td class="n phc" data-c="p3"></td>
      <td class="n" data-c="ib"></td>
      <td>${brkSel}</td>
      <td>${curveSel}</td>
      <td style="text-align:center">${rcd}</td>
      <td>${sp ? '' : `<input type="number" data-f="len" id="l-${id}" class="w44" min="0" step="1" value="${r.len}" aria-label="طول الدائرة بالمتر">`}</td>
      <td>${cabSel}</td>
      <td style="text-align:center"><span class="vd" data-c="vd"></span></td>
      <td>${modeSel}</td>
      <td>${sp ? '' : `<input type="number" data-f="df" id="z-${id}" class="w44" min="0" max="1" step="0.05" value="${r.df ?? ''}" aria-label="معامل الطلب للدائرة">`}</td>
      <td class="n" data-c="dem"></td>
      <td><span class="rowact">
        <button type="button" class="icon" data-act="up" aria-label="تحريك لأعلى">▲</button>
        <button type="button" class="icon" data-act="down" aria-label="تحريك لأسفل">▼</button>
        <button type="button" class="icon" data-act="dup" aria-label="تكرار الدائرة">⧉</button>
        <button type="button" class="icon del" data-act="del" aria-label="حذف الدائرة">✕</button>
      </span></td>
    </tr>`;
  }
  function renderTable() {
    const body = $('#sched-body');
    body.innerHTML = state.rows.length ? state.rows.map(rowHTML).join('')
      : `<tr><td colspan="24" class="empty">الجدول فارغ. اختر أحمالاً من المكتبة أعلاه، أو أضف حملاً مخصصاً.</td></tr>`;
  }
  const findRow = id => state.rows.find(r => r.id === id);
  function onTableInput(e) {
    const el = e.target, f = el.dataset.f; if (!f) return;
    const tr = el.closest('tr[data-id]'); if (!tr) return;
    const r = findRow(tr.dataset.id); if (!r) return;
    delete state.example;
    if (f === 'desc') { r.desc = el.value; scheduleSave(); return; }
    if (['qty', 'val', 'pf', 'eff', 'eer', 'len', 'df'].includes(f)) {
      const v = parseFloat(el.value);
      if (f === 'df') r.df = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : null;
      else if (Number.isFinite(v)) r[f] = f === 'pf' ? Math.max(0.1, Math.min(1, v)) : Math.max(0, v);
      else if (e.type === 'change') r[f] = 0;
      update();
    }
  }
  function onTableChange(e) {
    const el = e.target, f = el.dataset.f; if (!f) return;
    const tr = el.closest('tr[data-id]'); if (!tr) return;
    const r = findRow(tr.dataset.id); if (!r) return;
    delete state.example;
    if (['qty', 'val', 'pf', 'eff', 'eer', 'len', 'df', 'desc'].includes(f)) return onTableInput(e);
    let rebuild = false;
    switch (f) {
      case 'cat': r.cat = el.value; r.minIn = null; r.curve = null; r.rcd = null; rebuild = true; break;
      case 'unit': r.unit = el.value; if (r.unit === 'kW' && !r.eff) r.eff = 0.9; if (r.unit === 'TR' && !r.eer) r.eer = 11; rebuild = true; break;
      case 'ph': r.ph = Number(el.value); r.phase = r.ph === 3 ? '3P' : E.lightestPhase(state); rebuild = true; break;
      case 'phase': r.phase = el.value; break;
      case 'brk': r.brk = el.value === 'auto' ? 'auto' : Number(el.value); break;
      case 'cable': r.cable = el.value === 'auto' ? 'auto' : Number(el.value); break;
      case 'curve': r.curve = el.value || null; break;
      case 'rcd': r.rcd = el.checked; break;
      case 'mode': r.mode = el.value; break;
    }
    if (rebuild) renderTable();
    update();
  }
  function onTableClick(e) {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const tr = b.closest('tr[data-id]'); const i = state.rows.findIndex(r => r.id === tr.dataset.id); if (i < 0) return;
    const act = b.dataset.act; delete state.example;
    if (act === 'up' && i > 0) [state.rows[i - 1], state.rows[i]] = [state.rows[i], state.rows[i - 1]];
    else if (act === 'down' && i < state.rows.length - 1) [state.rows[i + 1], state.rows[i]] = [state.rows[i], state.rows[i + 1]];
    else if (act === 'dup') state.rows.splice(i + 1, 0, Object.assign(JSON.parse(JSON.stringify(state.rows[i])), { id: uid() }));
    else if (act === 'del') { const d = state.rows[i].desc; state.rows.splice(i, 1); toast(`حُذفت: ${d}`); }
    renderTable(); update();
    const again = $(`tr[data-id="${tr.dataset.id}"] [data-act="${act}"]`); if (again && act !== 'del') again.focus();
  }

  // ---------- computed rendering
  function update() {
    OUT = E.compute(state);
    renderComputed(); renderSummary(); renderBreakdown(); updateDFPlaceholders(); renderSettingNotes();
    scheduleSave();
  }
  function renderComputed() {
    const body = $('#sched-body');
    for (const x of OUT.rows) {
      const tr = body.querySelector(`tr[data-id="${x.id}"]`); if (!tr) continue;
      const set = (c, h) => { const el = tr.querySelector(`[data-c="${c}"]`); if (el) el.innerHTML = h; };
      const sp = x.r.cat === 'SP';
      tr.classList.toggle('spare', sp);
      tr.classList.toggle('mode-fire', x.mode === 'fire'); tr.classList.toggle('mode-standby', x.mode === 'standby');
      const dot = tr.querySelector('[data-c="dot"]'); dot.className = 'dot ' + (x.ph === 3 ? 'P3' : x.phase);
      set('cct', esc(x.cct || '—'));
      set('va', sp ? '—' : f0(x.VA));
      ['L1', 'L2', 'L3'].forEach((p, i) => { const el = tr.querySelector(`[data-c="p${i + 1}"]`); el.textContent = x.per[p] > 0 ? f0(x.per[p]) : ''; el.classList.toggle('on', x.per[p] > 0); });
      set('ib', sp ? '—' : fx(x.Ib, 1));
      const ba = tr.querySelector('[data-c="brkauto"]'); if (ba) ba.textContent = `تلقائي · ${x.brkAuto} A`;
      set('dev', esc(`${x.dev} · ${x.poles === 3 ? '3P' : '1P+N'}${x.rcd ? ' · 30mA' : ''}`));
      const ca = tr.querySelector('[data-c="curveauto"]'); if (ca) ca.textContent = `تلقائي · ${x.r.curve ? x.cat.curve : x.curve}`;
      if (!sp) {
        const cab = x.cable;
        const cb = tr.querySelector('[data-c="cabauto"]');
        if (cab.fail) { if (cb) cb.textContent = 'تلقائي · —'; set('cab', '<span class="flag">لا يوجد مقطع مناسب</span>'); set('vd', '—'); tr.querySelector('[data-c="vd"]').className = 'vd na'; }
        else {
          if (cb) cb.textContent = `تلقائي · ${E.fmtSize(cab.size)} mm²`;
          set('cab', `${esc(cab.label)} · Iz ${fx(cab.Iz, 1)}A${cab.okI ? '' : ' <span class="flag">!</span>'}`);
          const v = tr.querySelector('[data-c="vd"]'); v.textContent = fx(cab.vdTot, 2) + '%'; v.className = 'vd ' + (cab.okV ? 'ok' : 'bad');
        }
      } else { const v = tr.querySelector('[data-c="vd"]'); v.textContent = '—'; v.className = 'vd na'; }
      set('dem', sp ? '—' : f0(x.dem));
      const dfIn = tr.querySelector('[data-f="df"]'); if (dfIn) dfIn.placeholder = x.mode !== 'duty' ? '0' : fx(x.liftRule ? x.df : x.dfCat, 2);
    }
    const P = OUT.panel;
    $('#sched-foot').innerHTML = state.rows.length ? `
      <tr><td class="c0"></td><td class="c1 lbl">الحمل الموصول VA</td><td colspan="7"></td><td class="n">${f0(P.totConn)}</td><td class="n">${f0(P.conn.L1)}</td><td class="n">${f0(P.conn.L2)}</td><td class="n">${f0(P.conn.L3)}</td><td colspan="9"></td><td></td><td></td></tr>
      <tr><td class="c0"></td><td class="c1 lbl">الحمل المطلوب VA</td><td colspan="7"></td><td class="n">${f0(P.totDem)}</td><td class="n">${f0(P.dem.L1)}</td><td class="n">${f0(P.dem.L2)}</td><td class="n">${f0(P.dem.L3)}</td><td colspan="9"></td><td class="n">${f0(P.totDem)}</td><td></td></tr>
      <tr><td class="c0"></td><td class="c1 lbl">التيار المطلوب A</td><td colspan="7"></td><td class="n">${fx(P.IbPanel, 1)}</td><td class="n">${fx(P.Iph.L1, 1)}</td><td class="n">${fx(P.Iph.L2, 1)}</td><td class="n">${fx(P.Iph.L3, 1)}</td><td colspan="9"></td><td></td><td></td></tr>` : '';
  }
  function feederLabel(P) {
    const fd = P.feeder; if (fd.fail) return '—';
    const cores = OUT.sys.threeP ? 4 : 2;
    return `${fd.n > 1 ? fd.n + '×(' : ''}${cores}C×${E.fmtSize(fd.size)} + ${E.fmtSize(E.earthSize(fd.size))}E${fd.n > 1 ? ')' : ''}`;
  }
  function renderSummary() {
    const P = OUT.panel, s = state.settings, three = OUT.sys.threeP;
    const kW = OUT.rows.reduce((a, x) => a + x.VA * (x.r.pf || 1), 0);
    const heavy = three ? ['L1', 'L2', 'L3'].reduce((a, p) => (P.dem[p] > P.dem[a] ? p : a), 'L1') : 'L1';
    const imbOk = P.imbDem <= s.imbLimit;
    const free = OUT.waysTotal - OUT.waysUsed;
    const feederOk = !P.feeder.fail && P.feeder.okI && P.feeder.okV;
    const tiles = [
      ['الحمل الموصول', `${fx(P.totConn / 1000, 1)} <small>kVA</small>`, `${bd(fx(kW / 1000, 1) + ' kW')} · PF متوسط ${bd(fx(P.pfAvg, 2))}`],
      ['الحمل المطلوب', `${fx(P.totDem / 1000, 1)} <small>kVA</small>`, `DF الكلي ${bd(fx(P.dfAll, 2))}`],
      ['تيار التصميم Ib', `${fx(P.IbPanel, 1)} <small>A</small>`, three ? `أثقل طور ${bd(heavy)} · مع احتياطي ${bd(s.spare + '%')}: ${bd(fx(P.design, 1) + ' A')}` : `مع احتياطي ${bd(s.spare + '%')}: ${bd(fx(P.design, 1) + ' A')}`],
      ['القاطع الرئيسي', `${P.mainIn} <small>A</small>`, bd(`${P.mainDev} ${three ? '4P' : '2P'} · Busbar ${P.bus} A`), 'main'],
      ['كابل التغذية', `<span style="font-size:15px">${esc(feederLabel(P))}</span>`, P.feeder.fail ? '<span class="pill crit">لا يوجد مقطع مناسب</span>' : `${bd('Iz ' + fx(P.feeder.Iz, 0) + ' A')} · ${bd('ΔV ' + fx(P.feeder.vd, 2) + '%')} على ${bd(s.feeder.len + ' m')} ${feederOk ? '' : '<span class="pill crit">راجع</span>'}`]
    ];
    if (three) {
      tiles.push(['عدم اتزان الأطوار', `${fx(P.imbDem, 1)} <small>%</small>`, `<span class="pill ${imbOk ? 'good' : 'crit'}">${imbOk ? 'ضمن الحد' : 'يتجاوز الحد'}</span> الموصول ${bd(fx(P.imbConn, 1) + '%')} · الحد ${bd(s.imbLimit + '%')}`]);
      tiles.push(['تيار المحايد', `${fx(P.IN, 1)} <small>A</small>`, 'من عدم الاتزان، دون التوافقيات']);
    }
    tiles.push(['المخارج', `${OUT.waysUsed}/${OUT.waysTotal}`, `فارغة ${bd(Math.max(0, free) + ' (' + (OUT.waysTotal ? fx(Math.max(0, free) / OUT.waysTotal * 100, 0) : 0) + '%)')} · المطلوب ${bd(s.spareWays + '%')}`]);
    $('#kpis').innerHTML = tiles.map(([k, v, sub, cls]) => `<div class="kpi${cls ? ' ' + cls : ''}"><span class="k">${k}</span><span class="v">${v}</span><span class="s">${sub}</span></div>`).join('');
    $('#sum-tag').textContent = state.meta.tag ? `— ${state.meta.tag}` : '';
    const sysLabel = { '3P': '400/230V 3φ', '380': '380/220V 3φ', '1P': '230V 1φ' }[s.system];
    $('#sum-basis').textContent = `${E.PROJECTS[s.project].ar} · ${sysLabel} · ${s.nec125 ? 'IEC + 125% للمستمر' : 'SBC 401 / IEC 60364'}`;

    const phs = three ? ['L1', 'L2', 'L3'] : ['L1'];
    const conn = three ? P.conn : { L1: P.totConn }, dem = three ? P.dem : { L1: P.totDem };
    const mx = Math.max(1, ...phs.map(p => conn[p]));
    $('#phase-bars').innerHTML = phs.map(p => `<div class="ph-row"><span class="ph-tag"><i class="dot ${p}"></i>${three ? p : 'L-N'}</span>
      <span class="bar" role="img" aria-label="${p}: مطلوب ${fx(dem[p] / 1000, 1)} من ${fx(conn[p] / 1000, 1)} kVA"><i class="conn" style="width:${conn[p] / mx * 100}%"></i><i class="dem" style="width:${dem[p] / mx * 100}%"></i></span>
      <span class="ph-val"><b>${fx(dem[p] / 1000, 1)}</b> / ${fx(conn[p] / 1000, 1)} kVA · ${fx(dem[p] / OUT.sys.VLN, 1)} A</span></div>`).join('');

    const order = { crit: 0, warn: 1, info: 2 };
    const W = OUT.warnings.slice().sort((a, b) => order[a.lvl] - order[b.lvl]);
    const nCrit = W.filter(w => w.lvl === 'crit').length;
    $('#warns').innerHTML = (W.some(w => w.lvl !== 'info') ? '' : `<div class="w good"><span>لا توجد مخالفات: القواطع والكابلات وهبوط الجهد والاتزان ضمن الحدود المحددة.</span></div>`)
      + W.map(w => `<div class="w ${w.lvl}"><span>${esc(w.t)}</span></div>`).join('');
    document.title = `جدول الأحمال التفاعلي${state.meta.tag ? ' — ' + state.meta.tag : ''}`;
    $('#sum-h').dataset.crit = nCrit;
  }
  function renderBreakdown() {
    const cats = Object.entries(OUT.cats).sort((a, b) => b[1].dem - a[1].dem);
    const tot = OUT.panel.totDem || 1;
    $('#cat-table').innerHTML = `<thead><tr><th>الفئة</th><th>الدوائر</th><th>الموصول kVA</th><th>DF الفعلي</th><th>المطلوب kVA</th><th>الحصة</th></tr></thead><tbody>`
      + (cats.length ? cats.map(([k, c]) => `<tr><td>${esc(E.CATS[k].ar)}</td><td class="n">${c.n}</td><td class="n">${fx(c.conn / 1000, 2)}</td><td class="n">${fx(c.conn ? c.dem / c.conn : 0, 2)}</td><td class="n">${fx(c.dem / 1000, 2)}</td><td><div style="display:flex;align-items:center;gap:8px"><span class="minibar" style="flex:1"><i style="width:${c.dem / tot * 100}%"></i></span><span class="mono" style="font-size:12px;min-width:40px">${fx(c.dem / tot * 100, 0)}%</span></div></td></tr>`).join('')
        : `<tr><td colspan="6" class="muted">لا توجد أحمال بعد.</td></tr>`)
      + `</tbody><tfoot><tr><th>المجموع</th><th></th><th class="mono">${fx(OUT.panel.totConn / 1000, 2)}</th><th class="mono">${fx(OUT.panel.dfAll, 2)}</th><th class="mono">${fx(OUT.panel.totDem / 1000, 2)}</th><th></th></tr></tfoot>`;
  }
  function buildDF() {
    $('#df-grid').innerHTML = Object.entries(E.CATS).filter(([k]) => k !== 'SP').map(([k, c]) => `<div class="field"><label for="df-${k}">${esc(c.ar)}${k === 'LF' ? ' <span class="muted">(1 / 0.75 / 0.6)</span>' : ''}</label><input id="df-${k}" type="number" min="0" max="1" step="0.05" data-df="${k}" value="${state.dfOverride[k] ?? ''}"></div>`).join('');
    updateDFPlaceholders();
  }
  function updateDFPlaceholders() {
    const proj = E.PROJECTS[state.settings.project] || E.PROJECTS.off;
    $$('#df-grid [data-df]').forEach(el => { const k = el.dataset.df; el.placeholder = k === 'LF' ? 'تلقائي' : fx(proj.df[k] ?? 1, 2); });
  }
  function renderSettingNotes() {
    const s = state.settings;
    const a = E.corrections(s.final), b = E.corrections(s.feeder);
    const t = c => `Ca ${fx(c.ca, 2)} × Cg ${fx(c.cg, 2)}${c.cs !== 1 ? ` × Cs ${fx(c.cs, 2)}` : ''} = ${fx(c.k, 3)}`;
    $('#cf-final').textContent = t(a); $('#cf-feeder').textContent = t(b);
    const P = OUT.panel;
    $('#s-main option[value="auto"]').textContent = `تلقائي · ${s.mainOverride === 'auto' ? P.mainIn : E.BRK.find(v => v >= Math.max(P.design, 16))} A`;
    const fdAuto = $('#d-cable option[value="auto"]');
    fdAuto.textContent = s.feeder.override === 'auto' && !P.feeder.fail ? `تلقائي · ${E.fmtSize(P.feeder.size)} mm²` : 'تلقائي';
  }

  // ---------- persistence
  let saveT = null;
  function scheduleSave() { clearTimeout(saveT); saveT = setTimeout(() => ls.set(LS_CUR, JSON.stringify(state)), 500); }
  async function initPlatform() {
    for (let i = 0; i < 40 && !(window.claude && typeof window.claude.use === 'function'); i++) await new Promise(r => setTimeout(r, 100));
    if (!(window.claude && typeof window.claude.use === 'function')) { STANDALONE = true; updateExportUI(); return; } // opened directly (e.g. from GitHub)
    try { DL = await window.claude.use('downloads'); } catch (e) { DL = null; }
    try {
      const db = await window.claude.use('db'); const user = await window.claude.use('user');
      if (db && user) { const id = await user.id(); if (id) STORE = { kind: 'db', col: db.collection('data/users/' + id) }; }
    } catch (e) { STORE = { kind: 'local' }; }
    updateExportUI();
  }
  function updateExportUI() {
    const can = !!DL || STANDALONE;
    ['#ex-xlsx', '#ex-print', '#ex-csv', '#ex-json'].forEach(s => { const b = $(s); b.disabled = !can; b.title = can ? '' : 'التنزيل غير متاح في هذا العرض. استخدم النسخ للصق في Excel.'; });
    if (!window.XLSX) $('#ex-xlsx').title = 'مكتبة Excel لم تُحمّل. استخدم CSV.';
  }
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout' }), ms))]);
  function savedLocal() { try { return JSON.parse(ls.get(LS_SAVED) || '{}') || {}; } catch (e) { return {}; } }
  function panelBody() {
    return { kind: 'panel', tag: state.meta.tag || 'بدون رمز', project: state.meta.project || '', type: state.settings.project, rows: state.rows.length, updated: Date.now(), state: JSON.parse(JSON.stringify(state)) };
  }
  async function saveCurrent() {
    delete state.example;
    const body = panelBody();
    if (STORE.kind === 'db') {
      try { await withTimeout(STORE.col.doc('panel_' + state.id).set(body), 10000); toast(`حُفظت اللوحة ${body.tag} في حسابك.`); return true; }
      catch (e) { if (e && e.code === 'quota_exceeded') { toast('المساحة ممتلئة. احذف لوحات قديمة ثم أعد الحفظ.'); return false; } toast('تعذر الحفظ في الحساب، حُفظت في هذا المتصفح.'); }
    }
    const all = savedLocal(); all[state.id] = body;
    if (ls.set(LS_SAVED, JSON.stringify(all))) { toast(`حُفظت اللوحة ${body.tag} في هذا المتصفح.`); return true; }
    toast('لا يمكن الحفظ هنا. صدّر نسخة JSON للاحتفاظ باللوحة.'); return false;
  }
  async function listSaved() {
    if (STORE.kind === 'db') {
      const snap = await withTimeout(STORE.col.get(), 10000);
      return snap.docs.filter(d => d.id.startsWith('panel_')).map(d => Object.assign({ _id: d.id }, d.data()));
    }
    return Object.entries(savedLocal()).map(([k, v]) => Object.assign({ _id: k }, v));
  }
  async function deleteSaved(item) {
    if (STORE.kind === 'db') return withTimeout(STORE.col.doc(item._id).delete(), 10000);
    const all = savedLocal(); delete all[item._id]; ls.set(LS_SAVED, JSON.stringify(all));
  }
  async function openSavedDialog() {
    showModal('لوحاتي المحفوظة', `<p class="muted" style="margin:0 0 8px">${STORE.kind === 'db' ? 'محفوظة في حسابك وتظهر لك وحدك.' : 'محفوظة في هذا المتصفح فقط. للاحتفاظ بها خارجه صدّر نسخة JSON.'}</p><div class="saved" id="saved-list"><p class="muted">جارٍ التحميل…</p></div>`, [['إغلاق', closeModal]]);
    let items;
    try { items = await listSaved(); } catch (e) { $('#saved-list').innerHTML = `<p class="muted">تعذر الوصول إلى اللوحات المحفوظة الآن. حاول لاحقاً.</p>`; return; }
    items.sort((a, b) => (b.updated || 0) - (a.updated || 0));
    const box = $('#saved-list');
    if (!items.length) { box.innerHTML = '<p class="muted">لا توجد لوحات محفوظة بعد. استخدم «حفظ اللوحة».</p>'; return; }
    box.innerHTML = items.map((it, i) => `<div class="saved-item"><div><div class="t">${esc(it.tag)}${it.project ? ' — ' + esc(it.project) : ''}</div><div class="d">${esc((E.PROJECTS[it.type] || {}).ar || '')} · ${it.rows || 0} دائرة · ${it.updated ? new Date(it.updated).toLocaleString('ar-SA-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' }) : ''}</div></div>
      <div class="actions"><button type="button" class="btn sm primary" data-open="${i}">فتح</button><button type="button" class="btn sm" data-del="${i}">حذف</button></div></div>`).join('');
    box.onclick = async ev => {
      const o = ev.target.closest('[data-open]'), d = ev.target.closest('[data-del]');
      if (o) { const it = items[+o.dataset.open]; setState(normalize(it.state)); closeModal(); hideBanner(); toast(`فُتحت اللوحة ${it.tag}.`); }
      if (d) {
        if (d.dataset.confirm !== '1') { d.dataset.confirm = '1'; d.textContent = 'تأكيد الحذف'; d.classList.add('primary'); return; }
        const it = items[+d.dataset.del];
        try { await deleteSaved(it); d.closest('.saved-item').remove(); toast(`حُذفت اللوحة ${it.tag}.`); } catch (e) { toast('تعذر الحذف الآن.'); }
      }
    };
  }

  // ---------- export
  const sysLabel = () => ({ '3P': '3φ 4W + PE · 400/230V · 60Hz', '380': '3φ 4W + PE · 380/220V · 60Hz', '1P': '1φ 2W + PE · 230V · 60Hz' }[state.settings.system]);
  const fileBase = () => (state.meta.tag || 'Panel').replace(/[^\w؀-ۿ-]+/g, '_');
  const HEAD = ['الدائرة', 'الوصف', 'الفئة', 'العدد', 'القدرة للوحدة', 'الوحدة', 'PF', 'الأطوار', 'الطور', 'VA الكلي', 'L1 VA', 'L2 VA', 'L3 VA', 'Ib A', 'القاطع A', 'النوع', 'المنحنى', 'الأقطاب', 'RCD', 'الكابل', 'الطول m', 'ΔV % كلي', 'التشغيل', 'DF', 'الطلب VA'];
  function rowCells(x) {
    const sp = x.r.cat === 'SP', r = x.r, c = x.cable;
    return [x.cct, r.desc, x.cat.ar, sp ? '' : r.qty, sp ? '' : r.val, sp ? '' : UNITS[r.unit], sp ? '' : r.pf, x.ph === 3 ? '3φ' : '1φ', x.ph === 3 ? 'L1-L2-L3' : x.phase,
      sp ? 0 : Math.round(x.VA), Math.round(x.per.L1), Math.round(x.per.L2), Math.round(x.per.L3), sp ? 0 : E.r2(x.Ib, 1), x.In, x.dev, x.curve, x.poles === 3 ? '3P' : '1P+N', x.rcd ? '30mA' : '',
      sp || !c || c.fail ? (sp ? '' : 'غير متاح') : c.label, sp ? '' : r.len, sp || !c || c.fail ? '' : E.r2(c.vdTot, 2), MODES[x.mode] || '', sp ? '' : E.r2(x.df, 2), sp ? 0 : Math.round(x.dem)];
  }
  function summaryPairs() {
    const P = OUT.panel, s = state.settings;
    return [
      ['الحمل الموصول kVA', E.r2(P.totConn / 1000, 2)], ['الحمل المطلوب kVA', E.r2(P.totDem / 1000, 2)], ['DF الكلي', E.r2(P.dfAll, 2)],
      ['Ib من أثقل طور A', E.r2(P.IbPanel, 1)], [`تيار التصميم مع احتياطي ${s.spare}% A`, E.r2(P.design, 1)],
      ['القاطع الرئيسي', `${P.mainIn} A ${P.mainDev}`], ['Busbar', `${P.bus} A`], ['كابل التغذية', feederLabel(P)],
      ['قدرة كابل التغذية بعد التصحيح A', P.feeder.fail ? '' : E.r2(P.feeder.Iz, 0)], [`هبوط جهد المغذي % (${s.feeder.len} m)`, P.feeder.fail ? '' : E.r2(P.feeder.vd, 2)],
      ['عدم الاتزان (مطلوب / موصول) %', `${E.r2(P.imbDem, 1)} / ${E.r2(P.imbConn, 1)}`], ['تيار المحايد A', E.r2(P.IN, 1)],
      ['المخارج المستخدمة', `${OUT.waysUsed} / ${OUT.waysTotal}`], ['تيار القصر عند اللوحة / Icu kA', `${s.isc} / ${s.icu}`]
    ];
  }
  function buildAOA() {
    const m = state.meta, s = state.settings, P = OUT.panel;
    const aoa = [
      ['جدول الأحمال — Panel Schedule'],
      ['المشروع', m.project, 'اللوحة', m.tag, 'مغذاة من', m.fedFrom],
      ['الموقع', m.location, 'النظام', sysLabel(), 'نوع المشروع', E.PROJECTS[s.project].ar],
      ['أساس الحساب', s.nec125 ? 'SBC 401 / IEC 60364 + 125% للأحمال المستمرة' : 'SBC 401 / IEC 60364-5-52', 'تمديد الدوائر', `${s.final.method} · ${s.final.ins} · ${s.final.amb}°C · تجميع ${s.final.group}`, 'تمديد المغذي', `${s.feeder.method} · ${s.feeder.ins} · ${s.feeder.amb}°C · ${s.feeder.len} m`],
      [], HEAD, ...OUT.rows.map(rowCells), [],
      ['', 'الحمل الموصول VA', '', '', '', '', '', '', '', Math.round(P.totConn), Math.round(P.conn.L1), Math.round(P.conn.L2), Math.round(P.conn.L3)],
      ['', 'الحمل المطلوب VA', '', '', '', '', '', '', '', Math.round(P.totDem), Math.round(P.dem.L1), Math.round(P.dem.L2), Math.round(P.dem.L3)],
      ['', 'التيار المطلوب A', '', '', '', '', '', '', '', E.r2(P.IbPanel, 1), E.r2(P.Iph.L1, 1), E.r2(P.Iph.L2, 1), E.r2(P.Iph.L3, 1)],
      [], ['الملخص'], ...summaryPairs(), [], ['الملاحظات'], ...OUT.warnings.map(w => [w.lvl === 'crit' ? 'حرج' : w.lvl === 'warn' ? 'تنبيه' : 'معلومة', w.t])
    ];
    return aoa;
  }
  async function saveFile(filename, data) {
    if (!DL && STANDALONE) { // plain browser: ordinary download
      try {
        const url = URL.createObjectURL(new Blob([data]));
        const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000); toast(`جُهّز الملف ${filename}.`);
      } catch (e) { toast('تعذر تجهيز الملف في هذا المتصفح.'); }
      return;
    }
    if (!DL) { toast('التنزيل غير متاح في هذا العرض. استخدم «نسخ الجدول للصق في Excel».'); return; }
    try { const r = await DL.save({ filename, data }); if (r && r.status === 'saved') toast(`جُهّز الملف ${filename}.`); }
    catch (e) {
      const c = e && e.code;
      toast(c === 'declined' ? 'أُلغي التنزيل.' : c === 'rate_limited' ? 'هناك طلب تنزيل مفتوح. انتظر لحظة ثم أعد المحاولة.' : c === 'extension_not_enabled' ? 'هذه الصيغة غير متاحة في هذا العرض.' : 'تعذر تجهيز الملف الآن.');
    }
  }
  async function exportXLSX() {
    if (!window.XLSX) { toast('مكتبة Excel لم تُحمّل. استخدم CSV أو النسخ للصق.'); return; }
    const aoa = buildAOA();
    const ws = window.XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [8, 34, 16, 7, 10, 10, 6, 7, 9, 10, 9, 9, 9, 8, 9, 9, 8, 8, 7, 22, 8, 9, 10, 6, 10].map(w => ({ wch: w }));
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, (state.meta.tag || 'Panel').replace(/[\\/?*[\]:]/g, '-').slice(0, 30) || 'Panel');
    wb.Workbook = { Views: [{ RTL: true }] };
    const arr = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    await saveFile(fileBase() + '.xlsx', new Uint8Array(arr));
  }
  function csvCell(v) { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  async function exportCSV() { await saveFile(fileBase() + '.csv', '﻿' + buildAOA().map(r => r.map(csvCell).join(',')).join('\r\n')); }
  async function exportJSON() { await saveFile(fileBase() + '.json', JSON.stringify({ app: 'panel-schedule', v: 1, state }, null, 2)); }
  function tsv() { return buildAOA().map(r => r.map(v => String(v ?? '').replace(/[\t\n]/g, ' ')).join('\t')).join('\n'); }
  async function copyTSV() {
    const t = tsv();
    try { await navigator.clipboard.writeText(t); toast('نُسخ الجدول. الصقه في خلية A1 في Excel.'); }
    catch (e) { showModal('انسخ الجدول يدوياً', `<p class="muted" style="margin:0 0 8px">حدّد النص كله وانسخه، ثم الصقه في Excel.</p><textarea class="json" id="tsv-box" readonly aria-label="نص الجدول"></textarea>`, [['إغلاق', closeModal]]); $('#tsv-box').value = t; $('#tsv-box').select(); }
  }
  function printHTML() {
    const m = state.meta, s = state.settings, P = OUT.panel;
    const head = ['الدائرة', 'الوصف', 'العدد × القدرة', 'VA', 'L1', 'L2', 'L3', 'Ib A', 'القاطع', 'RCD', 'الكابل mm²', 'الطول m', 'ΔV %', 'DF', 'الطلب VA'];
    const rows = OUT.rows.map(x => {
      const sp = x.r.cat === 'SP', c = x.cable;
      const qv = sp ? 'احتياطي' : `${x.r.qty} × ${x.r.val} ${UNITS[x.r.unit]}`;
      return `<tr${sp ? ' class="sp"' : ''}><td>${esc(x.cct)}</td><td class="t">${esc(x.r.desc)}</td><td>${esc(qv)}</td><td>${sp ? '' : f0(x.VA)}</td><td>${x.per.L1 ? f0(x.per.L1) : ''}</td><td>${x.per.L2 ? f0(x.per.L2) : ''}</td><td>${x.per.L3 ? f0(x.per.L3) : ''}</td><td>${sp ? '' : fx(x.Ib, 1)}</td><td>${x.In}A ${esc(x.dev)} ${x.curve} ${x.poles === 3 ? '3P' : '1P+N'}</td><td>${x.rcd ? '30mA' : ''}</td><td>${sp ? '' : c && !c.fail ? esc(c.label) : '—'}</td><td>${sp ? '' : x.r.len}</td><td>${sp || !c || c.fail ? '' : fx(c.vdTot, 2)}</td><td>${sp ? '' : fx(x.df, 2)}</td><td>${sp ? '' : f0(x.dem)}</td></tr>`;
    }).join('');
    const sum = summaryPairs().map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');
    const warns = OUT.warnings.map(w => `<li>${esc(w.t)}</li>`).join('');
    return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(m.tag || 'Panel')} — جدول الأحمال</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600&display=swap" rel="stylesheet">
<style>@page{size:A3 landscape;margin:10mm}body{font-family:"IBM Plex Sans Arabic",Tahoma,Arial,sans-serif;font-size:11px;color:#111;margin:16px}
h1{font-size:18px;margin:0 0 6px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:3px 5px;text-align:center}
td.t{text-align:right}thead th{background:#e9ecef}tr.sp td{color:#777;background:#f6f6f6}.meta td,.meta th{text-align:right}.meta th{background:#f2f2f2;width:12%}
.foot td{font-weight:600;background:#f2f2f2}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px}.sum th{text-align:right;background:#f2f2f2;width:55%}
.btn{margin:8px 0;padding:6px 14px;font:inherit;cursor:pointer}@media print{.btn{display:none}}</style></head><body>
<button class="btn" onclick="window.print()">طباعة</button>
<h1>جدول الأحمال — ${esc(m.tag || '')}</h1>
<table class="meta"><tr><th>المشروع</th><td>${esc(m.project)}</td><th>مغذاة من</th><td>${esc(m.fedFrom)}</td><th>الموقع</th><td>${esc(m.location)}</td></tr>
<tr><th>النظام</th><td>${esc(sysLabel())}</td><th>نوع المشروع</th><td>${esc(E.PROJECTS[s.project].ar)}</td><th>أساس الحساب</th><td>${s.nec125 ? 'SBC 401 / IEC 60364 + 125% للمستمر' : 'SBC 401 / IEC 60364-5-52'}</td></tr></table>
<br><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody>
<tfoot class="foot"><tr><td></td><td class="t">الحمل الموصول</td><td></td><td>${f0(P.totConn)}</td><td>${f0(P.conn.L1)}</td><td>${f0(P.conn.L2)}</td><td>${f0(P.conn.L3)}</td><td colspan="8"></td></tr>
<tr><td></td><td class="t">الحمل المطلوب</td><td></td><td>${f0(P.totDem)}</td><td>${f0(P.dem.L1)}</td><td>${f0(P.dem.L2)}</td><td>${f0(P.dem.L3)}</td><td colspan="7"></td><td>${f0(P.totDem)}</td></tr>
<tr><td></td><td class="t">التيار المطلوب A</td><td></td><td>${fx(P.IbPanel, 1)}</td><td>${fx(P.Iph.L1, 1)}</td><td>${fx(P.Iph.L2, 1)}</td><td>${fx(P.Iph.L3, 1)}</td><td colspan="8"></td></tr></tfoot></table>
<div class="grid"><table class="sum">${sum}</table><div><b>ملاحظات التحقق</b><ul>${warns || '<li>لا توجد مخالفات ضمن الحدود المحددة.</li>'}</ul>
<p>تمديد الدوائر: ${esc(E.METHODS[s.final.method])} · ${s.final.ins} · ${s.final.amb}°C · تجميع ${s.final.group}. تمديد المغذي: ${esc(E.METHODS[s.feeder.method])} · ${s.feeder.ins} · ${s.feeder.amb}°C.</p>
<p>المعد: ____________ &nbsp; المراجع: ____________ &nbsp; التاريخ: ${new Date().toLocaleDateString('en-GB')}</p></div></div></body></html>`;
  }
  async function exportPrint() { await saveFile(fileBase() + '-print.html', printHTML()); }
  function importFile(file) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const o = JSON.parse(fr.result); const st = o.state || o;
        if (!st || !Array.isArray(st.rows)) throw new Error('bad');
        setState(normalize(st)); hideBanner(); toast(`استُوردت اللوحة ${state.meta.tag || ''}.`);
      } catch (e) { toast('الملف ليس نسخة لوحة صالحة. اختر ملف JSON صدّرته هذه الأداة.'); }
    };
    fr.readAsText(file);
  }

  // ---------- modal / toast / banner
  let lastFocus = null;
  function showModal(title, html, buttons) {
    lastFocus = document.activeElement;
    $('#modal-title').textContent = title; $('#modal-body').innerHTML = html;
    $('#modal-foot').innerHTML = ''; buttons.forEach(([t, fn, primary]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn' + (primary ? ' primary' : ''); b.textContent = t; b.onclick = fn; $('#modal-foot').appendChild(b); });
    $('#modal').hidden = false; const f = $('#modal-foot button'); if (f) f.focus();
  }
  function closeModal() { $('#modal').hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  let toastT = null;
  function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 3200); }
  function hideBanner() { $('#example-banner').hidden = true; }

  // ---------- wiring
  function setState(s) { state = s; renderSettings(); renderLibrary(); buildDF(); renderTable(); update(); }
  function newPanel() {
    showModal('بدء لوحة جديدة؟', '<p style="margin:0">سيُمسح الجدول الحالي من الشاشة مع الإبقاء على نوع المشروع وظروف التركيب. احفظه أولاً إن كنت تحتاجه.</p>', [
      ['حفظ ثم بدء جديد', async () => { if (await saveCurrent()) { closeModal(); start(); } }, true],
      ['بدء جديد دون حفظ', () => { closeModal(); start(); }],
      ['إلغاء', closeModal]
    ]);
    const start = () => { const st = newState(state.settings); st.settings.mainOverride = 'auto'; st.settings.feeder.override = 'auto'; setState(st); hideBanner(); $('#m-tag').focus(); };
  }
  function bind() {
    document.addEventListener('input', e => { if (e.target.matches('input[data-s]:not([type=checkbox])')) onSetting(e.target); });
    document.addEventListener('change', e => { if (e.target.matches('select[data-s], input[type=checkbox][data-s]')) onSetting(e.target); });
    const body = $('#sched-body');
    body.addEventListener('input', onTableInput); body.addEventListener('change', onTableChange); body.addEventListener('click', onTableClick);
    $('#lib-chips').addEventListener('click', e => { const c = e.target.closest('[data-chip]'); if (!c) return; libCat = c.dataset.chip; $('#lib-search').value = ''; renderLibrary(); });
    $('#lib-search').addEventListener('input', renderItems);
    $('#lib-items').addEventListener('click', e => { const b = e.target.closest('[data-add]'); if (b) addRow(lib(b.dataset.add)); });
    $('#df-grid').addEventListener('input', e => { const el = e.target; if (!el.dataset.df) return; const v = parseFloat(el.value); if (Number.isFinite(v)) state.dfOverride[el.dataset.df] = Math.max(0, Math.min(1, v)); else delete state.dfOverride[el.dataset.df]; update(); });
    $('#btn-df-reset').onclick = () => { state.dfOverride = {}; buildDF(); update(); toast('أعيدت معاملات الطلب لقيم نوع المشروع.'); };
    $('#btn-balance').onclick = () => { if (!sysThree()) { toast('اللوحة أحادية الطور.'); return; } const before = OUT.panel.imbDem; E.balance(state); delete state.example; renderTable(); update(); toast(`وُزعت الدوائر: عدم الاتزان ${fx(before, 1)}% ← ${fx(OUT.panel.imbDem, 1)}%`); };
    $('#btn-custom').onclick = () => addRow({ id: 'custom', cat: 'DS', ar: 'حمل مخصص', unit: 'VA', val: 1000, pf: 0.9, ph: 1 });
    $('#btn-sp1').onclick = () => addRow(lib('sp-1'));
    $('#btn-sp3').onclick = () => addRow(lib('sp-3'));
    $('#btn-new').onclick = newPanel;
    $('#btn-save').onclick = saveCurrent;
    $('#btn-open').onclick = openSavedDialog;
    $('#btn-hide-banner').onclick = () => { hideBanner(); ls.set(LS_BANNER, '1'); };
    const menu = $('#menu-export');
    const closeMenu = () => menu.removeAttribute('open');
    $('#ex-xlsx').onclick = () => { closeMenu(); exportXLSX(); };
    $('#ex-csv').onclick = () => { closeMenu(); exportCSV(); };
    $('#ex-print').onclick = () => { closeMenu(); exportPrint(); };
    $('#ex-json').onclick = () => { closeMenu(); exportJSON(); };
    $('#ex-copy').onclick = () => { closeMenu(); copyTSV(); };
    $('#ex-import').onclick = () => { closeMenu(); $('#file-import').click(); };
    $('#file-import').onchange = e => { const f = e.target.files && e.target.files[0]; if (f) importFile(f); e.target.value = ''; };
    document.addEventListener('click', e => { if (menu.open && !menu.contains(e.target)) closeMenu(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('#modal').hidden) closeModal(); else closeMenu(); } });
    $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  }

  // ---------- init
  fillStaticOptions();
  bind();
  let initial = null;
  try { const raw = ls.get(LS_CUR); if (raw) { const o = JSON.parse(raw); if (o && Array.isArray(o.rows)) initial = normalize(o); } } catch (e) { initial = null; }
  setState(initial || exampleState());
  if (!state.example || ls.get(LS_BANNER) === '1') hideBanner();
  updateExportUI();
  initPlatform();
})();
