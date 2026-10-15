/* =====================================================================
   DE R$ 1 A R$ 1 MILHÃO EM 7 DIAS — o jogo (tela, animações, slides)
   As regras ficam em core.js; o catálogo em data.js.
   ===================================================================== */
(() => {
  'use strict';
  const D = window.GAMEDATA, M = window.MAPDATA;
  Object.assign(M.cities, D.CITIES);
  const LS_STATE = 'milhao_state', LS_OVR = 'milhao_overrides', LS_SET = 'milhao_settings';
  const $ = s => document.querySelector(s);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const H = 60;

  /* ------------------------------------------------------------------ */
  /*  Estado e configurações                                            */
  /* ------------------------------------------------------------------ */
  const store = {
    get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const DEF_SET = { skipAnim: false, mute: false, advance: 'click', introAuto: true, lockMenu: false, sleepH: D.DEFAULTS.sleepH, maxAwakeH: D.DEFAULTS.maxAwakeH, food: D.DEFAULTS.food, crit: true };
  let SET = Object.assign({}, DEF_SET, store.get(LS_SET) || {});
  let OVR = store.get(LS_OVR) || {};
  const CORE = window.MILHAO_CORE.make(D, M, () => ({ sleepH: SET.sleepH, maxAwakeH: SET.maxAwakeH, food: SET.food }));
  let S = store.get(LS_STATE);
  if (!S || S.v !== 1) S = CORE.fresh();
  const save = () => { store.set(LS_STATE, S); NETR.state(); };
  const saveSet = () => { store.set(LS_SET, SET); };
  const saveOvr = () => { store.set(LS_OVR, OVR); };
  const cityOf = id => M.cities[id];
  const countryName = code => (M.names && M.names[code]) || code;

  function getAction(id) {
    const a = D.ACTIONS.find(x => x.id === id);
    if (!a) return null;
    const o = OVR[id];
    if (!o) return a;
    const r = Object.assign({}, a, o);
    if (a.flex && o.flex) r.flex = Object.assign({}, a.flex, o.flex);
    return r;
  }

  /* ------------------------------------------------------------------ */
  /*  Formatação                                                        */
  /* ------------------------------------------------------------------ */
  const nf = new Intl.NumberFormat('pt-BR');
  const fmtFull = v => (v < -0.5 ? '−' : '') + 'R$ ' + nf.format(Math.round(Math.abs(v)));
  const fmtSigned = v => (v >= 0 ? '+' : '−') + 'R$ ' + nf.format(Math.round(Math.abs(v)));
  function trimNum(x, d) { return nf.format(Number(x.toFixed(d))); }
  function fmtShort(v) {
    const a = Math.abs(v);
    if (a >= 1e6) return 'R$ ' + trimNum(v / 1e6, a >= 1e7 ? 1 : 2) + ' mi';
    if (a >= 1e4) return 'R$ ' + trimNum(v / 1e3, a >= 1e5 ? 0 : 1) + ' mil';
    return fmtFull(v);
  }
  function fmtRemain(min) {
    min = Math.max(0, Math.round(min));
    if (min >= 1440) { const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60); return `${d} ${d > 1 ? 'dias' : 'dia'} ${h}h`; }
    const h = Math.floor(min / 60), m = min % 60;
    return `${h}h ${String(m).padStart(2, '0')}min`;
  }
  function fmtDur(min) {
    min = Math.round(min);
    if (min >= 1440) { const d = Math.floor(min / 1440), h = Math.round((min % 1440) / 60); return `${d} ${d > 1 ? 'dias' : 'dia'}` + (h ? ` ${h}h` : ''); }
    const h = Math.floor(min / 60), m = min % 60;
    if (!h) return `${m}min`;
    return `${h}h` + (m ? ` ${m}min` : '');
  }
  const fmtPct = p => (p < 0.01 ? p.toFixed(4) : p < 1 ? p.toFixed(2) : p < 10 ? p.toFixed(1) : p.toFixed(0)).replace('.', ',') + '%';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clockTxt = el => { const c = CORE.clock(S, el); return `DIA ${c.day} · ${c.wd.toUpperCase()} · ${c.txt}`; };
  const whenTxt = el => { const c = CORE.clock(S, el); return `dia ${c.day} às ${c.txt}`; };
  const placeName = id => { const c = cityOf(id); if (!c) return ''; const n = countryName(c.country); return n === 'Brasil' ? c.name : `${c.name}, ${n}`; };

  /* ------------------------------------------------------------------ */
  /*  Sons                                                              */
  /* ------------------------------------------------------------------ */
  let AC = null;
  function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
  function tone(f, dur, { type = 'sine', vol = 0.08, at = 0, slide = 0 } = {}) {
    const c = ac(); if (!c || SET.mute) return;
    const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, { vol = 0.06, f0 = 400, f1 = 1600, at = 0, q = 1.4 } = {}) {
    const c = ac(); if (!c || SET.mute) return;
    const t = c.currentTime + at, len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf; bp.type = 'bandpass'; bp.Q.value = q;
    bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.55); bp.frequency.exponentialRampToValueAtTime(Math.max(40, f0 * 0.8), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(c.destination); src.start(t); src.stop(t + dur);
  }
  const SFX = {
    found() { tone(660, .12, { vol: .06 }); tone(990, .18, { vol: .05, at: .08 }); },
    cash() { tone(2093, .09, { type: 'triangle', vol: .06 }); tone(2637, .22, { type: 'triangle', vol: .06, at: .07 }); noise(.12, { vol: .05, f0: 4000, f1: 6000, at: .02 }); },
    coin() { tone(1760, .07, { type: 'triangle', vol: .05 }); tone(2349, .14, { type: 'triangle', vol: .045, at: .05 }); },
    pay() { tone(520, .12, { type: 'triangle', vol: .05, slide: 380 }); },
    tick() { tone(2400, .025, { type: 'square', vol: .012 }); },
    error() { tone(330, .16, { type: 'triangle', vol: .07, slide: 250 }); tone(240, .24, { type: 'triangle', vol: .06, at: .13, slide: 190 }); },
    travel() { noise(1.8, { vol: .05, f0: 350, f1: 1500 }); },
    bus() { noise(2.2, { vol: .05, f0: 120, f1: 260, q: .8 }); tone(70, 1.6, { vol: .05 }); },
    win() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, .35, { type: 'triangle', vol: .07, at: i * .11 })); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, .4, { type: 'sine', vol: .08, at: i * .2 })); },
    click() { tone(1200, .04, { vol: .03 }); },
    whoosh() { noise(.6, { vol: .04, f0: 900, f1: 2600 }); },
    thud() { tone(90, .45, { vol: .2, slide: 45 }); noise(.35, { vol: .12, f0: 180, f1: 90, q: .7 }); },
    zzz() { [392, 349, 330].forEach((f, i) => tone(f, .6, { vol: .04, at: i * .35 })); },
    milestone() { [392, 523, 659, 784].forEach((f, i) => tone(f, .5, { type: 'triangle', vol: .06, at: i * .09 })); tone(98, .6, { vol: .08 }); }
  };

  /* ------------------------------------------------------------------ */
  /*  Busca por texto (falsa liberdade)                                 */
  /* ------------------------------------------------------------------ */
  const STOP = new Set(('quero queria vou eu um uma uns umas o a os as de da do das dos e em no na nos nas pra pro para por com me meu minha ' +
    'que tipo algum alguma ai la aqui esse essa isso agora entao acho ne cara mano bora vamos ja tambem mais muito pouco bem so ' +
    'gostaria seria fazer faco fazendo tentar posso poderia dar algo coisa coisas tudo hoje').split(/\s+/));
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  function stem(w) {
    if (w.length <= 3) return w;
    if (/(oes|aes)$/.test(w)) return w.slice(0, -3) + 'ao';
    if (/eis$/.test(w)) return w.slice(0, -3) + 'el';
    if (/(res|zes)$/.test(w)) return w.slice(0, -2);
    if (/s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
    return w;
  }
  const toks = s => norm(s).split(' ').filter(w => w && !STOP.has(w)).map(stem);
  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    const m = a.length, n = b.length; let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
    return prev[n];
  }
  function sim(q, t) {
    if (q === t) return 1;
    const mn = Math.min(q.length, t.length);
    if (mn >= 4 && (t.startsWith(q) || q.startsWith(t))) return 0.8;
    if (mn >= 5 && lev(q, t) <= 1) return 0.75;
    if (mn >= 7 && lev(q, t) <= 2) return 0.6;
    return 0;
  }
  let INDEX = [];
  function buildIndex() {
    INDEX = D.ACTIONS.map(b => {
      const a = getAction(b.id);
      const w = new Map();
      const put = (txt, wt) => toks(txt).forEach(t => w.set(t, Math.max(w.get(t) || 0, wt)));
      put(a.name, 1.5); (a.aliases || []).forEach(x => put(x, 2)); (a.keys || []).forEach(x => put(x, 3));
      const phrases = [a.name, ...(a.aliases || [])].map(x => toks(x).join(' ')).filter(Boolean);
      const raws = [a.name, ...(a.aliases || [])].map(x => norm(x)).filter(x => x.length > 2);
      return { id: a.id, w, phrases, raws, block: !!a.block, hidden: !!a.hidden };
    });
  }
  buildIndex();
  function scoreAll(q) {
    const qt = [...new Set(toks(q))];
    const qPhrase = ' ' + qt.join(' ') + ' ', qRaw = ' ' + norm(q) + ' ';
    const out = [];
    for (const it of INDEX) {
      if (it.hidden) continue;
      let s = 0;
      for (const q1 of qt) {
        let best = 0;
        for (const [t, wt] of it.w) { const v = sim(q1, t) * wt; if (v > best) best = v; }
        if (best > 0) s += best; else if (!/^\d+$/.test(q1)) s -= 0.9;
      }
      let pb = 0; for (const p of it.phrases) if (qPhrase.includes(' ' + p + ' ')) pb = Math.max(pb, 2 + p.split(' ').length * 1.2);
      let rb = 0; for (const p of it.raws) if (qRaw.includes(' ' + p + ' ')) rb = Math.max(rb, 1.2 + p.split(' ').length * 0.6);
      out.push({ id: it.id, score: s + pb + rb, block: it.block });
    }
    return out.sort((a, b) => b.score - a.score);
  }
  function interpret(q) {
    if (!norm(q)) return { type: 'empty' };
    const r = scoreAll(q), best = r[0];
    if (best && best.score >= 3.2) return { type: best.block ? 'block' : 'action', id: best.id };
    if (best && best.score >= 1.2) return { type: 'suggest', id: best.id };
    return { type: 'notfound' };
  }

  /* ------------------------------------------------------------------ */
  /*  Mapa (reaproveitado do Trilhão)                                   */
  /* ------------------------------------------------------------------ */
  let stageScale = 1;
  const MW = M.w, MH = M.h, SW = M.sw || M.w, SH = M.sh || M.h, RS = MW / SW, VW = 1920, VH = 1080, W0 = 1920, H0 = 1920 * SH / SW, KX = W0 / SW, KY = H0 / SH;
  const IDX = new Uint8Array(MW * MH);
  (function decode() { let p = 0; const r = M.rle; for (let i = 0; i < r.length; i += 2) { IDX.fill(r[i], p, p + r[i + 1]); p += r[i + 1]; } })();
  const CODES = M.codes, codeIndex = {}; CODES.forEach((c, i) => codeIndex[c] = i + 1);
  const PIX = [], BOX = [];
  (function build() {
    const n = CODES.length + 1, cnt = new Uint32Array(n), bx = Array.from({ length: n }, () => [1e9, 1e9, -1, -1]);
    for (let i = 0; i < IDX.length; i++) { const k = IDX[i]; cnt[k]++; if (k) { const x = i % MW, y = (i / MW) | 0, b = bx[k]; if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; } }
    for (let k = 0; k < n; k++) PIX.push(new Uint32Array(cnt[k]));
    const pos = new Uint32Array(n);
    for (let i = 0; i < IDX.length; i++) { const k = IDX[i]; if (k) PIX[k][pos[k]++] = i; }
    bx.forEach(b => BOX.push(b));
  })();
  const cv = $('#mapCanvas'); cv.width = MW; cv.height = MH;
  const cx = cv.getContext('2d'), img = cx.createImageData(MW, MH), buf32 = new Uint32Array(img.data.buffer);
  const rgba = (r, g, b) => (255 << 24) | (b << 16) | (g << 8) | r;
  const COL = { current: rgba(150, 226, 243), visited: rgba(228, 247, 251), dest: rgba(190, 236, 246) };
  const PASTEL = [[214, 232, 255], [255, 240, 196], [255, 218, 230], [214, 244, 224], [233, 222, 252], [255, 226, 200], [206, 242, 240]];
  function pastelOf(code) { let h = 0; for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PASTEL[h % PASTEL.length]; }
  let hoverCode = null, destCode = null, lastPainted = [];
  function paint(code, color) { const k = codeIndex[code]; if (!k) return; const L = PIX[k]; for (let i = 0; i < L.length; i++) buf32[L[i]] = color; }
  function renderMapColors() {
    const cur = cityOf(S.city).country, jobs = [];
    S.visited.forEach(c => { if (c !== cur) jobs.push([c, COL.visited]); });
    if (destCode && destCode !== cur) jobs.push([destCode, COL.dest]);
    if (hoverCode && hoverCode !== cur) { const p = pastelOf(hoverCode); jobs.push([hoverCode, rgba(p[0], p[1], p[2])]); }
    jobs.push([cur, COL.current]);
    const touched = new Set(lastPainted.concat(jobs.map(j => j[0])));
    lastPainted.forEach(c => { const k = codeIndex[c]; if (k) { const L = PIX[k]; for (let i = 0; i < L.length; i++) buf32[L[i]] = 0; } });
    jobs.forEach(([c, col]) => paint(c, col));
    lastPainted = jobs.map(j => j[0]);
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    touched.forEach(c => { const k = codeIndex[c]; if (!k) return; const b = BOX[k]; if (b[2] < 0) return; x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]); });
    if (x1 >= 0) cx.putImageData(img, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  }
  const wrap = $('#mapWrap'), inner = $('#mapInner'), tip = $('#mapTip');
  const ZMAX = 4.2;
  function clampView(v) {
    const z = clamp(v.z, 1, ZMAX), h = H0 * z;
    const ty = h <= VH ? (VH - h) / 2 : clamp(v.ty, VH - h, 0);
    return { z, tx: clamp(v.tx, VW - W0 * z, 0), ty };
  }
  const worldView = () => clampView({ z: 1, tx: 0, ty: 0 });
  function viewOn(mx, my, z, fy = 0.5) { return clampView({ z, tx: VW / 2 - mx * KX * z, ty: VH * fy - my * KY * z }); }
  function viewFit(pts, pad = 1.6, fy = 0.52, zmax = 3.4) {
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const w = (Math.max(...xs) - Math.min(...xs)) * KX * pad + 300, h = (Math.max(...ys) - Math.min(...ys)) * KY * pad + 300;
    const z = clamp(Math.min(VW / w, (VH - 260) / h), 1, zmax);
    return viewOn((Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2, z, fy);
  }
  // visão "de casa": Brasil enquanto o jogador não sair da América do Sul
  const BR_BOX = [{ x: 416, y: 484 }, { x: 470, y: 716 }, { x: 556, y: 559 }, { x: 340, y: 559 }];
  const farAway = () => S.cities.some(id => { const c = cityOf(id); return c && (c.x > 700 || c.y < 420); });
  const homeView = () => farAway() ? worldView() : viewOn(452, 606, 2.75, 0.47);
  let view = homeView();
  function applyView() {
    inner.style.transform = `translate(${view.tx}px,${view.ty}px) scale(${view.z})`;
    wrap.classList.toggle('zoomed', view.z > 1.01);
    scaleMarkers();
  }
  let viewAnim = 0;
  function animateView(target, ms) {
    target = clampView(target);
    const run = ++viewAnim;
    return new Promise(res => {
      if (SET.skipAnim || ms <= 0) { view = target; applyView(); return res(); }
      const a = Object.assign({}, view), t0 = performance.now();
      const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      (function step(now) {
        if (run !== viewAnim) return res();
        const t = clamp((now - t0) / ms, 0, 1), e = ease(t);
        view = { z: a.z + (target.z - a.z) * e, tx: a.tx + (target.tx - a.tx) * e, ty: a.ty + (target.ty - a.ty) * e };
        applyView();
        if (t < 1) requestAnimationFrame(step); else res();
      })(t0);
    });
  }
  function localPt(e) { const r = $('#stage').getBoundingClientRect(); return { x: (e.clientX - r.left) / stageScale, y: (e.clientY - r.top) / stageScale }; }
  function zoomAt(px, py, nz) { const m = { x: (px - view.tx) / view.z, y: (py - view.ty) / view.z }; nz = clamp(nz, 1, ZMAX); viewAnim++; view = clampView({ z: nz, tx: px - m.x * nz, ty: py - m.y * nz }); applyView(); }
  wrap.addEventListener('wheel', e => { if (busy) return; e.preventDefault(); const p = localPt(e); zoomAt(p.x, p.y, view.z * Math.exp(-e.deltaY * 0.0016)); }, { passive: false });
  let drag = null;
  wrap.addEventListener('mousedown', e => { if (e.button !== 0 || view.z <= 1.01 || busy) return; const p = localPt(e); drag = { x: p.x, y: p.y, tx: view.tx, ty: view.ty }; wrap.classList.add('dragging'); });
  window.addEventListener('mousemove', e => { if (!drag) return; const p = localPt(e); viewAnim++; view = clampView({ z: view.z, tx: drag.tx + p.x - drag.x, ty: drag.ty + p.y - drag.y }); applyView(); });
  window.addEventListener('mouseup', () => { drag = null; wrap.classList.remove('dragging'); });
  function codeAtEvent(e) {
    const r = inner.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    const x = Math.floor(fx * MW), y = Math.floor(fy * MH);
    const k = (x >= 0 && y >= 0 && x < MW && y < MH) ? IDX[y * MW + x] : 0;
    return { code: k ? CODES[k - 1] : null, k, mx: fx * SW, my: fy * SH };
  }
  wrap.addEventListener('dblclick', e => {
    if (busy) return;
    const h = codeAtEvent(e);
    if (h.code) {
      const b = BOX[h.k].map(v => v / RS), bw = (b[2] - b[0] + 1) * KX, bh = (b[3] - b[1] + 1) * KY;
      animateView(viewOn((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, clamp(Math.min(VW / (bw * 2), VH / (bh * 2)), 1.6, ZMAX)), 700);
    } else animateView(viewOn(h.mx, h.my, Math.min(ZMAX, view.z * 1.6)), 600);
  });
  $('#zoomCtl').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || busy) return;
    if (b.dataset.z === 'reset') return animateView(homeView(), 700);
    if (b.dataset.z === 'world') return animateView(worldView(), 700);
    const cxp = (VW / 2 - view.tx) / view.z / KX, cyp = (VH / 2 - view.ty) / view.z / KY;
    animateView(viewOn(cxp, cyp, view.z * (b.dataset.z === 'in' ? 1.45 : 1 / 1.45)), 400);
  });

  // dica ao passar o mouse
  const ACT_BY_COUNTRY = {};
  function buildCountryHints() {
    for (const k in ACT_BY_COUNTRY) delete ACT_BY_COUNTRY[k];
    D.ACTIONS.forEach(b => { const a = getAction(b.id); if (a.block || a.hidden || !a.city || !a.hint || a.remote) return; const c = cityOf(a.city); if (!c) return; (ACT_BY_COUNTRY[c.country] = ACT_BY_COUNTRY[c.country] || []).push(a.id); });
  }
  buildCountryHints();
  wrap.addEventListener('mousemove', e => {
    if (drag || busy) { tip.classList.remove('on'); return; }
    const h = codeAtEvent(e);
    if (h.code !== hoverCode) { hoverCode = h.code; renderMapColors(); }
    if (!h.code) { tip.classList.remove('on'); return; }
    const cur = cityOf(S.city).country;
    const p = pastelOf(h.code), sw = h.code === cur ? '#96e2f3' : `rgb(${p.join(',')})`;
    const ids = ACT_BY_COUNTRY[h.code] || [];
    let list = '';
    if (ids.length) {
      const items = ids.map(id => { const a = getAction(id); const used = CORE.count(S, id) >= (a.repeat || 1); return { used, html: `<li class="${used ? 'own' : ''}">${esc(a.hint)}</li>` }; });
      items.sort((x, y) => x.used - y.used);
      list = `<ul>${items.slice(0, 6).map(i => i.html).join('')}${items.length > 6 ? `<li class="more">+ ${items.length - 6} outras coisas</li>` : ''}</ul>`;
    }
    if (D.HINTS[h.code]) list += `<ul><li class="${h.code === 'US' ? 'blk' : ''}">${esc(D.HINTS[h.code])}</li></ul>`;
    tip.innerHTML = `<div class="t"><span class="sw" style="background:${sw}"></span>${esc(countryName(h.code))}</div>${h.code === cur ? '<div class="s">Você está aqui</div>' : ''}${list}`;
    const lp = localPt(e);
    tip.classList.add('on');
    const w = tip.offsetWidth, ht = tip.offsetHeight;
    let x = lp.x + 22, y = lp.y + 22;
    if (x + w > VW - 20) x = lp.x - w - 22;
    if (y + ht > VH - 20) y = lp.y - ht - 22;
    tip.style.left = x + 'px'; tip.style.top = Math.max(20, y) + 'px';
  });
  wrap.addEventListener('mouseleave', () => { hoverCode = null; tip.classList.remove('on'); renderMapColors(); });

  /* --- camadas SVG --- */
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  const Lcity = $('#cityLayer'), Ldots = $('#dotsLayer'), Lroute = $('#routeLayer'), Lmark = $('#markerLayer'), Lfx = $('#fxLayer');
  function marker(parent, x, y, s = 1) { const g = el('g', { 'data-x': x, 'data-y': y, 'data-s': s }, parent); placeMarker(g); return g; }
  function placeMarker(g) { const k = +g.dataset.s / Math.pow(view.z, 0.8); g.setAttribute('transform', `translate(${g.dataset.x} ${g.dataset.y}) scale(${k})`); }
  function scaleMarkers() { document.querySelectorAll('#mapSvg [data-x]').forEach(placeMarker); }
  function curvePath(A, B) {
    const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1;
    let nx = -dy / d, ny = dx / d; if (ny > 0) { nx = -nx; ny = -ny; }
    const off = Math.min(220, d * 0.28);
    const c = { x: (A.x + B.x) / 2 + nx * off, y: (A.y + B.y) / 2 + ny * off };
    return { d: `M${A.x} ${A.y} Q${c.x} ${c.y} ${B.x} ${B.y}`, mid: { x: (A.x + 2 * c.x + B.x) / 4, y: (A.y + 2 * c.y + B.y) / 4 }, c };
  }
  // cidades onde dá pra fazer coisas
  const PLAY_CITIES = [...new Set(D.ACTIONS.filter(a => a.city && !a.block).map(a => a.city))];
  function drawCities() {
    Lcity.innerHTML = '';
    PLAY_CITIES.forEach(id => {
      const c = cityOf(id); if (!c) return;
      const g = marker(Lcity, c.x, c.y, 0.9);
      el('circle', { r: 6, class: 'city-dot' + (S.cities.includes(id) ? ' been' : '') }, g);
      const left = id === 'sao_paulo' || id === 'cde';
      const t = el('text', { class: 'city-lbl', x: left ? -11 : 11, y: id === 'cde' ? 14 : 5, 'text-anchor': left ? 'end' : 'start' }, g); t.textContent = c.name;
    });
  }
  function drawCurrentMarker() {
    Lmark.innerHTML = '';
    const c = cityOf(S.city);
    const g = marker(Lmark, c.x, c.y);
    el('circle', { r: 11, class: 'm-ring' }, g); el('circle', { r: 9, class: 'm-core' }, g);
  }
  function renderMapLayers() {
    Ldots.innerHTML = ''; Lroute.innerHTML = '';
    S.history.forEach(h => { if (h.from && h.to && h.from !== h.to) el('path', { d: curvePath(cityOf(h.from), cityOf(h.to)).d, class: 'route-done' }, Lroute); });
    drawCities(); drawCurrentMarker();
  }
  function floatLabel(cityId, text, cls = 'float-lbl', ms = 2600) {
    if (SET.skipAnim) return;
    const c = cityOf(cityId);
    const g = marker(Lfx, c.x, c.y - 44);
    const t = el('text', { class: cls, 'text-anchor': 'middle' }, g); t.textContent = text;
    const t0 = performance.now();
    (function step(now) { const k = clamp((now - t0) / ms, 0, 1); t.setAttribute('y', -k * 50); t.setAttribute('opacity', k < .75 ? 1 : 1 - (k - .75) / .25); if (k < 1) requestAnimationFrame(step); else g.remove(); })(t0);
  }
  const PLANE = 'M20 0 L7 -3.2 L-1 -16 L-6 -16 L-1.5 -3.2 L-11 -3.2 L-15 -9 L-18.5 -9 L-15.5 0 L-18.5 9 L-15 9 L-11 3.2 L-1.5 3.2 L-6 16 L-1 16 L7 3.2 Z';
  function animateTravel(fromId, toId, ms, label, mode) {
    return new Promise(res => {
      const A = cityOf(fromId), B = cityOf(toId);
      Lmark.innerHTML = '';
      const og = marker(Lmark, A.x, A.y); el('circle', { r: 11, class: 'm-ring' }, og); el('circle', { r: 9, class: 'm-core' }, og);
      const dg = marker(Lmark, B.x, B.y); el('circle', { r: 12, class: 'm-dest' }, dg);
      el('circle', { r: 7, fill: '#0d1726', stroke: '#fff', 'stroke-width': 3 }, el('g', { class: 'pop' }, dg));
      const cp = curvePath(A, B);
      const guide = el('path', { d: cp.d, class: 'route' }, Lroute);
      const trail = el('path', { d: cp.d, fill: 'none', stroke: '#00b6d6', 'stroke-width': 4.5, 'stroke-linecap': 'round' }, Lroute);
      const L = guide.getTotalLength();
      trail.setAttribute('stroke-dasharray', `${L} ${L}`); trail.setAttribute('stroke-dashoffset', L);
      const lg = marker(Lfx, cp.mid.x, cp.mid.y - 20);
      const lt = el('text', { class: 'trip-lbl', 'text-anchor': 'middle' }, el('g', { class: 'pop' }, lg)); lt.textContent = label;
      const pg = marker(Lmark, A.x, A.y);
      let veh;
      if (mode === 'ônibus') { veh = el('g', {}, pg); veh.innerHTML = '<rect x="-17" y="-9" width="34" height="18" rx="5" class="bus"/><rect x="-12" y="-6" width="7" height="6" rx="1.5" fill="#cfefff"/><rect x="-3" y="-6" width="7" height="6" rx="1.5" fill="#cfefff"/><rect x="6" y="-6" width="7" height="6" rx="1.5" fill="#cfefff"/>'; }
      else veh = el('path', { d: PLANE, class: 'plane' }, pg);
      const t0 = performance.now();
      const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      (function step(now) {
        const t = clamp((now - t0) / ms, 0, 1), e = ease(t);
        const p = guide.getPointAtLength(e * L), p2 = guide.getPointAtLength(Math.min(L, e * L + 1));
        let ang = Math.atan2(p2.y - p.y, p2.x - p.x) * 180 / Math.PI;
        pg.dataset.x = p.x; pg.dataset.y = p.y; pg.dataset.s = 1.4 + Math.sin(t * Math.PI) * 0.6; placeMarker(pg);
        if (mode === 'ônibus') { const flip = Math.abs(ang) > 90; veh.setAttribute('transform', `rotate(${flip ? ang + 180 : ang}) scale(${flip ? -1 : 1} 1)`); }
        else veh.setAttribute('transform', `rotate(${ang})`);
        trail.setAttribute('stroke-dashoffset', L * (1 - e));
        if (t < 1) requestAnimationFrame(step); else setTimeout(() => { lg.remove(); res(); }, 250);
      })(t0);
    });
  }
  const bannerEl = $('#banner');
  function banner(html) { if (!html) { bannerEl.classList.remove('on'); return; } bannerEl.innerHTML = html; bannerEl.classList.add('on'); }

  /* ------------------------------------------------------------------ */
  /*  HUD                                                               */
  /* ------------------------------------------------------------------ */
  const FONT = getComputedStyle(document.body).fontFamily;
  const hudMesa = DINHEIRO.make($('#mesa'), { font: FONT });
  const bigMesa = DINHEIRO.make($('#bigMesa'), { font: FONT });
  const bankRows = () => extratoRows().filter(r => Math.abs(r.d) >= 0.5).map(r => ({ name: r.name.replace(/^↳ /, ''), d: r.d }));
  const shown = { balance: S.balance, elapsed: S.elapsed, awake: S.awake };
  const mesaWrap = $('#mesaWrap');
  let mesaTimer = null;
  function mesaOpen(ms) { mesaWrap.classList.add('open'); clearTimeout(mesaTimer); if (ms) mesaTimer = setTimeout(() => mesaWrap.classList.remove('open'), ms); }
  $('#moneyBox').addEventListener('click', () => { SFX.click(); if (mesaWrap.classList.contains('open')) { mesaWrap.classList.remove('open'); clearTimeout(mesaTimer); } else mesaOpen(12000); });
  function mesaPose() {
    if (S.ended === 'win') return 'celebrate';
    if (S.ended === 'lose') return 'sad';
    const left = CORE.left(S);
    if (left < 1440) return 'worried';
    if (left < 2880) return 'watch';
    return 'idle';
  }
  /* ---------------- o Problems no mapa ---------------- */
  const heroCv = $('#heroCv'); heroCv.width = 1920; heroCv.height = 1080;
  const hctx = heroCv.getContext('2d');
  const hero = { visible: true, scale: 1, pose: 'idle', hold: null, icon: null, city: null, react: null, t0: performance.now() };
  const CAT_ICON = { cans: '🥫', obra: '🧱', flyer: '📄', film: '🎬', bike: '🚲', beach: '🏖️', bottle: '💧', beer: '🍺', grill: '🍢', tent: '⛱️', bags: '🛍️', phone: '📱', doc: '📄', car: '🚗', shop: '🛒', boxes: '📦', ship: '🚢', factory: '🏭', video: '🎥', ads: '📣', star: '⭐', bank: '🏦', house: '🏠', deal: '🤝', clock: '⏳' };
  function heroLook(a) {
    if (a.kind === 'espera') return { pose: 'watch', hold: null };
    if (a.remote) return { pose: a.kind === 'marketing' ? 'idle' : 'idle', hold: 'phone' };
    if (a.kind === 'estoque') return { pose: 'idle', hold: 'box' };
    if (a.kind === 'trabalho' || a.kind === 'negocio') return { pose: 'work', hold: null };
    if (a.kind === 'venda' || a.kind === 'revenda') return { pose: 'sell', hold: null };
    if (a.kind === 'grande') return { pose: 'point', hold: null };
    if (a.kind === 'leilao' || a.kind === 'compra') return { pose: 'point', hold: null };
    return { pose: 'idle', hold: null };
  }
  function heroBaseH() { return 74 * clamp(Math.pow(view.z / 2.75, 0.6), 0.55, 1.35); }
  function heroScreen(cityId) { const c = cityOf(cityId); return { x: view.tx + c.x * KX * view.z, y: view.ty + c.y * KY * view.z }; }
  function heroScaleTo(target, ms) { const s0 = hero.scale; return tween(ms, k => { hero.scale = s0 + (target - s0) * k; }, easeInOut); }
  function heroReact(pose, ms) { hero.react = { pose, until: performance.now() + ms }; }
  function drawHero(now) {
    hctx.clearRect(0, 0, 1920, 1080);
    if (!hero.visible || !S.introDone || S.ended) return;
    const c = cityOf(hero.city || S.city); if (!c) return;
    const p = heroScreen(hero.city || S.city);
    const Hpx = heroBaseH() * hero.scale, s = Hpx / 175;
    if (p.x < -200 || p.x > 2120 || p.y < -100 || p.y > 1400) return;
    let pose = hero.pose;
    if (hero.react && now < hero.react.until) pose = hero.react.pose; else hero.react = null;
    if (pose === 'idle' && !hero.hold) { const left = CORE.left(S); if (left < 1440) pose = 'worried'; else if (S.awake > (SET.maxAwakeH - 3) * 60) pose = 'sad'; }
    // sombra
    hctx.fillStyle = 'rgba(13,23,38,.18)'; hctx.beginPath(); hctx.ellipse(p.x, p.y, Hpx * 0.22, Hpx * 0.07, 0, 0, Math.PI * 2); hctx.fill();
    const t = (now - hero.t0) / 1000;
    const hands = PROBLEMS.draw(hctx, { ox: p.x, oy: p.y, s, x: 0, y: 0, z: 0, yaw: -0.55, pose, t, hold: hero.hold });
    if (hero.hold) PROBLEMS.item(hctx, hands, hero.hold, s);
    if (hero.icon && hands) {
      const k = Math.sin(t * 4) * Hpx * 0.03;
      hctx.font = `${Math.round(Hpx * 0.24)}px sans-serif`; hctx.textAlign = 'center'; hctx.textBaseline = 'bottom';
      hctx.fillText(hero.icon, hands.head[0] + Hpx * 0.2, hands.head[1] - Hpx * 0.04 + k);
    }
  }

  (function loop(now) {
    drawHero(now);
    if (mesaWrap.classList.contains('open')) { hudMesa.pose(mesaPose()); hudMesa.draw(now); }
    if (!$('#moment').classList.contains('hidden')) bigMesa.draw(now);
    requestAnimationFrame(loop);
  })(performance.now());

  const dayPills = $('#dayPills');
  for (let i = 0; i < D.DAYS; i++) dayPills.insertAdjacentHTML('beforeend', '<div class="day-pill"><i></i></div>');
  const goalPct = v => clamp(Math.log10(Math.max(1, v)) / Math.log10(D.GOAL), 0, 1);
  function paintMoney() {
    $('#moneyValue').textContent = fmtFull(shown.balance);
    const net = shown.balance - S.debt;
    $('#goalFill').style.width = (goalPct(net) * 100).toFixed(2) + '%';
    $('#goalPct').textContent = fmtPct(Math.max(0, net) / D.GOAL * 100) + ' da meta';
  }
  function paintTime() {
    const left = CORE.total() - shown.elapsed;
    $('#timeValue').textContent = fmtRemain(left);
    $('#clockLine').textContent = clockTxt(shown.elapsed);
    [...dayPills.children].forEach((p, i) => p.firstChild.style.transform = `scaleX(${clamp((shown.elapsed - i * 1440) / 1440, 0, 1)})`);
    const aw = shown.awake / 60, mx = SET.maxAwakeH;
    $('#awakeTxt').textContent = aw < 0.5 ? 'Acabou de acordar' : `Acordado há ${Math.floor(aw)}h`;
    $('#awakeFill').style.width = clamp(aw / mx * 100, 0, 100) + '%';
    $('#awake').classList.toggle('tired', aw >= mx - 4);
  }
  function paintTop() { paintMoney(); paintTime(); }
  function paintStatic() {
    const left = CORE.left(S), tb = $('#timeBox');
    tb.classList.remove('warn', 'danger');
    let u = '';
    if (left < 1440) { tb.classList.add('danger'); u = 'Último dia!'; } else if (left < 2880) { tb.classList.add('warn'); u = 'Reta final'; }
    $('#urgency').textContent = u;
    $('#vignette').classList.toggle('on', left < 1440 && left > 0 && !S.ended);
    $('#locName').textContent = placeName(S.city);
    // dívida e rendimento
    $('#debtLine').classList.toggle('hidden', S.debt <= 0);
    $('#debtVal').textContent = fmtFull(S.debt);
    const rate = CORE.rateNow(S);
    $('#rateLine').classList.toggle('hidden', rate <= 0);
    $('#rateVal').textContent = '+' + fmtFull(rate).replace('R$ ', 'R$ ') + '/dia';
    renderBiz();
  }
  function renderBiz() {
    const box = $('#bizBox'), list = $('#bizList'), assets = $('#assetChips');
    const act = S.streams.filter(s => s.left > 0.5 || s.start > S.elapsed);
    const done = S.streams.filter(s => s.left <= 0.5 && s.totalCap);
    const pend = S.payouts.filter(p => !p.done);
    list.innerHTML = act.map(s => {
      const mult = (S.boosts[s.tag] || 1) * (s.mult || 1);
      const waiting = s.start > S.elapsed;
      const pct = s.totalCap ? clamp(s.paid / s.totalCap, 0, 1) : null;
      return `<li><div class="bz-top"><span class="bz-n">${esc(s.name)}</span><b>${waiting ? 'chega ' + esc(whenTxt(s.start)) : '+' + fmtShort(s.perMin * mult * 1440).replace('R$ ', 'R$ ') + '/dia'}</b></div>${pct != null ? `<div class="bz-bar"><i style="width:${(pct * 100).toFixed(1)}%"></i></div><div class="bz-sub">${waiting ? 'estoque a caminho' : `vendido ${fmtShort(s.paid)} de ${fmtShort(s.totalCap)}`}</div>` : '<div class="bz-sub">rende todo dia, até o fim</div>'}</li>`;
    }).join('') + pend.map(p => `<li class="pend"><div class="bz-top"><span class="bz-n">${esc(p.name)}</span><b>${fmtShort(p.amount)}</b></div><div class="bz-sub">cai ${esc(whenTxt(p.at))}</div></li>`).join('')
      + done.slice(-2).map(s => `<li class="done"><div class="bz-top"><span class="bz-n">${esc(s.name)}</span><b>esgotado</b></div></li>`).join('');
    $('#bizHead').classList.toggle('hidden', !list.innerHTML);
    assets.innerHTML = S.assets.map(a => { const A = D.ASSETS[a] || { name: a, icon: '•' }; return `<span class="as">${A.icon} ${esc(A.name)}</span>`; }).join('');
    $('#assetHead').classList.toggle('hidden', !S.assets.length);
    box.classList.toggle('hidden', !list.innerHTML && !S.assets.length);
  }
  function tween(ms, fn, easing) {
    return new Promise(res => {
      if (SET.skipAnim || ms <= 0) { fn(1); return res(); }
      const t0 = performance.now();
      (function step(now) { const t = clamp((now - t0) / ms, 0, 1); fn(easing ? easing(t) : t); if (t < 1) requestAnimationFrame(step); else res(); })(t0);
    });
  }
  const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  // anda o relógio, o cansaço e o dinheiro juntos
  function animateClock(toElapsed, toAwake, toBalance, ms) {
    const e0 = shown.elapsed, a0 = shown.awake, b0 = shown.balance;
    const tv = $('#timeValue'); tv.classList.remove('bump'); void tv.offsetWidth; tv.classList.add('bump');
    let last = 0;
    return tween(ms, t => {
      shown.elapsed = e0 + (toElapsed - e0) * t;
      shown.awake = a0 + (toAwake - a0) * t;
      if (toBalance != null) shown.balance = b0 + (toBalance - b0) * t;
      paintTop();
      const now = performance.now(); if (now - last > 170 && t < .98) { SFX.tick(); last = now; }
    }, easeInOut);
  }
  function animateMoneyTo(target, ms) { const b0 = shown.balance; return tween(ms, t => { shown.balance = b0 + (target - b0) * t; paintMoney(); }, easeInOut); }

  /* ------------------------------------------------------------------ */
  /*  Avançar (estilo slide)                                            */
  /* ------------------------------------------------------------------ */
  let advanceResolve = null;
  function waitAdvance(autoMs, forceClick) {
    return new Promise(res => {
      if (SET.skipAnim) return setTimeout(res, 300);
      advanceResolve = res;
      if (SET.advance === 'auto' && !forceClick) setTimeout(() => { if (advanceResolve === res) { advanceResolve = null; res(); } }, autoMs || 4000);
    });
  }
  function advance() { if (advanceResolve) { const r = advanceResolve; advanceResolve = null; SFX.click(); r(); } }
  ['#moment', '#night', '#milestone', '#intro'].forEach(s => $(s).addEventListener('click', advance));
  window.addEventListener('keydown', e => {
    if (!advanceResolve) return;
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); advance(); }
  });

  /* ------------------------------------------------------------------ */
  /*  Extrato (histórico)                                               */
  /* ------------------------------------------------------------------ */
  // extrato de verdade: o que a ação custou/rendeu + o que entrou dos negócios no meio tempo
  // condensed: junta as vendas dos negócios e a comida em uma linha por dia (pro recibo final)
  function extratoRows(condensed) {
    const rows = [];
    let dayAgg = null;
    const flush = () => { if (!dayAgg) return; if (dayAgg.biz > 0.5) rows.push({ when: dayAgg.when, name: `↳ vendas dos negócios no dia ${dayAgg.day}`, d: dayAgg.biz, sub: true }); if (dayAgg.food > 0.5) rows.push({ when: dayAgg.when, name: `Comida (dia ${dayAgg.day})`, d: -dayAgg.food }); dayAgg = null; };
    S.history.forEach(h => {
      const c = CORE.clock(S, h.at), when = `D${c.day} ${c.txt}`;
      if (condensed && dayAgg && dayAgg.day !== c.day) flush();
      const ev = h.ev || [];
      const food = ev.reduce((v, e) => v + (e.food || 0), 0);
      const got = [].concat(...ev.map(e => e.got || []));
      const biz = got.filter(g => !g.payout).reduce((v, g) => v + g.v, 0);
      if (h.tripCost) rows.push({ when, name: 'Passagem ' + (h.from ? cityOf(h.from).name + ' → ' + cityOf(h.to).name : ''), d: -h.tripCost });
      got.filter(g => g.payout).forEach(p => rows.push({ when, name: '💰 ' + p.name, d: p.v }));
      if (h.kind !== 'sono' && h.kind !== 'espera' && h.kind !== 'viagem') rows.push({ when, name: h.short, d: (h.gain || 0) - (h.cost || 0), act: true });
      if (condensed) {
        if (!dayAgg) dayAgg = { day: c.day, when, biz: 0, food: 0 };
        dayAgg.biz += biz; dayAgg.food += food; dayAgg.when = when;
      } else {
        if (food > 0.5) rows.push({ when, name: 'Comida', d: -food });
        if (biz > 0.5) rows.push({ when, name: '↳ vendas dos negócios', d: biz, sub: true });
      }
    });
    flush();
    return rows;
  }
  const fmtRow = d => Math.abs(d) < 0.5 ? '—' : fmtSigned(d);
  function renderHistory() {
    const box = $('#histChips'); box.innerHTML = '';
    const rows = extratoRows();
    $('#histAll').style.display = rows.length ? '' : 'none';
    if (!rows.length) { box.innerHTML = '<span class="empty">O que você fizer aparece aqui.</span>'; return; }
    rows.slice(-4).reverse().forEach(r => {
      box.insertAdjacentHTML('beforeend', `<span class="ch${r.sub ? ' sub' : ''}"><span class="nm">${esc(r.name)}</span><b class="${r.d >= 0 ? 'pos' : 'neg'}">${fmtRow(r.d)}</b></span>`);
    });
  }
  $('#histAll').addEventListener('click', () => {
    const items = extratoRows().map(r => `<li><span class="w">${r.when}</span><span>${esc(r.name)}</span><span class="p ${r.d >= 0 ? 'pos' : 'neg'}">${fmtRow(r.d)}</span></li>`).join('');
    showOverlay(`<div class="modal hist-modal"><h3>Extrato</h3><ol>${items}</ol><button class="btn btn-dark" data-close>Fechar</button></div>`, true);
    const ol = ov.querySelector('.hist-modal ol'); if (ol) ol.scrollTop = ol.scrollHeight;
    setScreen('extrato', 'Olhando o extrato');
  });

  /* ------------------------------------------------------------------ */
  /*  Busca + card da ação                                              */
  /* ------------------------------------------------------------------ */
  const input = $('#searchInput'), MB = $('#modalBack'), MD = $('#modal');
  let current = null, busy = false, noAnim = false;
  function openModal(html) { const was = !MB.classList.contains('hidden'); MD.innerHTML = html; MB.classList.remove('hidden'); MD.style.animation = 'none'; void MD.offsetWidth; MD.style.animation = (noAnim && was) ? 'none' : ''; noAnim = false; }
  function closeModal() { MB.classList.add('hidden'); MD.innerHTML = ''; current = null; if (!busy && screen.name === 'card') setScreen('livre'); }
  MB.addEventListener('mousedown', e => { if (e.target === MB && !busy) { closeModal(); input.focus(); } });
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && !MB.classList.contains('hidden') && !busy) { closeModal(); input.focus(); } });
  $('#searchForm').addEventListener('submit', e => { e.preventDefault(); if (input.value.trim()) runSearch(input.value); });
  input.addEventListener('input', () => NETR.typing(input.value));

  const LOAD_TXT = ['PENSANDO NUM JEITO...', 'FAZENDO AS CONTAS...', 'VENDO SE DÁ...', 'CALCULANDO...', 'PERGUNTANDO POR AÍ...'];
  let forceNext = null; // o ADM pode decidir o que a próxima busca vai mostrar
  async function runSearch(q, forceId) {
    if (busy || S.ended || !S.started) return;
    busy = true; ac(); tip.classList.remove('on');
    let res;
    if (forceId) res = { type: 'action', id: forceId };
    else if (forceNext) { res = { type: getAction(forceNext).block ? 'block' : 'action', id: forceNext }; forceNext = null; NETR.state(); }
    else res = interpret(q);
    openModal(`<div class="loading"><div class="loader"><i></i><i></i><i></i></div><div class="loading-txt">${LOAD_TXT[Math.floor(Math.random() * LOAD_TXT.length)]}</div></div>`);
    setScreen('carregando', 'Procurando: "' + q + '"');
    await wait(SET.skipAnim ? 100 : 900 + Math.random() * 400);
    busy = false;
    showResult(res);
  }
  function showResult(res) {
    if (res.type === 'action') { const a = getAction(res.id); if (a.block) return showBlock(a); return showAction(a); }
    if (res.type === 'block') return showBlock(getAction(res.id));
    if (res.type === 'suggest') return showSuggest(getAction(res.id));
    if (res.type === 'empty') return closeModal();
    return showNotFound();
  }
  const okBtn = (label = 'TENTAR OUTRA COISA') => `<div class="btns"><button class="btn btn-dark" id="okBtn">${label}</button></div>`;
  function bindOk() { const b = $('#okBtn'); if (b) b.addEventListener('click', () => { closeModal(); input.select(); input.focus(); }); }

  const VERB = { trabalho: 'TRABALHAR', venda: 'FAZER', revenda: 'FAZER', compra: 'COMPRAR', papel: 'FAZER', negocio: 'MONTAR', estoque: 'COMPRAR', marketing: 'FAZER', leilao: 'ARREMATAR', credito: 'PEDIR', grande: 'FECHAR NEGÓCIO', sono: 'DORMIR', espera: 'ESPERAR', viagem: 'IR' };
  function critText(gain, min) {
    if (!gain || !min) return '';
    const perH = gain / (min / 60);
    const years = D.GOAL / (perH * 44 * 52);
    return `Dá ${fmtFull(perH)} por hora. Nesse ritmo, trabalhando 44h por semana, R$ 1 milhão levaria <b>${years >= 10 ? Math.round(years) : years.toFixed(1).replace('.', ',')} anos</b>.`;
  }
  function flexLabel(a, v) { const f = a.flex; if (f.unit) { const n = Math.round(v / f.unit); return `${n} ${n === 1 ? f.unitName[0] : f.unitName[1]}`; } return fmtShort(v).replace('R$ ', ''); }

  function showAction(a, opt) {
    opt = opt || {};
    if (a.kind === 'espera') opt.hours = Math.max(0.5, Math.min(3, CORE.left(S) / 60));
    const q = CORE.quote(S, a, opt);
    current = { action: a, opt, quote: q };
    const city = a.city ? cityOf(a.city) : null;
    // números grandes
    let cost = q.cost, back = '', backSub = '';
    if (a.flex && a.flex.stream || a.stream) { back = '+' + fmtShort(q.stream.perDay).replace('R$ ', 'R$ ') + '<i>/dia</i>'; backSub = q.stream.total < 1e11 ? `vende ${fmtShort(q.stream.total)} no total` : 'rende todo dia'; }
    else if (q.payout) { back = fmtShort(q.payout.amount); backSub = `cai ${q.payout.afterH}h depois`; }
    else if (q.gain) { back = fmtShort(q.gain); backSub = 'volta no fim'; }
    else if (a.boost) { back = '×' + String(a.boost.mult).replace('.', ','); backSub = 'vendas da loja'; }
    else if (a.loan) { back = fmtShort(a.loan); backSub = 'emprestado (dívida)'; }
    else if (a.gives && a.gives.length) { const A = D.ASSETS[a.gives[0]]; back = A ? A.icon : '✓'; backSub = A ? A.name : ''; }
    const profit = q.gain ? q.gain - q.cost : (q.payout ? q.payout.amount - q.cost : (q.stream && q.stream.total < 1e11 ? q.stream.total - q.cost : null));
    const isSleep = a.kind === 'sono', isTrip = a.kind === 'viagem';
    let numbers = '';
    if (!isSleep && !isTrip) numbers = `<div class="big3 n3">
        <div class="cst"><small>CUSTA</small>${cost > 0 ? fmtShort(cost) : 'GRÁTIS'}</div>
        <div class="bck"><small>VOLTA</small>${back || '—'}<em>${esc(backSub)}</em></div>
        <div class="tm"><small>TEMPO</small>${fmtDur(q.minutes)}</div></div>`;
    else numbers = `<div class="big3 n3"><div class="tm wide"><small>TEMPO</small>${fmtDur(q.minutes)}</div>${q.tripCost ? `<div class="cst"><small>PASSAGEM</small>${fmtShort(q.tripCost)}</div>` : ''}</div>`;
    const profitLine = profit != null && !isSleep && !isTrip ? `<div class="profit ${profit >= 0 ? 'pos' : 'neg'}">LUCRO ${fmtSigned(profit)}${q.stream && q.stream.delayH ? ` <span>· começa a vender em ${q.stream.delayH}h</span>` : ''}${q.stream && q.stream.total < 1e11 ? ` <span>· aos poucos, enquanto o tempo passa</span>` : ''}</div>`
      : (q.stream && !isSleep ? `<div class="profit pos">RENDE ${fmtFull(q.stream.perDay)} POR DIA <span>· enquanto o tempo passa, até você dormindo</span></div>` : '');
    // linhas do tempo
    const rows = [];
    q.steps.forEach(s => {
      if (s.type === 'sleep') rows.push([`Dormir antes${isSleep ? '' : ` (você está acordado há ${Math.floor(S.awake / 60)}h)`}`, `${fmtDur(s.min)}${s.cost ? ` · comida ${fmtFull(s.cost)}` : ''}`]);
      else if (s.type === 'trip') rows.push([`${s.trip.mode === 'ônibus' ? '🚌' : '✈️'} ${esc(cityOf(s.trip.from).name)} → ${esc(cityOf(s.trip.to).name)}${s.trip.label ? ` (${esc(s.trip.label)})` : ''}${s.sleeps ? ' · dorme na viagem' : ''}`, `${fmtDur(s.min)} · ${fmtFull(s.cost)}`]);
      else if (s.min > 0) rows.push([esc(a.name), fmtDur(s.min)]);
    });
    let where = '';
    if (a.remote && !isSleep && a.kind !== 'espera') where = `<div class="where"><span class="pin"></span>De onde você estiver <span class="tag remote">PELO CELULAR</span></div>`;
    else if (city && !isSleep) where = `<div class="where"><span class="pin"></span>${esc(placeName(a.city))} ${a.city !== S.city ? '<span class="tag need">PRECISA IR ATÉ LÁ</span>' : '<span class="tag">VOCÊ ESTÁ AQUI</span>'}</div>`;
    // orçamento flexível
    let flexHtml = '';
    if (a.flex) {
      const f = a.flex, maxAff = CORE.flexDefault(S, a, q.tripCost + q.foodRes);
      flexHtml = `<div class="flex-lbl">${esc(f.label || 'QUANTO INVESTIR')} · ${flexLabel(a, f.min)} A ${flexLabel(a, f.max)}</div>
        <div class="chips">${f.opts.map(o => `<button class="chip ${Math.abs(o - q.budget) < 1 ? 'on' : ''}" data-b="${o}">${flexLabel(a, o)}</button>`).join('')}</div>
        ${f.unit ? '' : `<label class="custom"><span>R$</span><input id="flexIn" type="number" step="100" min="${f.min}" max="${f.max}" value="${Math.round(q.budget)}"><button type="button" class="mini" id="flexAll">Tudo que dá (${fmtShort(maxAff)})</button></label>`}`;
    }
    // alertas
    let alerts = '';
    if (q.missing) alerts = `<div class="alert danger">🔒<span>Pra fazer isso você precisa de: <b>${q.missing.map(esc).join('</b>, <b>')}</b>.</span></div>`;
    else if (q.used) alerts = `<div class="alert danger">✋<span>Você já fez isso ${(a.repeat || 1) > 1 ? 'o máximo de vezes (' + a.repeat + '×)' : ''}. ${a.repeat > 1 ? 'Não tem mais procura.' : 'Só dá uma vez.'}</span></div>`;
    else if (q.tooPoor) alerts = `<div class="alert danger">💸<span>Falta dinheiro: precisa de ${fmtFull(q.needCash)} e você tem ${fmtFull(S.balance)}.</span></div>`;
    else if (q.tooLong) alerts = `<div class="alert danger">⏰<span>Não dá tempo: leva ${fmtDur(q.minutes)} e só restam ${fmtRemain(CORE.left(S))}.</span></div>`;
    const why = [D.WHY[a.kind], a.costNote ? 'Custo: ' + a.costNote + '.' : '', a.flex && a.flex.ret ? `Volta ${String(a.flex.ret).replace('.', ',')}× o que você puser.` : '', a.capNote || ''].filter(Boolean).join(' ');
    const disabled = !q.ok;
    openModal(`<div class="${a.flex ? 'is-flex' : ''}">
      ${isSleep ? '' : `<div class="c-art">${ART.svg(a.cat)}</div>`}
      <div class="c-title">${esc(a.name)}</div>
      ${numbers}${profitLine}${where}
      ${why ? `<div class="why">ℹ️<span>${esc(why)}</span></div>` : ''}
      ${flexHtml}
      ${rows.length > 1 || (rows.length && q.steps.some(s => s.type !== 'act')) ? `<div class="dets">${rows.map(r => `<div class="det">${r[0]}<i></i><b>${r[1]}</b></div>`).join('')}</div>` : ''}
      ${alerts}
      <div class="btns"><button class="btn btn-buy" id="buyBtn" ${disabled ? 'disabled' : ''}>${VERB[a.kind] || 'FAZER'}</button><button class="btn btn-ghost" id="cancelBtn">CANCELAR</button></div>
    </div>`);
    $('#buyBtn').addEventListener('click', () => doAction());
    $('#cancelBtn').addEventListener('click', () => { SFX.click(); closeModal(); input.focus(); });
    if (a.flex) {
      MD.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { SFX.click(); noAnim = true; showAction(a, Object.assign({}, opt, { budget: +c.dataset.b })); }));
      const fi = $('#flexIn');
      if (fi) {
        fi.addEventListener('change', () => { let v = parseFloat(String(fi.value).replace(',', '.')); if (!isFinite(v)) v = a.flex.min; noAnim = true; showAction(a, Object.assign({}, opt, { budget: clamp(v, a.flex.min, a.flex.max) })); });
        fi.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); fi.blur(); } });
      }
      const fa = $('#flexAll'); if (fa) fa.addEventListener('click', e => { e.preventDefault(); SFX.click(); noAnim = true; showAction(a, Object.assign({}, opt, { budget: CORE.flexDefault(S, a, q.tripCost + q.foodRes) })); });
    }
    if (disabled) SFX.error(); else SFX.found();
    setScreen('card', `Card: ${a.name}`, { id: a.id, cost: q.cost, gain: q.gain, min: q.minutes, ok: q.ok, budget: q.budget, why: q.missing ? 'falta: ' + q.missing.join(', ') : q.used ? 'já usado' : q.tooPoor ? 'sem dinheiro' : q.tooLong ? 'sem tempo' : '' });
  }
  function showBlock(a) {
    current = null;
    const b = a.block;
    const extra = b.type === 'tempo' ? `<div class="big3 n3"><div class="tm wide"><small>LEVARIA</small>${b.days} dias</div><div class="cst"><small>VOCÊ TEM</small>${fmtRemain(CORE.left(S))}</div></div>` : '';
    openModal(`<div class="blocked"><div class="c-art">${ART.svg('block')}</div><div class="block-title">${esc(b.title)}</div><div class="block-msg">${esc(b.msg)}</div>${extra}${okBtn()}</div>`);
    bindOk(); SFX.error();
    setScreen('card', `Bloqueado: ${b.title}`);
  }
  function showSuggest(a) {
    current = null;
    openModal(`<div class="notfound"><div class="c-title">Não entendi direito.</div>
      <div class="block-msg" style="margin-top:20px;font-size:26px">Você quis dizer: <b>${esc(a.name)}</b>?</div>
      <div class="btns"><button class="btn btn-buy" id="yesBtn">SIM</button><button class="btn btn-ghost" id="okBtn">NÃO</button></div></div>`);
    $('#yesBtn').addEventListener('click', () => { input.value = a.name; runSearch(a.name, a.id); });
    bindOk(); SFX.found();
    setScreen('card', `Você quis dizer: ${a.name}?`);
  }
  function showNotFound() {
    current = null;
    openModal(`<div class="notfound"><div class="c-title">Não achei um jeito realista de fazer isso.</div><div class="block-msg">Tente explicar de outra maneira.</div>${okBtn('TENTAR DE NOVO')}</div>`);
    bindOk(); SFX.error();
    setScreen('card', 'Não encontrou nada');
  }

  /* ------------------------------------------------------------------ */
  /*  Fazer a ação — sequência em ritmo de slide                        */
  /* ------------------------------------------------------------------ */
  function snapshot() { const { undo, ...rest } = S; return JSON.parse(JSON.stringify(rest)); }
  function pushUndo() { S.undo.push(snapshot()); if (S.undo.length > 40) S.undo.shift(); }
  const DOING = { trabalho: 'TRABALHANDO', venda: 'VENDENDO', revenda: 'REVENDENDO', compra: 'COMPRANDO', papel: 'RESOLVENDO', negocio: 'MONTANDO', estoque: 'COMPRANDO ESTOQUE', marketing: 'DIVULGANDO', leilao: 'NO LEILÃO', credito: 'NO BANCO', grande: 'NEGOCIANDO', espera: 'ESPERANDO' };

  async function doAction(opts = {}) {
    if (!current || busy) return;
    const a = current.action, o = Object.assign({}, current.opt);
    const q = CORE.quote(S, a, o);
    if (!opts.force && !q.ok) return;
    busy = true;
    const prevSkip = SET.skipAnim; if (opts.instant) SET.skipAnim = true;
    closeModal(); current = null; tip.classList.remove('on'); hoverCode = null; input.blur();
    pushUndo();
    const B = { balance: S.balance, elapsed: S.elapsed, awake: S.awake, city: S.city, streams: JSON.parse(JSON.stringify(S.streams)) };
    const h = CORE.apply(S, a, q);
    save();
    setScreen('acao', `Fazendo: ${a.name}`);
    SFX.click();
    // reproduz cada etapa
    let bal = B.balance, el = B.elapsed, aw = B.awake, cityNow = B.city;
    const gotAll = [];
    for (const ev of h.ev) {
      const gotSum = ev.got.reduce((v, g) => v + g.v, 0);
      ev.got.forEach(g => gotAll.push(g));
      if (ev.type === 'sleep') {
        await sleepSlide(ev, el, bal, gotSum);
        setScreen('acao', `Fazendo: ${a.name}`);
        bal = bal + gotSum - ev.food; el += ev.min; aw = 0;
        shown.balance = bal; shown.elapsed = el; shown.awake = 0; paintTop();
      } else if (ev.type === 'trip') {
        const from = cityOf(cityNow), dest = cityOf(ev.trip.to);
        await animateView(viewFit([from, dest], 1.5, 0.5, 3.4), 1200);
        destCode = dest.country; renderMapColors();
        const ico = ev.trip.mode === 'ônibus' ? '🚌' : '✈️';
        banner(`${ico} ${esc(from.name.toUpperCase())} → ${esc(dest.name.toUpperCase())} · <b>+${fmtDur(ev.min).toUpperCase()}</b> · ${fmtFull(ev.cost)}`);
        floatLabel(cityNow, '− ' + fmtFull(ev.cost));
        ev.trip.mode === 'ônibus' ? SFX.bus() : SFX.travel();
        bal -= ev.cost;
        hero.visible = false;
        const awEnd = S.awake; // depois da viagem
        const newAw = ev.food != null && ev.min >= SET.sleepH * 60 * 0.85 ? Math.min(8 * 60, Math.max(0, ev.min - SET.sleepH * 60)) : aw + ev.min;
        await Promise.all([animateTravel(cityNow, ev.trip.to, 3400, `+${fmtDur(ev.min)}`, ev.trip.mode), animateClock(el + ev.min, newAw, bal + gotSum - (ev.food || 0), 3400)]);
        bal = bal + gotSum - (ev.food || 0); el += ev.min; aw = newAw; void awEnd;
        if (ev.min >= SET.sleepH * 60 * 0.85) { banner(`${ico} VOCÊ DORMIU NA VIAGEM 😴`); await wait(SET.skipAnim ? 0 : 1100); }
        destCode = null; cityNow = ev.trip.to; $('#locName').textContent = placeName(cityNow);
        hero.city = cityNow; hero.scale = 0; hero.visible = true; heroReact('wow', 1400); heroScaleTo(1, 500);
        const tmpCity = S.city; S.city = cityNow; renderMapColors(); drawCurrentMarker(); drawCities(); S.city = tmpCity;
        await animateView(viewOn(dest.x, dest.y, Math.max(2.4, view.z), 0.5), 1100);
        banner(null);
      } else { // ação
        if (a.kind === 'sono' || a.kind === 'viagem') continue;
        const c = cityOf(cityNow);
        hero.city = cityNow;
        await animateView(viewOn(c.x, c.y, Math.max(view.z, 2.6), 0.62), 900);
        // o Problems cresce no mapa e faz a ação
        const look = heroLook(a);
        hero.pose = look.pose; hero.hold = look.hold; hero.icon = CAT_ICON[a.cat] || null;
        const big = clamp(330 / heroBaseH(), 2, 6);
        await heroScaleTo(big, 600);
        if (ev.cost > 0) { floatLabel(cityNow, '− ' + fmtFull(ev.cost)); SFX.pay(); }
        bal -= ev.cost;
        banner(`${DOING[a.kind] || 'FAZENDO'}… <b>+${fmtDur(ev.min).toUpperCase()}</b>`);
        await animateClock(el + ev.min, aw + ev.min, bal + gotSum, ev.min ? 2400 : 600);
        bal += gotSum; el += ev.min; aw += ev.min;
        if (ev.gain > 0) { hero.pose = 'celebrate'; hero.hold = null; SFX.coin(); }
        await wait(SET.skipAnim ? 0 : 500);
        banner(null);
        // volta pro tamanho normal, no lugar onde estava
        await heroScaleTo(1, 500);
        hero.pose = 'idle'; hero.hold = null; hero.icon = null;
        bal += ev.gain;
      }
    }
    // valores finais garantidos
    shown.balance = bal; shown.elapsed = S.elapsed; shown.awake = S.awake; paintTop();
    paintStatic(); renderMapColors(); renderMapLayers(); renderHistory();
    // slide do resultado
    if (a.kind !== 'sono' && a.kind !== 'viagem' && a.kind !== 'espera') { await resultSlide(a, q, h, B); setScreen('acao', `Terminando: ${a.name}`); }
    else if (a.kind === 'espera' && gotAll.length) { await moneyToast(gotAll); }
    shown.balance = S.balance; paintTop();
    hero.city = null; hero.visible = true; hero.scale = 1; hero.pose = 'idle'; hero.hold = null; hero.icon = null;
    if (S.balance > B.balance + 0.5) { SFX.cash(); floatLabel(S.city, '+ ' + fmtFull(S.balance - B.balance), 'float-lbl pos'); heroReact('celebrate', 2200); }
    else if (S.balance < B.balance - 0.5) heroReact('shrug', 1600);
    // pagamentos que caíram e estoques que acabaram
    const payouts = gotAll.filter(g => g.payout);
    for (const p of payouts) await toast(`💰 <b>${esc(p.name)}</b>: caiu ${fmtFull(p.v)}`);
    S.streams.forEach(s => { const was = B.streams.find(x => x.id === s.id); if (s.totalCap && s.left <= 0.5 && (!was || was.left > 0.5)) toast(`📦 <b>${esc(s.name)}</b> esgotou! Vendeu tudo: ${fmtFull(s.paid)}`); });
    hudMesa.setRows(bankRows()); hudMesa.set(S.balance, true); mesaOpen(9000);
    await animateView(homeView(), 1300);
    await milestoneCheck(B.balance - (S.debt || 0), CORE.net(S));
    SET.skipAnim = prevSkip;
    busy = false;
    input.value = ''; NETR.typing('');
    setScreen('livre');
    if (!checkEnd()) input.focus();
  }

  // dormir: tela de noite
  async function sleepSlide(ev, el0, bal0, gotSum) {
    const n = $('#night');
    n.classList.remove('hidden', 'out');
    $('#nightClock').textContent = CORE.clock(S, el0).txt;
    $('#nightGot').innerHTML = ''; $('#nightFood').innerHTML = ''; $('#nightNext').classList.remove('on');
    setScreen('sono', 'Dormindo ' + fmtDur(ev.min));
    SFX.zzz();
    await wait(SET.skipAnim ? 0 : 500);
    await Promise.all([
      tween(SET.skipAnim ? 0 : 2600, t => { $('#nightClock').textContent = CORE.clock(S, el0 + ev.min * t).txt; }, easeInOut),
      animateClock(el0 + ev.min, 0, bal0 + gotSum - ev.food, 2600)
    ]);
    if (gotSum > 0.5) { $('#nightGot').innerHTML = `Enquanto você dormia, seus negócios renderam <b>${fmtSigned(gotSum)}</b>`; SFX.cash(); }
    if (ev.food > 0) $('#nightFood').innerHTML = `Comida do dia: ${fmtSigned(-ev.food)}`;
    $('#nightNext').textContent = SET.advance === 'auto' ? '' : 'clique para acordar ▸';
    $('#nightNext').classList.add('on');
    await waitAdvance(gotSum > 0.5 ? 4200 : 2600);
    n.classList.add('out');
    await wait(SET.skipAnim ? 0 : 450);
    n.classList.add('hidden'); n.classList.remove('out');
  }

  // resultado (slide)
  async function resultSlide(a, q, h, B) {
    const mo = $('#moment'), moV = $('#moV'), moK = $('#moK'), moS = $('#moS'), moR = $('#moR'), moC = $('#moCrit'), next = $('#moNext');
    $('#moArt').innerHTML = `<div class="art">${ART.svg(a.cat)}</div><div class="nm">${esc(a.short || a.name)}</div><div class="pl">${esc(a.remote ? 'pelo celular' : placeName(S.city))}</div>`;
    mo.classList.remove('hidden', 'out'); [moR, moC, next, moS].forEach(x => x.classList.remove('on'));
    moC.innerHTML = '';
    bigMesa.setRows(bankRows()); bigMesa.set(B.balance + 0, false); bigMesa.pose('idle');
    let k = 'VOCÊ GANHOU', v = 0, sign = '+', sub = '', anim = true, cls = 'pos';
    const net = (q.gain || 0) - q.cost;
    if (q.gain > 0) { k = a.kind === 'grande' ? 'NEGÓCIO FECHADO' : 'VOCÊ RECEBEU'; v = q.gain; sub = q.cost > 0 ? `Gastou ${fmtFull(q.cost)} · lucro <b>${fmtSigned(net)}</b>` : (q.tripCost ? `Passagem: ${fmtFull(q.tripCost)}` : ''); }
    else if (q.stream) { k = q.stream.delayH ? 'ESTOQUE A CAMINHO' : 'AGORA ESTÁ RENDENDO'; v = q.stream.perDay; sign = '+'; sub = `Você investiu ${fmtFull(q.cost)}${q.stream.total < 1e11 ? ` · vai vender ${fmtFull(q.stream.total)} aos poucos` : ''}${q.stream.delayH ? ` · chega ${whenTxt(S.history[S.history.length - 1].at + q.stream.delayH * 60)}` : ''}`; cls = 'rate'; }
    else if (q.payout) { k = a.loan ? 'EMPRÉSTIMO APROVADO' : 'DINHEIRO A CAMINHO'; v = q.payout.amount; sub = `${a.loan ? 'Vira dívida. ' : `Você investiu ${fmtFull(q.cost)}. `}Cai ${whenTxt(h.payoutAt)}`; cls = 'wait'; }
    else if (a.boost) { k = 'A LOJA VENDE MAIS'; v = null; sub = `Vendas ×${String(a.boost.mult).replace('.', ',')}${q.cost ? ` · custou ${fmtFull(q.cost)}` : ''}`; cls = 'rate'; }
    else if (q.cost > 0) { k = 'VOCÊ GASTOU'; v = q.cost; sign = '−'; cls = 'neg'; }
    else { k = 'FEITO'; v = null; }
    moK.textContent = k;
    moV.className = 'mo-v ' + cls;
    if (v == null) moV.textContent = a.boost ? '×' + String(a.boost.mult).replace('.', ',') : '✓ ' + (a.short || '').toUpperCase();
    else moV.textContent = sign + ' R$ 0';
    await wait(SET.skipAnim ? 0 : 500);
    if (v != null) {
      const dur = SET.skipAnim ? 0 : clamp(1300 + Math.log10(Math.max(v, 10)) * 280, 1300, 3000);
      let last = 0;
      const suffix = cls === 'rate' ? '/dia' : '';
      bigMesa.set(S.balance, anim);
      await tween(dur, t => {
        moV.textContent = sign + ' ' + fmtFull(v * t).replace('−', '') + suffix;
        const now = performance.now(); if (now - last > 90 && t < .98) { SFX.coin(); last = now; }
      }, t => 1 - Math.pow(1 - t, 2.2));
      moV.textContent = sign + ' ' + fmtFull(v).replace('−', '') + suffix;
    } else bigMesa.set(S.balance, anim);
    bigMesa.pose(q.gain >= 100000 ? 'wow' : q.gain > 0 && q.gain < 200 ? 'shrug' : q.gain > 0 ? 'celebrate' : 'point');
    if (q.gain > 0) SFX.cash();
    if (sub) { moS.innerHTML = sub; moS.classList.add('on'); }
    await wait(SET.skipAnim ? 0 : 500);
    moR.innerHTML = a.msg ? esc(a.msg) : '';
    moR.classList.toggle('on', !!a.msg);
    if (a.work && SET.crit) { await wait(SET.skipAnim ? 0 : 700); moC.innerHTML = critText(q.gain, q.actMin); moC.classList.add('on'); }
    await wait(SET.skipAnim ? 0 : 600);
    next.textContent = SET.advance === 'auto' ? '' : 'clique para continuar ▸';
    next.classList.add('on');
    setScreen('slide', `Resultado: ${a.short || a.name}`);
    await waitAdvance(a.work ? 7000 : 5000);
    mo.classList.add('out');
    await wait(SET.skipAnim ? 0 : 450);
    mo.classList.add('hidden'); mo.classList.remove('out');
  }

  async function moneyToast(got) {
    const sum = got.reduce((v, g) => v + g.v, 0);
    if (sum > 0.5) await toast(`⏳ Enquanto você esperava, entrou <b>${fmtSigned(sum)}</b>`);
  }
  async function toast(html) {
    if (SET.skipAnim) return;
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html;
    $('#toasts').appendChild(t); SFX.coin();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 600); }, 4200);
    await wait(SET.skipAnim ? 0 : 700);
  }

  /* ------------------------------------------------------------------ */
  /*  Marcos                                                            */
  /* ------------------------------------------------------------------ */
  async function milestoneCheck(b0, b1) {
    S.milestones = S.milestones || [];
    const crossed = D.MILESTONES.filter(m => b0 < m.v && b1 >= m.v && !S.milestones.includes(m.v));
    if (!crossed.length || b1 >= D.GOAL) { crossed.forEach(m => S.milestones.push(m.v)); return; }
    crossed.forEach(m => S.milestones.push(m.v)); save();
    const m = crossed[crossed.length - 1];
    $('#msT').textContent = m.title;
    const c = CORE.clock(S);
    $('#msS').innerHTML = `${esc(m.sub)} <b>Dia ${c.day}, ${c.txt} · faltam ${fmtRemain(CORE.left(S))}</b>`;
    const bar = $('#msBar'); bar.style.transition = 'none'; bar.style.width = (goalPct(b0) * 100) + '%';
    const box = $('#milestone'); box.classList.remove('hidden', 'out');
    void bar.offsetWidth; bar.style.transition = ''; bar.style.width = (goalPct(b1) * 100) + '%';
    SFX.milestone();
    setScreen('marco', 'Marco: ' + m.title);
    await waitAdvance(3800);
    box.classList.add('out'); await wait(SET.skipAnim ? 0 : 500);
    box.classList.add('hidden'); box.classList.remove('out');
    setScreen('acao', 'Voltando pro mapa');
  }

  /* ------------------------------------------------------------------ */
  /*  Fim                                                               */
  /* ------------------------------------------------------------------ */
  function checkEnd() {
    if (S.ended || busy) return !!S.ended;
    if (CORE.net(S) >= D.GOAL) { endGame('win'); return true; }
    if (CORE.left(S) < 30) { endGame('lose'); return true; }
    return false;
  }
  function splitIncome() {
    let work = 0, biz = 0, flip = 0, big = 0;
    S.history.forEach(h => {
      const a = getAction(h.id) || {};
      const net = (h.gain || 0) - (h.cost || 0);
      if (a.work) work += h.gain || 0;
      else if (a.kind === 'grande') big += h.gain || 0;
      else if (h.gain) flip += Math.max(0, net);
    });
    biz = S.stats.streamIn;
    S.payouts.forEach(p => { if (p.done && !/empr|micro/i.test(p.name)) flip += p.amount; });
    return { work, biz, flip, big };
  }
  function statsGrid() {
    const used = S.elapsed, st = S.stats, sp = splitIncome();
    return `<div class="grid">
      <div><small>TEMPO USADO</small><b>${fmtRemain(used)}</b></div>
      <div><small>HORAS DORMINDO</small><b>${Math.round(st.slept / 60)}h</b></div>
      <div><small>HORAS EM VIAGEM</small><b>${Math.round(st.travel / 60)}h</b></div>
      <div><small>GANHO TRABALHANDO</small><b>${fmtShort(sp.work)}</b></div>
      <div><small>GANHO COM NEGÓCIOS</small><b>${fmtShort(sp.biz + sp.flip)}</b></div>
      <div><small>VENDA / INVESTIDOR</small><b>${fmtShort(sp.big)}</b></div></div>`;
  }
  let replaySkip = false;
  async function replay() {
    if (SET.skipAnim || !S.history.length) return;
    replaySkip = false;
    const skip = () => { replaySkip = true; };
    stage.addEventListener('click', skip, { once: true });
    Ldots.innerHTML = ''; Lroute.innerHTML = ''; Lfx.innerHTML = '';
    await animateView(homeView(), 1000);
    const n = S.history.length, per = clamp(9500 / n, 200, 800);
    banner(`REPLAY · <b>7 DIAS EM 10 SEGUNDOS</b>`);
    for (let i = 0; i < n && !replaySkip; i++) {
      const h = S.history[i];
      if (h.from && h.to && h.from !== h.to) {
        const p = el('path', { d: curvePath(cityOf(h.from), cityOf(h.to)).d, class: 'route-done' }, Lroute);
        const L = p.getTotalLength(); p.style.strokeDasharray = `${L} ${L}`; p.style.strokeDashoffset = L;
        await tween(per * 0.55, t => { p.style.strokeDashoffset = L * (1 - t); }, easeInOut);
        p.style.strokeDasharray = ''; p.style.strokeDashoffset = '';
      }
      shown.balance = h.after; shown.elapsed = h.at; paintTop();
      const c = CORE.clock(S, h.at);
      banner(`REPLAY · DIA ${c.day} · <b>${esc(h.short.toUpperCase())}</b> · ${fmtShort(h.after)}`);
      tone(500 + Math.min(1400, Math.log10(Math.max(1, h.after)) * 180), .08, { type: 'triangle', vol: .04 });
      await wait(per * 0.45);
    }
    stage.removeEventListener('click', skip);
    banner(null);
    shown.balance = S.balance; shown.elapsed = S.elapsed; shown.awake = S.awake; paintTop();
    renderMapLayers();
    await wait(replaySkip ? 100 : 600);
  }
  function receiptHtml() {
    const rows = extratoRows(true), dense = rows.length > 30 ? ' dense' : '';
    const step = rows.length > 30 ? 0.045 : 0.07;
    const items = rows.map((r, i) => `<li class="${r.act && Math.abs(r.d) >= 100000 ? 'big' : ''}" style="animation-delay:${(0.35 + i * step).toFixed(2)}s"><span class="w">${r.when}</span><span class="n">${esc(r.name)}</span><span class="d"></span><b class="${r.d >= 0 ? 'pos' : 'neg'}">${esc(fmtRow(r.d))}</b></li>`).join('');
    const end = 0.35 + rows.length * step;
    return `<div class="receipt${dense}"><h3>EXTRATO</h3><div class="rd">DE R$ 1 A R$ 1 MILHÃO · ${rows.length} LANÇAMENTOS</div>
      <ol>${items}</ol>
      ${S.debt > 0 ? `<div class="tot left" style="animation:printIn .4s ${end.toFixed(2)}s both"><span>DÍVIDA</span><b>${fmtSigned(-S.debt)}</b></div>` : ''}
      <div class="tot" style="animation:printIn .4s ${(end + .15).toFixed(2)}s both"><span>SALDO</span><b>${fmtFull(CORE.net(S))}</b></div></div>`;
  }
  async function endGame(kind, silent) {
    S.ended = kind; save();
    busy = true;
    paintStatic(); mesaWrap.classList.remove('open');
    setScreen('final', kind === 'win' ? 'FINAL: chegou no milhão' : 'FINAL: o tempo acabou');
    if (!silent) await replay();
    const win = kind === 'win', net = CORE.net(S);
    const years = Math.round(D.GOAL / (D.MIN_WAGE * 13) * 10) / 10;
    showOverlay(`<div class="final ${win ? 'win' : 'lose'}"><div class="f-left">
      <div class="kicker">${win ? 'VOCÊ CHEGOU NO MILHÃO' : 'O TEMPO ACABOU'}</div>
      <h1>${fmtFull(net)}</h1>
      <div class="sub">${win ? `em ${fmtRemain(S.elapsed)}, começando com R$ 1.` : `Faltaram ${fmtFull(D.GOAL - net)} pra chegar no milhão.`}</div>
      <canvas id="endMesa" width="1240" height="640"></canvas>
      ${statsGrid()}
      <div class="crit-end">Ganhando salário mínimo (${fmtFull(D.MIN_WAGE)}), juntar R$ 1 milhão levaria uns <b>${String(years).replace('.', ',')} anos</b> sem gastar um centavo.</div></div>${receiptHtml()}</div>`);
    const ol = ov.querySelector('.receipt ol');
    if (ol) { const t0 = performance.now(); (function sc(now) { if (!ol.isConnected) return; ol.scrollTop = ol.scrollHeight; if (now - t0 < 6000) requestAnimationFrame(sc); })(t0); }
    const endM = DINHEIRO.make($('#endMesa'), { font: FONT }); endM.setRows(bankRows());
    endM.set(Math.max(0, net), false); endM.pose(win ? 'celebrate' : 'sad');
    (function lp(now) { if (endM.canvas.isConnected) { endM.draw(now); requestAnimationFrame(lp); } })(performance.now());
    busy = false;
    if (!silent) { if (win) { SFX.win(); confetti(); } else SFX.lose(); }
  }
  const ov = $('#overlay');
  function showOverlay(html, closable) {
    confettiRun++; cfx.clearRect(0, 0, 1920, 1080);
    ov.innerHTML = html; ov.classList.remove('hidden');
    ov.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', hideOverlay));
    ov.onclick = closable ? (e => { if (e.target === ov) hideOverlay(); }) : null;
  }
  function hideOverlay() { ov.classList.add('hidden'); ov.innerHTML = ''; confettiRun++; cfx.clearRect(0, 0, 1920, 1080); if (screen.name === 'extrato') setScreen('livre'); }

  // confete
  const cf = $('#confetti'); cf.width = 1920; cf.height = 1080; const cfx = cf.getContext('2d');
  let confettiRun = 0;
  function confetti() {
    if (SET.skipAnim) return;
    const run = ++confettiRun;
    const cols = ['#00b6d6', '#6ad8ee', '#0d1726', '#ffc94d', '#7db8e3', '#4fd699'];
    const P = Array.from({ length: 240 }, () => ({ x: 960 + (Math.random() - .5) * 600, y: 380 + (Math.random() - .5) * 120, vx: (Math.random() - .5) * 26, vy: -Math.random() * 22 - 6, r: Math.random() * Math.PI, vr: (Math.random() - .5) * .4, w: 16 + Math.random() * 10, h: 8 + Math.random() * 4, c: cols[Math.floor(Math.random() * cols.length)] }));
    const t0 = performance.now();
    (function step(now) {
      const t = now - t0; cfx.clearRect(0, 0, 1920, 1080);
      P.forEach(p => { p.vy += .55; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        cfx.save(); cfx.globalAlpha = clamp(1 - (t - 2800) / 900, 0, 1); cfx.translate(p.x, p.y); cfx.rotate(p.r); cfx.fillStyle = p.c; cfx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); cfx.restore(); });
      if (t < 3800 && run === confettiRun) requestAnimationFrame(step); else if (run === confettiRun) cfx.clearRect(0, 0, 1920, 1080);
    })(t0);
  }

  /* ------------------------------------------------------------------ */
  /*  Menu inicial + introdução animada                                 */
  /* ------------------------------------------------------------------ */
  const menu = $('#menu');
  function showMenu() {
    menu.classList.remove('hidden', 'out');
    paintMenuLock();
    setScreen('menu', SET.lockMenu ? 'No menu (esperando o ADM liberar)' : 'No menu');
  }
  function paintMenuLock() {
    $('#startBtn').classList.toggle('hidden', !!SET.lockMenu);
    $('#menuWait').classList.toggle('hidden', !SET.lockMenu);
  }
  $('#startBtn').addEventListener('click', () => { ac(); SFX.found(); startIntro(); });
  $('#muteBtn').addEventListener('click', () => { SET.mute = !SET.mute; saveSet(); paintMute(); if (!SET.mute) SFX.click(); });
  function paintMute() { $('#muteBtn').textContent = SET.mute ? '🔇' : '🔊'; }
  paintMute();

  let introRun = 0;
  async function introBeat(ms) { if (SET.skipAnim) return wait(60); if (SET.introAuto) return wait(ms); return waitAdvance(ms, true); }
  function shake(px = 14) { const s = $('#stage'); s.style.setProperty('--sh', px + 'px'); s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake'); }
  function shock(elm, color) {
    const r = elm.getBoundingClientRect(), st = $('#stage').getBoundingClientRect();
    const w = document.createElement('div'); w.className = 'shock'; w.style.left = ((r.left + r.width / 2 - st.left) / stageScale) + 'px'; w.style.top = ((r.top + r.height / 2 - st.top) / stageScale) + 'px';
    if (color) w.style.borderColor = color;
    $('#intro').appendChild(w); setTimeout(() => w.remove(), 900);
  }
  function impact(elm, px, color) { elm.classList.add('in'); SFX.thud(); shake(px); shock(elm, color); }
  async function flyTo(elm, target) {
    const a0 = elm.getBoundingClientRect();
    elm.style.animation = 'none'; elm.style.opacity = '1'; elm.style.transform = 'none'; void elm.offsetWidth;
    const a = a0, b = target.getBoundingClientRect();
    const dx = (b.left + b.width / 2 - (a.left + a.width / 2)) / stageScale, dy = (b.top + b.height / 2 - (a.top + a.height / 2)) / stageScale;
    elm.style.transition = 'transform .8s cubic-bezier(.6,-0.2,.3,1), opacity .8s';
    elm.style.transform = `translate(${dx}px,${dy}px) scale(.25)`; elm.style.opacity = '0';
    SFX.whoosh();
    await wait(800);
    target.classList.remove('flash'); void target.offsetWidth; target.classList.add('flash');
  }
  async function startIntro() {
    if (SET.lockMenu) return;
    const run = ++introRun;
    menu.classList.add('out');
    await wait(SET.skipAnim ? 0 : 500);
    menu.classList.add('hidden');
    S.started = true; save();
    const I = $('#intro');
    I.innerHTML = `<div class="i-bg"></div>
      <div class="i-top" id="iTop">VOCÊ COMEÇA COM</div>
      <div class="i-row">
        <div class="i-card" id="iCoin"><div class="coin"><span>1</span></div><div class="cap">R$ 1</div></div>
        <div class="i-card" id="iClock"><div class="cal"><b>7</b><span>DIAS</span></div><div class="cap">pra fazer isso</div></div>
        <div class="i-card" id="iGoal"><div class="goal">R$ 1.000.000</div><div class="cap">virar UM MILHÃO</div></div>
      </div>
      <div class="i-steps" id="iSteps">${['🥫', '🧊', '🛍️', '🛒', '🚢', '💼'].map((e, i) => `${i ? '<span class="arr">→</span>' : ''}<span class="st">${e}</span>`).join('')}</div>
      <div class="i-sub" id="iSub">do pouco ao muito · tudo com preço e tempo de verdade</div>
      <div class="i-rules" id="iRules">
        <div><b>⏱ Cada coisa leva tempo</b>O relógio só anda quando você faz algo.</div>
        <div><b>😴 Você precisa dormir</b>Depois de ${SET.maxAwakeH}h acordado, dorme ${SET.sleepH}h.</div>
        <div><b>💸 Gastar pra ganhar</b>Quase tudo custa dinheiro antes de dar dinheiro.</div>
        <div><b>🚫 Sem atalho</b>Nada de loteria, aposta, cripto ou crime.</div>
      </div>
      <div class="i-go" id="iGo">BOA SORTE</div>
      <div class="i-next" id="iNext"></div>`;
    I.classList.remove('hidden', 'out', 'light');
    setScreen('intro', 'Introdução animada');
    const q = s => I.querySelector(s);
    await wait(SET.skipAnim ? 0 : 400); if (run !== introRun) return;
    q('#iTop').classList.add('in'); SFX.whoosh();
    await introBeat(900); if (run !== introRun) return;
    impact(q('#iCoin'), 16, '#f2c94c'); SFX.coin();
    await introBeat(1400); if (run !== introRun) return;
    q('#iTop').textContent = 'VOCÊ TEM'; impact(q('#iClock'), 14, '#00b6d6');
    await introBeat(1300); if (run !== introRun) return;
    q('#iTop').textContent = 'PRA TRANSFORMAR R$ 1 EM'; impact(q('#iGoal'), 24, '#4fd699'); SFX.cash();
    await introBeat(1700); if (run !== introRun) return;
    q('#iSteps').classList.add('in');
    const sts = I.querySelectorAll('.i-steps .st, .i-steps .arr');
    for (let i = 0; i < sts.length; i++) { sts[i].classList.add('in'); if (sts[i].classList.contains('st')) { SFX.thud(); shake(5); } await wait(SET.skipAnim ? 0 : 230); }
    q('#iSub').classList.add('in');
    await introBeat(1500); if (run !== introRun) return;
    const rs = I.querySelectorAll('.i-rules > div');
    q('#iRules').classList.add('in');
    for (const r of rs) { r.classList.add('in'); SFX.coin(); await wait(SET.skipAnim ? 0 : 380); }
    await introBeat(2600); if (run !== introRun) return;
    q('#iGo').classList.add('in'); impact(q('#iGo'), 10);
    q('#iNext').textContent = 'clique para começar ▸'; q('#iNext').classList.add('on');
    await waitAdvance(0, true); if (run !== introRun) return;
    q('#iNext').classList.remove('on');
    // a tela clareia e as peças vão pro lugar
    I.classList.add('light');
    ['#iTop', '#iSteps', '#iSub', '#iRules', '#iGo'].forEach(s => q(s).classList.add('gone'));
    await wait(SET.skipAnim ? 0 : 400);
    await Promise.all([flyTo(q('#iCoin'), $('#moneyBox')), wait(140).then(() => flyTo(q('#iClock'), $('#timeBox'))), wait(280).then(() => flyTo(q('#iGoal'), $('#goalBar')))]);
    I.classList.add('out');
    await wait(SET.skipAnim ? 0 : 500);
    I.classList.add('hidden'); I.innerHTML = '';
    S.introDone = true; save();
    hudMesa.set(S.balance, true); mesaOpen(7000);
    view = worldView(); applyView();
    await animateView(homeView(), 1600);
    const c = cityOf(S.city); floatLabel(S.city, 'você está aqui', 'trip-lbl');
    await animateView(viewOn(c.x, c.y, 3.2, 0.5), 1100);
    await wait(700);
    await animateView(homeView(), 1000);
    setScreen('livre');
    input.focus();
  }
  function skipIntro() {
    introRun++; advanceResolve = null;
    menu.classList.add('hidden'); const I = $('#intro'); I.classList.add('hidden'); I.innerHTML = '';
    S.started = true; S.introDone = true; save();
    hudMesa.set(S.balance, false); view = homeView(); applyView();
    setScreen('livre'); input.focus();
  }

  /* ------------------------------------------------------------------ */
  /*  Escala do palco                                                   */
  /* ------------------------------------------------------------------ */
  const stage = $('#stage');
  function fit() {
    const W = window.innerWidth, Hh = window.innerHeight;
    const s = Math.min(W / 1920, Hh / 1080);
    stageScale = s;
    stage.style.transform = `translate(${(W - 1920 * s) / 2}px, ${(Hh - 1080 * s) / 2}px) scale(${s})`;
  }
  window.addEventListener('resize', fit);

  /* ------------------------------------------------------------------ */
  /*  Tela atual (o ADM acompanha isso ao vivo)                         */
  /* ------------------------------------------------------------------ */
  const screen = { name: 'menu', detail: '', extra: null };
  function setScreen(name, detail, extra) { screen.name = name; screen.detail = detail || ''; screen.extra = extra || null; NETR.screen(); }

  /* ------------------------------------------------------------------ */
  /*  Render completo + API (usada pelo ADM)                            */
  /* ------------------------------------------------------------------ */
  function renderAll() {
    shown.balance = S.balance; shown.elapsed = S.elapsed; shown.awake = S.awake;
    paintTop(); paintStatic(); renderMapColors(); renderMapLayers(); renderHistory(); applyView();
    hudMesa.setRows(bankRows()); hudMesa.set(S.balance, false);
  }
  function changed() { pushUndo(); }
  function after() { save(); paintStatic(); renderAll(); }

  const API = {
    setBalance(v) { changed(); S.balance = Math.max(0, +v); after(); },
    addMoney(v) { changed(); S.balance = Math.max(0, S.balance + (+v)); after(); hudMesa.set(S.balance, true); mesaOpen(6000); },
    setDebt(v) { changed(); S.debt = Math.max(0, +v); after(); },
    setLeft(min) { changed(); S.elapsed = clamp(CORE.total() - Math.round(+min), 0, CORE.total()); after(); },
    setElapsed(min) { changed(); S.elapsed = clamp(Math.round(+min), 0, CORE.total()); after(); },
    setAwake(min) { changed(); S.awake = Math.max(0, Math.round(+min)); after(); },
    setCity(id) { if (!cityOf(id)) return; changed(); S.city = id; const c = cityOf(id).country; if (!S.visited.includes(c)) S.visited.push(c); if (!S.cities.includes(id)) S.cities.push(id); after(); },
    giveAsset(a) { changed(); if (!S.assets.includes(a)) S.assets.push(a); after(); },
    takeAsset(a) { changed(); S.assets = S.assets.filter(x => x !== a); after(); },
    resetCount(id) { changed(); delete S.counts[id]; after(); },
    show(id, budget) { const a = getAction(id); if (!a || busy) return; hideOverlayIfFree(); input.value = a.name; NETR.typing(a.name); if (a.block) showBlock(a); else showAction(a, budget != null ? { budget } : {}); },
    forceNext(id) { forceNext = id || null; NETR.state(); },
    typeText(t) { if (busy) return; input.value = t; NETR.typing(t); },
    search(text) { input.value = text; runSearch(text); },
    advance() { advance(); },
    zoomReset() { animateView(homeView(), 700); },
    async exec(id, o = {}) {
      const a = getAction(id); if (!a || a.block || busy) return;
      hideOverlayIfFree();
      showAction(a, o.budget != null ? { budget: o.budget } : {});
      await wait(SET.skipAnim || o.instant ? 30 : 500);
      await doAction({ force: !!o.force, instant: o.instant });
    },
    confirm(instant) { if (current) doAction({ force: true, instant }); },
    cancel() { if (!busy) closeModal(); },
    undo() {
      if (busy || !S.undo.length) return;
      const p = S.undo.pop(), u = S.undo; S = Object.assign(p, { undo: u }); save(); hideOverlay(); closeModal(); renderAll(); setScreen(S.started ? 'livre' : 'menu');
    },
    reset() { introRun++; S = CORE.fresh(); save(); hideOverlay(); closeModal(); busy = false; view = homeView(); renderAll(); input.value = ''; $('#intro').classList.add('hidden'); showMenu(); },
    toMenu() { introRun++; busy = false; hideOverlay(); closeModal(); $('#intro').classList.add('hidden'); S.started = false; S.introDone = false; save(); showMenu(); },
    startIntro() { if (busy) return; const was = SET.lockMenu; SET.lockMenu = false; saveSet(); paintMenuLock(); menu.classList.remove('hidden'); startIntro(); if (was) NETR.settings(); },
    skipIntro() { skipIntro(); },
    unlockMenu() { SET.lockMenu = false; saveSet(); paintMenuLock(); if (screen.name === 'menu') setScreen('menu', 'No menu'); },
    lockMenu() { SET.lockMenu = true; saveSet(); paintMenuLock(); if (screen.name === 'menu') setScreen('menu', 'No menu (esperando o ADM liberar)'); },
    forceWin() { changed(); endGame('win'); },
    forceLose() { changed(); endGame('lose'); },
    reopenEnd() { if (S.ended) endGame(S.ended, true); },
    closeOverlay() { hideOverlay(); },
    clearEnded() { S.ended = null; save(); hideOverlay(); busy = false; setScreen('livre'); },
    setSetting(k, v) { SET[k] = v; saveSet(); paintMute(); paintMenuLock(); paintTop(); },
    setOverride(id, o) { OVR[id] = Object.assign({}, OVR[id], o); saveOvr(); buildIndex(); buildCountryHints(); },
    clearOverride(id) { delete OVR[id]; saveOvr(); buildIndex(); buildCountryHints(); },
    clearAllOverrides() { OVR = {}; saveOvr(); buildIndex(); buildCountryHints(); },
    toast(html) { toast(esc(html)); },
    reload() { location.reload(); }
  };
  function hideOverlayIfFree() { if (!ov.classList.contains('hidden') && !S.ended) hideOverlay(); }
  function run(cmd) { if (!cmd || !API[cmd.cmd]) return; try { API[cmd.cmd](...(cmd.args || [])); } catch (e) { console.error(e); } }

  /* ------------------------------------------------------------------ */
  /*  Ligação com o ADM (net.js)                                        */
  /* ------------------------------------------------------------------ */
  let typingTimer = null, stateTimer = null;
  function summary() {
    const c = CORE.clock(S);
    return {
      t: Date.now(), screen: screen.name, detail: screen.detail, extra: screen.extra, busy,
      balance: S.balance, debt: S.debt, net: CORE.net(S), elapsed: S.elapsed, left: CORE.left(S), awake: S.awake,
      clock: `D${c.day} ${c.wd.slice(0, 3)} ${c.txt}`, city: S.city, cityName: placeName(S.city), rate: CORE.rateNow(S),
      assets: S.assets, counts: S.counts, started: !!S.started, ended: S.ended, forceNext,
      streams: S.streams.map(s => ({ name: s.name, perDay: s.perMin * 1440 * (S.boosts[s.tag] || 1) * (s.mult || 1), paid: s.paid, total: s.totalCap, left: s.left, start: s.start, waiting: s.start > S.elapsed })),
      payouts: S.payouts.filter(p => !p.done).map(p => ({ name: p.name, amount: p.amount, when: whenTxt(p.at) })),
      history: S.history.slice(-30).map(h => ({ id: h.id, name: h.short, d: (h.gain || 0) - (h.cost || 0) - (h.tripCost || 0), at: CORE.clock(S, h.at).txt, day: CORE.clock(S, h.at).day, min: h.minutes })),
      ids: S.history.map(h => h.id), undo: S.undo.length, settings: SET, overrides: OVR
    };
  }
  const NETR = {
    ready: false,
    state() { if (!this.ready) return; clearTimeout(stateTimer); stateTimer = setTimeout(() => window.NET && NET.report(summary()), 120); },
    screen() { this.state(); },
    typing(t) { if (!this.ready) return; clearTimeout(typingTimer); typingTimer = setTimeout(() => window.NET && NET.typing(t), 80); },
    settings() { if (window.NET && this.ready) NET.pushSettings(SET); }
  };

  window.MILHAO = {
    API, run, interpret, getAction, CORE, D, M,
    get state() { return S; }, get busy() { return busy; }, get settings() { return SET; }, get overrides() { return OVR; }, get screen() { return screen; },
    summary
  };

  /* ------------------------------------------------------------------ */
  /*  Início                                                            */
  /* ------------------------------------------------------------------ */
  fit();
  renderAll();
  if (S.ended) endGame(S.ended, true);
  else if (!S.started || !S.introDone) { S.started = false; showMenu(); }
  else { setScreen('livre'); input.focus(); }

  if (window.NET) {
    NET.start({
      onCmd: run,
      onSettings: s => { if (!s) return; Object.assign(SET, s); saveSet(); paintMute(); paintMenuLock(); paintTop(); if (screen.name === 'menu') setScreen('menu', SET.lockMenu ? 'No menu (esperando o ADM liberar)' : 'No menu'); },
      onOverrides: o => { OVR = o || {}; saveOvr(); buildIndex(); buildCountryHints(); }
    }).then(() => { NETR.ready = true; NETR.state(); NETR.typing(input.value); });
  }
  setInterval(() => NETR.state(), 5000);
})();
