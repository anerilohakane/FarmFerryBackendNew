const fetch = require('fs').existsSync('node_modules/node-fetch') ? require('node-fetch') : global.fetch;
const fs = require('fs');

async function run() {
    try {
        console.log("Fetching...");
        const res = await fetch('http://localhost:3000/api/v1/delivery/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: "test", password: "test" }),
            headers: { 'Content-Type': 'application/json' }
        });
        console.log("Status:", res.status);
        const text = await res.text();
        fs.writeFileSync('error_page.html', text);
        console.log("Saved to error_page.html");
    } catch (e) {
        console.error(e);
    }
}
run();
