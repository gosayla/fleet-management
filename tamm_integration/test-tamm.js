/**
 * Direct Tamm API test — runs standalone with Node.js (no backend needed)
 * Usage: node tamm_integration/test-tamm.js
 */

const https = require('https');

// ─── Credentials ──────────────────────────────────────────────────────────────
const CONFIG = {
  baseUrl:     'tamm.api.elm.sa',
  idpUrl:      'idp.elm.sa',
  idpRealm:    'Tamm',
  moiNumber:   '7029295180',
  clientId:    'db7adee4',
  clientSecret:'b84afcc8825a119662db1ef6ac4974a5',
};

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed, raw: data });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function log(label, res) {
  const ok = res.status >= 200 && res.status < 300;
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`${ok ? '✅' : '❌'} ${label}  →  HTTP ${res.status}`);
  if (typeof res.body === 'object') {
    console.log(JSON.stringify(res.body, null, 2));
  } else {
    console.log(res.raw?.substring(0, 500));
  }
}

// ─── Step 1: Get access token ─────────────────────────────────────────────────

async function getToken() {
  const body = [
    'grant_type=client_credentials',
    `client_id=${CONFIG.clientId}`,
    `client_secret=${CONFIG.clientSecret}`,
  ].join('&');

  const res = await request({
    hostname: CONFIG.idpUrl,
    path: `/auth/realms/${CONFIG.idpRealm}/protocol/openid-connect/token`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
    },
  }, body);

  log('GET TOKEN (IDP)', res);

  if (res.status !== 200) throw new Error('Token fetch failed');
  console.log(`\n   expires_in: ${res.body.expires_in}s  |  token_type: ${res.body.token_type}`);
  return res.body.access_token;
}

// ─── Step 2: Call Tamm endpoints ──────────────────────────────────────────────

async function tammPost(token, path, payload) {
  const body = JSON.stringify(payload);
  return request({
    hostname: CONFIG.baseUrl,
    path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'Authorization': `Bearer ${token}`,
      'X-Integrator-User-Id': CONFIG.moiNumber,
    },
  }, body);
}

async function tammGet(token, path, extraHeaders = {}) {
  return request({
    hostname: CONFIG.baseUrl,
    path,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Integrator-User-Id': CONFIG.moiNumber,
      ...extraHeaders,
    },
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

async function run() {
  console.log('🔐 Authenticating with Tamm IDP...');
  const token = await getToken();
  console.log('\n✅ Token obtained. Running API tests...');

  // --- Traffic Violations (unpaid, company search by MOI number) ---
  const v1 = await tammPost(token, '/api/v1/inquiry/traffic-violations?page=0&size=10', {
    searchType: 0,
    idNumber: CONFIG.moiNumber,
  });
  log('UNPAID VIOLATIONS — searchType=0 (company/MOI)', v1);

  // --- Paid Violations ---
  const v2 = await tammPost(token, '/api/v1/inquiry/traffic-violations/paid?page=0&size=10', {
    searchType: 0,
    idNumber: CONFIG.moiNumber,
  });
  log('PAID VIOLATIONS — searchType=0 (company/MOI)', v2);

  // --- MVPI by sequence number ---
  const mvpi = await tammPost(token, '/api/v1/inquiry/mvpi/latest-inspection', {
    searchType: 1,
    sequenceNumber: '997630501',
  });
  log('MVPI — searchType=1 (sequenceNumber=997630501)', mvpi);

  // --- Vehicle Insurance by sequence number ---
  const ins = await tammPost(token, '/api/v1/inquiry/vehicle-insurance', {
    searchType: 1,
    sequenceNumber: '997630501',
  });
  log('VEHICLE INSURANCE — searchType=1 (sequenceNumber=997630501)', ins);

  // --- Actual Driver Step 1: Verify Vehicle ---
  const ad1 = await tammPost(token, '/api/v1/actual-driver/addition/verifyVehicle', {
    plateDto: {
      text1: 'د',
      text2: 'ع',
      text3: 'د',
      number: 1946,
      type: { code: 1 },
    },
  });
  log('ACTUAL DRIVER Step 1 — verifyVehicle', ad1);

  const conversationId = ad1.body?.id ?? ad1.body?.conversationId ?? null;
  if (conversationId) {
    console.log(`\n   conversationId: ${conversationId}`);

    // --- Actual Driver Step 2: Verify Addition (Company + iqama) ---
    const ad2 = await tammPost(token, '/api/v1/actual-driver/addition/verify', {
      idNumber: CONFIG.moiNumber,
      type: 2,
      crossValidationBy: 1,
      residentIqamaId: '2108824836',
      mobileNumber: '558526036',
    });
    // Note: step 2 needs X-Conversation-Id header — re-issue with header
    const ad2h = await request({
      hostname: CONFIG.baseUrl,
      path: '/api/v1/actual-driver/addition/verify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify({
          idNumber: CONFIG.moiNumber,
          type: 2,
          crossValidationBy: 1,
          residentIqamaId: '2108824836',
          mobileNumber: '558526036',
        })),
        'Authorization': `Bearer ${token}`,
        'X-Integrator-User-Id': CONFIG.moiNumber,
        'X-Conversation-Id': conversationId,
      },
    }, JSON.stringify({
      idNumber: CONFIG.moiNumber,
      type: 2,
      crossValidationBy: 1,
      residentIqamaId: '2108824836',
      mobileNumber: '558526036',
    }));
    log('ACTUAL DRIVER Step 2 — verify addition', ad2h);
  } else {
    console.log('\n⚠️  Skipping Step 2 & 3 — no conversationId from Step 1');
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('Done.');
}

run().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
