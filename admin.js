/* Offrez — admin portal: verification review, listing approval, reports, users, bookings. */
'use strict';
(function (O) {
  const $ = O.$, $$ = O.$$, esc = O.esc, ic = O.ic, R = O.routes.admin;
  const DOCN = { idFront: 'National ID: front', idBack: 'National ID: back', selfie: 'Selfie holding ID', ownership: 'Proof of ownership / authority', police: 'Police clearance' };
  const prof = id => O.DB.profiles.find(p => p.id === id);
  const age = d => d ? Math.floor((Date.now() - new Date(d)) / (365.25 * 864e5)) : '';
  const tabs = (key, items, cur) => `<div class="tabs">${items.map(([k, l, n]) => `<button class="${cur === k ? 'on' : ''}" data-act="atab" data-key="${key}" data-t="${k}">${l}<span class="n">${n}</span></button>`).join('')}</div>`;
  O.acts.atab = el => { O.S['a_' + el.dataset.key] = el.dataset.t; O.rerender(); };

  /* ---------- OVERVIEW ---------- */
  R.overview = () => {
    const P = O.DB.profiles, st = P.filter(p => p.role === 'student').length, ll = P.filter(p => p.role === 'landlord').length;
    const pv = O.DB.verifications.filter(v => v.status === 'pending'), pl = O.DB.properties.filter(p => !p.approved && !p.rejected), live = O.DB.properties.filter(p => p.approved).length, rp = O.DB.reports.filter(r => r.status !== 'resolved');
    const urgent = rp.filter(r => r.urgent).length;
    return `${O.pageHead('Platform <span style="color:var(--gold)">overview</span>', 'Offrez · BUSE off-campus accommodation')}
    <div class="stack lg">${urgent ? `<div class="notice bad">${ic('alert')}<div><b>${urgent} urgent report${urgent > 1 ? 's' : ''} involving a child.</b> Review immediately. <a class="link" href="#/reports">Open reports</a></div></div>` : ''}
    <div class="stats"><div class="stat"><div class="ico">${ic('graduation')}</div><b>${st}</b><span>Students</span></div><div class="stat"><div class="ico">${ic('key')}</div><b>${ll}</b><span>Landlords</span></div><div class="stat"><div class="ico">${ic('building')}</div><b>${live}</b><span>Live listings</span></div><div class="stat gold"><div class="ico">${ic('shield-check')}</div><b>${pv.length}</b><span>Verifications waiting</span></div><div class="stat gold"><div class="ico">${ic('clock')}</div><b>${pl.length}</b><span>Listings waiting</span></div><div class="stat"><div class="ico">${ic('flag')}</div><b>${rp.length}</b><span>Open reports</span></div><div class="stat"><div class="ico">${ic('calendar')}</div><b>${O.DB.bookings.length}</b><span>Bookings</span></div></div>
    <div class="grid2"><div class="card"><div class="row between" style="margin-bottom:10px"><h3>Landlords to verify</h3><a class="link small" href="#/verifications">All</a></div>${pv.length ? `<div class="list">${pv.slice(0, 5).map(v => `<div class="item" style="padding:12px"><div class="grow"><h4>${esc(v.landlordName)}</h4><div class="small muted">Submitted ${O.ago(v.submittedAt)}</div></div><button class="btn sm" data-act="reviewV" data-id="${v.id}">Review</button></div>`).join('')}</div>` : '<p class="muted small">Nothing waiting. Great work.</p>'}</div>
    <div class="card"><div class="row between" style="margin-bottom:10px"><h3>Listings to approve</h3><a class="link small" href="#/listings">All</a></div>${pl.length ? `<div class="list">${pl.slice(0, 5).map(p => `<div class="item" style="padding:12px"><div class="grow"><h4>${esc(p.title)}</h4><div class="small muted">${esc(p.landlordName)} · ${O.ago(p.created)}</div></div><button class="btn sm" data-act="reviewP" data-id="${p.id}">Review</button></div>`).join('')}</div>` : '<p class="muted small">No listings waiting.</p>'}</div></div></div>`;
  };

  /* ---------- VERIFICATIONS ---------- */
  R.verifications = () => {
    const tab = O.S.a_v || 'pending', all = [...O.DB.verifications].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)), c = s => all.filter(v => v.status === s).length;
    const list = tab === 'all' ? all : all.filter(v => v.status === tab);
    return `${O.pageHead('Landlord <span style="color:var(--gold)">verification</span>', 'Check identity, ownership and safety documents')}
    ${tabs('v', [['pending', 'Waiting', c('pending')], ['approved', 'Approved', c('approved')], ['rejected', 'Changes needed', c('rejected')], ['all', 'All', all.length]], tab)}
    ${list.length ? `<div class="list">${list.map(v => `<div class="item"><div class="avatar">${esc(O.initials({ name: v.landlordName }))}</div><div class="grow"><div class="row between wrap"><h4>${esc(v.landlordName)}</h4>${O.badge('verif', v.status)}</div><div class="small muted">${esc(v.landlordEmail || '')} · ${esc(v.landlordPhone || '')}</div><div class="small muted">Submitted ${O.ago(v.submittedAt)}</div><div class="actions"><button class="btn sm ${v.status === 'pending' ? '' : 'soft'}" data-act="reviewV" data-id="${v.id}">${v.status === 'pending' ? 'Review documents' : 'View'}</button></div></div></div>`).join('')}</div>` : O.empty('shield-check', 'Nothing here', 'Submissions will appear in this list.')}`;
  };
  O.acts.reviewV = async el => {
    const v = O.DB.verifications.find(x => x.id === el.dataset.id); if (!v) return;
    const m = O.modal({
      title: 'Review: ' + esc(v.landlordName), wide: true, body: `<div class="stack">
      <div class="row wrap">${O.badge('verif', v.status)}<span class="small muted">Submitted ${O.fdt(v.submittedAt)}</span></div>
      <div class="card flat">${O.kv([['Legal name', v.legalName], ['ID', `${v.idType}: ${v.idNumber}`], ['Date of birth', v.dob ? `${O.fdate(v.dob)} (age ${age(v.dob)})` : ''], ['Home address', v.address], ['Relationship', v.relationship], ['Property', v.propertyAddress], ['Account email', v.landlordEmail], ['Account phone', v.landlordPhone], ['Emergency contact', v.emergency ? `${v.emergency.name} (${v.emergency.relation}) · ${v.emergency.phone}` : ''], ['Reference', v.reference ? `${v.reference.name} · ${v.reference.phone}` : ''], ['Declarations', v.declarations ? 'All three accepted ' + O.fdate(v.declarations.at) : '']])}</div>
      <div><h4 style="margin-bottom:8px">Documents</h4><div class="grid2" id="vfiles"><div class="skel" style="height:140px"></div><div class="skel" style="height:140px"></div></div></div>
      <div class="notice">${ic('info')}<span class="small">Check that the name and photo match across ID, selfie and ownership document, the ID is valid, and the police clearance is recent. Compare the ID number with the form.</span></div>
      ${v.reviewNote ? `<div class="notice ${v.status === 'rejected' ? 'bad' : ''}"><span class="small"><b>Previous note:</b> ${esc(v.reviewNote)}</span></div>` : ''}
      <div class="field"><label for="vnote">Note to landlord <span class="opt">Required if requesting changes</span></label><textarea id="vnote" rows="2" placeholder="e.g. The selfie is blurry. Please upload a clearer photo."></textarea></div></div>`,
      foot: `<button class="btn danger ghost" data-act="vDecide" data-id="${v.id}" data-d="rejected">Request changes</button><button class="btn ok" data-act="vDecide" data-id="${v.id}" data-d="approved">${ic('shield-check', 'sm')}Approve landlord</button>`
    });
    const files = await O.getVfiles(v.landlordId), box = $('#vfiles', m); if (!box) return;
    box.innerHTML = files.length ? files.map(f => `<figure style="margin:0"><img class="docimg" style="margin:0;cursor:zoom-in" src="${f.data}" alt="${esc(DOCN[f.kind] || f.kind)}" data-act="zoom"><figcaption class="small" style="margin-top:4px"><b>${esc(DOCN[f.kind] || f.kind)}</b></figcaption></figure>`).join('') : `<div class="notice warn" style="grid-column:1/-1">${ic('alert')}<span>No document files found for this landlord.</span></div>`;
  };
  O.acts.zoom = el => O.modal({ title: 'Document', wide: true, body: `<img src="${el.src}" alt="" style="width:100%;border-radius:12px">`, cls: 'zoomed' });
  O.acts.vDecide = async (el) => {
    const v = O.DB.verifications.find(x => x.id === el.dataset.id), d = el.dataset.d, note = ($('#vnote') || {}).value || '';
    if (!v) return;
    if (d === 'rejected' && note.trim().length < 8) { O.toast('Please explain what needs to change (at least a few words).', 'error'); const n = $('#vnote'); if (n) n.focus(); return; }
    if (d === 'approved' && !await O.confirm({ title: 'Approve this landlord?', body: 'They will be able to publish listings, and a Verified badge will appear on their approved rooms.', ok: 'Approve' })) return;
    await O.busy(el, async () => {
      await O.save('verifications', { ...v, status: d, reviewNote: note.trim(), reviewedAt: O.iso(), reviewedBy: O.S.me.email || O.S.me.id });
      if (d === 'approved') for (const p of O.DB.properties.filter(x => x.landlordId === v.landlordId)) await O.save('properties', { ...p, landlordVerified: true });
      O.notifyL(v.landlordId, d === 'approved' ? 'You are verified' : 'Verification needs changes', d === 'approved' ? 'Your identity and documents were approved. You can now add listings.' : `Please update your verification: ${note.trim()}`, '#/verify', d === 'approved' ? 'success' : 'error');
      O.closeModal(true); O.toast(d === 'approved' ? 'Landlord approved.' : 'Sent back for changes.', 'success');
    });
  };

  /* ---------- LISTINGS ---------- */
  R.listings = () => {
    const tab = O.S.a_l || 'pending', all = [...O.DB.properties].sort((a, b) => new Date(b.created) - new Date(a.created));
    const f = { pending: p => !p.approved && !p.rejected, live: p => p.approved, rejected: p => p.rejected, all: () => true };
    const list = all.filter(f[tab]);
    return `${O.pageHead('Listings', 'Approve, reject or remove properties')}${tabs('l', [['pending', 'Waiting', all.filter(f.pending).length], ['live', 'Live', all.filter(f.live).length], ['rejected', 'Rejected', all.filter(f.rejected).length], ['all', 'All', all.length]], tab)}
    ${list.length ? `<div class="list">${list.map(p => `<div class="item"><div class="thumb">${O.photo(p)}</div><div class="grow"><div class="row between wrap"><h4>${esc(p.title)}</h4>${O.badge('prop', O.propState(p))}</div><div class="small muted">${esc(p.area)} · ${O.money(p.price)}/mo · by ${esc(p.landlordName)} ${p.landlordVerified ? '· verified landlord' : '· landlord not verified'}</div><div class="actions"><button class="btn sm ${p.approved ? 'soft' : ''}" data-act="reviewP" data-id="${p.id}">${p.approved ? 'View' : 'Review'}</button><button class="btn danger ghost sm" data-act="removeP" data-id="${p.id}">${ic('trash', 'sm')}Remove</button></div></div></div>`).join('')}</div>` : O.empty('building', 'No listings here')}`;
  };
  O.acts.reviewP = el => {
    const p = O.DB.properties.find(x => x.id === el.dataset.id); if (!p) return; const v = O.verifOf(p.landlordId);
    O.modal({
      title: 'Review listing', wide: true, body: `<div class="stack"><div class="row wrap">${O.badge('prop', O.propState(p))}${O.badge('verif', v ? v.status : 'none')}</div>
      <div class="gallery multi">${(p.photos || []).length ? p.photos.map(s => `<div><img src="${s}" alt=""></div>`).join('') : `<div>${O.ph(p.id)}</div>`}</div>
      <h3 style="font-size:20px">${esc(p.title)}</h3><div class="card flat">${O.kv([['Landlord', `${p.landlordName}${p.landlordBiz ? ' (' + p.landlordBiz + ')' : ''}`], ['Area', p.area], ['Rent', O.money(p.price) + '/month'], ['Deposit', p.deposit ? O.money(p.deposit) : '—'], ['Room', `${p.roomType} · ${p.genderPref} · ${p.bedrooms} bed · ${p.capacity} student(s)`], ['Amenities', (p.amenities || []).join(', ')], ['Description', p.description], ['House rules', p.houseRules]])}</div>
      ${v && v.status === 'approved' ? '' : `<div class="notice warn">${ic('alert')}<span class="small">This landlord is <b>not verified</b>. Listings should not be approved until verification is complete.</span></div>`}
      <div class="field"><label for="pnote">Note to landlord <span class="opt">Required if rejecting</span></label><textarea id="pnote" rows="2"></textarea></div></div>`,
      foot: `${p.approved ? '' : `<button class="btn danger ghost" data-act="pDecide" data-id="${p.id}" data-d="reject">Reject</button>`}<button class="btn ${p.approved ? 'danger ghost' : 'ok'}" data-act="pDecide" data-id="${p.id}" data-d="${p.approved ? 'unpublish' : 'approve'}">${p.approved ? 'Unpublish' : 'Approve &amp; publish'}</button>`
    });
  };
  O.acts.pDecide = async el => {
    const p = O.DB.properties.find(x => x.id === el.dataset.id), d = el.dataset.d, note = ($('#pnote') || {}).value || ''; if (!p) return;
    if ((d === 'reject' || d === 'unpublish') && note.trim().length < 5) { O.toast('Add a short note for the landlord.', 'error'); return; }
    await O.busy(el, async () => {
      const verified = O.verifStatus(p.landlordId) === 'approved';
      const patch = d === 'approve' ? { approved: true, rejected: false, rejectNote: '', landlordVerified: verified } : { approved: false, rejected: true, rejectNote: note.trim() };
      await O.save('properties', { ...p, ...patch });
      O.notifyL(p.landlordId, d === 'approve' ? 'Listing approved' : 'Listing not approved', d === 'approve' ? `“${p.title}” is now live for students.` : `“${p.title}”: ${note.trim()}`, '#/properties', d === 'approve' ? 'success' : 'error');
      O.closeModal(true); O.toast(d === 'approve' ? 'Listing published.' : 'Listing updated.', 'success');
    });
  };
  O.acts.removeP = async el => { if (!await O.confirm({ title: 'Remove this listing?', body: 'It will be permanently deleted.', ok: 'Remove', danger: true })) return; await O.del('properties', el.dataset.id); O.toast('Listing removed.', 'success'); };

  /* ---------- REPORTS ---------- */
  R.reports = () => {
    const tab = O.S.a_r || 'open', all = [...O.DB.reports].sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || new Date(b.date) - new Date(a.date));
    const list = tab === 'open' ? all.filter(r => r.status !== 'resolved') : all.filter(r => r.status === 'resolved');
    return `${O.pageHead('Safety <span style="color:var(--gold)">reports</span>', 'Concerns raised by students and landlords')}${tabs('r', [['open', 'Open', all.filter(r => r.status !== 'resolved').length], ['resolved', 'Resolved', all.filter(r => r.status === 'resolved').length]], tab)}
    ${list.length ? `<div class="list">${list.map(r => `<div class="item" style="flex-direction:column"><div class="row between wrap" style="width:100%"><h4>${r.urgent ? `<span class="badge bad">${ic('alert')}Child safety</span> ` : ''}${esc(r.reason)}</h4>${O.badge('report', r.status === 'resolved' ? 'resolved' : 'open')}</div>
      <p class="small">${esc(r.details)}</p><div class="small muted">About <b>${esc(r.targetTitle)}</b> (${esc(r.targetType)}) · by ${esc(r.reporterName || 'user')} · ${O.fdt(r.date)}</div>${r.resolution ? `<div class="small"><b>Resolution:</b> ${esc(r.resolution)}</div>` : ''}
      <div class="actions">${r.targetType === 'property' && O.DB.properties.some(p => p.id === r.targetId) ? `<button class="btn soft sm" data-act="reviewP" data-id="${r.targetId}">View listing</button>` : ''}${r.targetType === 'user' && prof(r.targetId) ? `<button class="btn soft sm" data-act="suspend" data-id="${r.targetId}">${prof(r.targetId).suspended ? 'Unsuspend user' : 'Suspend user'}</button>` : ''}${r.status !== 'resolved' ? `<button class="btn ok sm" data-act="resolveR" data-id="${r.id}">${ic('check', 'sm')}Mark resolved</button>` : ''}</div></div>`).join('')}</div>` : O.empty('flag', 'No reports', 'Reports from users will appear here.')}`;
  };
  O.acts.resolveR = el => {
    const r = O.DB.reports.find(x => x.id === el.dataset.id); if (!r) return;
    O.modal({ title: 'Resolve report', body: `<form id="resForm" class="stack" data-form="resolveR" data-id="${r.id}">${O.fld({ id: 'note', label: 'What action was taken?', rows: 3, ph: 'e.g. Landlord warned; listing removed; escalated to the University and police.' })}</form>`, foot: `<button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn ok" type="submit" form="resForm">Mark resolved</button>` });
  };
  O.forms.resolveR = async (f, btn) => {
    const r = O.DB.reports.find(x => x.id === f.dataset.id), note = (new FormData(f).get('note') || '').toString().trim(); if (!r) return;
    if (note.length < 5) return O.formErr(f, 'note', 'Please describe the action taken.');
    await O.busy(btn, async () => { await O.save('reports', { ...r, status: 'resolved', resolution: note, resolvedAt: O.iso() }); if (r.reporterId) O.notifyL(r.reporterId, 'Your report was reviewed', 'Thank you. The Admin Office has reviewed and resolved your report.', ''); O.closeModal(); O.toast('Report resolved.', 'success'); });
  };

  /* ---------- USERS ---------- */
  R.users = () => {
    const q = (O.S.a_uq || '').toLowerCase(), role = O.S.a_ur || '';
    let list = O.DB.profiles.filter(p => p.role !== 'admin');
    if (role) list = list.filter(p => p.role === role);
    if (q) list = list.filter(p => (O.fullName(p) + ' ' + (p.email || '') + ' ' + (p.regNumber || '') + ' ' + (p.phone || '')).toLowerCase().includes(q));
    list.sort((a, b) => new Date(b.joined) - new Date(a.joined));
    return `${O.pageHead('Users', `${list.length} account${list.length === 1 ? '' : 's'}`)}
    <div class="searchbar" style="margin-bottom:14px"><div class="inp">${ic('search')}<input type="search" id="uq" placeholder="Search name, email, student ID or phone…" value="${esc(O.S.a_uq || '')}" data-ufilter="q"></div><select class="btn ghost" style="min-height:48px" data-ufilter="role" aria-label="Role"><option value="">All roles</option><option value="student" ${role === 'student' ? 'selected' : ''}>Students</option><option value="landlord" ${role === 'landlord' ? 'selected' : ''}>Landlords</option></select></div>
    ${list.length ? `<div class="tblwrap"><table class="tbl"><thead><tr><th>Name</th><th>Role</th><th>Contact</th><th>Joined</th><th>Status</th><th></th></tr></thead><tbody>${list.map(p => `<tr><td><b>${esc(O.fullName(p))}</b>${p.regNumber ? `<div class="tiny muted">${esc(p.regNumber)}</div>` : ''}</td><td style="text-transform:capitalize">${esc(p.role)}${p.role === 'landlord' ? ' ' + O.badge('verif', O.verifStatus(p.id)) : ''}</td><td class="small">${esc(p.email || '')}<div class="muted">${esc(p.phone || '')}</div></td><td class="small">${O.fdate(p.joined)}</td><td>${p.suspended ? '<span class="badge bad">Suspended</span>' : '<span class="badge ok">Active</span>'}</td><td><button class="btn sm ghost" data-act="suspend" data-id="${p.id}">${p.suspended ? 'Unsuspend' : 'Suspend'}</button></td></tr>`).join('')}</tbody></table></div>` : O.empty('users', 'No users found')}`;
  };
  document.addEventListener('input', e => { const t = e.target; if (t.dataset && t.dataset.ufilter === 'q') { O.S.a_uq = t.value; clearTimeout(O._ut); O._ut = setTimeout(() => { const pos = t.selectionStart; O.rerender(); const n = $('#uq'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }, 200); } });
  document.addEventListener('change', e => { const t = e.target; if (t.dataset && t.dataset.ufilter === 'role') { O.S.a_ur = t.value; O.rerender(); } });
  O.acts.suspend = async el => {
    const p = prof(el.dataset.id); if (!p) return; const to = !p.suspended;
    if (!await O.confirm({ title: (to ? 'Suspend ' : 'Restore ') + O.fullName(p) + '?', body: to ? 'They will be signed out of Offrez features and their listings stay hidden until restored.' : 'They will regain access.', ok: to ? 'Suspend' : 'Restore', danger: to })) return;
    await O.save('profiles', { id: p.id, suspended: to });
    if (to && p.role === 'landlord') for (const x of O.DB.properties.filter(y => y.landlordId === p.id && y.approved)) await O.save('properties', { ...x, approved: false, rejected: true, rejectNote: 'Account suspended pending review.' });
    O.toast(to ? 'User suspended.' : 'User restored.', 'success');
  };

  /* ---------- BOOKINGS ---------- */
  R.bookings = () => {
    const list = [...O.DB.bookings].sort((a, b) => new Date(b.created) - new Date(a.created));
    return `${O.pageHead('All bookings', 'Platform-wide activity')}${list.length ? `<div class="tblwrap"><table class="tbl"><thead><tr><th>Property</th><th>Student</th><th>Landlord</th><th>Move-in</th><th>Rent</th><th>Status</th></tr></thead><tbody>${list.map(b => `<tr><td><b>${esc(b.propertyTitle)}</b></td><td>${esc(b.studentName)}</td><td>${esc(b.landlordName)}</td><td class="small">${O.fdate(b.movein)}</td><td>${O.money(b.price)}</td><td>${O.badge('booking', b.status)}</td></tr>`).join('')}</tbody></table></div>` : O.empty('calendar', 'No bookings yet')}`;
  };
})(window.O);
