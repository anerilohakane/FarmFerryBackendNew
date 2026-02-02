const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api/v1';

async function testCustomerAPI() {
  console.log('Testing Customer API...');
  
  // Login first to get token
  const loginRes = await fetch(`${API_BASE}/superadmin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@farmferry.com', password: 'password123' })
  });
  
  const loginData = await loginRes.json();
  const token = loginData.token;
  
  if (!token) {
    console.error('Failed to get token');
    return;
  }

  const res = await fetch(`${API_BASE}/admin/customers?page=1&limit=10&search=`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text);
}

testCustomerAPI();
