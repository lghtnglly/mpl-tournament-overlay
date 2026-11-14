/**
 * nameFormatter.js
 * Logika pemformatan teks nama tim khusus OBS Overlay & Singkatan Tag Tim
 */

/**
 * Generate singkatan / tag tim maksimal 5 karakter secara otomatis
 * Contoh: "VORTONE" -> "VRTN"
 * Contoh: "RPL 1" -> "RPL1"
 * Contoh: "XII RPL 1" -> "XR1"
 * Contoh: "Alter Ego" -> "AE"
 */
function generateShortTag(name) {
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
    // Jika kata terakhir berupa angka (misal "RPL 1", "MIPA 2")
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

    // Jika kata majemuk biasa, misal "Alter Ego" -> "AE"
    const acronym = words.map(w => w[0]).join('');
    if (acronym.length <= 5 && acronym.length >= 2) return acronym;
  }

  // Jika satu kata tunggal, misal "VORTONE"
  const single = s.replace(/\s+/g, '');
  if (single.length <= 5) return single;

  // Aturan konsonan: Ambil karakter pertama + konsonan berikutnya
  const firstChar = single[0];
  const restConsonants = single.slice(1).replace(/[AEIOU]/g, '');
  let short = (firstChar + restConsonants);

  if (short.length > 5) short = short.slice(0, 5);
  if (short.length >= 3) return short;

  return single.slice(0, 5);
}

function formatTeamName(name, shortName) {
  if (!name) return '';
  name = name.trim();

  // Aturan 1: Jika <= 8 karakter, tampilkan secara utuh dalam huruf kapital
  if (name.length <= 8) {
    return name.toUpperCase();
  }

  // Jika admin sudah mengisi shortName khusus yang panjangnya <= 8 karakter
  if (shortName && shortName.trim().length > 0 && shortName.trim().length <= 8) {
    return shortName.trim().toUpperCase();
  }

  let s = name.toUpperCase();

  // Penggantian istilah umum sekolah/kelas agar lebih padat & akurat
  s = s.replace(/SOSIAL/gi, 'SOS')
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

  // Jika spasi dihilangkan menjadi <= 8 karakter (contoh: "XII MIPA 1" -> "XIIMIPA1")
  const compact = s.replace(/\s+/g, '');
  if (compact.length <= 8) return compact;

  // Coba ambil akronim kata jika terdiri dari multi kata
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const acronym = words.map(w => w[0]).join('').toUpperCase();
    if (acronym.length >= 2 && acronym.length <= 8) {
      return acronym;
    }
  }

  // Fallback terakhir: potong 8 karakter pertama
  return compact.substring(0, 8);
}

module.exports = {
  formatTeamName,
  generateShortTag
};
