/* Offrez — Terms & Conditions, Privacy Policy, Child Safety & Code of Conduct.
   NOTE: These are a solid starting framework written for a student-housing marketplace in Zimbabwe.
   Have a qualified Zimbabwean legal practitioner review them before public launch. */
'use strict';
window.O = window.O || {};
(function (O) {
  const EFFECTIVE = '11 November 2026';
  const VERSION = '1.0';

  const terms = `
<p class="legal-meta">Effective ${EFFECTIVE} · Version ${VERSION}</p>
<h4>1. About Offrez</h4>
<p>Offrez is an online platform that helps students of Bindura University of Science Education (“BUSE”) find off-campus accommodation in Bindura and Kadoma, and helps landlords reach those students. Offrez is a <strong>marketplace and introduction service</strong>. Unless we say otherwise in writing, Offrez is not the landlord, the agent, or a party to any tenancy agreement made between a student and a landlord.</p>

<h4>2. Who may use Offrez</h4>
<ul>
<li><strong>Landlords</strong> must be 18 or older and must complete identity and safety verification (see Section 5) before any listing is made visible to students.</li>
<li><strong>Students</strong> must be enrolled at, or admitted to, BUSE. If you are under 18, you may use Offrez only with the knowledge and consent of a parent or legal guardian, and any tenancy must be agreed with that guardian’s involvement.</li>
<li>You must provide accurate information, keep your password private, and verify your email address. You are responsible for all activity on your account.</li>
<li>One person, one account. A Student Registration Number may be linked to only one Offrez account.</li>
</ul>

<h4>3. Listings</h4>
<ul>
<li>Landlords must ensure every listing is truthful: the real address area, price, room type, gender preference, amenities and photographs of the actual property.</li>
<li>Listings are reviewed by the Offrez Admin Office but a “Verified” badge is <strong>not a guarantee</strong> of quality, safety or legality. It means the landlord completed our document checks at the time of review.</li>
<li>We may refuse, hide or remove any listing, and suspend any account, that we reasonably believe is misleading, unsafe, discriminatory (other than lawful gender-specific accommodation), or in breach of these Terms.</li>
</ul>

<h4>4. Bookings, deposits and payments</h4>
<ul>
<li>A booking request is a request only. It becomes a tenancy only when the landlord approves it and the student pays the deposit the landlord has requested.</li>
<li><strong>Offrez does not collect, hold or process rent or deposits.</strong> Students pay the landlord directly (for example by EcoCash, OneMoney or bank transfer) and record the payment reference in the app. The landlord then confirms receipt.</li>
<li>Students should <strong>view the room in person (or through a trusted person) before paying</strong>, pay only the amount shown in the booking, and keep proof of payment. Landlords must give a receipt.</li>
<li>Refunds, notice periods and house rules are matters between landlord and student. We encourage a short written tenancy agreement for every booking.</li>
</ul>

<h4>5. Landlord verification</h4>
<ul>
<li>To protect students — including young students — every landlord must submit: a national ID (front and back), a live selfie holding the ID, proof of ownership or authority to let the property, a police clearance certificate, emergency and reference contacts, and signed safety declarations.</li>
<li>Documents are used only to verify identity and suitability, are visible only to authorised Offrez administrators, and are handled under our Privacy Policy.</li>
<li>Providing a forged, altered or someone else’s document is a serious breach. We may permanently ban the account, and report the matter to the Zimbabwe Republic Police and the University.</li>
<li>Approval may be withdrawn at any time, for example after a credible safety report or if documents expire or are found to be false.</li>
<li>Landlords agree to cooperate with reasonable safety checks or inspections requested by the Admin Office or the University.</li>
</ul>

<h4>6. Acceptable use</h4>
<p>You must not: harass, threaten, stalk or discriminate against anyone; ask for or send sexual content or sexual favours in connection with housing; request payment “outside the agreement” or under pressure; impersonate others; post false reviews; scrape or misuse other users’ data; upload malware; or use Offrez for anything unlawful.</p>

<h4>7. Reviews and messages</h4>
<p>Only students with a confirmed booking for a property may review it. Reviews must be honest and fair. Messages sent through Offrez may be reviewed by administrators <em>only</em> when a report has been made or where required by law, to keep users safe.</p>

<h4>8. Reporting and enforcement</h4>
<p>Anyone can report a listing, landlord or student using the Report button. We may investigate, remove content, suspend accounts, and share relevant information with the University or the police where there is a risk to a person’s safety or a suspected offence.</p>

<h4>9. Safety is your responsibility too</h4>
<p>Offrez cannot inspect every property or supervise every interaction. Please follow the Safety Centre guidance: visit in daylight with a friend, tell someone where you are going, never pay before viewing, and never share OTPs or PINs.</p>

<h4>10. Disclaimers and liability</h4>
<p>Offrez is provided “as is” and “as available”. To the fullest extent permitted by law, Offrez, BUSE and the platform’s operators are not liable for the acts or omissions of landlords or students, for the condition of any property, for losses arising from payments made outside the app, or for service interruptions. Nothing in these Terms excludes liability that cannot lawfully be excluded.</p>

<h4>11. Intellectual property</h4>
<p>The Offrez name and app belong to their owners. The Bindura University of Science Education name and crest belong to the University. You keep ownership of the content you upload, and give Offrez a licence to display it on the platform for the purpose of operating the service.</p>

<h4>12. Changes, suspension and ending your account</h4>
<p>We may update these Terms; if the changes are material we will ask you to accept the new version. You may stop using Offrez at any time and may request account deletion (see the Privacy Policy). We may suspend or end accounts that breach these Terms.</p>

<h4>13. Governing law</h4>
<p>These Terms are governed by the laws of Zimbabwe, and disputes will be handled by the competent courts of Zimbabwe, after good-faith attempts to resolve the matter informally.</p>

<h4>14. Contact</h4>
<p>Questions or complaints: ${O.CFG && O.CFG.SUPPORT_EMAIL ? O.CFG.SUPPORT_EMAIL : 'the Offrez Admin Office'}.</p>`;

  const privacy = `
<p class="legal-meta">Effective ${EFFECTIVE} · Version ${VERSION}</p>
<p>This policy explains what personal information Offrez collects, why, who can see it, and the choices you have. We aim to follow the data-protection principles of Zimbabwe’s Cyber and Data Protection Act and other applicable law: lawfulness, purpose limitation, data minimisation, accuracy, security and accountability.</p>

<h4>1. Information we collect</h4>
<ul>
<li><strong>Account details:</strong> name, email, phone number, gender (students), faculty/programme, Student Registration Number (students), business name (landlords), password (handled securely by our authentication provider — we never see it in readable form).</li>
<li><strong>Landlord verification data:</strong> National ID number, ID photographs, selfie, proof of ownership/authority, police clearance certificate, address, emergency and reference contacts, safety declarations.</li>
<li><strong>Activity:</strong> listings, photos, favourites, booking requests, messages, reviews, payment references you record (not card numbers — we do not take card payments), reports, and notifications.</li>
<li><strong>Technical data:</strong> basic device/browser information and logs needed to keep the service secure and working. Offrez stores some data on your device so the installed app can work with a weak connection.</li>
</ul>

<h4>2. Why we use it</h4>
<ul>
<li>To create and secure your account and verify your email.</li>
<li>To connect students and landlords and to run bookings and messages.</li>
<li>To verify landlords and keep students — especially young students — safe.</li>
<li>To investigate reports, prevent fraud and enforce our Terms.</li>
<li>To send service notifications (for example “your booking was approved”).</li>
</ul>

<h4>3. Who can see what</h4>
<ul>
<li><strong>Everyone signed in:</strong> approved listings, their photos, the landlord’s display name/business and verified badge, and reviews.</li>
<li><strong>The other party in a booking or chat:</strong> the details needed to complete it (e.g. a student’s name and phone number after the landlord approves; the landlord’s payment instructions after approval).</li>
<li><strong>Offrez administrators:</strong> account data, listings, reports and — only for verification and safety — landlord documents. Admin access is restricted to authorised staff.</li>
<li><strong>Not shared publicly:</strong> your email, National ID, verification documents, Student Registration Number and password.</li>
<li>We do not sell personal data. We may disclose information to the University or the police where required by law or to protect someone from harm.</li>
</ul>

<h4>4. Service providers</h4>
<p>Offrez uses Google Firebase (Authentication and Cloud Firestore) to sign you in and store data. Data may therefore be processed on servers outside Zimbabwe, under that provider’s security commitments.</p>

<h4>5. How long we keep data</h4>
<ul>
<li>Account data: for as long as your account is active.</li>
<li>Verification documents: while you are an active landlord and for a limited period afterwards (up to 24 months) to resolve disputes or safety investigations, then deleted.</li>
<li>Messages and bookings: kept for as long as needed for the tenancy and any dispute (generally up to 24 months).</li>
<li>Reports: kept as long as necessary to protect users and comply with law.</li>
</ul>

<h4>6. Security</h4>
<p>We use encrypted connections, access controls and email verification. No system is perfectly secure — please use a strong, unique password and never share your login or OTPs.</p>

<h4>7. Children and young students</h4>
<p>Offrez is intended for university students. If you are under 18 you should use Offrez with a parent or guardian’s knowledge. We apply extra safeguards (landlord verification, reporting, safety guidance) and will act quickly on any concern involving a minor. If you believe a child’s data has been collected improperly, contact us and we will review and, where appropriate, delete it.</p>

<h4>8. Your rights</h4>
<p>Subject to law, you may ask to access, correct, port or delete your personal information, or to object to certain processing. You can edit most details in <em>Profile</em>. For other requests, or to withdraw consent, contact us. We may need to retain some information where the law or an open safety investigation requires it.</p>

<h4>9. Cookies and local storage</h4>
<p>We use local storage and similar technologies to keep you signed in, remember your theme, and let the app work offline. We do not use advertising cookies.</p>

<h4>10. Changes and contact</h4>
<p>If we change this policy in a material way we will tell you in the app. Contact: ${O.CFG && O.CFG.SUPPORT_EMAIL ? O.CFG.SUPPORT_EMAIL : 'the Offrez Admin Office'}.</p>`;

  const safety = `
<p class="legal-meta">Effective ${EFFECTIVE} · Version ${VERSION}</p>
<p>Offrez exists to help students — some of whom are very young adults, or may be under 18 — live safely. This policy applies to every landlord, caretaker and anyone who manages a listed property.</p>

<h4>Our commitments</h4>
<ul>
<li>No listing goes live until the landlord’s identity, authority to let, and police clearance have been checked.</li>
<li>Every report is taken seriously and handled promptly. Reports involving a child or sexual misconduct are escalated to the University and the Zimbabwe Republic Police.</li>
<li>Landlords found to be unsafe are removed permanently.</li>
</ul>

<h4>Landlord Code of Conduct</h4>
<ul>
<li><strong>Respect privacy and dignity.</strong> Never enter a student’s room without reasonable notice, except in a genuine emergency. Never watch, photograph or record students in private spaces.</li>
<li><strong>Zero tolerance for abuse.</strong> No sexual contact, advances, favours-for-rent, grooming, coercion, threats or harassment of any kind. No alcohol or drugs offered to students.</li>
<li><strong>Safe premises.</strong> Working door and window locks, safe wiring, clear exits, clean water and sanitation, reasonable lighting around the entrance.</li>
<li><strong>Fair dealing.</strong> Charge only the agreed rent and deposit, give written receipts, and never demand payment “to keep the room” before a viewing or approval.</li>
<li><strong>Visitors and residents.</strong> Nobody with a conviction for an offence against a child or any sexual offence may live at, or be given access to, the property.</li>
<li><strong>Cooperation.</strong> Allow reasonable inspections by the Admin Office or University, and cooperate fully with any investigation.</li>
</ul>

<h4>Student guidance</h4>
<ul>
<li>Always view a room before paying, and take a friend or tell someone where you are going. Visit in daylight.</li>
<li>Do not pay by sending money to unknown numbers; match the payment details to the approved booking.</li>
<li>If anything feels unsafe — pressure, inappropriate comments, unwanted touching, secret cameras — leave, tell a trusted adult, and use <em>Report</em> in the app.</li>
</ul>

<h4>How to report</h4>
<p>Use the <strong>Report</strong> button on any listing or chat. In an emergency or if someone is in danger, contact local emergency services first. For child-protection concerns you can also contact the Zimbabwe Republic Police Victim Friendly Unit or Childline Zimbabwe, and your University Student Affairs office.</p>`;

  O.legal = { terms, privacy, safety, VERSION, EFFECTIVE };
})(window.O);
