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

// ── Nodes /me ────────────────────────────────────────────────
describe('GET /api/nodes/me', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/nodes/me');
    expect(res.status).toBe(401);
  });

  it('returns the node for the authenticated user', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1, uuid: 'abc', name: 'Test User', skills: [], constraints: [] }] });
    const res = await request(app)
      .get('/api/nodes/me')
      .set('Authorization', authHeader);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Test User');
  });

  it('returns 404 when no node exists for the user', async () => {
    db.query.mockResolvedValue({ rows: [] });
    const res = await request(app)
      .get('/api/nodes/me')
      .set('Authorization', authHeader);
    expect(res.status).toBe(404);
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
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/vajra/compile').send({ intent: 'audit carbon ledger' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when intent is missing', async () => {
    const res = await request(app)
      .post('/api/vajra/compile')
      .set('Authorization', authHeader)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when intent exceeds 500 chars', async () => {
    const res = await request(app)
      .post('/api/vajra/compile')
      .set('Authorization', authHeader)
      .send({ intent: 'a'.repeat(501) });
    expect(res.status).toBe(400);
  });

  it('routes a ledger intent to odin', async () => {
    const res = await request(app)
      .post('/api/vajra/compile')
      .set('Authorization', authHeader)
      .send({ intent: 'record energy credit for node 7' });
    expect(res.status).toBe(200);
    expect(res.body.data.routed_to).toBe('odin');
    expect(res.body.data.output).toMatch(/ODIN/);
  });

  it('routes a firewall intent to hekete', async () => {
    const res = await request(app)
      .post('/api/vajra/compile')
      .set('Authorization', authHeader)
      .send({ intent: 'lock down the firewall — threat detected' });
    expect(res.status).toBe(200);
    expect(res.body.data.routed_to).toBe('hekete');
  });

  it('routes a compute intent to kong', async () => {
    const res = await request(app)
      .post('/api/vajra/compile')
      .set('Authorization', authHeader)
      .send({ intent: 'dispatch heavy compute task batch 3' });
    expect(res.status).toBe(200);
    expect(res.body.data.routed_to).toBe('kong');
  });

  it('routes a thermal intent to enki', async () => {
    const res = await request(app)
      .post('/api/vajra/compile')
      .set('Authorization', authHeader)
      .send({ intent: 'increase cooling fan speed — temperature rising' });
    expect(res.status).toBe(200);
    expect(res.body.data.routed_to).toBe('enki');
  });

  it('defaults unknown intent to odin', async () => {
    const res = await request(app)
      .post('/api/vajra/compile')
      .set('Authorization', authHeader)
      .send({ intent: 'do something unspecified' });
    expect(res.status).toBe(200);
    expect(res.body.data.routed_to).toBe('odin');
  });

  it('response contains structured output fields', async () => {
    const res = await request(app)
      .post('/api/vajra/compile')
      .set('Authorization', authHeader)
      .send({ intent: 'audit carbon ledger' });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('routed_to');
    expect(res.body.data).toHaveProperty('label');
    expect(res.body.data).toHaveProperty('output');
    expect(res.body.data.output).toMatch(/VAJRA/);
  });
});

// ── Vajra /ack ───────────────────────────────────────────────
describe('POST /api/vajra/ack', () => {
  it('returns 400 when node is missing', async () => {
    const res = await request(app).post('/api/vajra/ack').send({});
    expect(res.status).toBe(400);
  });

  it('returns broadcast count with a valid node', async () => {
    const res = await request(app).post('/api/vajra/ack').send({ node: 'odin', status: 'CONFIRMED' });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('broadcast');
    expect(res.body.data.node).toBe('odin');
    expect(res.body.data.status).toBe('CONFIRMED');
  });

  it('defaults status to CONFIRMED when not provided', async () => {
    const res = await request(app).post('/api/vajra/ack').send({ node: 'enki' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CONFIRMED');
  });
});

// ── Nodes — sheets format & reputation ───────────────────────
describe('GET /api/nodes?format=sheets', () => {
  it('returns headers and row arrays in Sheets column order', async () => {
    db.query.mockResolvedValue({
      rows: [{
        uuid: 'abc-123', name: 'Alice', bio_roi: 'My ROI',
        skills: ['painting'], constraints: ['heights'], reputation_score: '85.00',
        is_active: true, created_at: new Date().toISOString(),
      }],
    });
    const res = await request(app).get('/api/nodes?format=sheets');
    expect(res.status).toBe(200);
    expect(res.body.headers).toEqual(
      ['UUID', 'Name', 'Bio-ROI', 'Skills (I Can)', 'Constraints (I Don\'t)', 'Reputation Score', 'Last Synced']
    );
    expect(res.body.rows[0][0]).toBe('abc-123');
    expect(res.body.rows[0][3]).toBe('painting');
  });
});

describe('POST /api/nodes/reputation/recalculate', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/nodes/reputation/recalculate');
    expect(res.status).toBe(401);
  });

  it('returns updated reputation score', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1, uuid: 'abc', name: 'Alice', reputation_score: '40.00' }] });
    const res = await request(app)
      .post('/api/nodes/reputation/recalculate')
      .set('Authorization', authHeader);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('reputation_score');
  });

  it('returns 404 when user has no node', async () => {
    db.query.mockResolvedValue({ rows: [] });
    const res = await request(app)
      .post('/api/nodes/reputation/recalculate')
      .set('Authorization', authHeader);
    expect(res.status).toBe(404);
  });
});

// ── Service Swap — proximity matching ────────────────────────
describe('GET /api/swaps/match — proximity', () => {
  it('accepts valid lat/lng and returns results', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1, name: 'Dave', skills: ['plumbing'] }] });
    const res = await request(app).get('/api/swaps/match?skill=plumbing&lat=53.44&lng=-2.28');
    expect(res.status).toBe(200);
    expect(res.body.proximity_km).toBe(10);
  });

  it('returns 400 for invalid lat', async () => {
    const res = await request(app).get('/api/swaps/match?skill=plumbing&lat=999&lng=-2.28');
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid lng', async () => {
    const res = await request(app).get('/api/swaps/match?skill=plumbing&lat=53.44&lng=999');
    expect(res.status).toBe(400);
  });

  it('sets proximity_km to null when no coordinates provided', async () => {
    db.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/api/swaps/match?skill=plumbing');
    expect(res.status).toBe(200);
    expect(res.body.proximity_km).toBeNull();
  });
});

// ── Service Swap — create & update ───────────────────────────
describe('POST /api/swaps', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/swaps').send({ skill_needed: 'painting' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when skill_needed is missing', async () => {
    const res = await request(app)
      .post('/api/swaps')
      .set('Authorization', authHeader)
      .send({});
    expect(res.status).toBe(400);
  });

  it('creates a matched swap when a provider exists', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })   // requester lookup
      .mockResolvedValueOnce({ rows: [{ id: 2 }] })   // provider match
      .mockResolvedValueOnce({ rows: [{ id: 10, skill_needed: 'painting', status: 'matched' }] }); // insert
    const res = await request(app)
      .post('/api/swaps')
      .set('Authorization', authHeader)
      .send({ skill_needed: 'painting' });
    expect(res.status).toBe(201);
    expect(res.body.auto_matched).toBe(true);
  });

  it('creates an open swap when no provider exists', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })  // requester lookup
      .mockResolvedValueOnce({ rows: [] })            // no provider
      .mockResolvedValueOnce({ rows: [{ id: 11, skill_needed: 'welding', status: 'open' }] }); // insert
    const res = await request(app)
      .post('/api/swaps')
      .set('Authorization', authHeader)
      .send({ skill_needed: 'welding' });
    expect(res.status).toBe(201);
    expect(res.body.auto_matched).toBe(false);
  });

  it('returns 400 when user has no sovereign node', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/swaps')
      .set('Authorization', authHeader)
      .send({ skill_needed: 'painting' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/swaps/:uuid/status', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .patch('/api/swaps/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/status')
      .send({ status: 'completed' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid status', async () => {
    const res = await request(app)
      .patch('/api/swaps/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/status')
      .set('Authorization', authHeader)
      .send({ status: 'invalid' });
    expect(res.status).toBe(400);
  });

  it('updates swap status', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 10, status: 'completed' }] });
    const res = await request(app)
      .patch('/api/swaps/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/status')
      .set('Authorization', authHeader)
      .send({ status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
  });

  it('returns 404 when swap not found', async () => {
    db.query.mockResolvedValue({ rows: [] });
    const res = await request(app)
      .patch('/api/swaps/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/status')
      .set('Authorization', authHeader)
      .send({ status: 'cancelled' });
    expect(res.status).toBe(404);
  });
});

// ── Governance — audit submission ─────────────────────────────
describe('GET /api/governance/audit', () => {
  it('returns the current week audit summary', async () => {
    db.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/api/governance/audit');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('week');
    expect(res.body.data).toHaveProperty('gate_passed');
  });
});

describe('POST /api/governance/audit', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/governance/audit').send({ scores: [] });
    expect(res.status).toBe(401);
  });

  it('returns 400 for empty scores array', async () => {
    const res = await request(app)
      .post('/api/governance/audit')
      .set('Authorization', authHeader)
      .send({ scores: [] });
    expect(res.status).toBe(400);
  });

  it('submits audit scores and returns gate status', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // auditor lookup
      .mockResolvedValue({ rows: [{ id: 1, pillar_id: 1, score: 75, is_balanced: true }] }); // upsert per pillar
    const scores = Array.from({ length: 1 }, (_, i) => ({ pillar_id: i + 1, score: 75, notes: '' }));
    const res = await request(app)
      .post('/api/governance/audit')
      .set('Authorization', authHeader)
      .send({ scores });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('gate_passed');
    expect(res.body.data).toHaveProperty('balanced');
  });
});

// ── Safety — create report & update status ───────────────────
describe('POST /api/safety', () => {
  it('returns 400 for invalid category', async () => {
    const res = await request(app)
      .post('/api/safety')
      .set('Authorization', authHeader)
      .send({ title: 'Test', description: 'desc', category: 'invalid' });
    expect(res.status).toBe(400);
  });

  it('creates a safety report', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })  // reporter lookup
      .mockResolvedValueOnce({ rows: [{ id: 20, uuid: 'rep-uuid', title: 'Broken light', severity: 'medium', category: 'safety' }] }); // insert
    const res = await request(app)
      .post('/api/safety')
      .set('Authorization', authHeader)
      .send({ title: 'Broken light', description: 'Street light out', category: 'safety' });
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Broken light');
  });
});

describe('PATCH /api/safety/:uuid/status', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .patch('/api/safety/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/status')
      .send({ status: 'resolved' });
    expect(res.status).toBe(401);
  });

  it('updates report status', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 20, status: 'resolved' }] });
    const res = await request(app)
      .patch('/api/safety/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/status')
      .set('Authorization', authHeader)
      .send({ status: 'resolved' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('resolved');
  });

  it('returns 404 when report not found', async () => {
    db.query.mockResolvedValue({ rows: [] });
    const res = await request(app)
      .patch('/api/safety/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/status')
      .set('Authorization', authHeader)
      .send({ status: 'acknowledged' });
    expect(res.status).toBe(404);
  });
});

// ── Re-Works ─────────────────────────────────────────────────
describe('GET /api/reworks', () => {
  it('returns inventory list', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1, item_name: 'Timber beam' }] });
    const res = await request(app).get('/api/reworks');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('POST /api/reworks', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/reworks').send({ item_name: 'Beam' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when item_name is missing', async () => {
    const res = await request(app)
      .post('/api/reworks')
      .set('Authorization', authHeader)
      .send({});
    expect(res.status).toBe(400);
  });

  it('creates an inventory item', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 5, item_name: 'Steel frame', source: 'biffa' }] });
    const res = await request(app)
      .post('/api/reworks')
      .set('Authorization', authHeader)
      .send({ item_name: 'Steel frame', quantity: 3 });
    expect(res.status).toBe(201);
    expect(res.body.data.item_name).toBe('Steel frame');
  });
});

describe('GET /api/reworks/pollution', () => {
  it('returns pollution log', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1, location: 'Stretford', pm25_ug_m3: 12.5 }] });
    const res = await request(app).get('/api/reworks/pollution');
    expect(res.status).toBe(200);
    expect(res.body.data[0].location).toBe('Stretford');
  });
});

describe('POST /api/reworks/pollution', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/reworks/pollution').send({ location: 'Stretford' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when location is missing', async () => {
    const res = await request(app)
      .post('/api/reworks/pollution')
      .set('Authorization', authHeader)
      .send({});
    expect(res.status).toBe(400);
  });

  it('creates a pollution reading', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 3, location: 'Stretford', pm25_ug_m3: 18.2 }] });
    const res = await request(app)
      .post('/api/reworks/pollution')
      .set('Authorization', authHeader)
      .send({ location: 'Stretford', pm25_ug_m3: 18.2 });
    expect(res.status).toBe(201);
    expect(res.body.data.location).toBe('Stretford');
  });
});

// ── Deeds — detail & status update ───────────────────────────
describe('GET /api/deeds/:uuid', () => {
  it('returns a deed by uuid', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1, uuid: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', asset_name: 'Plot A' }] });
    const res = await request(app).get('/api/deeds/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    expect(res.status).toBe(200);
    expect(res.body.data.asset_name).toBe('Plot A');
  });

  it('returns 404 for unknown deed', async () => {
    db.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/api/deeds/f47ac10b-58cc-4372-a567-0e02b2c3d479');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/deeds/:uuid/status', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .patch('/api/deeds/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/status')
      .send({ transfer_status: 'transferred' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid transfer_status', async () => {
    const res = await request(app)
      .patch('/api/deeds/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/status')
      .set('Authorization', authHeader)
      .send({ transfer_status: 'invalid' });
    expect(res.status).toBe(400);
  });

  it('updates deed transfer status', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1, transfer_status: 'transferred' }] });
    const res = await request(app)
      .patch('/api/deeds/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/status')
      .set('Authorization', authHeader)
      .send({ transfer_status: 'transferred' });
    expect(res.status).toBe(200);
    expect(res.body.data.transfer_status).toBe('transferred');
  });
});

// ── Materials — create & detail ───────────────────────────────
describe('POST /api/materials', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/materials').send({ name: 'Timber', category: 'timber' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid category', async () => {
    const res = await request(app)
      .post('/api/materials')
      .set('Authorization', authHeader)
      .send({ name: 'Widget', category: 'invalid' });
    expect(res.status).toBe(400);
  });

  it('creates a material with a QR code', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1, uuid: 'node-uuid' }] }) // source node
      .mockResolvedValueOnce({ rows: [{ id: 5, uuid: 'mat-uuid', name: 'Oak beam' }] }) // insert
      .mockResolvedValueOnce({ rows: [{ id: 5, uuid: 'mat-uuid', name: 'Oak beam', qr_code: 'data:image/png;base64,ABC' }] }); // QR update
    const res = await request(app)
      .post('/api/materials')
      .set('Authorization', authHeader)
      .send({ name: 'Oak beam', category: 'timber' });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('qr_code');
  });
});

describe('GET /api/materials/:uuid', () => {
  it('returns a material by uuid', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 5, uuid: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Steel rod' }] });
    const res = await request(app).get('/api/materials/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Steel rod');
  });

  it('returns 404 for unknown material', async () => {
    db.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/api/materials/f47ac10b-58cc-4372-a567-0e02b2c3d479');
    expect(res.status).toBe(404);
  });
});
