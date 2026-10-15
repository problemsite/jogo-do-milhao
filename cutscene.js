// =====================================================================
//  CUTSCENE DE ABERTURA — "A dívida"
//  O Problems anda pela rua com R$ 1 no bolso, um homem de terno entrega
//  uma carta: a dívida do pai. R$ 1 milhão em 7 dias. Ele se desespera.
//  window.CUTSCENE.play(container, { tone, noise, skip }) → Promise
//  Clique / espaço / Enter: pula pra próxima cena. Tecla Esc: pula tudo.
// =====================================================================
(function () {
  const K = '#0d1726';
  const W = 1920, H = 1080;
  // cenas: [nome, duração em segundos]
  const SCENES = [['rua', 6.2], ['bolso', 3.6], ['chega', 4.2], ['entrega', 3.4], ['vai', 2.2], ['carta', 7.5], ['susto', 4.6]];
  const START = []; { let a = 0; for (const s of SCENES) { START.push(a); a += s[1]; } }
  const TOTAL = START[START.length - 1] + SCENES[SCENES.length - 1][1];
  const SUIT = { head: [236, 200, 160], body: [52, 58, 74], arm: [52, 58, 74], leg: [36, 40, 52] };

  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // prédios (gerados uma vez, sempre iguais)
  function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  const FAR = [], NEAR = [];
  { const r = rnd(7); let x = -400; while (x < 6000) { const w = 140 + r() * 160, h = 260 + r() * 360; FAR.push({ x, w, h }); x += w + 10; } }
  { const r = rnd(42); let x = -300; const cols = ['#f4c7a1', '#a8d8ea', '#f7e1a0', '#c9b6e4', '#b8e0c2', '#f2a7a7', '#ffd9b3']; while (x < 7000) { const w = 260 + r() * 220, h = 380 + r() * 260; NEAR.push({ x, w, h, c: cols[Math.floor(r() * cols.length)], win: 2 + Math.floor(r() * 3), door: r() > 0.5 }); x += w + 30 + r() * 60; } }

  function play(container, fx) {
    fx = fx || {};
    return new Promise(resolve => {
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.className = 'cut-cv';
      container.appendChild(cv);
      const skipBtn = document.createElement('div'); skipBtn.className = 'cut-skip'; skipBtn.textContent = 'pular ▸▸';
      container.appendChild(skipBtn);
      const c = cv.getContext('2d');
      let t = 0, last = performance.now(), done = false, sceneSounds = {};
      const finish = () => { if (done) return; done = true; window.removeEventListener('keydown', onKey); cv.remove(); skipBtn.remove(); resolve(); };
      const jump = () => { for (let i = 0; i < START.length; i++) if (START[i] > t + 0.05) { t = START[i]; return; } finish(); };
      const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); finish(); } else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); jump(); } };
      cv.addEventListener('click', jump);
      skipBtn.addEventListener('click', e => { e.stopPropagation(); finish(); });
      window.addEventListener('keydown', onKey);
      if (fx.skip) return finish();

      const tone = fx.tone || (() => {}), noise = fx.noise || (() => {});
      const once = (k, f) => { if (!sceneSounds[k]) { sceneSounds[k] = 1; f(); } };

      function sceneAt(tt) { let i = 0; while (i < START.length - 1 && tt >= START[i + 1]) i++; return { i, name: SCENES[i][0], lt: tt - START[i], dur: SCENES[i][1] }; }

      /* ---------------- cenário ---------------- */
      const GROUND = 820; // linha da calçada (pés)
      function drawStreet(cam, dark) {
        // céu de manhã cedo
        const g = c.createLinearGradient(0, 0, 0, GROUND);
        g.addColorStop(0, dark ? '#2a3560' : '#7fc8f0'); g.addColorStop(0.7, dark ? '#4a3a6a' : '#ffd9b0'); g.addColorStop(1, dark ? '#6a4a6a' : '#ffe8c8');
        c.fillStyle = g; c.fillRect(0, 0, W, GROUND);
        // sol
        c.fillStyle = 'rgba(255,214,120,.9)'; c.beginPath(); c.arc(1500 - cam * 0.05, 300, 90, 0, Math.PI * 2); c.fill();
        // morros ao fundo (Rio)
        c.fillStyle = '#9cc7b4';
        c.beginPath(); c.moveTo(-50, 520);
        for (let x = -50; x <= W + 50; x += 40) { const xx = x + cam * 0.12; c.lineTo(x, 470 - Math.sin(xx / 260) * 70 - Math.sin(xx / 97) * 22 - (Math.abs(((xx % 1600) + 1600) % 1600 - 800) < 120 ? 140 - Math.abs(((xx % 1600) + 1600) % 1600 - 800) : 0)); }
        c.lineTo(W + 50, 560); c.lineTo(-50, 560); c.closePath(); c.fill();
        // prédios longe
        c.fillStyle = '#b9c6d6';
        for (const b of FAR) { const x = b.x - cam * 0.35; if (x > W || x + b.w < 0) continue; c.fillRect(x, GROUND - 120 - b.h, b.w, b.h + 120); }
        // prédios perto
        for (const b of NEAR) {
          const x = b.x - cam * 0.8; if (x > W + 20 || x + b.w < -20) continue;
          const y = GROUND - 60 - b.h;
          c.fillStyle = b.c; c.fillRect(x, y, b.w, b.h + 60); c.strokeStyle = K; c.lineWidth = 4; c.strokeRect(x, y, b.w, b.h + 60);
          const cols = b.win, ww = b.w / (cols * 2 + 1);
          for (let r = 0; r < 4; r++) for (let k = 0; k < cols; k++) { c.fillStyle = dark && (r + k) % 3 === 0 ? '#ffe28a' : '#d9f1fb'; rr(c, x + ww * (1 + k * 2), y + 40 + r * 80, ww, 50, 4); c.fill(); c.stroke(); }
          if (b.door) { c.fillStyle = '#7a4e33'; c.fillRect(x + b.w / 2 - 40, GROUND - 160, 80, 100); c.strokeRect(x + b.w / 2 - 40, GROUND - 160, 80, 100); }
        }
        // calçada (pedra portuguesa de Copacabana)
        c.fillStyle = '#efe9df'; c.fillRect(0, GROUND - 60, W, 140);
        c.strokeStyle = '#3c3c3c'; c.lineWidth = 10;
        c.beginPath(); for (let x = -200; x < W + 200; x += 8) { const xx = x - ((cam * 1.0) % 200); const y = GROUND + 10 + Math.sin(xx / 32) * 22; x === -200 ? c.moveTo(xx, y) : c.lineTo(xx, y); } c.stroke();
        c.fillStyle = '#c9c3b8'; c.fillRect(0, GROUND + 80, W, 24);
        // rua
        c.fillStyle = '#4a5160'; c.fillRect(0, GROUND + 104, W, H - GROUND - 104);
        c.fillStyle = '#f2f2f2'; for (let x = -200; x < W + 200; x += 220) { const xx = x - ((cam * 1.1) % 220); c.fillRect(xx, GROUND + 180, 110, 12); }
        // postes
        for (let x = 0; x < 9000; x += 900) { const xx = x - cam; if (xx < -60 || xx > W + 60) continue; c.fillStyle = '#3c4656'; c.fillRect(xx, GROUND - 520, 14, 520); c.fillRect(xx - 50, GROUND - 520, 64, 12); c.fillStyle = '#ffe9a8'; c.fillRect(xx - 56, GROUND - 510, 36, 14); }
      }

      function person(x, y, h, yaw, pose, lt, palette, face) {
        c.fillStyle = 'rgba(13,23,38,.2)'; c.beginPath(); c.ellipse(x, y, h * 0.2, h * 0.05, 0, 0, Math.PI * 2); c.fill();
        return window.PROBLEMS.draw(c, { ox: x, oy: y, s: h / 175, x: 0, y: 0, z: 0, yaw, pose, t: lt, palette, face });
      }
      function envelope(x, y, sz, rot) {
        c.save(); c.translate(x, y); c.rotate(rot || 0);
        c.fillStyle = '#fff8e8'; rr(c, -sz, -sz * 0.62, sz * 2, sz * 1.24, sz * 0.08); c.fill(); c.strokeStyle = K; c.lineWidth = Math.max(2, sz * 0.06); c.stroke();
        c.beginPath(); c.moveTo(-sz, -sz * 0.62); c.lineTo(0, sz * 0.15); c.lineTo(sz, -sz * 0.62); c.stroke();
        c.fillStyle = '#c0392b'; c.beginPath(); c.arc(0, sz * 0.12, sz * 0.18, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      function bubble(x, y, text, size, dir) {
        c.font = `800 ${size}px ${fx.font || 'sans-serif'}`;
        const tw = c.measureText(text).width, bw = tw + size * 1.4, bh = size * 1.9;
        const bx = x - bw / 2, by = y - bh;
        c.fillStyle = '#fff'; rr(c, bx, by, bw, bh, bh / 2); c.fill(); c.strokeStyle = K; c.lineWidth = 5; c.stroke();
        c.beginPath(); c.moveTo(x + (dir || 0) * 20 - 18, by + bh - 2); c.lineTo(x + (dir || 0) * 50, by + bh + 34); c.lineTo(x + (dir || 0) * 20 + 18, by + bh - 2); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#fff'; c.fillRect(x + (dir || 0) * 20 - 14, by + bh - 8, 28, 10);
        c.fillStyle = K; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, x, by + bh / 2 + 2);
      }
      function caption(text, a) {
        c.save(); c.globalAlpha = a; c.font = `800 34px ${fx.font || 'sans-serif'}`; c.fillStyle = '#fff'; c.textAlign = 'left'; c.textBaseline = 'top';
        c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 8; c.fillText(text, 70, 140); c.restore();
      }
      function bars(k) { c.fillStyle = '#000'; c.fillRect(0, 0, W, 110 * k); c.fillRect(0, H - 110 * k, W, 110 * k); }
      function typed(str, lt, speed) { return str.slice(0, Math.max(0, Math.floor(lt * speed))); }

      /* ---------------- cenas ---------------- */
      const PX = 760, PH = 430; // posição e altura do Problems na rua
      let lastStep = 0;
      function frame() {
        const S = sceneAt(t), lt = S.lt;
        c.clearRect(0, 0, W, H);
        c.save();
        if (S.name === 'rua') {
          const cam = lt * 260;
          drawStreet(cam);
          const px = lerp(-200, PX, clamp(lt / 3.2, 0, 1)) + 0;
          person(px, GROUND + 40, PH, -1.95, 'walk', lt);
          if (lt - lastStep > 0.42) { lastStep = lt; noise(.08, { vol: .05, f0: 180, f1: 120 }); }
          caption(typed('Rio de Janeiro · segunda-feira · 7h58', lt, 22), Math.min(1, lt * 2));
        } else if (S.name === 'bolso') {
          drawStreet(6.2 * 260);
          person(PX, GROUND + 40, PH, -1.2, lt < 1.2 ? 'pocket' : 'sad', lt);
          if (lt > 1.1) {
            const k = clamp((lt - 1.1) / 0.5, 0, 1);
            once('coin', () => { tone(1760, .07, { type: 'triangle', vol: .05 }); tone(2349, .14, { type: 'triangle', vol: .045, at: .05 }); });
            const cy = PX + 120, yy = GROUND - PH * 0.55 - k * 140;
            c.globalAlpha = k; c.fillStyle = '#d4dbe2'; c.beginPath(); c.arc(cy, yy, 34, 0, Math.PI * 2); c.fill(); c.strokeStyle = K; c.lineWidth = 5; c.stroke();
            c.fillStyle = '#f2c94c'; c.beginPath(); c.arc(cy, yy, 21, 0, Math.PI * 2); c.fill(); c.fillStyle = '#9b7a17'; c.font = `900 26px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('1', cy, yy + 1);
            c.globalAlpha = 1;
          }
          if (lt > 1.9) bubble(PX + 40, GROUND - PH - 60, 'Só R$ 1 no bolso...', 40, -1);
          caption('Rio de Janeiro · segunda-feira · 7h58', 1);
        } else if (S.name === 'chega' || S.name === 'entrega' || S.name === 'vai') {
          drawStreet(6.2 * 260);
          // o cobrador
          let mx = W + 200, mpose = 'walk', myaw = 1.0;
          if (S.name === 'chega') { mx = lerp(W + 250, PX + 430, ease(clamp(lt / 3.2, 0, 1))); mpose = lt < 3.2 ? 'walk' : 'idle'; if (lt < 3.2 && Math.floor(lt / 0.42) !== Math.floor((lt - 0.017) / 0.42)) noise(.08, { vol: .06, f0: 160, f1: 110 }); }
          else if (S.name === 'entrega') { mx = PX + 430; mpose = lt < 1.6 ? 'hand' : 'idle'; }
          else { mx = lerp(PX + 430, W + 300, ease(clamp(lt / 2, 0, 1))); mpose = 'walk'; myaw = -1.95 + Math.PI; }
          const pPose = S.name === 'chega' ? (lt < 2.2 ? 'sad' : 'idle') : S.name === 'entrega' ? (lt > 1.2 ? 'read' : 'idle') : 'read';
          const ph = person(PX, GROUND + 40, PH, -0.9, pPose, lt);
          const mh = person(mx, GROUND + 40, PH * 1.05, S.name === 'vai' ? -1.95 : 0.25, mpose, lt, SUIT, 'shades');
          // carta
          if (S.name === 'chega' && lt > 2.4 && mh) envelope(mh.handR[0], mh.handR[1] - 10, 30, 0.2);
          if (S.name === 'entrega' && mh && ph) {
            const k = ease(clamp((lt - 0.4) / 1.0, 0, 1));
            const ex = lerp(mh.handR[0], (ph.handL[0] + ph.handR[0]) / 2, k), ey = lerp(mh.handR[1] - 10, (ph.handL[1] + ph.handR[1]) / 2 - 20, k);
            envelope(ex, ey, 30 + k * 8, 0.2 - k * 0.2);
            if (lt < 1.6) bubble(mx - 40, GROUND - PH * 1.05 - 60, 'Problems? Isso é pra você.', 40, 1);
            once('paper', () => noise(.25, { vol: .05, f0: 2500, f1: 4000, at: .6 }));
          }
          if (S.name === 'vai' && ph) envelope((ph.handL[0] + ph.handR[0]) / 2, (ph.handL[1] + ph.handR[1]) / 2 - 20, 38, 0);
          if (S.name === 'chega' && lt > 3.3) bubble(PX + 30, GROUND - PH - 60, '?', 52, -1);
        } else if (S.name === 'carta') {
          // close na carta
          drawStreet(6.2 * 260, false);
          c.fillStyle = 'rgba(13,23,38,.55)'; c.fillRect(0, 0, W, H);
          const k = ease(clamp(lt / 0.6, 0, 1));
          c.translate(W / 2, H / 2 + (1 - k) * 300); c.rotate((1 - k) * 0.2 - 0.02); c.scale(0.6 + k * 0.4, 0.6 + k * 0.4);
          c.fillStyle = '#fffaf0'; rr(c, -560, -390, 1120, 780, 18); c.fill(); c.strokeStyle = K; c.lineWidth = 6; c.stroke();
          c.fillStyle = '#e9e2d0'; c.fillRect(-560, -390, 1120, 90);
          c.fillStyle = K; c.font = `900 40px ${fx.font || 'serif'}`; c.textAlign = 'left'; c.textBaseline = 'middle';
          c.fillText('NOTIFICAÇÃO DE COBRANÇA', -510, -345);
          c.font = `600 36px Georgia, serif`;
          const lines = ['Prezado Sr. Problems,', '', 'Seu pai deixou uma dívida conosco.', 'Como herdeiro, o pagamento agora', 'é responsabilidade sua.'];
          let shownChars = Math.floor(Math.max(0, lt - 0.6) * 38);
          lines.forEach((ln, i) => { const s = ln.slice(0, Math.max(0, shownChars)); shownChars -= ln.length + 4; c.fillText(s, -500, -250 + i * 56); });
          if (lt > 0.6 && Math.floor(lt * 30) % 2 === 0 && shownChars < 0) tone(1800 + Math.random() * 300, .015, { type: 'square', vol: .01 });
          // valor e prazo
          if (lt > 3.9) {
            const k2 = clamp((lt - 3.9) / 0.35, 0, 1), sc = 1 + (1 - k2) * 1.6;
            once('valor', () => { tone(70, .6, { vol: .22, slide: 40 }); noise(.4, { vol: .12, f0: 200, f1: 80, q: .7 }); });
            c.save(); c.translate(0, 120); c.scale(sc, sc); c.globalAlpha = k2;
            c.font = `900 40px ${fx.font || 'sans-serif'}`; c.textAlign = 'center'; c.fillStyle = '#7a8799'; c.fillText('VALOR DA DÍVIDA', 0, -70);
            c.font = `900 120px ${fx.font || 'sans-serif'}`; c.fillStyle = '#c0392b'; c.fillText('R$ 1.000.000,00', 0, 20);
            c.restore();
          }
          if (lt > 5.2) {
            const k3 = clamp((lt - 5.2) / 0.3, 0, 1);
            once('prazo', () => { tone(60, .7, { vol: .22, slide: 35 }); noise(.5, { vol: .14, f0: 180, f1: 70, q: .7 }); });
            c.save(); c.translate(330, 300); c.rotate(-0.12); c.scale(1 + (1 - k3) * 2, 1 + (1 - k3) * 2); c.globalAlpha = k3;
            c.strokeStyle = '#c0392b'; c.lineWidth = 10; rr(c, -230, -60, 460, 120, 16); c.stroke();
            c.fillStyle = '#c0392b'; c.font = `900 64px ${fx.font || 'sans-serif'}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('PRAZO: 7 DIAS', 0, 4);
            c.restore();
          }
        } else if (S.name === 'susto') {
          // close no rosto, tremendo
          const sh = lt < 2.4 ? (2.4 - lt) * 9 : 0;
          const z = 1 + ease(clamp(lt / 0.5, 0, 1)) * 0.9;
          c.translate(W / 2 + (Math.random() - .5) * sh * 2, H / 2 + (Math.random() - .5) * sh * 2); c.scale(z, z); c.translate(-PX, -(GROUND - PH * 0.62));
          drawStreet(6.2 * 260, true);
          // linhas de impacto
          c.save(); c.translate(PX, GROUND - PH * 0.7);
          for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2 + lt * 0.3; c.strokeStyle = i % 2 ? 'rgba(255,255,255,.6)' : 'rgba(255,214,120,.5)'; c.lineWidth = 14; c.beginPath(); c.moveTo(Math.cos(a) * 320, Math.sin(a) * 320); c.lineTo(Math.cos(a) * 1400, Math.sin(a) * 1400); c.stroke(); }
          c.restore();
          person(PX, GROUND + 40, PH, -0.7, 'shock', lt);
          // carta caindo
          envelope(PX + 160 + lt * 60, GROUND - PH * 0.4 + Math.min(lt, 1.4) * 330, 38, lt * 2.5);
          once('susto', () => { [196, 185, 175, 98].forEach((f, i) => tone(f, 1.1, { type: 'sawtooth', vol: .06, at: i * 0.02 })); tone(55, 1.4, { vol: .25, slide: 30 }); noise(1, { vol: .1, f0: 300, f1: 90, q: .6 }); });
          c.setTransform(1, 0, 0, 1, 0, 0);
          // texto gigante
          if (lt > 0.7) {
            const k = clamp((lt - 0.7) / 0.3, 0, 1);
            c.save(); c.translate(W / 2, 250); c.scale(1 + (1 - k) * 2, 1 + (1 - k) * 2); c.rotate(-0.04); c.globalAlpha = k;
            c.font = `900 150px ${fx.title || fx.font || 'sans-serif'}`; c.textAlign = 'center'; c.textBaseline = 'middle';
            c.lineWidth = 18; c.strokeStyle = K; c.strokeText('1 MILHÃO?!', 0, 0); c.fillStyle = '#ffd36b'; c.fillText('1 MILHÃO?!', 0, 0);
            c.restore();
          }
          if (lt > 2.2) {
            const k = clamp((lt - 2.2) / 0.4, 0, 1);
            c.save(); c.globalAlpha = k; c.font = `900 64px ${fx.title || fx.font || 'sans-serif'}`; c.textAlign = 'center'; c.textBaseline = 'middle';
            c.lineWidth = 12; c.strokeStyle = K; c.strokeText('EM 7 DIAS?!', W / 2, 400); c.fillStyle = '#fff'; c.fillText('EM 7 DIAS?!', W / 2, 400); c.restore();
          }
          // flash
          if (lt < 0.25) { c.fillStyle = `rgba(255,255,255,${1 - lt / 0.25})`; c.fillRect(0, 0, W, H); }
          // escurece no fim
          if (lt > S.dur - 0.6) { c.fillStyle = `rgba(13,23,38,${(lt - (S.dur - 0.6)) / 0.6})`; c.fillRect(0, 0, W, H); }
        }
        c.restore();
        // faixas de cinema
        bars(Math.min(1, t * 2));
        // fade de entrada
        if (t < 0.6) { c.fillStyle = `rgba(0,0,0,${1 - t / 0.6})`; c.fillRect(0, 0, W, H); }
      }
      (function loop(now) {
        if (done) return;
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        t += dt;
        if (t >= TOTAL) return finish();
        frame();
        requestAnimationFrame(loop);
      })(performance.now());
    });
  }

  window.CUTSCENE = { play, TOTAL };
})();
