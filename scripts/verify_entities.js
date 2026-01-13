const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api/v1';
const LOGIN_URL = `${API_BASE}/superadmin/auth/login`;

async function testEntityAPIs() {
  console.log('--- Starting Entity API Verification ---');

  // 1. Login to get token
  console.log('1. Authenticating as SuperAdmin...');
  const loginRes = await fetch(LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@farmferry.com', password: 'password123' })
  });

  if (!loginRes.ok) {
    console.error('Login failed:', await loginRes.text());
    return;
  }

  const loginData = await loginRes.json();
  const token = loginData.token;
  if (!token) {
    console.error('No token received!');
    return;
  }
  console.log('✓ Authentication successful. Token received.');

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 2. Test Customers API
  console.log('\n2. Testing GET /admin/customers...');
  try {
    const custRes = await fetch(`${API_BASE}/admin/customers?limit=1`, { headers });
    if (custRes.ok) {
        const custData = await custRes.json();
        console.log(`✓ Success: Found ${custData.data.pagination.total} customers`);
    } else {
        console.error('✗ Failed:', await custRes.text());
    }
  } catch (e) { console.error('✗ Error:', e.message); }

  // 3. Test Suppliers API
  console.log('\n3. Testing GET /admin/suppliers...');
  try {
    const suppRes = await fetch(`${API_BASE}/admin/suppliers?limit=1`, { headers });
    if (suppRes.ok) {
        const suppData = await suppRes.json();
        console.log(`✓ Success: Found ${suppData.data.pagination.total} suppliers`);
    } else {
        console.error('✗ Failed:', await suppRes.text());
    }
  } catch (e) { console.error('✗ Error:', e.message); }

  // 4. Test Delivery Associates API
  console.log('\n4. Testing GET /admin/delivery-associates...');
  try {
    const daRes = await fetch(`${API_BASE}/admin/delivery-associates?limit=1`, { headers });
    if (daRes.ok) {
        const daData = await daRes.json();
        console.log(`✓ Success: Found ${daData.data.pagination.total} delivery associates`);
    } else {
        console.error('✗ Failed:', await daRes.text());
    }
  } catch (e) { console.error('✗ Error:', e.message); }

  console.log('\n--- Verification Complete ---');
}

testEntityAPIs();
