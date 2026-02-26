
const mongoose = require('mongoose');

const API_BASE = "http://localhost:3001/api/v1";
const MONGODB_URI = "mongodb+srv://aneridelxn_db_user:YhZGkF6u2pEeVyvJ@farmferry-db.11sfqjg.mongodb.net/farmferry_data?retryWrites=true&w=majority";

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
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
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const options = {
      method,
      headers,
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const text = await res.text();
    
    try {
        const data = JSON.parse(text);
        return { status: res.status, data };
    } catch (e) {
        return { status: res.status, data: { success: false, error: `Invalid JSON: ${text.substring(0, 500)}...` } };
    }
  } catch (error) {
    return { status: 500, data: { success: false, error: error.message } };
  }
}

async function runTests() {
  log(`Targeting API: ${API_BASE}`, colors.yellow);
  log(`Connecting to DB to read OTPs...`, colors.yellow);
  
  try {
      await mongoose.connect(MONGODB_URI);
      log("  ✅ DB Connected", colors.green);
  } catch (err) {
      log(`  ❌ DB Connection Failed: ${err.message}`, colors.red);
      process.exit(1);
  }
  
  try {
      // ---------------------------------------------------------
      // CUSTOMER TESTS
      // ---------------------------------------------------------
      title("STARTING CUSTOMER TESTS");
      
      // Use a random phone number
      const phone = "91" + Math.floor(1000000000 + Math.random() * 9000000000).toString();
      log(`Test Phone: ${phone}`);

      let customerToken = null;
      let customerId = null;
      let addressId = null;

      // 1. Send OTP
      log(`\n[POST] Sending OTP...`);
      const sendOtpRes = await request("POST", "/auth/login/send-otp", { phone });
      
      if (sendOtpRes.status === 200 && sendOtpRes.data.success) {
        log("  ✅ OTP Sent", colors.green);
        
        // 2. Read OTP from DB
        log(`  🔍 Reading OTP from DB...`);
        // Wait a bit for DB update
        await new Promise(r => setTimeout(r, 2000));
        
        const customerDoc = await mongoose.connection.collection("customers").findOne({ phone });
        if (!customerDoc) {
             log("  ❌ Customer not found in DB after OTP send", colors.red);
        } else {
             const otp = customerDoc.phoneOTP;
             log(`  ✅ OTP Found: ${otp}`, colors.green);
             
             // 3. Verify OTP (Login)
             log(`\n[POST] Verifying OTP...`);
             const verifyRes = await request("POST", "/auth/login/verify-otp", { phone, otp });
             
             if (verifyRes.status === 200 && verifyRes.data.success) {
                 log("  ✅ Login Successful", colors.green);
                 customerToken = verifyRes.data.data.accessToken;
                 customerId = verifyRes.data.data.customer._id;
             } else {
                 log(`  ❌ Verify Failed: ${verifyRes.status} - ${JSON.stringify(verifyRes.data)}`, colors.red);
             }
        }
      } else {
        log(`  ❌ Send OTP Failed: ${sendOtpRes.status} - ${JSON.stringify(sendOtpRes.data)}`, colors.red);
      }

      if (customerToken) {
          // 4. Get Profile
          log(`\n[GET] Fetching Customer Profile...`);
          const profileRes = await request("GET", "/customer", null, customerToken);
          if (profileRes.status === 200 && profileRes.data.success) {
            log("  ✅ Profile Fetched", colors.green);
            // customerId already set from login
          } else {
            log(`  ❌ Profile Fetch Failed: ${profileRes.status} - ${JSON.stringify(profileRes.data)}`, colors.red);
          }

          // 5. Update Profile
          log(`\n[PUT] Updating Customer Profile...`);
          const updateRes = await request("PUT", "/customer", { firstName: "Automated", lastName: "Tester" }, customerToken);
          if (updateRes.status === 200 && updateRes.data.success) {
             log("  ✅ Profile Updated", colors.green);
          } else {
             log(`  ❌ Profile Update Failed: ${updateRes.status} - ${JSON.stringify(updateRes.data)}`, colors.red);
          }

          // 6. Add Address
          log(`\n[POST] Adding Address...`);
          const addrPayload = {
            name: "Home",
            street: "123 Automated Lane",
            city: "RobotCity",
            state: "MH",
            postalCode: "400001",
            country: "India",
            phone: phone, 
            type: "Home",
            isDefault: true
          };
          const addAddrRes = await request("POST", "/customer/addresses", addrPayload, customerToken);
          if (addAddrRes.status === 201 && addAddrRes.data.success) {
            log("  ✅ Address Added", colors.green);
            addressId = addAddrRes.data.data._id;
          } else {
            log(`  ❌ Add Address Failed: ${addAddrRes.status} - ${JSON.stringify(addAddrRes.data)}`, colors.red);
          }

          // 7. Get Addresses
          log(`\n[GET] Fetching Addresses...`);
          const getAddrRes = await request("GET", "/customer/addresses", null, customerToken);
          if (getAddrRes.status === 200 && getAddrRes.data.success) {
             const count = getAddrRes.data.data.length;
             log(`  ✅ Addresses Fetched: Found ${count}`, colors.green);
          } else {
            log(`  ❌ Get Addresses Failed: ${getAddrRes.status}`, colors.red);
          }

          // 8. Update Address
          if (addressId) {
            log(`\n[PUT] Updating Address ${addressId}...`);
            const updateAddrRes = await request("PUT", `/customer/addresses/${addressId}`, { city: "NewRobotCity" }, customerToken);
            if (updateAddrRes.status === 200 && updateAddrRes.data.success) {
              log("  ✅ Address Updated", colors.green);
            } else {
              log(`  ❌ Update Address Failed: ${updateAddrRes.status} - ${JSON.stringify(updateAddrRes.data)}`, colors.red);
            }
          }

          // 9. Delete Address
          if (addressId) {
            log(`\n[DELETE] Deleting Address ${addressId}...`);
            const delAddrRes = await request("DELETE", `/customer/addresses/${addressId}`, null, customerToken);
            if (delAddrRes.status === 200 && delAddrRes.data.success) {
              log("  ✅ Address Deleted", colors.green);
            } else {
              log(`  ❌ Delete Address Failed: ${delAddrRes.status} - ${JSON.stringify(delAddrRes.data)}`, colors.red);
            }
          }
      }

      // ---------------------------------------------------------
      // SUPPLIER TESTS
      // ---------------------------------------------------------
      title("STARTING SUPPLIER TESTS");

      const supplierEmail = `test_supp_${Date.now()}@example.com`;
      const supplierPass = "password123";
      let supplierToken = null;

      // 1. Register Supplier
      log(`\n[POST] Registering Supplier: ${supplierEmail}...`);
      const suppRegRes = await request("POST", "/supplier/auth/register", {
        ownerName: "Test Supplier",
        email: supplierEmail,
        phone: parseInt(phone) + 1, // distinct phone
        businessName: "Test Business " + Date.now(),
        password: supplierPass
      });

      if (suppRegRes.status === 201 && suppRegRes.data.success) {
        log("  ✅ Supplier Registered", colors.green);
        supplierToken = suppRegRes.data.data.accessToken; 
      } else {
        log(`  ❌ Supplier Register Failed: ${suppRegRes.status} - ${JSON.stringify(suppRegRes.data)}`, colors.red);
      }

      // 2. Login Supplier
      if (!supplierToken) {
        log(`\n[POST] Logging in Supplier...`);
        const suppLoginRes = await request("POST", "/supplier/auth/login", {
            email: supplierEmail,
            password: supplierPass
        });
        if (suppLoginRes.status === 200 && suppLoginRes.data.success) {
            log("  ✅ Supplier Login Successful", colors.green);
            supplierToken = suppLoginRes.data.token;
        } else {
            log(`  ❌ Supplier Login Failed: ${suppLoginRes.status}`, colors.red);
        }
      }

      if (supplierToken) {
          // 3. Get Supplier Profile
          log(`\n[GET] Fetching Supplier Profile...`);
          const suppProfileRes = await request("GET", "/supplier/profile", null, supplierToken);
          if (suppProfileRes.status === 200 && suppProfileRes.data.success) {
            log("  ✅ Supplier Profile Fetched", colors.green);
          } else {
            log(`  ❌ Supplier Profile Fetch Failed: ${suppProfileRes.status}`, colors.red);
          }

          // 4. Update Supplier Profile
          log(`\n[PUT] Updating Supplier Profile...`);
          const suppUpdateRes = await request("PUT", "/supplier/profile", { description: "Updated Description Autoscript" }, supplierToken);
          if (suppUpdateRes.status === 200 && suppUpdateRes.data.success) {
            log("  ✅ Supplier Profile Updated", colors.green);
          } else {
            log(`  ❌ Supplier Profile Update Failed: ${suppUpdateRes.status}`, colors.red);
          }
          
           // 5. Product APIs verify (GET)
          log(`\n[GET] Fetching Products (initially empty or global)...`);
          const prodRes = await request("GET", "/supplier/products", null, supplierToken);
          if(prodRes.status === 200) {
              log("  ✅ Products Listed", colors.green);
          } else {
              log(`  ❌ Product List Failed: ${prodRes.status}`, colors.red);
          }
      }

  } catch(err) {
      log(`UNHANDLED ERROR: ${err.message}`, colors.red);
  } finally {
      await mongoose.disconnect();
      log("\nDB Disconnected.", colors.cyan);
  }
}

runTests();
