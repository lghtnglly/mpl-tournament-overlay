# PROGRESS: OBS Overlay & Match Dashboard Tournament Mobile Legends

## Status Terkini
- **Tanggal Selesai**: 14 November 2026
- **Fase**: Part 8 - Integrasi Cloudflare Deployment, Firebase Realtime Database & ImageKit Cloud Media (Selesai Penuh)

---

### Rincian Implementasi Part 8 (Cloudflare, Firebase & ImageKit):
1. **Integrasi ImageKit.io ([src/imagekitService.js](file:///c:/Users/A10-LAPTOP/Documents/MPL/src/imagekitService.js))**:
   - Upload file logo tim kini langsung dikirim ke Cloud CDN ImageKit.io via REST API resmi (`/api/v1/files/upload`).
   - URL logo tim yang tersimpan di database adalah URL CDN global berkecepatan tinggi (misal: `https://ik.imagekit.io/username/logo-xxx.png`), sehingga gambar tidak akan hilang meskipun aplikasi di-redeploy atau container di-restart.
   - Tetap memiliki sistem fallback aman ke direktori lokal jika kredensial ImageKit belum diisi.
2. **Sinkronisasi Otomatis Firebase Realtime Database ([src/firebaseService.js](file:///c:/Users/A10-LAPTOP/Documents/MPL/src/firebaseService.js))**:
   - Seluruh perubahan data (Tambah Tim, Edit Tim, Hapus Tim, Swap Side Tim Kiri/Kanan, Penentuan Pemenang, Skor Match, dan Pergantian Match) otomatis tersinkronkan ke Firebase Realtime Database secara live tanpa jeda.
   - Tombol manual **Push** dan **Pull** tersedia di dashboard untuk fleksibilitas backup.
3. **Kesiapan Deployment Cloudflare**:
   - Penambahan file konfigurasi `wrangler.toml` untuk deployment ke Cloudflare (Pages / Workers).
   - Dukungan Cloudflare Tunnel satu baris perintah:
     ```bash
     npx cloudflared tunnel --url http://localhost:3000
     ```
4. **Dashboard Setting Terpadu ([views/cloud.ejs](file:///c:/Users/A10-LAPTOP/Documents/MPL/views/cloud.ejs))**:
   - Halaman `/cloud` kini memiliki form konfigurasi lengkap untuk:
     - Domain Cloudflare (HTTPS)
     - Firebase Database URL & Auth Token
     - ImageKit URL-Endpoint, Public Key, & Private Key
   - Disertai panduan lengkap [PANDUAN_CLOUDFLARE_FIREBASE_IMAGEKIT.md](file:///c:/Users/A10-LAPTOP/Documents/MPL/PANDUAN_CLOUDFLARE_FIREBASE_IMAGEKIT.md) dan arsip zip terbaru [project-upload.zip](file:///c:/Users/A10-LAPTOP/Documents/MPL/project-upload.zip).

---

### Rincian Implementasi Part 7 (24/7 Always Online Cloud Deployment):
1. **Berkas Konfigurasi Cloud Otomatis**:
   - `render.yaml`: Konfigurasi otomatis untuk web service gratis Render.com (Singapura / Global).
   - `Dockerfile`: Standard container Alpine Linux Node.js 20 production-ready untuk cloud modern.
   - `Procfile`: Konfigurasi entry-point `web: npm start` untuk platform PaaS (Railway / Heroku).
   - `.gitignore`: Mengabaikan `node_modules` agar upload ke cloud berukuran sangat ringan (hanya beberapa MB).
2. **Penyesuaian Server Production (`src/server.js`)**:
   - Server kini membaca port dinamis dari environment cloud (`process.env.PORT || 3000`).
   - Host listening diubah ke `0.0.0.0` agar siap menerima traffic dari seluruh jaringan internet publik.
3. **Penyusunan Berkas Panduan Lengkap**:
   - Berkas: [PANDUAN_ONLINE_24_JAM.md](file:///c:/Users/A10-LAPTOP/Documents/MPL/PANDUAN_ONLINE_24_JAM.md).
   - Berisi panduan langkah demi langkah 3 opsi platform gratis terbaik (Render.com, Railway.app, dan Glitch.com tanpa GitHub) agar server tetap beroperasi 24 jam nonstop meskipun laptop Anda dalam keadaan mati total.

---

### Rincian Implementasi Part 6 (Batch Input & Cloudflare/Firebase Online Migration):
1. **Fitur Batch Input Tim Berbasis Enter**:
   - Tersedia tombol **`+ Input Tim (Enter)`** pada halaman [Manajemen Tim](file:///c:/Users/A10-LAPTOP/Documents/MPL/views/teams.ejs).
   - Pengguna cukup mengetik atau paste nama tim/kelas yang dipisahkan baris baru (Enter).
   - Dilengkapi *Live Preview* pill singkatan secara *real-time* saat pengguna mengetik nama tim.
   - Pilihan mode: **Append** (menambahkan ke daftar yang sudah ada) atau **Overwrite** (menimpa seluruh daftar tim sekaligus meng-generate bagan bracket baru secara otomatis).
2. **Algoritma Auto-Singkatan Maksimal 5 Karakter (`src/nameFormatter.js`)**:
   - Jika satu kata tunggal: mengambil huruf pertama + konsonan berikutnya (menghilangkan vokal).
     - Contoh: `"VORTONE"` $\rightarrow$ **`"VRTN"`** (4 karakter).
     - Contoh: `"Vortone"` $\rightarrow$ **`"VRTN"`**.
   - Jika kata majemuk dengan angka kelas di akhir:
     - Contoh: `"RPL 1"` $\rightarrow$ **`"RPL1"`** (4 karakter).
     - Contoh: `"Sosial Satu"` $\rightarrow$ **`"SOS1"`** (4 karakter).
     - Contoh: `"XII MIPA 1"` $\rightarrow$ **`"XM1"`** (3 karakter).
   - Jika tim umum:
     - Contoh: `"Echo Knights"` $\rightarrow$ **`"EK"`** (2 karakter).
   - Tag dipastikan selalu dalam format **UPPERCASE** dengan panjang maksimal 5 karakter.
3. **Integrasi Online Cloudflare Tunnel**:
   - Menyediakan halaman navigasi baru **"Cloud & Online"** (`/cloud`).
   - Menyediakan 1-klik perintah terminal **Cloudflare Quick Tunnel**:
     ```bash
     npx cloudflared tunnel --url http://localhost:3000
     ```
     Menghasilkan link publik instan gratis (contoh: `https://xxxx.trycloudflare.com`) sehingga dashboard admin dan seluruh overlay OBS transparan dapat dibuka langsung lewat internet tanpa perlu port-forwarding router/modem.
   - Kolom penyimpanan URL publik Cloudflare di `data/settings.json`.
4. **Integrasi Online Firebase Realtime Database (`src/firebaseService.js`)**:
   - Modul REST client ringan (*zero heavy dependencies*, sesuai kaidah *ponytail*) untuk sinkronisasi cloud Firebase.
   - Mengupdate state pertandingan aktif secara *real-time* ke Firebase setiap kali tombol **Swap Team**, **Win Left/Right**, atau **Next Match** ditekan.
   - Tombol **"Push Semua Data ke Cloud"** dan **"Unduh dari Cloud"** (Pull) untuk sinkronisasi database tim dan turnamen antar perangkat panitia/komentator.

---

### Rincian Implementasi Part 5 (Format Khusus Nama Tim Overlay Dua Baris):
1. **Aturan Format Dua Baris**:
   - **Baris 1**: Nama Tim / Kelas dalam format **UPPERCASE/KAPITAL SEMUA**.
   - **Baris 2**: Teks wajib `"SMADA"` tepat di bawah nama tim, dengan ukuran font proporsional (`2.1rem` berbanding `3.4rem`), tetap tebal/bold (`font-weight: 700`).
2. **Logika Singkatan Otomatis (`src/nameFormatter.js`)**:
   - Jika panjang karakter nama tim `<= 8`: Ditampilkan utuh huruf kapital (contoh: `"Vortone"` -> `"VORTONE"`).
   - Jika panjang karakter nama tim `> 8`:
     - Memprioritaskan atribut `shortName` jika ada dan `<= 8` karakter.
     - Melakukan konversi istilah kelas/sekolah secara cerdas:
       - `"XII MIPA 1"` (10 char) -> `"XIIMIPA1"` (8 char).
       - `"Sosial Satu"` (11 char) -> `"SOS 1"` (5 char).
       - Menghapus kata redundan `"KELAS"` dan mengubah angka kata `"SATU"`, `"DUA"`, dst. menjadi angka `"1"`, `"2"`.
     - Mengambil akronim kata pertama jika multi-kata, atau memotong maksimal 8 karakter kapital.
3. **Styling Overlay Bersih & Murni Transparan**:
   - File: [overlay.ejs](file:///c:/Users/A10-LAPTOP/Documents/MPL/views/overlay.ejs).
   - `background: transparent !important;`.
   - Font: Google Fonts **`Poppins` weight `700` (Bold)**.
   - `text-align: center`, perataan tengah simetris antara Baris 1 (Nama Tim) dan Baris 2 (`SMADA`).
   - Murni teks: **Tanpa** background box, tanpa border, tanpa glow, tanpa stroke, dan tanpa shadow.
4. **Dukungan Sinkronisasi Real-Time (SSE)**:
   - Client JS di overlay mengimplementasikan logika `formatTeamNameClient` yang sama persis, sehingga saat tombol *Swap Team* atau *Next Match* ditekan di dashboard, teks dua baris di OBS langsung beradaptasi secara instan tanpa perlu reload.

---

### Rincian Implementasi Part 4 (YouTube Live Automation & Multi-Stream Switcher):
1. **Bento Card YouTube Control di Dashboard**:
   - Terpasang rapi di Dashboard Utama Bento Grid [dashboard.ejs](file:///c:/Users/A10-LAPTOP/Documents/MPL/views/dashboard.ejs).
   - Fitur Multi-Live Stream Switcher: Kolom input *Active Broadcast ID / Video ID* dengan tombol "Ganti" untuk beralih link YouTube Live stream baru di setiap match secara instan tanpa perlu me-restart server.
   - Kolom OAuth2 Token / API Key untuk otentikasi YouTube Data API v3.
   - Kolom Template Judul Stream kustom dengan variabel dinamis: `{MATCH_NO}`, `{TEAM_LEFT}`, `{TEAM_RIGHT}`, `{FORMAT}`, `{ROUND}`.
   - Tombol "Sync Live Sekarang" untuk manual trigger sinkronisasi.
2. **Automasi per-Match Stream (`src/youtubeService.js`)**:
   - Saat operator menekan tombol **Next Match** (atau **Swap Team**), sistem secara otomatis memformat judul live YouTube sesuai match yang aktif.
   - Otomatis memeriksa file thumbnail di direktori `public/thumbnails/`:
     - Posisi Normal: mencari `match{N}.jpg` (misal: `match1.jpg`).
     - Posisi Di-swap: otomatis mendeteksi status swap dan mencari `match{N}swap.jpg` (misal: `match1swap.jpg`).
3. **Error Handling & Floating Neon Warning Toast**:
   - Jika file thumbnail tidak ditemukan di direktori `public/thumbnails/`:
     - Muncul notifikasi Toast Alert Neon beranimasi di pojok kanan atas Dashboard dengan pesan:
       *"File thumbnail matchX.jpg tidak ditemukan. Update title tetap berjalan tanpa thumbnail."*
     - Update judul broadcast tetap diproses secara aman tanpa menghentikan siaran.
4. **Sinkronisasi Terpadu**:
   - Seluruh status tersimpan di `data/settings.json` dan terintegrasi dengan REST endpoint `POST /api/youtube/settings` serta `POST /api/youtube/sync`.

---

### Rincian Implementasi Part 3 (OBS Overlays & Real-Time Sync):
1. **Card Bento "OBS Source Links" di Dashboard Admin**:
   - Terintegrasi langsung di layout dashboard utama [dashboard.ejs](file:///c:/Users/A10-LAPTOP/Documents/MPL/views/dashboard.ejs).
   - Menampilkan daftar 4 Dedicated Link Overlay (Nama Kiri, Nama Kanan, Logo Kiri, Logo Kanan) dengan styling Dark Bento Card.
   - Tombol "Preview" untuk membuka overlay di tab baru dan tombol "Salin URL" untuk instant clipboard copy ke OBS Browser Source.
2. **Kesesuaian Spesifikasi Strict Overlay OBS**:
   - Berkas view: [overlay.ejs](file:///c:/Users/A10-LAPTOP/Documents/MPL/views/overlay.ejs).
   - `background: transparent !important;` (100% transparan).
   - Font: Google Fonts `Poppins` Bold (weight `700`).
   - Teks murni dan gambar logo murni: **Tanpa** background box, border, glow, stroke, shadow, ataupun filter apapun.
3. **Dedicated Route Endpoints**:
   - `http://localhost:3000/overlay/team-left-name` (Teks Nama Tim Kiri)
   - `http://localhost:3000/overlay/team-right-name` (Teks Nama Tim Kanan)
   - `http://localhost:3000/overlay/team-left-logo` (Gambar Logo Tim Kiri)
   - `http://localhost:3000/overlay/team-right-logo` (Gambar Logo Tim Kanan)
4. **Real-Time Push Synchronization (Zero Refresh OBS)**:
   - Menggunakan mekanisme **Server-Sent Events (SSE)** via endpoint `/api/events` di `src/server.js`.
   - Begitu tombol **Swap Team**, **Next Match**, **Win Left/Right**, atau pemilihan node bracket diklik, server secara otomatis mem-push payload update ke seluruh browser source OBS yang sedang aktif.
   - OBS Browser Source langsung berganti nama dan logo secara seketika (*instant zero reload*).

---

### Rincian Implementasi Part 2:
1. **Bento Card: Active Match Showcase**:
   - Terpasang di baris atas dashboard (grid column span 7).
   - Menampilkan avatar box tim kiri (Blue Side) & tim kanan (Red Side), logo atau singkatan tim, nama lengkap tim, skor aktif, nomor match, dan badge format pertandingan (`BO1` / `BO3`).
2. **Bento Card: Match Control Panel**:
   - Terpasang di sebelah kanan Active Match Showcase (grid column span 5).
   - Tombol **Swap Team**: Menukar tim Blue Side dan Red Side secara real-time via endpoint `POST /api/match/swap`.
   - Tombol **Win Left Team** & **Win Right Team**: Menetapkan pemenang match, mengupdate skor, dan memajukan tim pemenang ke babak bracket berikutnya melalui endpoint `POST /api/match/win`.
   - Tombol **Next Match** & **Prev Match**: Navigasi match siaran langsung secara sekuensial.
   - Tombol **Reset / Regenerate Bracket**: Mengacak dan meng-generate bagan dari data tim.
3. **Bento Card: Interactive Bracket Viewer**:
   - Terpasang di baris bawah dashboard (grid column span 12).
   - Menampilkan tree elimination lengkap 36 tim dengan scroll horizontal yang mulus.
   - Mendukung klik interaktif pada setiap kartu match node untuk memilih dan menjadikannya match aktif di broadcast.
4. **Logika System Bracket Engine (`src/bracketEngine.js`)**:
   - Mendukung format Single Elimination fleksibel (~36 tim).
   - Logika Byes otomatis (28 BYE pada Round of 64 untuk menempatkan 36 tim ke bagan standar).
   - Format otomatis BO1 untuk babak penyisihan hingga Semifinal, dan format BO3 khusus untuk Grand Final (Juara 1 & 2).
   - Auto-advance pemenang match ke slot round berikutnya.
5. **Real-Time State Synchronization**:
   - Seluruh perubahan dari kontrol match langsung tersimpan di `data/tournament.json` dan otomatis terbaca oleh 4 URL dedicated OBS Overlays.

---

### Rincian Implementasi Part 1:
1. **Aturan & Guidelines (`ponytail.md`)**:
   - Memastikan prinsip minim dependencies, no-overhead abstractions, lightweight single-source node express server, dan no boilerplate berlebih.
2. **Setup Arsitektur & Folder**:
   - Inisialisasi struktur direktori bersih:
     - `src/server.js` (Server Express)
     - `public/` (Asset CSS, JS frontend, upload logo tim)
     - `data/` (Penyimpanan JSON untuk fleksibilitas tanpa perlu setup database rumit)
     - `views/` (EJS templates terstruktur)
3. **Styling & Layout Bento Grid**:
   - Mengadopsi palet warna referensi:
     - Background: Deep Dark Navy (`#151A28` / `#1B1E3C`)
     - Card Surface: Dark Slate (`#202538` / `#282D42`) dengan border radius melengkung (`18px`)
     - Accent Color: Vibrant Indigo/Purple (`#5B54F6` / `#6C5CE7`) dengan subtle neon glow
     - Metric / Status Badge: Mint Green (`#00E6A3`)
     - Typography: Google Font Poppins & Inter
   - Sidebar navigasi melengkung persis seperti referensi Dashcom dengan menu aktif, badge counter, dan responsive layout.
4. **Modul Manajemen Tim (Part 1 Core)**:
   - Form Tambah / Edit Tim dengan upload logo drag-and-drop atau file picker.
   - Daftar 36 slot tim otomatis (default placeholder 36 tim/kelas MLBB untuk turnamen instan).
   - CRUD API lengkap: `GET /api/teams`, `POST /api/teams`, `PUT /api/teams/:id`, `DELETE /api/teams/:id`, `POST /api/teams/seed-36`.
   - File upload handled with Multer secara aman ke `public/uploads/logos/`.
