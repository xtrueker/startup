const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const jwt = require('jsonwebtoken');

const { env } = require('../dist/config/env');
const { dbConnection, getPgPool, supabase } = require('../dist/infrastructure/database/connection');
const { initSocket, getIO } = require('../dist/shared/utils/socket');
const { mobileRouter } = require('../dist/modules/mobile/presentation/routes');
const { authRouter } = require('../dist/modules/auth/presentation/routes');
const { alertRouter } = require('../dist/modules/alerts/presentation/routes');

async function probeOperatorsNamespace(baseUrl, authPayload) {
  const sidRes = await fetch(`${baseUrl}/socket.io/?EIO=4&transport=polling`);
  const sidText = await sidRes.text();
  const { sid } = JSON.parse(sidText.slice(sidText.indexOf('{')));

  const packet = authPayload
    ? `40/operators,${JSON.stringify(authPayload)}`
    : `40/operators`;

  await fetch(`${baseUrl}/socket.io/?EIO=4&transport=polling&sid=${sid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: packet,
  });

  const pollRes = await fetch(`${baseUrl}/socket.io/?EIO=4&transport=polling&sid=${sid}`);
  return pollRes.text();
}

describe('Security, RLS & Contract Integration Suite', () => {
  let server;
  let baseUrl;
  let tempAlertId = null;

  const ownerId = '00000000-0000-0000-0000-000000000000';
  const attackerId = '11111111-1111-1111-1111-111111111111';
  const operatorId = '00000000-0000-0000-0000-000000000001';

  const citizenTokenAttacker = jwt.sign({ id: attackerId, role: 'citizen' }, env.JWT_SECRET, { expiresIn: '5m' });
  const citizenTokenOwner = jwt.sign({ id: ownerId, role: 'citizen' }, env.JWT_SECRET, { expiresIn: '5m' });
  const operatorToken = jwt.sign({ id: operatorId, role: 'operator' }, env.JWT_SECRET, { expiresIn: '5m' });

  before(async () => {
    await dbConnection.connect();
    const pool = getPgPool();

    const app = express();
    app.use(express.json());
    app.use('/api/mobile', mobileRouter);
    app.use('/api/auth', authRouter);
    app.use('/api/alerts', alertRouter);

    server = http.createServer(app);
    initSocket(server);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    await pool.query(
      `INSERT INTO public.users (id, full_name, cedula, email, password, role)
       VALUES ($1, 'Ciudadano Anónimo', 'anon_000000000000', 'anon_000000000000@red-ciudadana.local', 'nopassword_anonymous_placeholder', 'citizen')
       ON CONFLICT DO NOTHING`,
      [ownerId]
    );
    const insAlert = await pool.query(
      `INSERT INTO public.alerts (user_id, type, status, location, description)
       VALUES ($1, 'panic', 'pending', ST_SetSRID(ST_MakePoint(-74.0817, 4.6097), 4326), 'TEST_SUITE_ALERT')
       RETURNING id`,
      [ownerId]
    );
    tempAlertId = insAlert.rows[0].id;
  });

  after(async () => {
    if (tempAlertId) {
      const pool = getPgPool();
      await pool.query('DELETE FROM public.audit_logs WHERE resource_id = $1', [tempAlertId]).catch(() => {});
      await pool.query('DELETE FROM public.alert_events WHERE alert_id = $1', [tempAlertId]).catch(() => {});
      await pool.query('DELETE FROM public.alerts WHERE id = $1', [tempAlertId]).catch(() => {});
    }
    try { getIO().close(); } catch {}
    if (server && server.listening) {
      await new Promise((resolve) => server.close(() => resolve()));
    }
    await dbConnection.disconnect().catch(() => {});
  });

  it('blocks PostgREST anon access on public.users (zero-anon RLS)', async () => {
    const anonCheck = await supabase().from('users').select('id').limit(1);
    assert.equal(anonCheck.data, null);
    assert.ok(anonCheck.error, 'Expected PostgREST anon query to fail');
    assert.equal(anonCheck.error.code, '42501');
  });

  it('enforces auth & role guard on Socket.IO /operators namespace', async () => {
    const wsAnon = await probeOperatorsNamespace(baseUrl, null);
    const wsCitizen = await probeOperatorsNamespace(baseUrl, { token: citizenTokenAttacker });
    const wsOperator = await probeOperatorsNamespace(baseUrl, { token: operatorToken });

    assert.ok(wsAnon.includes('44/operators'), 'Anonymous connection must be rejected');
    assert.ok(wsCitizen.includes('44/operators'), 'Citizen JWT must be rejected');
    assert.ok(wsOperator.includes('40/operators,{"sid"'), 'Operator JWT must be accepted');
  });

  it('prevents IDOR on POST /api/mobile/location while allowing alert owner', async () => {
    const attackerRes = await fetch(`${baseUrl}/api/mobile/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenTokenAttacker}`,
      },
      body: JSON.stringify({ alertId: tempAlertId, latitude: 4.61, longitude: -74.08 }),
    });
    assert.equal(attackerRes.status, 403);

    const ownerRes = await fetch(`${baseUrl}/api/mobile/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenTokenOwner}`,
      },
      body: JSON.stringify({ alertId: tempAlertId, latitude: 4.61, longitude: -74.08 }),
    });
    assert.equal(ownerRes.status, 200);
  });

  it('allows verified alert status transition and records alert_events trail', async () => {
    const patchRes = await fetch(`${baseUrl}/api/alerts/${tempAlertId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({ status: 'verified', notes: 'Automated regression check' }),
    });
    assert.equal(patchRes.status, 200);

    const eventsRes = await fetch(`${baseUrl}/api/alerts/${tempAlertId}/events`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    assert.equal(eventsRes.status, 200);
    const eventsBody = await eventsRes.json();
    assert.equal(eventsBody.success, true);
    assert.ok(Array.isArray(eventsBody.data) && eventsBody.data.length >= 1);
  });

  it('exposes standard RateLimit headers on POST /api/auth/login', async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.ok(
      loginRes.headers.get('ratelimit-limit') || loginRes.headers.get('x-ratelimit-limit'),
      'Expected RateLimit header on auth endpoint'
    );
  });
});
