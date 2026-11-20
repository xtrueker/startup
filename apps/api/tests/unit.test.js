const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const { parsePostgisPoint, normalizePostgisLocationToWkt } = require('../dist/shared/utils/postgis');
const { buildCitizenTrackingUrl, resolveHeadersBaseUrl } = require('../dist/shared/utils/url');
const { User } = require('../dist/infrastructure/database/models/User');
const { requireAuth, requireRole } = require('../dist/shared/middlewares/auth');
const { env } = require('../dist/config/env');

describe('PostGIS geometry utilities', () => {
  it('parses WKT POINT(lng lat) and EWKT strings accurately', () => {
    assert.deepEqual(parsePostgisPoint('POINT(-74.0817 4.6097)'), {
      latitude: 4.6097,
      longitude: -74.0817,
    });
    assert.deepEqual(parsePostgisPoint('SRID=4326;POINT(-75.5636 6.2518)'), {
      latitude: 6.2518,
      longitude: -75.5636,
    });
  });

  it('parses GeoJSON Point objects and normalizes to WKT', () => {
    const geo = { type: 'Point', coordinates: [-74.0817, 4.6097] };
    assert.deepEqual(parsePostgisPoint(geo), { latitude: 4.6097, longitude: -74.0817 });
    assert.equal(normalizePostgisLocationToWkt(geo), 'POINT(-74.0817 4.6097)');
  });

  it('returns null for empty or invalid geometries', () => {
    assert.equal(parsePostgisPoint(null), null);
    assert.equal(parsePostgisPoint('INVALID'), null);
  });
});

describe('URL builders', () => {
  it('builds encoded citizen tracking URLs', () => {
    const url = buildCitizenTrackingUrl('alert-123');
    assert.ok(url.endsWith('/citizen-tracker?alertId=alert-123'));
  });

  it('resolves base URL from proxy headers or PUBLIC_API_URL', () => {
    const url = resolveHeadersBaseUrl({ host: 'api.example.com', 'x-forwarded-proto': 'https' });
    assert.ok(url.startsWith('http://') || url.startsWith('https://'));
  });
});

describe('User.toDTO security sanitization', () => {
  it('never leaks password hash or encrypted KYC vault', () => {
    const dto = User.toDTO({
      id: '11111111-1111-1111-1111-111111111111',
      full_name: 'Test Citizen',
      cedula: '1234567890',
      email: 'citizen@example.com',
      password: '$2a$10$secretHashValue',
      kyc_encrypted_vault: { iv: 'abc', data: 'xyz' },
      role: 'citizen',
      is_verified: true,
    });

    assert.equal('password' in dto, false);
    assert.equal('kyc_encrypted_vault' in dto, false);
    assert.equal(dto.fullName, 'Test Citizen');
    assert.equal(dto.role, 'citizen');
  });
});

describe('Auth middlewares (requireAuth & requireRoles)', () => {
  function createMockRes() {
    return {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
  }

  it('rejects requests without Bearer token with 401', () => {
    const req = { headers: {} };
    const res = createMockRes();
    let nextCalled = false;
    requireAuth(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
  });

  it('allows valid JWT and enforces role authorization', () => {
    const token = jwt.sign({ userId: 'u-1', role: 'citizen' }, env.JWT_SECRET, { expiresIn: '5m' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = createMockRes();
    let authPassed = false;

    requireAuth(req, res, () => {
      authPassed = true;
    });
    assert.equal(authPassed, true);

    const roleRes = createMockRes();
    let rolePassed = false;
    requireRole(['admin', 'operator'])(req, roleRes, () => {
      rolePassed = true;
    });
    assert.equal(rolePassed, false);
    assert.equal(roleRes.statusCode, 403);
  });
});
