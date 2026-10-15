// =====================================================================
//  DE R$ 1 A R$ 1 MILHÃO — regras puras (sem tela)
//  Usado pelo jogo, pelo ADM e pelos testes. Nada aqui mexe no DOM.
//  Tempo em MINUTOS. Dinheiro em REAIS.
// =====================================================================
(function (root) {
  'use strict';
  const H = 60;

  function make(D, M, getSet) {
    const SET = () => Object.assign({}, D.DEFAULTS, getSet ? getSet() : {});
    const cityOf = id => M.cities[id];

    function fresh() {
      return {
        v: 1, started: false, introDone: false,
        balance: D.START_BALANCE, debt: 0,
        elapsed: 0,                       // minutos desde o começo (dia 1, START_HOUR)
        awake: D.START_AWAKE * H,         // minutos acordado desde a última dormida
        city: D.START_CITY, visited: [cityOf(D.START_CITY).country], cities: [D.START_CITY],
        history: [], counts: {}, assets: [], streams: [], payouts: [], boosts: {},
        stats: { earned: 0, spent: 0, slept: 0, worked: 0, travel: 0, food: 0, streamIn: 0 },
        ended: null, undo: []
      };
    }
    const total = () => D.DAYS * 24 * H;
    const left = S => Math.max(0, total() - S.elapsed);
    const net = S => S.balance - S.debt;

    /* ------------------------------ viagem ------------------------------ */
    function distKm(a, b) {
      const R = 6371, r = Math.PI / 180;
      const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    }
    function trip(from, to) {
      if (!from || !to || from === to) return null;
      const k1 = from + '>' + to, k2 = to + '>' + from;
      const t = D.TRIPS[k1] || D.TRIPS[k2];
      if (t) return { from, to, min: Math.round(t.h * H), cost: t.cost, mode: t.mode, label: t.label || '' };
      const A = cityOf(from), B = cityOf(to), d = distKm(A, B);
      const intl = A.country !== B.country;
      const h = intl ? Math.round(d / 750 + 6) : Math.round(d / 700 + 3);
      const cost = Math.round((intl ? 1800 + d * 0.25 : 250 + d * 0.5) / 10) * 10;
      return { from, to, min: h * H, cost, mode: 'avião', label: '' };
    }

    /* ------------------------------ regras ------------------------------ */
    const count = (S, id) => S.counts[id] || 0;
    const has = (S, asset) => S.assets.includes(asset);
    function costOf(S, a) {
      if (a.costIf && has(S, a.costIf.asset)) return a.costIf.cost;
      return a.cost || 0;
    }
    function streamOk(S, tag, min) {
      const st = S.streams.filter(s => s.tag === tag);
      if (!st.length) return false;
      if (min && st.reduce((v, s) => v + s.paid, 0) < min) return false;
      return true;
    }
    // o que falta pra poder fazer (texto) — null se nada falta
    function missing(S, a) {
      const out = [];
      (a.needs || []).forEach(n => { if (!has(S, n)) out.push((D.ASSETS[n] && D.ASSETS[n].need) || n); });
      if (a.needsStream && !streamOk(S, a.needsStream.tag, a.needsStream.min)) out.push(a.needsStream.text);
      if (a.needsDebt && S.debt <= 0) out.push('ter alguma dívida');
      if (a.kind === 'viagem' && a.city === S.city) out.push('não estar já em ' + cityOf(a.city).name);
      if (a.needsEarned && S.stats.earned < a.needsEarned.min) out.push(a.needsEarned.text);
      if (a.notDone && a.notDone.some(id => count(S, id) > 0)) out.push(a.notDoneText || 'não ter feito outra coisa antes');
      if (a.needsDone && !a.needsDone.every(id => count(S, id) > 0)) out.push(a.needsDoneText || 'fazer outra coisa antes');
      return out.length ? out : null;
    }

    function flexDefault(S, a, tripCost) {
      const f = a.flex;
      let b = Math.min(f.max, S.balance - (tripCost || 0));
      if (f.unit) b = Math.floor(b / f.unit) * f.unit;
      else if (b > 1000) b = Math.floor(b / 100) * 100; else b = Math.floor(b);
      return Math.max(f.min, b);
    }
    function quote(S, a, opt) {
      opt = opt || {};
      const st = SET();
      const MAXA = st.maxAwakeH * H, SLEEP = st.sleepH * H;
      const steps = [];
      let awake = S.awake;
      const tr = (a.remote || !a.city) ? null : trip(S.city, a.city);
      const hours = Math.round((opt.hours != null ? opt.hours : a.hours) * H);
      const sleepStep = () => ({ type: 'sleep', min: SLEEP, cost: st.food });
      // prevê quantas vezes vai dormir (pra reservar a comida)
      let foodRes = 0;
      {
        let aw = S.awake;
        if (tr) { const lt = tr.min >= st.sleepH * H * 0.85; if (!lt && aw + tr.min > MAXA) { foodRes += st.food; aw = 0; } if (lt) foodRes += st.food; aw = lt ? Math.min(8 * H, Math.max(0, tr.min - SLEEP)) : aw + tr.min; }
        if (a.kind === 'sono') foodRes += st.food;
        else if (hours > 0 && aw + hours > MAXA && !a.noSleep) foodRes += st.food;
      }
      // orçamento flexível (escolhe quanto investir)
      let budget = null, stream = a.stream ? Object.assign({}, a.stream) : null, payout = a.payout ? Object.assign({}, a.payout) : null;
      let aCost = costOf(S, a), aGain = a.gain || 0;
      if (a.flex) {
        const f = a.flex;
        budget = opt.budget != null ? opt.budget : flexDefault(S, a, (tr ? tr.cost : 0) + foodRes);
        budget = Math.max(f.min, Math.min(f.max, budget));
        if (f.unit) budget = Math.max(f.unit, Math.round(budget / f.unit) * f.unit);
        aCost = budget; aGain = f.ret ? Math.round(budget * f.ret) : 0;
        if (f.stream) { const tot = Math.round(budget * f.stream.ret); stream = { tag: f.stream.tag, name: f.stream.name, total: tot, perDay: tot * f.stream.speed, delayH: f.stream.delayH || 0 }; }
        if (f.payout) payout = { amount: Math.round(budget * f.payout.ret), afterH: f.payout.afterH, name: f.payout.name };
      }
      if (opt.cost != null) aCost = opt.cost;
      if (opt.gain != null) aGain = opt.gain;
      if (tr) {
        const longTrip = tr.min >= st.sleepH * H * 0.85;
        if (!longTrip && awake + tr.min > MAXA) { steps.push(sleepStep()); awake = 0; }
        steps.push({ type: 'trip', min: tr.min, cost: tr.cost, trip: tr, sleeps: longTrip });
        awake = longTrip ? Math.min(8 * H, Math.max(0, tr.min - SLEEP)) : awake + tr.min;
      }
      if (a.kind === 'sono') {
        steps.push(sleepStep()); awake = 0;
      } else if (hours > 0) {
        if (awake + hours > MAXA && !a.noSleep) { steps.push(sleepStep()); awake = 0; }
        steps.push({ type: 'act', min: hours, cost: aCost, gain: aGain });
        awake += hours;
      } else {
        steps.push({ type: 'act', min: 0, cost: aCost, gain: aGain });
      }
      const minutes = steps.reduce((v, s) => v + s.min, 0);
      const tripCost = tr ? tr.cost : 0;
      const act = steps.find(s => s.type === 'act') || { cost: 0, gain: 0, min: 0 };
      const sleeps = steps.filter(s => s.type === 'sleep').length + (tr && steps.find(s => s.type === 'trip').sleeps ? 1 : 0);
      const needCash = tripCost + act.cost + (act.cost > 0 || tripCost > 0 ? foodRes : 0);
      const miss = missing(S, a);
      const repeatLeft = (a.repeat || 1) - count(S, a.id);
      return {
        steps, minutes, trip: tr, tripCost, budget, stream, payout, foodRes, cost: act.cost, gain: act.gain, actMin: act.min, sleeps,
        needCash, awakeAfter: awake,
        tooPoor: needCash > S.balance + 0.001,
        tooLong: minutes > left(S),
        missing: miss, used: repeatLeft <= 0,
        ok: !miss && repeatLeft > 0 && needCash <= S.balance + 0.001 && minutes <= left(S)
      };
    }

    /* ---------------------- passagem do tempo ---------------------- */
    // anda o relógio e devolve quanto entrou de negócios rodando (por stream)
    function pass(S, min) {
      const got = [];
      if (min <= 0) return got;
      const t0 = S.elapsed, t1 = S.elapsed + min;
      for (const s of S.streams) {
        if (s.left <= 0) continue;
        const a = Math.max(t0, s.start), b = t1;
        if (b <= a) continue;
        const mult = (S.boosts[s.tag] || 1) * (s.mult || 1);
        const v = Math.min(s.left, s.perMin * mult * (b - a));
        if (v <= 0) continue;
        s.left -= v; s.paid += v; S.balance += v; S.stats.streamIn += v; S.stats.earned += v;
        got.push({ name: s.name, v, tag: s.tag });
      }
      // pagamentos com data marcada
      for (const p of S.payouts) {
        if (p.done || p.at > t1) continue;
        p.done = true; S.balance += p.amount; S.stats.earned += p.amount;
        got.push({ name: p.name, v: p.amount, payout: true });
      }
      S.elapsed = t1;
      return got;
    }
    function rateNow(S) { // R$ por dia rendendo agora
      let r = 0;
      for (const s of S.streams) if (s.left > 0 && s.start <= S.elapsed) r += s.perMin * (S.boosts[s.tag] || 1) * (s.mult || 1) * 1440;
      return r;
    }

    // aplica a ação inteira (sem animação). Devolve o registro do histórico + eventos por etapa
    function apply(S, a, q) {
      const st = SET();
      const before = S.balance;
      const ev = [];
      for (const s of q.steps) {
        if (s.type === 'sleep') {
          const got = pass(S, s.min);
          const food = Math.min(S.balance, s.cost || 0);
          S.balance -= food; S.stats.food += food; S.stats.spent += food;
          S.awake = 0; S.stats.slept += s.min;
          ev.push({ type: 'sleep', min: s.min, got, food });
        } else if (s.type === 'trip') {
          S.balance -= s.cost; S.stats.spent += s.cost; S.stats.travel += s.min;
          const got = pass(S, s.min);
          let food = 0;
          if (s.sleeps) { food = Math.min(S.balance, st.food); S.balance -= food; S.stats.food += food; S.stats.spent += food; S.stats.slept += Math.min(s.min, st.sleepH * H); }
          S.city = s.trip.to;
          const c = cityOf(S.city).country; if (!S.visited.includes(c)) S.visited.push(c);
          if (!S.cities.includes(S.city)) S.cities.push(S.city);
          S.awake = q.steps.indexOf(s) >= 0 && s.sleeps ? Math.min(8 * H, Math.max(0, s.min - st.sleepH * H)) : S.awake + s.min;
          ev.push({ type: 'trip', min: s.min, cost: s.cost, trip: s.trip, got, food });
        } else {
          S.balance -= s.cost; S.stats.spent += s.cost;
          const got = pass(S, s.min);
          S.balance += s.gain; S.stats.earned += s.gain;
          S.awake += s.min;
          if (a.work) S.stats.worked += s.min;
          ev.push({ type: 'act', min: s.min, cost: s.cost, gain: s.gain, got });
        }
      }
      // efeitos da ação
      S.counts[a.id] = (S.counts[a.id] || 0) + 1;
      (a.gives || []).forEach(g => { if (!S.assets.includes(g)) S.assets.push(g); });
      (a.takes || []).forEach(g => { S.assets = S.assets.filter(x => x !== g); });
      if (q.stream) {
        const sdef = q.stream;
        S.streams.push({ id: a.id + '#' + S.counts[a.id], src: a.id, tag: sdef.tag, name: sdef.name, perMin: sdef.perDay / 1440,
          left: sdef.total || 1e12, totalCap: sdef.total || 0, paid: 0, start: S.elapsed + Math.round((sdef.delayH || 0) * H), mult: 1 });
      }
      if (a.boost) S.boosts[a.boost.tag] = (S.boosts[a.boost.tag] || 1) * a.boost.mult;
      if (a.stop) S.streams.forEach(s => { if (a.stop.includes(s.tag)) s.left = 0; });
      if (a.loan) { S.debt += a.loan; }
      if (a.payDebt) { const p = Math.min(S.debt, S.balance); S.balance -= p; S.debt -= p; }
      if (q.payout) S.payouts.push({ at: S.elapsed + Math.round(q.payout.afterH * H), amount: q.payout.amount, name: q.payout.name, done: false });
      S.stats.spent += 0;
      const h = {
        id: a.id, name: a.name, short: a.short || a.name, cat: a.cat, kind: a.kind,
        cost: q.cost, gain: q.gain, tripCost: q.tripCost, budget: q.budget, streamTotal: q.stream ? q.stream.total : 0, payoutAmount: q.payout ? q.payout.amount : 0, payoutAt: q.payout ? S.elapsed + Math.round(q.payout.afterH * H) : null, minutes: q.minutes, actMin: q.actMin,
        city: S.city, from: q.trip ? q.trip.from : null, to: q.trip ? q.trip.to : null,
        at: S.elapsed, before, after: S.balance, ev
      };
      S.history.push(h);
      return h;
    }

    // relógio do jogo
    function clock(S, el) {
      const m = (el == null ? S.elapsed : el) + D.START_HOUR * H;
      const day = Math.floor(m / 1440) + 1, hh = Math.floor((m % 1440) / 60), mm = Math.floor(m % 60);
      return { day, hh, mm, txt: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, wd: D.WEEKDAYS[(D.START_WEEKDAY + day - 1) % 7] };
    }

    return { fresh, flexDefault, quote, apply, pass, rateNow, trip, missing, costOf, clock, left, net, total, has, count, distKm };
  }

  root.MILHAO_CORE = { make };
  if (typeof module !== 'undefined') module.exports = { make };
})(typeof window !== 'undefined' ? window : globalThis);
