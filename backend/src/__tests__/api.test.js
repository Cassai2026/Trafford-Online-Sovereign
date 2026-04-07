/**
 * Integration tests for the Trafford Sovereign Hub API.
 * Uses supertest against the Express app with a mocked DB pool.
 */
jest.mock('../db/pool', () => ({
  query: jest.fn(),
}));

const request = require('supertest');
const app = require('../index');
const db = require('../db/pool');

// Helper: sign a test JWT
const jwt = require('jsonwebtoken');
const TEST_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const testToken = jwt.sign({ sub: '1', email: 'test@trafford.online', name: 'Test User' }, TEST_SECRET);
const authHeader = `Bearer ${testToken}`;

beforeEach(() => jest.clearAllMocks());

// ── Health ───────────────────────────────────────────────────
describe('GET /health', () => {
  it('returns 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ── Nodes ────────────────────────────────────────────────────
describe('GET /api/nodes', () => {
  it('returns node list', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1, name: 'Alice', reputation_score: '90.00' }] });
    const res = await request(app).get('/api/nodes');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Alice');
  });
});

describe('POST /api/nodes', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/nodes').send({ name: 'Bob' });
    expect(res.status).toBe(401);
  });

  it('creates a node with auth', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 2, name: 'Bob', email: 'test@trafford.online' }] });
    const res = await request(app)
      .post('/api/nodes')
      .set('Authorization', authHeader)
      .send({ name: 'Bob', skills: ['painting'] });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Bob');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/nodes')
      .set('Authorization', authHeader)
      .send({});
    expect(res.status).toBe(400);
  });
});

// ── Deeds ────────────────────────────────────────────────────
describe('GET /api/deeds', () => {
  it('returns deed list', async () => {
    db.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/api/deeds');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('POST /api/deeds', () => {
  it('returns 400 for missing asset_type', async () => {
    const res = await request(app)
      .post('/api/deeds')
      .set('Authorization', authHeader)
      .send({ asset_name: 'Test Plot', current_holder: 'Trafford Council' });
    expect(res.status).toBe(400);
  });

  it('creates a deed', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // node lookup
      .mockResolvedValueOnce({ rows: [{ id: 10, asset_name: 'Test Plot' }] }); // insert
    const res = await request(app)
      .post('/api/deeds')
      .set('Authorization', authHeader)
      .send({ asset_name: 'Test Plot', asset_type: 'land', current_holder: 'Trafford Council' });
    expect(res.status).toBe(201);
    expect(res.body.data.asset_name).toBe('Test Plot');
  });
});

// ── Materials ────────────────────────────────────────────────
describe('GET /api/materials', () => {
  it('returns materials list', async () => {
    db.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/api/materials');
    expect(res.status).toBe(200);
  });
});

// ── Service Swap ─────────────────────────────────────────────
describe('GET /api/swaps/match', () => {
  it('returns 400 without skill param', async () => {
    const res = await request(app).get('/api/swaps/match');
    expect(res.status).toBe(400);
  });

  it('returns matched nodes for a skill', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 3, name: 'Carol', skills: ['plumbing'] }] });
    const res = await request(app).get('/api/swaps/match?skill=plumbing');
    expect(res.status).toBe(200);
    expect(res.body.matched_skill).toBe('plumbing');
  });
});

// ── Governance ───────────────────────────────────────────────
describe('GET /api/governance/pillars', () => {
  it('returns the 15 pillars', async () => {
    const pillars = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1, pillar_number: i + 1, pillar_name: `Pillar ${i + 1}`,
    }));
    db.query.mockResolvedValue({ rows: pillars });
    const res = await request(app).get('/api/governance/pillars');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(15);
  });
});

describe('GET /api/governance/reflect', () => {
  it('returns alignment status', async () => {
    db.query.mockResolvedValue({ rows: [{ balanced: '15', total: '15' }] });
    const res = await request(app).get('/api/governance/reflect');
    expect(res.status).toBe(200);
    expect(res.body.data.gate_passed).toBe(true);
  });

  it('reports misalignment', async () => {
    db.query.mockResolvedValue({ rows: [{ balanced: '10', total: '15' }] });
    const res = await request(app).get('/api/governance/reflect');
    expect(res.status).toBe(200);
    expect(res.body.data.gate_passed).toBe(false);
  });
});

// ── Safety ───────────────────────────────────────────────────
describe('GET /api/safety', () => {
  it('returns open reports', async () => {
    db.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/api/safety');
    expect(res.status).toBe(200);
  });
});

describe('POST /api/safety', () => {
  it('returns 400 for missing title', async () => {
    const res = await request(app)
      .post('/api/safety')
      .set('Authorization', authHeader)
      .send({ description: 'test', category: 'health' });
    expect(res.status).toBe(400);
  });
});

// ── Vajra / Genesis Engine ────────────────────────────────────────────────────
describe('GET /api/vajra/nodes', () => {
  it('returns the four Tetrad nodes', async () => {
    const res = await request(app).get('/api/vajra/nodes');
    expect(res.status).toBe(200);
    const ids = res.body.data.map((n) => n.node);
    expect(ids).toContain('odin');
    expect(ids).toContain('hekete');
    expect(ids).toContain('kong');
    expect(ids).toContain('enki');
  });
});

describe('POST /api/vajra/compile', () => {
  it('returns 400 when intent is missing', async () => {
    const res = await request(app).post('/api/vajra/compile').send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when intent exceeds 500 chars', async () => {
    const res = await request(app)
      .post('/api/vajra/compile')
      .send({ intent: 'a'.repeat(501) });
    expect(res.status).toBe(400);
  });

  it('routes a ledger intent to odin', async () => {
    const res = await request(app)
      .post('/api/vajra/compile')
      .send({ intent: 'record energy credit for node 7' });
    expect(res.status).toBe(200);
    expect(res.body.data.routed_to).toBe('odin');
    expect(res.body.data.output).toMatch(/ODIN/);
  });

  it('routes a firewall intent to hekete', async () => {
    const res = await request(app)
      .post('/api/vajra/compile')
      .send({ intent: 'lock down the firewall — threat detected' });
    expect(res.status).toBe(200);
    expect(res.body.data.routed_to).toBe('hekete');
  });

  it('routes a compute intent to kong', async () => {
    const res = await request(app)
      .post('/api/vajra/compile')
      .send({ intent: 'dispatch heavy compute task batch 3' });
    expect(res.status).toBe(200);
    expect(res.body.data.routed_to).toBe('kong');
  });

  it('routes a thermal intent to enki', async () => {
    const res = await request(app)
      .post('/api/vajra/compile')
      .send({ intent: 'increase cooling fan speed — temperature rising' });
    expect(res.status).toBe(200);
    expect(res.body.data.routed_to).toBe('enki');
  });

  it('defaults unknown intent to odin', async () => {
    const res = await request(app)
      .post('/api/vajra/compile')
      .send({ intent: 'do something unspecified' });
    expect(res.status).toBe(200);
    expect(res.body.data.routed_to).toBe('odin');
  });

  it('response contains structured output fields', async () => {
    const res = await request(app)
      .post('/api/vajra/compile')
      .send({ intent: 'audit carbon ledger' });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('routed_to');
    expect(res.body.data).toHaveProperty('label');
    expect(res.body.data).toHaveProperty('output');
    expect(res.body.data.output).toMatch(/VAJRA/);
  });
});
