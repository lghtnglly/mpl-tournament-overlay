const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { generateBracket, updateMatchResult } = require('./bracketEngine');
const YouTubeService = require('./youtubeService');
const FirebaseService = require('./firebaseService');
const ImageKitService = require('./imagekitService');
const { formatTeamName, generateShortTag } = require('./nameFormatter');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup Paths
const DATA_DIR = path.join(__dirname, '..', 'data');
const TEAMS_FILE = path.join(DATA_DIR, 'teams.json');
const TOURNAMENT_FILE = path.join(DATA_DIR, 'tournament.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads', 'logos');
const THUMBNAILS_DIR = path.join(__dirname, '..', 'public', 'thumbnails');

// Helpers: Read & Write JSON Files
function readJSON(filePath, fallback = {}) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content || '{}');
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return fallback;
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

// Inisialisasi Service YouTube & Firebase
const youtubeService = new YouTubeService(() => readJSON(SETTINGS_FILE, { youtube: {} }));
const firebaseService = new FirebaseService(() => readJSON(SETTINGS_FILE, {}));
const imagekitService = new ImageKitService(() => readJSON(SETTINGS_FILE, {}));

// ==========================================
// REAL-TIME SSE (Server-Sent Events) HUB
// ==========================================
let sseClients = [];

function broadcastMatchUpdate(match, toastWarning = null) {
  const data = JSON.stringify({ type: 'MATCH_UPDATE', match, toastWarning });
  sseClients.forEach(client => {
    client.res.write(`data: ${data}\n\n`);
  });

  // Async sync ke Firebase Cloud jika aktif
  firebaseService.syncMatch(match).catch(err => console.error('[Firebase Sync Error]', err));
}

// Multer Storage Configuration for Logo Uploads (Memory storage with disk fallback)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar yang diperbolehkan!'));
    }
  }
});

// Helper untuk simpan file gambar (prioritas ImageKit, fallback disk lokal)
async function saveUploadedLogo(file) {
  if (!file) return '';

  // Coba upload ke ImageKit jika dikonfigurasi & aktif
  const ikConfig = imagekitService.getConfig();
  if (ikConfig.enabled && ikConfig.privateKey) {
    try {
      const ext = path.extname(file.originalname) || '.png';
      const cleanFileName = `logo-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
      const uploadRes = await imagekitService.upload(file.buffer, cleanFileName);
      if (uploadRes && uploadRes.success && uploadRes.url) {
        console.log('[ImageKit] Logo berhasil diupload ke CDN:', uploadRes.url);
        return uploadRes.url;
      }
    } catch (err) {
      console.error('[ImageKit Error] Gagal upload ke ImageKit, fallback ke disk:', err.message);
    }
  }

  // Fallback ke penyimpanan lokal disk
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  const ext = path.extname(file.originalname) || '.png';
  const uniqueName = 'team-logo-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
  const localPath = path.join(UPLOAD_DIR, uniqueName);
  fs.writeFileSync(localPath, file.buffer);
  return `/uploads/logos/${uniqueName}`;
}

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// Inisialisasi awal tournament state jika belum ada
function getTournamentState() {
  const teams = readJSON(TEAMS_FILE, []);
  let tournament = readJSON(TOURNAMENT_FILE, null);

  if (!tournament || !tournament.rounds || tournament.rounds.length === 0) {
    const bracketData = generateBracket(teams);
    tournament = {
      rounds: bracketData.rounds,
      totalRounds: bracketData.totalRounds,
      playableMatches: bracketData.playableMatches,
      currentMatchId: bracketData.playableMatches[0]?.id || null,
      currentMatchIndex: 0,
      currentMatch: bracketData.playableMatches[0] || null,
      isSwapped: false
    };
    writeJSON(TOURNAMENT_FILE, tournament);
  }
  return tournament;
}

// Inisialisasi settings jika belum ada
function getSettings() {
  const defaultSettings = {
    youtube: {
      liveStreamId: '',
      apiKey: '',
      oauthToken: '',
      titleTemplate: 'MLBB Tournament - Match {MATCH_NO}: {TEAM_LEFT} vs {TEAM_RIGHT}',
      autoSyncOnNextMatch: true,
      broadcastList: []
    }
  };
  const settings = readJSON(SETTINGS_FILE, defaultSettings);
  if (!settings.youtube) settings.youtube = defaultSettings.youtube;
  return settings;
}

// ==========================================
// SSE STREAM ENDPOINT
// ==========================================
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  const tournament = getTournamentState();
  if (tournament.currentMatch) {
    res.write(`data: ${JSON.stringify({ type: 'MATCH_UPDATE', match: tournament.currentMatch })}\n\n`);
  }

  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

// ==========================================
// ADMIN DASHBOARD ROUTES
// ==========================================

// Dashboard Home (Bento Grid: Active Showcase, Match Control, YouTube Control, OBS Links, Bracket)
app.get('/', (req, res) => {
  const teams = readJSON(TEAMS_FILE, []);
  const tournament = getTournamentState();
  const settings = getSettings();
  res.render('dashboard', { teams, tournament, settings });
});

// Team Management Roster Page
app.get('/teams', (req, res) => {
  const teams = readJSON(TEAMS_FILE, []);
  res.render('teams', { teams });
});

// Dedicated Tournament Bracket Page
app.get('/bracket', (req, res) => {
  const teams = readJSON(TEAMS_FILE, []);
  const tournament = getTournamentState();
  res.render('bracket', { teams, tournament });
});

// OBS Overlay Links Directory
app.get('/obs-links', (req, res) => {
  const teams = readJSON(TEAMS_FILE, []);
  res.render('obs-links', { teams });
});

// Cloudflare & Firebase Online Integration Page
app.get('/cloud', (req, res) => {
  const teams = readJSON(TEAMS_FILE, []);
  const settings = getSettings();
  res.render('cloud', { teams, settings });
});

// YouTube Sync Settings Page
app.get('/settings-youtube', (req, res) => {
  const teams = readJSON(TEAMS_FILE, []);
  const settings = getSettings();
  res.render('settings-youtube', { teams, settings });
});

// ==========================================
// REST API FOR YOUTUBE LIVE CONTROL
// ==========================================

// Update Pengaturan YouTube & Multi-Stream Switcher
app.post('/api/youtube/settings', (req, res) => {
  const { liveStreamId, apiKey, oauthToken, titleTemplate } = req.body;
  const settings = getSettings();

  if (liveStreamId !== undefined) {
    settings.youtube.liveStreamId = liveStreamId.trim();
    // Simpan ke riwayat broadcastList jika belum ada
    if (liveStreamId && !settings.youtube.broadcastList?.includes(liveStreamId)) {
      if (!settings.youtube.broadcastList) settings.youtube.broadcastList = [];
      settings.youtube.broadcastList.push(liveStreamId.trim());
    }
  }
  if (apiKey !== undefined) settings.youtube.apiKey = apiKey.trim();
  if (oauthToken !== undefined) settings.youtube.oauthToken = oauthToken.trim();
  if (titleTemplate !== undefined) settings.youtube.titleTemplate = titleTemplate.trim();

  writeJSON(SETTINGS_FILE, settings);
  res.json({ success: true, message: 'Pengaturan YouTube tersimpan', settings: settings.youtube });
});

// Trigger Manual Sinkronisasi YouTube untuk Match Sekarang
app.post('/api/youtube/sync', async (req, res) => {
  const tournament = getTournamentState();
  if (!tournament.currentMatch) {
    return res.status(400).json({ success: false, error: 'Tidak ada match aktif' });
  }

  const syncResult = await youtubeService.syncMatchStream(tournament.currentMatch, tournament.isSwapped);
  res.json({ success: true, result: syncResult });
});

// ==========================================
// REST API FOR CLOUD & ONLINE INTEGRATION (FIREBASE & CLOUDFLARE)
// ==========================================

// Simpan Pengaturan Cloud (Firebase, ImageKit & Cloudflare)
app.post('/api/cloud/settings', async (req, res) => {
  const { 
    firebaseEnabled, databaseUrl, authToken, 
    imagekitEnabled, publicKey, privateKey, urlEndpoint,
    publicUrl 
  } = req.body;
  const settings = getSettings();

  if (!settings.firebase) settings.firebase = {};
  if (!settings.imagekit) settings.imagekit = {};
  if (!settings.cloudflare) settings.cloudflare = {};

  // Firebase
  if (firebaseEnabled !== undefined) settings.firebase.enabled = !!firebaseEnabled;
  if (databaseUrl !== undefined) settings.firebase.databaseUrl = databaseUrl.trim();
  if (authToken !== undefined) settings.firebase.authToken = authToken.trim();

  // ImageKit
  if (imagekitEnabled !== undefined) settings.imagekit.enabled = !!imagekitEnabled;
  if (publicKey !== undefined) settings.imagekit.publicKey = publicKey.trim();
  if (privateKey !== undefined) settings.imagekit.privateKey = privateKey.trim();
  if (urlEndpoint !== undefined) settings.imagekit.urlEndpoint = urlEndpoint.trim();

  // Cloudflare
  if (publicUrl !== undefined) {
    settings.cloudflare.publicUrl = publicUrl.trim();
    settings.cloudflare.tunnelStatus = publicUrl.trim() ? 'ONLINE' : 'STANDBY';
  }

  writeJSON(SETTINGS_FILE, settings);

  // Jika firebase aktif, lakukan tes sync sekarang
  let fbTestResult = null;
  if (settings.firebase.enabled && settings.firebase.databaseUrl) {
    const tournament = getTournamentState();
    fbTestResult = await firebaseService.syncMatch(tournament.currentMatch);
  }

  res.json({
    success: true,
    message: 'Pengaturan Cloud & Media tersimpan',
    settings: {
      firebase: settings.firebase,
      imagekit: settings.imagekit,
      cloudflare: settings.cloudflare
    },
    firebaseTest: fbTestResult
  });
});

// Trigger Manual Push All Data ke Firebase
app.post('/api/cloud/firebase/push', async (req, res) => {
  const teams = readJSON(TEAMS_FILE, []);
  const tournament = getTournamentState();

  const syncTeams = await firebaseService.syncTeams(teams);
  const syncTour = await firebaseService.syncTournament(tournament);

  res.json({
    success: true,
    message: 'Data berhasil disinkronkan ke Firebase',
    teamsResult: syncTeams,
    tournamentResult: syncTour
  });
});

// Trigger Manual Pull All Data dari Firebase
app.post('/api/cloud/firebase/pull', async (req, res) => {
  const pullResult = await firebaseService.pullAll();
  if (pullResult && pullResult.success && pullResult.data) {
    if (pullResult.data.teams) {
      writeJSON(TEAMS_FILE, pullResult.data.teams);
    }
    if (pullResult.data.tournament) {
      writeJSON(TOURNAMENT_FILE, pullResult.data.tournament);
    }
    return res.json({ success: true, message: 'Data berhasil diunduh dari Firebase', data: pullResult.data });
  }

  res.status(400).json({ success: false, error: pullResult.error || 'Gagal mengambil data dari Firebase' });
});

// ==========================================
// REST API FOR TOURNAMENT & MATCH CONTROLLER
// ==========================================

app.get('/api/tournament', (req, res) => {
  const tournament = getTournamentState();
  res.json({ success: true, data: tournament });
});

app.get('/api/current-match', (req, res) => {
  const tournament = getTournamentState();
  res.json(tournament.currentMatch || {});
});

// ACTION: Swap Current Teams (Kiri <-> Kanan)
app.post('/api/match/swap', async (req, res) => {
  const tournament = getTournamentState();
  if (!tournament.currentMatch) {
    return res.status(400).json({ success: false, error: 'Tidak ada match aktif' });
  }

  const cur = tournament.currentMatch;
  const tempTeam = cur.teamLeft;
  const tempScore = cur.scoreLeft;

  cur.teamLeft = cur.teamRight;
  cur.scoreLeft = cur.scoreRight;
  cur.teamRight = tempTeam;
  cur.scoreRight = tempScore;

  tournament.isSwapped = !tournament.isSwapped;

  // Sinkronkan ke ronde di bracket
  for (const round of tournament.rounds) {
    const match = round.matches.find(m => m.id === cur.id);
    if (match) {
      match.teamLeft = cur.teamLeft;
      match.teamRight = cur.teamRight;
      match.scoreLeft = cur.scoreLeft;
      match.scoreRight = cur.scoreRight;
      break;
    }
  }

  writeJSON(TOURNAMENT_FILE, tournament);
  
  // Real-time broadcast ke semua OBS overlay
  broadcastMatchUpdate(cur);

  // Auto-sync YouTube Stream (Thumbnail & Title update with swap awareness)
  const ytResult = await youtubeService.syncMatchStream(cur, tournament.isSwapped);

  res.json({ 
    success: true, 
    message: 'Tim berhasil ditukar', 
    match: cur, 
    isSwapped: tournament.isSwapped,
    youtube: ytResult 
  });
});

// ACTION: Win Team (Win Left or Win Right)
app.post('/api/match/win', (req, res) => {
  const { side } = req.body;
  if (!side || (side !== 'left' && side !== 'right')) {
    return res.status(400).json({ success: false, error: 'Parameter side harus left atau right' });
  }

  const tournament = getTournamentState();
  if (!tournament.currentMatch) {
    return res.status(400).json({ success: false, error: 'Tidak ada match aktif' });
  }

  const updatedMatch = updateMatchResult(tournament.rounds, tournament.currentMatch.id, side);
  if (!updatedMatch) {
    return res.status(500).json({ success: false, error: 'Gagal update pemenang match' });
  }

  tournament.currentMatch = updatedMatch;

  const playables = [];
  tournament.rounds.forEach(r => {
    r.matches.forEach(m => {
      if (!m.isBye) playables.push(m);
    });
  });
  tournament.playableMatches = playables;

  writeJSON(TOURNAMENT_FILE, tournament);

  broadcastMatchUpdate(updatedMatch);

  res.json({ success: true, message: `Pemenang match diset ke tim ${side}`, match: updatedMatch, tournament });
});

// ACTION: Next Match (With Auto YouTube Title & Thumbnail Sync)
app.post('/api/match/next', async (req, res) => {
  const tournament = getTournamentState();
  const playables = tournament.playableMatches || [];

  if (playables.length === 0) {
    return res.status(400).json({ success: false, error: 'Tidak ada daftar match' });
  }

  let nextIdx = tournament.currentMatchIndex + 1;
  if (nextIdx >= playables.length) {
    nextIdx = playables.length - 1;
  }

  tournament.currentMatchIndex = nextIdx;
  tournament.currentMatch = playables[nextIdx];
  tournament.currentMatchId = playables[nextIdx].id;
  tournament.isSwapped = false; // Reset posisi swap untuk match baru

  writeJSON(TOURNAMENT_FILE, tournament);

  // Trigger YouTube Auto Title & Thumbnail Sync
  const ytResult = await youtubeService.syncMatchStream(tournament.currentMatch, false);

  // Broadcast ke OBS Overlays & Dashboard
  broadcastMatchUpdate(tournament.currentMatch, ytResult.warning);

  res.json({ 
    success: true, 
    message: 'Berpindah ke match berikutnya', 
    match: tournament.currentMatch, 
    index: nextIdx,
    youtube: ytResult
  });
});

// ACTION: Prev Match
app.post('/api/match/prev', async (req, res) => {
  const tournament = getTournamentState();
  const playables = tournament.playableMatches || [];

  let prevIdx = (tournament.currentMatchIndex || 0) - 1;
  if (prevIdx < 0) prevIdx = 0;

  tournament.currentMatchIndex = prevIdx;
  tournament.currentMatch = playables[prevIdx];
  tournament.currentMatchId = playables[prevIdx]?.id || null;
  tournament.isSwapped = false;

  writeJSON(TOURNAMENT_FILE, tournament);

  const ytResult = await youtubeService.syncMatchStream(tournament.currentMatch, false);
  broadcastMatchUpdate(tournament.currentMatch, ytResult.warning);

  res.json({ 
    success: true, 
    message: 'Berpindah ke match sebelumnya', 
    match: tournament.currentMatch, 
    index: prevIdx,
    youtube: ytResult
  });
});

// ACTION: Set Match by ID
app.post('/api/match/select', async (req, res) => {
  const { matchId } = req.body;
  const tournament = getTournamentState();
  const playables = tournament.playableMatches || [];

  const foundIdx = playables.findIndex(m => m.id === matchId);
  if (foundIdx === -1) {
    return res.status(404).json({ success: false, error: 'Match tidak ditemukan' });
  }

  tournament.currentMatchIndex = foundIdx;
  tournament.currentMatch = playables[foundIdx];
  tournament.currentMatchId = matchId;
  tournament.isSwapped = false;

  writeJSON(TOURNAMENT_FILE, tournament);

  const ytResult = await youtubeService.syncMatchStream(playables[foundIdx], false);
  broadcastMatchUpdate(playables[foundIdx], ytResult.warning);

  res.json({ 
    success: true, 
    message: 'Match aktif berhasil diubah', 
    match: playables[foundIdx], 
    index: foundIdx,
    youtube: ytResult
  });
});

// ACTION: Generate / Reset Bracket Baru
app.post('/api/bracket/generate', (req, res) => {
  const teams = readJSON(TEAMS_FILE, []);
  const bracketData = generateBracket(teams);

  const tournament = {
    rounds: bracketData.rounds,
    totalRounds: bracketData.totalRounds,
    playableMatches: bracketData.playableMatches,
    currentMatchId: bracketData.playableMatches[0]?.id || null,
    currentMatchIndex: 0,
    currentMatch: bracketData.playableMatches[0] || null,
    isSwapped: false
  };

  writeJSON(TOURNAMENT_FILE, tournament);

  if (tournament.currentMatch) {
    broadcastMatchUpdate(tournament.currentMatch);
  }

  res.json({ success: true, message: 'Bagan turnamen berhasil di-generate ulang', tournament });
});

// ==========================================
// REST API FOR TEAM MANAGEMENT
// ==========================================

app.get('/api/teams', (req, res) => {
  const teams = readJSON(TEAMS_FILE, []);
  res.json({ success: true, count: teams.length, data: teams });
});

// BATCH CREATE TEAMS (Baris demi baris dipisahkan Enter)
app.post('/api/teams/batch', (req, res) => {
  const { lines, appendMode } = req.body;
  if (!lines || typeof lines !== 'string') {
    return res.status(400).json({ success: false, error: 'Teks daftar tim wajib diisi' });
  }

  const rawLines = lines.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (rawLines.length === 0) {
    return res.status(400).json({ success: false, error: 'Tidak ada baris tim valid yang ditemukan' });
  }

  const existingTeams = readJSON(TEAMS_FILE, []);
  let targetTeams = appendMode ? [...existingTeams] : [];

  let currentId = targetTeams.length > 0 ? Math.max(...targetTeams.map(t => t.id || 0)) + 1 : 1;
  let currentSeed = targetTeams.length + 1;

  const addedTeams = [];

  for (const teamLine of rawLines) {
    const autoShort = generateShortTag(teamLine);
    const newTeam = {
      id: currentId++,
      name: teamLine,
      shortName: autoShort,
      seed: currentSeed++,
      logo: ''
    };
    targetTeams.push(newTeam);
    addedTeams.push(newTeam);
  }

  writeJSON(TEAMS_FILE, targetTeams);

  // Auto regenerate bracket jika mode overwrite
  let tournamentUpdated = false;
  if (!appendMode) {
    const bracketData = generateBracket(targetTeams);
    const tournament = {
      rounds: bracketData.rounds,
      totalRounds: bracketData.totalRounds,
      playableMatches: bracketData.playableMatches,
      currentMatchId: bracketData.playableMatches[0]?.id || null,
      currentMatchIndex: 0,
      currentMatch: bracketData.playableMatches[0] || null,
      isSwapped: false
    };
    writeJSON(TOURNAMENT_FILE, tournament);
    tournamentUpdated = true;
    if (tournament.currentMatch) {
      broadcastMatchUpdate(tournament.currentMatch);
    }
  }

  res.json({
    success: true,
    message: `${addedTeams.length} tim berhasil ditambahkan secara otomatis`,
    count: addedTeams.length,
    totalTeams: targetTeams.length,
    teams: addedTeams,
    tournamentUpdated
  });
});

app.post('/api/teams', upload.single('logo'), async (req, res) => {
  const { name, shortName, seed } = req.body;
  if (!name || !shortName) {
    return res.status(400).json({ success: false, error: 'Nama dan singkatan tim wajib diisi' });
  }

  const teams = readJSON(TEAMS_FILE, []);
  const nextId = teams.length > 0 ? Math.max(...teams.map(t => t.id || 0)) + 1 : 1;
  const logoUrl = req.file ? await saveUploadedLogo(req.file) : '';

  const newTeam = {
    id: nextId,
    name: name.trim(),
    shortName: shortName.trim().toUpperCase(),
    seed: parseInt(seed) || teams.length + 1,
    logo: logoUrl
  };

  teams.push(newTeam);
  writeJSON(TEAMS_FILE, teams);

  // Sync teams ke Firebase
  firebaseService.syncTeams(teams).catch(err => console.error('[Firebase Teams Sync Error]', err));

  res.json({ success: true, message: 'Tim berhasil ditambahkan', data: newTeam });
});

app.put('/api/teams/:id', upload.single('logo'), async (req, res) => {
  const teamId = parseInt(req.params.id);
  const { name, shortName, seed } = req.body;

  const teams = readJSON(TEAMS_FILE, []);
  const teamIndex = teams.findIndex(t => t.id === teamId);

  if (teamIndex === -1) {
    return res.status(404).json({ success: false, error: 'Tim tidak ditemukan' });
  }

  if (name) teams[teamIndex].name = name.trim();
  if (shortName) teams[teamIndex].shortName = shortName.trim().toUpperCase();
  if (seed) teams[teamIndex].seed = parseInt(seed);

  if (req.file) {
    if (teams[teamIndex].logo && teams[teamIndex].logo.startsWith('/uploads/logos/')) {
      const oldPath = path.join(__dirname, '..', 'public', teams[teamIndex].logo);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    teams[teamIndex].logo = await saveUploadedLogo(req.file);
  }

  writeJSON(TEAMS_FILE, teams);

  // Sync teams ke Firebase
  firebaseService.syncTeams(teams).catch(err => console.error('[Firebase Teams Sync Error]', err));

  res.json({ success: true, message: 'Data tim berhasil diperbarui', data: teams[teamIndex] });
});

app.delete('/api/teams/:id', (req, res) => {
  const teamId = parseInt(req.params.id);
  const teams = readJSON(TEAMS_FILE, []);
  const team = teams.find(t => t.id === teamId);

  if (!team) {
    return res.status(404).json({ success: false, error: 'Tim tidak ditemukan' });
  }

  if (team.logo && team.logo.startsWith('/uploads/logos/')) {
    const oldPath = path.join(__dirname, '..', 'public', team.logo);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  const updatedTeams = teams.filter(t => t.id !== teamId);
  writeJSON(TEAMS_FILE, updatedTeams);

  // Sync teams ke Firebase
  firebaseService.syncTeams(updatedTeams).catch(err => console.error('[Firebase Teams Sync Error]', err));

  res.json({ success: true, message: 'Tim berhasil dihapus' });
});

app.post('/api/teams/seed-36', (req, res) => {
  const defaultSeeds = [];
  const proTeams = ['EVOS Legends', 'RRQ Hoshi', 'ONIC Esports', 'Bigetron Alpha', 'Alter Ego', 'Geek Fam ID', 'Rebellion', 'Dewa United', 'Team Liquid ID', 'Fnatic ONIC'];
  
  for (let i = 1; i <= 36; i++) {
    if (i <= proTeams.length) {
      defaultSeeds.push({
        id: i,
        name: proTeams[i - 1],
        shortName: proTeams[i - 1].split(' ')[0].toUpperCase(),
        seed: i,
        logo: ''
      });
    } else {
      defaultSeeds.push({
        id: i,
        name: `Kelas ${Math.ceil((i-10)/6) + 9} RPL ${(i % 3) + 1}`,
        shortName: `K${i}`,
        seed: i,
        logo: ''
      });
    }
  }

  writeJSON(TEAMS_FILE, defaultSeeds);
  res.json({ success: true, message: '36 Tim default berhasil di-generate', count: defaultSeeds.length });
});

// ==========================================
// DEDICATED STRICT OBS OVERLAYS (100% TRANSPARAN, POPS BOLD 700, NO EFFECTS)
// ==========================================

// 1. Teks Nama Tim Kiri (Format Dua Baris + Auto-Singkat > 8 Char)
app.get('/overlay/team-left-name', (req, res) => {
  const tournament = getTournamentState();
  const team = tournament.currentMatch?.teamLeft;
  const rawName = team?.name || '';
  const shortName = team?.shortName || '';
  const formattedName = formatTeamName(rawName, shortName);

  res.render('overlay', {
    type: 'name',
    side: 'left',
    rawName: rawName,
    formattedName: formattedName,
    title: 'Nama Tim Kiri'
  });
});

// 2. Teks Nama Tim Kanan (Format Dua Baris + Auto-Singkat > 8 Char)
app.get('/overlay/team-right-name', (req, res) => {
  const tournament = getTournamentState();
  const team = tournament.currentMatch?.teamRight;
  const rawName = team?.name || '';
  const shortName = team?.shortName || '';
  const formattedName = formatTeamName(rawName, shortName);

  res.render('overlay', {
    type: 'name',
    side: 'right',
    rawName: rawName,
    formattedName: formattedName,
    title: 'Nama Tim Kanan'
  });
});

app.get('/overlay/team-left-logo', (req, res) => {
  const tournament = getTournamentState();
  const logoUrl = tournament.currentMatch?.teamLeft?.logo || '';
  res.render('overlay', { type: 'logo', side: 'left', logoUrl: logoUrl, title: 'Logo Tim Kiri' });
});

app.get('/overlay/team-right-logo', (req, res) => {
  const tournament = getTournamentState();
  const logoUrl = tournament.currentMatch?.teamRight?.logo || '';
  res.render('overlay', { type: 'logo', side: 'right', logoUrl: logoUrl, title: 'Logo Tim Kanan' });
});

// Start the server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[MLBB Tournament OS] Server running at http://0.0.0.0:${PORT}`);
});
