// teams.js - Client side logic for team roster management with Batch Input & Auto-Abbreviation

// Client-side implementation of Auto-Short Tag Generator (Max 5 chars)
function generateClientShortTag(name) {
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

  // Aturan konsonan: huruf pertama + konsonan selanjutnya (misal VORTONE -> VRTN)
  const firstChar = single[0];
  const restConsonants = single.slice(1).replace(/[AEIOU]/g, '');
  let short = (firstChar + restConsonants);

  if (short.length > 5) short = short.slice(0, 5);
  if (short.length >= 3) return short;

  return single.slice(0, 5);
}

// Auto-fill short tag saat user mengetik nama tim tunggal
function autoSuggestShortTag(name) {
  const shortInput = document.getElementById('teamShort');
  if (shortInput && (!shortInput.value || shortInput.dataset.autoFilled === 'true')) {
    const tag = generateClientShortTag(name);
    shortInput.value = tag;
    shortInput.dataset.autoFilled = 'true';
  }
}

// BATCH MODAL OPERATIONS
function openBatchModal() {
  document.getElementById('batchModal').classList.add('active');
  document.getElementById('batchLines').focus();
  updateBatchLivePreview();
}

function closeBatchModal() {
  document.getElementById('batchModal').classList.remove('active');
  document.getElementById('batchForm').reset();
  updateBatchLivePreview();
}

function updateBatchLivePreview() {
  const text = document.getElementById('batchLines').value;
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const countBadge = document.getElementById('batchCountBadge');
  const previewList = document.getElementById('batchPreviewList');

  if (countBadge) countBadge.textContent = `${lines.length} tim`;

  if (lines.length === 0) {
    previewList.innerHTML = `<span style="font-size: 0.75rem; color: var(--text-muted);">Belum ada teks yang diketik...</span>`;
    return;
  }

  previewList.innerHTML = lines.map(line => {
    const tag = generateClientShortTag(line);
    return `<div class="batch-preview-pill"><span>${line}</span> &rarr; <strong>${tag}</strong></div>`;
  }).join('');
}

async function handleBatchSubmit(e) {
  e.preventDefault();
  const lines = document.getElementById('batchLines').value;
  const appendMode = document.getElementById('batchAppendMode').checked;
  const saveBtn = document.getElementById('saveBatchBtn');

  saveBtn.disabled = true;
  saveBtn.textContent = 'Memproses Tim...';

  try {
    const res = await fetch('/api/teams/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines, appendMode })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      window.location.reload();
    } else {
      alert(data.error || 'Gagal menyimpan batch tim');
    }
  } catch (err) {
    console.error(err);
    alert('Terjadi kesalahan server saat memproses batch');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Simpan Seluruh Tim';
  }
}

// SINGLE TEAM OPERATIONS
function openAddModal() {
  document.getElementById('modalTitle').textContent = 'Tambah Tim Baru';
  document.getElementById('teamId').value = '';
  document.getElementById('teamName').value = '';
  const shortInput = document.getElementById('teamShort');
  shortInput.value = '';
  shortInput.dataset.autoFilled = 'true';
  
  const currentCount = document.querySelectorAll('#teams-tbody tr').length;
  document.getElementById('teamSeed').value = currentCount + 1;
  
  resetLogoPreview();
  document.getElementById('teamModal').classList.add('active');
}

function openEditModal(team) {
  document.getElementById('modalTitle').textContent = 'Edit Data Tim';
  document.getElementById('teamId').value = team.id;
  document.getElementById('teamName').value = team.name;
  const shortInput = document.getElementById('teamShort');
  shortInput.value = team.shortName;
  shortInput.dataset.autoFilled = 'false';
  document.getElementById('teamSeed').value = team.seed || 1;
  
  if (team.logo) {
    document.getElementById('dropzoneContent').style.display = 'none';
    const previewContainer = document.getElementById('previewContainer');
    previewContainer.style.display = 'flex';
    document.getElementById('imagePreview').src = team.logo;
    document.getElementById('fileNamePreview').textContent = 'Logo Terpasang';
  } else {
    resetLogoPreview();
  }

  document.getElementById('teamModal').classList.add('active');
}

function closeModal() {
  document.getElementById('teamModal').classList.remove('active');
  document.getElementById('teamForm').reset();
  resetLogoPreview();
}

function previewLogo(input) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('dropzoneContent').style.display = 'none';
      const previewContainer = document.getElementById('previewContainer');
      previewContainer.style.display = 'flex';
      document.getElementById('imagePreview').src = e.target.result;
      document.getElementById('fileNamePreview').textContent = file.name;
    };
    reader.readAsDataURL(file);
  }
}

function resetLogoPreview() {
  document.getElementById('dropzoneContent').style.display = 'block';
  document.getElementById('previewContainer').style.display = 'none';
  document.getElementById('imagePreview').src = '';
  document.getElementById('fileNamePreview').textContent = '';
  document.getElementById('logoFile').value = '';
}

async function handleTeamSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('teamId').value;
  const name = document.getElementById('teamName').value.trim();
  const shortName = document.getElementById('teamShort').value.trim().toUpperCase() || generateClientShortTag(name);
  const seed = parseInt(document.getElementById('teamSeed').value) || 1;
  const logoFile = document.getElementById('logoFile').files[0];

  const formData = new FormData();
  formData.append('name', name);
  formData.append('shortName', shortName);
  formData.append('seed', seed);
  if (logoFile) {
    formData.append('logo', logoFile);
  }

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Menyimpan...';

  try {
    const url = id ? `/api/teams/${id}` : '/api/teams';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      body: formData
    });

    const data = await res.json();
    if (res.ok && data.success) {
      window.location.reload();
    } else {
      alert(data.error || 'Gagal menyimpan data tim');
    }
  } catch (err) {
    console.error(err);
    alert('Terjadi kesalahan koneksi server');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Simpan Tim';
  }
}

async function deleteTeam(id, name) {
  if (!confirm(`Apakah Anda yakin ingin menghapus tim "${name}"?`)) return;

  try {
    const res = await fetch(`/api/teams/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok && data.success) {
      window.location.reload();
    } else {
      alert(data.error || 'Gagal menghapus tim');
    }
  } catch (err) {
    alert('Kesalahan jaringan saat menghapus tim');
  }
}

async function seedDefaultTeams() {
  if (!confirm('Ini akan mereset / menambahkan paket 36 tim turnamen default. Lanjutkan?')) return;

  try {
    const res = await fetch('/api/teams/seed-36', { method: 'POST' });
    const data = await res.json();
    if (res.ok && data.success) {
      window.location.reload();
    } else {
      alert(data.error || 'Gagal seed tim default');
    }
  } catch (err) {
    alert('Kesalahan jaringan');
  }
}

function filterTeams() {
  const query = document.getElementById('filter-input').value.toLowerCase();
  const rows = document.querySelectorAll('#teams-tbody tr');

  rows.forEach(row => {
    const name = row.getAttribute('data-name') || '';
    const short = row.getAttribute('data-short') || '';
    if (name.includes(query) || short.includes(query)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}
