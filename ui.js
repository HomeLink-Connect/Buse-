/* Offrez UI core — router, shell, auth screens, gates, chat, notifications, PWA. */
'use strict';
(function (O) {
  const $ = O.$, $$ = O.$$, esc = O.esc, ic = O.ic;
  O.acts = {}; O.forms = {}; O.tmp = {};
  O.routes = { student: {}, landlord: {}, admin: {} };
  O.NAV = {
    student: [['browse', 'Explore', 'search'], ['favourites', 'Saved', 'heart'], ['bookings', 'Bookings', 'calendar'], ['messages', 'Messages', 'message'], ['profile', 'Profile', 'user']],
    landlord: [['dashboard', 'Home', 'grid'], ['properties', 'Listings', 'building'], ['requests', 'Requests', 'calendar'], ['messages', 'Messages', 'message'], ['verify', 'Verify', 'shield-check'], ['profile', 'Profile', 'user']],
    admin: [['overview', 'Overview', 'grid'], ['verifications', 'Verifications', 'shield-check'], ['listings', 'Listings', 'building'], ['reports', 'Reports', 'flag'], ['users', 'Users', 'users'], ['bookings', 'Bookings', 'calendar']]
  };
  const uid = () => O.S.me && O.S.me.id;
  O.uid = uid;

  /* ---------- THEME ---------- */
  O.theme = () => { try { return localStorage.getItem('offrez_theme') || 'auto'; } catch (e) { return 'auto'; } };
  O.applyTheme = t => {
    const r = document.documentElement;
    if (t === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', t);
    try { localStorage.setItem('offrez_theme', t); } catch (e) { }
    const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme:dark)').matches);
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = dark ? '#0a1229' : '#0b1f4d';
  };
  O.acts.theme = () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme:dark)').matches);
    O.applyTheme(dark ? 'light' : 'dark');
    O.refreshChrome();
  };

  /* ---------- SMALL BUILDERS ---------- */
  O.opts = (list, sel) => list.map(o => {
    if (o && o.group) return `<optgroup label="${esc(o.group)}">${O.opts(o.items, sel)}</optgroup>`;
    const [v, l] = Array.isArray(o) ? o : [o, o];
    return `<option value="${esc(v)}" ${String(v) === String(sel) ? 'selected' : ''}>${esc(l)}</option>`;
  }).join('');

  /* One field builder for every form: icon, label, hint, inline error. */
  O.fld = o => {
    const { id, label, icon, type = 'text', ph = '', opt, hint, ac, val = '', rows, options, min, max, step, req = true, maxlength } = o;
    const name = o.name || id;
    let ctl;
    const common = `id="f-${id}" name="${name}" ${req && !opt ? 'required' : ''} ${ac ? `autocomplete="${ac}"` : ''}`;
    if (options) ctl = `<select ${common}>${o.blank ? `<option value="">${esc(o.blank)}</option>` : ''}${O.opts(options, val)}</select>`;
    else if (rows) ctl = `<textarea ${common} rows="${rows}" placeholder="${esc(ph)}" ${maxlength ? `maxlength="${maxlength}"` : ''}>${esc(val)}</textarea>`;
    else ctl = `<input ${common} type="${type}" placeholder="${esc(ph)}" value="${esc(val)}" ${min != null ? `min="${min}"` : ''} ${max != null ? `max="${max}"` : ''} ${step ? `step="${step}"` : ''} ${maxlength ? `maxlength="${maxlength}"` : ''} ${type === 'password' ? 'data-pw' : ''} ${o.inputmode ? `inputmode="${o.inputmode}"` : ''} ${o.attrs || ''}>`;
    const pw = type === 'password' ? `<button type="button" class="pwtoggle" data-act="pwtoggle" aria-label="Show or hide password">${ic('eye')}</button>` : '';
    return `<div class="field" data-f="${id}"><label for="f-${id}"><span>${esc(label)}</span>${opt ? '<span class="opt">Optional</span>' : ''}</label>
      <div class="inp">${icon ? ic(icon) : ''}${ctl}${pw}</div>${hint ? `<div class="hint">${hint}</div>` : ''}<div class="err" data-err="${id}" role="alert"></div></div>`;
  };
  O.formErr = (form, id, msg) => {
    const f = form.querySelector(`[data-f="${id}"]`); if (!f) return;
    f.classList.add('has-err'); const e = f.querySelector('.err'); if (e) e.textContent = msg;
  };
  O.clearErrs = form => { $$('.has-err', form).forEach(x => x.classList.remove('has-err')); $$('.err', form).forEach(x => x.textContent = ''); const fe = form.querySelector('.formerr'); if (fe) fe.innerHTML = ''; };
  O.topErr = (form, msg) => { const fe = form.querySelector('.formerr'); if (fe) { fe.innerHTML = ic('alert') + `<span>${esc(msg)}</span>`; fe.scrollIntoView({ block: 'center', behavior: 'smooth' }); } else O.toast(msg, 'error'); };
  O.focusFirstErr = form => { const f = form.querySelector('.has-err'); if (f) { f.scrollIntoView({ block: 'center', behavior: 'smooth' }); const i = f.querySelector('input,select,textarea'); if (i) i.focus({ preventScroll: true }); } };
  O.busy = async (btn, fn) => {
    if (!btn) return fn();
    const html = btn.innerHTML; btn.classList.add('busy'); btn.innerHTML = '<span class="spin"></span> Please wait…';
    try { return await fn(); } finally { if (btn.isConnected) { btn.classList.remove('busy'); btn.innerHTML = html; } }
  };
  O.empty = (icon, title, text = '', btn = '') => `<div class="empty"><div class="ico">${ic(icon, 'lg')}</div><h3>${esc(title)}</h3><p>${text}</p>${btn}</div>`;
  O.pageHead = (title, sub = '', actions = '') => `<div class="page-head"><div><h2>${title}</h2>${sub ? `<p class="muted">${sub}</p>` : ''}</div>${actions ? `<div class="row wrap">${actions}</div>` : ''}</div>`;
  O.stars = n => `<span class="stars" aria-label="${(+n || 0).toFixed(1)} out of 5">${[1, 2, 3, 4, 5].map(i => ic('star-fill', i <= Math.round(n) ? '' : 'off')).join('')}</span>`;
  O.avatar = (p, cls = '') => `<div class="avatar ${cls}" aria-hidden="true">${esc(O.initials(p))}</div>`;
  O.badge = (kind, s) => {
    const M = {
      booking: { pending: ['warn', 'Pending', 'clock'], accepted: ['info', 'Accepted', 'check'], paid: ['info', 'Payment reported', 'wallet'], confirmed: ['ok', 'Deposit confirmed', 'check-circle'], completed: ['ok', 'Moved in', 'key'], declined: ['bad', 'Declined', 'x'], cancelled: ['', 'Cancelled', 'ban'] },
      verif: { none: ['warn', 'Not verified', 'shield'], pending: ['warn', 'Under review', 'clock'], approved: ['ok', 'Verified', 'shield-check'], rejected: ['bad', 'Changes needed', 'alert'] },
      prop: { live: ['ok', 'Live', 'check-circle'], review: ['warn', 'Awaiting approval', 'clock'], rejected: ['bad', 'Not approved', 'alert'], occupied: ['', 'Occupied', 'ban'] },
      report: { open: ['warn', 'Open', 'flag'], resolved: ['ok', 'Resolved', 'check'] }
    };
    const [c, l, i] = (M[kind] || {})[s] || ['', s, 'info'];
    return `<span class="badge ${c}">${ic(i)}${esc(l)}</span>`;
  };
  O.propState = p => p.rejected ? 'rejected' : !p.approved ? 'review' : p.status === 'Occupied' ? 'occupied' : 'live';
  const GRAD = ['#1f4fb5,#0b1f4d', '#f2b705,#b97f00', '#0e9f6e,#075e43', '#7a4fd1,#32206b', '#e0245e,#7a1236'];
  O.ph = (id = '') => { let n = 0; for (const c of String(id)) n += c.charCodeAt(0); return `<div class="ph" style="background:linear-gradient(135deg,${GRAD[n % GRAD.length]})">${ic('bed')}</div>`; };
  O.photo = p => p && p.photos && p.photos[0] ? `<img src="${p.photos[0]}" alt="" loading="lazy">` : O.ph(p && p.id);
  O.amenIcon = a => ({ 'WiFi': 'wifi', 'Borehole Water': 'drop', 'Prepaid Electricity': 'bolt', 'Furnished': 'sofa', 'Security Guard': 'shield-check', 'Study Desk': 'book', 'Shared Kitchen': 'kitchen', 'Private Bathroom': 'bath', 'Solar Backup': 'sun', 'Parking': 'car', 'Perimeter Wall': 'wall', 'Gated Yard': 'gate' }[a] || 'check');
  O.kv = rows => `<dl class="kv">${rows.filter(r => r && r[1] != null && r[1] !== '').map(r => `<dt>${esc(r[0])}</dt><dd>${r[2] ? r[1] : esc(r[1])}</dd>`).join('')}</dl>`;
  O.go = path => { location.hash = '#/' + path; };
  O.parseHash = () => { const h = location.hash.replace(/^#\/?/, ''); const [p, ...rest] = h.split('/'); return { page: p || '', args: rest.map(decodeURIComponent) }; };
  O.banner = msg => { let b = $('#bannerBox'); if (!b) return; b.innerHTML = msg ? `<div class="banner">${ic('alert')}<span>${esc(msg)}</span></div>` : ''; };
  O.notifyL = (userId, title, body, link, type = 'info') => O.save('notifications', { id: O.id('n'), userId, title, body, link: link || '', type, read: false, date: O.iso() });
  O.myVerif = () => O.verifStatus(uid());

  /* ---------- FILE UPLOADS (compressed to data URLs) ---------- */
  O.drop = (key, label, hint = 'JPG or PNG photo', icon = 'camera') => `<div class="drop" data-drop="${key}">${ic(icon, 'lg')}<b>${esc(label)}</b><span class="small">${esc(hint)}</span><input type="file" accept="image/*" data-upload="${key}" capture="${key === 'selfie' ? 'user' : 'environment'}"></div>`;
  O.drop2 = (key, label, hint) => `<div class="drop" data-drop="${key}">${ic('upload', 'lg')}<b>${esc(label)}</b><span class="small">${esc(hint)}</span><input type="file" accept="image/*" data-upload="${key}"></div>`;
  document.addEventListener('change', async e => {
    const inp = e.target.closest('input[type=file][data-upload]'); if (!inp || !inp.files.length) return;
    const key = inp.dataset.upload;
    try {
      if (inp.multiple) {
        const list = O.tmp.photos = O.tmp.photos || [];
        for (const f of [...inp.files]) { if (list.length >= 4) { O.toast('You can add up to 4 photos.', 'info'); break; } list.push(await O.compress(f, { max: 1000, q: .7, limitKB: 140 })); }
        O.renderThumbs();
      } else {
        const data = await O.compress(inp.files[0], { max: 1400, q: .75, limitKB: 300 });
        O.tmp[key] = data;
        const d = inp.closest('.drop'); d.classList.add('has');
        d.innerHTML = `<img src="${data}" alt="Selected document"><span class="badge ok ok">${ic('check')}Added</span><input type="file" accept="image/*" data-upload="${key}">`;
      }
    } catch (err) { O.toast(err.message || 'Could not use that file.', 'error'); }
    inp.value = '';
  });
  O.renderThumbs = () => {
    const box = $('#photoThumbs'); if (!box) return;
    box.innerHTML = (O.tmp.photos || []).map((p, i) => `<div class="t"><img src="${p}" alt="Photo ${i + 1}"><button type="button" data-act="rmPhoto" data-i="${i}" aria-label="Remove photo">${ic('x', 'sm')}</button></div>`).join('');
  };
  O.acts.rmPhoto = el => { (O.tmp.photos || []).splice(+el.dataset.i, 1); O.renderThumbs(); };

  /* ---------- GLOBAL EVENTS ---------- */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act;
    if (act === 'mbackdrop') { if (e.target === el) O.closeModal(); return; }
    const fn = O.acts[act]; if (fn) { if (el.tagName === 'BUTTON' && el.type !== 'submit') e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('submit', async e => {
    const f = e.target.closest('form[data-form]'); if (!f) return;
    e.preventDefault();
    const fn = O.forms[f.dataset.form]; if (!fn) return;
    const btn = e.submitter || f.querySelector('button[type=submit]') || (f.id && document.querySelector(`button[form="${f.id}"]`));
    try { await fn(f, btn); } catch (err) { console.error(err); O.toast('Something went wrong. Please try again.', 'error'); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#modalRoot').children.length) O.closeModal(); });
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.matches('[data-pwmeter]')) {
      const v = t.value; let s = 0;
      if (v.length >= 8) s++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v) || v.length >= 12) s++;
      const m = t.closest('form').querySelector('.meter'); if (m) m.dataset.s = v ? Math.max(1, s) : 0;
    }
  });
  O.acts.pwtoggle = el => {
    const i = el.closest('.inp').querySelector('input'); const show = i.type === 'password';
    i.type = show ? 'text' : 'password'; el.innerHTML = ic(show ? 'eye-off' : 'eye');
  };
  O.acts.closeModal = () => O.closeModal();

  /* ---------- LEGAL ---------- */
  O.acts.legal = el => {
    const k = el.dataset.doc; const t = { terms: 'Terms & Conditions', privacy: 'Privacy Policy', safety: 'Child Safety & Code of Conduct' }[k];
    O.modal({ title: t, wide: true, body: `<div class="legal legal-body">${O.legal[k]}</div>`, foot: `<a class="btn ghost" href="#/${k}" target="_blank" rel="noopener">${ic('external')}Open in full page</a><button class="btn" data-act="closeModal">Done</button>` });
  };
  function legalPage(which) {
    const tab = (k, l) => `<a href="#/${k}" class="${which === k ? 'on' : ''}">${l}</a>`;
    const title = { terms: 'Terms & Conditions', privacy: 'Privacy Policy', safety: 'Child Safety & Code of Conduct' }[which];
    return `<div class="legalpage legal"><a class="backlink" href="#/" data-act="legalBack">${ic('arrow-left')} Back</a>
      <div class="row" style="margin-top:14px"><img src="icons/buse-crest.png" width="42" alt=""><div><h1 style="margin:0">${title}</h1><p class="meta" style="margin:2px 0 0">Offrez · BUSE off-campus accommodation</p></div></div>
      <nav class="legaltabs" aria-label="Legal documents">${tab('terms', 'Terms')}${tab('privacy', 'Privacy')}${tab('safety', 'Child safety')}</nav>
      <div class="legal-body card" style="margin-top:12px">${O.legal[which]}</div>
      <p class="muted small center" style="margin-top:20px">Questions? ${esc(O.CFG.SUPPORT_EMAIL)}</p></div>`;
  }
  O.acts.legalBack = (el, e) => { e.preventDefault(); if (history.length > 1 && document.referrer !== '') history.back(); else O.go(''); };

  /* ---------- LANDING ---------- */
  function landing() {
    const inst = O.canInstall() ? `<button class="btn ghost" style="color:#fff;border-color:rgba(255,255,255,.35)" data-act="install">${ic('download')}Install the app</button>` : '';
    return `<div class="land">
    <header class="lnav"><a class="brand" href="#/"><img src="icons/buse-crest.png" alt="BUSE crest"><span><b style="font-family:var(--serif);font-size:22px;display:block;line-height:1">Offrez</b><small class="muted" style="font-size:11px">BUSE off-campus housing</small></span></a>
      <nav><a class="t" href="#/safety">Safety</a><a class="t" href="#/terms">Terms</a><button class="btn ghost icon sm" data-act="theme" aria-label="Toggle dark mode">${ic('moon')}</button><a class="btn ghost sm" href="#/login">Log in</a><a class="btn gold sm" href="#/signup">Get started</a></nav></header>
    <section class="hero"><div class="in"><div>
      <span class="badge gold">${ic('shield-check')}Landlords are ID-verified</span>
      <h1 style="margin-top:14px">A safe place to live, <em>close to campus.</em></h1>
      <p class="lead">Offrez connects Bindura University of Science Education students with verified landlords in Bindura and Kadoma. Browse real rooms, chat privately and book with confidence.</p>
      <div class="cta"><a class="btn gold lg" href="#/signup">${ic('search')}Find a room</a><a class="btn lg ghost" style="color:#fff;border-color:rgba(255,255,255,.35)" href="#/signup/landlord">${ic('building')}List your property</a>${inst}</div>
      <div class="trust"><span>${ic('shield-check')}Verified landlords</span><span>${ic('lock')}Private messaging</span><span>${ic('wifi-off')}Works on weak networks</span></div></div>
      <div class="art"><div class="logocard"><img src="icons/buse-logo-full.png" alt="Bindura University of Science Education crest"></div></div></div></section>
    <section class="sec"><h2>Everything a student and a landlord need</h2><p class="sub">Built for the realities of off-campus life: trust first, then convenience.</p>
      <div class="fgrid">
      ${[['shield-check', 'Verified landlords', 'Landlords submit ID, a selfie, proof of ownership and police clearance. Admins review every file before a listing goes live.'],
      ['search', 'Smart search', 'Filter by area, price, room type, gender preference, distance and amenities. Save favourites for later.'],
      ['message', 'Private chat', 'Ask questions and arrange viewings in a built-in conversation. No need to share your number first.'],
      ['calendar', 'Booking tracker', 'Request, get accepted, pay the landlord directly and follow every step in one place.'],
      ['star', 'Honest reviews', 'Only students with a confirmed booking can review a property.'],
      ['flag', 'Report & safety centre', 'Report anything that feels wrong. Reports involving children are escalated straight away.']]
        .map(([i, t, d]) => `<div class="feat"><div class="ico">${ic(i, 'lg')}</div><h3>${t}</h3><p>${d}</p></div>`).join('')}</div></section>
    <section class="sec" style="padding-top:0"><h2>How it works</h2><p class="sub">Three steps from search to keys.</p>
      <div class="how"><div><h3>Create a verified account</h3><p>Sign up with your email and confirm it with the link we send you.</p></div><div><h3>Browse, chat, request</h3><p>Shortlist rooms, message the landlord and send a booking request.</p></div><div><h3>Move in with a record</h3><p>Pay the landlord directly, log the reference and they confirm receipt in the app.</p></div></div></section>
    <section class="sec" style="padding-top:0"><div class="safety"><div class="big">${ic('child')}</div><div><h2 style="color:#fff">Built around the safety of young students</h2><p style="color:#cdd7f5">Many first-years are teenagers. That is why no landlord can list a room until their identity and suitability have been checked.</p>
      <ul><li>National ID and live selfie checked by admins</li><li>Proof of ownership and police clearance required</li><li>Signed Child Safety Code and zero-tolerance reporting</li></ul></div></div></section>
    <footer class="foot"><nav><a href="#/terms">Terms &amp; Conditions</a><a href="#/privacy">Privacy Policy</a><a href="#/safety">Child Safety</a><a href="mailto:${esc(O.CFG.SUPPORT_EMAIL)}">Contact</a></nav>
      <div>© ${new Date().getFullYear()} Offrez · Bindura University of Science Education off-campus accommodation</div></footer></div>`;
  }

  /* ---------- AUTH SCREENS ---------- */
  function authShell(inner) {
    return `<div class="authwrap"><aside class="authside"><div style="position:relative;z-index:1"><a href="#/"><img src="icons/buse-crest.png" alt="BUSE crest"></a><h2>Safe, verified student housing around BUSE</h2><p>Join students and landlords who value trust, privacy and a fair deal.</p></div>
      <ul><li>${ic('shield-check')}Landlords are ID-checked before listing</li><li>${ic('mail')}Email verification on every account</li><li>${ic('lock')}Your documents are visible only to admins</li><li>${ic('wifi-off')}Installable and works on weak networks</li></ul></aside>
      <main class="authmain"><div class="authbox"><div class="mobhead"><img src="icons/buse-crest.png" alt=""><b style="font-family:var(--serif);font-size:22px">Offrez</b></div>${inner}</div></main></div>`;
  }
  const googleBtn = txt => `<button type="button" class="btn google block" data-act="google"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>${txt}</button>`;
  function loginView() {
    const demo = !O.S.cloud ? `<div class="notice warn">${ic('info')}<div><b>Offline demo mode.</b> Accounts here are saved on this device only. Try <code>student@offrez.local</code> / <code>student123</code>, <code>demo@offrez.local</code> / <code>landlord123</code> or <code>admin@offrez.local</code> / <code>admin123</code>.</div></div>` : '';
    return authShell(`<div><h1>Welcome back</h1><p class="muted">Log in to continue to Offrez.</p></div>${demo}
      <form class="stack" data-form="login" novalidate><div class="formerr" role="alert"></div>
      ${O.fld({ id: 'email', label: 'Email address', icon: 'mail', type: 'email', ph: 'you@example.com', ac: 'email' })}
      ${O.fld({ id: 'password', label: 'Password', icon: 'lock', type: 'password', ph: 'Your password', ac: 'current-password' })}
      <div class="row between"><label class="check"><input type="checkbox" checked disabled><span>Keep me signed in</span></label><a class="link" href="#/forgot">Forgot password?</a></div>
      <button class="btn lg block" type="submit">Log in</button></form>
      ${O.S.cloud ? `<div class="or">or</div>${googleBtn('Continue with Google')}` : ''}
      <p class="center muted">New to Offrez? <a class="link" href="#/signup">Create an account</a></p>
      <p class="center tiny muted"><a href="#/terms">Terms</a> · <a href="#/privacy">Privacy</a> · <a href="#/safety">Child safety</a></p>`);
  }
  function forgotView() {
    return authShell(`<a class="backlink" href="#/login">${ic('arrow-left')}Back to log in</a><div><h1>Reset your password</h1><p class="muted">Enter your email and we will send you a reset link.</p></div>
      <form class="stack" data-form="forgot" novalidate><div class="formerr" role="alert"></div>${O.fld({ id: 'email', label: 'Email address', icon: 'mail', type: 'email', ph: 'you@example.com', ac: 'email' })}
      <button class="btn lg block" type="submit">Send reset link</button></form>`);
  }
  function consentBox(role) {
    return `<div class="stack sm" data-f="terms"><label class="check"><input type="checkbox" name="terms" required><span>I am 18 or older, or have a parent/guardian's consent, and I accept the <button type="button" class="link" data-act="legal" data-doc="terms">Terms &amp; Conditions</button> and <button type="button" class="link" data-act="legal" data-doc="privacy">Privacy Policy</button>.</span></label>
      ${role === 'landlord' ? `<label class="check"><input type="checkbox" name="safetyc" required><span>I have read and agree to the <button type="button" class="link" data-act="legal" data-doc="safety">Child Safety Code of Conduct</button> and understand I must pass identity verification before listing.</span></label>` : ''}
      <div class="err" data-err="terms" role="alert"></div></div>`;
  }
  function roleFields(role, p = {}) {
    return role === 'student' ? `<div class="grid2">${O.fld({ id: 'regNumber', label: 'Student registration no.', icon: 'id-card', ph: 'e.g. B1234567', val: p.regNumber || '', hint: 'One account per student ID.' })}
      ${O.fld({ id: 'gender', label: 'Gender', icon: 'user', options: ['Female', 'Male', 'Prefer not to say'], blank: 'Select…', val: p.gender || '' })}</div>`
      : `<div class="grid2">${O.fld({ id: 'business', label: 'Business / lodge name', icon: 'building', ph: 'e.g. Moyo Lodges', opt: true, val: p.business || '' })}
      ${O.fld({ id: 'town', label: 'Based in', icon: 'map-pin', options: Object.keys(O.CFG.AREAS), val: p.town || 'Bindura' })}</div>`;
  }
  function signupView(role) {
    if (!role) {
      return authShell(`<a class="backlink" href="#/">${ic('arrow-left')}Back</a><div><h1>Create your account</h1><p class="muted">First, tell us who you are.</p></div>
      <div class="rolepick"><a class="rolecard" href="#/signup/student"><div class="ico">${ic('graduation', 'lg')}</div><b>I'm a student</b><span class="d">Find and book a room near BUSE.</span></a>
      <a class="rolecard" href="#/signup/landlord"><div class="ico">${ic('building', 'lg')}</div><b>I'm a landlord</b><span class="d">List rooms. ID verification required.</span></a></div>
      <p class="center muted">Already registered? <a class="link" href="#/login">Log in</a></p>`);
    }
    return authShell(`<a class="backlink" href="#/signup">${ic('arrow-left')}Change role</a>
      <div><span class="badge ${role === 'student' ? 'info' : 'gold'}">${ic(role === 'student' ? 'graduation' : 'building')}${role === 'student' ? 'Student account' : 'Landlord account'}</span><h1 style="margin-top:8px">${role === 'student' ? 'Join as a student' : 'Join as a landlord'}</h1>
      <p class="muted">${role === 'student' ? 'It takes about a minute. We will email you a link to confirm your address.' : 'Create your account first. You will then upload verification documents before your listings can go live.'}</p></div>
      <form class="stack" data-form="signup" data-role="${role}" novalidate><div class="formerr" role="alert"></div>
      <div class="grid2">${O.fld({ id: 'fname', label: 'First name', icon: 'user', ac: 'given-name', ph: 'Tatenda' })}${O.fld({ id: 'lname', label: 'Surname', icon: 'user', ac: 'family-name', ph: 'Moyo' })}</div>
      ${O.fld({ id: 'email', label: 'Email address', icon: 'mail', type: 'email', ac: 'email', ph: 'you@example.com', hint: 'We will send a verification link here.' })}
      ${O.fld({ id: 'phone', label: 'Mobile number', icon: 'phone', type: 'tel', ac: 'tel', ph: '0772 000 000', inputmode: 'tel' })}
      ${roleFields(role)}
      ${O.fld({ id: 'password', label: 'Password', icon: 'lock', type: 'password', ac: 'new-password', ph: 'At least 8 characters', attrs: 'data-pwmeter' })}
      <div class="meter" data-s="0"><i></i><i></i><i></i><i></i></div>
      ${consentBox(role)}
      <button class="btn lg block" type="submit">Create account</button></form>
      ${O.S.cloud ? `<div class="or">or</div>${googleBtn('Sign up with Google')}` : ''}
      <p class="center muted">Already registered? <a class="link" href="#/login">Log in</a></p>`);
  }

  /* ---------- FORM HANDLERS: AUTH ---------- */
  const val = (f, n) => (new FormData(f).get(n) || '').toString().trim();
  O.forms.login = async (f, btn) => {
    O.clearErrs(f);
    const email = val(f, 'email').toLowerCase(), pw = new FormData(f).get('password') || '';
    if (!O.isEmail(email)) O.formErr(f, 'email', 'Enter a valid email address.');
    if (!pw) O.formErr(f, 'password', 'Enter your password.');
    if (f.querySelector('.has-err')) return O.focusFirstErr(f);
    await O.busy(btn, async () => {
      const r = await O.login(email, pw);
      if (r.error) return O.topErr(f, r.error);
      if (!O.S.cloud) { localStorage.setItem('offrez_session', r.uid); return O.afterLocal(r.uid); }
      // onAuthStateChanged will fire; call directly too for instant feedback
      await O.afterAuth(window.FB.auth.currentUser);
    });
  };
  O.forms.forgot = async (f, btn) => {
    O.clearErrs(f); const email = val(f, 'email').toLowerCase();
    if (!O.isEmail(email)) { O.formErr(f, 'email', 'Enter a valid email address.'); return; }
    await O.busy(btn, async () => {
      const r = await O.resetPassword(email);
      if (r.error) return O.topErr(f, r.error);
      f.innerHTML = `<div class="notice ok">${ic('check-circle')}<div><b>Check your inbox.</b> If an account exists for ${esc(email)}, a reset link is on its way. Check spam too.</div></div><a class="btn block" href="#/login">Back to log in</a>`;
    });
  };
  O.forms.signup = async (f, btn) => {
    O.clearErrs(f); const role = f.dataset.role, d = new FormData(f);
    const p = { fname: val(f, 'fname'), lname: val(f, 'lname'), email: val(f, 'email').toLowerCase(), phone: val(f, 'phone').replace(/[^\d+]/g, '') };
    const pw = (d.get('password') || '').toString();
    if (p.fname.length < 2) O.formErr(f, 'fname', 'Enter your first name.');
    if (p.lname.length < 2) O.formErr(f, 'lname', 'Enter your surname.');
    if (!O.isEmail(p.email)) O.formErr(f, 'email', 'Enter a valid email address.');
    if (p.phone.replace(/\D/g, '').length < 9) O.formErr(f, 'phone', 'Enter a valid mobile number.');
    if (role === 'student') {
      p.regNumber = O.normReg(val(f, 'regNumber')); p.gender = val(f, 'gender');
      if (p.regNumber.length < 5) O.formErr(f, 'regNumber', 'Enter your student registration number.');
      if (!p.gender) O.formErr(f, 'gender', 'Please select an option.');
    } else { p.business = val(f, 'business'); p.town = val(f, 'town'); }
    if (pw.length < 8) O.formErr(f, 'password', 'Use at least 8 characters.');
    else if (!/\d/.test(pw) || !/[A-Za-z]/.test(pw)) O.formErr(f, 'password', 'Include letters and at least one number.');
    if (!d.get('terms') || (role === 'landlord' && !d.get('safetyc'))) O.formErr(f, 'terms', 'Please accept the required agreements to continue.');
    if (f.querySelector('.has-err')) return O.focusFirstErr(f);
    p.consent = { terms: O.legal.VERSION, at: O.iso() };
    await O.busy(btn, async () => {
      O.S.registering = true;
      let r; try { r = await O.register(role, p, pw); } finally { O.S.registering = false; }
      if (r.error) return O.topErr(f, r.error);
      if (!O.S.cloud) { localStorage.setItem('offrez_session', r.profile.id); return O.afterLocal(r.profile.id); }
      await O.afterAuth(window.FB.auth.currentUser);
    });
  };
  O.acts.google = async () => {
    const r = await O.google();
    if (r.error) O.toast(r.error, 'error');
  };
  O.acts.logout = async () => { await O.logout(); O.S.gate = null; O.go(''); O.render(); O.toast('You have been logged out.', 'success'); };

  /* ---------- GATES: verify email / complete profile / suspended ---------- */
  function gateVerify() {
    const email = O.S.user ? O.S.user.email : '';
    return `<div class="gate"><div class="gatebox"><div class="bigico">${ic('mail')}</div><h1 style="font-family:var(--serif)">Verify your email</h1>
      <p class="muted">We sent a verification link to <b>${esc(email)}</b>. Open it, then come back here. It keeps accounts real and students safe.</p>
      <div class="notice" style="text-align:left">${ic('info')}<span>Can't see it? Check your spam or promotions folder. The link works on any device.</span></div>
      <button class="btn lg block" data-act="checkVerified">${ic('check-circle')}I've verified my email</button>
      <button class="btn ghost block" id="resendBtn" data-act="resend">${ic('refresh')}Resend verification email</button>
      <button class="link" data-act="logout">Use a different account</button></div></div>`;
  }
  let pollT = null;
  function startPoll() { clearInterval(pollT); pollT = setInterval(async () => { if (O.S.gate !== 'verify') return clearInterval(pollT); if (await O.checkVerified()) { clearInterval(pollT); O.toast('Email verified. Welcome!', 'success'); O.afterAuth(window.FB.auth.currentUser); } }, 5000); }
  O.acts.checkVerified = async el => {
    await O.busy(el, async () => {
      if (await O.checkVerified()) { O.toast('Email verified. Welcome!', 'success'); await O.afterAuth(window.FB.auth.currentUser); }
      else O.toast('Not verified yet. Open the link in your email first.', 'error');
    });
  };
  let resendAt = 0;
  O.acts.resend = async el => {
    const wait = Math.ceil((resendAt - Date.now()) / 1000);
    if (wait > 0) return O.toast(`Please wait ${wait}s before requesting another email.`, 'info');
    await O.busy(el, async () => {
      const r = await O.resendVerification();
      if (r.error) return O.toast(r.error, 'error');
      resendAt = Date.now() + 60000; O.toast('Verification email sent. Check your inbox.', 'success');
    });
  };
  function gateProfile() {
    const u = O.S.user || {}; const role = O.S.pickRole || 'student'; const parts = (u.displayName || '').split(' ');
    return `<div class="gate"><div class="gatebox" style="text-align:left;max-width:520px"><div class="center"><div class="bigico" style="margin:0 auto 12px">${ic('user')}</div><h1 style="font-family:var(--serif)">Almost there</h1><p class="muted">Tell us a little more to finish setting up ${esc(u.email || 'your account')}.</p></div>
      <div class="seg" role="tablist">${['student', 'landlord'].map(r => `<button type="button" class="${role === r ? 'on' : ''}" data-act="pickRole" data-role="${r}">${ic(r === 'student' ? 'graduation' : 'building')}${r === 'student' ? 'Student' : 'Landlord'}</button>`).join('')}</div>
      <form class="stack" data-form="profile" data-role="${role}" novalidate style="width:100%"><div class="formerr" role="alert"></div>
      <div class="grid2">${O.fld({ id: 'fname', label: 'First name', icon: 'user', val: parts[0] || '' })}${O.fld({ id: 'lname', label: 'Surname', icon: 'user', val: parts.slice(1).join(' ') })}</div>
      ${O.fld({ id: 'phone', label: 'Mobile number', icon: 'phone', type: 'tel', ph: '0772 000 000' })}
      ${roleFields(role)}${consentBox(role)}
      <button class="btn lg block" type="submit">Finish setup</button></form>
      <button class="link" style="align-self:center" data-act="logout">Cancel and log out</button></div></div>`;
  }
  O.acts.pickRole = el => { O.S.pickRole = el.dataset.role; O.render(); };
  O.forms.profile = async (f, btn) => {
    O.clearErrs(f); const role = f.dataset.role, d = new FormData(f);
    const p = { fname: val(f, 'fname'), lname: val(f, 'lname'), phone: val(f, 'phone').replace(/[^\d+]/g, ''), email: O.S.user.email };
    if (p.fname.length < 2) O.formErr(f, 'fname', 'Enter your first name.');
    if (p.lname.length < 2) O.formErr(f, 'lname', 'Enter your surname.');
    if (p.phone.replace(/\D/g, '').length < 9) O.formErr(f, 'phone', 'Enter a valid mobile number.');
    if (role === 'student') { p.regNumber = O.normReg(val(f, 'regNumber')); p.gender = val(f, 'gender'); if (p.regNumber.length < 5) O.formErr(f, 'regNumber', 'Enter your student registration number.'); if (!p.gender) O.formErr(f, 'gender', 'Please select an option.'); }
    else { p.business = val(f, 'business'); p.town = val(f, 'town'); }
    if (!d.get('terms') || (role === 'landlord' && !d.get('safetyc'))) O.formErr(f, 'terms', 'Please accept the required agreements to continue.');
    if (f.querySelector('.has-err')) return O.focusFirstErr(f);
    await O.busy(btn, async () => {
      if (role === 'student') {
        if (await O.studentIdTaken(p.regNumber, O.S.user.uid)) return O.topErr(f, 'This Student ID is already registered. Each student may only have one account.');
        await O.claimStudentId(p.regNumber, O.S.user.uid);
      }
      const prof = { ...p, id: O.S.user.uid, role, joined: O.iso(), consent: { terms: O.legal.VERSION, at: O.iso() } };
      if (!await O.save('profiles', prof)) return O.topErr(f, 'Could not save your profile. Check your connection.');
      await O.afterAuth(O.S.user);
    });
  };
  function gateSuspended() {
    return `<div class="gate"><div class="gatebox"><div class="bigico" style="background:var(--bad);color:#fff">${ic('ban')}</div><h1 style="font-family:var(--serif)">Account suspended</h1>
      <p class="muted">Your account has been suspended while the Admin Office reviews a concern. Contact ${esc(O.CFG.SUPPORT_EMAIL)} if you think this is a mistake.</p><button class="btn ghost block" data-act="logout">Log out</button></div></div>`;
  }

  /* ---------- SHELL ---------- */
  const unreadMsgs = () => O.DB.messages.filter(m => m.to === uid() && !m.read).length;
  const unreadNotifs = () => O.DB.notifications.filter(n => n.userId === uid() && !n.read).length;
  function counts() {
    const r = O.S.role, c = {};
    c.messages = unreadMsgs();
    if (r === 'landlord') c.requests = O.DB.bookings.filter(b => b.landlordId === uid() && b.status === 'pending').length + O.DB.bookings.filter(b => b.landlordId === uid() && b.status === 'paid').length;
    if (r === 'admin') { c.verifications = O.DB.verifications.filter(v => v.status === 'pending').length; c.listings = O.DB.properties.filter(p => !p.approved && !p.rejected).length; c.reports = O.DB.reports.filter(x => x.status !== 'resolved').length; }
    if (r === 'student') c.bookings = O.DB.bookings.filter(b => b.studentId === uid() && ['accepted'].includes(b.status)).length;
    return c;
  }
  function buildShell() {
    const role = O.S.role, nav = O.NAV[role], c = counts(), me = O.S.me;
    const link = (n, cls) => `<a href="#/${n[0]}" class="${cls}" data-nav="${n[0]}">${ic(n[2])}<span>${n[1]}</span>${c[n[0]] ? `<span class="cnt">${c[n[0]]}</span>` : ''}</a>`;
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    $('#app').innerHTML = `<div id="bannerBox"></div><div class="shell">
      <aside class="side"><div class="brand"><img src="icons/buse-crest.png" alt="BUSE crest"><div><b>Offrez</b><small>${role === 'admin' ? 'Admin office' : 'BUSE housing'}</small></div></div>
        ${nav.map(n => link(n, 'nav')).join('')}<div class="sp"></div>
        ${O.canInstall() ? `<button class="nav" data-act="install" style="background:none;border:0;cursor:pointer;font:inherit;text-align:left;width:100%">${ic('download')}<span>Install app</span></button>` : ''}
        <button class="nav" data-act="theme" style="background:none;border:0;cursor:pointer;font:inherit;text-align:left;width:100%">${ic(dark ? 'sun' : 'moon')}<span>${dark ? 'Light mode' : 'Dark mode'}</span></button>
        <div class="me">${O.avatar(me)}<div class="grow"><b>${esc(O.fullName(me))}</b><small>${esc(role)}</small></div><button class="btn icon sm ghost" style="color:#fff;border-color:rgba(255,255,255,.25)" data-act="logout" aria-label="Log out">${ic('logout')}</button></div></aside>
      <div class="main"><header class="top"><div class="mobbrand"><img src="icons/buse-crest.png" alt=""><b style="font-family:var(--serif);font-size:19px">Offrez</b></div><h1 id="pageTitle"></h1><span class="spacer"></span>
        <button class="btn ghost icon" data-act="theme" aria-label="Toggle theme">${ic(dark ? 'sun' : 'moon')}</button>
        <div class="bellwrap"><button class="btn ghost icon" data-act="notifs" aria-label="Notifications">${ic('bell')}</button><span class="dot ${unreadNotifs() ? '' : 'hide'}" id="bellDot"></span></div>
        <button class="btn ghost icon hide-d" data-act="logout" aria-label="Log out" id="topLogout">${ic('logout')}</button></header>
        <main id="view" tabindex="-1"></main></div></div>
      <nav class="tabbar" aria-label="Main">${nav.map(n => link(n, '')).join('')}</nav>`;
    O.S.shellKey = role + ':' + me.id;
    if (O.S.bannerMsg) O.banner(O.S.bannerMsg);
  }
  O.refreshChrome = () => { if (O.S.me && !O.S.gate && O.S.shellKey) { O.S.shellKey = null; renderApp(true); } else O.render(); };
  function updateChrome() {
    const c = counts();
    $$('[data-nav]').forEach(a => {
      let b = a.querySelector('.cnt'); const n = c[a.dataset.nav];
      if (n) { if (!b) { b = document.createElement('span'); b.className = 'cnt'; a.appendChild(b); } b.textContent = n; } else if (b) b.remove();
    });
    const d = $('#bellDot'); if (d) d.classList.toggle('hide', !unreadNotifs());
  }
  let lastPage = null;
  function renderApp(keepScroll) {
    const role = O.S.role, routes = O.routes[role];
    let { page, args } = O.parseHash();
    if (!routes[page]) { const d = O.NAV[role][0][0]; history.replaceState(null, '', '#/' + d); page = d; args = []; }
    if (O.S.shellKey !== role + ':' + O.S.me.id || !$('#view')) buildShell();
    $$('[data-nav]').forEach(a => { const on = a.dataset.nav === page || (page === 'property' && a.dataset.nav === 'browse'); a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    const nav = O.NAV[role].find(n => n[0] === page); $('#pageTitle').textContent = nav ? nav[1] : '';
    O.S.page = page; O.S.args = args;
    const view = $('#view'); const sy = window.scrollY;
    let html; try { html = routes[page](args); } catch (e) { console.error(e); html = O.empty('alert', 'Something went wrong', 'Please go back and try again.'); }
    view.innerHTML = html;
    if (page !== lastPage && !keepScroll) { window.scrollTo(0, 0); } else window.scrollTo(0, sy);
    lastPage = page;
    O.afterRender && O.afterRender(page, args);
  }
  O.afterRender = null;
  O.rerender = () => { if (O.S.me && !O.S.gate && $('#view')) renderApp(true); };

  /* Re-render when data changes, unless the user is typing in the page. */
  let dataT = null;
  O.onData = name => {
    if (!O.S.me || O.S.gate || !$('#view')) return;
    clearTimeout(dataT);
    dataT = setTimeout(() => {
      if (name === 'profiles' && O.S.role !== 'admin') { const pr = O.DB.profiles.find(x => x.id === uid()); if (pr) O.S.me = pr; }
      updateChrome();
      if (name === 'messages' && O.S.page === 'messages' && O.liveChat) return O.liveChat();
      const ae = document.activeElement;
      if (ae && ae.closest && ae.closest('#view') && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
      if ($('#modalRoot').children.length) { O.S.dirty = true; return; }
      if ($('#kycForm')) return;
      renderApp(true);
    }, 120);
  };

  const _closeModal = O.closeModal;
  O.closeModal = all => { _closeModal(all); setTimeout(() => { if (O.S.dirty && !$('#modalRoot').children.length) { O.S.dirty = false; O.rerender(); } }, 260); };

  /* ---------- NOTIFICATIONS ---------- */
  O.acts.notifs = () => {
    const list = O.DB.notifications.filter(n => n.userId === uid()).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 40);
    const body = list.length ? `<div class="list">${list.map(n => `<a class="item" ${n.link ? `href="${esc(n.link)}"` : ''} data-act="notifGo" data-id="${n.id}" style="text-decoration:none;color:inherit;${n.read ? 'opacity:.7' : ''}"><div class="avatar" style="background:var(--surface-2);color:var(--navy-2)">${ic(n.type === 'success' ? 'check-circle' : n.type === 'error' ? 'alert' : 'bell')}</div><div class="grow"><h4>${esc(n.title)}${n.read ? '' : ' <span class="badge gold">New</span>'}</h4><p class="muted small">${esc(n.body)}</p><p class="tiny muted">${O.ago(n.date)}</p></div></a>`).join('')}</div>` : O.empty('bell', 'All caught up', 'New updates about bookings and verification will appear here.');
    O.modal({ title: 'Notifications', body, foot: list.some(n => !n.read) ? `<button class="btn ghost" data-act="readAll">Mark all as read</button>` : '' });
  };
  O.acts.notifGo = el => { const n = O.DB.notifications.find(x => x.id === el.dataset.id); if (n && !n.read) O.save('notifications', { ...n, read: true }); O.closeModal(); };
  O.acts.readAll = () => { O.DB.notifications.filter(n => n.userId === uid() && !n.read).forEach(n => O.save('notifications', { ...n, read: true })); O.closeModal(); };

  /* ---------- CHAT (shared by student + landlord) ---------- */
  O.threads = () => {
    const map = {};
    O.DB.messages.forEach(m => { (map[m.threadId] = map[m.threadId] || []).push(m); });
    const list = Object.entries(map).map(([id, ms]) => {
      ms.sort((a, b) => new Date(a.date) - new Date(b.date)); const last = ms[ms.length - 1], f = ms[0];
      return { id, ms, last, propertyId: f.propertyId, title: f.propertyTitle, studentId: f.studentId, landlordId: f.landlordId, studentName: f.studentName, landlordName: f.landlordName, unread: ms.filter(m => m.to === uid() && !m.read).length };
    });
    if (O.S.newThread && !map[O.S.newThread.id]) list.push({ ...O.S.newThread, ms: [], last: null, unread: 0 });
    return list.sort((a, b) => new Date((b.last || { date: O.iso() }).date) - new Date((a.last || { date: O.iso() }).date));
  };
  const otherName = t => uid() === t.studentId ? t.landlordName : t.studentName;
  function convoHtml(t) {
    const msgs = t.ms.map(m => `<div class="msg ${m.from === uid() ? 'me' : ''}">${esc(m.text)}<small>${O.fdt(m.date)}</small></div>`).join('') || `<p class="muted small center" style="margin:auto">Say hello to ${esc(otherName(t))}. Ask about the room, deposit and a time to view.</p>`;
    return `<div class="convo-head"><button class="btn icon sm ghost backbtn" data-act="backThreads" aria-label="Back">${ic('arrow-left')}</button>${O.avatar({ name: otherName(t) })}<div class="grow"><b>${esc(otherName(t))}</b><div class="small muted">${esc(t.title || 'Property enquiry')}</div></div>
      <button class="btn icon sm ghost" data-act="report" data-type="user" data-id="${uid() === t.studentId ? t.landlordId : t.studentId}" data-title="${esc(otherName(t))}" aria-label="Report this person">${ic('flag')}</button></div>
      <div class="tip">${ic('shield')}<span>Keep chats and payments safe: never share PINs or OTPs, and view a room before paying.</span></div>
      <div class="msgs" id="msgs">${msgs}</div>
      <form class="composer" data-form="msg" data-tid="${esc(t.id)}" autocomplete="off"><input name="text" placeholder="Write a message…" aria-label="Message" maxlength="1000" required><button class="btn icon" type="submit" aria-label="Send">${ic('send')}</button></form>`;
  }
  O.chatView = (args) => {
    const list = O.threads(), active = args[0] ? list.find(t => t.id === args[0]) : null;
    const threads = list.length ? list.map(t => `<a class="thread ${active && active.id === t.id ? 'on' : ''}" href="#/messages/${encodeURIComponent(t.id)}">${O.avatar({ name: otherName(t) })}<div class="grow"><b><span>${esc(otherName(t))}</span>${t.unread ? `<span class="unread">${t.unread}</span>` : ''}</b><p>${esc(t.last ? t.last.text : 'New conversation')}</p></div></a>`).join('') : '<div style="padding:30px 16px" class="muted center small">No conversations yet.' + (O.S.role === 'student' ? '<br>Open a listing and tap “Message landlord”.' : '<br>Students who enquire about your rooms will appear here.') + '</div>';
    O.next(() => { const m = $('#msgs'); if (m) m.scrollTop = m.scrollHeight; if (active && active.unread) markRead(active); });
    return `${O.pageHead('Messages', 'Private conversations about rooms')}<div class="chat ${active ? 'open' : ''}"><div class="threads">${threads}</div><div class="convo" id="convo">${active ? convoHtml(active) : `<div class="empty" style="margin:auto">${ic('message', 'xl')}<h3>Select a conversation</h3></div>`}</div></div>`;
  };
  O.liveChat = () => {
    const id = O.S.args[0]; if (!id) return renderApp(true);
    const t = O.threads().find(x => x.id === id); const c = $('#convo'); if (!t || !c) return renderApp(true);
    const cur = $('#msgs'), n = cur ? cur.children.length : 0, draft = (c.querySelector('input[name=text]') || {}).value || '';
    const atBottom = cur ? cur.scrollHeight - cur.scrollTop - cur.clientHeight < 80 : true;
    if (cur && t.ms.length && n === t.ms.length) return;
    c.innerHTML = convoHtml(t); const i = c.querySelector('input[name=text]'); if (i) i.value = draft;
    const m = $('#msgs'); if (m && atBottom) m.scrollTop = m.scrollHeight; updateChrome();
    if (t.unread) markRead(t);
    const side = $('.threads'); if (side) { const l = O.threads(); side.innerHTML = l.map(x => `<a class="thread ${x.id === id ? 'on' : ''}" href="#/messages/${encodeURIComponent(x.id)}">${O.avatar({ name: otherName(x) })}<div class="grow"><b><span>${esc(otherName(x))}</span>${x.unread ? `<span class="unread">${x.unread}</span>` : ''}</b><p>${esc(x.last ? x.last.text : 'New conversation')}</p></div></a>`).join(''); }
  };
  function markRead(t) { t.ms.filter(m => m.to === uid() && !m.read).forEach(m => O.save('messages', { ...m, read: true })); }
  O.next = fn => requestAnimationFrame(() => requestAnimationFrame(fn));
  O.acts.backThreads = () => O.go('messages');
  O.forms.msg = async f => {
    const text = val(f, 'text'); if (!text) return;
    const tid = f.dataset.tid; const t = O.threads().find(x => x.id === tid); if (!t) return;
    f.querySelector('input').value = '';
    const to = uid() === t.studentId ? t.landlordId : t.studentId;
    const m = { id: O.id('m'), threadId: tid, propertyId: t.propertyId, propertyTitle: t.title || '', studentId: t.studentId, landlordId: t.landlordId, studentName: t.studentName, landlordName: t.landlordName, parts: [t.studentId, t.landlordId], from: uid(), to, text, date: O.iso(), read: false };
    await O.save('messages', m);
    if (O.S.newThread && O.S.newThread.id === tid) O.S.newThread = null;
    O.liveChat();
    const box = $('#msgs'); if (box) box.scrollTop = box.scrollHeight;
  };
  O.acts.msgProperty = el => {
    const p = O.DB.properties.find(x => x.id === el.dataset.pid); if (!p) return;
    const id = p.id + '__' + uid();
    O.S.newThread = { id, propertyId: p.id, title: p.title, studentId: uid(), landlordId: p.landlordId, studentName: O.fullName(O.S.me), landlordName: p.landlordBiz || p.landlordName };
    O.go('messages/' + encodeURIComponent(id));
  };

  /* ---------- REPORT ---------- */
  O.acts.report = el => {
    const { type, id, title } = el.dataset;
    O.modal({ title: 'Report a concern', body: `<form id="repForm" class="stack" data-form="report" data-type="${esc(type)}" data-id="${esc(id)}" data-title="${esc(title)}"><div class="notice warn">${ic('alert')}<span>Reporting <b>${esc(title)}</b>. If someone is in immediate danger, contact emergency services first.</span></div>
      ${O.fld({ id: 'reason', label: 'What is the problem?', icon: 'flag', options: ['Safety concern', 'Inappropriate behaviour or harassment', 'Concern involving a child', 'Fake or misleading listing', 'Scam or payment pressure', 'Other'] })}
      ${O.fld({ id: 'details', label: 'Details', rows: 4, ph: 'What happened? Add dates, names and anything that helps us investigate.', maxlength: 1200 })}</form>`,
      foot: `<button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn danger" type="submit" form="repForm">Send report</button>` });
  };
  O.forms.report = async (f, btn) => {
    const reason = val(f, 'reason'), details = val(f, 'details');
    if (details.length < 10) { O.formErr(f, 'details', 'Please add a little more detail.'); return; }
    await O.busy(btn, async () => {
      const ok = await O.save('reports', { id: O.id('r'), reporterId: uid(), reporterName: O.fullName(O.S.me), targetType: f.dataset.type, targetId: f.dataset.id, targetTitle: f.dataset.title, reason, details, status: 'open', date: O.iso(), urgent: /child/i.test(reason) });
      if (ok) { O.closeModal(); O.toast('Report sent. The Admin Office will review it.', 'success'); }
    });
  };

  /* ---------- PWA: install, offline, updates ---------- */
  O.canInstall = () => !!O.S.installEvt || (/iPhone|iPad|iPod/.test(navigator.userAgent) && !matchMedia('(display-mode: standalone)').matches && !navigator.standalone);
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); O.S.installEvt = e; if (O.S.ready && !O.S.me) O.render(); else if (O.S.me) O.refreshChrome(); });
  window.addEventListener('appinstalled', () => { O.S.installEvt = null; O.toast('Offrez installed. Find it on your home screen.', 'success'); O.render(); });
  O.acts.install = async () => {
    if (O.S.installEvt) { O.S.installEvt.prompt(); try { await O.S.installEvt.userChoice; } catch (e) { } O.S.installEvt = null; return; }
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    O.modal({ title: 'Install Offrez', body: `<div class="stack"><p class="muted">Add Offrez to your home screen for one-tap access and a faster app that keeps working on weak connections.</p>${ios ? `<ol class="stack sm" style="padding-left:20px"><li>Tap the <b>Share</b> button in Safari.</li><li>Choose <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>.</li></ol>` : `<ol class="stack sm" style="padding-left:20px"><li>Open your browser menu (⋮).</li><li>Choose <b>Install app</b> or <b>Add to Home screen</b>.</li></ol>`}</div>`, foot: `<button class="btn" data-act="closeModal">Got it</button>` });
  };
  function netState() {
    const nb = $('#netbar'); if (!nb) return;
    if (navigator.onLine) { nb.classList.remove('show'); } else { nb.textContent = 'You are offline. Showing saved data. Changes will sync when you reconnect.'; nb.classList.add('show'); }
  }
  window.addEventListener('online', () => { netState(); O.toast('Back online.', 'success'); });
  window.addEventListener('offline', netState);
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then(reg => {
        reg.addEventListener('updatefound', () => {
          const w = reg.installing; if (!w) return;
          w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) { const b = $('#netbar'); if (b) { b.innerHTML = 'A new version is ready. <button class="link" style="color:#ffd34d" id="updBtn">Update now</button>'; b.classList.add('show'); $('#updBtn').onclick = () => { w.postMessage('SKIP_WAITING'); }; } } });
        });
      }).catch(() => { });
      let reloaded = false, had = !!navigator.serviceWorker.controller; navigator.serviceWorker.addEventListener('controllerchange', () => { if (!had) { had = true; return; } if (reloaded) return; reloaded = true; location.reload(); });
    });
  }

  /* ---------- TOP-LEVEL RENDER ---------- */
  O.render = () => {
    const { page, args } = O.parseHash();
    if (['terms', 'privacy', 'safety'].includes(page)) { $('#app').innerHTML = legalPage(page); O.S.shellKey = null; window.scrollTo(0, 0); return; }
    if (!O.S.ready) return;
    if (O.S.me && !O.S.gate) return renderApp();
    O.S.shellKey = null;
    const app = $('#app');
    if (O.S.gate === 'verify') { app.innerHTML = gateVerify(); startPoll(); return; }
    if (O.S.gate === 'profile') { app.innerHTML = gateProfile(); return; }
    if (O.S.gate === 'suspended') { app.innerHTML = gateSuspended(); return; }
    if (page === 'login') app.innerHTML = loginView();
    else if (page === 'signup') app.innerHTML = signupView(args[0] === 'student' || args[0] === 'landlord' ? args[0] : '');
    else if (page === 'forgot') app.innerHTML = forgotView();
    else app.innerHTML = landing();
    window.scrollTo(0, 0);
  };
  window.addEventListener('hashchange', () => { if (O.S.ready) O.render(); });

  /* ---------- AUTH STATE ---------- */
  function seedLocalAccounts() {
    const ensure = p => { if (!O.DB.profiles.some(x => x.id === p.id)) O.DB.profiles.push(p); else { const x = O.DB.profiles.find(y => y.id === p.id); if (!x._pw) x._pw = p._pw; if (!x.email) x.email = p.email; } };
    ensure({ id: 'demo_admin', role: 'admin', fname: 'Demo', lname: 'Admin', email: 'admin@offrez.local', _pw: O.hash('admin123'), joined: O.iso() });
    ensure({ id: 'demo_st', role: 'student', fname: 'Rudo', lname: 'Chikwanha', email: 'student@offrez.local', _pw: O.hash('student123'), regNumber: 'B1234567', gender: 'Female', phone: '0771 111 111', joined: O.iso() });
    ensure({ id: 'demo_ll', role: 'landlord', fname: 'Tatenda', lname: 'Moyo', business: 'Demo Lodges', phone: '0772 000 000', email: 'demo@offrez.local', _pw: O.hash('landlord123'), joined: O.iso() });
    O.persistLocal();
  }
  O.afterLocal = async id => {
    const p = O.DB.profiles.find(x => x.id === id); if (!p) { O.S.ready = true; return O.render(); }
    O.S.me = p; O.S.user = null; O.S.role = p.role; O.S.gate = p.suspended ? 'suspended' : null; O.S.ready = true;
    if (!O.S.gate) { O.startSync(); O.banner('Offline demo mode: data is saved on this device only.'); O.S.bannerMsg = 'Offline demo mode: data is saved on this device only.'; }
    O.render();
  };
  O.afterAuth = async user => {
    O.S.ready = true;
    if (!user) { O.stopSync(); O.S.user = null; O.S.me = null; O.S.role = null; O.S.gate = null; O.S.shellKey = null; return O.render(); }
    O.S.user = user;
    const google = user.providerData.some(p => p.providerId === 'google.com');
    if (!user.emailVerified && !google) { O.stopSync(); O.S.me = null; O.S.gate = 'verify'; return O.render(); }
    if (O.isAdminEmail(user.email)) {
      O.S.role = 'admin'; O.S.me = { id: user.uid, role: 'admin', fname: 'Admin', lname: '', email: user.email }; O.S.gate = null;
      O.startSync(); return O.render();
    }
    const prof = await O.fetchProfile(user.uid);
    if (!prof) { O.S.me = null; O.S.gate = 'profile'; return O.render(); }
    if (prof.suspended) { O.stopSync(); O.S.me = null; O.S.gate = 'suspended'; return O.render(); }
    O.S.me = prof; O.S.role = prof.role; O.S.gate = null; O.startSync(); O.render();
    if (!O.S.welcomed) { O.S.welcomed = true; O.toast('Welcome back, ' + (prof.fname || 'friend') + '!', 'success'); }
  };
  O.fbReady = async (ok, err) => {
    O.S.cloud = !!ok; clearTimeout(O.S.slowT);
    if (!ok) {
      console.warn('Local mode', err);
      O.loadLocal(); seedLocalAccounts();
      const sid = localStorage.getItem('offrez_session'); const p = O.DB.profiles.find(x => x.id === sid);
      if (p) return O.afterLocal(p.id);
      O.S.ready = true; return O.render();
    }
    const { A, auth } = window.FB;
    try { await A.getRedirectResult(auth); } catch (e) { const m = O.fbErr(e); if (m) setTimeout(() => O.toast(m, 'error'), 400); }
    A.onAuthStateChanged(auth, u => { if (O.S.registering) return; O.afterAuth(u); });
  };
  O.acts.goLocal = () => { O.fbReady(false); };

  /* ---------- BOOT ---------- */
  window.addEventListener('DOMContentLoaded', () => {
    O.applyTheme(O.theme());
    const sp = $('.splash p'); netState();
    O.S.slowT = setTimeout(() => { if (!O.S.ready && sp) sp.parentElement.insertAdjacentHTML('beforeend', `<p style="font-size:13px;max-width:280px;text-align:center">Slow connection. Still trying…</p><button class="btn gold sm" data-act="goLocal">Continue offline</button>`); }, 7000);
  });
})(window.O);
