import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('rate limits', () => {
  it('never limits health checks', async () => {
    for (let i = 0; i < 130; i++) {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
    }
  });

  it('limits paste creation to 30 per hour per visitor', async () => {
    const statuses = [];
    for (let i = 0; i < 32; i++) {
      const res = await request(app).post('/api/pastes').send({});
      statuses.push(res.status);
    }
    expect(statuses.filter((s) => s === 400)).toHaveLength(30);
    expect(statuses.filter((s) => s === 429)).toHaveLength(2);

    const limited = await request(app).post('/api/pastes').send({});
    expect(limited.body).toEqual({ error: 'rate_limited' });
  });
});
