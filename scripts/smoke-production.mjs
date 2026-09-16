const baseUrl = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const username = process.env.SMOKE_USERNAME ?? 'admin';
const password = process.env.SMOKE_PASSWORD ?? 'Admin123!';

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.text();
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${body}`);
  return body ? JSON.parse(body) : null;
}

const health = await request('/health');
if (health.status !== 'ok') throw new Error('Health check returned an unexpected payload.');
const login = await request('/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password }) });
if (!login.token) throw new Error('Login response did not contain a token.');
const cuves = await request('/cuves', { headers: { authorization: `Bearer ${login.token}` } });
if (!Array.isArray(cuves)) throw new Error('Authenticated cuves response was not an array.');
console.log(`Smoke test passed: ${baseUrl} health, login, cuves (${cuves.length} rows).`);
