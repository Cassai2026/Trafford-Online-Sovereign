import { api } from '../api';

beforeEach(() => {
  global.fetch = jest.fn();
  localStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('api utility', () => {
  it('api.get fetches the given path', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
    const result = await api.get('/nodes');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/nodes'),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(result).toEqual({ data: [] });
  });

  it('api.post calls fetch with POST method and serialised body', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 1 } }),
    });
    await api.post('/swaps', { skill_needed: 'plumbing' });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/swaps'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ skill_needed: 'plumbing' }),
      }),
    );
  });

  it('api.patch calls fetch with PATCH method and body', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    });
    await api.patch('/deeds/abc/status', { transfer_status: 'transferred' });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/deeds/abc/status'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('includes Authorization header when token is in localStorage', async () => {
    localStorage.setItem('sovereign_token', 'test-token');
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    await api.get('/nodes');
    const [, options] = fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer test-token');
  });

  it('omits Authorization header when no token in localStorage', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    await api.get('/nodes');
    const [, options] = fetch.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it('throws with error message on non-ok response', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Bad request' }),
    });
    await expect(api.get('/nodes')).rejects.toThrow('Bad request');
  });

  it('throws with HTTP status fallback when no error field', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    await expect(api.get('/nodes')).rejects.toThrow('HTTP 500');
  });
});
