const fetch = require('node-fetch');

async function testAdminRegistration() {
  const url = 'http://localhost:3000/api/v1/auth/register/admin';
  const payload = {
    firstName: "Test",
    lastName: "Admin",
    email: `testadmin_${Date.now()}@example.com`, // Unique email
    password: "password123",
    phone: "1234567890"
  };

  try {
    console.log(`Sending POST request to ${url}...`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const contentType = response.headers.get("content-type");
    let data;
    if (contentType && contentType.includes("application/json")) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      console.log('✅ Admin Registration Test Passed');
    } else {
      console.log('❌ Admin Registration Test Failed');
    }

  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testAdminRegistration();
