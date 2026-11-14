// app-config.js - Konfigurasi Firebase, ImageKit & Turnamen Client
window.MPL_CONFIG = {
  // Masukkan URL Firebase Realtime Database Anda di sini atau lewat UI Settings
  firebaseDbUrl: localStorage.getItem('mpl_firebase_url') || 'https://mpl-tournament-default-rtdb.firebaseio.com',
  imagekitEndpoint: localStorage.getItem('mpl_ik_endpoint') || 'https://ik.imagekit.io/tournament',
  imagekitPublicKey: localStorage.getItem('mpl_ik_public') || '',
  imagekitPrivateKey: localStorage.getItem('mpl_ik_private') || ''
};

// Helper Format Nama Tim Dua Baris & Auto-Singkat Maks 5 Karakter
window.formatTeamName = function(name, shortName) {
  if (!name) return '';
  name = name.trim();
  if (name.length <= 8) return name.toUpperCase();
  if (shortName && shortName.trim().length > 0 && shortName.trim().length <= 8) {
    return shortName.trim().toUpperCase();
  }
  let s = name.toUpperCase()
    .replace(/SOSIAL/gi, 'SOS')
    .replace(/PENGETAHUAN ALAM/gi, 'IPA')
    .replace(/PENGETAHUAN SOSIAL/gi, 'IPS')
    .replace(/KELAS\s*/gi, '')
    .replace(/SATU/gi, '1')
    .replace(/DUA/gi, '2')
    .replace(/TIGA/gi, '3')
    .replace(/EMPAT/gi, '4')
    .replace(/\s+/g, ' ')
    .trim();
  if (s.length <= 8) return s;
  const compact = s.replace(/\s+/g, '');
  if (compact.length <= 8) return compact;
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const acronym = words.map(w => w[0]).join('').toUpperCase();
    if (acronym.length >= 2 && acronym.length <= 8) return acronym;
  }
  return compact.substring(0, 8);
};

window.generateShortTag = function(name) {
  if (!name) return '';
  name = name.trim();
  let s = name.toUpperCase()
    .replace(/SOSIAL/gi, 'SOS')
    .replace(/PENGETAHUAN ALAM/gi, 'IPA')
    .replace(/PENGETAHUAN SOSIAL/gi, 'IPS')
    .replace(/KELAS\s*/gi, '')
    .replace(/SATU/gi, '1')
    .replace(/DUA/gi, '2')
    .replace(/TIGA/gi, '3')
    .replace(/EMPAT/gi, '4')
    .trim();

  const words = s.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const lastWord = words[words.length - 1];
    if (/^\d+$/.test(lastWord)) {
      const prefixWords = words.slice(0, words.length - 1);
      const combined = prefixWords.join('') + lastWord;
      if (combined.length <= 5) return combined;
      const firstLetters = prefixWords.map(w => w[0]).join('') + lastWord;
      if (firstLetters.length <= 5 && firstLetters.length >= 2) return firstLetters;
      const cons = prefixWords[0].replace(/[AEIOU]/g, '') + lastWord;
      if (cons.length <= 5) return cons;
      return combined.slice(0, 5);
    }
    const acronym = words.map(w => w[0]).join('');
    if (acronym.length <= 5 && acronym.length >= 2) return acronym;
  }

  const single = s.replace(/\s+/g, '');
  if (single.length <= 5) return single;

  const firstChar = single[0];
  const restConsonants = single.slice(1).replace(/[AEIOU]/g, '');
  let short = (firstChar + restConsonants);
  if (short.length > 5) short = short.slice(0, 5);
  if (short.length >= 3) return short;
  return single.slice(0, 5);
};

// Helper Firebase Realtime REST
window.firebaseRest = {
  async get(path) {
    const dbUrl = (window.MPL_CONFIG.firebaseDbUrl || '').replace(/\/$/, '');
    try {
      const res = await fetch(`${dbUrl}/${path}.json`);
      return await res.json();
    } catch (e) {
      console.warn('Firebase read error:', e);
      return null;
    }
  },
  async put(path, data) {
    const dbUrl = (window.MPL_CONFIG.firebaseDbUrl || '').replace(/\/$/, '');
    try {
      const res = await fetch(`${dbUrl}/${path}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (e) {
      console.error('Firebase write error:', e);
      return null;
    }
  }
};
