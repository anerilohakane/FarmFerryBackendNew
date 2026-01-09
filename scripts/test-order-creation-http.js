const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_PHONE = '9876543211';
const DUMMY_OTP = '123456';

async function run() {
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
             console.log(await res1.text());
             throw new Error("Send OTP failed");
        }

        console.log("   Verifying OTP...");
        const verifyRes = await fetch(`${BASE_URL}/auth/login/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: TEST_PHONE, otp: DUMMY_OTP })
        });
        console.log("   Verify Status:", verifyRes.status);
        const verifyData = await verifyRes.json();
        if (!verifyData.success) throw new Error("Login failed");
        const token = verifyData.data.accessToken;
        console.log("   Logged in.");

        const HEADERS = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

        // 2. Find a Product (Hybrid: DB Lookup)
        console.log("2. Finding Product (via DB)...");
        const mongoose = require('mongoose');
        const MONGODB_URI = "mongodb+srv://aneridelxn_db_user:YhZGkF6u2pEeVyvJ@farmferry-db.11sfqjg.mongodb.net/farmferry_data?retryWrites=true&w=majority";
        await mongoose.connect(MONGODB_URI);
        const ProductSchema = new mongoose.Schema({}, { strict: false });
        const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
        const productDoc = await Product.findOne({});
        await mongoose.disconnect();
        
        if (!productDoc) throw new Error("No products in DB");
        const product = { _id: productDoc._id, price: productDoc.price, name: productDoc.name, supplierId: productDoc.supplierId };
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
        const orderData = await orderRes.json();
        
        if (orderData.success) {
            console.log("✅ Order Created Successfully!");
            console.log(`   Order ID: ${orderData.data.orderId}`);
            console.log(`   Total: ${orderData.data.totalAmount}`);
        } else {
            console.error("❌ Order Creation Failed:", orderData);
            const fs = require('fs');
            fs.writeFileSync('order_error.txt', JSON.stringify(orderData, null, 2));
            throw new Error(orderData.message);
        }

    } catch (e) {
        console.error("❌ Test Failed:", e);
        process.exit(1);
    }
}
run();
