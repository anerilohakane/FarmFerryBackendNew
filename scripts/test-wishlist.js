
// Using native fetch (Node 18+)
const fs = require('fs');

async function testWishlist() {
  const baseUrl = 'http://localhost:3001/api/v1/wishlist';
  
  // Fake ObjectIds
  const fakeUserId = "507f1f77bcf86cd799439011"; 
  const fakeProductId = "507f1f77bcf86cd799439012";

  // Note: For this to fully work, the fakeProductId must correspond to an ACTUAL product in DB 
  // because the POST route does: await Product.findById(productId)
  // So I cannot use a fake ID if the route checks DB existence.
  // I must first fetch a real product from /api/v1/products (if available) or create one?
  // Or I can rely on a known product I might have inserted? 
  // Let's try to query products first.
  
  let validProductId = fakeProductId;
  
  // Step 0: Try to find a real product
  try {
     const prodRes = await fetch('http://localhost:3001/api/v1/admin/products'); 
     // Note: Admin products route might need auth or different path.
     // Let's try public products route if exists? /api/v1/products? 
     // Or just fail if not found.
     // Code only checks: Product.findById(productId).
  } catch(e) {}

  // Actually, I can write a script that connects to DB, gets a product, then closes.
  // But mixing direct DB access and API testing is complex in one file without mongoose setup.
  // Use a placeholder ID and expect 404 "Product not found" as a partial success test?
  // Or better, assume the user has some data? 
  // I will make the script flexible.
}

// Rewriting simpler version:
(async () => {
    const wishlistUrl = 'http://localhost:3001/api/v1/wishlist';
    const productsUrl = 'http://localhost:3001/api/v1/admin/products';
    
    // Use a random ObjectId-like string for user
    const userId = "64c9e4b3e8b1a2c3d4e5f600"; 
    
    console.log("🚀 Testing Wishlist API...");

    // 0. Fetch Real Product ID
    let realProductId = null;
    try {
        console.log(`\n0. Fetching Products from ${productsUrl}...`);
        const prodRes = await fetch(productsUrl);
        const prodData = await prodRes.json();
        if (prodData.success && prodData.data.products.length > 0) {
            realProductId = prodData.data.products[0]._id;
            console.log("✅ Found Real Product ID:", realProductId);
        } else {
            console.log("⚠️ No products found. Using fake ID (expect 404).");
        }
    } catch(e) {
        console.log("⚠️ FAILED to fetch products:", e.message);
    }

    const productId = realProductId || "64c9e4b3e8b1a2c3d4e5f699"; // Fallback to fake

    // 1. GET Wishlist (Empty or Existing)
    console.log(`\n1. GET Wishlist for user ${userId}`);
    let res = await fetch(`${wishlistUrl}?userId=${userId}`);
    let data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));

    if (!res.ok) return;

    // 2. POST Item
    console.log(`\n2. POST Item (ID: ${productId})`);
    res = await fetch(wishlistUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, productId })
    });
    data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));
    
    // 3. GET Wishlist Again (Should contain item)
     if (res.ok) {
        console.log(`\n3. GET Wishlist Again (Verify Addition)`);
        res = await fetch(`${wishlistUrl}?userId=${userId}`);
        data = await res.json();
        console.log("Status:", res.status);
        // console.log("Response:", JSON.stringify(data, null, 2));
        const itemExists = data.data.items.some(i => i.product._id === productId || i.product === productId);
        console.log(itemExists ? "✅ Item successfully found in wishlist!" : "❌ Item NOT found in wishlist.");
     }

})();
