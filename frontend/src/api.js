// Shared API utility — all fetch calls go through here
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('sovereign_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

export const api = {
  get:   (path)         => apiFetch(path),
  post:  (path, body)   => apiFetch(path, { method: 'POST',  body: JSON.stringify(body) }),
  patch: (path, body)   => apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),
};

/**
 * Open a Server-Sent Events stream to the given path.
 * The returned EventSource must be closed by the caller when no longer needed.
 */
export function createEventSource(path) {
  return new EventSource(`${BASE_URL}${path}`);
}

