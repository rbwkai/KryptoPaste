import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { validBody } from './helpers/fixtures.js';

const app = createApp();

describe('security and error handling', () => {
  it('sends a strict CSP and other safe headers', async () => {
    const res = await request(app).get('/api/health');
    const csp = res.headers['content-security-policy'];
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('sends no CORS headers, so other sites cannot read the API', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers unknown api routes with JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'not_found' });
  });

  it('answers broken JSON with 400', async () => {
    const res = await request(app)
      .post('/api/pastes')
      .set('content-type', 'application/json')
      .send('{bad');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'bad_json' });
  });

  it('rejects bodies over the size limit with 413', async () => {
    const res = await request(app)
      .post('/api/pastes')
      .send(validBody({ ciphertext: 'A'.repeat(200_000) }));
    expect(res.status).toBe(413);
  });

  it('gives every response a request id', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-request-id']).toBeTruthy();
  });
});
