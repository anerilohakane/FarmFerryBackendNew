
const API_BASE = "https://farm-ferry-backend-new.vercel.app/api/v1";

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
        return { status: res.status, data: { success: false, error: `Invalid JSON: ${text.substring(0, 200)}...` } };
    }
  } catch (error) {
    return { status: 500, data: { success: false, error: error.message } };
  }
}

async function runTests() {
  log(`Targeting Supplier API: ${API_BASE}`, colors.yellow);

  const supplierEmail = `supp_${Date.now()}@test.com`;
  const supplierPass = "password123";
  const phone = "99" + Math.floor(10000000 + Math.random() * 90000000).toString(); // 10 digit string

  log(`Test Supplier: ${supplierEmail}, Phone: ${phone}`);

  // 1. Register
  log(`\n[POST] Registering...`);
  const regRes = await request("POST", "/supplier/auth/register", {
    ownerName: "Test Supplier",
    email: supplierEmail,
    phone: phone,
    businessName: "Biz " + Date.now(),
    password: supplierPass
  });

  let token = null;
  if (regRes.status === 201 && regRes.data.success) {
    log("  ✅ Registered", colors.green);
    token = regRes.data.data.accessToken;
  } else {
    log(`  ❌ Register Failed: ${regRes.status}`, colors.red);
    log(`     Error: ${JSON.stringify(regRes.data)}`, colors.red);
  }

  // 2. Login
  if (!token) {
      log(`\n[POST] Logging in...`);
      const loginRes = await request("POST", "/supplier/auth/login", {
        email: supplierEmail,
        password: supplierPass
      });
      if (loginRes.status === 200 && loginRes.data.success) {
        log("  ✅ Login Success", colors.green);
        token = loginRes.data.token;
      } else {
        log(`  ❌ Login Failed: ${loginRes.status}`, colors.red);
        log(`     Error: ${JSON.stringify(loginRes.data)}`, colors.red);
      }
  }

  if (token) {
      // 3. Profile
      const profRes = await request("GET", "/supplier/profile", null, token);
      if (profRes.status === 200) log("  ✅ Profile Fetched", colors.green);
      else log(`  ❌ Profile Failed: ${profRes.status}`, colors.red);

      // 4. Products
      const prodRes = await request("GET", "/supplier/products", null, token);
      if (prodRes.status === 200) log("  ✅ Products Failed (Expected success)", colors.green); // Typo in log message fixed
      else log(`  ❌ Products Failed: ${prodRes.status} ${JSON.stringify(prodRes.data)}`, colors.red);
  }
}

runTests();
