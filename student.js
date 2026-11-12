/* Offrez — student portal + shared profile/booking helpers. */
'use strict';
(function (O) {
  const $ = O.$, $$ = O.$$, esc = O.esc, ic = O.ic, R = O.routes.student, uid = () => O.S.me.id;
  const val = (f, n) => (new FormData(f).get(n) || '').toString().trim();

  /* ---------- BROWSE ---------- */
  const SORTS = [['newest', 'Newest first'], ['low', 'Price: low to high'], ['high', 'Price: high to low'], ['near', 'Nearest to campus'], ['rated', 'Top rated']];
  function visible() {
    const f = O.S.f, q = f.q.trim().toLowerCase();
    let list = O.DB.properties.filter(p => p.approved && !p.rejected);
    if (q) list = list.filter(p => (p.title + ' ' + p.area + ' ' + (p.description || '') + ' ' + (p.amenities || []).join(' ')).toLowerCase().includes(q));
    if (f.area) list = list.filter(p => p.area === f.area);
    if (f.type) list = list.filter(p => p.roomType === f.type);
    if (f.gender) list = list.filter(p => p.genderPref === f.gender || p.genderPref === 'Any');
    if (f.max) list = list.filter(p => +p.price <= +f.max);
    if (f.verified) list = list.filter(p => p.landlordVerified);
    if (f.avail) list = list.filter(p => p.status !== 'Occupied');
    const s = f.sort;
    list.sort((a, b) => s === 'low' ? a.price - b.price : s === 'high' ? b.price - a.price : s === 'near' ? (+a.distanceKm || 99) - (+b.distanceKm || 99) : s === 'rated' ? O.ratingOf(b.id).avg - O.ratingOf(a.id).avg : new Date(b.created) - new Date(a.created));
    return list;
  }
  const favs = () => (O.S.me.favs || []);
  function card(p) {
    const r = O.ratingOf(p.id), fav = favs().includes(p.id);
    return `<article class="pcard" data-act="openProp" data-id="${p.id}" tabindex="0" role="link" aria-label="${esc(p.title)}, $${p.price} per month">
      <div class="pimg">${O.photo(p)}<div class="tl">${p.landlordVerified ? `<span class="badge ok">${ic('shield-check')}Verified</span>` : ''}${p.status === 'Occupied' ? `<span class="badge bad">Occupied</span>` : ''}</div>
      <button class="fav ${fav ? 'on' : ''}" data-act="fav" data-id="${p.id}" aria-label="${fav ? 'Remove from saved' : 'Save'}" aria-pressed="${fav}">${ic(fav ? 'heart-fill' : 'heart')}</button></div>
      <div class="pbody"><div class="prow"><h3>${esc(p.title)}</h3><div class="price">${O.money(p.price)}<small>/mo</small></div></div>
      <div class="loc">${ic('map-pin', 'sm')}${esc(p.area)}${p.distanceKm ? ` · ${esc(p.distanceKm)} km to campus` : ''}</div>
      <div class="tags"><span>${esc(p.roomType)}</span><span>${esc(p.genderPref)}</span><span>${p.bedrooms || 1} bed</span></div>
      <div class="pfoot"><span class="row" style="gap:6px">${r.n ? `${ic('star-fill', 'sm')}<b style="color:var(--text)">${r.avg.toFixed(1)}</b> (${r.n})` : 'No reviews yet'}</span><span>${esc(p.landlordBiz || p.landlordName || '')}</span></div></div></article>`;
  }
  function gridHtml() {
    const l = visible();
    return l.length ? l.map(card).join('') : `<div style="grid-column:1/-1">${O.empty('search', 'No rooms match your filters', 'Try widening your budget or clearing some filters.', `<button class="btn soft" data-act="clearFilters">Clear filters</button>`)}</div>`;
  }
  function filtersUsed() { const f = O.S.f; return [f.q, f.area, f.type, f.gender, f.max, f.verified, f.avail].filter(Boolean).length; }
  R.browse = () => {
    const f = O.S.f;
    const sel = (k, blank, opts) => `<select data-filter="${k}" aria-label="${blank}" class="${f[k] ? 'active' : ''}"><option value="">${blank}</option>${O.opts(opts, f[k])}</select>`;
    return `${O.pageHead(`Find your <span style="color:var(--gold)">off-campus home</span>`, `Rooms and lodges near BUSE in Bindura and Kadoma`)}
    <div class="filters"><div class="searchbar"><div class="inp">${ic('search')}<input type="search" id="q" data-filter="q" placeholder="Search area, title or amenity…" value="${esc(f.q)}" aria-label="Search rooms"></div></div>
    <div class="fbar">${sel('area', 'All areas', O.CFG.AREAS ? Object.entries(O.CFG.AREAS).map(([t, l]) => ({ group: t, items: l.map(a => `${a} (${t})`) })) : [])}${sel('type', 'Room type', O.CFG.ROOM_TYPES)}${sel('gender', 'Gender', O.CFG.GENDER_PREFS.slice(1))}${sel('max', 'Max price', [['40', 'Up to $40'], ['60', 'Up to $60'], ['80', 'Up to $80'], ['100', 'Up to $100'], ['150', 'Up to $150']])}
      <select data-filter="sort" aria-label="Sort">${O.opts(SORTS, f.sort)}</select>
      <button class="btn sm ${f.verified ? 'gold' : 'ghost'}" style="border-radius:999px;flex:none" data-act="toggleVerified" aria-pressed="${!!f.verified}">${ic('shield-check', 'sm')}Verified only</button>
      <button class="btn sm ${f.avail ? 'gold' : 'ghost'}" style="border-radius:999px;flex:none" data-act="toggleAvail" aria-pressed="${!!f.avail}">${ic('check-circle', 'sm')}Available</button>
      ${filtersUsed() ? `<button class="btn sm soft" style="flex:none" data-act="clearFilters">${ic('x', 'sm')}Clear</button>` : ''}</div></div>
    <p class="muted small" id="resultCount" style="margin:-4px 0 12px" aria-live="polite">${visible().length} room${visible().length === 1 ? '' : 's'} found</p>
    <div class="pgrid" id="pgrid">${gridHtml()}</div>`;
  };
  function refreshGrid() { const g = $('#pgrid'); if (!g) return; g.innerHTML = gridHtml(); const c = $('#resultCount'); if (c) { const n = visible().length; c.textContent = `${n} room${n === 1 ? '' : 's'} found`; } }
  document.addEventListener('input', e => { const t = e.target; if (t.matches && t.matches('input[data-filter]')) { O.S.f[t.dataset.filter] = t.value; clearTimeout(O._ft); O._ft = setTimeout(refreshGrid, 120); } });
  document.addEventListener('change', e => { const t = e.target; if (t.matches && t.matches('select[data-filter]')) { O.S.f[t.dataset.filter] = t.value; t.classList.toggle('active', !!t.value && t.dataset.filter !== 'sort'); refreshGrid(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-act=openProp]')) O.acts.openProp(e.target); });
  O.acts.openProp = el => O.go('property/' + el.dataset.id);
  O.acts.toggleVerified = () => { O.S.f.verified = !O.S.f.verified; O.refreshView(); };
  O.acts.toggleAvail = () => { O.S.f.avail = !O.S.f.avail; O.refreshView(); };
  O.acts.clearFilters = () => { Object.assign(O.S.f, { q: '', area: '', type: '', gender: '', max: '', verified: false, avail: false }); O.refreshView(); };
  O.refreshView = O.onDataNow = () => O.rerender();
  O.acts.fav = async (el, e) => {
    e.stopPropagation();
    const id = el.dataset.id, list = new Set(favs());
    list.has(id) ? list.delete(id) : list.add(id);
    const me = { ...O.S.me, favs: [...list] }; O.S.me = me;
    el.classList.toggle('on', list.has(id)); el.innerHTML = ic(list.has(id) ? 'heart-fill' : 'heart');
    O.toast(list.has(id) ? 'Saved to favourites' : 'Removed from favourites', 'success');
    await O.save('profiles', { id: me.id, favs: me.favs });
    if (O.S.page === 'favourites') O.onDataNow();
  };
  R.favourites = () => {
    const list = O.DB.properties.filter(p => favs().includes(p.id) && p.approved);
    return `${O.pageHead('Your <span style="color:var(--gold)">favourites</span>', 'Rooms you saved for later')}${list.length ? `<div class="pgrid">${list.map(card).join('')}</div>` : O.empty('heart', 'Nothing saved yet', 'Tap the heart on any room to keep it here.', `<a class="btn" href="#/browse">Explore rooms</a>`)}`;
  };

  /* ---------- PROPERTY DETAIL ---------- */
  const ACTIVE = ['pending', 'accepted', 'paid', 'confirmed'];
  const myBooking = pid => O.DB.bookings.filter(b => b.propertyId === pid && b.studentId === uid()).sort((a, b) => new Date(b.created) - new Date(a.created))[0];
  const canReview = pid => { const b = O.DB.bookings.some(x => x.propertyId === pid && x.studentId === uid() && ['confirmed', 'completed'].includes(x.status)); return b; };
  R.property = ([id]) => {
    const p = O.DB.properties.find(x => x.id === id);
    if (!p) return `<a class="backlink" href="#/browse">${ic('arrow-left')}Back to rooms</a>${O.empty('search', 'Listing not found', 'It may have been removed or is not available.', `<a class="btn" href="#/browse">Explore rooms</a>`)}`;
    const reviews = O.DB.reviews.filter(r => r.propertyId === id).sort((a, b) => new Date(b.date) - new Date(a.date)), rt = O.ratingOf(id);
    const bk = myBooking(id), open = bk && ACTIVE.includes(bk.status), fav = favs().includes(id);
    const phone = bk && ['accepted', 'paid', 'confirmed', 'completed'].includes(bk.status) && bk.landlordPhone;
    const photos = p.photos || [];
    const mine = O.DB.reviews.find(r => r.propertyId === id && r.studentId === uid());
    return `<a class="backlink" href="#/browse">${ic('arrow-left')}Back to rooms</a>
    <div style="margin-top:12px" class="gallery ${photos.length > 1 ? 'multi' : ''}">${photos.length ? photos.map((s, i) => `<div><img src="${s}" alt="${esc(p.title)} photo ${i + 1}"></div>`).join('') : `<div>${O.ph(p.id)}</div>`}</div>
    <div class="detail"><div class="stack lg">
      <div class="stack sm"><div class="row wrap">${p.landlordVerified ? `<span class="badge ok">${ic('shield-check')}Verified landlord</span>` : `<span class="badge warn">${ic('shield')}Landlord not yet verified</span>`}<span class="badge">${esc(p.roomType)}</span><span class="badge">${esc(p.genderPref)}</span>${p.status === 'Occupied' ? `<span class="badge bad">Occupied</span>` : `<span class="badge info">Available</span>`}</div>
        <h2 style="font-family:var(--serif);font-size:28px">${esc(p.title)}</h2>
        <div class="loc">${ic('map-pin', 'sm')}${esc(p.area)}${p.distanceKm ? ` · ${esc(p.distanceKm)} km to campus` : ''} · <a href="${O.mapsUrl(p.area)}" target="_blank" rel="noopener">View on map</a></div>
        <div class="row">${rt.n ? `${O.stars(rt.avg)}<b>${rt.avg.toFixed(1)}</b><span class="muted">(${rt.n} review${rt.n > 1 ? 's' : ''})</span>` : '<span class="muted small">No reviews yet</span>'}</div></div>
      <div class="card"><h3>About this place</h3><p style="margin-top:8px;white-space:pre-wrap">${esc(p.description || 'No description provided.')}</p>${p.houseRules ? `<div class="divider" style="margin:14px 0"></div><h3>House rules</h3><p style="margin-top:8px;white-space:pre-wrap">${esc(p.houseRules)}</p>` : ''}
        <div class="divider" style="margin:14px 0"></div>${O.kv([['Bedrooms', p.bedrooms], ['Capacity', (p.capacity || 1) + ' student' + (p.capacity > 1 ? 's' : '')], ['Deposit', p.deposit ? O.money(p.deposit) : 'Agreed with landlord'], ['Listed', O.fdate(p.created)]])}</div>
      ${(p.amenities || []).length ? `<div class="card"><h3 style="margin-bottom:12px">Amenities</h3><div class="amen">${p.amenities.map(a => `<div>${ic(O.amenIcon(a))}${esc(a)}</div>`).join('')}</div></div>` : ''}
      <div class="card"><div class="row between wrap" style="margin-bottom:6px"><h3>Reviews</h3>${canReview(id) ? `<button class="btn sm soft" data-act="review" data-pid="${id}">${ic('star')}${mine ? 'Edit your review' : 'Write a review'}</button>` : ''}</div>
        ${reviews.length ? reviews.map(r => `<div class="review"><div class="row between"><b>${esc(r.studentName || 'Student')}</b><span class="tiny muted">${O.fdate(r.date)}</span></div>${O.stars(r.rating)}<p style="margin-top:6px">${esc(r.text)}</p></div>`).join('') : '<p class="muted small">Reviews appear here once students with a confirmed booking share their experience.</p>'}</div>
    </div>
    <aside class="stack sticky"><div class="card stack"><div class="price" style="font-size:30px">${O.money(p.price)}<small> / month</small></div>
      ${open ? `<div class="notice ok">${ic('check-circle')}<div><b>Your request: ${O.badge('booking', bk.status).replace(/<[^>]*>/g, '')}</b><br><a class="link" href="#/bookings">Track in Bookings</a></div></div>`
        : p.status === 'Occupied' ? `<button class="btn lg block" disabled>Currently occupied</button>`
          : `<button class="btn gold lg block" data-act="book" data-pid="${id}">${ic('calendar')}Request to book</button>`}
      <button class="btn ghost block" data-act="msgProperty" data-pid="${id}">${ic('message')}Message landlord</button>
      <div class="row"><button class="btn soft grow" data-act="fav" data-id="${id}" aria-pressed="${fav}">${ic(fav ? 'heart-fill' : 'heart')}${fav ? 'Saved' : 'Save'}</button><button class="btn soft grow" data-act="share" data-id="${id}">${ic('share')}Share</button></div></div>
      <div class="card stack sm"><div class="row">${O.avatar({ name: p.landlordBiz || p.landlordName })}<div class="grow"><b>${esc(p.landlordBiz || p.landlordName || 'Landlord')}</b><div class="small muted">${p.landlordBiz ? esc(p.landlordName) : 'Landlord'}</div></div></div>
        ${phone ? `<a class="btn soft block" href="tel:${esc(phone)}">${ic('phone')}${esc(phone)}</a>` : `<p class="small muted">${ic('lock', 'sm')} Phone number is shared once your booking request is accepted.</p>`}</div>
      <div class="notice warn">${ic('shield')}<div class="small"><b>Before you pay:</b> view the room (take a friend), pay only the amount in your booking, and ask for a receipt. <a href="#/safety">Safety guide</a></div></div>
      <button class="link small" style="align-self:center;color:var(--bad)" data-act="report" data-type="property" data-id="${id}" data-title="${esc(p.title)}">${ic('flag', 'sm')} Report this listing</button></aside></div>`;
  };
  O.acts.share = async el => {
    const url = location.origin + location.pathname + '#/property/' + el.dataset.id, p = O.DB.properties.find(x => x.id === el.dataset.id);
    try { if (navigator.share) await navigator.share({ title: p ? p.title : 'Offrez room', text: 'Check out this room on Offrez', url }); else { await navigator.clipboard.writeText(url); O.toast('Link copied.', 'success'); } } catch (e) { /* cancelled */ }
  };

  /* ---------- BOOKING REQUEST ---------- */
  O.acts.book = el => {
    const p = O.DB.properties.find(x => x.id === el.dataset.pid); if (!p) return;
    const today = new Date().toISOString().slice(0, 10);
    O.modal({
      title: 'Request to book', body: `<form id="bookForm" class="stack" data-form="book" data-pid="${p.id}" novalidate><div class="formerr"></div>
      <div class="item" style="padding:12px"><div class="thumb">${O.photo(p)}</div><div class="grow"><h4>${esc(p.title)}</h4><div class="small muted">${esc(p.area)} · ${O.money(p.price)}/month</div></div></div>
      <div class="grid2">${O.fld({ id: 'movein', label: 'Move-in date', icon: 'calendar', type: 'date', min: today })}${O.fld({ id: 'months', label: 'Stay length', icon: 'clock', options: [['1', '1 month'], ['3', '3 months'], ['5', 'One semester (5 months)'], ['10', 'Academic year (10 months)'], ['12', '12 months']], val: '5' })}</div>
      ${O.fld({ id: 'message', label: 'Message to landlord', rows: 3, opt: true, ph: 'Introduce yourself and ask any questions…', maxlength: 600 })}
      <label class="check" data-f="ack"><input type="checkbox" name="ack" required><span>I understand this is a request only. I will view the room and only pay what my booking shows, directly to the landlord.</span></label><div class="err" data-err="ack"></div></form>`,
      foot: `<button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn gold" type="submit" form="bookForm">Send request</button>`
    });
  };
  O.forms.book = async (f, btn) => {
    O.clearErrs(f); const p = O.DB.properties.find(x => x.id === f.dataset.pid), d = new FormData(f); if (!p) return;
    const movein = val(f, 'movein');
    if (!movein || movein < new Date().toISOString().slice(0, 10)) O.formErr(f, 'movein', 'Choose a move-in date from today onwards.');
    if (!d.get('ack')) O.formErr(f, 'ack', 'Please tick to confirm.');
    if (f.querySelector('.has-err')) return O.focusFirstErr(f);
    const me = O.S.me;
    await O.busy(btn, async () => {
      const b = { id: O.id('b'), propertyId: p.id, propertyTitle: p.title, propertyArea: p.area, price: +p.price, studentId: me.id, studentName: O.fullName(me), studentPhone: me.phone || '', studentReg: me.regNumber || '', landlordId: p.landlordId, landlordName: p.landlordBiz || p.landlordName, parts: [me.id, p.landlordId], movein, months: +val(f, 'months'), message: val(f, 'message'), status: 'pending', created: O.iso(), updated: O.iso() };
      if (!await O.save('bookings', b)) return;
      O.notifyL(p.landlordId, 'New booking request', `${O.fullName(me)} requested “${p.title}” from ${O.fdate(movein)}.`, '#/requests');
      O.closeModal(); O.toast('Request sent. The landlord will respond soon.', 'success'); O.go('bookings');
    });
  };

  /* ---------- BOOKINGS (student) ---------- */
  const STEPS = [['pending', 'Requested'], ['accepted', 'Accepted'], ['paid', 'Paid'], ['confirmed', 'Confirmed'], ['completed', 'Moved in']];
  O.timeline = s => { const i = STEPS.findIndex(x => x[0] === s); return `<div class="timeline" aria-label="Booking progress">${STEPS.map((x, k) => `<div class="st ${k <= i ? 'done' : ''}">${x[1]}</div>`).join('')}</div>`; };
  R.bookings = () => {
    const tab = O.S.btab || 'active';
    const all = O.DB.bookings.filter(b => b.studentId === uid()).sort((a, b) => new Date(b.created) - new Date(a.created));
    const act = all.filter(b => ACTIVE.includes(b.status)), hist = all.filter(b => !ACTIVE.includes(b.status));
    const list = tab === 'active' ? act : hist;
    return `${O.pageHead('My <span style="color:var(--gold)">bookings</span>', 'Follow each request from first message to move-in')}
    <div class="tabs" role="tablist"><button class="${tab === 'active' ? 'on' : ''}" data-act="btab" data-t="active">Active<span class="n">${act.length}</span></button><button class="${tab === 'hist' ? 'on' : ''}" data-act="btab" data-t="hist">History<span class="n">${hist.length}</span></button></div>
    ${list.length ? `<div class="list">${list.map(bookingCard).join('')}</div>` : O.empty('calendar', tab === 'active' ? 'No active bookings' : 'No past bookings', 'Find a room and send your first request.', `<a class="btn" href="#/browse">Explore rooms</a>`)}`;
  };
  O.acts.btab = el => { O.S.btab = el.dataset.t; O.onDataNow(); };
  function bookingCard(b) {
    const p = O.DB.properties.find(x => x.id === b.propertyId), showPhone = ['accepted', 'paid', 'confirmed', 'completed'].includes(b.status);
    const timeline = ACTIVE.includes(b.status) || b.status === 'completed' ? O.timeline(b.status) : '';
    const rows = [['Move-in', O.fdate(b.movein) + ' · ' + b.months + ' month' + (b.months > 1 ? 's' : '')], ['Monthly rent', O.money(b.price)], b.deposit ? ['Deposit due', O.money(b.deposit)] : null, showPhone && b.landlordPhone ? ['Landlord phone', `<a href="tel:${esc(b.landlordPhone)}">${esc(b.landlordPhone)}</a>`, 1] : null, b.instructions ? ['Landlord notes', b.instructions] : null, b.declineNote ? ['Reason', b.declineNote] : null, b.payment ? ['Your payment', `${b.payment.method} · ${O.money(b.payment.amount)} · Ref ${b.payment.ref}`] : null];
    return `<div class="item" style="flex-direction:column"><div class="row" style="width:100%;align-items:flex-start"><div class="thumb">${p ? O.photo(p) : O.ph(b.id)}</div><div class="grow"><div class="row between wrap"><h4>${esc(b.propertyTitle)}</h4>${O.badge('booking', b.status)}</div><div class="small muted">${esc(b.propertyArea || '')} · Requested ${O.ago(b.created)}</div></div></div>
      ${timeline}<div style="width:100%">${O.kv(rows)}</div>
      <div class="actions" style="width:100%">
      ${b.status === 'accepted' ? `<button class="btn gold sm" data-act="pay" data-id="${b.id}">${ic('wallet', 'sm')}I've paid the deposit</button>` : ''}
      ${['confirmed', 'completed'].includes(b.status) ? `<button class="btn soft sm" data-act="review" data-pid="${b.propertyId}">${ic('star', 'sm')}Review</button>` : ''}
      <button class="btn ghost sm" data-act="msgProperty" data-pid="${b.propertyId}">${ic('message', 'sm')}Message</button>
      ${p ? `<a class="btn ghost sm" href="#/property/${p.id}">View listing</a>` : ''}
      ${['pending', 'accepted'].includes(b.status) ? `<button class="btn danger ghost sm" data-act="cancelBk" data-id="${b.id}">Cancel</button>` : ''}</div></div>`;
  }
  O.acts.cancelBk = async el => {
    if (!await O.confirm({ title: 'Cancel this request?', body: 'The landlord will be told you are no longer interested.', ok: 'Cancel request', danger: true })) return;
    const b = O.DB.bookings.find(x => x.id === el.dataset.id); if (!b) return;
    await O.save('bookings', { ...b, status: 'cancelled', updated: O.iso() });
    O.notifyL(b.landlordId, 'Booking cancelled', `${b.studentName} cancelled the request for “${b.propertyTitle}”.`, '#/requests');
    O.toast('Request cancelled.', 'success');
  };
  O.acts.pay = el => {
    const b = O.DB.bookings.find(x => x.id === el.dataset.id); if (!b) return;
    O.modal({
      title: 'Record your deposit payment', body: `<form id="payForm" class="stack" data-form="pay" data-id="${b.id}" novalidate><div class="formerr"></div>
      <div class="notice warn">${ic('shield')}<span class="small">Offrez does not take payments. Pay the landlord directly using the details they gave you, then record the reference here so they can confirm. Never pay before viewing, and never share PINs or OTPs.</span></div>
      <div class="grid2">${O.fld({ id: 'method', label: 'Paid with', icon: 'wallet', options: O.CFG.PAY_METHODS })}${O.fld({ id: 'amount', label: 'Amount paid (USD)', icon: 'wallet', type: 'number', min: 1, step: '0.01', val: b.deposit || b.price, inputmode: 'decimal' })}</div>
      ${O.fld({ id: 'ref', label: 'Transaction / receipt reference', icon: 'file', ph: 'e.g. MP240612.1234.A56789', maxlength: 60 })}</form>`,
      foot: `<button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn gold" type="submit" form="payForm">Submit for confirmation</button>`
    });
  };
  O.forms.pay = async (f, btn) => {
    O.clearErrs(f); const b = O.DB.bookings.find(x => x.id === f.dataset.id); if (!b) return;
    const amount = +val(f, 'amount'), ref = val(f, 'ref');
    if (!(amount > 0)) O.formErr(f, 'amount', 'Enter the amount you paid.');
    if (ref.length < 4) O.formErr(f, 'ref', 'Enter the payment reference or receipt number.');
    if (f.querySelector('.has-err')) return O.focusFirstErr(f);
    await O.busy(btn, async () => {
      await O.save('bookings', { ...b, status: 'paid', payment: { method: val(f, 'method'), amount, ref, at: O.iso() }, updated: O.iso() });
      O.notifyL(b.landlordId, 'Deposit reported', `${b.studentName} says they paid ${O.money(amount)} (ref ${ref}). Please confirm receipt.`, '#/requests');
      O.closeModal(); O.toast('Sent. The landlord will confirm receipt.', 'success');
    });
  };

  /* ---------- REVIEWS ---------- */
  O.acts.review = el => {
    const pid = el.dataset.pid, ex = O.DB.reviews.find(r => r.propertyId === pid && r.studentId === uid());
    O.modal({
      title: 'Rate your stay', body: `<form id="revForm" class="stack" data-form="review" data-pid="${pid}" novalidate><div class="formerr"></div>
      <div class="field"><label>Your rating</label><div class="starpick" role="radiogroup" aria-label="Rating">${[5, 4, 3, 2, 1].map(n => `<input type="radio" name="rating" id="st${n}" value="${n}" ${ex && ex.rating === n ? 'checked' : ''}><label for="st${n}" title="${n} star${n > 1 ? 's' : ''}">${ic('star')}</label>`).join('')}</div><div class="err" data-err="rating"></div></div>
      ${O.fld({ id: 'text', label: 'Your review', rows: 4, ph: 'Be honest and fair. What was it like to live here?', val: ex ? ex.text : '', maxlength: 800 })}</form>`,
      foot: `<button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn gold" type="submit" form="revForm">Post review</button>`
    });
  };
  O.forms.review = async (f, btn) => {
    O.clearErrs(f); const rating = +val(f, 'rating'), text = val(f, 'text');
    if (!rating) f.querySelector('[data-err=rating]').textContent = 'Please choose a star rating.';
    if (text.length < 10) O.formErr(f, 'text', 'Write at least a sentence.');
    if (!rating || text.length < 10) return;
    await O.busy(btn, async () => {
      const pid = f.dataset.pid;
      await O.save('reviews', { id: pid + '_' + uid(), propertyId: pid, studentId: uid(), studentName: O.fullName(O.S.me), rating, text, date: O.iso() });
      O.closeModal(); O.toast('Thanks for your review!', 'success');
    });
  };

  R.messages = args => O.chatView(args);

  /* ---------- PROFILE (shared with landlord) ---------- */
  O.profileView = () => {
    const me = O.S.me, st = O.S.role === 'student', theme = O.theme();
    const vs = O.S.role === 'landlord' ? O.myVerif() : null;
    return `${O.pageHead('My <span style="color:var(--gold)">profile</span>')}
    <div class="stack lg" style="max-width:720px"><div class="card"><div class="row" style="gap:16px">${O.avatar(me, 'lg')}<div class="grow"><h3 style="font-size:20px">${esc(O.fullName(me))}</h3><div class="muted small">${esc(me.email || '')}</div><div class="row wrap" style="margin-top:6px"><span class="badge info">${ic(st ? 'graduation' : 'building')}${st ? 'Student' : 'Landlord'}</span>${O.S.user ? `<span class="badge ok">${ic('mail')}Email verified</span>` : ''}${vs ? O.badge('verif', vs) : ''}</div></div></div></div>
      <div class="card"><h3 style="margin-bottom:12px">Personal details</h3><form id="profForm" class="stack" data-form="myprofile" novalidate><div class="formerr"></div>
        <div class="grid2">${O.fld({ id: 'fname', label: 'First name', icon: 'user', val: me.fname || '' })}${O.fld({ id: 'lname', label: 'Surname', icon: 'user', val: me.lname || '' })}</div>
        ${O.fld({ id: 'phone', label: 'Mobile number', icon: 'phone', type: 'tel', val: me.phone || '' })}
        ${st ? `<div class="grid2">${O.fld({ id: 'gender', label: 'Gender', icon: 'user', options: ['Female', 'Male', 'Prefer not to say'], val: me.gender || '' })}${O.fld({ id: 'programme', label: 'Programme', icon: 'book', opt: true, ph: 'e.g. BSc Computer Science', val: me.programme || '' })}</div>
        <div class="field"><label>Student registration no.</label><div class="inp">${ic('id-card')}<input value="${esc(me.regNumber || '')}" disabled></div><div class="hint">Linked to one account. Contact support to change it.</div></div>`
        : `<div class="grid2">${O.fld({ id: 'business', label: 'Business / lodge name', icon: 'building', opt: true, val: me.business || '' })}${O.fld({ id: 'town', label: 'Based in', icon: 'map-pin', options: Object.keys(O.CFG.AREAS), val: me.town || 'Bindura' })}</div>`}
        <button class="btn" type="submit" style="align-self:flex-start">Save changes</button></form></div>
      <div class="card stack"><h3>App &amp; privacy</h3>
        <div class="row between"><div><b>Appearance</b><div class="small muted">Currently: ${theme === 'auto' ? 'follows your device' : theme}</div></div><div class="seg" style="min-width:200px">${['auto', 'light', 'dark'].map(t => `<button class="${theme === t ? 'on' : ''}" data-act="setTheme" data-t="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div></div>
        ${O.canInstall() ? `<div class="row between"><div><b>Install Offrez</b><div class="small muted">Add it to your home screen. Works offline.</div></div><button class="btn soft sm" data-act="install">${ic('download', 'sm')}Install</button></div>` : ''}
        <div class="divider"></div><div class="row wrap"><a class="btn ghost sm" href="#/terms">Terms</a><a class="btn ghost sm" href="#/privacy">Privacy</a><a class="btn ghost sm" href="#/safety">Child safety</a><a class="btn ghost sm" href="mailto:${esc(O.CFG.SUPPORT_EMAIL)}?subject=Offrez%20data%20or%20account%20request">${ic('mail', 'sm')}Data / deletion request</a></div></div>
      <button class="btn danger ghost" style="align-self:flex-start" data-act="logout">${ic('logout')}Log out</button></div>`;
  };
  R.profile = () => O.profileView();
  O.acts.setTheme = el => { O.applyTheme(el.dataset.t); O.refreshChrome(); };
  O.forms.myprofile = async (f, btn) => {
    O.clearErrs(f); const me = O.S.me;
    const u = { id: me.id, fname: val(f, 'fname'), lname: val(f, 'lname'), phone: val(f, 'phone').replace(/[^\d+]/g, '') };
    if (u.fname.length < 2) O.formErr(f, 'fname', 'Enter your first name.');
    if (u.lname.length < 2) O.formErr(f, 'lname', 'Enter your surname.');
    if (u.phone.replace(/\D/g, '').length < 9) O.formErr(f, 'phone', 'Enter a valid mobile number.');
    if (O.S.role === 'student') { u.gender = val(f, 'gender'); u.programme = val(f, 'programme'); } else { u.business = val(f, 'business'); u.town = val(f, 'town'); }
    if (f.querySelector('.has-err')) return O.focusFirstErr(f);
    await O.busy(btn, async () => { if (await O.save('profiles', u)) { O.S.me = { ...me, ...u }; O.toast('Profile updated.', 'success'); O.refreshChrome(); } });
  };
})(window.O);
