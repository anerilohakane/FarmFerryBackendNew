
const fs = require('fs');

async function testAPIs() {
  try {
    const token = fs.readFileSync('token.txt', 'utf8').trim();
    const BASE_URL = 'http://localhost:3005/api/v1';
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    console.log("--- STARTING TESTS ---");

    // 1. Dashboard Stats
    console.log("\n1. Testing Dashboard Stats...");
    try {
      const dashboardRes = await fetch(`${BASE_URL}/supplier/dashboard/stats`, { headers });
      const dashboardData = await dashboardRes.json();
      console.log("Status:", dashboardRes.status);
      if (dashboardData.success) {
        console.log("Low Stock Count:", dashboardData.data.products.lowStock);
        console.log("✅ Dashboard Stats Passed");
      } else {
        console.error("❌ Dashboard Failed:", dashboardData);
      }
    } catch (e) { console.error("❌ Dashboard Error:", e.message); }

    // 2. Notifications
    console.log("\n2. Testing Notifications...");
    try {
      const notifRes = await fetch(`${BASE_URL}/supplier/notifications`, { headers });
      const notifData = await notifRes.json();
      console.log("Status:", notifRes.status);
      if (notifData.success) {
        console.log("Notifications Count:", notifData.data.pagination.total);
        console.log("✅ Notifications Passed");
      } else {
        console.error("❌ Notifications Failed:", notifData);
      }
    } catch (e) { console.error("❌ Notifications Error:", e.message); }

    // 3. Products Filter
    console.log("\n3. Testing Product Low Stock Filter...");
    try {
        const productRes = await fetch(`${BASE_URL}/supplier/products?lowStock=true`, { headers });
        const productData = await productRes.json();
        console.log("Status:", productRes.status);
        if (productData.success) {
            console.log("Low Stock Items Found:", productData.data.pagination.total);
            console.log("✅ Filter Passed");
        } else {
            console.error("❌ Filter Failed:", productData);
        }
    } catch (e) { console.error("❌ Filter Error:", e.message); }

  } catch (err) {
    console.error("Global Test Error:", err);
  }
}

testAPIs();
