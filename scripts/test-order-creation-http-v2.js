const dotenv = require('dotenv');
const path = require('path');
// Manually load env
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Use backend port directly
const BASE_URL = 'http://localhost:3001/api/v1';
const TEST_PHONE = '9876543211';
const DUMMY_OTP = '123456';

async function run() {
    let mongooseConnection;
    try {
        console.log("1. Authenticating Customer...");
        console.log("   Sending OTP...");
        const res1 = await fetch(`${BASE_URL}/auth/login/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: TEST_PHONE })
        });
        console.log("   OTP Status:", res1.status);

        if (!res1.ok) {
            const txt = await res1.text();
            console.log("   ❌ Error Body:", txt);
            throw new Error(`Send OTP failed: ${res1.status}`);
        }

        console.log("   Verifying OTP...");
        const verifyRes = await fetch(`${BASE_URL}/auth/login/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: TEST_PHONE, otp: DUMMY_OTP })
        });
        console.log("   Verify Status:", verifyRes.status);

        const verifyText = await verifyRes.text();
        let verifyData;
        try {
            verifyData = JSON.parse(verifyText);
        } catch (err) {
            console.error("   ❌ Failed to parse Verify Response:", verifyText);
            throw new Error("Invalid JSON from Verify OTP");
        }

        if (!verifyData.success) {
            console.error("   ❌ Verify Data Success=false", verifyData);
            throw new Error("Login failed");
        }

        const token = verifyData.data.accessToken;
        console.log("   Logged in.");

        const HEADERS = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

        // 2. Find a Product (Hybrid: DB Lookup)
        console.log("2. Finding Product (via DB)...");
        const mongoose = require('mongoose');
        const MONGODB_URI = process.env.MONGODB_URI;
        if (!MONGODB_URI) throw new Error("MONGODB_URI not found in env");

        mongooseConnection = await mongoose.connect(MONGODB_URI);
        const ProductSchema = new mongoose.Schema({}, { strict: false });
        const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

        // Find a valid product (in stock)
        const productDoc = await Product.findOne({ stockQuantity: { $gt: 0 } });

        if (!productDoc) throw new Error("No products in DB");
        const product = { _id: productDoc._id, price: productDoc.price, name: productDoc.name, supplierId: productDoc.supplier };
        console.log(`   Found: ${product.name} (${product._id}) - Supplier: ${product.supplierId}`);

        // 3. Create Order
        console.log("3. Creating Order...");
        const orderPayload = {
            supplier: product.supplierId,
            items: [
                { product: product._id, quantity: 1 }
            ],
            deliveryAddress: {
                street: "123 Order St",
                city: "Order City",
                state: "OS",
                postalCode: "10000",
                country: "India",
                phone: TEST_PHONE
            },
            paymentMethod: "cash_on_delivery"
        };

        const orderRes = await fetch(`${BASE_URL}/orders`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify(orderPayload)
        });

        console.log("   Order Response Status:", orderRes.status);

        const orderText = await orderRes.text();
        console.log("   Order Response Body:", orderText.substring(0, 500)); // Log first 500 chars

        let orderData;
        try {
            orderData = JSON.parse(orderText);
        } catch (e) {
            console.error("   ❌ Failed to parse Order Response as JSON");
            throw new Error(`Invalid JSON from Create Order: ${orderRes.status}`);
        }

        // Close DB before returning/exiting
        await mongoose.disconnect();

        if (orderData.success) {
            console.log("✅ Order Created Successfully!");
            console.log(`   Order ID: ${orderData.order?._id || orderData.data?._id}`);
        } else {
            console.error("❌ Order Creation Failed structure:", JSON.stringify(orderData, null, 2));
            throw new Error(orderData.message || "Order creation failed");
        }

    } catch (e) {
        console.error("❌ Test Failed:", e);
        if (mongooseConnection) {
            const mongoose = require('mongoose');
            await mongoose.disconnect();
        }
        process.exit(1);
    }
}
run();
