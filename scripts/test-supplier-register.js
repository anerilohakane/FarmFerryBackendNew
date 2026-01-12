
// Using native fetch
// Since Node 18+ has native fetch, we can just use fetch directly.

async function testSupplierRegister() {
  const url = 'http://localhost:3001/api/v1/supplier/auth/register';
  
  // Randomize data to avoid duplicate key errors
  const randomStr = Math.random().toString(36).substring(7);
  const payload = {
    ownerName: `Test Owner ${randomStr}`,
    email: `testsupplier${randomStr}@example.com`,
    phone: `9${Math.random().toString().substring(2, 11)}`, // Random 10 digit phone
    businessName: `Test Business ${randomStr}`,
    password: "TestPassword123"
  };

  console.log('🚀 Testing Supplier Registration...');
  console.log('Sending Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    const fs = require('fs');
    fs.writeFileSync('scripts/debug_result.json', JSON.stringify({ status: response.status, body: data }, null, 2));

    console.log(`\n📡 Status Code: ${response.status}`);
    console.log('📄 Response Body:', JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      console.log('\n✅ TEST PASSED: Supplier registered successfully.');
    } else {
      console.log('\n❌ TEST FAILED: Registration failed.');
    }
  } catch (error) {
    const fs = require('fs');
    fs.writeFileSync('scripts/debug_result.json', JSON.stringify({ error: error.message }, null, 2));
    console.error('\n❌ TEST ERROR:', error);
  }
}

testSupplierRegister();
