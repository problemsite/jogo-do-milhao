// =====================================================================
//  ONDE ESTÁ O DINHEIRO
//  O jeito de mostrar o dinheiro muda conforme ele cresce:
//    até R$ 999        → CARTEIRA (moedas e notas dentro da carteira)
//    R$ 1 mil a 99 mil → MESA (notas, pacotinhos e maços em cima da mesa)
//    R$ 100 mil ou mais→ BANCO (celular com o app do banco)
//  O Problems segura a carteira / o celular e reage a cada mudança.
//  window.DINHEIRO.make(canvas, { font }) → { set, draw, pose, setRows, busy }
// =====================================================================
(function () {
  const K = '#0d1726';
  const NOTE = { 2: ['#8fb3cf', '#5f86a8'], 5: ['#b49ad6', '#7c5fae'], 10: ['#e8907f', '#b5503f'], 20: ['#f0cf6e', '#a98420'], 50: ['#e5a86d', '#a8662c'], 100: ['#7db8e3', '#3f7fae'] };
  const nf = new Intl.NumberFormat('pt-BR');
  const brl = v => (v < -0.5 ? '−' : '') + 'R$ ' + nf.format(Math.round(Math.abs(v)));
  const LIM = { table: 1000, bank: 100000 };
  const stageOf = b => b < LIM.table ? 'wallet' : b < LIM.bank ? 'table' : 'bank';
  const CAP = {
    'wallet>table': 'A carteira encheu! Agora é na mesa 💵',
    'table>bank': 'Dinheiro demais pra mesa: foi tudo pro banco 🏦',
    'wallet>bank': 'Direto pro banco! 🏦',
    'table>wallet': 'Sobrou pouco: voltou pra carteira',
    'bank>table': 'Sacou o que sobrou',
    'bank>wallet': 'Sobrou pouco: voltou pra carteira'
  };

  function decompose(bal) {
    let r = Math.max(0, Math.floor(bal + 1e-6));
    const notes = [];
    for (const v of [100, 50, 20, 10, 5, 2]) while (r >= v && notes.length < 14) { notes.push(v); r -= v; }
    return { notes, coins: Math.min(6, r) };
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function make(canvas, o) {
    o = o || {};
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height, FONT = o.font || 'sans-serif';
    const tcv = document.createElement('canvas'); tcv.width = W; tcv.height = H;
    const table = window.MESA.make(tcv, { font: FONT, person: false });
    const st = { bal: 0, shown: 0, stage: 'wallet', trans: null, mood: 'idle', react: null, rows: [], notif: null, wallet: new Map(), t0: performance.now() };

    /* ---------------- carteira: itens com animação ---------------- */
    function walletSet(bal, animate) {
      const d = decompose(bal), now = performance.now();
      const keys = new Set();
      const count = {};
      d.notes.forEach((v, i) => { count[v] = (count[v] || 0) + 1; const k = 'n' + v + '_' + count[v]; keys.add(k); if (!st.wallet.has(k)) st.wallet.set(k, { k, t: 'note', v, i, t0: animate ? now + i * 60 : 0 }); else Object.assign(st.wallet.get(k), { i, out: 0 }); });
      for (let i = 0; i < d.coins; i++) { const k = 'c' + i; keys.add(k); if (!st.wallet.has(k)) st.wallet.set(k, { k, t: 'coin', i, t0: animate ? now + 200 + i * 90 : 0 }); else st.wallet.get(k).out = 0; }
      for (const [k, it] of st.wallet) if (!keys.has(k) && !it.out) { if (animate) it.out = now; else st.wallet.delete(k); }
      // reordena as notas por posição
      let n = 0; [...st.wallet.values()].filter(x => x.t === 'note' && !x.out).sort((a, b) => b.v - a.v).forEach(x => x.i = n++);
    }

    /* ---------------- desenho: carteira grande ---------------- */
    function drawWallet(cx, cy, w, h, now) {
      const x = cx - w / 2, y = cy - h / 2, lw = Math.max(2, w * 0.012);
      // sombra
      ctx.fillStyle = 'rgba(13,23,38,.12)'; rr(ctx, x + w * 0.03, y + h * 0.06, w, h, h * 0.08); ctx.fill();
      // couro aberto
      ctx.fillStyle = '#8a5a3b'; rr(ctx, x, y, w, h, h * 0.08); ctx.fill(); ctx.strokeStyle = K; ctx.lineWidth = lw; ctx.stroke();
      ctx.fillStyle = '#7a4e33'; rr(ctx, x, y, w / 2, h, h * 0.08); ctx.fill();
      ctx.strokeStyle = 'rgba(255,230,200,.35)'; ctx.setLineDash([w * 0.02, w * 0.015]); ctx.lineWidth = lw * 0.6;
      rr(ctx, x + w * 0.025, y + h * 0.04, w * 0.95, h * 0.92, h * 0.06); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(13,23,38,.45)'; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(cx, y + h * 0.03); ctx.lineTo(cx, y + h * 0.97); ctx.stroke();
      // lado esquerdo: cartões + bolsinho de moedas
      for (let i = 0; i < 3; i++) {
        const yy = y + h * (0.12 + i * 0.11);
        ctx.fillStyle = ['#e9d8c4', '#cfe3f5', '#f5d0d0'][i]; rr(ctx, x + w * 0.06, yy, w * 0.38, h * 0.18, h * 0.03); ctx.fill(); ctx.strokeStyle = 'rgba(13,23,38,.35)'; ctx.lineWidth = lw * 0.6; ctx.stroke();
        ctx.fillStyle = '#6e452d'; rr(ctx, x + w * 0.04, yy + h * 0.07, w * 0.42, h * 0.12, h * 0.02); ctx.fill();
      }
      // bolsinho de moedas (aberto)
      const px = x + w * 0.07, py = y + h * 0.56, pw = w * 0.36, ph = h * 0.34;
      ctx.fillStyle = '#5e3b26'; rr(ctx, px, py, pw, ph, h * 0.05); ctx.fill(); ctx.strokeStyle = K; ctx.lineWidth = lw * 0.8; ctx.stroke();
      ctx.strokeStyle = '#c9c9c9'; ctx.lineWidth = lw * 1.4; ctx.setLineDash([lw * 0.9, lw * 0.6]); ctx.beginPath(); ctx.moveTo(px + pw * 0.06, py + ph * 0.18); ctx.lineTo(px + pw * 0.94, py + ph * 0.18); ctx.stroke(); ctx.setLineDash([]);
      // notas no bolso grande (lado direito), atrás da frente do bolso
      const bx = cx + w * 0.04, bw = w * 0.42, pocketTop = y + h * 0.36;
      const notes = [...st.wallet.values()].filter(it => it.t === 'note').sort((a, b) => a.i - b.i);
      const N = Math.max(1, notes.length);
      notes.forEach(it => {
        let dy = 0, al = 1;
        if (it.t0 && now < it.t0 + 500) { const k = Math.max(0, (now - it.t0) / 500); dy = -(1 - k * k * (3 - 2 * k)) * h * 0.6; al = k > 0 ? 1 : 0; }
        if (it.out) { const k = Math.min(1, (now - it.out) / 600); dy = -k * h * 0.5; al = 1 - k; if (k >= 1) { st.wallet.delete(it.k); return; } }
        const c = NOTE[it.v];
        const ox = bx - bw * 0.06 + (it.i / N) * bw * 0.5, top = y + h * 0.06 + (it.i % 2) * h * 0.05 + dy;
        ctx.globalAlpha = al;
        ctx.save(); ctx.translate(ox + bw * 0.34, top + h * 0.3); ctx.rotate(((it.i * 37) % 9 - 4) * 0.012);
        ctx.fillStyle = it.out ? '#ff9a9a' : c[0]; rr(ctx, -bw * 0.34, -h * 0.3, bw * 0.68, h * 0.62, h * 0.02); ctx.fill(); ctx.strokeStyle = 'rgba(13,23,38,.45)'; ctx.lineWidth = lw * 0.6; ctx.stroke();
        ctx.fillStyle = c[1]; ctx.font = `900 ${Math.round(h * 0.11)}px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(it.v, -bw * 0.3, -h * 0.27);
        ctx.restore(); ctx.globalAlpha = 1;
      });
      // frente do bolso
      ctx.fillStyle = '#9a6844'; rr(ctx, cx + w * 0.02, pocketTop, w * 0.46, h * 0.58, h * 0.05); ctx.fill(); ctx.strokeStyle = K; ctx.lineWidth = lw * 0.8; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,230,200,.35)'; ctx.setLineDash([w * 0.02, w * 0.015]); ctx.lineWidth = lw * 0.6; rr(ctx, cx + w * 0.04, pocketTop + h * 0.03, w * 0.42, h * 0.52, h * 0.04); ctx.stroke(); ctx.setLineDash([]);
      // moedas (por cima do bolsinho)
      [...st.wallet.values()].filter(it => it.t === 'coin').forEach(it => {
        let dy = 0, al = 1;
        if (it.t0 && now < it.t0 + 450) { const k = Math.max(0, (now - it.t0) / 450); dy = -(1 - k) * h * 0.5; al = k > 0 ? 1 : 0; }
        if (it.out) { const k = Math.min(1, (now - it.out) / 600); dy = -k * h * 0.4; al = 1 - k; if (k >= 1) { st.wallet.delete(it.k); return; } }
        const r = h * 0.075, ccx = px + pw * (0.24 + (it.i % 3) * 0.26), ccy = py + ph * (0.5 + Math.floor(it.i / 3) * 0.28) + dy;
        ctx.globalAlpha = al;
        ctx.beginPath(); ctx.arc(ccx, ccy, r, 0, Math.PI * 2); ctx.fillStyle = it.out ? '#ff9a9a' : '#d4dbe2'; ctx.fill(); ctx.strokeStyle = K; ctx.lineWidth = lw * 0.7; ctx.stroke();
        ctx.beginPath(); ctx.arc(ccx, ccy, r * 0.62, 0, Math.PI * 2); ctx.fillStyle = '#f2c94c'; ctx.fill();
        ctx.fillStyle = '#9b7a17'; ctx.font = `900 ${Math.round(r * 0.95)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('1', ccx, ccy + r * 0.05);
        ctx.globalAlpha = 1;
      });
      // vazia?
      if (!st.wallet.size && st.bal < 1) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = `800 ${Math.round(h * 0.09)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('vazia', cx + w * 0.25, cy + h * 0.15); }
    }

    /* ---------------- desenho: celular com o app do banco ---------------- */
    function drawPhone(cx, cy, ph, now) {
      const pw = ph * 0.52, x = cx - pw / 2, y = cy - ph / 2, lw = Math.max(2, ph * 0.008);
      ctx.fillStyle = 'rgba(13,23,38,.14)'; rr(ctx, x + pw * 0.05, y + ph * 0.03, pw, ph, pw * 0.14); ctx.fill();
      ctx.fillStyle = K; rr(ctx, x, y, pw, ph, pw * 0.14); ctx.fill();
      const sx = x + pw * 0.05, sy = y + pw * 0.05, sw = pw * 0.9, sh = ph - pw * 0.1;
      ctx.save(); rr(ctx, sx, sy, sw, sh, pw * 0.1); ctx.clip();
      ctx.fillStyle = '#f4f7f9'; ctx.fillRect(sx, sy, sw, sh);
      // cabeçalho do app
      const hh = sh * 0.3;
      const g = ctx.createLinearGradient(sx, sy, sx + sw, sy + hh); g.addColorStop(0, '#00c2e0'); g.addColorStop(1, '#13945c');
      ctx.fillStyle = g; ctx.fillRect(sx, sy, sw, hh);
      // logo (hexágono)
      const lx = sx + sw * 0.13, ly = sy + hh * 0.3, lr = sw * 0.065;
      ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; ctx.lineTo(lx + Math.cos(a) * lr, ly + Math.sin(a) * lr); } ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = K; ctx.lineWidth = lw; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `800 ${Math.round(sw * 0.075)}px ${FONT}`; ctx.fillText('Meu Banco', lx + lr * 1.6, ly);
      ctx.font = `700 ${Math.round(sw * 0.06)}px ${FONT}`; ctx.globalAlpha = .85; ctx.fillText('Saldo disponível', sx + sw * 0.07, sy + hh * 0.62); ctx.globalAlpha = 1;
      const txt = brl(st.shown);
      let fs = sw * 0.14; ctx.font = `900 ${Math.round(fs)}px ${FONT}`; while (ctx.measureText(txt).width > sw * 0.88 && fs > 8) { fs -= 1; ctx.font = `900 ${Math.round(fs)}px ${FONT}`; }
      ctx.fillText(txt, sx + sw * 0.07, sy + hh * 0.84);
      // meta
      const my = sy + hh + sh * 0.05;
      ctx.fillStyle = '#7a8799'; ctx.font = `800 ${Math.round(sw * 0.05)}px ${FONT}`; ctx.fillText('META: R$ 1 MILHÃO', sx + sw * 0.07, my);
      const pct = Math.max(0, Math.min(1, st.shown / 1e6));
      ctx.fillStyle = '#e3e9ee'; rr(ctx, sx + sw * 0.07, my + sh * 0.025, sw * 0.86, sh * 0.03, sh * 0.015); ctx.fill();
      ctx.fillStyle = pct >= 1 ? '#13945c' : '#00b6d6'; rr(ctx, sx + sw * 0.07, my + sh * 0.025, Math.max(sh * 0.03, sw * 0.86 * pct), sh * 0.03, sh * 0.015); ctx.fill();
      ctx.fillStyle = '#334155'; ctx.font = `800 ${Math.round(sw * 0.05)}px ${FONT}`; ctx.textAlign = 'right'; ctx.fillText((pct * 100).toFixed(pct < 1 ? 1 : 0).replace('.', ',') + '%', sx + sw * 0.93, my);
      // últimos lançamentos
      let ry = my + sh * 0.11;
      ctx.textAlign = 'left'; ctx.fillStyle = '#7a8799'; ctx.font = `800 ${Math.round(sw * 0.05)}px ${FONT}`; ctx.fillText('ÚLTIMOS LANÇAMENTOS', sx + sw * 0.07, ry);
      ry += sh * 0.07;
      (st.rows || []).slice(-4).reverse().forEach(r => {
        ctx.fillStyle = '#fff'; rr(ctx, sx + sw * 0.05, ry - sh * 0.04, sw * 0.9, sh * 0.08, sh * 0.02); ctx.fill();
        ctx.fillStyle = '#334155'; ctx.font = `700 ${Math.round(sw * 0.052)}px ${FONT}`; ctx.textAlign = 'left';
        let name = r.name; while (ctx.measureText(name).width > sw * 0.5 && name.length > 4) name = name.slice(0, -2);
        if (name !== r.name) name += '…';
        ctx.fillText(name, sx + sw * 0.09, ry);
        ctx.fillStyle = r.d >= 0 ? '#13945c' : '#c2333a'; ctx.font = `800 ${Math.round(sw * 0.052)}px ${FONT}`; ctx.textAlign = 'right';
        ctx.fillText((r.d >= 0 ? '+' : '−') + brl(Math.abs(r.d)), sx + sw * 0.91, ry);
        ry += sh * 0.095;
      });
      // notificação (pix)
      if (st.notif) {
        const k = (now - st.notif.t0) / 3200;
        if (k < 1) {
          const slide = Math.min(1, (now - st.notif.t0) / 300) * (k > 0.85 ? (1 - k) / 0.15 : 1);
          const ny = sy + sh * 0.02 - (1 - slide) * sh * 0.14;
          ctx.fillStyle = 'rgba(255,255,255,.97)'; rr(ctx, sx + sw * 0.04, ny, sw * 0.92, sh * 0.1, sh * 0.025); ctx.fill(); ctx.strokeStyle = 'rgba(13,23,38,.15)'; ctx.lineWidth = lw; ctx.stroke();
          ctx.fillStyle = K; ctx.font = `800 ${Math.round(sw * 0.055)}px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(st.notif.text, sx + sw * 0.08, ny + sh * 0.05);
        } else st.notif = null;
      }
      ctx.restore();
      // botão lateral e câmera
      ctx.fillStyle = '#334155'; ctx.fillRect(x + pw - lw, y + ph * 0.2, lw * 2.2, ph * 0.08);
    }

    /* ---------------- o Problems + objeto na mão ---------------- */
    function curPose(now) { if (st.react && now < st.react.until) return st.react.pose; st.react = null; return st.mood; }
    function drawProblems(stage, now, t) {
      if (!window.PROBLEMS) return;
      const pose = curPose(now);
      if (stage === 'table') { // atrás da mesa: a mesa (desenhada depois) esconde as pernas
        const s = H * 0.52 / 175;
        window.PROBLEMS.draw(ctx, { ox: W * 0.8, oy: H * 0.72, s, x: 0, y: 0, z: 0, yaw: -0.15, pose, t });
        return;
      }
      const s = H * 0.74 / 175;
      const hands = window.PROBLEMS.draw(ctx, { ox: W * 0.16, oy: H * 0.98, s, x: 0, y: 0, z: 0, yaw: -0.6, pose, t, hold: stage === 'wallet' ? 'wallet' : 'phone' });
      if (!hands) return;
      const u = H * 0.74 / 32;
      if (stage === 'wallet') {
        const mx = (hands.handL[0] + hands.handR[0]) / 2, my = (hands.handL[1] + hands.handR[1]) / 2;
        ctx.save(); ctx.translate(mx, my); ctx.rotate(-0.12);
        ctx.fillStyle = '#8a5a3b'; rr(ctx, -u * 4.2, -u * 2.6, u * 8.4, u * 5, u * 0.8); ctx.fill(); ctx.strokeStyle = K; ctx.lineWidth = Math.max(1.5, u * 0.3); ctx.stroke();
        ctx.fillStyle = '#7db8e3'; ctx.fillRect(u * 0.4, -u * 3.4, u * 3.2, u * 1.6); ctx.fillStyle = '#9a6844'; ctx.fillRect(u * 0.2, -u * 2.2, u * 3.6, u * 4.2);
        ctx.strokeStyle = 'rgba(13,23,38,.5)'; ctx.beginPath(); ctx.moveTo(0, -u * 2.5); ctx.lineTo(0, u * 2.3); ctx.stroke();
        ctx.restore();
      } else {
        const [hx, hy] = hands.handR;
        ctx.save(); ctx.translate(hx, hy - u * 1.6); ctx.rotate(0.2);
        ctx.fillStyle = K; rr(ctx, -u * 1.9, -u * 3.4, u * 3.8, u * 6.8, u * 0.7); ctx.fill();
        ctx.fillStyle = '#00c2e0'; rr(ctx, -u * 1.5, -u * 3, u * 3, u * 6, u * 0.45); ctx.fill();
        ctx.restore();
      }
    }

    function drawStage(stage, now, t) {
      const pose = curPose(now);
      if (stage === 'wallet') {
        const ww = Math.min(W * 0.56, H * 0.72 * 1.45), wh = ww / 1.45;
        drawWallet(W * 0.64, H * 0.52, ww, wh, now);
        drawProblems('wallet', now, t);
      } else if (stage === 'table') {
        table.pose(pose); table.draw(now);
        drawProblems('table', now, t);
        ctx.drawImage(tcv, 0, 0);
      } else {
        drawPhone(W * 0.64, H * 0.5, H * 0.92, now);
        drawProblems('bank', now, t);
      }
    }

    function draw(now) {
      const t = (now - st.t0) / 1000;
      // número do banco anda até o valor certo
      st.shown += (st.bal - st.shown) * 0.08; if (Math.abs(st.bal - st.shown) < 0.5) st.shown = st.bal;
      ctx.clearRect(0, 0, W, H);
      const tr = st.trans;
      if (tr && now - tr.t0 < 1400) {
        const k = Math.min(1, (now - tr.t0) / 900), e = k * k * (3 - 2 * k);
        ctx.save(); ctx.globalAlpha = 1 - e; ctx.translate(W / 2, H / 2); ctx.scale(1 + e * 0.15, 1 + e * 0.15); ctx.translate(-W / 2, -H / 2); drawStage(tr.from, now, t); ctx.restore();
        ctx.save(); ctx.globalAlpha = e; ctx.translate(W / 2, H / 2); ctx.scale(0.85 + e * 0.15, 0.85 + e * 0.15); ctx.translate(-W / 2, -H / 2); drawStage(tr.to, now, t); ctx.restore();
      } else { st.trans = null; drawStage(st.stage, now, t); }
      // balãozinho explicando a troca
      if (tr && tr.caption && now - tr.t0 < 3600) {
        const k = (now - tr.t0) / 3600, a = Math.min(1, k * 8) * Math.min(1, (1 - k) * 6);
        ctx.save(); ctx.globalAlpha = a;
        ctx.font = `800 ${Math.round(H * 0.06)}px ${FONT}`; const tw = ctx.measureText(tr.caption).width;
        const bw = tw + H * 0.08, bh = H * 0.12, bx = W / 2 - bw / 2, by = H * 0.03;
        ctx.fillStyle = K; rr(ctx, bx, by, bw, bh, bh / 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(tr.caption, W / 2, by + bh / 2 + 1);
        ctx.restore();
      }
    }

    function set(bal, animate) {
      const now = performance.now();
      const old = st.bal, ns = o.stage || stageOf(bal);
      if (animate && ns !== st.stage) {
        st.trans = { from: st.stage, to: ns, t0: now, caption: CAP[st.stage + '>' + ns] || '' };
        st.react = { pose: ns === 'wallet' ? 'sad' : 'wow', until: now + 2400 };
      } else if (animate && Math.abs(bal - old) > 0.5) {
        const up = bal > old;
        st.react = { pose: up ? (bal > old * 3 && bal - old > 50 ? 'wow' : 'celebrate') : 'shrug', until: now + (up ? 2400 : 1800) };
      }
      if (animate && ns === 'bank' && Math.abs(bal - old) > 0.5) st.notif = { t0: now, text: bal > old ? '💸 Pix recebido  +' + brl(bal - old) : '📤 Pagamento  −' + brl(old - bal) };
      st.stage = ns; st.bal = bal;
      if (!animate) st.shown = bal;
      walletSet(bal, animate && ns === 'wallet');
      table.set(bal, animate && ns === 'table');
    }

    return {
      canvas, st, draw, set,
      pose(p) { st.mood = p; },
      react(p, ms) { st.react = { pose: p, until: performance.now() + (ms || 2000) }; },
      setRows(rows) { st.rows = rows || []; },
      busy() { return !!st.trans || table.busy(); }
    };
  }

  window.DINHEIRO = { make, stageOf, LIM };
})();
