import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const API = 'http://localhost:6209';

// The same rules as the API's helmet CSP. In step 12, nginx will send this.
// Here it lets `vite preview` test the production build under the real policy.
const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join('; ');

export default defineConfig({
  plugins: [react()],
  // Never inline fonts as data: URLs. The CSP allows fonts only from 'self'.
  build: { assetsInlineLimit: 0 },
  // Dev: the browser talks to Vite, and Vite forwards /api to Express.
  // So the browser sees one origin, and we need no CORS.
  server: { proxy: { '/api': API } },
  preview: {
    proxy: { '/api': API },
    headers: {
      'Content-Security-Policy': CSP,
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  },
});
