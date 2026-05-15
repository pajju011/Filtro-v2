import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { app } from './server.js';

describe('Backend API', () => {
  it('returns 400 when invalid data is provided to /api/filter', async () => {
    const response = await request(app)
      .post('/api/filter')
      .send({ data: 'not-an-array', filters: [] });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid data');
  });

  it('filters numeric data correctly', async () => {
    const response = await request(app)
      .post('/api/filter')
      .send({
        data: [
          { value: '10' },
          { value: '20' },
          { value: '30' }
        ],
        filters: [{ column: 'value', condition: 'greaterThan', value: '15' }]
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0].value).toBe('20');
  });
});
