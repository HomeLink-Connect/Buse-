/* Offrez — landlord portal: dashboard, safety verification (KYC), listings, booking requests. */
'use strict';
(function (O) {
  const $ = O.$, $$ = O.$$, esc = O.esc, ic = O.ic, R = O.routes.landlord, uid = () => O.S.me.id;
  const val = (f, n) => (new FormData(f).get(n) || '').toString().trim();
  const mine = () => O.DB.properties.filter(p => p.landlordId === uid());
  const approved = () => O.myVerif() === 'approved';

  /* ---------- DASHBOARD ---------- */
  function verifBanner() {
    const s = O.myVerif(), v = O.verifOf(uid());
    if (s === 'approved') return `<div class="notice ok">${ic('shield-check')}<div><b>You are a verified landlord.</b> Students see a Verified badge on your listings.</div></div>`;
    if (s === 'pending') return `<div class="notice">${ic('clock')}<div><b>Verification under review.</b> The Admin Office is checking your documents. You will be notified as soon as a decision is made.</div></div>`;
    if (s === 'rejected') return `<div class="notice bad">${ic('alert')}<div><b>Verification needs changes.</b>${v && v.reviewNote ? ` “${esc(v.reviewNote)}”` : ''} <a class="link" href="#/verify">Update and resubmit</a></div></div>`;
    return `<div class="notice warn">${ic('shield')}<div><b>Verify your identity to start listing.</b> To protect students, including young students, no room goes live until we have checked your ID, proof of ownership and police clearance. <a class="link" href="#/verify">Start verification</a></div></div>`;
  }
  R.dashboard = () => {
    const ps = mine(), bs = O.DB.bookings.filter(b => b.landlordId === uid());
    const pend = bs.filter(b => b.status === 'pending').length, live = ps.filter(p => p.approved && p.status !== 'Occupied').length;
    const rs = ps.flatMap(p => O.DB.reviews.filter(r => r.propertyId === p.id)), avg = rs.length ? rs.reduce((s, r) => s + r.rating, 0) / rs.length : 0;
    const recent = bs.sort((a, b) => new Date(b.created) - new Date(a.created)).slice(0, 4);
    return `${O.pageHead(`Welcome, <span style="color:var(--gold)">${esc(O.S.me.fname || 'landlord')}</span>`, 'Here is how your listings are doing')}
    <div class="stack lg">${verifBanner()}
    <div class="stats"><div class="stat"><div class="ico">${ic('building')}</div><b>${ps.length}</b><span>Total listings</span></div><div class="stat gold"><div class="ico">${ic('check-circle')}</div><b>${live}</b><span>Live &amp; available</span></div><div class="stat"><div class="ico">${ic('calendar')}</div><b>${pend}</b><span>Pending requests</span></div><div class="stat"><div class="ico">${ic('star')}</div><b>${rs.length ? avg.toFixed(1) : '–'}</b><span>${rs.length} review${rs.length === 1 ? '' : 's'}</span></div></div>
    <div class="card"><div class="row between" style="margin-bottom:10px"><h3>Latest requests</h3><a class="link small" href="#/requests">See all</a></div>
      ${recent.length ? `<div class="list">${recent.map(b => `<div class="item" style="padding:12px"><div class="avatar">${esc(O.initials({ name: b.studentName }))}</div><div class="grow"><h4>${esc(b.studentName)}</h4><div class="small muted">${esc(b.propertyTitle)} · ${O.fdate(b.movein)}</div></div>${O.badge('booking', b.status)}</div>`).join('')}</div>` : `<p class="muted small">No requests yet. Once your listings are live, requests will appear here.</p>`}</div>
    <div class="row wrap"><a class="btn" href="#/properties">${ic('building')}Manage listings</a><a class="btn ghost" href="#/verify">${ic('shield-check')}Verification</a><a class="btn ghost" href="#/safety">${ic('child')}Child safety code</a></div></div>`;
  };

  /* ---------- VERIFICATION (KYC) ---------- */
  const DOCS = [
    ['idFront', 'National ID: front', 'Clear photo, all corners visible', 'id-card'],
    ['idBack', 'National ID: back', 'Clear photo, all corners visible', 'id-card'],
    ['selfie', 'Selfie holding your ID', 'Your face and the ID must both be readable', 'camera'],
    ['ownership', 'Proof of ownership or authority', 'Title deed, rates bill, lease or signed agent letter', 'file'],
    ['police', 'Police clearance certificate', 'Recent certificate (within 12 months)', 'shield-check']
  ];
  O.getVfiles = async id => {
    if (!O.S.cloud) return O.DB.vfiles.filter(x => x.landlordId === id);
    try { const { F, db } = window.FB; const s = await F.getDocs(F.query(F.collection(db, 'vfiles'), F.where('landlordId', '==', id))); return s.docs.map(d => ({ id: d.id, ...d.data() })); }
    catch (e) { console.warn(e); return []; }
  };
  R.verify = () => {
    const s = O.myVerif(), v = O.verifOf(uid()), me = O.S.me;
    if (O.S.editKyc && s === 'pending') return verifyForm('resubmit', v, me);
    if (s === 'approved' || s === 'pending') {
      O.next(async () => { const box = $('#vdocs'); if (!box) return; const files = await O.getVfiles(uid()); box.innerHTML = files.length ? files.map(f => `<figure style="margin:0"><img class="docimg" src="${f.data}" alt="${esc(f.kind)}" style="margin:0"><figcaption class="tiny muted" style="margin-top:4px">${esc((DOCS.find(d => d[0] === f.kind) || [0, f.kind])[1])}</figcaption></figure>`).join('') : '<p class="muted small">Documents are stored securely.</p>'; });
      return `${O.pageHead('Landlord <span style="color:var(--gold)">verification</span>', 'Keeps students safe and your listings trusted')}
      <div class="stack lg" style="max-width:760px"><div class="notice ${s === 'approved' ? 'ok' : ''}">${ic(s === 'approved' ? 'shield-check' : 'clock')}<div><b>${s === 'approved' ? 'Verified' : 'Submitted. Under review'}</b><br>${s === 'approved' ? `Approved ${O.fdate(v.reviewedAt)}. You can now publish listings for admin approval.` : `Submitted ${O.ago(v.submittedAt)}. Reviews usually take 1 to 2 working days.`}</div></div>
      <div class="card"><h3 style="margin-bottom:10px">Submitted details</h3>${O.kv([['Legal name', v.legalName], ['ID type', v.idType], ['ID number', v.idNumber ? '••••' + String(v.idNumber).slice(-3) : ''], ['Relationship', v.relationship], ['Property address', v.propertyAddress], ['Emergency contact', v.emergency ? `${v.emergency.name} (${v.emergency.relation}) ${v.emergency.phone}` : ''], ['Reference', v.reference ? `${v.reference.name} ${v.reference.phone}` : '']])}</div>
      <div class="card"><h3 style="margin-bottom:10px">Your documents</h3><p class="small muted" style="margin-bottom:10px">${ic('lock', 'sm')} Visible only to you and authorised administrators.</p><div class="grid3" id="vdocs"><div class="skel" style="height:90px"></div><div class="skel" style="height:90px"></div><div class="skel" style="height:90px"></div></div></div>
      ${s === 'pending' ? `<button class="btn ghost" style="align-self:flex-start" data-act="reVerify">${ic('refresh')}Update my documents</button>` : ''}</div>`;
    }
    return verifyForm(s, v, me);
  };
  O.acts.reVerify = () => { O.S.editKyc = true; O.onDataNow(); };
  const prevAfter = O.afterRender;
  O.afterRender = (page, args) => { if (page !== 'verify') { O.S.editKyc = false; const ph = O.tmp.photos; O.tmp = { photos: ph }; } prevAfter && prevAfter(page, args); };
  function verifyForm(s, v, me) {
    const pre = v || {};
    return `${O.pageHead('Landlord <span style="color:var(--gold)">verification</span>', 'Required before any listing can go live')}
    <div class="stack lg" style="max-width:760px">
    ${s === 'rejected' ? `<div class="notice bad">${ic('alert')}<div><b>Please fix and resubmit.</b>${v.reviewNote ? ` Admin note: “${esc(v.reviewNote)}”` : ''}</div></div>` : ''}
    <div class="notice">${ic('child')}<div><b>Why we ask for this.</b> Many students are 17 to 19 years old. Every landlord is identity-checked and screened so that students, especially minors, live somewhere safe. Your documents are encrypted in transit, visible only to authorised admins, and handled under our <a href="#/privacy">Privacy Policy</a>.</div></div>
    <form id="kycForm" class="stack lg" data-form="kyc" novalidate><div class="formerr"></div>
    <div class="card stack"><h3>1. Identity</h3>
      ${O.fld({ id: 'legalName', label: 'Full legal name (as on your ID)', icon: 'user', val: pre.legalName || O.fullName(me), ac: 'name' })}
      <div class="grid2">${O.fld({ id: 'idType', label: 'ID type', icon: 'id-card', options: ['National ID', 'Passport', "Driver's licence"], val: pre.idType || 'National ID' })}${O.fld({ id: 'idNumber', label: 'ID number', icon: 'id-card', ph: 'e.g. 63-123456 A 12', val: '' })}</div>
      <div class="grid2">${O.fld({ id: 'dob', label: 'Date of birth', icon: 'calendar', type: 'date', val: pre.dob || '', max: new Date(Date.now() - 18 * 365.25 * 864e5).toISOString().slice(0, 10) })}${O.fld({ id: 'address', label: 'Your home address', icon: 'map-pin', ph: 'Street, suburb, town', val: pre.address || '' })}</div></div>
    <div class="card stack"><h3>2. The property</h3>
      ${O.fld({ id: 'relationship', label: 'Your relationship to the property', icon: 'key', options: ['Owner', 'Agent / caretaker with written authority', 'Family member of the owner'], val: pre.relationship || 'Owner' })}
      ${O.fld({ id: 'propertyAddress', label: 'Property address', icon: 'building', ph: 'Stand number, street, suburb', val: pre.propertyAddress || '' })}</div>
    <div class="card stack"><h3>3. Documents</h3><p class="small muted">Take clear, well-lit photos. Each file is compressed automatically. ${s !== 'none' ? 'Please upload all documents again.' : ''}</p>
      <div class="grid2">${DOCS.map(d => `<div class="field" data-f="${d[0]}"><label>${d[1]}</label>${O.drop(d[0], 'Tap to add photo', d[2], d[3])}<div class="err" data-err="${d[0]}"></div></div>`).join('')}</div></div>
    <div class="card stack"><h3>4. Contacts</h3><p class="small muted">Used only if there is a safety concern or to confirm who you are.</p>
      <div class="grid3">${O.fld({ id: 'emName', label: 'Emergency contact name', icon: 'user' })}${O.fld({ id: 'emRel', label: 'Relationship', icon: 'users', ph: 'e.g. Spouse' })}${O.fld({ id: 'emPhone', label: 'Phone', icon: 'phone', type: 'tel' })}</div>
      <div class="grid2">${O.fld({ id: 'refName', label: 'Character reference (name)', icon: 'user', ph: 'e.g. Pastor, headmaster, councillor' })}${O.fld({ id: 'refPhone', label: 'Reference phone', icon: 'phone', type: 'tel' })}</div></div>
    <div class="card stack"><h3>5. Safety declarations</h3>
      <label class="check"><input type="checkbox" name="d1" required><span>All the information and documents I submitted are genuine and belong to me. I understand forged documents lead to a permanent ban and a police report.</span></label>
      <label class="check"><input type="checkbox" name="d2" required><span>Nobody who lives at or has access to the property has been convicted of an offence against a child or any sexual offence, and I will report any concern immediately.</span></label>
      <label class="check"><input type="checkbox" name="d3" required><span>I agree to the <button type="button" class="link" data-act="legal" data-doc="safety">Child Safety Code of Conduct</button> and allow reasonable inspections by the Admin Office or the University.</span></label>
      <div class="err" data-err="decl" role="alert"></div></div>
    <button class="btn gold lg" type="submit" style="align-self:flex-start">${ic('shield-check')}Submit for verification</button></form></div>`;
  }
  O.forms.kyc = async (f, btn) => {
    O.clearErrs(f); const d = new FormData(f), me = O.S.me;
    const need = ['legalName', 'idNumber', 'dob', 'address', 'propertyAddress', 'emName', 'emRel', 'emPhone', 'refName', 'refPhone'];
    need.forEach(k => { if (!val(f, k)) O.formErr(f, k, 'Required.'); });
    const dob = val(f, 'dob'); if (dob) { const age = (Date.now() - new Date(dob)) / (365.25 * 864e5); if (age < 18) O.formErr(f, 'dob', 'Landlords must be 18 or older.'); }
    DOCS.forEach(x => { if (!O.tmp[x[0]]) O.formErr(f, x[0], 'Please add this document.'); });
    if (!d.get('d1') || !d.get('d2') || !d.get('d3')) f.querySelector('[data-err=decl]').textContent = 'Please accept all three declarations.';
    if (f.querySelector('.has-err') || !d.get('d1') || !d.get('d2') || !d.get('d3')) return O.focusFirstErr(f);
    await O.busy(btn, async () => {
      for (const x of DOCS) { if (!await O.save('vfiles', { id: uid() + '_' + x[0], landlordId: uid(), kind: x[0], data: O.tmp[x[0]], created: O.iso() })) return O.topErr(f, 'Could not upload your documents. Check your connection and try again.'); }
      const rec = { id: uid(), landlordId: uid(), landlordName: O.fullName(me), landlordEmail: me.email || '', landlordPhone: me.phone || '', status: 'pending', submittedAt: O.iso(), reviewNote: '', reviewedAt: null, legalName: val(f, 'legalName'), idType: val(f, 'idType'), idNumber: val(f, 'idNumber'), dob, address: val(f, 'address'), relationship: val(f, 'relationship'), propertyAddress: val(f, 'propertyAddress'), emergency: { name: val(f, 'emName'), relation: val(f, 'emRel'), phone: val(f, 'emPhone') }, reference: { name: val(f, 'refName'), phone: val(f, 'refPhone') }, docs: DOCS.map(x => x[0]), declarations: { truth: true, childSafety: true, inspection: true, at: O.iso() } };
      if (!await O.save('verifications', rec)) return O.topErr(f, 'Could not submit. Please try again.');
      O.tmp = {}; O.S.editKyc = false; O.toast('Submitted. We will review your documents shortly.', 'success'); O.onDataNow();
    });
  };

  /* ---------- LISTINGS ---------- */
  R.properties = () => {
    const ps = mine().sort((a, b) => new Date(b.created) - new Date(a.created)), ok = approved();
    return `${O.pageHead('My <span style="color:var(--gold)">listings</span>', 'Create and manage your rooms', `<button class="btn gold" data-act="addProp">${ic('plus')}Add property</button>`)}
    ${ok ? '' : `<div style="margin-bottom:14px">${verifBanner()}</div>`}
    ${ps.length ? `<div class="list">${ps.map(p => { const st = O.propState(p); return `<div class="item" style="flex-wrap:wrap"><div class="thumb">${O.photo(p)}</div><div class="grow"><div class="row between wrap"><h4>${esc(p.title)}</h4>${O.badge('prop', st)}</div><div class="small muted">${esc(p.area)} · ${O.money(p.price)}/mo · ${esc(p.roomType)}</div>${p.rejected && p.rejectNote ? `<div class="small" style="color:var(--bad);margin-top:4px">Admin note: ${esc(p.rejectNote)}</div>` : ''}${!p.approved && !p.rejected ? `<div class="small muted" style="margin-top:4px">${ic('clock', 'sm')} Waiting for admin approval before students can see it.</div>` : ''}
      <div class="actions"><button class="btn soft sm" data-act="editProp" data-id="${p.id}">${ic('edit', 'sm')}Edit</button>${p.approved ? `<button class="btn soft sm" data-act="toggleOcc" data-id="${p.id}">${p.status === 'Occupied' ? 'Mark available' : 'Mark occupied'}</button>` : ''}<button class="btn danger ghost sm" data-act="delProp" data-id="${p.id}">${ic('trash', 'sm')}Delete</button></div></div></div>`; }).join('')}</div>`
      : O.empty('building', 'No listings yet', ok ? 'Add your first room to start receiving requests.' : 'Complete verification first, then add your rooms.', `<button class="btn gold" data-act="addProp">${ic('plus')}Add property</button>`)}`;
  };
  O.acts.addProp = () => {
    if (!approved()) return O.modal({ title: 'Verification required', body: `<div class="stack"><div class="bigico" style="margin:0 auto">${ic('shield-check')}</div><p class="center">To keep students safe, you can add listings once the Admin Office has verified your identity and documents.</p></div>`, foot: `<button class="btn ghost" data-act="closeModal">Close</button><a class="btn gold" href="#/verify" data-act="closeModal">${O.myVerif() === 'pending' ? 'View my submission' : 'Start verification'}</a>` });
    propForm();
  };
  O.acts.editProp = el => propForm(O.DB.properties.find(p => p.id === el.dataset.id));
  function propForm(p) {
    p = p || {}; O.tmp.photos = [...(p.photos || [])];
    const areas = Object.entries(O.CFG.AREAS).map(([t, l]) => ({ group: t, items: l.map(a => `${a} (${t})`) }));
    O.modal({
      title: p.id ? 'Edit property' : 'Add property', wide: true, body: `<form id="propForm" class="stack" data-form="prop" data-id="${p.id || ''}" novalidate><div class="formerr"></div>
      ${O.fld({ id: 'title', label: 'Listing title', icon: 'edit', ph: 'e.g. Cosy single room: Shashi View', val: p.title || '', maxlength: 80 })}
      <div class="grid2">${O.fld({ id: 'area', label: 'Area', icon: 'map-pin', options: areas, val: p.area || '' })}${O.fld({ id: 'distanceKm', label: 'Distance to campus (km)', icon: 'ruler', type: 'number', step: '0.1', min: 0, val: p.distanceKm || '', inputmode: 'decimal' })}</div>
      <div class="grid3">${O.fld({ id: 'price', label: 'Rent (USD / month)', icon: 'wallet', type: 'number', min: 1, val: p.price || '', inputmode: 'numeric' })}${O.fld({ id: 'deposit', label: 'Deposit (USD)', icon: 'wallet', type: 'number', min: 0, val: p.deposit || '', opt: true, inputmode: 'numeric' })}${O.fld({ id: 'roomType', label: 'Room type', icon: 'bed', options: O.CFG.ROOM_TYPES, val: p.roomType || 'Single' })}</div>
      <div class="grid3">${O.fld({ id: 'genderPref', label: 'Gender preference', icon: 'users', options: O.CFG.GENDER_PREFS, val: p.genderPref || 'Any' })}${O.fld({ id: 'bedrooms', label: 'Bedrooms', icon: 'bed', type: 'number', min: 1, max: 12, val: p.bedrooms || 1 })}${O.fld({ id: 'capacity', label: 'Students it can house', icon: 'users', type: 'number', min: 1, max: 20, val: p.capacity || 1 })}</div>
      <div class="field"><label>Amenities &amp; safety features</label><div class="chips">${O.CFG.AMENITIES.map(a => `<label class="chip"><input type="checkbox" name="amen" value="${esc(a)}" ${(p.amenities || []).includes(a) ? 'checked' : ''}><span>${ic(O.amenIcon(a), 'sm')}${esc(a)}</span></label>`).join('')}</div></div>
      <div class="field"><label>Photos <span class="opt">Up to 4 · real photos of this property</span></label><div class="drop" style="min-height:90px">${ic('camera', 'lg')}<b>Add photos</b><input type="file" accept="image/*" multiple data-upload="photos"></div><div class="thumbs" id="photoThumbs" style="margin-top:8px"></div></div>
      ${O.fld({ id: 'description', label: 'Description', rows: 4, ph: 'Describe the room, the yard, water and electricity, transport…', val: p.description || '', maxlength: 1200 })}
      ${O.fld({ id: 'houseRules', label: 'House rules', rows: 2, opt: true, ph: 'Visitors, quiet hours, curfew, cooking…', val: p.houseRules || '', maxlength: 600 })}
      <div class="notice">${ic('info')}<span class="small">New and changed listings are reviewed by the Admin Office before students can see them.</span></div></form>`,
      foot: `<button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn gold" type="submit" form="propForm">${p.id ? 'Save changes' : 'Submit for approval'}</button>`
    });
    O.renderThumbs();
  }
  O.forms.prop = async (f, btn) => {
    O.clearErrs(f); const me = O.S.me, id = f.dataset.id, old = id ? O.DB.properties.find(x => x.id === id) : null;
    const price = +val(f, 'price');
    if (val(f, 'title').length < 5) O.formErr(f, 'title', 'Give your listing a clear title.');
    if (!val(f, 'area')) O.formErr(f, 'area', 'Choose an area.');
    if (!(price > 0)) O.formErr(f, 'price', 'Enter the monthly rent.');
    if (val(f, 'description').length < 20) O.formErr(f, 'description', 'Add a short description (at least 20 characters).');
    if (!(O.tmp.photos || []).length) { O.topErr(f, 'Please add at least one real photo of the property.'); return; }
    if (f.querySelector('.has-err')) return O.focusFirstErr(f);
    await O.busy(btn, async () => {
      const prop = { ...(old || {}), id: id || O.id('p'), landlordId: uid(), landlordName: O.fullName(me), landlordBiz: me.business || '', title: val(f, 'title'), area: val(f, 'area'), price, deposit: +val(f, 'deposit') || 0, distanceKm: val(f, 'distanceKm'), roomType: val(f, 'roomType'), genderPref: val(f, 'genderPref'), bedrooms: +val(f, 'bedrooms') || 1, capacity: +val(f, 'capacity') || 1, amenities: new FormData(f).getAll('amen'), description: val(f, 'description'), houseRules: val(f, 'houseRules'), photos: O.tmp.photos, status: old ? old.status : 'Available', approved: old ? !!old.approved : false, landlordVerified: old ? !!old.landlordVerified : false, rejected: false, rejectNote: '', created: old ? old.created : O.iso() };
      if (!await O.save('properties', prop)) return;
      O.tmp.photos = []; O.closeModal(); O.toast(id ? 'Listing updated.' : 'Submitted. An admin will review it shortly.', 'success');
    });
  };
  O.acts.toggleOcc = async el => { const p = O.DB.properties.find(x => x.id === el.dataset.id); if (!p) return; await O.save('properties', { ...p, status: p.status === 'Occupied' ? 'Available' : 'Occupied' }); O.toast('Listing updated.', 'success'); };
  O.acts.delProp = async el => { if (!await O.confirm({ title: 'Delete this listing?', body: 'It will be removed for students. This cannot be undone.', ok: 'Delete', danger: true })) return; await O.del('properties', el.dataset.id); O.toast('Listing deleted.', 'success'); };

  /* ---------- BOOKING REQUESTS ---------- */
  R.requests = () => {
    const tab = O.S.rtab || 'pending';
    const all = O.DB.bookings.filter(b => b.landlordId === uid()).sort((a, b) => new Date(b.created) - new Date(a.created));
    const groups = { pending: all.filter(b => b.status === 'pending'), active: all.filter(b => ['accepted', 'paid', 'confirmed'].includes(b.status)), history: all.filter(b => ['completed', 'declined', 'cancelled'].includes(b.status)) };
    const list = groups[tab];
    return `${O.pageHead('Booking <span style="color:var(--gold)">requests</span>', 'Respond to students and confirm deposits')}
    <div class="tabs">${[['pending', 'New'], ['active', 'In progress'], ['history', 'History']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="rtab" data-t="${k}">${l}<span class="n">${groups[k].length}</span></button>`).join('')}</div>
    ${list.length ? `<div class="list">${list.map(reqCard).join('')}</div>` : O.empty('calendar', 'Nothing here', tab === 'pending' ? 'New requests from students will show up here.' : '')}`;
  };
  O.acts.rtab = el => { O.S.rtab = el.dataset.t; O.onDataNow(); };
  function reqCard(b) {
    const show = ['accepted', 'paid', 'confirmed', 'completed'].includes(b.status);
    return `<div class="item" style="flex-direction:column"><div class="row" style="width:100%;align-items:flex-start"><div class="avatar">${esc(O.initials({ name: b.studentName }))}</div><div class="grow"><div class="row between wrap"><h4>${esc(b.studentName)}</h4>${O.badge('booking', b.status)}</div><div class="small muted">${esc(b.propertyTitle)} · ${O.ago(b.created)}</div></div></div>
      ${['accepted', 'paid', 'confirmed'].includes(b.status) ? O.timeline(b.status) : ''}
      <div style="width:100%">${O.kv([['Move-in', O.fdate(b.movein) + ' · ' + b.months + ' month' + (b.months > 1 ? 's' : '')], ['Rent', O.money(b.price)], b.deposit ? ['Deposit', O.money(b.deposit)] : null, show && b.studentPhone ? ['Student phone', `<a href="tel:${esc(b.studentPhone)}">${esc(b.studentPhone)}</a>`, 1] : null, b.message ? ['Message', b.message] : null, b.payment ? ['Reported payment', `${b.payment.method} · ${O.money(b.payment.amount)} · Ref ${b.payment.ref}`] : null])}</div>
      <div class="actions" style="width:100%">
      ${b.status === 'pending' ? `<button class="btn ok sm" data-act="accept" data-id="${b.id}">${ic('check', 'sm')}Accept</button><button class="btn danger ghost sm" data-act="decline" data-id="${b.id}">Decline</button>` : ''}
      ${b.status === 'paid' ? `<button class="btn ok sm" data-act="confirmPay" data-id="${b.id}">${ic('check-circle', 'sm')}Confirm deposit received</button><button class="btn danger ghost sm" data-act="notReceived" data-id="${b.id}">Not received</button>` : ''}
      ${b.status === 'confirmed' ? `<button class="btn gold sm" data-act="movedIn" data-id="${b.id}">${ic('key', 'sm')}Mark as moved in</button>` : ''}
      <button class="btn ghost sm" data-act="msgStudent" data-id="${b.id}">${ic('message', 'sm')}Message</button></div></div>`;
  }
  O.acts.msgStudent = el => {
    const b = O.DB.bookings.find(x => x.id === el.dataset.id); if (!b) return;
    O.S.newThread = { id: b.propertyId + '__' + b.studentId, propertyId: b.propertyId, title: b.propertyTitle, studentId: b.studentId, landlordId: uid(), studentName: b.studentName, landlordName: O.fullName(O.S.me) };
    O.go('messages/' + encodeURIComponent(b.propertyId + '__' + b.studentId));
  };
  const bk = id => O.DB.bookings.find(x => x.id === id);
  const upd = async (b, patch, notifTitle, notifBody) => { await O.save('bookings', { ...b, ...patch, updated: O.iso() }); if (notifTitle) O.notifyL(b.studentId, notifTitle, notifBody, '#/bookings'); };
  O.acts.accept = el => {
    const b = bk(el.dataset.id); if (!b) return; const p = O.DB.properties.find(x => x.id === b.propertyId) || {};
    O.modal({
      title: 'Accept booking', body: `<form id="accForm" class="stack" data-form="accept" data-id="${b.id}" novalidate><div class="formerr"></div>
      <p class="muted small">Accepting shares your phone number with ${esc(b.studentName)} so you can arrange a viewing.</p>
      <div class="grid2">${O.fld({ id: 'deposit', label: 'Deposit required (USD)', icon: 'wallet', type: 'number', min: 0, val: p.deposit || b.price })}${O.fld({ id: 'phone', label: 'Your phone number', icon: 'phone', type: 'tel', val: O.S.me.phone || '' })}</div>
      ${O.fld({ id: 'instructions', label: 'Viewing & payment instructions', rows: 3, ph: 'e.g. Viewing Saturday 10am. Pay via EcoCash to 0772 000 000 only after viewing, and I will give a receipt.', maxlength: 500 })}</form>`,
      foot: `<button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn ok" type="submit" form="accForm">Accept request</button>`
    });
  };
  O.forms.accept = async (f, btn) => {
    O.clearErrs(f); const b = bk(f.dataset.id); if (!b) return;
    if (val(f, 'phone').replace(/\D/g, '').length < 9) O.formErr(f, 'phone', 'Enter a valid phone number.');
    if (val(f, 'instructions').length < 8) O.formErr(f, 'instructions', 'Tell the student what happens next.');
    if (f.querySelector('.has-err')) return O.focusFirstErr(f);
    await O.busy(btn, async () => { await upd(b, { status: 'accepted', deposit: +val(f, 'deposit') || 0, landlordPhone: val(f, 'phone'), instructions: val(f, 'instructions') }, 'Booking accepted', `${b.landlordName} accepted your request for “${b.propertyTitle}”. See their instructions.`); O.closeModal(); O.toast('Accepted. The student has been notified.', 'success'); });
  };
  O.acts.decline = el => {
    const b = bk(el.dataset.id); if (!b) return;
    O.modal({ title: 'Decline request', body: `<form id="decForm" class="stack" data-form="decline" data-id="${b.id}">${O.fld({ id: 'note', label: 'Reason (shown to student)', rows: 3, opt: true, ph: 'e.g. Room already taken.' })}</form>`, foot: `<button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn danger" type="submit" form="decForm">Decline</button>` });
  };
  O.forms.decline = async (f, btn) => { const b = bk(f.dataset.id); if (!b) return; await O.busy(btn, async () => { await upd(b, { status: 'declined', declineNote: val(f, 'note') }, 'Booking declined', `Your request for “${b.propertyTitle}” was declined.${val(f, 'note') ? ' Reason: ' + val(f, 'note') : ''}`); O.closeModal(); O.toast('Request declined.', 'success'); }); };
  O.acts.confirmPay = async el => { const b = bk(el.dataset.id); if (!b || !await O.confirm({ title: 'Confirm deposit received?', body: `Only confirm if ${O.money(b.payment ? b.payment.amount : 0)} has reached you (ref ${b.payment ? b.payment.ref : ''}). Remember to give the student a receipt.`, ok: 'Yes, received' })) return; await upd(b, { status: 'confirmed' }, 'Deposit confirmed', `${b.landlordName} confirmed your deposit for “${b.propertyTitle}”. Your room is secured.`); O.toast('Deposit confirmed.', 'success'); };
  O.acts.notReceived = async el => { const b = bk(el.dataset.id); if (!b || !await O.confirm({ title: 'Payment not received?', body: 'The student will be asked to check the reference and try again.', ok: 'Send back', danger: true })) return; await upd(b, { status: 'accepted', payment: null }, 'Payment not found', `${b.landlordName} could not find your payment for “${b.propertyTitle}”. Please check the reference and submit again.`); O.toast('Sent back to the student.', 'success'); };
  O.acts.movedIn = async el => {
    const b = bk(el.dataset.id); if (!b) return;
    if (!await O.confirm({ title: 'Student has moved in?', body: 'This completes the booking. You can then mark the room as occupied.', ok: 'Yes, moved in' })) return;
    await upd(b, { status: 'completed' }, 'Welcome home!', `Your move-in to “${b.propertyTitle}” is recorded. You can now review it.`);
    const p = O.DB.properties.find(x => x.id === b.propertyId);
    if (p && p.status !== 'Occupied' && await O.confirm({ title: 'Mark room as occupied?', body: 'Students will see it as occupied. You can change this later in My listings.', ok: 'Mark occupied' })) await O.save('properties', { ...p, status: 'Occupied' });
    O.toast('Booking completed.', 'success');
  };

  R.messages = a => O.chatView(a);
  R.profile = () => O.profileView();
  R.safety = () => '';
})(window.O);
