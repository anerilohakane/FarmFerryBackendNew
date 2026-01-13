async function testAdminRegistration() {
  const url = 'http://127.0.0.1:3000/api/v1/auth/register/admin';
  const payload = {
    firstName: "TestNative",
    lastName: "Admin",
    email: `testadmin_native_${Date.now()}@example.com`,
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

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const text = await response.text();
    try {
        const json = JSON.parse(text);
        console.log('Response JSON:', JSON.stringify(json, null, 2));
    } catch (e) {
        console.log('Response Text:', text);
    }

  } catch (error) {
    console.error('Network Error:', error);
  }
}

testAdminRegistration();
