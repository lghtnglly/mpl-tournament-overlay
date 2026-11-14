// matchControl.js - Real-time client controller logic for Match & Bracket & YouTube Sync

// Swap Team Left <-> Right
async function swapTeam() {
  try {
    const res = await fetch('/api/match/swap', { method: 'POST' });
    const data = await res.json();
    if (res.ok && data.success) {
      updateMatchUI(data.match);
      highlightActiveBracketNode(data.match.id);

      // Warning toast if thumbnail missing
      if (data.youtube && data.youtube.warning && typeof showToast === 'function') {
        showToast(data.youtube.warning, 'warning');
      }
    } else {
      alert(data.error || 'Gagal menukar tim');
    }
  } catch (err) {
    console.error(err);
    alert('Koneksi server gagal');
  }
}

// Win Team (Left or Right)
async function setWinner(side) {
  try {
    const res = await fetch('/api/match/win', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ side })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      updateMatchUI(data.match);
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } else {
      alert(data.error || 'Gagal menentukan pemenang');
    }
  } catch (err) {
    console.error(err);
    alert('Koneksi server gagal');
  }
}

// Next Match
async function nextMatch() {
  try {
    const res = await fetch('/api/match/next', { method: 'POST' });
    const data = await res.json();
    if (res.ok && data.success) {
      updateMatchUI(data.match);
      if (data.youtube && data.youtube.warning) {
        sessionStorage.setItem('pendingWarningToast', data.youtube.warning);
      }
      window.location.reload();
    } else {
      alert(data.error || 'Sudah di match terakhir');
    }
  } catch (err) {
    console.error(err);
  }
}

// Prev Match
async function prevMatch() {
  try {
    const res = await fetch('/api/match/prev', { method: 'POST' });
    const data = await res.json();
    if (res.ok && data.success) {
      updateMatchUI(data.match);
      if (data.youtube && data.youtube.warning) {
        sessionStorage.setItem('pendingWarningToast', data.youtube.warning);
      }
      window.location.reload();
    } else {
      alert(data.error || 'Sudah di match pertama');
    }
  } catch (err) {
    console.error(err);
  }
}

// Select Match by Node click
async function selectMatch(matchId) {
  try {
    const res = await fetch('/api/match/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (data.youtube && data.youtube.warning) {
        sessionStorage.setItem('pendingWarningToast', data.youtube.warning);
      }
      window.location.reload();
    }
  } catch (err) {
    console.error(err);
  }
}

// Reset / Re-generate Bracket
async function regenerateBracket() {
  if (!confirm('Apakah Anda yakin ingin mengacak & generate ulang seluruh bracket? Hasil match yang ada akan direset.')) {
    return;
  }
  try {
    const res = await fetch('/api/bracket/generate', { method: 'POST' });
    const data = await res.json();
    if (res.ok && data.success) {
      window.location.reload();
    }
  } catch (err) {
    console.error(err);
  }
}

// Update Local Showcase UI Instant
function updateMatchUI(match) {
  if (!match) return;

  // Update Left Team
  const nameLeft = document.getElementById('name-left');
  const abbrLeft = document.getElementById('abbr-left');
  const logoLeft = document.getElementById('logo-left');
  const scoreLeft = document.getElementById('score-left');

  if (nameLeft) nameLeft.textContent = match.teamLeft ? match.teamLeft.name : 'TBD';
  if (abbrLeft) abbrLeft.textContent = match.teamLeft ? match.teamLeft.shortName : '-';
  if (scoreLeft) scoreLeft.textContent = match.scoreLeft || 0;
  if (logoLeft) {
    if (match.teamLeft && match.teamLeft.logo) {
      logoLeft.innerHTML = `<img src="${match.teamLeft.logo}" alt="Logo">`;
    } else {
      logoLeft.innerHTML = `<span class="placeholder-abbr">${match.teamLeft ? match.teamLeft.shortName.substring(0, 3) : 'TBD'}</span>`;
    }
  }

  // Update Right Team
  const nameRight = document.getElementById('name-right');
  const abbrRight = document.getElementById('abbr-right');
  const logoRight = document.getElementById('logo-right');
  const scoreRight = document.getElementById('score-right');

  if (nameRight) nameRight.textContent = match.teamRight ? match.teamRight.name : 'TBD';
  if (abbrRight) abbrRight.textContent = match.teamRight ? match.teamRight.shortName : '-';
  if (scoreRight) scoreRight.textContent = match.scoreRight || 0;
  if (logoRight) {
    if (match.teamRight && match.teamRight.logo) {
      logoRight.innerHTML = `<img src="${match.teamRight.logo}" alt="Logo">`;
    } else {
      logoRight.innerHTML = `<span class="placeholder-abbr">${match.teamRight ? match.teamRight.shortName.substring(0, 3) : 'TBD'}</span>`;
    }
  }

  // Update Match Number & Round Badge
  const roundBadge = document.getElementById('round-badge');
  const matchNoText = document.getElementById('match-number-text');
  if (roundBadge) roundBadge.textContent = `${match.format} • ${match.roundName}`;
  if (matchNoText) matchNoText.textContent = `MATCH ${match.matchNumber || match.id}`;
}

function highlightActiveBracketNode(matchId) {
  document.querySelectorAll('.match-node').forEach(node => {
    if (node.getAttribute('data-match-id') === matchId) {
      node.classList.add('active-match');
    } else {
      node.classList.remove('active-match');
    }
  });
}

// Cek toast pending setelah reload
window.addEventListener('DOMContentLoaded', () => {
  const pending = sessionStorage.getItem('pendingWarningToast');
  if (pending) {
    sessionStorage.removeItem('pendingWarningToast');
    if (typeof showToast === 'function') {
      setTimeout(() => {
        showToast(pending, 'warning');
      }, 500);
    }
  }
});
