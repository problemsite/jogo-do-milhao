/* =====================================================================
   NET — liga o jogo ao ADM ao vivo
   - Online (GitHub Pages + trava.js): Firebase único "jogos-github",
     pasta sites/<site>/sala  →  estado, digitando, online, cmd, set, ovr
   - Sem a trava (arquivo aberto no PC, localhost ou ?local): MODO LOCAL,
     o ADM precisa estar aberto no MESMO navegador (outra aba/janela).
   ===================================================================== */
(function () {
  const SITE = (document.currentScript && document.currentScript.dataset.site) || 'jogo-do-milhao';
  const PASTA = 'sala';
  const params = new URLSearchParams(location.search);
  const LS = k => 'milhao_net_' + k;
  let modo = 'local', root = null, bc = null, myId = 'j' + Math.random().toString(36).slice(2, 9);
  let lastNonce = null;

  function carregar(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  async function firebaseRoot() {
    const t = await window.Trava.ready;
    if (!t) throw new Error('trava sem liberação');
    const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
    if (!window.firebase) await carregar(SDK + 'firebase-app-compat.js');
    if (!firebase.auth) await carregar(SDK + 'firebase-auth-compat.js');
    if (!firebase.database) await carregar(SDK + 'firebase-database-compat.js');
    if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
    const db = firebase.database(), auth = firebase.auth();
    if (!auth.currentUser) await auth.signInAnonymously();
    // navegador da equipe: avisa a Central que este jogo grava na pasta "sala"
    if (window.Trava.admin) {
      try {
        const ref = db.ref('controle/sites/' + SITE);
        const cur = (await ref.once('value')).val();
        if (!cur) await ref.set({ open: false, escrita: { [PASTA]: true }, t: firebase.database.ServerValue.TIMESTAMP });
        else if (!cur.escrita || !cur.escrita[PASTA]) await ref.child('escrita/' + PASTA).set(true);
      } catch (e) { console.warn('controle', e); }
    }
    return { db, root: db.ref((window.DB_ROOT || 'sites/' + SITE) + '/' + PASTA) };
  }
  const useFirebase = () => window.Trava && window.Trava.ready && !params.has('local') && location.protocol !== 'file:';

  // ---------- local ----------
  function localStart(handlers) {
    try { bc = new BroadcastChannel('milhao_net'); } catch (e) {}
    const onMsg = m => { if (!m || !m.k) return; handlers(m.k, m.v); };
    if (bc) bc.onmessage = ev => onMsg(ev.data);
    window.addEventListener('storage', e => {
      if (!e.key || !e.key.startsWith('milhao_net_') || e.newValue == null) return;
      try { onMsg({ k: e.key.slice(11), v: JSON.parse(e.newValue) }); } catch (er) {}
    });
  }
  function localPut(k, v) {
    try { localStorage.setItem(LS(k), JSON.stringify(v)); } catch (e) {}
    if (bc) bc.postMessage({ k, v });
  }
  function localGet(k) { try { const v = localStorage.getItem(LS(k)); return v ? JSON.parse(v) : null; } catch (e) { return null; } }

  const NET = {
    get modo() { return modo; }, site: SITE,

    /* ===== lado do JOGO ===== */
    async start({ onCmd, onSettings, onOverrides }) {
      const handleCmd = c => {
        if (!c || !c.nonce || c.nonce === lastNonce) return;
        lastNonce = c.nonce;
        onCmd && onCmd(c);
      };
      if (useFirebase()) {
        try {
          const r = await firebaseRoot(); root = r.root; modo = 'firebase';
          const db = r.db;
          db.ref('.info/connected').on('value', s => {
            if (!s.val()) return;
            const me = root.child('online/' + myId);
            me.onDisconnect().remove(); me.set({ t: firebase.database.ServerValue.TIMESTAMP, quem: 'jogo' });
          });
          let first = true;
          root.child('cmd').on('value', s => { const v = s.val(); if (first) { first = false; lastNonce = v && v.nonce; return; } handleCmd(v); });
          root.child('set').on('value', s => { const v = s.val(); if (v) onSettings && onSettings(v); });
          root.child('ovr').on('value', s => { onOverrides && onOverrides(s.val() || {}); });
          return modo;
        } catch (e) { console.warn('Firebase indisponível, modo local', e); }
      }
      modo = 'local';
      localStart((k, v) => {
        if (k === 'cmd') handleCmd(v);
        if (k === 'set' && v) onSettings && onSettings(v);
        if (k === 'ovr') onOverrides && onOverrides(v || {});
      });
      const s = localGet('set'); if (s) onSettings && onSettings(s);
      const o = localGet('ovr'); if (o) onOverrides && onOverrides(o);
      setInterval(() => localPut('online', { [myId]: { t: Date.now(), quem: 'jogo' } }), 2000);
      return modo;
    },
    report(sum) {
      if (modo === 'firebase' && root) root.child('estado').set(JSON.parse(JSON.stringify(sum))).catch(e => console.warn('estado', e));
      else localPut('estado', sum);
    },
    typing(text) {
      const v = { text: text || '', t: Date.now() };
      if (modo === 'firebase' && root) root.child('digitando').set(v).catch(() => {});
      else localPut('digitando', v);
    },
    pushSettings(set) {
      if (modo === 'firebase' && root) root.child('set').set(JSON.parse(JSON.stringify(set))).catch(() => {});
      else localPut('set', set);
    },

    /* ===== lado do ADM ===== */
    async startAdm({ onState, onTyping, onOnline, onSettings, onOverrides }) {
      if (useFirebase()) {
        try {
          const r = await firebaseRoot(); root = r.root; modo = 'firebase';
          root.child('estado').on('value', s => onState && onState(s.val()));
          root.child('digitando').on('value', s => onTyping && onTyping(s.val()));
          root.child('online').on('value', s => onOnline && onOnline(s.val() || {}));
          root.child('set').on('value', s => onSettings && onSettings(s.val()));
          root.child('ovr').on('value', s => onOverrides && onOverrides(s.val() || {}));
          return modo;
        } catch (e) { console.warn('Firebase indisponível, modo local', e); }
      }
      modo = 'local';
      let online = {};
      localStart((k, v) => {
        if (k === 'estado') onState && onState(v);
        if (k === 'digitando') onTyping && onTyping(v);
        if (k === 'online') { online = v || {}; onOnline && onOnline(online); }
        if (k === 'set') onSettings && onSettings(v);
        if (k === 'ovr') onOverrides && onOverrides(v || {});
      });
      onState && onState(localGet('estado')); onTyping && onTyping(localGet('digitando'));
      onSettings && onSettings(localGet('set')); onOverrides && onOverrides(localGet('ovr') || {});
      setInterval(() => { const o = localGet('online') || {}; onOnline && onOnline(o); }, 2500);
      return modo;
    },
    send(cmd, ...args) {
      const c = { cmd, args, nonce: Math.random().toString(36).slice(2) + Date.now(), t: Date.now() };
      if (modo === 'firebase' && root) return root.child('cmd').set(c);
      localPut('cmd', c); return Promise.resolve();
    },
    setSettings(set) {
      if (modo === 'firebase' && root) return root.child('set').set(JSON.parse(JSON.stringify(set)));
      localPut('set', set); return Promise.resolve();
    },
    setOverrides(o) {
      if (modo === 'firebase' && root) return root.child('ovr').set(JSON.parse(JSON.stringify(o || {})));
      localPut('ovr', o || {}); return Promise.resolve();
    },
    online(o) { if (!o) return false; const now = Date.now(); return Object.values(o).some(x => x && (modo === 'firebase' || now - (x.t || 0) < 6000)); }
  };
  window.NET = NET;
})();
