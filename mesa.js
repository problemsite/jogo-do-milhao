// =====================================================================
//  A MESA DO DINHEIRO
//  O saldo vira coisa de verdade em cima de uma mesa:
//   moedas e notas pequenas → notas de R$ 100 → pacotinhos de R$ 1 mil
//   → maços de R$ 10 mil (100 notas de R$ 100, com cinta).
//  R$ 1 milhão = 100 maços ≈ 10 kg de nota.
//  window.MESA.make(canvas, { s, ox, oy, person }) → { set, draw, pose }
// =====================================================================
(function () {
  const C30 = Math.cos(Math.PI / 6);
  const K = '#0d1726';
  // cores das notas do real (2ª família)
  const NOTE = {
    2: ['#8fb3cf', '#6f97b8'], 5: ['#b49ad6', '#9479bf'], 10: ['#e8907f', '#cf6f5f'], 20: ['#f0cf6e', '#d6b04c'],
    50: ['#e5a86d', '#c98a4e'], 100: ['#7db8e3', '#5b9ccb']
  };
  const TABLE = { w: 120, d: 70 };     // cm
  const MACO = { w: 15.6, d: 7, h: 1.1 };   // 100 notas de R$ 100
  const NOTE_W = 15.6, NOTE_D = 7;

  // posições fixas na mesa (pra cada item ter sempre o mesmo lugar)
  const MACO_SLOTS = [];               // 4 colunas x 3 linhas, até 9 de altura = 108 maços
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) MACO_SLOTS.push({ x: 54 + c * 15.4, y: 8 + r * 14 });
  const PAC_SLOTS = [];                // pacotinhos de R$ 1 mil (10 notas)
  for (let i = 0; i < 9; i++) PAC_SLOTS.push({ x: 6 + (i % 3) * 16, y: 6 + Math.floor(i / 3) * 10, r: ((i * 37) % 11 - 5) * 0.03 });

  // decompõe o saldo em itens
  function layout(bal) {
    bal = Math.max(0, Math.floor(bal + 1e-6));
    const items = [];
    const macos = Math.min(108, Math.floor(bal / 10000));
    let rest = bal - macos * 10000;
    for (let i = 0; i < macos; i++) {
      const slot = i % 12, layer = Math.floor(i / 12);
      const s = MACO_SLOTS[slot];
      items.push({ k: 'm' + i, t: 'maco', x: s.x, y: s.y, z: layer * MACO.h, jit: ((i * 53) % 7 - 3) * 0.25 });
    }
    const pacs = Math.min(9, Math.floor(rest / 1000)); rest -= pacs * 1000;
    for (let i = 0; i < pacs; i++) { const s = PAC_SLOTS[i]; items.push({ k: 'p' + i, t: 'pac', x: s.x, y: s.y, z: 0, r: s.r }); }
    // notas de R$ 100 soltas, em leque
    const n100 = Math.floor(rest / 100); rest -= n100 * 100;
    for (let i = 0; i < n100; i++) items.push({ k: 'c' + i, t: 'note', v: 100, x: 14 + i * 3.2, y: 42 + (i % 3) * 0.9, z: i * 0.05, r: -0.3 + i * 0.07 });
    // troco: notas pequenas + moedas
    const small = [];
    for (const v of [50, 20, 10, 5, 2]) while (rest >= v) { small.push(v); rest -= v; }
    small.forEach((v, i) => items.push({ k: 's' + i + '_' + v, t: 'note', v, x: 30 + i * 5.5, y: 56 + (i % 2) * 1.6, z: 0.3 + i * 0.05, r: 0.25 - i * 0.12 }));
    for (let i = 0; i < rest; i++) items.push({ k: 'o' + i, t: 'coin', x: 14 + (i % 2) * 5.5, y: 58 + Math.floor(i / 2) * 4.5, z: 0 });
    return items;
  }

  function make(canvas, o) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, Hh = canvas.height;
    const st = { bal: 0, items: new Map(), pose: 'idle', poseT0: performance.now(), person: o.person !== false, zoom: 1, zoomTo: 1 };
    const view = { s: 1, ox: 0, oy: 0 };
    const cam = { s: 1, ox: 0, oy: 0, ready: false };
    const PERSON = { x: -26, y: 52, h: 175 };
    // enquadra uma caixa do mundo (cm) no canvas
    function fitBox(pts, pad) {
      const pr = pts.map(([x, y, z]) => [(x - y) * C30, (x + y) * 0.5 - z]);
      const xs = pr.map(p => p[0]), ys = pr.map(p => p[1]);
      const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
      const s = Math.min(W * pad / bw, Hh * pad / bh);
      const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
      return { s, ox: W / 2 - cx * s, oy: Hh / 2 - cy * s };
    }
    const T0 = TABLE;
    const SHOTS = {
      wide: () => fitBox([[0, 0, 0], [T0.w, 0, 0], [T0.w, T0.d, 0], [0, T0.d, 0], [0, T0.d, -30], [T0.w, T0.d, -30], [PERSON.x, PERSON.y, PERSON.h - 66], [PERSON.x - 18, PERSON.y + 10, -78], [PERSON.x + 10, PERSON.y - 10, PERSON.h - 66]], o.pad || 0.92),
      table: () => fitBox([[0, 0, 0], [T0.w, 0, 0], [T0.w, T0.d, 0], [0, T0.d, 0], [0, T0.d, -5], [T0.w, T0.d, -5]], 0.94),
      mid: () => fitBox([[0, 0, 0], [70, 0, 0], [70, T0.d, 0], [0, T0.d, 0], [0, T0.d, -5]], 0.92),
      close: () => fitBox([[6, 36, 0], [62, 36, 0], [62, 70, 0], [6, 70, 0], [6, 70, -3]], 0.92),
      tiny: () => fitBox([[0, 40, 0], [44, 40, 0], [44, 72, 0], [0, 72, 0], [0, 72, -8]], 0.9)
    };
    function shotFor(bal) { return bal < 10 ? 'tiny' : bal < 1000 ? 'close' : bal < 10000 ? 'mid' : bal < 100000 ? 'table' : 'wide'; }
    const P = (x, y, z) => [view.ox + (x - y) * view.s * C30, view.oy + (x + y) * view.s * 0.5 - z * view.s];

    function poly(pts, fill, stroke, lw) {
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
    }
    // caixa iso (x,y = canto de trás; w ao longo de x, d ao longo de y)
    function box(x, y, z, w, d, h, top, left, right, edge) {
      const lw = Math.max(1, view.s * 0.12);
      poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], left, edge, lw);
      poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], right, edge, lw);
      poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], top, edge, lw);
    }
    // retângulo plano rotacionado sobre a mesa (nota)
    function flat(cx, cy, z, w, d, rot, fill, stroke) {
      const c = Math.cos(rot), s = Math.sin(rot);
      const pts = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([a, b]) => P(cx + a * c - b * s, cy + a * s + b * c, z));
      poly(pts, fill, stroke, Math.max(1, view.s * 0.1));
      return pts;
    }

    function drawTable() {
      const T = TABLE, lw = Math.max(1.2, view.s * 0.18);
      // pernas
      ctx.fillStyle = '#b98a5e';
      [[3, T.d - 3], [T.w - 3, T.d - 3], [T.w - 3, 3]].forEach(([x, y]) => { const a = P(x - 2, y, -4), b = P(x + 2, y, -4), c = P(x + 2, y, -80), d = P(x - 2, y, -80); poly([a, b, c, d], '#c49768', K, lw); });
      // tampo (grossura 4 cm)
      box(0, 0, -4, T.w, T.d, 4, '#e8c49a', '#cf9f6f', '#bb8a5b', K);
      // veios da madeira
      ctx.save(); ctx.strokeStyle = 'rgba(160,110,60,.22)'; ctx.lineWidth = Math.max(1, view.s * 0.12);
      for (let i = 1; i < 6; i++) { const a = P(2, i * T.d / 6, 0), b = P(T.w - 2, i * T.d / 6 + (i % 2 ? 1 : -1), 0); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      ctx.restore();
    }

    function drawItem(it, now) {
      const a = it.anim;
      let dz = 0, alpha = 1, red = false;
      if (a) {
        const t = Math.min(1, Math.max(0, (now - a.t0) / a.ms));
        if (a.kind === 'in') {
          if (t <= 0) return;
          const e = 1 - Math.pow(1 - t, 3);
          dz = (1 - e) * 60 + Math.sin(e * Math.PI) * 4 * (1 - e);
          alpha = Math.min(1, t * 3);
        } else { // saindo
          red = true;
          dz = t * t * 50; alpha = 1 - t;
          if (t >= 1) return;
        }
      }
      ctx.globalAlpha = alpha;
      const z = it.z + dz;
      if (it.t === 'maco') {
        const x = it.x + it.jit, y = it.y;
        box(x, y, z, MACO.w, MACO.d, MACO.h, red ? '#ff9a9a' : '#86c9ef', red ? '#e5484d' : '#5a9fcc', red ? '#c23a40' : '#4a8ab6', 'rgba(13,23,38,.35)');
        // cinta de papel
        const bx = x + MACO.w * 0.43;
        poly([P(bx, y, z + MACO.h + 0.02), P(bx + 2.2, y, z + MACO.h + 0.02), P(bx + 2.2, y + MACO.d, z + MACO.h + 0.02), P(bx, y + MACO.d, z + MACO.h + 0.02)], red ? '#ffd6d6' : '#fff6dd', 'rgba(13,23,38,.25)', 1);
        poly([P(bx, y + MACO.d, z), P(bx + 2.2, y + MACO.d, z), P(bx + 2.2, y + MACO.d, z + MACO.h), P(bx, y + MACO.d, z + MACO.h)], red ? '#ffd6d6' : '#f3e6c4', null);
      } else if (it.t === 'pac') {
        for (let i = 0; i < 10; i++) flat(it.x + NOTE_W / 2 + Math.sin(i * 1.7) * 0.4, it.y + NOTE_D / 2 + Math.cos(i * 2.3) * 0.3, z + i * 0.11, NOTE_W, NOTE_D, it.r + Math.sin(i * 3.1) * 0.04, red ? '#ff9a9a' : (i % 2 ? NOTE[100][0] : '#8cc2e9'), 'rgba(13,23,38,.3)');
      } else if (it.t === 'note') {
        const c = NOTE[it.v] || NOTE[100];
        const pts = flat(it.x, it.y, z, NOTE_W, NOTE_D, it.r, red ? '#ff9a9a' : c[0], 'rgba(13,23,38,.45)');
        // número da nota
        if (view.s >= 2.6) {
          const cx = (pts[0][0] + pts[2][0]) / 2, cy = (pts[0][1] + pts[2][1]) / 2;
          ctx.fillStyle = red ? '#7a1f22' : c[1]; ctx.font = `800 ${Math.round(view.s * 2.6)}px ${o.font || 'sans-serif'}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(it.v, cx, cy);
        }
      } else if (it.t === 'coin') {
        const p = P(it.x, it.y, z), r = view.s * 2.4;
        ctx.beginPath(); ctx.ellipse(p[0], p[1] + r * 0.12, r, r * 0.58, 0, 0, Math.PI * 2); ctx.fillStyle = '#9aa6b3'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(p[0], p[1], r, r * 0.58, 0, 0, Math.PI * 2); ctx.fillStyle = red ? '#ff9a9a' : '#d4dbe2'; ctx.fill(); ctx.strokeStyle = K; ctx.lineWidth = Math.max(1, view.s * 0.15); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(p[0], p[1], r * 0.62, r * 0.36, 0, 0, Math.PI * 2); ctx.fillStyle = red ? '#ffb3b3' : '#f2c94c'; ctx.fill();
        if (view.s >= 2.6) { ctx.fillStyle = '#9b7a17'; ctx.font = `900 ${Math.round(r * 0.6)}px ${o.font || 'sans-serif'}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('1', p[0], p[1] + 0.5); }
      }
      ctx.globalAlpha = 1;
    }

    function set(bal, animate) {
      const now = performance.now();
      const next = layout(bal);
      const keys = new Set(next.map(i => i.k));
      // sai quem não existe mais
      let outN = 0;
      for (const [k, it] of st.items) if (!keys.has(k) && !(it.anim && it.anim.kind === 'out')) {
        if (animate) { it.anim = { kind: 'out', t0: now + Math.min(600, outN * 18), ms: 700 }; outN++; } else st.items.delete(k);
      }
      // entra quem é novo
      let inN = 0;
      for (const n of next) {
        const old = st.items.get(n.k);
        if (old && !(old.anim && old.anim.kind === 'out')) { Object.assign(old, n); continue; }
        n.anim = animate ? { kind: 'in', t0: now + 120 + Math.min(1400, inN * (n.t === 'maco' ? 45 : 70)), ms: 520 } : null;
        st.items.set(n.k, n); inN++;
      }
      st.bal = bal;
      st.shot = o.shot || shotFor(bal);
      if (!animate) cam.ready = false;
    }

    function draw(now) {
      ctx.clearRect(0, 0, W, Hh);
      const tgt = SHOTS[st.shot || 'wide']();
      if (!cam.ready) { Object.assign(cam, tgt); cam.ready = true; }
      const k = 0.07;
      cam.s += (tgt.s - cam.s) * k; cam.ox += (tgt.ox - cam.ox) * k; cam.oy += (tgt.oy - cam.oy) * k;
      view.s = cam.s; view.ox = cam.ox; view.oy = cam.oy;
      // limpa animações acabadas
      for (const [k, it] of st.items) if (it.anim && now - it.anim.t0 > it.anim.ms) { if (it.anim.kind === 'out') st.items.delete(k); else it.anim = null; }
      const t = (now - st.poseT0) / 1000;
      drawTable();
      // itens em ordem de profundidade
      const arr = [...st.items.values()].sort((a, b) => (a.x + a.y) - (b.x + b.y) || a.z - b.z || (a.t === 'maco') - (b.t === 'maco'));
      // maços: ordem por pilha (x+y) e altura
      arr.sort((a, b) => {
        const da = a.x + a.y + (a.t === 'maco' ? MACO.w * 0.5 : 0), db = b.x + b.y + (b.t === 'maco' ? MACO.w * 0.5 : 0);
        if (Math.abs(da - db) > 0.01) return da - db; return a.z - b.z;
      });
      for (const it of arr) drawItem(it, now);
      // o Problems: em escala real ao lado da mesa no plano aberto; nos planos fechados, de "convidado" no canto
      if (st.person && window.PROBLEMS) {
        if (st.shot === 'wide') {
          window.PROBLEMS.draw(ctx, { ox: view.ox, oy: view.oy, s: view.s, x: PERSON.x, y: PERSON.y, z: -78, yaw: -0.95, pose: st.pose, t });
        } else {
          const s = Hh * 0.7 / 175;
          window.PROBLEMS.draw(ctx, { ox: W * 0.83, oy: Hh * 0.94, s, x: 0, y: 0, z: 0, yaw: -0.25, pose: st.pose, t });
        }
      }
    }

    return {
      st, draw, set, canvas, view,
      pose(p) { if (st.pose !== p) { st.pose = p; st.poseT0 = performance.now(); } },
      busy() { const now = performance.now(); for (const it of st.items.values()) if (it.anim && now - it.anim.t0 < it.anim.ms) return true; return false; }
    };
  }

  window.MESA = { make, layout };
})();
