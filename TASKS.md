# TASKS: OBS Overlay & Match Dashboard Tournament Mobile Legends

## Status Legend
- [x] Selesai
- [/] Sedang Berjalan
- [ ] Belum Dimulai

---

## 1. Fondasi & Arsitektur Projek
- [x] Inisialisasi struktur projek Express.js + Tailwind CSS + EJS/Client JS + Multer untuk penyimpanan data JSON & upload logo tim
- [x] Setup file `TASKS.md` dan `PROGRESS.md`
- [x] Setup database file lokal (`data/teams.json`, `data/tournament.json`, `data/settings.json`)

## 2. Admin UI: Bento Grid & Dark Modern Styling (Sesuai Referensi)
- [x] Implementasi skema warna dark mode (`#151A28`, `#1B1E3C`, surface `#202538` / `#282D42`, aksen `#5B54F6` / `#6C5CE7`, mint `#00E6A3`)
- [x] Sidebar navigasi rounded container dengan logo dan menu aktif berglow
- [x] Layout Bento Grid terintegrasi dan responsif
- [x] Topbar dengan live clock, tournament badge status, dan search bar
- [x] Desain kartu metriks & quick action cards

## 3. Fitur Manajemen Tim (Part 1 Core)
- [x] Input tim/kelas baru (Nama tim, singkatan/tag, nomor slot)
- [x] Upload logo tim (disimpan ke `public/uploads/logos/`)
- [x] Edit dan update data tim
- [x] Hapus data tim beserta file logonya
- [x] Default generator data tim awal (~36 tim default MLBB / class template)
- [x] Reset & Ekspor/Impor daftar tim

## 4. Fitur Bracket Generator (Single Elimination) (Part 2)
- [x] Logika seeding bracket untuk fleksibel tim (~36 tim, auto-byes untuk putaran 1)
- [x] Format Single Elimination: BO1 penyisihan s.d. Semifinal, BO3 khusus Final (Juara 1 & 2)
- [x] Visualisasi Bracket interaktif berbasis Bento Card
- [x] Integrasi otomatis pemenang match ke node bracket berikutnya

## 5. Fitur Match Controller (Part 2)
- [x] Panel Kontrol Match aktif saat ini (Active Match Showcase: Team Left vs Team Right)
- [x] Tombol Next Match, Previous Match
- [x] Tombol Swap Team (Left <-> Right)
- [x] Tombol Pemenang (Win Left / Win Right)
- [x] Skor tracker (BO1 / BO3)
- [x] Sinkronisasi real-time state ke REST endpoint untuk OBS Overlays

## 6. OBS Web Source Overlays (Part 3 & Special Text Formatting)
- [x] `/overlay/team-left-name` (Transparan 100%, Font Poppins Bold 700, no-bg, no-effect)
- [x] `/overlay/team-right-name` (Transparan 100%, Font Poppins Bold 700, no-bg, no-effect)
- [x] `/overlay/team-left-logo` (Transparan 100%, no-bg, no-effect)
- [x] `/overlay/team-right-logo` (Transparan 100%, no-bg, no-effect)
- [x] Card "OBS Source Links" khusus di Bento Grid Dashboard dengan fitur 1-klik copy URL
- [x] Real-time update instan via Server-Sent Events (SSE) saat Swap Team atau Next Match ditekan (Zero Reload OBS)
- [x] Format Khusus Dua Baris Overlay Teks: Baris 1 Nama Tim Uppercase (auto-singkat jika > 8 karakter) & Baris 2 teks "SMADA" proporsional bold center

## 8. Batch Input Tim (Enter-Separated) & Auto Singkatan 5 Karakter
- [x] Modal / Card "Batch Input Tim" dengan textarea dipisahkan enter di Manajemen Tim
- [x] Algoritma auto-generate singkatan maksimal 5 karakter (contoh: VORTONE -> VRTN, konsonan/akronim cerdas)
- [x] Endpoint API `POST /api/teams/batch` untuk import banyak tim sekaligus
- [x] Live preview interaktif di modal sebelum disimpan

## 11. Arsitektur Cloudflare, Firebase Database & ImageKit
- [x] Integrasi ImageKit.io REST API untuk upload dan hosting logo tim/aset secara cloud CDN (`src/imagekitService.js`)
- [x] Sinkronisasi Firebase Realtime Database dua arah (auto-sync saat match action & CRUD tim)
- [x] Konfigurasi Cloudflare Pages / Workers / Tunnel untuk hosting web & API 24 jam nonstop (`wrangler.toml`)
- [x] UI Konfigurasi ImageKit, Firebase & Cloudflare terpadu di Admin Dashboard (`/cloud`)
- [x] Panduan deployment komprehensif tanpa kartu kredit (`PANDUAN_CLOUDFLARE_FIREBASE_IMAGEKIT.md`)
