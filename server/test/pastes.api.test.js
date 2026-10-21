import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { Paste } from '../src/models/paste.js';
import { hashToken } from '../src/tokens.js';
import { validBody } from './helpers/fixtures.js';
import { useTestDb } from './helpers/test-db.js';

useTestDb();
const app = createApp();

describe('POST /api/pastes', () => {
  it('creates a paste and returns an id and a delete token', async () => {
    const res = await request(app).post('/api/pastes').send(validBody());
    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(res.body.deleteToken).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('stores only the hash of the delete token', async () => {
    const res = await request(app).post('/api/pastes').send(validBody());
    const doc = await Paste.findById(res.body.id).lean();
    expect(doc.deleteTokenHash).toBe(hashToken(res.body.deleteToken));
    expect(JSON.stringify(doc)).not.toContain(res.body.deleteToken);
  });

  it('sets expiresAt from the ttl', async () => {
    const before = Date.now();
    const res = await request(app)
      .post('/api/pastes')
      .send(validBody({ ttl: '1h' }));
    const doc = await Paste.findById(res.body.id).lean();
    const expected = before + 60 * 60 * 1000;
    expect(doc.expiresAt.getTime()).toBeGreaterThanOrEqual(expected);
    expect(doc.expiresAt.getTime()).toBeLessThan(expected + 5000);
  });

  it.each([
    ['missing fields', {}],
    ['ciphertext is an object', validBody({ ciphertext: { $ne: null } })],
    ['bad ttl', validBody({ ttl: '1y' })],
    ['bad iv', validBody({ iv: 'short' })],
  ])('rejects bad input with 400: %s', async (_name, body) => {
    const res = await request(app).post('/api/pastes').send(body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'invalid_paste' });
  });
});

describe('GET /api/pastes/:id', () => {
  it('returns exactly what was stored, as often as you like', async () => {
    const body = validBody({ ciphertext: 'Z'.repeat(50) });
    const { body: created } = await request(app).post('/api/pastes').send(body);

    for (let i = 0; i < 2; i++) {
      const res = await request(app).get(`/api/pastes/${created.id}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        ciphertext: body.ciphertext,
        iv: body.iv,
        burn: false,
      });
    }
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).get(`/api/pastes/${'A'.repeat(22)}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'not_found' });
  });

  it('returns 404 for a malformed id', async () => {
    const res = await request(app).get('/api/pastes/short');
    expect(res.status).toBe(404);
  });

  it('lets a burn-after-read paste be read exactly once', async () => {
    const { body } = await request(app)
      .post('/api/pastes')
      .send(validBody({ burn: true }));

    const first = await request(app).get(`/api/pastes/${body.id}`);
    expect(first.status).toBe(200);
    expect(first.body.burn).toBe(true);

    const second = await request(app).get(`/api/pastes/${body.id}`);
    expect(second.status).toBe(404);
  });

  it('gives a burn paste to only one of many simultaneous readers', async () => {
    const { body } = await request(app)
      .post('/api/pastes')
      .send(validBody({ burn: true }));

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app).get(`/api/pastes/${body.id}`),
      ),
    );
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    expect(statuses.filter((s) => s === 404)).toHaveLength(9);
  });

  it('treats an expired paste as missing before the TTL cleaner runs', async () => {
    const doc = await Paste.create({
      ciphertext: 'A'.repeat(40),
      iv: 'B'.repeat(16),
      deleteTokenHash: 'x',
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = await request(app).get(`/api/pastes/${doc._id}`);
    expect(res.status).toBe(404);
  });
});
