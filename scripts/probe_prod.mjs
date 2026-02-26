const fetch = require('node-fetch');

const API_BASE = 'https://farm-ferry-backend-new.vercel.app/api/v1';

async function probe() {
  console.log('Probing:', API_BASE);
  
  try {
    // 1. Check a public endpoint or root (expecting 404 or something, but connection should work)
    console.log('1. Pinging Root...');
    const rootRes = await fetch(API_BASE);
    console.log('Root Status:', rootRes.status);
    
    // 2. Try to Login (to check if DB connection works on prod)
    console.log('\n2. Attempting Login...');
    const loginRes = await fetch(`${API_BASE}/superadmin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@farmferry.com', password: 'password123' })
    });
    
    console.log('Login Status:', loginRes.status);
    const loginText = await loginRes.text();
    console.log('Login Body:', loginText.substring(0, 200)); // Truncate

    if (loginRes.ok) {
        // 3. If login worked, try customers (to check Auth Middleware on prod)
        const data = JSON.parse(loginText);
        const token = data.token;
        console.log('\n3. Testing Customers API with token...');
        const custRes = await fetch(`${API_BASE}/admin/customers?limit=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('Customers Status:', custRes.status);
        console.log('Customers Body:', (await custRes.text()).substring(0, 200));
    }

  } catch (e) {
    console.error('PROBE FAILED:', e.message);
  }
}

probe();
