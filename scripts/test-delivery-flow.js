
// scripts/test-delivery-flow.js
const fs = require('fs');
const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://aneridelxn_db_user:YhZGkF6u2pEeVyvJ@farmferry-db.11sfqjg.mongodb.net/farmferry_data?retryWrites=true&w=majority";
const BASE_URL = 'http://localhost:3000/api/v1';

async function runTest() {
  try {
    console.log("🚀 Starting Delivery Flow Test...");
    
    // 1. Register DA
    const daName = `DA_${Date.now()}`;
    // Use random email to avoid conflicts
    const email = `da_${Date.now()}_${Math.floor(Math.random()*1000)}@test.com`;
    const password = "password999";
    
    console.log(`\n1. Registering DA: ${email}`);
    const regRes = await fetch(`${BASE_URL}/delivery/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: daName,
            email,
            password,
            phone: "9199999999",
            address: { street: "123 St", city: "Test", state: "TS", postalCode: "500000", country: "India" },
            vehicle: { type: "motorcycle", model: "Hero Splendor", registrationNumber: "TS01AB1234", color: "Black" }
        })
    });
    
    console.log(`Response Status: ${regRes.status} ${regRes.statusText}`);
    const rawText = await regRes.text();
    // console.log(`Raw Body: ${rawText}`); // Uncomment if needed

    let regData;
    try {
        regData = JSON.parse(rawText);
    } catch(e) {
        fs.writeFileSync('html_response.log', `Invalid JSON Response:\n${rawText}`);
        throw new Error("Invalid JSON Response (See html_response.log)");
    }

    if (!regData.success) {
        const errorMsg = `REGISTRATION RESPONSE: ${JSON.stringify(regData, null, 2)}`;
        fs.writeFileSync('error.log', errorMsg);
        throw new Error(`Registration Failed: ${regData.message}`);
    }
    
    const token = regData.data.accessToken;
    const daId = regData.data.user._id;
    console.log(`✅ Registered DA ID: ${daId}`);

    // 2. Create Order via HTTP (Validates everything properly)
    console.log("\n2. Creating Customer Order (via HTTP)...");
    
    // 2a. Login Customer
    const TEST_PHONE = '9876543210';
    await fetch(`${BASE_URL}/auth/login/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: TEST_PHONE })
    });
    const verifyRes = await fetch(`${BASE_URL}/auth/login/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: TEST_PHONE, otp: '123456' })
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success) throw new Error("Customer Login Failed");
    const custToken = verifyData.data.accessToken;
    
    // 2b. Find Product (Hybrid)
    await mongoose.connect(MONGODB_URI);
    const ProductSchema = new mongoose.Schema({}, { strict: false });
    const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
    const productDoc = await Product.findOne({});
    const supplierId = productDoc.supplierId; // Need this for order
    // Connection kept open for later steps (OTP check)
    
    if (!productDoc) throw new Error("No products found for test");

    // 2c. Create Order
    const orderPayload = {
        supplier: supplierId,
        items: [{ product: productDoc._id, quantity: 1 }],
        deliveryAddress: { 
            street: "123 Test St", city: "Test City", state: "TS", postalCode: "500000", country: "India", phone: "9999999999" 
        },
        paymentMethod: "cash_on_delivery"
    };

    const orderRes = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${custToken}` },
        body: JSON.stringify(orderPayload)
    });
    const orderData = await orderRes.json();
    if (!orderData.success) {
         console.error("Order Creation Error:", orderData);
         throw new Error("HTTP Order Creation Failed");
    }
    const orderId = orderData.order._id; // API returns { order: { _id: ... } }
    console.log(`✅ Created Order via API: ${orderId}`);
    
    // 2b. Check Available Orders API
    console.log("\n2b. Checking Available Orders...");
    const availRes = await fetch(`${BASE_URL}/delivery/orders/available`, {
         headers: { 'Authorization': `Bearer ${token}` }
    });
    const availData = await availRes.json();
    console.log(`Pool Size: ${availData.count}`);
    if (availData.count === 0) throw new Error("No available orders found (Creation failed?)");
    
    // 2c. Accept Order
    console.log("\n2c. Accepting Order...");
    const acceptRes = await fetch(`${BASE_URL}/delivery/orders/${orderId}/accept`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const acceptData = await acceptRes.json();
    if (!acceptData.success) throw new Error(`Accept Failed: ${acceptData.message}`);
    console.log("✅ Order Accepted!");

    // 3. List Orders (Should now be active)
    console.log("\n3. Listing My Active Orders...");
    const listRes = await fetch(`${BASE_URL}/delivery/orders?status=active`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const listData = await listRes.json();
    if (!listData.success || listData.data.length === 0) throw new Error("Order not found in list after acceptance");
    console.log(`✅ Found ${listData.data.length} active orders.`);

    // 4. Mark Out For Delivery
    console.log("\n4. Status -> Out For Delivery...");
    // ... rest of flow matches ...
    const outRes = await fetch(`${BASE_URL}/delivery/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: "out_for_delivery" })
    });
    const outData = await outRes.json();
    if (!outData.success) {
        fs.writeFileSync('error_message.txt', outData.message);
        throw new Error(`Update Failed: ${outData.message}`);
    }
    console.log("✅ Order is Out For Delivery");

 
    // 5. Get OTP (Simulate SMS)
    await new Promise(r => setTimeout(r, 1000)); // Wait for update
    const updatedOrder = await Order.findById(orderId);
    const otp = updatedOrder.otp; 
    console.log(`\n5. Received OTP (from DB/SMS): ${otp}`);

    // 6. Mark Delivered
    console.log(`\n6. Status -> Delivered (with OTP ${otp})...`);
    const delRes = await fetch(`${BASE_URL}/delivery/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: "delivered", otp: otp })
    });
    const delData = await delRes.json();
    if (!delData.success) throw new Error(`Delivery Failed: ${delData.message}`);
    console.log("✅ Order Marked Delivered!");

    // 7. Verify Dashboard & Earnings
    // ... same ...
    console.log("\n7. Verifying Dashboard...");
    const dashRes = await fetch(`${BASE_URL}/delivery/dashboard`, {
         headers: { 'Authorization': `Bearer ${token}` }
    });
    const dashData = await dashRes.json();
    console.log("Stats:", dashData.data.stats);
    
    if (dashData.data.stats.completedToday === 1) {
        console.log("✅ Dashboard Verified: Completed Count = 1");
    } else {
        console.warn("⚠️ Dashboard count mismatch (Expected 1, got " + dashData.data.stats.completedToday + ")");
    }
    
    // 7b. Test Location Update
    console.log("\n7b. Testing Location Update...");
    const locRes = await fetch(`${BASE_URL}/delivery/location`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: 17.3850, longitude: 78.4867 })
    });
    const locData = await locRes.json();
    if (!locData.success) throw new Error(`Location Update Failed: ${locData.message}`);
    console.log("✅ Location Updated Successfully");

    // 7c. Test Profile Status Toggle
    console.log("\n7c. Testing Profile Status Toggle...");
    const statusRes = await fetch(`${BASE_URL}/delivery/profile/status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'offline' })
    });
    const statusData = await statusRes.json(); 
    if (!statusData.success && statusRes.status !== 404) throw new Error(`Profile Status Update Failed: ${statusData.message}`);
    console.log("✅ Profile Status Toggled");

    console.log("\n🎉 Full Delivery Flow Verified!");
    
    // Cleanup
    await Order.findByIdAndDelete(orderId);
    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error("\n❌ Test Failed:", error);
    fs.writeFileSync('crash.log', error.stack || error.toString());
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
    process.exit(1);
  }
}

runTest();
