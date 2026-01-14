
const mongoose = require('mongoose');

const API_BASE = "http://localhost:3001/api/v1";
const MONGODB_URI = "mongodb+srv://aneridelxn_db_user:YhZGkF6u2pEeVyvJ@farmferry-db.11sfqjg.mongodb.net/farmferry_data?retryWrites=true&w=majority";

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function title(msg) {
  console.log("\n" + colors.cyan + "=".repeat(50));
  console.log(` ${msg}`);
  console.log("=".repeat(50) + colors.reset);
}

async function request(method, endpoint, body = null, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  try {
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const text = await res.text();
    try {
        const data = JSON.parse(text);
        return { status: res.status, data };
    } catch (e) {
        return { status: res.status, data: { success: false, error: `Invalid JSON: ${text.substring(0, 300)}...` } };
    }
  } catch (error) {
    return { status: 500, data: { success: false, error: error.message } };
  }
}

// Helper to get OTP from DB
async function getOtpFromDb(phone) {
    // Retry a few times as DB update might be slightly delayed
    for(let i=0; i<5; i++) {
        const doc = await mongoose.connection.collection("customers").findOne({ phone });
        if(doc && doc.phoneOTP) return doc.phoneOTP;
        await new Promise(r => setTimeout(r, 1000));
    }
    return null;
}

// Main Flow
async function runOrderTest() {
  log(`Targeting API: ${API_BASE}`, colors.yellow);
  
  // Connect DB
  try {
      await mongoose.connect(MONGODB_URI);
      log("✅ DB Connected (for OTP)", colors.green);
  } catch(e) {
      log(`❌ DB Fail: ${e.message}`, colors.red);
      process.exit(1);
  }

  try {
      // 1. SETUP: Create Supplier & Product
      title("PHASE 1: SUPPLIER SETUP");
      const timestamp = Date.now();
      const suppEmail = `supp_ord_${timestamp}@test.com`;
      const suppPass = "password123";
      const suppPhone = "55" + Math.floor(10000000 + Math.random() * 90000000);
      
      log(`Creating Supplier: ${suppEmail}`);
      const regSuppRes = await request("POST", "/supplier/auth/register", {
          ownerName: "Order Tester",
          email: suppEmail,
          phone: suppPhone,
          businessName: "OrderTestBiz_" + timestamp,
          password: suppPass
      });
      
      let suppToken = null;
      if(regSuppRes.status === 201) {
          suppToken = regSuppRes.data.data.accessToken;
          log("  ✅ Supplier Registered", colors.green);
      } else {
          log(`  ❌ Supplier Register Failed: ${JSON.stringify(regSuppRes.data)}`, colors.red);
          // Try Login if exists
      }

      // Need a valid category ID for product. Let's try to fetch one or insert directly via Mongoose if needed?
      // Inserting via Mongoose is safest to guarantee environment state.
      // But we should use API if possible.
      // Let's create a category via DB to be safe and fast.
      const catId = new mongoose.Types.ObjectId();
      await mongoose.connection.collection("categories").insertOne({
          _id: catId,
          name: "TestCategory_" + timestamp,
          slug: "test-cat-" + timestamp,
          image: "http://example.com/img.png",
          isActive: true
      });
      log(`  ✅ Created Temp Category in DB: ${catId}`);

      let productId = null;
      let supplierId = null;

      if(suppToken) {
          // Get Profile to get ID
          const profRes = await request("GET", "/supplier/profile", null, suppToken);
          if(profRes.status === 200) supplierId = profRes.data.data.supplier._id;

          // Create Product
          const prodRes = await request("POST", "/supplier/products", {
              name: "Test Product " + timestamp,
              description: "For Order Test",
              price: 100,
              stockQuantity: 50,
              categoryId: catId.toString(),
              status: "Active",
              sku: "SKU_" + timestamp,
              images: [{ url: "http://example.com/p.png", publicId: "123", isMain: true }] // Mock image
          }, suppToken);

          if(prodRes.status === 201) {
              productId = prodRes.data.data._id;
              log("  ✅ Product Created", colors.green);
          } else {
              log(`  ❌ Product Create Failed: ${JSON.stringify(prodRes.data)}`, colors.red);
          }
      }

      if(!productId) {
          log("❌ Cannot proceed without Product. Aborting.", colors.red);
          return;
      }

      // 2. SETUP: Create Customer
      title("PHASE 2: CUSTOMER SETUP");
      const custPhone = "66" + Math.floor(10000000 + Math.random() * 90000000); // Strings for phone
      log(`Creating Customer Phone: ${custPhone}`);

      // Send OTP
      await request("POST", "/auth/login/send-otp", { phone: custPhone });
      const otp = await getOtpFromDb(custPhone);
      
      let custToken = null;
      let customerId = null;

      if(otp) {
          log(`  ✅ Got OTP: ${otp}`, colors.green);
          const verifyRes = await request("POST", "/auth/login/verify-otp", { phone: custPhone, otp });
          if(verifyRes.status === 200) {
              custToken = verifyRes.data.data.accessToken;
              customerId = verifyRes.data.data.customer._id;
              log("  ✅ Customer Logged In", colors.green);
              
              // Wait for profile propagation if async (unlikely but safe)
              await new Promise(r => setTimeout(r, 2000));
              
              // Create Address (Required for Order)
              const addrRes = await request("POST", "/customer/addresses", {
                  street: "Order St",
                  city: "OrdCity",
                  state: "ST",
                  postalCode: "10000",
                  country: "Land",
                  type: "Home",
                  phone: custPhone,
                  isDefault: true
              }, custToken);
              
              if(addrRes.status !== 201) log(`  ⚠️ Address creation warning: ${JSON.stringify(addrRes.data)}`, colors.yellow);
          } else {
              log(`  ❌ Login Failed: ${JSON.stringify(verifyRes.data)}`, colors.red);
          }
      } else {
          log("  ❌ Could not retrieve OTP", colors.red);
          return;
      }

      // 3. ORDER FLOW
      title("PHASE 3: ORDER LIFECYCLE");
      
      if(custToken && productId) {
          // A. Create Order
          log("[POST] Creating Order...");
          const orderPayload = {
              supplier: supplierId,
              items: [{ product: productId, quantity: 2 }],
              deliveryAddress: { street: "123 Test", city: "Test", state: "TS", postalCode: "000", country: "IN" }, // Payload might expect full object or ID? 
              // Schema usually expects object structure if embedded. Let's send object.
              paymentMethod: "COD",
              isExpressDelivery: false
          };
          
          const createRes = await request("POST", "/orders", orderPayload, custToken);
          let orderId = null;
          
          if(createRes.status === 201) {
              orderId = createRes.data.order._id;
              log("  ✅ Order Created: " + orderId, colors.green);
          } else {
              log(`  ❌ Create Order Failed: ${createRes.status} - ${JSON.stringify(createRes.data)}`, colors.red);
          }

          // B. List Orders (Customer)
          if(orderId) {
             const listRes = await request("GET", "/orders?limit=5", null, custToken);
             if(listRes.status === 200) {
                 const found = listRes.data.data.orders.find(o => o._id === orderId);
                 if(found) log("  ✅ Order found in List", colors.green);
                 else log("  ⚠️ Order NOT found in List", colors.yellow);
             } else {
                 log(`  ❌ List Orders Failed: ${listRes.status}`, colors.red);
             }

             // C. Get Details
             const detailRes = await request("GET", `/orders/${orderId}`, null, custToken);
             if(detailRes.status === 200) {
                 log("  ✅ Order Details Fetched", colors.green);
             } else {
                 log(`  ❌ Order Details Failed: ${detailRes.status}`, colors.red);
             }

             // D. Update Status (Supplier)
             log("\n[PATCH] Updating Status (Supplier)...");
             const updateRes = await request("PATCH", `/orders/${orderId}`, { status: "processing", note: "Test Update" }, suppToken);
             if(updateRes.status === 200) {
                 log("  ✅ Order Status Updated to 'processing'", colors.green);
             } else {
                  log(`  ❌ Update Status Failed: ${updateRes.status} - ${JSON.stringify(updateRes.data)}`, colors.red);
             }
             
             // E. Verify Update (Customer)
             const verifyUpdate = await request("GET", `/orders/${orderId}`, null, custToken);
             if(verifyUpdate.status === 200 && verifyUpdate.data.order.status === "processing") {
                 log("  ✅ Status Change Verified by Customer", colors.green);
             } else {
                 log("  ⚠️ Status Change verification failed", colors.yellow);
             }
          }
      }

  } catch(e) {
      log(`FATAL ERROR: ${e.message}`, colors.red);
  } finally {
      await mongoose.disconnect();
      log("\nDB Disconnected", colors.cyan);
  }
}

runOrderTest();
