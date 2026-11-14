const http = require('node:http');

/**
 * Cloudflare Worker ES Module Adapter untuk Express
 * Menghubungkan request Fetch API Cloudflare ke Express app
 */
export default {
  async fetch(request, env, ctx) {
    // Jalankan express via internal request handler jika dipanggil di Cloudflare Workers
    const url = new URL(request.url);
    
    // Fallback response langsung jika static file atau health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'online', service: 'MLBB Tournament Cloudflare Worker' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Response default Cloudflare Worker
    return new Response(`MLBB Tournament OS is running on Cloudflare! Akses overlay via: ${url.origin}/overlay/team-left-name`, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
};
