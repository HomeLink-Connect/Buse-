/* Offrez core — config, utilities, data layer, auth. */
'use strict';
window.O = window.O || {};
(function (O) {

  /* ---------------- CONFIG ---------------- */
  O.CFG = {
    APP: 'Offrez',
    VERSION: '2.0.0',
    // Staff who may open the Admin portal. Must be REAL mailboxes you control (email is verified).
    // Keep this list identical to the one in firestore.rules.
    ADMIN_EMAILS: ['CHANGE-ME@example.com'],
    SUPPORT_EMAIL: 'support@your-domain.com',
    AREAS: {
      Bindura: ['Shashi View', 'Clusters', 'Chipindura', 'Administrative Campus'],
      Kadoma: ['Rimuka', 'Ngezi', 'Waverley', 'Mbizo']
    },
    ROOM_TYPES: ['Single', 'Shared', 'Self-Contained'],
    GENDER_PREFS: ['Any', 'Male Only', 'Female Only'],
    AMENITIES: ['WiFi', 'Borehole Water', 'Prepaid Electricity', 'Furnished', 'Security Guard', 'Study Desk', 'Shared Kitchen', 'Private Bathroom', 'Solar Backup', 'Parking', 'Perimeter Wall', 'Gated Yard'],
    PAY_METHODS: ['EcoCash', 'OneMoney', 'Bank Transfer', 'Cash (receipt required)']
  };
  O.areaList = () => Object.entries(O.CFG.AREAS).flatMap(([town, list]) => list.map(a => `${a} (${town})`));

  /* ---------------- UTILITIES ---------------- */
  O.$ = (s, r = document) => r.querySelector(s);
  O.$$ = (s, r = document) => [...r.querySelectorAll(s)];
  O.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  O.money = n => '$' + (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  O.iso = () => new Date().toISOString();
  O.fdate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  O.fdt = d => d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
  O.ago = d => {
    const s = Math.max(1, Math.round((Date.now() - new Date(d).getTime()) / 1000));
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    if (s < 604800) return Math.floor(s / 86400) + ' d ago';
    return O.fdate(d);
  };
  O.id = p => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  O.ic = (n, c = '') => `<svg class="i ${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  O.initials = p => ((p?.fname || p?.name || '?')[0] + (p?.lname?.[0] || '')).toUpperCase();
  O.fullName = p => p ? `${p.fname || ''} ${p.lname || ''}`.trim() || p.name || 'User' : 'User';
  O.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  O.isEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
  O.normReg = r => String(r || '').replace(/\s+/g, '').toUpperCase();
  O.hash = str => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 0x01000193) >>> 0; } return h.toString(16); };
  O.mapsUrl = area => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((area || '') + ', Zimbabwe');

  /* ---------------- STATE ---------------- */
  O.S = { cloud: false, ready: false, user: null, role: null, me: null, page: null, auth: {}, f: { q: '', area: '', type: '', gender: '', max: '', sort: 'newest', verified: false, amen: [] } };
  O.DB = { profiles: [], properties: [], bookings: [], messages: [], reviews: [], reports: [], notifications: [], verifications: [], vfiles: [] };
  O.onData = () => { };

  /* ---------------- TOAST / MODAL ---------------- */
  O.toast = (msg, type = 'info') => {
    const box = O.$('#toasts'); if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.setAttribute('role', 'status');
    el.innerHTML = O.ic(type === 'error' ? 'alert' : type === 'success' ? 'check-circle' : 'info') + `<span>${O.esc(msg)}</span>`;
    box.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 4200);
  };
  O.modal = ({ title = '', body = '', foot = '', wide = false, cls = '' }) => {
    const root = O.$('#modalRoot');
    const el = document.createElement('div');
    el.className = 'mback';
    el.dataset.act = 'mbackdrop';
    el.innerHTML = `<div class="modal ${wide ? 'wide' : ''} ${cls}" role="dialog" aria-modal="true" aria-label="${O.esc(title)}">
      <div class="mhead"><h3>${title}</h3><button class="btn icon ghost" data-act="closeModal" aria-label="Close">${O.ic('x')}</button></div>
      <div class="mbody">${body}</div>${foot ? `<div class="mfoot">${foot}</div>` : ''}</div>`;
    root.appendChild(el);
    document.body.classList.add('lock');
    requestAnimationFrame(() => el.classList.add('in'));
    const first = el.querySelector('input:not([type=hidden]),textarea,select');
    if (first && matchMedia('(hover:hover)').matches) setTimeout(() => first.focus(), 120);
    return el;
  };
  O.closeModal = (all = false) => {
    const root = O.$('#modalRoot'); if (!root) return;
    const list = [...root.children];
    (all ? list : list.slice(-1)).forEach(m => { m.classList.remove('in'); setTimeout(() => m.remove(), 180); });
    if (all || list.length <= 1) setTimeout(() => { if (!root.children.length) document.body.classList.remove('lock'); }, 200);
  };
  O.confirm = ({ title, body, ok = 'Confirm', danger = false }) => new Promise(res => {
    const m = O.modal({ title, body: `<p class="muted">${body}</p>`, foot: `<button class="btn ghost" data-confirm="0">Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" data-confirm="1">${ok}</button>` });
    m.addEventListener('click', e => {
      const b = e.target.closest('[data-confirm]'); if (!b) return;
      e.stopPropagation(); O.closeModal(); res(b.dataset.confirm === '1');
    });
  });

  /* ---------------- IMAGE COMPRESSION ---------------- */
  O.compress = (file, { max = 900, q = 0.72, limitKB = 0 } = {}) => new Promise((res, rej) => {
    if (!file || !/^image\//.test(file.type)) return rej(new Error('Please choose an image file.'));
    const fr = new FileReader();
    fr.onerror = () => rej(new Error('Could not read that file.'));
    fr.onload = () => {
      const im = new Image();
      im.onerror = () => rej(new Error('That image could not be opened.'));
      im.onload = () => {
        let dim = max, qual = q, out = '';
        for (let i = 0; i < 7; i++) {
          const s = Math.min(1, dim / Math.max(im.width, im.height));
          const c = document.createElement('canvas');
          c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          out = c.toDataURL('image/jpeg', qual);
          if (!limitKB || out.length * 0.75 / 1024 <= limitKB) break;
          qual = Math.max(0.4, qual - 0.07); dim = Math.round(dim * 0.86);
        }
        res(out);
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  });

  /* ---------------- LOCAL (OFFLINE DEMO) STORE ---------------- */
  const LKEY = 'offrez_local_v2';
  O.persistLocal = () => { try { localStorage.setItem(LKEY, JSON.stringify(O.DB)); } catch (e) { console.warn('Local storage full', e); } };
  O.loadLocal = () => {
    try { Object.assign(O.DB, JSON.parse(localStorage.getItem(LKEY) || '{}')); } catch (e) { /* ignore */ }
    if (!O.DB.properties.length) seedDemo();
  };
  function seedDemo() {
    const ll = { id: 'demo_ll', role: 'landlord', fname: 'Tatenda', lname: 'Moyo', business: 'Demo Lodges', phone: '0772 000 000', email: 'demo@offrez.local', joined: O.iso() };
    O.DB.profiles.push(ll);
    O.DB.verifications.push({ id: ll.id, landlordId: ll.id, status: 'approved', landlordName: 'Tatenda Moyo', submittedAt: O.iso() });
    const areas = O.areaList(), types = O.CFG.ROOM_TYPES, am = O.CFG.AMENITIES, titles = ['Cosy single room', 'Shared 2-bed cottage', 'Self-contained bedsitter', 'Boarding-house room', 'Modern lodge room', 'Budget-friendly room'];
    for (let i = 0; i < 8; i++) {
      O.DB.properties.push({
        id: 'demo_p' + i, landlordId: ll.id, landlordName: 'Tatenda Moyo', landlordBiz: 'Demo Lodges', landlordVerified: i % 4 !== 3, approved: true,
        title: `${titles[i % 6]} — ${areas[i % areas.length].split(' (')[0]}`, area: areas[i % areas.length], price: 40 + (i % 5) * 15,
        roomType: types[i % 3], genderPref: ['Any', 'Male Only', 'Female Only', 'Any'][i % 4], distanceKm: (1 + (i % 6) * 0.7).toFixed(1),
        amenities: am.slice(i % 5, i % 5 + 5), bedrooms: 1 + (i % 3), capacity: 1 + (i % 2), status: i === 5 ? 'Occupied' : 'Available', photos: [],
        description: 'A comfortable, secure room close to campus transport. Water and prepaid electricity available. Viewing by appointment.',
        created: new Date(Date.now() - i * 86400000).toISOString()
      });
    }
    O.persistLocal();
  }

  /* ---------------- DATA LAYER ---------------- */
  O.upsert = (name, obj) => {
    const a = O.DB[name], i = a.findIndex(x => x.id === obj.id);
    if (i >= 0) a[i] = { ...a[i], ...obj }; else a.push({ ...obj });
  };
  O.save = async (name, obj) => {
    obj = JSON.parse(JSON.stringify(obj));
    O.upsert(name, obj);
    if (!O.S.cloud) { O.persistLocal(); O.onData(name); return true; }
    try {
      const { F, db } = window.FB;
      await F.setDoc(F.doc(db, name, obj.id), obj, { merge: true });
      return true;
    } catch (e) {
      console.error('save failed', name, e);
      O.toast(e.code === 'permission-denied' ? 'Not allowed by database rules. Check firestore.rules is published.' : 'Could not save online. It will retry when you are connected.', 'error');
      return false;
    }
  };
  O.del = async (name, id) => {
    O.DB[name] = O.DB[name].filter(x => x.id !== id);
    if (!O.S.cloud) { O.persistLocal(); O.onData(name); return; }
    try { const { F, db } = window.FB; await F.deleteDoc(F.doc(db, name, id)); } catch (e) { console.error(e); O.toast('Delete failed.', 'error'); }
  };
  O.getDocOnce = async (name, id) => {
    const local = O.DB[name].find(x => x.id === id); if (local) return local;
    if (!O.S.cloud) return null;
    try { const { F, db } = window.FB; const s = await F.getDoc(F.doc(db, name, id)); return s.exists() ? { id: s.id, ...s.data() } : null; } catch (e) { return null; }
  };
  O.notify = (userId, title, body, type = 'info') =>
    O.save('notifications', { id: O.id('n'), userId, title, body, type, read: false, date: O.iso() });

  /* Real-time listeners, scoped per role so users only ever download their own data. */
  O.unsubs = [];
  O.stopSync = () => { O.unsubs.forEach(u => { try { u(); } catch (e) { } }); O.unsubs = []; };
  O.syncErr = (name, err) => {
    console.warn('listener', name, err.code || err.message);
    if (err.code === 'permission-denied') O.banner?.('Database rules are blocking “' + name + '”. Publish the supplied firestore.rules in Firebase Console → Firestore → Rules.');
  };
  O.startSync = () => {
    O.stopSync();
    if (!O.S.cloud) { O.loadLocal(); return; }
    const { F, db } = window.FB, w = F.where, uid = O.S.user.uid, role = O.S.role;
    const col = n => F.collection(db, n);
    const sub = (name, q) => O.unsubs.push(F.onSnapshot(q, snap => { O.DB[name] = snap.docs.map(d => ({ id: d.id, ...d.data() })); O.onData(name); }, e => O.syncErr(name, e)));
    const subDoc = (name, id) => O.unsubs.push(F.onSnapshot(F.doc(db, name, id), s => { O.DB[name] = s.exists() ? [{ id: s.id, ...s.data() }] : []; O.onData(name); }, e => O.syncErr(name, e)));
    if (role === 'admin') {
      ['profiles', 'properties', 'bookings', 'reviews', 'reports', 'verifications'].forEach(n => sub(n, col(n)));
      sub('notifications', F.query(col('notifications'), w('userId', '==', uid)));
      return;
    }
    subDoc('profiles', uid);
    sub('bookings', F.query(col('bookings'), w('parts', 'array-contains', uid)));
    sub('messages', F.query(col('messages'), w('parts', 'array-contains', uid)));
    sub('notifications', F.query(col('notifications'), w('userId', '==', uid)));
    sub('reviews', col('reviews'));
    if (role === 'student') sub('properties', F.query(col('properties'), w('approved', '==', true)));
    if (role === 'landlord') { sub('properties', F.query(col('properties'), w('landlordId', '==', uid))); subDoc('verifications', uid); }
  };

  /* ---------------- AUTH ---------------- */
  O.fbErr = e => {
    const c = (e && e.code) || '';
    if (c.includes('email-already-in-use')) return 'An account with this email already exists. Please log in instead.';
    if (c.includes('invalid-email')) return 'That email address doesn’t look right.';
    if (c.includes('weak-password')) return 'Choose a stronger password (at least 6 characters).';
    if (c.includes('user-not-found') || c.includes('wrong-password') || c.includes('invalid-credential')) return 'Incorrect email or password. If you signed up with Google, use “Continue with Google”.';
    if (c.includes('network-request-failed')) return 'No connection. Check your data/Wi-Fi and try again.';
    if (c.includes('too-many-requests')) return 'Too many attempts. Please wait a minute and try again.';
    if (c.includes('operation-not-allowed')) return 'This sign-in method is not enabled yet in Firebase Console → Authentication → Sign-in method.';
    if (c.includes('unauthorized-domain')) return 'This web address is not authorised. Add it in Firebase Console → Authentication → Settings → Authorized domains.';
    if (c.includes('popup-closed') || c.includes('cancelled-popup')) return '';
    if (c.includes('user-disabled')) return 'This account has been disabled. Contact the Admin Office.';
    return 'Something went wrong. Please try again.';
  };
  O.isAdminEmail = e => O.CFG.ADMIN_EMAILS.map(x => x.toLowerCase()).includes(String(e || '').toLowerCase());
  O.myProfile = () => O.DB.profiles.find(p => p.id === (O.S.user?.uid || O.S.me?.id)) || O.S.me;

  O.fetchProfile = async uid => {
    let p = O.DB.profiles.find(x => x.id === uid);
    if (p) return p;
    if (!O.S.cloud) return null;
    try { const { F, db } = window.FB; const s = await F.getDoc(F.doc(db, 'profiles', uid)); if (s.exists()) { p = { id: s.id, ...s.data() }; O.upsert('profiles', p); return p; } } catch (e) { console.warn(e); }
    return null;
  };

  O.studentIdTaken = async (reg, uid) => {
    const key = O.normReg(reg);
    if (!O.S.cloud) return O.DB.profiles.some(p => p.role === 'student' && p.id !== uid && O.normReg(p.regNumber) === key);
    try {
      const { F, db } = window.FB; const s = await F.getDoc(F.doc(db, 'studentIds', key));
      return s.exists() && s.data().uid !== uid;
    } catch (e) { return false; }
  };
  O.claimStudentId = async (reg, uid) => {
    if (!O.S.cloud) return;
    try { const { F, db } = window.FB; await F.setDoc(F.doc(db, 'studentIds', O.normReg(reg)), { uid, at: O.iso() }); } catch (e) { console.warn('claim id', e); }
  };

  O.register = async (role, profile, password) => {
    if (!O.S.cloud) {
      if (O.DB.profiles.some(p => p.email === profile.email)) return { error: 'An account with this email already exists.' };
      if (role === 'student' && await O.studentIdTaken(profile.regNumber, null)) return { error: 'This Student ID is already registered. Each student may only have one account.' };
      const prof = { ...profile, id: O.id('u'), role, joined: O.iso(), _pw: O.hash(password) };
      await O.save('profiles', prof);
      return { ok: true, profile: prof, verified: true };
    }
    const { A, auth } = window.FB;
    let cred;
    try { cred = await A.createUserWithEmailAndPassword(auth, profile.email, password); } catch (e) { return { error: O.fbErr(e) }; }
    const u = cred.user;
    if (role === 'student') {
      if (await O.studentIdTaken(profile.regNumber, u.uid)) {
        await u.delete().catch(() => { });
        return { error: 'This Student ID is already registered. Each student may only have one account.' };
      }
      await O.claimStudentId(profile.regNumber, u.uid);
    }
    A.updateProfile(u, { displayName: O.fullName(profile) }).catch(() => { });
    const prof = { ...profile, id: u.uid, role, joined: O.iso() };
    const saved = await O.save('profiles', prof);
    A.sendEmailVerification(u).catch(e => console.warn('verification email', e));
    return { ok: true, profile: prof, verified: u.emailVerified, saved };
  };

  O.login = async (email, password) => {
    if (!O.S.cloud) {
      const p = O.DB.profiles.find(x => x.email === email && x._pw === O.hash(password));
      return p ? { ok: true, uid: p.id, verified: true } : { error: 'Incorrect email or password.' };
    }
    const { A, auth } = window.FB;
    try { const c = await A.signInWithEmailAndPassword(auth, email, password); return { ok: true, uid: c.user.uid, verified: c.user.emailVerified || c.user.providerData.some(p => p.providerId === 'google.com') }; }
    catch (e) { return { error: O.fbErr(e) }; }
  };
  O.google = async () => {
    const { A, auth } = window.FB;
    const prov = new A.GoogleAuthProvider(); prov.setCustomParameters({ prompt: 'select_account' });
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || matchMedia('(display-mode: standalone)').matches;
    try {
      if (mobile) { await A.signInWithRedirect(auth, prov); return { redirect: true }; }
      const r = await A.signInWithPopup(auth, prov); return { ok: true, user: r.user };
    } catch (e) {
      if (/popup-blocked|operation-not-supported/.test(e.code || '')) { try { await A.signInWithRedirect(auth, prov); return { redirect: true }; } catch (e2) { e = e2; } }
      return { error: O.fbErr(e) };
    }
  };
  O.resendVerification = async () => {
    if (!O.S.cloud) return { ok: true };
    try { await window.FB.A.sendEmailVerification(window.FB.auth.currentUser); return { ok: true }; }
    catch (e) { return { error: (e.code || '').includes('too-many') ? 'Please wait a minute before requesting another email.' : O.fbErr(e) }; }
  };
  O.checkVerified = async () => {
    if (!O.S.cloud) return true;
    const u = window.FB.auth.currentUser; if (!u) return false;
    try { await u.reload(); if (u.emailVerified) await u.getIdToken(true); } catch (e) { /* offline */ }
    return !!u.emailVerified;
  };
  O.resetPassword = async email => {
    if (!O.S.cloud) return { error: 'Password reset needs an internet connection.' };
    try { await window.FB.A.sendPasswordResetEmail(window.FB.auth, email); return { ok: true }; }
    catch (e) { if ((e.code || '').includes('user-not-found')) return { ok: true }; return { error: O.fbErr(e) }; }
  };
  O.logout = async () => {
    O.stopSync();
    if (O.S.cloud) { try { await window.FB.A.signOut(window.FB.auth); } catch (e) { } }
    localStorage.removeItem('offrez_session');
    O.S.user = null; O.S.role = null; O.S.me = null;
  };

  /* Verification status helpers (used by UI + admin) */
  O.verifOf = id => O.DB.verifications.find(v => v.id === id || v.landlordId === id);
  O.verifStatus = id => O.verifOf(id)?.status || 'none';
  O.ratingOf = pid => { const r = O.DB.reviews.filter(x => x.propertyId === pid); return { n: r.length, avg: r.length ? r.reduce((s, x) => s + x.rating, 0) / r.length : 0 }; };
})(window.O);
