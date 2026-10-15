/* =====================================================================
   ADM ao vivo — acompanha a tela do jogo e manda comandos
   ===================================================================== */
(async function () {
  const D = window.GAMEDATA, M = window.MAPDATA;
  Object.assign(M.cities, D.CITIES);
  const $ = s => document.querySelector(s);
  const nf = new Intl.NumberFormat('pt-BR');
  const R = v => (v < -0.5 ? '−' : '') + 'R$ ' + nf.format(Math.round(Math.abs(v || 0)));
  const RS = v => (v >= 0 ? '+' : '−') + 'R$ ' + nf.format(Math.round(Math.abs(v || 0)));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hm = min => { min = Math.max(0, Math.round(min || 0)); const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60; return (d ? d + 'd ' : '') + h + 'h' + (m && !d ? ' ' + String(m).padStart(2, '0') + 'min' : ''); };
  const A = id => D.ACTIONS.find(a => a.id === id);
  let ST = null, SETT = null, OVR = {}, online = {};

  function msg(t) { const m = $('#msg'); m.textContent = t; m.classList.add('on'); clearTimeout(msg.t); msg.t = setTimeout(() => m.classList.remove('on'), 1800); }
  async function send(cmd, ...args) { await NET.send(cmd, ...args); msg('enviado: ' + cmd); }

  /* ----------------------- telas (didático) ----------------------- */
  const SCR = {
    menu: ['🏠', 'No menu inicial'], intro: ['🎬', 'Assistindo a introdução'], livre: ['⌨️', 'Livre: pode digitar o que quiser'],
    carregando: ['🔎', 'Procurando o que ele digitou'], card: ['🃏', 'Lendo um card'], acao: ['🏃', 'Animação da ação (tempo passando)'],
    slide: ['🖼️', 'Slide do resultado (esperando avançar)'], sono: ['😴', 'Dormindo (esperando avançar)'], marco: ['🏁', 'Faixa de marco (esperando avançar)'],
    final: ['🏆', 'Tela final'], extrato: ['📜', 'Olhando o extrato']
  };

  /* ----------------------- selects ----------------------- */
  const KIND = { trabalho: 'Trabalho', venda: 'Vender', revenda: 'Revenda', compra: 'Compras', papel: 'Papelada', negocio: 'Negócio', estoque: 'Estoque', marketing: 'Divulgação', leilao: 'Leilão / revenda grande', credito: 'Crédito', grande: 'Final (venda / investidor)', viagem: 'Viagens', sono: 'Corpo', espera: 'Corpo', bloqueado: 'Bloqueados (mensagem)' };
  function actOptions() {
    const groups = {};
    D.ACTIONS.forEach(a => { const g = KIND[a.kind] || a.kind; (groups[g] = groups[g] || []).push(a); });
    return Object.entries(groups).map(([g, list]) => `<optgroup label="${esc(g)}">${list.map(a => `<option value="${a.id}">${esc(a.name)}${a.city && M.cities[a.city] ? ' · ' + esc(M.cities[a.city].name) : a.remote ? ' · pelo celular' : ''}</option>`).join('')}</optgroup>`).join('');
  }
  $('#act').innerHTML = actOptions();
  $('#oAct').innerHTML = actOptions();
  $('#vCount').innerHTML = actOptions();
  const CITY_IDS = [...new Set(D.ACTIONS.filter(a => a.city).map(a => a.city))];
  $('#vCity').innerHTML = CITY_IDS.map(id => `<option value="${id}">${esc(M.cities[id].name)}</option>`).join('');
  $('#assetCtl').innerHTML = '<span class="lbl">Itens</span>' + Object.entries(D.ASSETS).map(([k, v]) => `<label class="ck"><input type="checkbox" data-asset="${k}"> ${v.icon} ${esc(v.name)}</label>`).join('');

  /* ----------------------- render ----------------------- */
  function routeState(ids) {
    // casa a rota com o que ele fez, em ordem (ignora coisas fora da rota)
    let j = 0; const done = [];
    for (const id of ids || []) { if (j < D.ROUTE.length && D.ROUTE[j].id === id) { done.push(j); j++; } }
    return { next: j, done: new Set(done) };
  }
  function render() {
    const S = ST;
    if (!S) return;
    const sc = SCR[S.screen] || ['❔', S.screen];
    $('#scrIc').textContent = sc[0]; $('#scrNm').textContent = sc[1];
    $('#scrDt').textContent = S.detail || '';
    $('#scr').classList.toggle('live', ['slide', 'sono', 'marco', 'intro'].includes(S.screen));
    $('#upd').textContent = 'atualizado ' + new Date(S.t).toLocaleTimeString('pt-BR');
    const ci = $('#cardInfo');
    if (S.screen === 'card' && S.extra) {
      const x = S.extra;
      ci.innerHTML = `<b>${esc(x.id)}</b> · custa ${R(x.cost)} · volta ${R(x.gain)} · ${hm(x.min)}${x.budget ? ' · orçamento ' + R(x.budget) : ''} · ${x.ok ? '<span class="pos">pode fazer</span>' : '<span class="neg">não pode: ' + esc(x.why) + '</span>'}`;
      ci.classList.add('on');
    } else ci.classList.remove('on');
    const goal = D.GOAL;
    $('#nums').innerHTML = [
      ['Saldo', R(S.balance), 'g'], ['Dívida', R(S.debt), S.debt > 0 ? 'r' : ''], ['Líquido', R(S.net), ''], ['Rendendo', RS(S.rate) + '/dia', S.rate > 0 ? 'g' : ''],
      ['Relógio', S.clock, ''], ['Tempo restante', hm(S.left), S.left < 1440 ? 'r' : S.left < 2880 ? 'y' : ''], ['Acordado há', hm(S.awake), S.awake > (S.settings.maxAwakeH - 4) * 60 ? 'y' : ''], ['Cidade', S.cityName, '']
    ].map(([k, v, c]) => `<div class="kv"><span>${k}</span><b class="${c}">${esc(v)}</b></div>`).join('');
    const pct = Math.max(0, Math.min(1, Math.log10(Math.max(1, S.net)) / 6));
    $('#goalBar').style.width = (pct * 100).toFixed(1) + '%';
    $('#goalTxt').textContent = `${(Math.max(0, S.net) / goal * 100).toFixed(S.net < 10000 ? 4 : 2).replace('.', ',')}% da meta · faltam ${R(Math.max(0, goal - S.net))}${S.ended ? ' · FIM: ' + (S.ended === 'win' ? 'VENCEU' : 'PERDEU') : ''}`;
    // negócios
    const biz = (S.streams || []).filter(s => s.left > 0.5 || s.waiting).map(s => `<li><span class="n">${esc(s.name)}</span><span class="m">${s.waiting ? 'a caminho' : s.total ? 'vendido ' + R(s.paid) + ' de ' + R(s.total) : 'todo dia'}</span><b class="pos">${RS(s.perDay)}/dia</b></li>`)
      .concat((S.payouts || []).map(p => `<li><span class="n">💰 ${esc(p.name)}</span><span class="m">cai ${esc(p.when)}</span><b>${R(p.amount)}</b></li>`));
    $('#biz').innerHTML = biz.join('') || '<li class="empty">nenhum ainda</li>';
    $('#assets').innerHTML = (S.assets || []).map(a => `<span class="chip">${(D.ASSETS[a] || {}).icon || ''} ${esc((D.ASSETS[a] || {}).name || a)}</span>`).join('') || '<span class="empty">nenhum</span>';
    document.querySelectorAll('[data-asset]').forEach(c => { c.checked = (S.assets || []).includes(c.dataset.asset); });
    // histórico
    $('#hist').innerHTML = (S.history || []).slice().reverse().map(h => `<li><span class="m">D${h.day} ${h.at}</span><span class="n">${esc(h.name)}</span><b class="${h.d >= 0 ? 'pos' : 'neg'}">${RS(h.d)}</b></li>`).join('') || '<li class="empty">nada ainda</li>';
    // rota
    const rs = routeState(S.ids);
    $('#route').innerHTML = D.ROUTE.map((r, i) => `<li class="${rs.done.has(i) ? 'done' : ''} ${i === rs.next ? 'next' : ''}"><span class="k">${i + 1}</span><span class="n">${esc(r.say)}</span><span class="m">${esc(r.id)}</span></li>`).join('');
    const nx = D.ROUTE[rs.next];
    $('#routeNext').textContent = nx ? 'próximo: ' + nx.say : 'rota completa';
    const nxEl = $('#route .next'); if (nxEl && !render.scrolled) { nxEl.scrollIntoView({ block: 'nearest' }); }
    // próxima busca forçada
    $('#nextInfo').textContent = S.forceNext ? 'Próxima busca vai mostrar: ' + ((A(S.forceNext) || {}).name || S.forceNext) : '';
    // campos (só preenche se o usuário não estiver editando)
    const fill = (id, v) => { const e = $(id); if (document.activeElement !== e) e.value = v; };
    fill('#vBal', Math.round(S.balance)); fill('#vDebt', Math.round(S.debt)); fill('#vLeft', +(S.left / 60).toFixed(1)); fill('#vAwake', +(S.awake / 60).toFixed(1));
    if (document.activeElement !== $('#vCity')) $('#vCity').value = S.city;
    if (!SETT) applySettingsUI(S.settings);
  }
  function applySettingsUI(s) {
    if (!s) return;
    const set = (id, v, ck) => { const e = $(id); if (document.activeElement === e) return; if (ck) e.checked = !!v; else e.value = v; };
    set('#sAdvance', s.advance); set('#sIntroAuto', s.introAuto, 1); set('#sSkip', s.skipAnim, 1); set('#sMute', s.mute, 1); set('#sCrit', s.crit !== false, 1);
    set('#sSleep', s.sleepH); set('#sMaxAwake', s.maxAwakeH); set('#sFood', s.food); set('#lockMenu', s.lockMenu, 1);
  }
  function currentSettings() { return Object.assign({}, (ST && ST.settings) || {}, SETT || {}); }
  async function saveSettings(patch) { SETT = Object.assign(currentSettings(), patch); await NET.setSettings(SETT); msg('configuração salva'); }

  /* ----------------------- conexão ----------------------- */
  const modo = await NET.startAdm({
    onState: s => { ST = s; render(); },
    onTyping: t => { $('#typing').textContent = t && t.text ? t.text : ''; },
    onOnline: o => { online = o || {}; const on = NET.online(online); $('#online').textContent = on ? 'jogo conectado' : 'jogo desconectado'; $('#online').className = 'pill ' + (on ? 'on' : 'off'); },
    onSettings: s => { if (s) { SETT = s; applySettingsUI(s); } },
    onOverrides: o => { OVR = o || {}; renderOvr(); }
  });
  $('#modo').textContent = modo === 'firebase' ? 'online (Firebase)' : 'modo local (mesmo navegador)';

  /* ----------------------- botões ----------------------- */
  document.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => send(b.dataset.c)));
  const budget = () => { const v = parseFloat($('#budget').value); return isFinite(v) ? v : undefined; };
  $('#aShow').onclick = () => send('show', $('#act').value, budget());
  $('#aDo').onclick = () => send('exec', $('#act').value, { budget: budget() });
  $('#aInst').onclick = () => send('exec', $('#act').value, { budget: budget(), instant: true });
  $('#aForce').onclick = () => { if (confirm('Fazer mesmo sem dinheiro/tempo/requisito?')) send('exec', $('#act').value, { budget: budget(), force: true }); };
  $('#aNext').onclick = () => send('forceNext', $('#act').value);
  $('#aNextClear').onclick = () => send('forceNext', null);
  $('#typeGo').onclick = () => send('typeText', $('#typeIn').value);
  $('#searchGo').onclick = () => send('search', $('#typeIn').value);
  $('#setBal').onclick = () => send('setBalance', +$('#vBal').value);
  $('#addBal').onclick = () => send('addMoney', +$('#vAdd').value);
  $('#setDebt').onclick = () => send('setDebt', +$('#vDebt').value);
  $('#setLeft').onclick = () => send('setLeft', Math.round(+$('#vLeft').value * 60));
  $('#setAwake').onclick = () => send('setAwake', Math.round(+$('#vAwake').value * 60));
  $('#setCity').onclick = () => send('setCity', $('#vCity').value);
  $('#resetCount').onclick = () => send('resetCount', $('#vCount').value);
  document.querySelectorAll('[data-asset]').forEach(c => c.addEventListener('change', () => send(c.checked ? 'giveAsset' : 'takeAsset', c.dataset.asset)));
  $('#lockMenu').onchange = e => saveSettings({ lockMenu: e.target.checked });
  ['#sAdvance', '#sIntroAuto', '#sSkip', '#sMute', '#sCrit'].forEach(id => $(id).addEventListener('change', () => saveSettings({
    advance: $('#sAdvance').value, introAuto: $('#sIntroAuto').checked, skipAnim: $('#sSkip').checked, mute: $('#sMute').checked, crit: $('#sCrit').checked
  })));
  $('#saveSet').onclick = () => saveSettings({ sleepH: +$('#sSleep').value, maxAwakeH: +$('#sMaxAwake').value, food: +$('#sFood').value });
  $('#reset').onclick = () => { if (confirm('Resetar TUDO? Ele volta pro menu com R$ 1.')) send('reset'); };
  $('#win').onclick = () => { if (confirm('Forçar a tela de vitória?')) send('forceWin'); };
  $('#lose').onclick = () => { if (confirm('Forçar a tela de derrota?')) send('forceLose'); };
  $('#reload').onclick = () => send('reload');
  // rota
  const nextRoute = () => { const rs = routeState(ST && ST.ids); return D.ROUTE[rs.next]; };
  $('#rShow').onclick = () => { const n = nextRoute(); if (n) send('show', n.id); };
  $('#rDo').onclick = () => { const n = nextRoute(); if (n) send('exec', n.id, {}); };
  $('#rForce').onclick = () => { const n = nextRoute(); if (n) send('forceNext', n.id); };

  /* ----------------------- valores das ações ----------------------- */
  function fieldsFor(a) {
    const o = OVR[a.id] || {};
    const f = [];
    if (a.flex) {
      f.push(['flex.min', 'Mínimo (R$)', a.flex.min, (o.flex || {}).min], ['flex.max', 'Máximo (R$)', a.flex.max, (o.flex || {}).max]);
      if (a.flex.ret) f.push(['flex.ret', 'Volta (× o investido)', a.flex.ret, (o.flex || {}).ret]);
    } else if (!a.block) {
      f.push(['cost', 'Custa (R$)', a.cost || 0, o.cost], ['gain', 'Volta (R$)', a.gain || 0, o.gain]);
    }
    if (!a.block) f.push(['hours', 'Horas', a.hours || 0, o.hours], ['repeat', 'Vezes que dá', a.repeat || 1, o.repeat]);
    return f;
  }
  function renderOvr() {
    const a = A($('#oAct').value); if (!a) return;
    $('#oFields').innerHTML = fieldsFor(a).map(([k, l, def, cur]) => `<label>${esc(l)}<input type="number" step="any" data-k="${k}" value="${cur != null ? cur : def}" placeholder="${def}"></label>`).join('') || '<span class="hint">Essa é uma mensagem de bloqueio, não tem valores.</span>';
    const mod = Object.keys(OVR);
    $('#oList').textContent = mod.length ? 'Modificadas: ' + mod.map(id => (A(id) || {}).short || id).join(', ') : 'Nenhuma ação modificada.';
  }
  $('#oAct').onchange = renderOvr;
  $('#oSave').onclick = async () => {
    const a = A($('#oAct').value); if (!a) return;
    const o = {};
    $('#oFields').querySelectorAll('input').forEach(i => {
      const v = parseFloat(i.value); if (!isFinite(v)) return;
      const k = i.dataset.k;
      if (k.startsWith('flex.')) { o.flex = o.flex || {}; if (v !== a.flex[k.slice(5)]) o.flex[k.slice(5)] = v; }
      else if (v !== (a[k] || (k === 'repeat' ? 1 : 0))) o[k] = v;
    });
    if (o.flex && !Object.keys(o.flex).length) delete o.flex;
    const all = Object.assign({}, OVR); if (Object.keys(o).length) all[a.id] = o; else delete all[a.id];
    OVR = all; await NET.setOverrides(all); renderOvr(); msg('valores salvos');
  };
  $('#oReset').onclick = async () => { const all = Object.assign({}, OVR); delete all[$('#oAct').value]; OVR = all; await NET.setOverrides(all); renderOvr(); msg('voltou ao original'); };
  $('#oResetAll').onclick = async () => { if (!confirm('Voltar todas as ações aos valores originais?')) return; OVR = {}; await NET.setOverrides({}); renderOvr(); msg('tudo original'); };
  renderOvr();
})();
