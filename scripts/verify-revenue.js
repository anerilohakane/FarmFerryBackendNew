
// scripts/verify-revenue.js
const mongoose = require('mongoose');
const fs = require('fs');

const MONGODB_URI = "mongodb+srv://aneridelxn_db_user:YhZGkF6u2pEeVyvJ@farmferry-db.11sfqjg.mongodb.net/farmferry_data?retryWrites=true&w=majority";

async function runTest() {
  try {
    // 1. Get Token and Supplier ID
    // We assume generate-token.js was run and token.txt exists, but we need the Supplier ID to create a matching order.
    // Instead of parsing the token, let's just fetch the supplier from DB again using the same logic as generate-token.js
    
    // 1. Get Token
    if (!fs.existsSync('token.txt')) {
        console.error("token.txt not found."); process.exit(1);
    }
    const token = fs.readFileSync('token.txt', 'utf8').trim();
    const BASE_URL = 'http://localhost:3005/api/v1';

    // 2. Identify Supplier
    console.log("Fetching Supplier Profile...");
    const profileRes = await fetch(`${BASE_URL}/supplier/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const profileData = await profileRes.json();
    if (!profileData.success) {
        console.error("Failed to fetch profile:", profileData); process.exit(1);
    }
    console.log("Profile Data:", JSON.stringify(profileData.data));
    const supplierId = profileData.data.supplier._id || profileData.data.supplier.id;
    console.log("Authenticated as Supplier:", supplierId);

    await mongoose.connect(MONGODB_URI);
    console.log("Connected to DB...");


    // 2. Create a "Delivered" Order manually to ensure revenue exists
    // We need a customer too
    const CustomerSchema = new mongoose.Schema({}, { strict: false });
    const Customer = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
    const customer = await Customer.findOne({});
    
    // We need a product
    const ProductSchema = new mongoose.Schema({}, { strict: false });
    const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
    const product = await Product.findOne({ supplierId: supplier._id }) || await Product.findOne({});

    const OrderSchema = new mongoose.Schema({
        supplier: mongoose.Schema.Types.ObjectId,
        customer: mongoose.Schema.Types.ObjectId,
        totalAmount: Number,
        status: String,
        items: [],
        deliveryAddress: Object,
        paymentMethod: String,
        subtotal: Number
    }, { strict: false, timestamps: true });
    
    const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

    const TEST_AMOUNT = 1500;

    const testOrder = await Order.create({
        supplier: supplierId,
        customer: customer ? customer._id : new mongoose.Types.ObjectId(),
        totalAmount: TEST_AMOUNT,
        status: "delivered", // Critical for revenue
        paymentStatus: "paid",
        items: [{ product: product?._id, quantity: 1, price: TEST_AMOUNT, totalPrice: TEST_AMOUNT }],
        deliveryAddress: { city: "Test City" },
        paymentMethod: "cash_on_delivery",
        subtotal: TEST_AMOUNT,
        createdAt: new Date() // Today
    });

    console.log(`Created Test Order: ${testOrder._id} with Amount: ${TEST_AMOUNT}`);
    
    await mongoose.disconnect();
    // 3. Call API
    // Ensure token is fresh
    // Reuse token and BASE_URL from above
    console.log("Fetching Dashboard Stats...");
    try {
        const res = await fetch(`${BASE_URL}/supplier/dashboard/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
    
        if (data.success) {
            console.log("✅ API Success");
            console.log("Revenue Today:", data.data.revenue.today);
            console.log("Revenue Total:", data.data.revenue.total);
            
            if (data.data.revenue.today >= TEST_AMOUNT) {
                 console.log("✅ Revenue Logic Verified (Includes our test amount)");
            } else {
                 console.error("❌ Revenue mismatched! Expected at least " + TEST_AMOUNT + ", got " + data.data.revenue.today);
            }
        } else {
            console.error("❌ API Failed:", data);
        }
    } catch(fetchErr) {
        console.error("API Fetch Error:", fetchErr);
    }

  } catch(err) {
    if (err.name === 'ValidationError') {
        console.error("VALIDATION ERROR:", JSON.stringify(err.errors, null, 2));
    } else {
        console.error("Test Error:", err);
    }
  }
  process.exit(0);
}

runTest();
