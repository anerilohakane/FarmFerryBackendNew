// Node 18+ has built-in fetch. Removing dependency.

const BASE_URL = 'http://localhost:3001/api/v1';

async function testDashboardAPI() {
  try {
    console.log('1. Registering/Logging in Super Admin...');
    
    // Test Credentials
    const credentials = {
      email: 'superadmin_test@farmferry.com',
      password: 'password123',
      name: 'Test SuperAdmin',
      phone: '1234567890',
      company: 'Test Corp'
    };

    let token;

    // Try Login first
    let loginRes = await fetch(`${BASE_URL}/superadmin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password
      })
    });

    if (loginRes.status === 401 || loginRes.status === 404 || loginRes.status === 500) {
       console.log(`   Login failed with ${loginRes.status}. Attempting Registration...`);
       // Try Register if login fails
       const registerRes = await fetch(`${BASE_URL}/superadmin/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
       });
       
       console.log(`   Register Status: ${registerRes.status}`);
       const registerText = await registerRes.text();
       try {
          registerData = JSON.parse(registerText);
       } catch (e) {
          console.log('   Register JSON Error. Check error_response.html');
          const fs = require('fs');
          fs.writeFileSync('error_response.html', registerText);
          throw new Error('Registration returned invalid JSON');
       }
       if (!registerRes.ok) {
         throw new Error(`Registration failed: ${registerData.message}`);
       }
       token = registerData.token;
       console.log('   Registration successful.');
    } else if (loginRes.ok) {
      const loginData = await loginRes.json();
      token = loginData.token;
      console.log('   Login successful.');
    } else {
       const errText = await loginRes.text();
       console.log('   Login Error Body:', errText.substring(0, 200));
       throw new Error(`Login failed with status ${loginRes.status}`);
    }

    if (!token) throw new Error('No token received');

    console.log('\n2. Testing Dashboard Stats API...');
    const statsRes = await fetch(`${BASE_URL}/superadmin/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const statsData = await statsRes.json();
    
    if (statsRes.ok) {
      console.log('   SUCCESS: API returned 200 OK');
      console.log('   Data structure check:');
      console.log('   - Revenue Today:', statsData.data.revenue?.today);
      console.log('   - Total Orders:', statsData.data.orders?.total);
      console.log('   - Active Products:', statsData.data.products?.active);
      console.log('   - Recent Orders Count:', statsData.data.recentOrders?.length);
      console.log('\n   Full Response Summary:', JSON.stringify(statsData.data, null, 2));
    } else {
      console.error('   FAILED: API returned', statsRes.status);
      console.error('   Error:', statsData);
    }

  } catch (error) {
    console.error('Test Failed:', error.message);
  }
}

testDashboardAPI();
