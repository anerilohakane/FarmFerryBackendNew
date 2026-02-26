
const fs = require('fs');
const path = require('path');

// Manually load env for local testing
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
    console.log('Loaded .env.local');
} catch (e) {
    console.log('Could not load .env.local', e.message);
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1';

async function runTest() {
  console.log('---------------------------------------------------');
  console.log('      TESTING PAYMENT APIS');
  console.log('---------------------------------------------------');
  console.log(`Base URL: ${BASE_URL}`);

  let token;
  const adminEmail = 'superadmin@farmferry.com';
  const adminPassword = 'superpassword123'; 
  
  // 1. Authenticate (using existing flow logic)
  try {
     console.log('\n1. Logging in as Super Admin...');
     const loginRes = await fetch(`${BASE_URL}/superadmin/auth/login`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email: adminEmail, password: adminPassword })
     });

     if (loginRes.ok) {
        const data = await loginRes.json();
        token = data.token;
        console.log('   Login Successful. Token:', token.substring(0, 20) + '...');
     } else {
         // Try to register if login fails (as per previous test logic)
         console.log('   Login failed, attempting registration...');
         await fetch(`${BASE_URL}/superadmin/auth/register`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                 name: 'Super Admin Test',
                 email: adminEmail,
                 password: adminPassword,
                 phone: '9999999999',
                 company: 'FarmFerry Test'
             })
         });
         
         const relogin = await fetch(`${BASE_URL}/superadmin/auth/login`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ email: adminEmail, password: adminPassword })
         });
         const data = await relogin.json();
         token = data.token;
         console.log('   Login Successful (after reg). Token:', token.substring(0, 20) + '...');
     }
  } catch (e) {
      console.error('   Authentication Failed:', e.message);
      process.exit(1);
  }

  const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
  };

  // 2. Test Customer Payments (Orders)
  try {
      console.log('\n2. Testing Customer Payments (GET /payments)...');
      const res = await fetch(`${BASE_URL}/payments?limit=5`, { headers });
      console.log('   Status:', res.status);
      if (res.ok) {
          const data = await res.json();
          console.log(`   Fetched ${data.data.records.length} payment records.`);
          if (data.data.records.length > 0) {
              console.log('   Sample:', JSON.stringify(data.data.records[0]).substring(0, 100) + '...');
          }
      } else {
          console.log('   Error:', await res.text());
      }
  } catch (e) {
      console.log('   Test Fail:', e.message);
  }

  // 3. Test Delivery Payments
  try {
      console.log('\n3. Testing Delivery Payments (GET /delivery-payments)...');
      const res = await fetch(`${BASE_URL}/delivery-payments`, { headers });
      console.log('   Status:', res.status);
      const data = await res.json();
      
      if (res.ok) {
           console.log(`   Fetched ${data.data.records.length} pending payouts.`);
           
           if (data.data.records.length > 0) {
               const sample = data.data.records[0];
               console.log('   Sample:', JSON.stringify(sample).substring(0, 100));

               // 4. Test Pay Action
               console.log('\n4. Testing Delivery Pay Action (POST /delivery-payments/pay)...');
               const payRes = await fetch(`${BASE_URL}/delivery-payments/pay`, {
                   method: 'POST',
                   headers,
                   body: JSON.stringify({
                       associateId: sample.partner.id,
                       payoutId: sample.id,
                       status: 'processed',
                       notes: 'Test Payment via Script'
                   })
               });
               console.log('   Pay Status:', payRes.status);
               console.log('   Response:', await payRes.text());
           } else {
               console.log('   No payouts to test action on.');
           }
      } else {
          console.log('   Error:', await res.text());
      }
  } catch (e) {
      console.log('   Test Fail:', e.message);
  }

  // 5. Test Supplier Payments
  try {
      console.log('\n5. Testing Supplier Payments (GET /supplier-payments)...');
      const res = await fetch(`${BASE_URL}/supplier-payments`, { headers });
      console.log('   Status:', res.status);
      const data = await res.json();

      if (res.ok) {
          console.log(`   Fetched ${data.data.records.length} supplier payouts.`);
          
          if (data.data.records.length > 0) {
               const sample = data.data.records[0];
               console.log('   Sample:', JSON.stringify(sample).substring(0,100));
               
               // 6. Test Supplier Pay Action
               console.log('\n6. Testing Supplier Pay Action (POST /supplier-payments/pay)...');
               const payRes = await fetch(`${BASE_URL}/supplier-payments/pay`, {
                   method: 'POST',
                   headers,
                   body: JSON.stringify({
                       supplierId: sample.supplier.id,
                       payoutId: sample.id,
                       status: 'processed',
                       notes: 'Test Supplier Pay'
                   })
               });
               console.log('   Pay Status:', payRes.status);
               console.log('   Response:', await payRes.text());
          }
      } else {
           console.log('   Error:', await res.text());
      }
  } catch (e) {
      console.log('   Test Fail:', e.message);
  }
  
  // 7. Test Supplier Business Names
  try {
      console.log('\n7. Testing Business Names (GET /supplier-payments/business-names)...');
      const res = await fetch(`${BASE_URL}/supplier-payments/business-names`, { headers });
      console.log('   Status:', res.status);
      if (res.ok) {
          const data = await res.json();
          console.log(`   Fetched ${data.data.length} suppliers.`);
      }
  } catch (e) {
      console.log('   Test Fail:', e.message);
  }
}

runTest();
