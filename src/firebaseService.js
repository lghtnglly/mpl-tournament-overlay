const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * Firebase Realtime Database Service (REST-based)
 * Menggunakan standard HTTP/HTTPS REST API Firebase Realtime Database
 * Sesuai prinsip ponytail: zero heavy dependencies, portable, dan super cepat!
 */

class FirebaseService {
  constructor(getSettingsFn) {
    this.getSettings = getSettingsFn;
  }

  getConfig() {
    const settings = this.getSettings();
    return settings.firebase || {
      databaseUrl: '',
      authToken: '', // Database Secret / Firebase ID Token (opsional jika database public rules)
      enabled: false
    };
  }

  /**
   * Helper request HTTPS ke Firebase Realtime Database REST API
   */
  request(method, endpointPath, data = null) {
    return new Promise((resolve, reject) => {
      const config = this.getConfig();
      if (!config.enabled || !config.databaseUrl) {
        return resolve({ skipped: true, reason: 'Firebase not enabled' });
      }

      let dbUrl = config.databaseUrl.trim();
      if (dbUrl.endsWith('/')) dbUrl = dbUrl.slice(0, -1);
      
      const authParam = config.authToken ? `?auth=${encodeURIComponent(config.authToken.trim())}` : '';
      const fullUrl = `${dbUrl}/${endpointPath}.json${authParam}`;

      try {
        const urlObj = new URL(fullUrl);
        const postData = data ? JSON.stringify(data) : null;

        const options = {
          hostname: urlObj.hostname,
          path: urlObj.pathname + urlObj.search,
          method: method,
          headers: {
            'Content-Type': 'application/json'
          }
        };

        if (postData) {
          options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = https.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve({ success: true, data: JSON.parse(body || '{}') });
              } catch (e) {
                resolve({ success: true, data: body });
              }
            } else {
              resolve({ success: false, error: `Firebase HTTP ${res.statusCode}: ${body}` });
            }
          });
        });

        req.on('error', (err) => {
          resolve({ success: false, error: err.message });
        });

        if (postData) req.write(postData);
        req.end();
      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    });
  }

  // Sync Current Match ke Firebase
  async syncMatch(currentMatch) {
    if (!currentMatch) return null;
    return this.request('PUT', 'currentMatch', currentMatch);
  }

  // Sync Teams ke Firebase
  async syncTeams(teams) {
    if (!teams) return null;
    return this.request('PUT', 'teams', teams);
  }

  // Sync Full Tournament ke Firebase
  async syncTournament(tournament) {
    if (!tournament) return null;
    return this.request('PUT', 'tournament', tournament);
  }

  // Pull All Data dari Firebase
  async pullAll() {
    return this.request('GET', '');
  }
}

module.exports = FirebaseService;
