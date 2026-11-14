const https = require('https');

/**
 * ImageKitService
 * Mengunggah file logo/gambar ke ImageKit.io REST API
 * Mengikuti prinsip ponytail: zero heavy SDK, menggunakan built-in Node https/fetch!
 */
class ImageKitService {
  constructor(getSettingsFn) {
    this.getSettings = getSettingsFn;
  }

  getConfig() {
    const settings = this.getSettings() || {};
    return settings.imagekit || {
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || '',
      enabled: false
    };
  }

  /**
   * Upload file buffer ke ImageKit via REST API
   * Endpoint: POST https://upload.imagekit.io/api/v1/files/upload
   * Auth: Basic Auth menggunakan privateKey sebagai username dan password kosong
   */
  async upload(fileBuffer, fileName, folder = '/mlbb-tournament') {
    const config = this.getConfig();
    if (!config.enabled || !config.privateKey) {
      return { skipped: true, reason: 'ImageKit not configured or disabled' };
    }

    const base64File = fileBuffer.toString('base64');
    const authHeader = 'Basic ' + Buffer.from(config.privateKey.trim() + ':').toString('base64');

    // Buat boundary multipart/form-data
    const boundary = '----ImageKitFormBoundary' + Date.now().toString(16);
    let postData = '';

    // Field file (base64 string)
    postData += `--${boundary}\r\n`;
    postData += `Content-Disposition: form-data; name="file"\r\n\r\n`;
    postData += `${base64File}\r\n`;

    // Field fileName
    postData += `--${boundary}\r\n`;
    postData += `Content-Disposition: form-data; name="fileName"\r\n\r\n`;
    postData += `${fileName}\r\n`;

    // Field folder
    if (folder) {
      postData += `--${boundary}\r\n`;
      postData += `Content-Disposition: form-data; name="folder"\r\n\r\n`;
      postData += `${folder}\r\n`;
    }

    // Field useUniqueFileName
    postData += `--${boundary}\r\n`;
    postData += `Content-Disposition: form-data; name="useUniqueFileName"\r\n\r\n`;
    postData += `true\r\n`;

    postData += `--${boundary}--\r\n`;

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'upload.imagekit.io',
        port: 443,
        path: '/api/v1/files/upload',
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({
                success: true,
                url: data.url,
                fileId: data.fileId,
                name: data.name,
                thumbnailUrl: data.thumbnailUrl
              });
            } else {
              resolve({
                success: false,
                error: data.message || `ImageKit HTTP ${res.statusCode}: ${body}`
              });
            }
          } catch (e) {
            resolve({
              success: false,
              error: `Parse error (${e.message}): ${body}`
            });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      req.write(postData);
      req.end();
    });
  }
}

module.exports = ImageKitService;
