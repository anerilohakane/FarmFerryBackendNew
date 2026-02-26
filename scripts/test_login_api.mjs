


const BASE_URL = 'http://localhost:3001/api/v1';
const PHONE = '9156148083';
const OTP = '123456';

async function runTest() {
    console.log(`\n--- Testing Login Flow for ${PHONE} ---`);

    // 1. Send OTP
    try {
        console.log(`\n[1] Sending OTP to ${PHONE}...`);
        const sendRes = await fetch(`${BASE_URL}/auth/login/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: PHONE })
        });

        const text = await sendRes.text();
        console.log(`Status: ${sendRes.status}`);
        console.log('Raw Body:', text);
        let sendData;
        try {
            sendData = JSON.parse(text);
        } catch (e) {
            console.error('Failed to parse JSON:', e.message);
            return;
        }
        console.log(`Status: ${sendRes.status}`);
        console.log('Response:', JSON.stringify(sendData, null, 2));

        if (!sendRes.ok) {
            console.error('FAILED to send OTP');
            return;
        }
    } catch (e) {
        console.error('Network Error (Send OTP):', e.message);
        return;
    }

    // 2. Verify OTP
    try {
        console.log(`\n[2] Verifying OTP ${OTP}...`);
        const verifyRes = await fetch(`${BASE_URL}/auth/login/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: PHONE, otp: OTP })
        });

        const text = await verifyRes.text();
        console.log(`Status: ${verifyRes.status}`);
        console.log('Raw Body:', text);
        const verifyData = JSON.parse(text);

        if (verifyRes.ok) {
            console.log('\n✅ LOGIN SUCCESS!');
        } else {
            console.log('\n❌ LOGIN FAILED');
        }

    } catch (e) {
        console.error('Network Error (Verify OTP):', e.message);
    }
}

runTest();
