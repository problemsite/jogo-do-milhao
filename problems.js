// =====================================================================
//  O PROBLEMS (personagem de bloquinho, todo ciano, estilo Minecraft)
//  Mini motor 3D no canvas 2D: caixas com rotação nas juntas, projeção
//  isométrica igual à da mesa, faces com sombra e o rostinho na frente.
//  window.PROBLEMS.draw(ctx, opts)
//    opts: { ox, oy, s (px por cm), x, y, z (pés, em cm), yaw (rad),
//            pose, t (segundos), h (altura em cm, padrão 175) }
//  poses: idle | point | wow | shrug | watch | worried | celebrate | sad
// =====================================================================
(function () {
  const C30 = Math.cos(Math.PI / 6);
  const K = '#0d1726';
  const CY = { top: '#7ff6fb', front: '#00e3ec', side: '#00b9c4', back: '#0096a3', bottom: '#007f8a' };

  // vetores
  const rotX = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; };
  const rotY = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; };
  const rotZ = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; };
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

  // corpo em "pixels" de skin (Steve): cabeça 8, tronco 8x12x4, braços/pernas 4x12x4. Altura total 32.
  // eixos locais: X = direita do personagem, Y = pra frente, Z = pra cima
  function pose(name, t) {
    const sin = Math.sin;
    const P = { jump: 0, bodyTilt: 0, headX: 0, headZ: 0, aLx: 0, aLy: 0, aRx: 0, aRy: 0, lLx: 0, lRx: 0, bob: sin(t * 2.2) * 0.25 };
    switch (name) {
      case 'point': P.aRx = 1.45 + sin(t * 3) * 0.06; P.aRy = -0.25; P.headZ = -0.35; P.aLx = sin(t * 2) * 0.06; break;
      case 'wow': P.jump = Math.abs(sin(t * 7)) * 3.2; P.aLy = 2.6 + sin(t * 14) * 0.2; P.aRy = -2.6 - sin(t * 14 + 1) * 0.2; P.headX = 0.25; P.lLx = 0.25; P.lRx = -0.25; break;
      case 'shrug': { const k = (sin(t * 4) + 1) / 2; P.aLy = 0.5 + k * 0.3; P.aRy = -0.5 - k * 0.3; P.aLx = 0.9; P.aRx = 0.9; P.headZ = sin(t * 2) * 0.25; P.headX = 0.15; break; }
      case 'watch': { const look = (t % 5) < 2.4; P.aLx = look ? 1.5 : 0; P.aLy = look ? 0.55 : 0; P.headX = look ? -0.45 : 0; P.headZ = look ? 0.3 : 0; break; }
      case 'worried': { const look = (t % 3) < 1.8; P.aLx = look ? 1.5 : 0.1; P.aLy = look ? 0.55 : 0; P.headX = look ? -0.45 : 0.1; P.aRx = sin(t * 8) * 0.25; P.lLx = sin(t * 12) * 0.12; P.sweat = true; break; }
      case 'celebrate': P.jump = Math.abs(sin(t * 6)) * 3.6; P.aLy = 2.7 + sin(t * 12) * 0.35; P.aRy = -2.7 - sin(t * 12 + Math.PI) * 0.35; P.lLx = sin(t * 12) * 0.35; P.lRx = -sin(t * 12) * 0.35; P.spark = true; break;
      case 'work': { const w = sin(t * 9); P.aLx = w * 0.9; P.aRx = -w * 0.9; P.lLx = -w * 0.45; P.lRx = w * 0.45; P.jump = Math.abs(sin(t * 9)) * 0.6; P.headX = -0.1; break; }
      case 'sell': P.aRy = -2.3 + sin(t * 10) * 0.35; P.aRx = 0.2; P.aLx = 0.9; P.aLy = -0.2; P.headZ = sin(t * 3) * 0.3; P.jump = Math.abs(sin(t * 5)) * 0.8; break;
      case 'walk': { const w = sin(t * 7); P.aLx = w * 0.55; P.aRx = -w * 0.55; P.lLx = -w * 0.5; P.lRx = w * 0.5; P.jump = Math.abs(sin(t * 7)) * 0.35; break; }
      case 'pocket': P.aLx = -0.25; P.aLy = 0.1; P.aRx = -0.3; P.aRy = -0.1; P.headX = -0.5; P.headZ = 0.3; break;
      case 'hand': P.aRx = 1.35; P.aRy = 0.15; P.headX = -0.15; break;
      case 'read': P.aLx = 1.2; P.aLy = -0.35; P.aRx = 1.2; P.aRy = 0.35; P.headX = -0.4; break;
      case 'shock': { const k = Math.min(1, t * 3); P.aLy = 2.9 * k; P.aRy = -2.9 * k; P.aLx = 0.3; P.aRx = 0.3; P.headX = 0.35 * k; P.jump = Math.abs(sin(t * 18)) * 0.6 * (1 - Math.min(1, t / 3)); P.bodyTilt = -0.08 * k; break; }
      case 'sad': P.headX = -0.6; P.bodyTilt = -0.12; P.aLx = 0.15; P.aRx = 0.15; P.aLy = -0.06; P.aRy = 0.06; P.bob *= 0.3; break;
      default: P.aLx = sin(t * 2.2) * 0.07; P.aRx = -sin(t * 2.2) * 0.07; P.headZ = (t % 7) > 5.6 ? 0.45 : 0; break;
    }
    return P;
  }

  // uma caixa: tamanho (w,d,h), pivô e deslocamento dentro do pivô
  function boxVerts(w, d, h, off) {
    const v = [];
    for (const z of [0, h]) for (const y of [-d / 2, d / 2]) for (const x of [-w / 2, w / 2]) v.push([x + off[0], y + off[1], z + off[2]]);
    return v; // índices: bit0 = x+, bit1 = y+, bit2 = z+
  }
  const FACES = [
    { n: [0, 1, 0], idx: [2, 3, 7, 6], key: 'front' }, { n: [0, -1, 0], idx: [1, 0, 4, 5], key: 'back' },
    { n: [1, 0, 0], idx: [3, 1, 5, 7], key: 'side' }, { n: [-1, 0, 0], idx: [0, 2, 6, 4], key: 'side' },
    { n: [0, 0, 1], idx: [6, 7, 5, 4], key: 'top' }, { n: [0, 0, -1], idx: [0, 1, 3, 2], key: 'bottom' }
  ];

  function draw(ctx, o) {
    const H = o.h || 175, u = H / 32;            // cm por "pixel" de skin
    const P = pose(o.pose || 'idle', o.t || 0);
    // segurando alguma coisa: os braços ficam presos no objeto, o resto reage
    if (o.hold === 'box') {
      P.aLx = 1.15; P.aLy = -0.32; P.aRx = 1.15; P.aRy = 0.32; P.headX = Math.min(P.headX, -0.1);
    } else if (o.hold === 'wallet') {
      const k = Math.sin((o.t || 0) * 2.4) * 0.05;
      P.aLx = 1.15 + k; P.aLy = -0.32; P.aRx = 1.15 + k; P.aRy = 0.32;
      if (o.pose !== 'wow' && o.pose !== 'celebrate') P.headX = Math.min(P.headX, -0.28);
    } else if (o.hold === 'phone') {
      P.aRx = 1.3 + Math.sin((o.t || 0) * 2) * 0.04; P.aRy = 0.42;
      if (o.pose !== 'celebrate' && o.pose !== 'wow') { P.aLx = Math.sin((o.t || 0) * 2.2) * 0.07; P.aLy = 0; }
      if (o.pose !== 'wow' && o.pose !== 'celebrate') { P.headX = Math.min(P.headX, -0.3); P.headZ = 0.2; }
    }
    const yaw = o.yaw || 0;
    // projeção iso (mesma da mesa)
    const proj = p => [o.ox + (p[0] - p[1]) * o.s * C30, o.oy + (p[0] + p[1]) * o.s * 0.5 - p[2] * o.s];
    // personagem -> mundo: escala, gira (yaw), posiciona
    const toWorld = p => { const q = rotZ([p[0] * u, p[1] * u, p[2] * u], yaw); return [q[0] + o.x, q[1] + o.y, q[2] + o.z + (P.jump + Math.max(0, P.bob)) * u * 0]; };
    const lift = (P.jump) * u;
    const parts = [];
    // cada parte: verts locais (já com pose aplicada, em unidades de skin)
    function part(w, d, h, off, pivot, rot, name, extra) {
      let v = boxVerts(w, d, h, off);
      v = v.map(p => { let q = p; if (rot.x) q = rotX(q, rot.x); if (rot.y) q = rotY(q, rot.y); if (rot.z) q = rotZ(q, rot.z); return add(q, pivot); });
      const nr = n => { let q = n; if (rot.x) q = rotX(q, rot.x); if (rot.y) q = rotY(q, rot.y); if (rot.z) q = rotZ(q, rot.z); return q; };
      parts.push({ v, nr, name, extra });
    }
    const tilt = P.bodyTilt;
    const hip = [0, 0, 12 + P.bob * 0.15];
    // pernas (pivô no quadril)
    part(4, 4, 12, [0, 0, -12], add(hip, [-2, 0, 0]), { x: P.lLx }, 'leg');
    part(4, 4, 12, [0, 0, -12], add(hip, [2, 0, 0]), { x: P.lRx }, 'leg');
    // tronco
    part(8, 4, 12, [0, 0, 0], hip, { x: tilt }, 'body');
    const sh = rotX([0, 0, 12], tilt);
    const shoulder = add(hip, sh);
    // braços (pivô no ombro, pendurados)
    part(4, 4, 12, [0, 0, -10], add(shoulder, [-6, 0, -2]), { x: P.aLx, y: P.aLy }, 'arm');
    part(4, 4, 12, [0, 0, -10], add(shoulder, [6, 0, -2]), { x: P.aRx, y: P.aRy }, 'arm');
    // onde ficam as mãos (pra desenhar o objeto que ele segura)
    const handAt = (pivot, rot) => { let q = [0, 0, -9.5]; q = rotX(q, rot.x || 0); q = rotY(q, rot.y || 0); return add(q, pivot); };
    const hL = handAt(add(shoulder, [-6, 0, -2]), { x: P.aLx, y: P.aLy }), hR = handAt(add(shoulder, [6, 0, -2]), { x: P.aRx, y: P.aRy });
    // cabeça (pivô no pescoço)
    part(8, 8, 8, [0, 0, 0], shoulder, { x: P.headX + tilt, z: P.headZ }, 'head', true);

    // luz e câmera
    const L = [0.35, 0.55, 0.76];
    const view = [0.577, 0.577, 0.577]; // quem olha vem de +x +y +z
    const faces = [];
    for (const pt of parts) {
      const W = pt.v.map(p => { const q = toWorld(p); q[2] += lift; return q; });
      for (const f of FACES) {
        const nl = pt.nr(f.n), n = rotZ(nl, yaw);
        if (n[0] * view[0] + n[1] * view[1] + n[2] * view[2] <= 0.001) continue;
        const pts = f.idx.map(i => W[i]);
        const c = pts.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]);
        const lum = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
        faces.push({ pts, depth: c[0] + c[1] + c[2] * 1.15, lum, key: f.key, part: pt, face: f, n });
      }
    }
    faces.sort((a, b) => a.depth - b.depth);
    const lw = Math.max(1, o.s * u * 0.18);
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const f of faces) {
      const sp = f.pts.map(proj);
      ctx.beginPath(); sp.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
      ctx.fillStyle = o.palette && o.palette[f.part.name] ? shadeC(o.palette[f.part.name], f.lum) : shade(f.lum); ctx.fill();
      ctx.strokeStyle = 'rgba(13,23,38,.55)'; ctx.lineWidth = lw; ctx.stroke();
      if (f.part.extra && f.face.key === 'front') (o.face === 'shades' ? drawShades : drawFace)(ctx, f.pts, proj, P);
    }
    // efeitos
    const headTop = proj(add(toWorld([0, 0, 33]), [0, 0, lift]));
    const hs = 8 * u * o.s;
    if (P.sweat) {
      const k = ((o.t || 0) * 1.3) % 1;
      const sx = headTop[0] + hs * 0.75, sy = headTop[1] + hs * 0.2 + k * hs * 0.7;
      ctx.fillStyle = '#5cc8e8'; ctx.strokeStyle = K; ctx.lineWidth = lw * 0.8;
      ctx.beginPath(); ctx.moveTo(sx, sy - hs * 0.22); ctx.quadraticCurveTo(sx + hs * 0.16, sy, sx, sy + hs * 0.1); ctx.quadraticCurveTo(sx - hs * 0.16, sy, sx, sy - hs * 0.22); ctx.fill(); ctx.stroke();
    }
    if (o.pose === 'shrug') {
      ctx.font = `900 ${Math.round(hs * 0.7)}px sans-serif`; ctx.fillStyle = '#7a8799'; ctx.textAlign = 'center';
      ctx.fillText('?', headTop[0] + hs * 0.9, headTop[1] - hs * 0.1 + Math.sin((o.t || 0) * 4) * hs * 0.08);
    }
    if (P.spark) {
      ['#ffd36b', '#00b6d6', '#ff8fab', '#4fd699'].forEach((c, i) => {
        const a = (o.t || 0) * 3 + i * 1.6, r = hs * (1.1 + Math.sin((o.t || 0) * 5 + i) * 0.2);
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(headTop[0] + Math.cos(a) * r, headTop[1] - hs * 0.2 + Math.sin(a) * r * 0.6, hs * 0.1, 0, Math.PI * 2); ctx.fill();
      });
    }
    ctx.restore();
    const W2 = p => { const q = toWorld(p); q[2] += lift; return proj(q); };
    return { handL: W2(hL), handR: W2(hR), head: headTop, headSize: hs };
  }
  function shadeC(c, l) { const k = 0.45 + l * 0.6; return `rgb(${Math.min(255, Math.round(c[0] * k))},${Math.min(255, Math.round(c[1] * k))},${Math.min(255, Math.round(c[2] * k))})`; }
  // rosto de "cobrador": óculos escuros e boca reta
  function drawShades(ctx, pts, proj) {
    const [p0, p1, p2, p3] = pts;
    const at = (u, v) => { const a = u / 8, b = v / 8; const top = [p3[0] + (p2[0] - p3[0]) * a, p3[1] + (p2[1] - p3[1]) * a, p3[2] + (p2[2] - p3[2]) * a]; const bot = [p0[0] + (p1[0] - p0[0]) * a, p0[1] + (p1[1] - p0[1]) * a, p0[2] + (p1[2] - p0[2]) * a]; return proj([top[0] + (bot[0] - top[0]) * b, top[1] + (bot[1] - top[1]) * b, top[2] + (bot[2] - top[2]) * b]); };
    const rect = (u, v, w, h) => { const q = [at(u, v), at(u + w, v), at(u + w, v + h), at(u, v + h)]; ctx.beginPath(); q.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); };
    ctx.fillStyle = K; rect(1, 2.2, 6, 1.4); ctx.fillStyle = '#5a3b2a'; rect(2.5, 5.4, 3, 0.6); ctx.fillStyle = '#2b1c14'; rect(0, 0, 8, 1.1);
  }
  function shade(l) {
    // ciano: mistura entre sombra e luz
    const a = [0, 120, 132], b = [70, 245, 250], k = 0.3 + l * 0.7;
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`;
  }
  // rostinho na frente da cabeça (8x8): dois olhinhos e a boca torta
  function drawFace(ctx, pts, proj, P) {
    // pts: [baixo-esq, baixo-dir, cima-dir, cima-esq] (vista de frente)
    const [p0, p1, p2, p3] = pts;
    const at = (u, v) => { // u: 0..8 da esquerda, v: 0..8 de cima
      const a = u / 8, b = v / 8;
      const top = [p3[0] + (p2[0] - p3[0]) * a, p3[1] + (p2[1] - p3[1]) * a, p3[2] + (p2[2] - p3[2]) * a];
      const bot = [p0[0] + (p1[0] - p0[0]) * a, p0[1] + (p1[1] - p0[1]) * a, p0[2] + (p1[2] - p0[2]) * a];
      return proj([top[0] + (bot[0] - top[0]) * b, top[1] + (bot[1] - top[1]) * b, top[2] + (bot[2] - top[2]) * b]);
    };
    const rect = (u, v, w, h) => { const q = [at(u, v), at(u + w, v), at(u + w, v + h), at(u, v + h)]; ctx.beginPath(); q.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); };
    ctx.fillStyle = K;
    const blink = P && (Date.now() % 4200) < 140;
    if (blink) { rect(1.8, 1.45, 1.1, 0.3); rect(5.7, 1.65, 1.1, 0.3); }
    else { rect(1.9, 1.0, 0.95, 1.0); rect(5.8, 1.2, 0.95, 1.0); }
    // boca: tracinho em pé + um bloquinho embaixo à direita
    rect(1.0, 3.0, 0.85, 2.0);
    rect(1.85, 4.55, 0.85, 0.85);
  }

  // versão de frente em SVG (pras ilustrações)
  function svg(x, y, k, arms) {
    const c = '#00e3ec', s = 'stroke="#0d1726" stroke-width="1.6" stroke-linejoin="round"';
    let aL = '<rect x="-12" y="-27" width="4" height="12" fill="' + c + '" ' + s + '/>';
    let aR = '<rect x="8" y="-27" width="4" height="12" fill="' + c + '" ' + s + '/>';
    if (arms === 'up') { aL = '<rect x="-12" y="-39" width="4" height="12" fill="' + c + '" ' + s + '/>'; aR = '<rect x="8" y="-39" width="4" height="12" fill="' + c + '" ' + s + '/>'; }
    if (arms === 'carry') { aL = '<rect x="-12" y="-27" width="4" height="9" fill="' + c + '" ' + s + ' transform="rotate(-30 -10 -27)"/>'; aR = '<rect x="8" y="-27" width="4" height="9" fill="' + c + '" ' + s + ' transform="rotate(30 10 -27)"/>'; }
    return `<g transform="translate(${x} ${y}) scale(${k})">
      <rect x="-4" y="-12" width="3.8" height="12" fill="#00c4cf" ${s}/><rect x="0.2" y="-12" width="3.8" height="12" fill="#00c4cf" ${s}/>
      <rect x="-8" y="-27" width="16" height="15" fill="${c}" ${s}/>${aL}${aR}
      <rect x="-8" y="-43" width="16" height="16" fill="${c}" ${s}/>
      <rect x="-4.2" y="-41" width="2" height="2" fill="#0d1726"/><rect x="3.6" y="-40.6" width="2" height="2" fill="#0d1726"/>
      <rect x="-6" y="-37" width="1.7" height="4" fill="#0d1726"/><rect x="-4.3" y="-33.9" width="1.7" height="1.7" fill="#0d1726"/></g>`;
  }

  // desenha o objeto que ele segura, a partir das mãos que o draw() devolveu
  function item(ctx, hands, kind, s) {
    if (!hands) return;
    const u = s * 175 / 32, K2 = '#0d1726';
    const R = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
    ctx.save(); ctx.lineWidth = Math.max(1.2, u * 0.3); ctx.strokeStyle = K2;
    if (kind === 'box' || kind === 'wallet') {
      const mx = (hands.handL[0] + hands.handR[0]) / 2, my = (hands.handL[1] + hands.handR[1]) / 2;
      ctx.translate(mx, my); ctx.rotate(-0.1);
      if (kind === 'box') {
        ctx.fillStyle = '#e8c49a'; R(-u * 5, -u * 4.5, u * 10, u * 7, u * 0.4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#d6a873'; ctx.fillRect(-u * 1, -u * 4.5, u * 2, u * 7);
      } else {
        ctx.fillStyle = '#8a5a3b'; R(-u * 4.2, -u * 2.6, u * 8.4, u * 5, u * 0.8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#7db8e3'; ctx.fillRect(u * 0.4, -u * 3.4, u * 3.2, u * 1.6); ctx.fillStyle = '#9a6844'; ctx.fillRect(u * 0.2, -u * 2.2, u * 3.6, u * 4.2);
      }
    } else if (kind === 'phone') {
      const [hx, hy] = hands.handR;
      ctx.translate(hx, hy - u * 1.6); ctx.rotate(0.2);
      ctx.fillStyle = K2; R(-u * 1.9, -u * 3.4, u * 3.8, u * 6.8, u * 0.7); ctx.fill();
      ctx.fillStyle = '#00c2e0'; R(-u * 1.5, -u * 3, u * 3, u * 6, u * 0.45); ctx.fill();
    }
    ctx.restore();
  }

  window.PROBLEMS = { draw, svg, item };
})();
