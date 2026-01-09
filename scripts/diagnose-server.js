// using global fetch

async function test() {
    try {
        const res = await fetch('http://localhost:3000/api/v1/supplier/orders', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Content (first 200 chars): ${text.substring(0, 200)}`);
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

test();
