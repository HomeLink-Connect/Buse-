/* Loads Firebase (modular SDK) without blocking the app. If it cannot be reached the app says so. */
const firebaseConfig = {
  apiKey: 'AIzaSyC-5jORGiQdm1nAew2Cz7L4j55flqb0rhM',
  authDomain: 'buse-offrez.firebaseapp.com',
  projectId: 'buse-offrez',
  storageBucket: 'buse-offrez.firebasestorage.app',
  messagingSenderId: '937985120960',
  appId: '1:937985120960:web:38c1ee47e0d56e1f606b25'
};
const V = '12.1.0', BASE = `https://www.gstatic.com/firebasejs/${V}/`;
const timeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);

(async () => {
  if (/[?&]local\b/.test(location.search)) { window.O.fbReady(false, new Error('local mode requested')); return; }
  try {
    const [appM, A, F] = await timeout(Promise.all([
      import(BASE + 'firebase-app.js'), import(BASE + 'firebase-auth.js'), import(BASE + 'firebase-firestore.js')
    ]), 20000);
    const app = appM.initializeApp(firebaseConfig);
    let db;
    try {
      db = F.initializeFirestore(app, {
        localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }),
        experimentalAutoDetectLongPolling: true // works on restrictive school / mobile-data networks
      });
    } catch (e) {
      db = F.initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
    }
    const auth = A.getAuth(app);
    window.FB = { app, A, F, db, auth };
    window.O.fbReady(true);
  } catch (e) {
    console.error('Firebase failed to load', e);
    window.O.fbReady(false, e);
  }
})();
