const API_BASE_URL = 'https://farm-ferry-backend-new.vercel.app/api/v1';

async function testAdminLoginFlow() {
  const timestamp = Date.now();
  const email = `prod_test_${timestamp}@example.com`;
  const password = 'password123';
  
  console.log(`\n--- 1. Registering Admin on Production [${email}] ---`);
  
  try {
    const regRes = await fetch(`${API_BASE_URL}/auth/register/admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: "ProdTest",
        lastName: "User",
        email,
        password,
        phone: "9876543210"
      })
    });
    
    console.log(`Registration Status: ${regRes.status}`);
    const regData = await regRes.json();
    console.log('Reg Success:', regData.success);
    
    if (!regRes.ok) {
        console.error("Registration failed:", regData.message);
        return;
    }

    console.log(`\n--- 2. Logging in with new credentials ---`);
    const loginRes = await fetch(`${API_BASE_URL}/auth/login/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password
        })
    });

    console.log(`Login Status: ${loginRes.status}`);
    const loginData = await loginRes.json();
    console.log('Login Success:', loginData.success);
    if (loginData.accessToken) console.log('Token received: YES');
    else console.log('Token received: NO');
    console.log('Message:', loginData.message);

  } catch (error) {
    console.error('Fatal Error:', error);
  }
}

testAdminLoginFlow();
