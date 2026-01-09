const bcrypt = require('bcryptjs');

async function test() {
    try {
        console.log("Hashing...");
        const hash = await bcrypt.hash("password", 10);
        console.log("Hash:", hash);
        const match = await bcrypt.compare("password", hash);
        console.log("Match:", match);
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
