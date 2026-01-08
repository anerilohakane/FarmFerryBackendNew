// Native fetch is available in Node 18+

const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_PHONE = '9876543211';
const DUMMY_OTP = '123456';

async function runTests() {
    console.log('🚀 Starting API Tests...\n');

    try {
        // ---------------------------------------------------------
        // 1. AUTH FLOW (Login/Register)
        // ---------------------------------------------------------
        console.log('1️⃣  Testing Auth (Send OTP)...');
        const sendOtpRes = await fetch(`${BASE_URL}/auth/login/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: TEST_PHONE })
        });

        if (!sendOtpRes.ok) throw new Error(`Send OTP failed: ${sendOtpRes.status}`);
        console.log('   ✅ OTP sent (User created/found).');

        console.log('2️⃣  Testing Auth (Verify OTP)...');
        const verifyOtpRes = await fetch(`${BASE_URL}/auth/login/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: TEST_PHONE, otp: DUMMY_OTP })
        });

        const verifyData = await verifyOtpRes.json();
        if (!verifyData.success) throw new Error(`Verify OTP failed: ${verifyData.message}`);

        const token = verifyData.data.accessToken;
        console.log('   ✅ Logged in! Token received.');
        console.log(`   role: ${verifyData.data.customer.role}`);

        const HEADERS = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        // ---------------------------------------------------------
        // 2. CUSTOMER PROFILE
        // ---------------------------------------------------------
        console.log('\n3️⃣  Testing GET Profile...');
        const profileRes = await fetch(`${BASE_URL}/customer`, { headers: HEADERS });
        const profileData = await profileRes.json();
        console.log('   Result:', profileData.success ? 'OK' : profileData.error);
        if (profileData.data?.phone !== TEST_PHONE) console.warn('   ⚠️ Phone mismatch');

        console.log('\n4️⃣  Testing PUT Profile...');
        const updateRes = await fetch(`${BASE_URL}/customer`, {
            method: 'PUT',
            headers: HEADERS,
            body: JSON.stringify({ firstName: 'Test', lastName: 'User' })
        });
        const updateData = await updateRes.json();
        console.log('   Result:', updateData.success ? 'OK' : updateData.error);
        console.log('   Updated Name:', updateData.data?.firstName);

        // ---------------------------------------------------------
        // 3. ADDRESS BOOK
        // ---------------------------------------------------------
        console.log('\n5️⃣  Testing POST Address...');
        const addressRes = await fetch(`${BASE_URL}/customer/addresses`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({
                name: "Home",
                type: "home",
                street: "123 Farm Lane",
                city: "Tech City",
                state: "CA",
                postalCode: "90000",
                country: "USA",
                phone: TEST_PHONE
            })
        });
        const addressData = await addressRes.json();
        console.log('   Result:', addressData.success ? 'OK' : addressData.error);
        const newAddressId = addressData.data?._id;

        console.log('\n6️⃣  Testing GET Addresses...');
        const listAddrRes = await fetch(`${BASE_URL}/customer/addresses`, { headers: HEADERS });
        const listAddrData = await listAddrRes.json();
        console.log(`   Found ${listAddrData.data?.length} addresses.`);

        if (newAddressId) {
            console.log('\n7️⃣  Testing DELETE Address...');
            const deleteRes = await fetch(`${BASE_URL}/customer/addresses/${newAddressId}`, {
                method: 'DELETE',
                headers: HEADERS
            });
            const deleteData = await deleteRes.json();
            console.log('   Result:', deleteData.success ? 'OK' : deleteData.error);
        }

        // ---------------------------------------------------------
        // 4. CATEGORIES
        // ---------------------------------------------------------
        console.log('\n8️⃣  Testing GET Categories (Public)...');
        const catRes = await fetch(`${BASE_URL}/category`);
        const catData = await catRes.json();
        console.log('   Result:', catData.success ? 'OK' : catData.error);
        console.log(`   Found ${catData.data?.length} categories.`);

        console.log('\n9️⃣  Testing POST Category (Admin Protected)...');
        // Expecting 403 Forbidden because we are a customer
        const createCatRes = await fetch(`${BASE_URL}/category`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({ name: "Test Category" })
        });

        if (createCatRes.status === 403) {
            console.log('   ✅ Correctly blocked (403 Forbidden).');
        } else {
            console.log(`   ⚠️ Unexpected status: ${createCatRes.status}`);
            const d = await createCatRes.json();
            console.log(d);
        }

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
    }
}

runTests();
